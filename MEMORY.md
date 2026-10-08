# MEMORY.md — project decisions, open issues, lessons

This is an ordinary repository file maintained by hand. It is **not** Claude Code's auto-memory (that lives under
`~/.claude/projects/<project>/memory/`, and a repo file named `MEMORY.md` gets no special treatment). It holds durable
knowledge that the code can't tell you: *why* things are the way they are, known defects, unanswered questions, and
lessons from past investigations. For how to work in the repo see `CLAUDE.md`; for detailed references see `docs/`.

Last full reconciliation with the code: **2026-10-04**. Targeted follow-up checks are dated below. Remove entries when they stop being true.

---

## Decisions and why

**Daily SM-2 program replaced the flashcard-only flow (2026-07-09).** Implements the product's "one task per day:
Today's Study" idea. Modules `study`, `plans`, `settings`, `dashboard`; migration `20260709170034_add_learning_system`.

**The learning list is per volume (`learning_plans`), not per book (`watchlist_items`).** The book-level watchlist
was the original driver. `/api/watchlist` now derives "in my list" from active plans. `watchlist_items` is kept on
purpose (still written by POST/DELETE, never read). Don't drop it without asking.

**Two independent per-word tracks (2026-07-09, `add_manual_status`).** `status` + SM-2 columns belong to the daily
program, and `manual_status` to free review (`/vocabulary/review`, the Words-page badge/filter). The Vocabulary page became
browse-only. Deleting a plan resets that volume's SM-2 data but keeps manual marks. The confirm dialog in
`/settings` says so: the manual track is the user's own record.

**Study direction is a setting, not a mode toggle.** `user_settings.study_direction` (default `EN_TO_FA`). Progress is
keyed per review mode, so the two directions schedule independently.

**The day starts at 06:00 local** (`DAY_START_HOUR`), so a 1 a.m. session counts as the previous day and the queue
doesn't reset mid-study.

**`review_events` added (2026-08-13)** because `user_word_progress` holds only current state; growth curves, lapses and
reviews-to-stable need history. The log starts empty on existing installs; `/statistics` says so instead of showing
zeros.

**The Android build is fully offline by design.** No login, no server, no network at runtime. That is why
`frontend/src/offline/` duplicates backend logic instead of sharing it.

**Seed encryption is deliberately obfuscation-grade.** `VITE_SEED_SECRET` ships in the JS bundle. The goal was only
to defeat `unzip app.apk && cat words.json`. The runtime DB is separately SQLCipher-encrypted with a random per-device
passphrase in Keystore-backed EncryptedSharedPreferences. Rationale: `docs/SECURITY-REVIEW.md`.

**Monetization is planned, not built.** `docs/VocabFlow (Subscription Architecture v1).txt` describes a Cafe Bazaar
subscription validated by a NestJS/MySQL backend, with no login. None of it exists. The Express/Postgres backend in
this repo serves the web version only.

**Brand: navy `#18243C` + gold `#E4A824`** (sampled from the logo). Implemented as HSL theme tokens in
`src/index.css` across light, dark and study modes. Semantic greens (KNOWN) and destructive reds kept on purpose. The admin
sidebar accent is slate to stay distinct from the gold primary.

---

## Known defects and inconsistencies (found in the 2026-10-04 audit, not fixed)

These are documented, not fixed. Fixing any of them is a behavior change, so confirm with the user first.

- **`SEED_VERSION` bump wipes Android progress.** `seed.ts` deletes `progress` + `watchlist` and regenerates all
  ids, which orphans `learning_plans`, `review_events` and `study_sessions`. The code comment says this is intended ("wipe their
  local data"). Earlier docs claimed the opposite. The real fix would be stable ids or a migration of progress by
  `(book, volume, lesson, eng)`.
- Dashboard growth curve still reads `user_word_progress.last_reviewed_at`, not `review_events`.
- The **web** bundle contains SQLite and `VITE_SEED_SECRET` (`App.tsx` statically imports `offline/bootstrap`).
- Offline `repo.deleteWord` cascades by hand but leaves that word's `review_events` behind (Postgres cascades).
- Web logout only clears local state, so the refresh token stays valid server-side. Password change doesn't revoke
  refresh tokens either. `config/index.ts` silently falls back to hard-coded JWT secrets if `.env` lacks them.
- Offline `answerStudy` and backend `answer()` write progress and `review_events` without a transaction.
- Potential reminder defect (static inspection, 2026-10-08): `App.tsx` reschedules on foreground even while the
  study page is mounted; `rescheduleNotifications()` does not check `sessionDepth`. This can restore reminders
  cancelled by `beginStudySession()`. Device behavior is unverified; no application fix was made.
- `npm run lint` fails (ESLint not installed, no config). `npm run scrap` in `scrap/` points at a missing
  `scraper.js`.
- Validation baseline (2026-10-08): both package type checks passed; frontend `npm run format:check` reported
  pre-existing formatting issues in 23 files. This is not a clean formatting baseline; do not reformat unrelated files.
- `books/` and `frontend/seed-src/` hold the same 26 books but several files differ by a few bytes. Six old-format
  `seed-src/4000-essential-english-words-{1..6}.json` are dead (not in the manifest).
- `docs/DATABASE_SCHEMA.html` predates `review_events`.
- Cosmetic: unused Vazirmatn `@font-face` rules with broken URLs. Inter's unused external stylesheet was removed
  on 2026-10-08 after a render-blocking network delay was observed. `ReactQueryDevtools` is mounted, but the installed
  package exports a null component in production; this is not evidence of an active APK devtools panel.
- TTS cancellation (Android emulator, 2026-10-08): a native `speak()` promise remained pending after `stop()` and
  an additional 1.8 seconds. The installed 5.1.0 plugin clears its utterance callbacks on stop without resolving
  their calls. Long-session callback retention needs a dedicated fix/measurement; do not patch `node_modules`.
- Large study snapshots (2026-10-08): the daily page serializes the entire queue into localStorage on each answer.
  The allowed sum of plan review caps can be much larger than the new-word cap. Measurements and remaining
  performance concerns are in [PERFORMANCE.md](PERFORMANCE.md); no session format or queue-limit change was made.

## Open questions (could not be verified from the repo)

- Which copy of the book JSON (`books/` or `seed-src/`) is canonical?
- Has an APK ever been built on the Windows machine? All recorded builds were on the Linux machine.
- Are the reminders (local notifications) verified on a real device? The implementation log said "not yet".
- Are all migrations applied on each machine's Postgres? (`npx prisma migrate status` in `backend/`.)

Resolved by file inspection (2026-10-08): both Oxford Word Skills Intermediate JSON copies now contain 80 nonempty
lessons numbered 1–80 and 2,873 words. The earlier 11-lesson shortfall is absent; accuracy against the publisher's
content remains unverified (see `docs/CONTENT_PIPELINE.md`).

---

## Lessons from past bugs (why some code looks the way it does)

- **Correlated event lookups can pick the wrong useful index (2026-10-08).** Android SQLite 3.39.4 chose the
  mode/date index inside the old hard-today `EXISTS`, repeatedly scanning today's events for candidate words.
  Selecting the eligible word ids once with `IN` removed that repeated scan without changing the result. Inspect
  `EXPLAIN QUERY PLAN` on realistic history before adding indexes. Full evidence: [PERFORMANCE.md](PERFORMANCE.md).

- **SQLCipher open mode.** The first version used `encryption` mode on every first run. On a fresh install there is
  no plaintext file to encrypt, so the device threw `Failed in encryption … not found`. `db.ts` now branches on
  `isDatabase()`. Residual risk: a crash between `setEncryptionSecret` and DB creation leaves a plaintext DB that the
  next launch tries to open with the passphrase. Clearing app data recovers.
- **Index before column.** `idx_progress_due` was created in the top-level DDL before `migrateSchema()` added
  `next_review_at`, which crashed the dashboard on upgraded installs. Indexes on migrated columns live in `migrateSchema()`.
- **Missing native branch.** `bookService.getVolumes()` had no `isNative()` branch, so on device it hit `/api` and got
  `index.html` back (`t.map is not a function`). Any service method reachable on native needs a branch.
- **IPA rendered as tofu (▯).** Roboto Mono in the Android WebView lacks IPA glyphs. Use `.font-ipa`, never `font-mono`.
- **Silent TTS.** The WebView's `speechSynthesis` exposes no voices, and many engines reject `en-US`. Native calls the TTS
  plugin directly with `en` and retries during engine init. The manifest needs the `TTS_SERVICE` `<queries>` block.
- Since 2026-07-23 the native build has been run on physical devices (the SQLCipher bug was diagnosed from logcat).

---

## Two-machine workflow

The project is edited on two machines. The user's standing request is to mirror every changed file to the other machine
at the end of each task, without being asked.

| | Linux machine | Windows machine |
|---|---|---|
| Path | not recorded in the repo | `D:\project\VocabFlow` (`localadmin@192.168.2.115`, hostname `DESKTOP-83HQI7S`) |
| Shell | bash | PowerShell / Git Bash locally; **cmd.exe** over SSH (`dir` not `ls`, `&` not `;`) |
| APK builds | yes (JDK 17 at `/usr/lib/jvm/java-17-openjdk`) | none recorded (default JDK 21) |

- Before syncing, **check which machine you are on** (`hostname`, `ipconfig`/`ip addr`). The old instruction "scp to
  192.168.2.115" only makes sense from the Linux machine. From the Windows machine it would target itself.
- Method: `sshpass -e scp` with forward-slash remote paths, then compare byte sizes. Sync only files you changed.
  `frontend/public/logo/` and `frontend/public/books/` are already identical. Don't sync build/cache dirs (`node_modules`,
  `android/.gradle`, `android/**/build`, `android/app/src/main/assets/public`).
- `frontend/.env` (`VITE_SEED_SECRET`) must be identical on both, or encrypted seed blobs built on one won't decrypt on
  the other.
- Never write credentials into repo files.
