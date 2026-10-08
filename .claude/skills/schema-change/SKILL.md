---
name: schema-change
description: Checklist for changing VocabFlow's data model or adding a data-layer feature — a Prisma model/column/enum, a new API endpoint that reads or writes data, or anything touching user_word_progress, learning_plans, review_events or user_settings. Use before editing backend/prisma/schema.prisma, frontend/src/offline/db.ts or frontend/src/offline/repo.ts, because every data change must land in both the Postgres backend and the offline SQLite mirror.
---

# Changing the data model (web + offline)

VocabFlow has two data layers that must stay behaviorally identical:
Postgres via the Express API (web) and on-device SQLite via `frontend/src/offline/` (Android).
A change that lands on only one side silently breaks the other build.

## 1. Inspect first

- Read the model in `backend/prisma/schema.prisma` and its table in `frontend/src/offline/db.ts` (DDL string + `*_ADDED_COLUMNS` arrays + `migrateSchema()`).
- Find every reader and writer: `grep -rn "<column_or_field>" backend/src frontend/src`.
- Check the service in `frontend/src/services/` for an `isNative()` branch. `auth`, `user` and most of `book` (CRUD) are web-only by design.
- Re-read the invariants in `CLAUDE.md` (two progress rows per word, the two independent status tracks, `review_events` as the only history).

## 2. Backend (Postgres)

1. Edit `schema.prisma` and use `@@map`/`@map` snake_case names like the neighboring models.
2. `cd backend && npm run db:migrate` (needs the Docker Postgres from `docker compose up -d`), then `npm run db:generate`.
   Migration SQL is committed. Don't hand-edit applied migrations.
3. Repository → service → controller → router in the module (follow the *neighboring* module's style. Only `auth`, `books` and `vocabulary` have `dto/`; the others validate with inline zod `safeParse` → `ValidationError`).
4. New endpoint path → `frontend/src/config/api.ts` (`API_ENDPOINTS`). Never inline URLs.
5. Responses use `{ success: true, data }`. Throw `AppError` subclasses (`NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`); there is no `BadRequestError`.

## 3. Offline mirror (SQLite)

1. `frontend/src/offline/db.ts`:
   - **New column on an existing table:** add it to the `CREATE TABLE` DDL **and** to the matching `*_ADDED_COLUMNS` array (`PROGRESS_`, `WORDS_`, `USER_SETTINGS_`). If the table has no array yet, add one and call `addMissingColumns()` for it in `migrateSchema()`. `CREATE TABLE IF NOT EXISTS` never alters an installed table.
   - `NOT NULL` columns need a `DEFAULT` (ALTER TABLE cannot add them otherwise).
   - An index on a new column goes inside `migrateSchema()`, *after* the ADD COLUMN (top-level DDL runs before migration and crashes old installs; this happened with `idx_progress_due`).
   - **New table:** the DDL alone is enough.
   - SQLite conventions: no `user_id` (single local user), `order` → `ord`, arrays → JSON `TEXT`, dates → ISO-8601 UTC strings, no foreign keys (cascade deletes by hand in `repo.ts`).
2. If the seed fills the column, add it to the `bulkInsert` column lists in `offline/seed.ts`. **Do not bump `SEED_VERSION` for schema changes.** That wipes user progress (see `docs/ANDROID.md` §3.3).
3. `frontend/src/offline/repo.ts`: implement the same behavior and **return the same shape** as the HTTP service.
4. `frontend/src/services/<x>.service.ts`: add the `isNative()` branch through the lazy `off()` import.
5. Shared types in `frontend/src/types/index.ts`. Fields that exist on only one platform must be optional.

## 4. If the change touches SM-2

`backend/src/modules/study/srs.ts` and `frontend/src/offline/srs.ts` must stay logically identical: the answer→quality map, ease floor 1.3, the interval ladder, and `DAY_START_HOUR = 6`. Edit both in the same change. `study.service.answer()` and `repo.answerStudy()` both append to `review_events` (never for SKIP).

## 5. Validate

```bash
cd backend  && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```
- Backend behavior: run the API and `curl` the endpoint with a token from `POST /api/auth/login`.
- Offline SQL cannot run off-device. Check queries against Postgres semantics by reading them, or run them in sql.js in a scratch directory if exactness matters.
- There is no test suite and `npm run lint` is broken (ESLint not installed). Say so rather than claiming tests passed.

## 6. Document

Update `docs/BACKEND.md` (route/model tables), `docs/ANDROID.md` (SQLite differences) and the `DATABASE_SCHEMA.html` note in `docs/README.md` if the change makes them wrong.
