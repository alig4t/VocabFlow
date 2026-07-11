# VocabFlow / وکب — Technical Reference

Durable technical knowledge for the VocabFlow English-learning app. Complements `README.md` (EN) and `PROJECT_DOCS.md` (FA, scrapers + book import).

## Stack & layout
- **Frontend**: React + TS + Vite + Tailwind + shadcn/ui, TanStack Query (server state) + Zustand (`authStore`). RTL Persian, dark mode, `font-persian`. Path alias `@/…`.
- **Backend**: Node + TS + Express + Prisma + PostgreSQL. Layered modules in `backend/src/modules/<name>/` = `*.repository.ts` / `*.service.ts` / `*.controller.ts` / `*.router.ts` (+ `dto/`). Routers mounted in `backend/src/app.ts` under `/api/<name>`.

## API conventions (IMPORTANT)
- Backend responds `res.json({ success: true, data })`. The frontend axios interceptor (`frontend/src/lib/axios.ts`) **unwraps** the envelope: `response.data = response.data.data`. So services do `api.get<T>(...).then(r => r.data)` and receive the inner payload directly.
- Auth: JWT Bearer. `authenticate` middleware sets `req.user` (`JwtPayload`); **userId = `req.user.sub`**. Error classes come from `shared/errors`: `NotFoundError('Book')`, `ValidationError(msg)`, `UnauthorizedError`, `ForbiddenError`, `ConflictError` (there is **no** `BadRequestError`).
- Endpoints registered in `frontend/src/config/api.ts` (`API_ENDPOINTS`).

## Prisma models
`Book → Volume → Lesson → Word`.
- `Word` has `lessonId?`, legacy `chapter?`/`unit?`, `pronunciationAudio?` (server audio URL, often null), `pronunciation?` (IPA text).
- `UserWordProgress` unique `[userId, wordId, reviewMode]`, `status` = `NOT_READ | KNOWN | NOT_KNOWN`, `reviewMode` = `EN_TO_FA | FA_TO_EN`. **Plus SM-2 fields** (added 2026-07-09): `repetitions, intervalDays, easeFactor, reviewCount, correctCount, wrongCount, lastReviewedAt?, nextReviewAt?, introducedAt?`. `introducedAt = null` ⇒ the word is still a "new word" candidate (never entered the cycle).
- **A word the user never interacted with has NO progress row.**
- **`LearningPlan`** unique `[userId, volumeId]` (`dailyNewWords`, `dailyGoal`, `isActive`) — the per-volume "my learning list", **source of truth** replacing the book-level watchlist.
- **`StudySession`** — one row per completed daily session (`durationSec`, `reviewedCount`, `correctCount`, `wrongCount`, `hardCount`, `skippedCount`, `newCount`); powers streak/heatmap/accuracy.
- **`UserSettings`** (PK `userId`) — `studyDirection` (which `ReviewMode` the daily system schedules; default `EN_TO_FA`), `autoPlayAudio`, `showPhonetics`, `showExamples`, `cardOrder` (`SEQUENTIAL | RANDOM`).

## Words query quirks (`backend/src/modules/vocabulary/word.repository.ts`)
- Filters: `chapter, unit, lessonId, volumeId, bookId, bookIds[], status, mode, sort, order, search`.
- `bookId` + `volumeId` must be merged into a **single** nested `lesson` filter — two separate spreads collide on the `lesson` key (last wins, silently dropping `volumeId`).
- Multi-book: `bookIds` (controller parses comma-separated string) → `lesson: { volume: { bookId: { in: [...] } } }`.
- **`status: NOT_READ`** cannot use `progress: { some: {...} }` (it misses rows-less words). Use negation:
  `NOT: { progress: { some: { userId, reviewMode: mode, status: { in: ['KNOWN','NOT_KNOWN'] } } } }`.
  `KNOWN`/`NOT_KNOWN` keep the `some` form.

## Daily learning system — SM-2 (added 2026-07-09)
The core learning loop. See [[daily-learning-system]] memory. Web/API path is complete + verified; **native offline mirror is done in `frontend/src/offline/`** (Phase 7).

- **Backend modules** (`backend/src/modules/`, layered like the rest, mounted in `app.ts`):
  - `study` → `srs.ts` (pure SM-2: `AGAIN=q1, HARD=q3, EASY=q5, SKIP=no-op`; ease floor 1.3; interval ladder 0→1→6→round(iv·ease)) + `GET /study/today` (due reviews then new words, capped by `dailyNewWords − introducedToday`), `POST /study/answer` `{wordId, answer}`, `POST /study/session`.
  - `plans` → `/api/plans` CRUD (`GET`, `POST {volumeId, dailyNewWords, dailyGoal}`, `PATCH /:id`, `DELETE /:id`).
  - `settings` → `/api/settings` `GET` (lazy-creates defaults) + `PUT`.
  - `dashboard` → `/api/dashboard` — **real** `DashboardData` (stats/watchlist/heatmap/queue) computed from progress + sessions. **No more mock** (the old `mockDashboard` in `dashboard.service.ts` was deleted).
- **Direction**: the daily system schedules ONE direction, `UserSettings.studyDirection`. Progress is per-mode, so directions are independent.
- **Frontend**: `/study` (`pages/study/StudySessionPage.tsx`, Easy/Hard/Again/Skip + `SessionSummaryScreen`; Again/Skip requeue in the frozen session), `StudyTodayHero` on the dashboard, `StartPlanDialog` in the library (volume + dailyNewWords picker), `/settings` (`pages/settings/SettingsPage.tsx`). Hooks: `useStudy`, `usePlans`, `useSettings`. Services `study/plan/settings.service.ts` branch on `isNative()`.
- **⚠️ MIGRATION**: `backend/prisma/migrations/20260709170034_add_learning_system/`. On **each** machine run `cd backend && npm run db:migrate` + restart backend.

## Watchlist feature (added 2026-07-04; SUPERSEDED by LearningPlan 2026-07-09)
`WatchlistItem` (`@@unique([userId, bookId])`, table `watchlist_items`) still exists but is **no longer the source of truth** — the "learning list" is now the volume-level `LearningPlan`. `/api/watchlist` endpoints remain (`GET /watchlist` selector, `GET /watchlist/discovery` library, `POST`/`DELETE`) but **`GET /watchlist` and discovery's `inWatchlist` now derive from active plans**, not the watchlist table. The library's add flow calls `POST /plans` (via `StartPlanDialog`), not `POST /watchlist`.

## Review page (`frontend/src/pages/vocabulary/ReviewPage.tsx`)
> **Two distinct review flows:** `ReviewPage` (`/vocabulary/review`) is the **manual free-browse** reviewer (binary Known/Not-known marking, unchanged). The **daily SM-2 session** is the separate `StudySessionPage` (`/study`, Easy/Hard/Again/Skip). Don't conflate them.

- **Frozen session snapshot**: entering a session freezes the fetched word list (keyed by `mode|filter|book|volume|lesson`). Marking a word updates its status in place + persists, but never removes it mid-session (the words query is disabled after seeding via `useWords(..., { enabled })`). This keeps the counter advancing `1→2→…`, one step per action.
- Book selector is limited to the watchlist (`useWatchlistBooks`); empty watchlist ⇒ no words + "go to library" prompt. Container `max-w-5xl`.
- **Flip card** is controlled by the parent and remounted via `key={word.id + mode}`; flip resets synchronously on navigation so the next card never flashes its back face.
- **Keyboard**: `←`/`→` navigate, `Space` flip, `↑` known, `↓` not-known, `P` pronounce.
- **Pronunciation** (`frontend/src/lib/pronounce.ts`): English word only; prefers `word.pronunciationAudio`, falls back to browser `speechSynthesis` (`en-US`, rate `0.9`) — same behavior as `WordCard`. Auto-plays on entering the next word **only in EN_TO_FA and when not muted**.
- Persisted in `localStorage`: `vocab_review_muted`, `vocab_review_mode`.
- Edit link `/admin/words/:id/edit` opens in a new tab (admin-only page).

## WordCard (`frontend/src/components/vocabulary/WordCard.tsx`)
Primary/secondary word swap by `mode`:
- `EN_TO_FA` → English bold on top, Persian muted below.
- `FA_TO_EN` → Persian bold on top, English muted below (English inherits the old Persian style).

## Dual-system mirror
The app is maintained on two machines in parallel. After editing files locally, mirror them to the Windows box:
- Host `192.168.2.115`, user `localadmin` (cmd.exe shell), project dir **`D:/project/VocabFlow`** (singular `project`, capital-F `VocabFlow`), same tree layout.
- Method: `sshpass -e scp` with forward-slash remote paths; verify byte sizes match afterward. Create new remote dirs with `mkdir` (backslash paths) before copying new files.
