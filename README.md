# VocabFlow (وکب)

A Persian-language app for learning English vocabulary. Three learning tracks are built from published word books:
**words** (واژگان), **phrasal verbs** (افعال عبارتی) and **collocations** (باهم‌آیی‌ها). Learners add volumes to a
learning plan and study a daily SM-2 spaced-repetition queue. A separate free-review mode lets them mark words manually.
The UI is Persian and right-to-left.

One codebase ships two products:

| | Web app | Android app |
|---|---|---|
| Data | Express API + PostgreSQL | on-device SQLite (SQLCipher), fully offline |
| Accounts | JWT login, USER/ADMIN roles | none — one local user |
| Content | imported from `books/` | encrypted seed bundled in the APK |

## Stack

- **Backend** (`backend/`): Node 20, Express 4, TypeScript, Prisma 5.22, PostgreSQL 16 (Docker), zod, JWT.
- **Frontend** (`frontend/`): React 18, Vite 5, TypeScript, Tailwind + shadcn/ui, TanStack Query, Zustand, React Router 6.
- **Android**: Capacitor 6 (`frontend/android/`), `@capacitor-community/sqlite`, text-to-speech, local notifications.

## Quick start (web)

```bash
docker compose up -d                 # PostgreSQL on :5432 (db english_learning)

cd backend
npm install
cp .env.example .env                 # defaults point at the Docker database
npm run db:migrate && npm run db:generate
npm run db:seed                      # vocabulary module + dev accounts
npm run db:seed-all-datas            # optional: import every book in ../books
npm run dev                          # http://localhost:3000  (health: /api/health)

cd ../frontend
npm install
npm run dev                          # http://localhost:5173  (proxies /api → :3000)
```

Dev accounts created by `db:seed`: `admin@example.com` / `Admin123!` and `user@example.com` / `User123!`.

The Android build needs `frontend/.env` with `VITE_SEED_SECRET`, JDK 17 and Android SDK 35. See
[`docs/ANDROID.md`](docs/ANDROID.md).

## Checks

There is no automated test suite. Use `npx tsc --noEmit` in `backend/` and `frontend/`, and `npm run format:check` in
`frontend/`. `npm run lint` is currently broken because ESLint is not installed.

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — working rules and invariants (written for AI coding agents, useful for humans).
- [`docs/README.md`](docs/README.md) — map of all reference docs and their status: backend, frontend, Android,
  notifications, content pipeline, security, schema.
- [`MEMORY.md`](MEMORY.md) — design decisions, known defects, open questions.
