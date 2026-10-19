# Learn Task-Chan (frontend + backend)

A guide to understand the whole project, written in simple words. Read it top to bottom once, then use it as a map.

- Deep dive on backend rules: [`backend/backend.md`](backend/backend.md)
- How to run it: [`README.md`](README.md)

---

## 1. What is Task-Chan?

A **personal to-do app with a game on top**.

1. You add **items** (ticket, request, meeting, task) with a priority and a due date.
2. When you mark an item **Done**, you earn **tokens**.
3. You spend tokens in the **Locker** on cosmetics for your character (hair, outfit, gear, a pet partner, a background).

Screens: **Today**, **All items**, **Calendar**, **Master record** (cases/sessions), **Weekly review**, **Locker**, **Profile**.

---

## 2. The big picture

```
  Browser (you)
      |
      |  http://localhost:5173
      v
 +-------------------+        /api/...  and  /sanctum/...        +----------------------+
 |  FRONTEND         |  ---------------------------------------> |  BACKEND             |
 |  React + Vite     |   (Vite forwards these to port 8000)      |  Laravel (PHP)       |
 |  shows screens    |  <---------------------------------------  |  rules + security    |
 +-------------------+              JSON answers                  +----------+-----------+
                                                                             |
                                                                             v
                                                                    +----------------+
                                                                    |  MySQL database |
                                                                    +----------------+
```

**The one rule to remember:** the frontend only *shows* things and *asks*. The backend *decides* (who you are, what you own, how many tokens you have). Never trust the browser.

| | Frontend | Backend |
|---|---|---|
| Folder | `frontend/` | `backend/` |
| Language | TypeScript + React | PHP + Laravel |
| Runs on | http://localhost:5173 | http://127.0.0.1:8000 |
| Job | Screens, clicks, forms | Data, rules, login, tokens |
| Talks | Sends requests | Sends back JSON |

---

## 3. How a request travels (follow one example)

**You tick "Done" on an item:**

1. `Today.tsx` calls `api('PATCH', '/items/12/status', { status: 'done' })` (file `frontend/src/lib/api.ts`).
2. The browser sends it to Vite (5173). Vite forwards `/api/...` to Laravel (8000).
3. Laravel route `routes/api.php` sends it to `ItemApiController@status`.
4. That calls `ChangeItemStatus`, which calls `TokenService::complete()`.
5. `TokenService` writes rows in the `token_ledger` table (+10, +5 early bonus, maybe +50 streak).
6. Laravel answers JSON: `{ item, balance, awarded, streak_bonus }`.
7. The frontend updates the checkbox and the token counter to the **server's** balance.

Everything in this app follows that same shape: **screen -> api() -> route -> controller -> service -> database -> JSON -> screen**.

---

## 4. Login: how the app knows it is you

- Style: **session cookie** (Laravel Sanctum "SPA mode"). No tokens stored in the browser.
- Steps: frontend calls `GET /sanctum/csrf-cookie` (gets a safety cookie), then `POST /api/login`. Laravel sets a session cookie.
- Every later request carries the cookie, so Laravel knows who you are.
- `api.ts` does the CSRF step for you before the first write, and retries once if it expires.
- **Registration is only for the first user** (single-user app). After a user exists it returns 404.
- Demo account: `demo@worktracker.test` / `password`.

---

## 5. Frontend, explained

### 5.1 Tools
- **React 19**: builds screens from small pieces called components.
- **TypeScript**: JavaScript with types (catches mistakes early).
- **Vite**: dev server and builder. Also forwards `/api` to the backend.
- **Tailwind CSS**: styling with class names like `rounded-xl border-2`.
- **react-router**: changes screens without reloading the page.
- **Vitest**: unit tests.

### 5.2 Folder map (`frontend/src/`)

```
main.tsx                 starts the app (router + the page host)
runtime/index.tsx        the "page host" (see 5.3) - loads data per URL, guards login
Pages/                   ONE FILE PER SCREEN
   Today.tsx  Calendar.tsx  Review.tsx  Locker.tsx  Error.tsx
   Items/Index.tsx (all items)   Items/Show.tsx (one item)
   MasterRecords/Index.tsx, Show.tsx
   Profile/Edit.tsx (+ Partials)
   Auth/Login, Register, ForgotPassword, ResetPassword, ConfirmPassword, VerifyEmail
Layouts/
   AppLayout.tsx          sidebar + header + toast + New item dialog (wraps all logged-in pages)
   GuestLayout.tsx        wrapper for login/register pages
   AuthenticatedLayout    wrapper used by Profile
Components/
   NewItemModal.tsx       the "New item" form
   GameContext.tsx        keeps the token balance + the "+10" pop animation
   ColumnsPanel.tsx       choose/add columns on All items
   Scene.tsx, characters/ the mascot (Kai), partners (Ember, Mochi, Kon, Pan, Bun, Pip), drawn as SVG
   ui/                    small building blocks: Button, Card, Chip, ProgressBar, Toast, TokenPill...
lib/                     plain helper logic (no screens)
   api.ts                 the ONLY place that calls the backend
   parser.ts              turns "Ticket from DGB, due Friday" into type/title/date
   tokens.ts              reward preview + locker button logic
   columns.ts             column helpers for All items
   format.ts              dates and labels (Bangkok time)
   newItem.ts             tiny "open the New item dialog" signal
types/                   TypeScript shapes of the data
css/app.css              global styles (Tailwind + custom)
```

### 5.3 The page host (important, and temporary)
`runtime/index.tsx` is the page host: it gives every page `usePage`, `router`, `useForm`, `Link` and `Head`, built on react-router and `api.ts`.

What it does for each URL:
1. Look up which page file matches the URL (list `SCREENS`).
2. Fetch that page's data (e.g. `/api/today`) plus `/api/bootstrap` (user, balance, catalog).
3. If the page needs login and you are logged out -> go to `/login`.
4. Show the page inside its layout, passing the data as props.

It is a bridge. The plan is to replace it with plain hooks page by page, then delete the folder.

### 5.4 Ideas worth learning in the code
- **Optimistic UI** (`Today.tsx`, `GameContext.tsx`): when you tick a box the UI updates at once, then the server's real answer replaces it. If the server says no, the UI rolls back.
- **Pure helper functions** (`lib/`): easy to test. See `parser.test.ts`, `tokens.test.ts`, `columns.test.ts`.
- **Quick add parser** (`lib/parser.ts`): uses the `chrono-node` library to read dates like "Friday" in Bangkok time.
- **One signal, one dialog** (`lib/newItem.ts` + `AppLayout`): any screen calls `openNewItem()`, the dialog lives once in the layout.
- **SVG characters** (`Components/characters/`): the character is code, not an image. Colors and gear come from props.

---

## 6. Backend, explained (short version)

Full details: [`backend/backend.md`](backend/backend.md).

### 6.1 Tools
Laravel 13 (PHP), MySQL 8, Sanctum (login), Pest (tests).

### 6.2 Folder map (`backend/`)

```
routes/api.php                 every URL
app/Http/Controllers/          receive a request, call the right code, return JSON
   Api/                          items, sub-tasks, files, links, custom fields, locker
   Auth/                         login, register, password, verify email
   BootstrapController           user + balance + catalog for every screen
app/Services/TokenService.php  ALL token rules  <- the heart of the app
app/Actions/ChangeItemStatus   the only way to change an item's status
app/Models/                    Item, User, TokenLedger, ...
app/Policies/                  "is this yours?" checks
app/Enums/                     fixed lists (status, priority, type)
config/locker.php              rewards, streak, every locker price and item
database/migrations/           table definitions
database/seeders/              demo data
tests/                         70 automatic tests
```

### 6.3 Token rules in 30 seconds
- Balance = **sum of the `token_ledger` table** (never a stored number).
- Done: **+5 / +10 / +15** by priority, **+5** if on or before the deadline, **+50** for 5 working days in a row.
- Same action twice pays once (unique `ref` per payment).
- Undo reverses the payment, and is **refused** if you already spent those tokens.
- All shop prices come from `config/locker.php`.

---

## 7. All the API URLs (cheat sheet)

Everything starts with `/api`. Logged-in unless noted.

| Area | URLs |
|---|---|
| Shell data (no login needed) | `GET /bootstrap` |
| Auth (no login needed) | `POST /login`, `/register`, `/forgot-password`, `/reset-password` |
| Auth (login needed) | `POST /logout`, `/confirm-password`, `PUT /password` |
| Screens | `GET /today`, `/items`, `/items/{id}`, `/calendar`, `/review`, `/locker`, `/profile` |
| Items | `POST /items`, `PATCH /items/{id}`, `PATCH /items/{id}/status`, `DELETE /items/{id}` |
| Sub-tasks | `POST /items/{id}/sub-tasks`, `PATCH`/`DELETE /sub-tasks/{id}` |
| Files | `POST /items/{id}/attachments`, `GET`/`DELETE /attachments/{id}` |
| Links | `POST`/`DELETE /items/{id}/links` |
| Master records | `GET/POST /master-records`, `GET/PATCH/DELETE /master-records/{id}` |
| Custom columns | `POST/PATCH/DELETE /custom-fields`, `PUT /preferences/items-columns` |
| Locker | `POST /locker/buy`, `/locker/equip`, `/locker/mascot` |
| Profile | `PATCH /profile`, `DELETE /profile` |

Errors are always JSON: `401` not logged in, `403` not yours, `404` not found, `422` bad input (`{errors:{field:[msg]}}`), `429` too many requests.

---

## 8. Run it and test it

```
# Backend (terminal 1)
cd backend
composer install
php artisan migrate:fresh --seed
php artisan serve                 # or: pwsh scripts/serve.ps1

# Frontend (terminal 2)
cd frontend
npm install
npm run dev                       # open http://localhost:5173
```

Tests:
```
cd backend  && php artisan test   # 70 tests (wipes the work_tracker_test database)
cd frontend && npm test           # 31 unit tests
cd frontend && npm run typecheck  # TypeScript check
cd frontend && npm run build      # production build
```
Last full check: all of the above passed, and a live run covered login, create item, mark Done (+20, no double pay), buy and equip in the Locker, undo, and logout. In the browser, the New item form, the Today list and the Locker (new gear and partners) all worked.

---

## 9. A good order to study

1. **Run the app and click everything.** Add an item, finish it, buy something.
2. Read `backend/config/locker.php` (the rules written as data).
3. Read `backend/app/Services/TokenService.php` slowly: `complete`, `undo`, `purchase`.
4. Read `backend/routes/api.php`, then one controller (`ItemApiController`).
5. Read `frontend/src/lib/api.ts` (one small file, the bridge to the backend).
6. Read `frontend/src/Pages/Today.tsx` (a real screen: data in, clicks out, optimistic UI).
7. Read `frontend/src/lib/parser.ts` and its test.
8. Read the tests: `backend/tests/Feature/ItemApiTest.php` shows what the app promises.
9. Last, read `frontend/src/runtime/index.tsx` (the most advanced file).

---

## 10. Practice tasks (learn by changing things)

| Level | Task | Where |
|---|---|---|
| Easy | Change the reward for high priority from 15 to 20 and see the New item preview change | `backend/config/locker.php` |
| Easy | Add a new hair color to the Locker | `backend/config/locker.php` (colors only, no art needed) |
| Easy | Rename a sidebar label | `frontend/src/Layouts/AppLayout.tsx` (`NAV`) |
| Medium | Make the quick-add understand the word "tomorrow" in another language | `frontend/src/lib/parser.ts` (+ test) |
| Medium | Add a new item type, e.g. "reminder" | `backend/app/Enums/ItemType.php`, `frontend/src/types`, `lib/format.ts`, `NewItemModal.tsx` |
| Medium | Show the 10 latest token changes on the Locker page | new endpoint reading `token_ledger`, then a list in `Locker.tsx` |
| Hard | Add a new gear piece with its own drawing | `config/locker.php`, `characters/palette.ts`, `characters/Kai.tsx` |

After each change run the tests. If you break a rule, a test tells you which one.

---

## 11. Words you will meet

| Word | Meaning |
|---|---|
| **API** | URLs the frontend calls to get/change data |
| **JSON** | The text format of the answers: `{ "balance": 90 }` |
| **Route** | A URL mapped to code (`routes/api.php`) |
| **Controller** | Code that handles one request |
| **Model** | PHP class for a database table (`Item`, `User`) |
| **Migration** | A file that creates or changes a table |
| **Seeder** | Fills the database with demo data |
| **Policy** | Rule: "only the owner can touch this" |
| **Ledger** | History book of every token gain and spend |
| **Transaction** | Database "all or nothing" wrapper |
| **Idempotent** | Doing it twice has the same result as once |
| **Component** | A reusable piece of screen in React |
| **Props** | Data passed into a component |
| **Hook** | A React function like `useState` that adds behavior |
| **Optimistic UI** | Show the result first, confirm with the server after |
| **Session cookie** | The small file the browser sends so the server knows you |
| **CSRF** | An attack on cookie logins; the CSRF cookie defends against it |

---

## 12. Known gaps (so you are not surprised)

- Streaks are rebuilt from items that are Done right now, so undoing an item can take a streak bonus back.
- You cannot filter or sort by a custom column yet.
- Production needs the frontend and API on the same main domain (see `README.md`).
