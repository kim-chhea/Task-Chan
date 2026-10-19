# Task-Chan

JSON API of Task-Chan (Laravel 13 + MySQL 8 + Sanctum). The React app is in `../frontend`; `../README.md` explains how to run both. Personal, gamified work tracker: capture items, organize, schedule, do, review. Finishing items earns tokens you spend in the Locker on an original anime character and animal partner. Visual spec: `../Work Tracker — Flow & Screens.html`.

## Setup
1. PHP 8.3+ and Composer (Laravel Herd works), Node 22+, MySQL 8.
2. Database: use your own MySQL 8 (set `DB_*` in `.env`, create `work_tracker` and `work_tracker_test`), or either:
   - Docker: `docker compose up -d` (port 3306), set `DB_PORT=3306` in `.env`; or
   - no Docker: `pwsh scripts/mysql-local.ps1` (port 3307, the `.env.example` default).
3. `composer install`
4. `cp .env.example .env && php artisan key:generate`
5. `php artisan migrate:fresh --seed`
6. `pwsh scripts/serve.ps1` (or `php artisan serve`). The API is at http://localhost:8000/api; start the frontend from `../frontend`.

**File uploads:** the app accepts 10 MB per file, but PHP defaults to 2 MB (Herd's `php.ini` too). `scripts/serve.ps1` raises the limits for dev. In Herd raise *Max file upload size* in its PHP settings; in production set `upload_max_filesize=12M` and `post_max_size=16M`.

Seeded login: `demo@worktracker.test` / `password`. Registration is open only until the first user exists.

## Env vars
`DB_*` (MySQL), `APP_TIMEZONE` (default `Asia/Bangkok`), `FILESYSTEM_DISK` (`local`, or `s3` in prod), `SANCTUM_STATEFUL_DOMAINS` (add your host if not localhost).

## Tests
`php artisan test` (Pest, uses the `work_tracker_test` database and wipes it). UI logic tests (quick-add parser, token UI, column helpers) live in `../frontend` (`npm test`).

## How tokens work
Server-side only (`App\Services\TokenService`); the balance is `SUM(token_ledger.delta)`, never a stored number. Every API response returns the authoritative balance and the UI reconciles to it.
- Done: +5 low, +10 medium, +15 high. +5 more if done on or before the deadline (items without a deadline get no bonus).
- Streak: one Done item on each of 5 consecutive working days (Mon–Fri, Bangkok time) pays +50 once per cycle.
- Undo (leaving Done) writes a reversing row for what that completion paid, plus any streak bonus no longer earned. Undo is refused (HTTP 422) if it would take the balance below zero, i.e. you already spent those tokens.
- Idempotent: each award has a unique `ref` (`item_done:{item}:{cycle}`); Done twice pays once.
- Locker: price comes from `config/locker.php`, row-locked purchase, blocked when the balance is short. Free items are owned from registration.

## Customizing All items
The **Columns** button on All items lets you show, hide and reorder columns (Sector, Received, Reward and so on; the title is always shown) and add your own custom fields: text, number, date, dropdown or checkbox (up to 20). A custom field becomes a column straight away and is edited in the item's properties panel. Choices are saved per user. Deleting a field removes its values. Not yet: filtering or sorting by a custom field, and drag-to-reorder (use the arrows).

Endpoints: `POST/PATCH/DELETE /api/custom-fields`, `PUT /api/preferences/items-columns`; item values are saved with `PATCH /api/items/{id}` as `custom_values`.

## Calendar
Month, week and day views. Drag an item to another day to change its deadline.

## Layout
`app/Services/TokenService.php`, `app/Actions/ChangeItemStatus.php`, `routes/api.php` (JSON, Sanctum cookie auth, one endpoint per screen plus `/api/bootstrap`), `app/Http/Controllers/BootstrapController.php` (user, balance, catalog), `scripts/serve.ps1` (dev server with upload limits).

## Security notes
Forgot-password answers the same for known and unknown emails; registration is guarded by a lock so two simultaneous first-run requests cannot both succeed; deleting the account also deletes uploaded files.

## Known gaps
Streaks are rebuilt from the items that are Done right now, so undoing an item can reverse a streak bonus (and re-completing pays it again).