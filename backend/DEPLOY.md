# Deploy

GitHub Actions can deploy this app to a VPS. Read [`../docs/CI-CD.md`](../docs/CI-CD.md). If you use Laravel Cloud or Forge instead, keep the CI workflow and replace only the deploy job.

The API (this directory) and the React app (`../frontend`) are served from the **same host** when you can. Browsers then call `/api` and `/sanctum` on the SPA's origin. Leave `VITE_API_URL` and `CSP_CONNECT_SRC` empty, and `connect-src 'self'` is the API origin.

A split-host deploy (the SPA on `app.example.com`, the API on `api.example.com`) sets **one** value, `CSP_CONNECT_SRC=https://api.example.com`, in the Laravel environment and in the frontend build environment, and sets `VITE_API_URL` to that same origin. `CSP_CONNECT_SRC` is what `connect-src` uses in every place the browser can see:

- the nginx header in `deploy/nginx/csp.conf` (regenerate it with `php artisan csp:nginx` after changing the variable)
- the Laravel `Content-Security-Policy` header (`App\Support\ContentSecurityPolicy`, used when this app returns HTML)
- the `<meta http-equiv="Content-Security-Policy">` that `npm run build` writes

The browser enforces the header and the meta policy together. A meta tag that lists the API origin does not help when the header still says `connect-src 'self'`. The frontend build fails if `VITE_API_URL`'s origin is missing from `CSP_CONNECT_SRC`, so that mismatch cannot ship.

The meta tag cannot set `frame-ancestors` (browsers ignore that directive in a meta policy and log a warning). It is not a full replacement for the header. The header is what sends `frame-ancestors 'none'`.

## Laravel Cloud
1. Create an app from this repo, attach a MySQL 8 database, and a bucket for files. Set the application root to `backend` (the directory that contains `artisan`).
2. Env: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, `APP_TIMEZONE=Asia/Bangkok`, `FILESYSTEM_DISK=s3` (+ `AWS_*`), `SANCTUM_STATEFUL_DOMAINS` (the SPA host), `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE=true`. Same-host deploys also set `FRONTEND_URL` to that host and `CORS_ALLOWED_ORIGINS` to it. Split-host deploys set `CSP_CONNECT_SRC` to the API origin (the same value the frontend build uses).
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

The SPA is `frontend/dist` (Vite build, fallback to `index.html`). This Laravel app does not render it: `GET /` is JSON, and `SecurityHeaders` only attaches the CSP to an HTML response. On Forge, nginx is what serves the document, so the policy lives in `deploy/nginx/csp.conf`. Include that file from the site's `server` block (or paste it), not from inside another `location`.

`csp.conf` marks only `location = /index.html` with `Cache-Control: no-store`. That location is the file itself and the internal redirect from `try_files ... /index.html`. A `location` that sets any `add_header` drops server-level `add_header` values, so that block repeats the CSP and the `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` lines. Leave `location /` without its own `add_header`: `/assets/*` is served from there and must not be `no-store`. `sub_filter` still applies from the server block as long as that location does not define its own `sub_filter`.

Do not precompress `index.html` (`index.html.gz`, or `gzip_static` for that file). `gzip_static` serves the compressed file and skips `sub_filter`, so `__CSP_NONCE__` would reach the browser. Pin nginx below 1.31.2. nginx 1.31.2's changelog says `$request_id` now uses SipHash-2-4, replacing OpenSSL `RAND_bytes`; that change describes the variable as a non-security identifier, so it is no longer a CSPRNG. This snippet still uses `$request_id` as the CSP nonce. If you run nginx 1.31.2 or newer, do not use `$request_id` for that nonce: generate a random nonce another way and keep the header and the HTML on that same value.

When the API is on another origin, set `CSP_CONNECT_SRC` (see the top of this file) and regenerate the snippet before reloading nginx:

```
php artisan csp:nginx > deploy/nginx/csp.conf
```

An empty `CSP_CONNECT_SRC` reprints the committed file. The command reads Laravel's config, so run it on the environment that has the variable set.

`npm run dev` does not send the policy. Vite's dev client uses an inline preamble and a websocket, which this CSP would block. `npm run build` writes two tags into `dist/index.html`: `<meta name="csp-nonce" content="__CSP_NONCE__">` and a `<meta http-equiv="Content-Security-Policy">` whose `style-src` nonce is the same placeholder. nginx's `sub_filter` replaces `__CSP_NONCE__` with `$request_id` and the header's `style-src` uses that same value. The notes editor (ProseMirror and Mantine) injects `<style>` tags; the nonce lets those tags through. `style-src` is `'self'` plus that nonce. It does not use `'unsafe-inline'`.

That meta policy omits `frame-ancestors`. Browsers ignore `frame-ancestors` in a meta tag and log a warning, so the meta tag is not a full replacement for this header. A static host that cannot run the `sub_filter` also cannot fill in the nonce; serve the document with the nginx snippet (or with Laravel, which substitutes the placeholder when it returns HTML) so the header and the HTML carry the same nonce.

Fonts are self-hosted (`@fontsource/dela-gothic-one`, `@fontsource/geist`, `@fontsource/geist-mono`). There is no Google Fonts stylesheet, so `style-src` and `font-src` stay `'self'`. A few components set element `style` attributes (animation delay, progress width). Those are covered by `style-src-attr 'unsafe-inline'`; a nonce does not apply to style attributes, and stylesheets are not allowed from `'unsafe-inline'`.

Same-host sketch for a checkout at `/home/forge/task-chan` (keep Forge's `listen` and `ssl_certificate` lines; this is the part that serves the SPA and the API on one name):

```nginx
root /home/forge/task-chan/frontend/dist;
index index.html;
client_max_body_size 12M;

include /home/forge/task-chan/backend/deploy/nginx/csp.conf;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;

# No add_header in this location. /assets/* is served here and must stay cacheable.
# A missing file is an internal redirect to /index.html, which csp.conf marks no-store.
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

If Laravel itself returns the SPA HTML, `app/Http/Middleware/SecurityHeaders.php` sets this same header on any `text/html` response (with `connect-src` from `CSP_CONNECT_SRC` and a per-request style nonce) and replaces `__CSP_NONCE__` in the body. It does not set the CSP on JSON.

## After deploy
Log in, check `/today`, complete an item, confirm the token card matches `/locker`.
## Production checklist
- `APP_DEBUG=false`, a fresh `APP_KEY` (`php artisan key:generate --show`), and a dedicated MySQL user (not `root`) with rights on the app database only.
- Leave `TRUSTED_PROXIES` blank unless the app sits behind a proxy. Then set it to the real proxy or load-balancer IPs, comma-separated. `*` trusts a spoofed `X-Forwarded-For`.
- **Mail:** `MAIL_MAILER=log` only writes reset links to the log. Set a real mailer (`MAIL_MAILER=smtp` plus `MAIL_*`) or password reset will not reach you.
- Run `php artisan optimize` after each deploy. Back up the database and the file disk.
- API responses carry `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Cache-Control: no-store` (see `app/Http/Middleware/SecurityHeaders.php`). The SPA document (`index.html`, including the `try_files` fallback) also carries `Content-Security-Policy` and `Cache-Control: no-store`. `/assets/*` does not get `no-store`. Split-host deploys set `CSP_CONNECT_SRC` to the API origin for both Laravel and the frontend build, and `deploy/nginx/csp.conf` was regenerated with `php artisan csp:nginx`.
- `deploy/php/production.ini` is loaded (`upload_max_filesize=12M`, `post_max_size=12M`, `expose_php=Off`) and nginx `client_max_body_size` is at least `12M`.
- `.env` is git-ignored: never commit it, and rotate any database password that has been shared.
