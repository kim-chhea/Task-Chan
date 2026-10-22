# Task-Chan (split)

| Folder | What | Stack |
|---|---|---|
| `backend/` | JSON API only. Auth, items, tokens, locker. | Laravel 13, MySQL 8, Sanctum (cookie SPA auth) |
| `frontend/` | The React app. | Vite, React 19, TypeScript, react-router, Tailwind |

**New here? Start with [`LEARN.md`](LEARN.md)**, the full guide to the frontend and backend in simple words.

Docs: [`backend/backend.md`](backend/backend.md) (backend logic in plain words), `backend/README.md`, `backend/DEPLOY.md`.

## Run (dev)
```
# 1. database + API  (port 8000)
cd backend
cp .env.example .env && php artisan key:generate     # skip if .env exists
pwsh scripts/mysql-local.ps1                         # or any MySQL 8 (create work_tracker + work_tracker_test); set DB_* in .env
composer install
php artisan migrate:fresh --seed
pwsh scripts/serve.ps1                               # or: php artisan serve

# 2. frontend  (port 5173)
cd frontend
npm install
npm run dev                                          # open http://localhost:5173
```
Seeded login: `demo@worktracker.test` / `password`.

**Registration:** it is a single-user app. `POST /api/register` only works while no user exists, so with the seeded demo user it is closed. To create your own account, start from an empty database (`php artisan migrate:fresh` without `--seed`), then register on the login screen. Details of every backend rule are in [`backend/backend.md`](backend/backend.md).

In dev the browser only talks to Vite (5173); it proxies `/api` and `/sanctum` to the backend (`BACKEND_URL`, default `http://localhost:8000`). Cookies therefore stay same-origin and no CORS is involved. `backend/.env` must list `localhost:5173` in `SANCTUM_STATEFUL_DOMAINS` (already in `.env.example`).

## How they talk
- Session-cookie auth (Sanctum SPA mode): the frontend calls `GET /sanctum/csrf-cookie`, then `POST /api/login`. `lib/api.ts` handles this.
- One endpoint per screen: `/api/today`, `/api/items`, `/api/items/{id}`, `/api/calendar`, `/api/review`, `/api/locker`, `/api/master-records[/{id}]`, `/api/profile`. Shell data (user, token balance, equipped cosmetics, catalog, rules): `GET /api/bootstrap`.
- Auth: `POST /api/register | login | logout | forgot-password | reset-password | confirm-password`, `PUT /api/password`.
- Everything else is the existing mutation API (`/api/items`, `/api/locker/buy`, ...).
- Errors are always JSON; validation errors are 422 `{ errors: { field: [..] } }`.

## Production
Serve `frontend/dist` (static, SPA fallback to `index.html`) and the API on the **same host** when you can (`backend/DEPLOY.md`). The browser then calls `/api` on the SPA origin, `VITE_API_URL` and `CSP_CONNECT_SRC` stay empty, and the CSP `connect-src 'self'` is the API origin.
- backend: `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS` (the SPA host), `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE=true`, `CORS_ALLOWED_ORIGINS`
- Split hosts on one registrable domain (for example `app.example.com` and `api.example.com`): set `CSP_CONNECT_SRC=https://api.example.com` for Laravel and for the frontend build, and set `VITE_API_URL` to that same origin. `CSP_CONNECT_SRC` is the one value copied into `connect-src` on the nginx header, the Laravel header, and the meta tag. The browser enforces the header and the meta tag together, so they have to match. Regenerate `backend/deploy/nginx/csp.conf` with `php artisan csp:nginx` after changing it. The meta tag cannot set `frame-ancestors`, so it is not a full replacement for the header. PHP limits and the rest of the nginx snippet are in `backend/DEPLOY.md`.

## Migration status
Done: the backend is API-only and the frontend is a standalone SPA. `frontend/src/runtime/index.tsx` is the app runtime (page host, `router`, `useForm`, `Link`, `usePage`, `Head`).
