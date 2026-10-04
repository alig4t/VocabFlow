# CLAUDE.md

**VocabFlow** (brand «وکب»): a Persian-language app for learning English vocabulary. It has three tracks, built from
published word books: واژگان (words), افعال عبارتی (phrasal verbs), باهم‌آیی‌ها (collocations). The UI is Persian/RTL,
and the content is English↔Persian.

One codebase ships two products. The branch point is `isNative()` in `frontend/src/lib/platform.ts`.

| | Web app | Android APK |
|---|---|---|
| Data | Express API + PostgreSQL (`backend/`) | on-device SQLite/SQLCipher (`frontend/src/offline/`), fully offline |
| Auth | JWT access + refresh, roles USER/ADMIN | none; a local user with role ADMIN |

There is no subscription, trial or payment code anywhere. `docs/VocabFlow (Subscription Architecture v1).txt` is an
unimplemented plan.

## How to work here

1. **Read the code before changing behavior.** The docs were reconciled with the code on 2026-10-04, but code wins.
   If a doc is wrong, fix it in the same change.
2. **Open the relevant reference first.** [`docs/README.md`](docs/README.md) maps every doc and its status. Backend
   and API: `docs/BACKEND.md`. Frontend: `docs/FRONTEND.md`. Offline/APK: `docs/ANDROID.md`. Book data:
   `docs/CONTENT_PIPELINE.md`. Rationale and known defects: [`MEMORY.md`](MEMORY.md). The docs are mostly in Persian.
3. **Plans are not features.** Specs, the security advisory sections and old implementation logs describe intent.
   Never treat them as proof that something exists.
4. **Every data-layer change lands on both sides**: the API and `offline/repo.ts`, plus `offline/db.ts` for schema.
   Use the `schema-change` skill.
5. **Keep to existing patterns.** Copy the neighboring module or component. No architectural rewrites, dependency
   upgrades (Prisma is pinned at 5.22) or "cleanup" of the known defects listed in `MEMORY.md` unless asked.
6. **Validate and report honestly** (see Checks). There are no tests, so never claim tests passed.
7. **Don't** build the APK, bump `SEED_VERSION` or commit unless the user asks. (Syncing to the other machine is a
   standing request; see "Two machines".)

## Layout

```
backend/                 Express + TS + Prisma; prisma/ (schema, 10 migrations, seed/import scripts); src/modules/<12 modules>
frontend/src/services/   data layer — the web/native switch lives here
frontend/src/offline/    SQLite mirror of the backend: db.ts, repo.ts, srs.ts, seed.ts, seed-crypto.ts, bootstrap.ts
frontend/src/hooks/      TanStack Query wrappers over services
frontend/android/        Capacitor Android project (assets/public is generated + git-ignored)
frontend/seed-src/       plaintext book JSON for the APK → public/seed-enc/*.enc (AES-256-GCM, committed)
books/                   book JSON for the Postgres import (a separate copy; see docs/CONTENT_PIPELINE.md)
scrap/                   content scrapers (book-scraper.js is git-ignored)
docs/                    reference docs (see docs/README.md)
.claude/skills/          schema-change, add-book-content, android-build
```

## Commands

```bash
docker compose up -d                 # Postgres 16 on :5432, db english_learning (container eng1_postgres)

cd backend
npm run dev                          # tsx watch → http://localhost:3000, GET /api/health
npm run db:migrate                   # prisma migrate dev  — then:
npm run db:generate                  # after ANY schema.prisma edit
npm run db:seed                      # vocabulary module + admin@example.com/Admin123!, user@example.com/User123!
npm run db:seed-all-datas            # import-all.ts: every *.json in <repo>/books (NOT frontend/seed-src)
npm run build                        # tsc → dist/

cd frontend
npm run dev                          # http://localhost:5173, proxies /api → :3000
npm run build                        # tsc && vite build
npm run format / format:check        # prettier (no config file → defaults)
npm run seed:encrypt                 # seed-src (manifest.json list) → public/seed-enc; needs VITE_SEED_SECRET
```

APK: `npx vite build && npx cap sync android`, then Gradle `assembleDebug` with JDK 17. Use the `android-build`
skill, and only when asked.

### Checks (what actually exists)

- `npx tsc --noEmit` in `backend/` and in `frontend/`: both passed with 0 errors on 2026-10-04. This is the main
  automated check, so run it after every change.
- `npm run lint` is **broken**: ESLint isn't installed and has no config. Don't rely on it or "fix" it unasked.
- No test suite, no CI. Backend behavior can be checked with `curl` against the running API (log in via
  `POST /api/auth/login`). UI changes can only be verified by running the app. Native/SQLite behavior can only be
  verified on a device or emulator. Say what you did and did not verify.

## Environment

- `backend/.env` (see `.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`,
  `JWT_REFRESH_EXPIRES_IN`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`. Nothing is validated at startup, and missing JWT secrets
  silently fall back to hard-coded strings.
- `frontend/.env`: `VITE_SEED_SECRET` (required for seed encryption and decryption, and identical on every build machine);
  optional `VITE_API_URL` (default `/api`).
- Never print or commit `.env` values.

## Backend conventions

- Module = `<name>.router.ts` (wires repository → service → controller) / `.controller.ts` / `.service.ts` /
  `.repository.ts` (the only Prisma access). Mounted in `src/app.ts` under `/api/<name>`; `vocabulary` is `/api/words`.
  Not uniform: only `auth`, `books` and `vocabulary` have `dto/`; the others use inline zod + `safeParse`. `users`,
  `progress` and `synonyms` use function-style controllers, and `synonyms` has no repository. **Copy the neighboring module.**
- Success responses are `{ success: true, data }`. Throw `AppError` subclasses (`NotFoundError`, `ValidationError`,
  `ConflictError`, `UnauthorizedError`, `ForbiddenError`; there is no `BadRequestError`), which
  `shared/middleware/error.middleware.ts` turns into `{ success: false, message, code }`. Never build error
  responses in a controller.
- The user id is `req.user.sub`. Protected routers call `router.use(authenticate)` once; admin writes use `requireAdmin`.
- The only paginated endpoint, `GET /api/words`, nests `meta` inside `data`.

## Frontend conventions

- Path alias `@/` → `frontend/src/`. Endpoint paths live only in `config/api.ts`.
- The axios interceptor unwraps the envelope, so services receive the payload, not `{ success, data }`.
- Service pattern: `const off = () => import('@/offline/repo')`, then `if (isNative()) return off().then(o => o.x())`,
  otherwise the axios call. Exceptions: `auth.service`, `user.service` and the book/volume/lesson CRUD in
  `book.service` are web-only.
- Components use `hooks/use*.ts`, not services. Existing exceptions: `StudySessionPage` (answer/recordSession),
  `WordFormPage` (addExample), `WordCard` (synonyms).
- `store/authStore.ts` is Zustand that writes localStorage by hand (no persist middleware). `App.tsx` renders nothing
  until `isReady`, and on native also waits for `dbReady` (the seed). All pages are `lazy()`.
- UI: shadcn/ui in `components/ui/` + Tailwind. Theme tokens are HSL variables in `src/index.css` for `:root`
  (light), `.dark` and `.study` (sepia). RTL is applied **per element** (`dir="rtl"` / `.rtl`); `<html>` is `dir="ltr"`.
  Persian font is `font-persian` (Anjoman). IPA uses `.font-ipa`, never `font-mono` (it renders tofu on Android).

## Data invariants (break these and you corrupt user data)

Source of truth: `backend/prisma/schema.prisma` (17 tables, 5 enums).

- **`user_word_progress` is unique on `(user_id, word_id, review_mode)`.** A word has up to two rows per user
  (EN_TO_FA, FA_TO_EN), and a word the user never touched has none. Every count must filter `review_mode`.
- **Two independent tracks on that table.** `status` + the SM-2 columns belong to the daily program: written by
  `study` answers and reset by `DELETE /api/plans/:id`. `manual_status` belongs to free review: written only by the
  `progress` module (`/vocabulary/review`; the Words-page filter reads it). Neither path writes the other's column.
- **`learning_plans` (per volume) drives the daily queue.** `watchlist_items` (per book) is legacy: still written,
  never read. `/api/watchlist` derives "in my list" from active plans.
- **`review_events` is the only history.** It gets one row per schedule-changing answer (never SKIP), appended by
  `study.service.answer()` and offline `repo.answerStudy()`. Anything historical (lapses, growth, reviews-to-stable)
  must come from it. Exception today: the dashboard growth curve still reads `last_reviewed_at`.
- `words.lesson_id` is nullable (`module_id` is required). Lesson-less words never appear in library browsing.

## SM-2 scheduler

`backend/src/modules/study/srs.ts` and `frontend/src/offline/srs.ts` are logically identical but not byte-identical.
**Change both together.**
- `AGAIN`→q1 (lapse, due again today), `HARD`→q3, `EASY`→q5. `SKIP` writes nothing, and the session UI doesn't requeue
  it either; only AGAIN requeues within the session. Ease floor is 1.3; intervals go 1 → 6 → round(interval × ease).
- **The day starts at 06:00 local** (`DAY_START_HOUR = 6`), not midnight, in both copies.
- The direction comes from `user_settings.study_direction`. Plan limits: `daily_new_words ∈ {10,20,30,40,50}`, and active
  plans may total at most 200 new words per day.

## Offline (native) mirror

`offline/db.ts` mirrors the Prisma schema: one user, no `user_id`, no `users`/`refresh_tokens`/`learning_modules`/
`synonym_groups`, `progress` keyed `(word_id, review_mode)`, `order` → `ord`, arrays as JSON `TEXT`, ISO-8601 UTC date
strings, **no foreign keys** (cascade by hand), plus a `meta` table and reminder columns on `user_settings`.

- **New column on an existing table needs two edits:** the `CREATE TABLE` DDL **and** the table's `*_ADDED_COLUMNS`
  array (`CREATE TABLE IF NOT EXISTS` never alters an installed table). Indexes on new columns go inside
  `migrateSchema()`. `NOT NULL` needs a `DEFAULT`.
- ⚠ **Bumping `SEED_VERSION` (`offline/seed.ts`, currently `"5"`) deletes all `progress` and `watchlist` rows** and
  regenerates every word/volume id, which orphans plans, sessions and `review_events`. Bump only when the book content changed
  *and* the user has accepted losing on-device progress. Never bump for schema changes; those go through `migrateSchema()`.
- Book title maps exist twice, in `backend/prisma/import-all.ts` and `offline/seed.ts`, and must match. The collocations
  advanced slug has a trailing dash: `english-collocations-in-use-advanced-`.
- `App.tsx` statically imports `offline/bootstrap`, so SQLite code and `VITE_SEED_SECRET` are in the web bundle too.
  Only `repo.ts` is lazily split.

## Native gotchas

- Pronunciation is fully offline. Native calls the TTS plugin directly with lang `en` (not `en-US`) and retries during
  engine init; the WebView's `speechSynthesis` has no voices. Web uses easy-speech.
- Android is edge-to-edge (targetSdk 35). Safe-area insets come from the custom `SafeAreaPlugin` via `lib/safeArea.ts`
  (`--safe-top`/`--safe-bottom`). Use those variables, not raw `env()`.
- Reminders are native-only local notifications (`lib/notifications.ts`), rebuilt on launch, resume and session end.
  See `docs/NOTIFICATIONS.md`.
- Toolchain: Gradle wrapper pinned to `gradle-8.10.2-all` (don't change it), AGP 8.2.1, JDK 17, SDK 35/min 22.
- Logo PNGs have a white background and no transparency. On dark surfaces, put them in a light rounded chip.

## Brand

Logo colors are navy `#18243C` + gold `#E4A824`, expressed as HSL tokens (gold `--primary`) in all three themes. Semantic
greens (KNOWN) and destructive reds stay as they are; the admin sidebar accent is slate.

## Two machines

The repo is edited on a Linux machine and on a Windows machine (`D:\project\VocabFlow`, `192.168.2.115`, cmd.exe over
SSH). The user wants changed files mirrored to the *other* machine at the end of each task. **First check which machine
you are on (`hostname`)**, because older notes were written from the Linux side and "scp to 192.168.2.115" targets the
Windows machine itself. Method and caveats are in `MEMORY.md`. If the other machine's address isn't known, say so
rather than guessing. Never write credentials into the repo.
