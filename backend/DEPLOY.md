# Deploy

The API (this directory) and the React app (`../frontend`) are served from the **same host**. Browsers call `/api` and `/sanctum` on the SPA's origin, so the SPA's `connect-src 'self'` is the API origin. Leave `VITE_API_URL` empty for that setup. A split-host build (`VITE_API_URL=https://api.example.com`, see `../README.md`) still works: the production build adds that origin to `connect-src`. If nginx also sends the header below, add the same origin there, because the browser enforces the header and the `<meta>` policy together.

## Laravel Cloud
1. Create an app from this repo, attach a MySQL 8 database, and a bucket for files. Set the application root to `backend` (the directory that contains `artisan`).
2. Env: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, `APP_TIMEZONE=Asia/Bangkok`, `FILESYSTEM_DISK=s3` (+ `AWS_*`), `SANCTUM_STATEFUL_DOMAINS` (the SPA host), `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE=true`. Same-host deploys also set `FRONTEND_URL` to that host and `CORS_ALLOWED_ORIGINS` to it.
3. Build: `composer install --no-dev --optimize-autoloader`, then build `../frontend` (`npm ci && npm run build`) and publish `frontend/dist`.
4. Deploy command: `php artisan migrate --force`. Seed only the first time if you want the demo data; otherwise register your account at `/register` (closes after the first user).

### PHP configuration

`deploy/php/production.ini` is the production PHP file:

- `upload_max_filesize = 12M`
- `post_max_size = 12M`
- `expose_php = Off`

`upload_max_filesize` and `post_max_size` are `PHP_INI_PERDIR`. `expose_php` is `PHP_INI_SYSTEM`. None of them can be set with `ini_set()`, and a `.user.ini` cannot turn `expose_php` off. Laravel Cloud reads PHP configuration from the image. Deploy commands do not keep filesystem changes, so this has to be a **build command** (Cloud's PHP image loads `/usr/local/etc/php/conf.d`, which is where Cloud's own PHP configuration is added):

```
cp deploy/php/production.ini /usr/local/etc/php/conf.d/99-task-chan.ini
```

Redeploy so the image is rebuilt. From the environment's Commands tab:

```
php -r 'echo "upload_max_filesize=".ini_get("upload_max_filesize").PHP_EOL."post_max_size=".ini_get("post_max_size").PHP_EOL."expose_php=".ini_get("expose_php").PHP_EOL;'
```

Expect `12M`, `12M`, and `0`.

## Forge
Same env and build steps, queue not required. Quick deploy script: `git pull`, composer + npm build, `php artisan migrate --force`, `php artisan optimize`.

### PHP configuration

Copy `deploy/php/production.ini` into the PHP version the site actually runs (`php -v`). On a server using PHP 8.4, from the deployed `backend` directory:

```
sudo cp deploy/php/production.ini /etc/php/8.4/fpm/conf.d/99-task-chan.ini
sudo cp deploy/php/production.ini /etc/php/8.4/cli/conf.d/99-task-chan.ini
sudo service php8.4-fpm reload
```

`conf.d` is read after the main `php.ini`, so these values win over the stock file. In the Forge dashboard, Server → PHP → Max file upload size should be `12` as well (that control is megabytes). It does not set `expose_php`; the ini file does.

Forge's nginx rejects bodies before PHP sees them. In the site nginx config set `client_max_body_size 12M;` so a 10 MB attachment (the application limit) can arrive.

Confirm with `php -r` as above, using the FPM binary if CLI and FPM ever diverge (`php-fpm8.4 -i | grep -E 'upload_max_filesize|post_max_size|expose_php'`).

### SPA, nginx, and Content-Security-Policy

The SPA is `frontend/dist` (Vite build, fallback to `index.html`). This Laravel app does not render it: `GET /` is JSON, and `SecurityHeaders` only attaches the CSP to an HTML response. On Forge, nginx is what serves the document, so the policy lives in `deploy/nginx/csp.conf`. Paste that `add_header` into the site's `server` block. If a `location` sets any `add_header` of its own, nginx drops server-level `add_header` values for that location; repeat the CSP line there.

`npm run dev` does not send the policy. Vite's dev client uses an inline preamble and a websocket, which this CSP would block. `npm run build` writes the policy into `dist/index.html` as a `<meta http-equiv="Content-Security-Policy">` for static hosts that do not set a header. That meta tag omits `frame-ancestors` (browsers ignore it in a meta tag and log a warning). The nginx header is what sends `frame-ancestors 'none'`.

Fonts are self-hosted (`@fontsource/dela-gothic-one`, `@fontsource/geist`, `@fontsource/geist-mono`). There is no Google Fonts stylesheet, so `style-src` and `font-src` stay `'self'`. A few components set element `style` attributes (animation delay, progress width). Those are covered by `style-src-attr 'unsafe-inline'`; stylesheets are not.

Same-host sketch for a checkout at `/home/forge/task-chan` (keep Forge's `listen` and `ssl_certificate` lines; this is the part that serves the SPA and the API on one name):

```nginx
root /home/forge/task-chan/frontend/dist;
index index.html;
client_max_body_size 12M;

add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;

location / {
    try_files $uri $uri/ /index.html;
}

location ^~ /api {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME /home/forge/task-chan/backend/public/index.php;
    fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
}

location ^~ /sanctum {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME /home/forge/task-chan/backend/public/index.php;
    fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
}

location = /up {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME /home/forge/task-chan/backend/public/index.php;
    fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
}

# Signed email link (Laravel). The SPA screen is /verify-email with no extra segments, so this does not catch it.
location ~ ^/verify-email/[^/]+/[^/]+$ {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME /home/forge/task-chan/backend/public/index.php;
    fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
}
```

`SANCTUM_STATEFUL_DOMAINS` must include the site host or every `/api` call returns 401.

If Laravel itself returns the SPA HTML, `app/Http/Middleware/SecurityHeaders.php` sets this same header on any `text/html` response and does not set it on JSON.

## After deploy
Log in, check `/today`, complete an item, confirm the token card matches `/locker`.
## Production checklist
- `APP_DEBUG=false`, a fresh `APP_KEY` (`php artisan key:generate --show`), and a dedicated MySQL user (not `root`) with rights on the app database only.
- `TRUSTED_PROXIES=*` (or a comma list of load-balancer IPs) when the app sits behind a proxy, so HTTPS and client IPs are detected correctly.
- **Mail:** `MAIL_MAILER=log` only writes reset links to the log. Set a real mailer (`MAIL_MAILER=smtp` plus `MAIL_*`) or password reset will not reach you.
- Run `php artisan optimize` after each deploy. Back up the database and the file disk.
- API responses carry `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Cache-Control: no-store` (see `app/Http/Middleware/SecurityHeaders.php`). The SPA document also carries `Content-Security-Policy` (nginx snippet above, and the middleware when the response is HTML).
- `deploy/php/production.ini` is loaded (`upload_max_filesize=12M`, `post_max_size=12M`, `expose_php=Off`) and nginx `client_max_body_size` is at least `12M`.
- `.env` is git-ignored: never commit it, and rotate any database password that has been shared.
