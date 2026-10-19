# Prompt: Build "Work Tracker" (Laravel + MySQL + Sanctum + Inertia/React)

Paste this into Claude Code in VS Code. Attach the UX/UI PDF (the 9 boards: Characters, Partners, Flow overview, Today, All items, Calendar, Item page, Weekly review, Locker) as the visual spec.

---

## ROLE
You are a senior full-stack engineer. Build the app below end to end in this repo, working in small vertical slices. After each slice: run migrations, run tests, run the dev server, and summarize what works. Ask me only if a decision is irreversible or truly ambiguous; otherwise choose a sensible default and note it.

## PRODUCT
A personal work tracker for one user (me). I capture work items (bank tickets, requests, meetings), organize them, schedule them on a calendar, do them, and review the week. It is gamified: finishing items earns **tokens** that I spend in a **Locker** to customize an original anime character and an animal partner.

The attached PDF is the visual and UX source of truth. Match layout, copy, interactions and style. Where the PDF is silent, follow the design system below.

## TECH STACK (fixed)
- Backend: **Laravel (latest stable, PHP 8.3+)**, **MySQL 8**, **Laravel Sanctum** for auth
- Starter: Laravel Breeze, **Inertia + React + TypeScript** stack (session auth through Sanctum's SPA/cookie guard; keep Sanctum configured)
- Frontend: React 18 + TypeScript, **Tailwind CSS**, **Motion** (framer-motion) for animation, **dnd-kit** for calendar drag, **BlockNote** for notes editor, **shadcn/ui (Radix)** for dialogs/dropdowns restyled to the manga look, **chrono-node** for date parsing
- Files: Laravel Storage (local disk in dev, S3-compatible in prod), 10 MB limit per file
- Tests: Pest (or PHPUnit) for backend, Vitest for the parser and token UI logic
- Local dev DB: MySQL via Docker Compose (service `mysql`), `.env.example` documented
- Deploy target: Laravel Cloud or Forge (include a short DEPLOY.md)
- three.js is OUT of scope for now (optional later for the Locker stage)

## DESIGN SYSTEM (from the PDF)
- Style: light **manga / anime** look. 2.5px black borders, hard offset shadows (e.g. `5px 5px 0 #15161D`), slightly rotated sticker badges, halftone dot backgrounds, slow rotating speed lines, small Japanese accent labels.
- Fonts: **Dela Gothic One** (headings), **Geist** (body), **Geist Mono** (labels/numbers)
- Colors: ink `#15161D`, background `#FAFAFC`, accent `#4F63F0`, yellow `#FFD23F`, pink `#FF4D8D`, mint `#7EE0B5`
- Define these as Tailwind theme tokens and CSS variables. Create reusable components: `Card`, `Button`, `Sticker`, `Chip`, `ProgressBar`, `Checkbox`, `Toast`, `TokenPill`.
- Honor `prefers-reduced-motion` (disable speed-line rotation, confetti, floating numbers).
- Characters are **original code-drawn SVG React components** (no external images, no copyrighted characters):
  - Mascots: **Kai** (default), Ren, Sora, Haru
  - Partners: **Ember** (dragon, default), Mochi (cat), Kon (fox), Pan (red panda)
  - Kai takes props: `hair`, `outfit`, `gear`, `mood` (`idle | happy | cheer`). Partner and stage are separate components. Reproduce the SVGs from the PDF as closely as you can.

## SCREENS (routes)
1. `/today` Capture: sidebar nav (Today, All items, Calendar, Master record, Weekly review, Locker) + token balance card. Quick-add input. Today list with checkboxes and per-row reward. Progress bar, week strip, "Done this week" card. Kai (with Ember) reacts to actions with a speech bubble and happy eyes.
2. `/items` Organize: table with status tabs (All / Not started / In progress / Done), type chips, sector filter, reward column, tokens "up for grabs", empty state with Ember.
3. `/calendar` Schedule: month view first (week/day views later), drag a chip to another day to change its deadline, toast "#NNNN moved to <day>. Ember approves!", today pulse, legend.
4. `/items/{id}` Do: status radios (Not started / In progress / Done), BlockNote notes, sub-tasks with progress bar (setting Done ticks all sub-tasks), file attachments, properties panel, linked items and linked master-record case.
5. `/review` Weekly review: "Week cleared!" hero with confetti when everything is done, stats (finished, tokens earned, open, streak x/5), Marked Done list with tokens, Carry over list.
6. `/locker` Reward: tabs hair / outfit / gear / partner / stage, live character preview, buy / equip / "Need N more" disabled state, "HOW TO EARN" panel.
7. `/master-record` Cases / exam sessions (dates, student counts), linkable from items. (The PDF has no board; make a simple table + detail page in the same style.)
8. Auth: login, logout, register disabled after the first user is created (single-user app). Everything except login requires auth and is scoped to the logged-in user.

## QUICK-ADD PARSER
Single line, e.g. `Ticket from DGB, due Friday`.
- Type words: ticket / request / meeting / task (default: task)
- Dates via chrono-node: today, tomorrow, weekday names, `due|by <date>`, explicit dates. Default timezone **Asia/Bangkok**.
- Title = remaining text, cleaned up. Priority words optional (`high`, `urgent`).
- Pure TypeScript function with unit tests (Vitest). Show a live preview chip row under the input (type, due date) before pressing Enter.

## DATA MODEL (MySQL, all tables scoped by `user_id`)
- `users` (Breeze default + `active_stage`, `equipped_hair`, `equipped_outfit`, `equipped_gear`, `equipped_partner`, `mascot`)
- `items`: `id`, `user_id`, `number` (auto-increment per user, shown as #0142), `title`, `type` enum(ticket,request,meeting,task), `status` enum(not_started,in_progress,done), `priority` enum(low,medium,high), `sector` string nullable, `deadline` date nullable, `received_at` date, `notes` JSON (BlockNote), `completed_at` timestamp nullable, `reward_tokens` unsigned int (stored when completed), `master_record_id` nullable FK, timestamps, soft deletes. Index on (`user_id`,`status`), (`user_id`,`deadline`).
- `sub_tasks` (`item_id`, `title`, `done`, `position`)
- `attachments` (`item_id`, `disk`, `path`, `original_name`, `mime`, `size`)
- `item_links` (`item_id`, `linked_item_id`) unique pair
- `master_records` (`user_id`, `code` like MR-031, `title`, `session_date`, `student_count`, `notes`)
- `token_ledger` (`user_id`, `delta` int, `reason` enum(item_done, item_undone, early_bonus, streak_bonus, purchase), `item_id` nullable, `locker_item_key` nullable, `balance_after`, timestamps). **Balance = SUM(delta).** Never store a mutable balance as the source of truth.
- `owned_cosmetics` (`user_id`, `category`, `key`) unique
- `streaks` (`user_id`, `current`, `best`, `last_day`)

## TOKEN RULES (server-side only, in DB transactions)
- Done reward: **+5 low, +10 medium, +15 high** priority
- **+5 bonus** if completed on or before the deadline
- **+50 bonus** when streak reaches 5 consecutive working days with at least one Done item (award once per streak cycle)
- Un-doing Done (status moved away from Done) writes a reversing ledger row for exactly what was awarded for that item
- Idempotent: moving to Done twice never awards twice (use `reward_tokens` + a unique rule per item/reason)
- Spending in the Locker: validate the catalog price on the server, block if balance is insufficient (row lock on the user), write a `purchase` ledger row, create `owned_cosmetics`
- Frontend shows optimistic UI, but always reconciles with the server balance returned by the API
- Implement as a `TokenService` plus an `ItemObserver`/action class. Cover with tests: award, early bonus, undo, double-complete, insufficient funds, streak.

## LOCKER CATALOG (server config file `config/locker.php`)
- hair: Teal (free), Midnight (free), Ginger 60, Lavender 80, Rose 80, Gold 120
- outfit: Black hoodie (free), Sky 60, Cream cardigan 60, Green bomber 80, Red track top 100
- gear: None (free), Headphones (free), Star clip 30, Round glasses 50, Red cap 90, Cat-ear band 120
- partner: Ember (free), Mochi 150, Kon 150, Pan 200
- stage: Paper (free), Sky 40, Sunset 60, Sakura 80, Neon night 120
Free items are owned on registration.

## API / BACKEND STRUCTURE
- Inertia controllers for pages; JSON endpoints for in-page actions (quick-add, status change, reschedule drag, sub-task toggle, buy/equip)
- Form Requests for validation, Policies so a user can only touch their own rows, API Resources for responses
- Weekly review query: items with `completed_at` in the current ISO week (Mon–Sun, Asia/Bangkok) and open items to carry over
- Seeders: a demo user and realistic sample items matching the PDF (#0142 "Ticket from DGB", #0141, #0139, #0137, #0133, case MR-031)
- Optional later: one-time Notion import command `php artisan import:notion` (TASK and RL-Task databases) — scaffold the command only, do not run

## BUILD ORDER (stop after each and report)
1. Project setup: Laravel + Breeze (Inertia React TS) + Sanctum, Tailwind tokens, fonts, Docker Compose MySQL, `.env.example`, README
2. Migrations, models, factories, seeders, `config/locker.php`
3. `TokenService` + tests
4. Shared UI kit + app shell (sidebar, token card) + SVG character/partner components
5. Today page + quick-add parser (+ tests) + complete/undo with token animation
6. All items page (filters)
7. Item page (status, sub-tasks, BlockNote notes, attachments, links)
8. Calendar (month view, drag to reschedule)
9. Weekly review
10. Locker (buy, equip, live preview)
11. Master record
12. Polish: reduced-motion, empty states, loading and error states, keyboard accessibility, mobile layout
13. Deploy notes (DEPLOY.md), final test run

## DEFINITION OF DONE
- `php artisan migrate:fresh --seed` works on MySQL
- Test suite green (Pest + Vitest)
- Every screen matches the PDF visually and works with real data (no hard-coded sample data)
- Token balance is identical on every screen and can only change through the server
- No console errors; keyboard-accessible; honors reduced motion
- Short README: setup, env vars, how to run, how tokens work

Start with step 1 now. Before writing code, inspect the repo and the attached PDF, then give me a 10-line plan.
