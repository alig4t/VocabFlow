# VocabFlow documentation map

Codex starts at the repo-root [`AGENTS.md`](../AGENTS.md), which explicitly points to [`CLAUDE.md`](../CLAUDE.md)
for shared working rules. Claude Code starts at CLAUDE.md; humans can start at [`README.md`](../README.md).
This folder holds the detailed references. Source code and configuration are the authority for current behavior; every doc below
was reconciled against the code on **2026-10-04** unless its status says otherwise.

| Doc | Lang | Covers | Status |
|---|---|---|---|
| [`BACKEND.md`](BACKEND.md) | FA | Express API: modules, full route table, envelope/errors, auth, SM-2 engine, daily queue, plan rules, `/api/words` filter traps, scripts | Current |
| [`FRONTEND.md`](FRONTEND.md) | FA | Routes and guards, web/native service switch (with exceptions), axios/auth, query keys, ReviewPage/StudySessionPage behavior, themes/RTL/fonts/safe-area, pronunciation | Current |
| [`ANDROID.md`](ANDROID.md) | FA | Offline APK: SQLite mirror and its differences from Postgres, schema migration, seed + encryption, **seed re-version wipes progress**, build/toolchain, troubleshooting | Current (build steps were last run on the Linux machine) |
| [`NOTIFICATIONS.md`](NOTIFICATIONS.md) | FA | Native local study reminders: reschedule-on-open, reminder ladder, settings columns, icon, permissions | Current design; sections 8–10 are the original implementation session's log |
| [`../PERFORMANCE.md`](../PERFORMANCE.md) | FA | Android performance audit: all 17 requested areas, native SQLite comparisons, seed memory, startup, TTS and release follow-up | Measurements on a debug Android 16 emulator, 2026-10-08; physical-device release validation outstanding |
| [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) | FA | Scrapers, `books/` vs `seed-src/`, title maps, Postgres import, APK seed, JSON format | Current; scraper sections partly historical |
| [`SECURITY-REVIEW.md`](SECURITY-REVIEW.md) | FA | Threat model for the offline APK; what is implemented (seed AES-GCM, SQLCipher runtime DB) vs advised | "Implementation status" section is current; sections 1–12 are the original advisory (pre-implementation) and describe a **planned** NestJS/Bazaar backend that does not exist |
| [`DATABASE_SCHEMA.html`](DATABASE_SCHEMA.html) | FA | Annotated table-by-table schema | **Partially stale:** written before migration `20260813000000_add_review_events`, so it has no `review_events` table. Use `backend/prisma/schema.prisma` as the source of truth |
| [`MIGRATION.md`](MIGRATION.md) | EN | One-time MySQL → PostgreSQL migration | Historical |
| [`VocabFlow (Subscription Architecture v1).txt`](<VocabFlow (Subscription Architecture v1).txt>) | FA | Product plan: offline-first app + NestJS/MySQL backend that only validates Cafe Bazaar subscriptions | **Plan only — nothing in it is implemented** (no subscription, trial, premium or payment code exists anywhere in the repo) |

Other knowledge files:

- [`../MEMORY.md`](../MEMORY.md) — decisions and rationale, open questions, the two-machine workflow. It is an ordinary
  repo file, *not* Claude Code's auto-memory.
- [`../.claude/skills/`](../.claude/skills/) — step-by-step procedures: `schema-change`, `add-book-content`,
  `android-build`. Codex reads these explicitly through AGENTS.md references; this location does not register
  them as Codex skills. Native Codex repository skill discovery uses `.agents/skills/`; no duplicate copies are needed.

Instruction loading and skill discovery were checked with the installed Codex CLI 0.159.2 on 2026-10-08 and
the official [AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and
[skills guide](https://learn.chatgpt.com/docs/build-skills). The inspected setup has no `CLAUDE.md` fallback;
use AGENTS.md rather than depending on machine-specific configuration. Start a new Codex session to load it automatically.

## Keeping these accurate

- When code changes make a statement here wrong, fix the doc in the same change. If you cannot verify a claim,
  mark it unverified instead of guessing.
- Keep one home per topic (the table above) and cross-link instead of copying. `CLAUDE.md` holds only the
  shared invariants an agent needs on every task; AGENTS.md routes Codex to that guidance and these references.
- Plans and specs describe *intended* behavior. Never cite them as evidence that a feature exists.
