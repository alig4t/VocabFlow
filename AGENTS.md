# Codex instructions — VocabFlow

VocabFlow («وکب») teaches English vocabulary through a Persian UI. React/TypeScript ships a web app backed by
Express/Prisma/PostgreSQL and a Capacitor Android app backed by local SQLite/SQLCipher. Android learning is fully
offline, with one local ADMIN user. Subscriptions, trials and payments are plans, not implemented features.

## Read first and use one source per topic

Before editing, inspect `git status` and read [CLAUDE.md](CLAUDE.md) and [docs/README.md](docs/README.md).
Follow CLAUDE.md's shared working rules and invariants; this file supplies Codex discovery and task routing.
Read [MEMORY.md](MEMORY.md) for decisions, known defects and lessons relevant to the task.

- Codex automatically discovers `AGENTS.md`; referenced files require explicit reading. `CLAUDE.md`, `MEMORY.md`
  and `docs/` are not automatically loaded by filename in the current setup.
- CLAUDE.md owns shared project rules; `docs/README.md` identifies each detailed reference's scope and status.
  MEMORY.md holds durable context, not a second instruction manual. Verify current behavior in source/configuration
  (especially `backend/prisma/schema.prisma` and `frontend/src/offline/db.ts`); correct conflicting documentation
  in the same change. Historical logs, security recommendations and product plans do not prove implementation.
- Nested `AGENTS.md` can supply directory-specific rules; `AGENTS.override.md` takes precedence over `AGENTS.md`
  in the same directory. No nested files are currently needed. Avoid copying shared rules into another file.

## Consult before changing

| Task | Read and inspect |
|---|---|
| Backend, endpoints, auth, plans, SM-2 | [docs/BACKEND.md](docs/BACKEND.md); `backend/src/app.ts`, the neighboring module, `backend/prisma/schema.prisma` |
| Database, migrations, any data-layer feature | BACKEND.md + [docs/ANDROID.md](docs/ANDROID.md) + [schema-change checklist](.claude/skills/schema-change/SKILL.md); Prisma migrations, `frontend/src/offline/{db,repo}.ts`, the affected frontend service |
| Routing, state, UI architecture, styling | [docs/FRONTEND.md](docs/FRONTEND.md); `frontend/src/{App,main}.tsx`, affected hooks/services, `frontend/src/index.css` |
| Offline startup, seed, encryption, native Android | ANDROID.md + [docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md)'s implementation-status section; `frontend/src/offline/{bootstrap,db,seed}.ts`, `frontend/capacitor.config.ts`, native sources |
| Study reminders | [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md); `frontend/src/lib/notifications.ts` and offline notification queries; sections 8–10 are historical |
| Books, word content, titles or covers | [docs/CONTENT_PIPELINE.md](docs/CONTENT_PIPELINE.md) + [add-book-content checklist](.claude/skills/add-book-content/SKILL.md); both import/seed title maps and JSON copies |
| Requested APK build | ANDROID.md + [android-build checklist](.claude/skills/android-build/SKILL.md); verify the current machine's JDK/SDK and wrapper |
| Subscription or trial work | [subscription plan](<docs/VocabFlow (Subscription Architecture v1).txt>) + MEMORY.md; its NestJS/MySQL/Bazaar design is unimplemented and differs from the existing web backend |

`docs/DATABASE_SCHEMA.html` is a partial schema reference missing `review_events`; `docs/MIGRATION.md` is the
historical MySQL import, not the procedure for new schema migrations.

The three `.claude/skills/*/SKILL.md` files above are existing procedures to read explicitly when applicable.
They are not registered Codex skills in this session; Claude-specific frontmatter is not a Codex permission or
invocation mechanism. Codex supports reusable skills under `.agents/skills/`, but no copies or wrappers are needed
here. Interpret shell examples for the current OS and working directory, and follow the task's authorization.

## Constraints that need particular care

- Preserve API/offline behavior and response shapes for data features available on both platforms. The runtime
  branch belongs in `frontend/src/services/` via `isNative()`; auth/users and documented book CRUD are web-only.
  Use the schema-change checklist for migrations; never rewrite applied migrations or use a database reset as a check.
- Keep the manual `manual_status` track separate from daily SM-2 `status`. Progress is per word **and review mode**;
  counts must respect direction. Active volume plans drive the queue. Keep both `srs.ts` copies equivalent,
  including the 06:00 local day boundary and plan caps. `review_events` records schedule-changing answers; SKIP
  writes no event. Full rules and existing exceptions live in CLAUDE.md and BACKEND.md.
- SQLite changes must support existing installs as well as fresh installs: update DDL and missing-column migration
  lists; create indexes on added columns after migration. Cascades are manual. Never bump `SEED_VERSION` for a
  schema change. A content re-seed wipes progress/local edits and leaves dangling history/plan references;
  require explicit acceptance of that data loss before a bump.
- Preserve the established hooks/services flow, lazy pages, session snapshots, query invalidation, HSL themes,
  per-element RTL, `.font-ipa` and `--safe-top`/`--safe-bottom`. Read FRONTEND.md before UI changes.

## Commands and validation

Run package commands from their package directory; there is no root package.json/workspace script.
The package lockfiles determine resolved versions; keep Prisma 5.22 and the Android toolchain described in CLAUDE.md.

| Directory | Command | Purpose |
|---|---|---|
| Repository root | `docker compose up -d` | Start the development PostgreSQL 16 service when needed |
| `backend/` | `npm run dev` | API on port 3000 by default; health endpoint `/api/health` |
| `frontend/` | `npm run dev` | Vite on port 5173; `/api` proxy to port 3000 |
| Each of `backend/` and `frontend/` | `npx tsc --noEmit` | Main automated check; run both after changes |
| `frontend/` | `npm run format:check` | Read-only Prettier check of `src/`; may report existing issues |
| `backend/` and `frontend/` | `npm run build` | Backend: TypeScript emit; frontend: TypeScript check + Vite bundle, when build validation is relevant |
| `backend/` | `npm run db:migrate`, then `npm run db:generate` | Development schema changes against the intended local database, not routine validation |
| `frontend/` | `npm run seed:encrypt` | Regenerate committed seed assets only for content work; requires matching `VITE_SEED_SECRET` |

There is no application test suite or CI; Android contains only template example tests. `npm run lint` in frontend
has no installed ESLint/configuration. Do not claim tests passed or silently repair the tooling. Report each
executed check and its result; distinguish pre-existing failures from regressions. Check changed UI in the app,
API behavior against the running backend, and SQLite/plugins on a device/emulator when available; type checks
alone do not validate native behavior. Documentation changes also require checking links and the final diff.

## Change workflow and boundaries

1. Read the applicable references and actual readers/writers before editing. Preserve existing user changes and
   keep the change within the request; known defects in MEMORY.md are not an automatic cleanup backlog.
2. For a feature, trace route/page → hook → service → API/offline repository and follow neighboring patterns.
   For a bug, reproduce the failing scenario and check known pitfalls, then verify that scenario after the fix.
   For performance work, measure the affected platform/data set before and after; preserve pagination, batched
   SQLite reads/inserts, seed transactions, lazy loading and queue limits. Do not invent performance budgets.
3. Validate as above, update the existing home for any changed facts, and review `git diff` for unrelated edits.
   Record a new lesson in MEMORY.md only if it is durable; avoid duplicating architecture or instructions there.
4. Do not build an APK, change toolchain/dependencies, commit, or bump seed version unless authorized. Read the
   two-machine notes in MEMORY.md before mirroring under the standing request; verify host and destination rather
   than assuming historical paths apply to this checkout. Never print or commit `.env` values.

Do not hand-edit generated `node_modules/`, `dist/`, Android `.gradle/` or `build/` directories,
or copied assets/configs under `frontend/android/` (`app/src/main/assets/public/`, generated Capacitor asset configs,
`capacitor.settings.gradle`, `app/capacitor.build.gradle`, `capacitor-cordova-android-plugins/`). Regenerate through the documented tools.
`frontend/public/seed-enc/` is generated **and committed**; update it through `seed:encrypt`, not by hand.
