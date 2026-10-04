---
name: add-book-content
description: Procedure for adding a new book or volume to VocabFlow, or changing existing book/word content (scraped JSON in books/ and frontend/seed-src/), including the backend Postgres import, the encrypted APK seed and the SEED_VERSION decision. Use when the user wants new vocabulary content, fixes to word data in the book files, or a new book cover/title.
---

# Adding or changing book content

Full background: `docs/CONTENT_PIPELINE.md`. Content reaches the two builds through **separate copies** of the book JSON:
`books/` (repo root) → Postgres, and `frontend/seed-src/` → encrypted `public/seed-enc/` → on-device SQLite.

## 1. Get the JSON

- Scrape with `scrap/book-scraper.js <slug> <volume> <indexUrl>` (git-ignored, so it may only exist on one machine) or `scrap/quzlet-scrapper.js` (Quizlet; no Persian meanings).
- Validate the shape: either new format (`bookSlug`, `volumeNumber`, `lessons[]`) or old (`units[]`). Each word has `eng`, `meanings[].per`, optional `examples`/`phrases`/`synonyms`.
- The book title comes from `bookSlug` *inside* the file, not the filename.

## 2. Register titles (both maps, identical)

- `backend/prisma/import-all.ts`: book title map + volume title map.
- `frontend/src/offline/seed.ts`: the same maps.
- Existing quirks to keep: `english-collocations-in-use-advanced-` (trailing dash), and the Oxford volumes all share slug `oxford-word-skills-basic`.
- Covers: add files under `frontend/public/books/` and entries in `COVER_BY_TITLE` / `VOLUME_COVER_BY_TITLE` in `frontend/src/offline/repo.ts`. `frontend/src/lib/bookMeta.ts` may also need the new title (check how existing titles are handled there).

## 3. Web / Postgres

```bash
cp <file>.json books/
cd backend && npm run db:seed-all-datas          # imports every books/*.json
```
Requires the `vocabulary` module (`npm run db:seed`). Books are matched by title with `findFirst`; volumes and lessons are upserted.

## 4. Android seed

```bash
cp <file>.json frontend/seed-src/
# add the filename to frontend/seed-src/manifest.json
cd frontend && npm run seed:encrypt              # needs VITE_SEED_SECRET in frontend/.env; rebuilds public/seed-enc/
```
`frontend/.env` must hold the **same** `VITE_SEED_SECRET` on every machine that builds, or the blobs won't decrypt.

## 5. The SEED_VERSION decision (ask the user)

Existing installs only pick up new content if `SEED_VERSION` in `frontend/src/offline/seed.ts` is bumped. **Bumping deletes all `progress` and `watchlist` rows and regenerates every word/volume id**, which orphans `learning_plans`, `review_events` and `study_sessions`. Fresh installs get the new content either way.
Do not bump without the user's explicit OK, and tell them the consequence in plain words. Never bump for schema-only changes.

## 6. Verify

- Backend: `GET /api/books` and `GET /api/words?bookId=...` (authenticated) return the new content.
- Seed: the `seed:encrypt` output lists the expected file count, and each `.enc` is exactly 28 bytes larger than its source.
- Keep `books/` and `seed-src/` in sync for the file you touched. They have already drifted by a few bytes in places; don't "fix" other files without asking.
- Commit `seed-src/`, `public/seed-enc/` and `books/` together.
