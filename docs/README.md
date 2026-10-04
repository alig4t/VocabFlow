# VocabFlow documentation map

Start at the repo-root [`CLAUDE.md`](../CLAUDE.md) (agent entry point) or [`README.md`](../README.md) (human quick
start). This folder holds the detailed references. Source code is always the final authority; every doc below
was reconciled against the code on **2026-10-04** unless its status says otherwise.

| Doc | Lang | Covers | Status |
|---|---|---|---|
| [`BACKEND.md`](BACKEND.md) | FA | Express API: modules, full route table, envelope/errors, auth, SM-2 engine, daily queue, plan rules, `/api/words` filter traps, scripts | Current |
| [`FRONTEND.md`](FRONTEND.md) | FA | Routes and guards, web/native service switch (with exceptions), axios/auth, query keys, ReviewPage/StudySessionPage behavior, themes/RTL/fonts/safe-area, pronunciation | Current |
| [`ANDROID.md`](ANDROID.md) | FA | Offline APK: SQLite mirror and its differences from Postgres, schema migration, seed + encryption, **seed re-version wipes progress**, build/toolchain, troubleshooting | Current (build steps were last run on the Linux machine) |
| [`NOTIFICATIONS.md`](NOTIFICATIONS.md) | FA | Native local study reminders: reschedule-on-open, reminder ladder, settings columns, icon, permissions | Current design; sections 8–10 are the original implementation session's log |
| [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) | FA | Scrapers, `books/` vs `seed-src/`, title maps, Postgres import, APK seed, JSON format | Current; scraper sections partly historical |
| [`SECURITY-REVIEW.md`](SECURITY-REVIEW.md) | FA | Threat model for the offline APK; what is implemented (seed AES-GCM, SQLCipher runtime DB) vs advised | "Implementation status" section is current; sections 1–12 are the original advisory (pre-implementation) and describe a **planned** NestJS/Bazaar backend that does not exist |
| [`DATABASE_SCHEMA.html`](DATABASE_SCHEMA.html) | FA | Annotated table-by-table schema | **Partially stale:** written before migration `20260813000000_add_review_events`, so it has no `review_events` table. Use `backend/prisma/schema.prisma` as the source of truth |
| [`MIGRATION.md`](MIGRATION.md) | EN | One-time MySQL → PostgreSQL migration | Historical |
| [`VocabFlow (Subscription Architecture v1).txt`](<VocabFlow (Subscription Architecture v1).txt>) | FA | Product plan: offline-first app + NestJS/MySQL backend that only validates Cafe Bazaar subscriptions | **Plan only — nothing in it is implemented** (no subscription, trial, premium or payment code exists anywhere in the repo) |

Other knowledge files:

- [`../MEMORY.md`](../MEMORY.md) — decisions and rationale, open questions, the two-machine workflow. It is an ordinary
  repo file, *not* Claude Code's auto-memory.
- [`../.claude/skills/`](../.claude/skills/) — step-by-step procedures: `schema-change`, `add-book-content`,
  `android-build`.

## Keeping these accurate

- When code changes make a statement here wrong, fix the doc in the same change. If you cannot verify a claim,
  mark it unverified instead of guessing.
- Keep one home per topic (the table above) and cross-link instead of copying. `CLAUDE.md` holds only the
  invariants an agent needs on every task; the details live here.
- Plans and specs describe *intended* behavior. Never cite them as evidence that a feature exists.
