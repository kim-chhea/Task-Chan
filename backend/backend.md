# Backend, explained simply

The backend is a **Laravel** program that only talks JSON. It has no web pages. The React app (in `../frontend`) asks it questions and it answers. All data lives in a **MySQL** database.

Think of it as the "brain and the safe" of the app: it decides who you are, what you own, and how many tokens you have. The frontend only *shows* things. It is never trusted to decide anything important.

---

## 1. What the app does (the big idea)

You keep a list of work **items** (tickets, requests, meetings, tasks).
When you finish an item you earn **tokens**. You spend tokens in the **Locker** on cosmetics (hair, outfit, gear, a pet partner, a background). It is a small game on top of a to-do list.

---

## 2. Who can use it? Registration and login

- **Login:** `POST /api/login` with email + password. The server remembers you with a **session cookie**. (Sanctum "SPA mode".) Too many wrong tries are blocked for a while (5 attempts).
- **Registration:** `POST /api/register`. **It only works while there are zero users.** The first person to register becomes the one and only user. After that the server answers 404 on purpose, because this is a **personal, single-user app**.
  - Right now the demo user (`demo@worktracker.test` / `password`) already exists, so registration is **closed**.
  - `GET /api/bootstrap` returns `canRegister: true/false` so the frontend knows whether to show the "create your account" link.
- **Logout:** `POST /api/logout` ends the session.
- **Forgot / reset password:** the server sends an email with a reset link (emails are only written to the log in dev). `POST /api/forgot-password`, then `POST /api/reset-password`.
- **Change password:** `PUT /api/password` (needs the current password).
- **Delete account:** `DELETE /api/profile` (needs the password).
- **Email verification:** a signed link `GET /verify-email/{id}/{hash}`. It then sends the browser to the frontend.
- **Every other URL needs you to be logged in.** If not, the answer is `401`.
- **You can only touch your own data.** A rule called a *Policy* (`ItemPolicy` and others) checks that the item belongs to you. Otherwise: `403`.

When a new user is created, they automatically own all the **free** locker items (price 0).

---

## 3. The main things stored (database tables)

| Table | Meaning |
|---|---|
| `users` | You. Also stores your chosen mascot, equipped cosmetics, and which columns you show on the All items page. |
| `items` | Your work items. Each has a per-user **number** (0001, 0002...), title, type, status, priority, sector, deadline, notes, and a reward. Deleting is a "soft delete" (hidden, not erased). |
| `sub_tasks` | Small checklist inside an item. |
| `attachments` | Files attached to an item (max 10 MB each). |
| `item_links` | "This item is related to that item". |
| `master_records` | A "case" or "session" (e.g. an exam session) that items can belong to. Has a code, title, date, student count. |
| `custom_fields` | Extra columns you invent (text, number, date, dropdown, checkbox). Max 20. Values are saved inside each item. |
| `token_ledger` | **The token history book.** Every gain and spend is one row. |
| `owned_cosmetics` | Which locker things you own. |
| `streaks` | Your current and best streak. |

Item **status**: `not_started`, `in_progress`, `done`. Item **priority**: `low`, `medium`, `high`. Item **type**: `ticket`, `request`, `meeting`, `task`.

---

## 4. How tokens work (the most important rule)

All of this lives in `app/Services/TokenService.php`. It is the **only** code allowed to change tokens.

### Your balance is never stored
Your balance is always the **sum of every row** in `token_ledger`. Like a bank statement: you do not keep a "total" that someone could edit, you add up the history. This means the number can never drift out of sync.

### Earning (when you set an item to Done)
- Low priority = **+5**, medium = **+10**, high = **+15**.
- **+5 extra** if you finish **on or before the deadline** (no deadline = no bonus).
- Marking Done also ticks all its sub-tasks.
- **Streak bonus: +50.** Finish at least one item on each of **5 working days in a row** (Mon-Fri, weekends are skipped). It is paid once per streak.

### Doing it twice does not pay twice
Every payment has a unique label (`ref`), like `item_done:12:1`. If the same label already exists, nothing new is written. So clicking Done twice, or a double request, pays once.

### Undo (moving an item out of Done)
- The server writes a **reverse row** that takes back what that completion paid (including the early bonus), and any streak bonus you no longer deserve.
- **If you already spent those tokens**, undo is **refused** with `422` and a message like "earn N more to undo it". The whole change is cancelled, nothing is half done.
- The streak is always **recalculated from the items that are Done right now**, so you cannot cheat by completing and undoing again and again.

### Safety
Each token action runs inside a **database transaction** and **locks the user row**. That means two requests at the same moment cannot both spend the same tokens.

### All numbers live in one place
Rewards, early bonus, streak size, and every locker price are in `config/locker.php`. The frontend can never send a price; the server always looks it up itself.

---

## 5. The Locker (shop)

- `POST /api/locker/buy`: checks the item exists, you do not already own it, and you can afford it. Then it writes a negative ledger row, saves ownership, and **equips it**. Buying and equipping succeed or fail together.
- `POST /api/locker/equip`: wear something you already own.
- `POST /api/locker/mascot`: pick your character (`kai`, `ren`, `sora`, `haru`).
- Categories: `hair`, `outfit`, `gear`, `partner`, `stage`.

---

## 6. All the endpoints (everything starts with `/api`)

### Screens (read data)
| URL | Gives the frontend |
|---|---|
| `GET /bootstrap` | Who is logged in, token balance, mascot, equipped items, streak, catalog, reward rules, `canRegister`. Works when logged out too. |
| `GET /today` | Items due today / in progress / coming up, progress, this week's day counts, week done count. |
| `GET /items` | All items with filters (`status`, `type`, `sector`, `range`), totals, custom fields, your column layout. Max 500 items. |
| `GET /items/{id}` | One item with sub-tasks, attachments, linked items, linkable items, custom fields, cases. |
| `GET /calendar` | Month / week / day view of items by deadline and master records by date (`?view=` and `?date=`). Weeks start on Monday. |
| `GET /review` | This week's finished items, tokens earned, unfinished carry-over, streak. |
| `GET /locker` | What you own, the shop categories, and the reward rules. |
| `GET /profile` | Profile page info. |
| `GET/POST/PATCH/DELETE /master-records` | List, view, create, edit, delete cases. Codes must be unique per user. |

### Changing data
| URL | Does |
|---|---|
| `POST /items` | Create an item. Number is the next free one for you. |
| `PATCH /items/{id}` | Edit fields and custom values. |
| `PATCH /items/{id}/status` | Change status. **This is the one that pays or takes back tokens.** Accepts `previous` to go back to where it was before Done. Returns the true balance. |
| `DELETE /items/{id}` | Soft delete. |
| `POST /items/{id}/sub-tasks`, `PATCH/DELETE /sub-tasks/{id}` | Checklist. |
| `POST /items/{id}/attachments`, `GET/DELETE /attachments/{id}` | Upload, download, remove files. |
| `POST/DELETE /items/{id}/links` | Link or unlink related items. |
| `POST/PATCH/DELETE /custom-fields` | Manage your extra fields. A new field appears as a column at once. Deleting one erases its values. A field's type cannot change after creation. |
| `PUT /preferences/items-columns` | Choose and order columns. Unknown columns are dropped and `title` can never be hidden. |

---

## 6b. Errors always look the same

- Not logged in: `401`
- Not yours: `403`
- Not found: `404`
- Bad input: `422` with `{ "errors": { "field": ["message"] } }`
- Too many requests: `429` (rate limit: 240 per minute when logged in)

---

## 7. Folder map (where things are)

```
backend/
  routes/api.php              every URL listed above
  routes/web.php              only "/" and the email-verify link
  app/Http/Controllers/       one controller per area
      Api/                      items, sub-tasks, files, links, custom fields, locker
      Auth/                     login, register, passwords, verification
      BootstrapController.php   shared info for every screen
  app/Services/TokenService.php        ALL token rules (read this first)
  app/Actions/ChangeItemStatus.php     the only way to change an item's status
  app/Services/CustomValues.php        checks custom field values
  app/Models/                 database objects (Item, User, ...)
  app/Policies/               "is this yours?" rules
  app/Enums/                  fixed lists (status, priority, type, ledger reason)
  app/Http/Requests/          input checks for login, profile, items
  app/Http/Resources/ItemResource.php  the shape of an item in JSON
  config/locker.php           rewards, prices, catalog (the rule book)
  database/migrations/        table definitions
  database/seeders/           demo user + sample data
  tests/                      70 automatic tests
```

---

## 8. Running and testing

```
composer install
php artisan migrate:fresh --seed     # builds tables + demo data
php artisan serve                    # or: pwsh scripts/serve.ps1  (allows 10 MB uploads)
php artisan test                     # uses the work_tracker_test database and WIPES it
```
Demo login: `demo@worktracker.test` / `password`.

Settings that matter in `.env`: `DB_*` (database), `APP_TIMEZONE` (Asia/Bangkok, decides what "today" and "working day" mean), `SANCTUM_STATEFUL_DOMAINS` (frontend address allowed to use cookie login), `FRONTEND_URL`.

---

## 9. Known gaps

- Streaks are rebuilt from items currently Done, so undoing an item can take a streak bonus back (and finishing it again pays it again).
- You cannot filter or sort by a custom field yet.
