---
name: vocabflow
description: >-
  Working knowledge for the VocabFlow English-learning app (React/Vite + Express/Prisma/Postgres,
  dual web + native Capacitor/SQLite build). Load this when implementing or debugging anything in
  this repo: the SM-2 daily learning system (plans, study sessions, streaks, dashboard), backend
  modules, the offline native mirror, or the dev/run workflow. Complements PROJECT_TECH_REFERENCE.md
  and PROJECT_DOCS.md.
---

# VocabFlow — working skill

Durable playbook for this repo. Read `PROJECT_TECH_REFERENCE.md` (durable tech) and `PROJECT_DOCS.md`
(FA; scrapers + DB import) alongside this.

## Stack & layout
- **Frontend** `frontend/` — React + TS + Vite + Tailwind + shadcn/ui, TanStack Query (server state)
  + Zustand (`authStore`). RTL Persian, dark mode, `font-persian`, path alias `@/…`. Dual-target:
  **web** (calls the API) and **native** Android (Capacitor + local SQLite, `@/offline/`). Almost
  every service branches on `isNative()` (`@/lib/platform`).
- **Backend** `backend/` — Node + TS + Express + Prisma + PostgreSQL. Layered modules in
  `backend/src/modules/<name>/`: `*.repository.ts` / `*.service.ts` / `*.controller.ts` /
  `*.router.ts` (+ `dto/`). Routers mounted in `backend/src/app.ts` under `/api/<name>`.

## Conventions (match these exactly)
- Backend responds `res.json({ success: true, data })`. The axios interceptor
  (`frontend/src/lib/axios.ts`) **unwraps** the envelope, so services do
  `api.get<T>(...).then(r => r.data)` and get the inner payload.
- Auth: JWT Bearer, `authenticate` middleware sets `req.user`; **userId = `req.user.sub`**.
- Errors from `backend/src/shared/errors`: `NotFoundError('X')`, `ValidationError(msg)`,
  `UnauthorizedError`, `ForbiddenError`, `ConflictError` (there is **no** `BadRequestError`).
- Controllers validate with **zod** `safeParse`, joining issues into a `ValidationError`.
- Each repository does `const prisma = new PrismaClient()` at module top (existing pattern — follow it).
- Frontend endpoints live in `frontend/src/config/api.ts` (`API_ENDPOINTS`); types in
  `frontend/src/types/index.ts`; hooks in `frontend/src/hooks/`.

## Prisma models
`Book → Volume → Lesson → Word`. `UserWordProgress` is per `[userId, wordId, reviewMode]`
(`EN_TO_FA | FA_TO_EN`), `status` `NOT_READ | KNOWN | NOT_KNOWN`, **plus SM-2 fields**
(`repetitions, intervalDays, easeFactor, reviewCount, correctCount, wrongCount, lastReviewedAt?,
nextReviewAt?, introducedAt?`). A word never touched has **no** progress row; `introducedAt = null`
⇒ still a "new word". New models: `LearningPlan` (`@@unique[userId,volumeId]`, dailyNewWords/dailyGoal/
isActive — the learning list), `StudySession`, `UserSettings` (studyDirection, autoPlayAudio,
showPhonetics, showExamples, cardOrder). Enum `CardOrder`.

## Daily learning system (SM-2) — the core feature
- **Backend** `modules/study` (`srs.ts` pure scheduler + `/study/today`, `/study/answer`,
  `/study/session`), `modules/plans` (`/api/plans` CRUD), `modules/settings` (`/api/settings`),
  `modules/dashboard` (`/api/dashboard`, real aggregation — no mock).
- **SM-2** (`srs.ts`): answers `AGAIN=q1, HARD=q3, EASY=q5, SKIP=no-op`. Lapse (q<3) resets
  repetitions & interval to 0 (due today, `NOT_KNOWN`). Pass: interval ladder `0→1→6→round(iv·ease)`,
  repetitions++, `KNOWN`. `ease = max(1.3, ease + (0.1 − (5−q)(0.08 + (5−q)·0.02)))`.
- **today's queue** = due reviews (`introducedAt≠null, nextReviewAt≤endOfToday`) first, then new words
  (no introduced progress row) per plan, capped at `dailyNewWords − introducedToday`, ordered by
  lesson then chapter/created. Direction is `UserSettings.studyDirection` (single direction; progress
  is per-mode so directions are independent).
- **Frontend**: `/study` (`pages/study/StudySessionPage.tsx` — Easy/Hard/Again/Skip, reveal-then-rate,
  Again/Skip requeue in a frozen session, `SessionSummaryScreen`); `StudyTodayHero` on the dashboard;
  `StartPlanDialog` in the library (pick volume + dailyNewWords 10/20/30/50); `/settings`
  (`pages/settings/SettingsPage.tsx`). Hooks: `useStudy`, `usePlans`, `useSettings`. The old
  `/vocabulary/review` (`ReviewPage`) is the separate **manual** reviewer — don't conflate them.
- The learning list is now the volume-level `LearningPlan`. `WatchlistItem` still exists but
  `/api/watchlist` + discovery `inWatchlist` **derive from active plans**.

## Native offline mirror (`frontend/src/offline/`)
Native has no server — everything is local SQLite. When you change the learning system you MUST
mirror it here or native breaks:
- `db.ts` — SQLite schema (`CREATE TABLE IF NOT EXISTS`) + `migrateSchema()` which
  `ALTER TABLE … ADD COLUMN`s for existing installs (IF NOT EXISTS never alters an existing table).
- `srs.ts` — a standalone copy of the backend SM-2 (keep the two in sync).
- `repo.ts` — offline equivalents of every service call; `seed.ts` loads bundled book JSON, gated by
  `SEED_VERSION` (bump ONLY when bundled content changes — bumping wipes local progress). User-data
  tables (progress, plans, sessions, settings) are never wiped.
- Services branch on `isNative()`; native → `import('@/offline/repo')`, web → API.

## Dev / run workflow
```
# DB (Docker):        docker compose up -d           # postgres :5432 (eng1_postgres)
# migrate + client:   cd backend && npm run db:migrate && npm run db:generate
# backend:            cd backend && npm run dev       # tsx watch, :3000
# frontend:           cd frontend && npm run dev      # vite :5173, proxies /api → :3000
# typecheck:          npx tsc --noEmit  (each package)
# frontend build:     npm run build  (tsc && vite build) — strongest static check; eslint isn't installed locally
```
No browser driver in the build env — verify frontend via tsc + build (+ manual click-through at
localhost:5173). Validate offline SQL against `sql.js` in the scratchpad (no native compile needed).
Backend logic is verifiable end-to-end with curl against the running API.

## Gotchas
- `word.repository.ts`: merge `bookId` + `volumeId` into a SINGLE nested `lesson` filter (two spreads
  collide). `status: NOT_READ` must use `NOT: { progress: { some … } }` (rows-less words), not `some`.
- Study/Review sessions run on a **frozen snapshot**; marking never drops a card mid-session.
- **Migrations**: after schema changes run `npm run db:migrate` on each machine; the app is mirrored
  across two machines (see the dual-system note in `PROJECT_TECH_REFERENCE.md`).
- **Do NOT build an APK / run the Android Gradle build** unless the user explicitly asks.
- Prisma is v5.22 (don't auto-upgrade). Dates in offline SQLite are stored as ISO-8601 UTC strings
  so lexical `<=` comparisons are chronological.
