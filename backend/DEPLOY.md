# Deploy

## Laravel Cloud
1. Create an app from this repo, attach a MySQL 8 database, and a bucket for files.
2. Env: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, `APP_TIMEZONE=Asia/Bangkok`, `FILESYSTEM_DISK=s3` (+ `AWS_*`), `SANCTUM_STATEFUL_DOMAINS=your.domain`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE=true`.
3. Build: `composer install --no-dev --optimize-autoloader`. The frontend is built and hosted separately (`../README.md`, Production); also set `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` and `SESSION_DOMAIN` so the two share cookies.
4. Deploy command: `php artisan migrate --force`. Seed only the first time if you want the demo data; otherwise register your account at `/register` (closes after the first user).

**PHP limits:** set `upload_max_filesize=12M` and `post_max_size=16M` (the app allows 10 MB per file; PHP defaults are 2 MB / 8 MB). `SANCTUM_STATEFUL_DOMAINS` must include your domain or every `/api` call returns 401.

## Forge
Same env and build steps, queue not required. Quick deploy script: `git pull`, composer + npm build, `php artisan migrate --force`, `php artisan optimize`.

## After deploy
Log in, check `/today`, complete an item, confirm the token card matches `/locker`.
## Production checklist
- `APP_DEBUG=false`, a fresh `APP_KEY` (`php artisan key:generate --show`), and a dedicated MySQL user (not `root`) with rights on the app database only.
- `TRUSTED_PROXIES=*` (or a comma list of load-balancer IPs) when the app sits behind a proxy, so HTTPS and client IPs are detected correctly.
- **Mail:** `MAIL_MAILER=log` only writes reset links to the log. Set a real mailer (`MAIL_MAILER=smtp` plus `MAIL_*`) or password reset will not reach you.
- Run `php artisan optimize` after each deploy. Back up the database and the file disk.
- Responses carry `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Cache-Control: no-store` (see `app/Http/Middleware/SecurityHeaders.php`).
- `.env` is git-ignored: never commit it, and rotate any database password that has been shared.
