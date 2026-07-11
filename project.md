# English Learning Platform — Project Reference

## Overview
A full-stack Persian/English vocabulary learning platform. Users study 4000 Essential English Words (6 volumes). Admins manage books, volumes, lessons, and words. Users track their progress per word (known / not known / not read) in two review modes (EN→FA, FA→EN).

The app runs a **daily SM-2 spaced-repetition learning system**: users add volumes to a learning list (learning plans), study a daily queue of due reviews and new words, and track streaks, an activity heatmap, and accuracy. A separate manual "free review" track (`/vocabulary/review`) is independent of the SM-2 program.

**Dual-target design:** the same frontend code builds both the web app (talking to the Express API) and an **offline Android app** (Capacitor + SQLite via `frontend/src/offline/`), branching on `isNative()`. See [`ANDROID.md`](ANDROID.md) for native build specifics.

## Tech Stack
| Layer | Tech |
|-------|------|
| Backend | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| State | Zustand (auth), TanStack Query (server state) |
| Validation | Zod (both frontend and backend) |
| Auth | JWT access + refresh tokens |
| HTTP client | Axios |
| UI components | shadcn/ui (Radix UI primitives) |
| Font | Anjoman (Persian) |

## Monorepo Structure
```
eng1/
├── backend/          Express API
├── frontend/         React SPA
├── scrap/            Node.js scraper (volume 6)
├── docker-compose.yml
└── .claude/skills/project.md
```

---

## Database Schema (Prisma / PostgreSQL)

### Enums
```
Role:       USER | ADMIN
ReviewMode: EN_TO_FA | FA_TO_EN
WordStatus: NOT_READ | KNOWN | NOT_KNOWN
CardOrder:  SEQUENTIAL | RANDOM
```

### Tables

#### `users`
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| email | String unique | |
| password_hash | String | bcrypt |
| name | String | |
| role | Role | default USER |
| created_at / updated_at | DateTime | |

#### `refresh_tokens`
| column | type |
|--------|------|
| id | cuid PK |
| token | String unique |
| user_id | FK → users |
| expires_at | DateTime |
| created_at | DateTime |

#### `learning_modules`
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| name | String unique | e.g. "Vocabulary" |
| slug | String unique | e.g. "vocabulary" |
| description | String? | |
| is_active | Boolean | default true |
| order | Int | |

Seeded with one module: `{ name: "Vocabulary", slug: "vocabulary" }`.

#### `books`
| column | type |
|--------|------|
| id | cuid PK |
| title | String |
| description | String? |
| cover_image | String? (base64 data URL) |
| created_at / updated_at | DateTime |

Current book: **"4000 Essential English Words"**

#### `volumes`
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| book_id | FK → books | cascade delete |
| volume_number | Int | unique with book_id |
| title | String? | |
| cover_image | String? (base64) | |
| created_at | DateTime | |

Unique constraint: `(book_id, volume_number)`

#### `lessons`
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| volume_id | FK → volumes | cascade delete |
| lesson_number | Int | |
| title | String? | |
| created_at | DateTime | |

Unique constraint: `(volume_id, lesson_number)`

#### `words`
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| eng | String | English word |
| per | String | Persian meaning |
| description | String? | |
| pronunciation | String? | e.g. /ˈel.ə.kwənt/ |
| part_of_speech | String? | e.g. adjective |
| word_forms | String? | e.g. "تفضیلی: more afraid" |
| synonyms | String[] | PostgreSQL text array |
| antonyms | String[] | PostgreSQL text array |
| primary_example | String? | first example sentence (EN) |
| primary_example_trs | String? | first example sentence (FA) |
| pronunciation_audio | String? | audio URL |
| chapter | Int? | legacy field |
| unit | Int? | legacy field |
| lesson_id | FK → lessons | nullable |
| module_id | FK → learning_modules | required |
| created_at / updated_at | DateTime | |

Indexes: `module_id`, `(chapter, unit)`, `lesson_id`

#### `word_examples`
| column | type |
|--------|------|
| id | cuid PK |
| word_id | FK → words (cascade) |
| eng_sentence | String |
| per_translation | String |
| order | Int |
| created_at | DateTime |

#### `word_phrases`  ← collocations / usage patterns
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| word_id | FK → words (cascade) | |
| pattern_eng | String | e.g. "to be afraid of sb/sth" |
| pattern_per | String | Persian translation of pattern |
| order | Int | |
| created_at | DateTime | |

#### `word_phrase_examples`
| column | type |
|--------|------|
| id | cuid PK |
| phrase_id | FK → word_phrases (cascade) |
| eng_sentence | String |
| per_translation | String |
| order | Int |

#### `user_word_progress`
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| user_id | FK → users (cascade) | |
| word_id | FK → words (cascade) | |
| review_mode | ReviewMode | EN_TO_FA or FA_TO_EN |
| status | WordStatus | default NOT_READ — SM-2 program track (written by "Study Today") |
| manual_status | WordStatus | default NOT_READ — separate manual track (written by /vocabulary/review "free review"), never touched by SM-2 |
| repetitions | Int | default 0 — SM-2 successful-recall streak |
| interval_days | Int | default 0 — current SM-2 interval in days |
| ease_factor | Float | default 2.5 — SM-2 ease (floored at 1.3) |
| review_count | Int | default 0 — total times reviewed |
| correct_count | Int | default 0 |
| wrong_count | Int | default 0 |
| last_reviewed_at | DateTime? | last answer timestamp |
| next_review_at | DateTime? | when the card is next due |
| introduced_at | DateTime? | first entry into the SM-2 cycle (null = still a "new word" candidate for the daily quota) |
| updated_at | DateTime | |

Unique constraint: `(user_id, word_id, review_mode)`
Indexes: `(user_id, review_mode)`, `(user_id, review_mode, next_review_at)`

**Two independent tracks:** `status` is driven by the daily SM-2 program; `manual_status` is a fully separate "free review" mark set from the `/vocabulary/review` page. The two never interfere, and both are scoped per `review_mode`.

#### `learning_plans`  ← the user's "learning list" (replaces the book-level watchlist)
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| user_id | FK → users (cascade) | |
| volume_id | FK → volumes (cascade) | |
| daily_new_words | Int | default 10 |
| daily_goal | Int | default 30 |
| is_active | Boolean | default true |
| created_at / updated_at | DateTime | |

Unique constraint: `(user_id, volume_id)` · Index: `user_id`
Source of truth for the daily study system (new-word introduction + review scheduling), one plan per volume.

#### `study_sessions`  ← one row per finished daily session
| column | type | notes |
|--------|------|-------|
| id | cuid PK | |
| user_id | FK → users (cascade) | |
| started_at | DateTime | |
| ended_at | DateTime? | |
| duration_sec | Int | default 0 |
| reviewed_count | Int | default 0 |
| correct_count | Int | default 0 |
| wrong_count | Int | default 0 |
| hard_count | Int | default 0 |
| skipped_count | Int | default 0 |
| new_count | Int | default 0 |
| created_at | DateTime | |

Index: `(user_id, started_at)`
Powers the end-of-session summary, the study streak, the activity heatmap, and accuracy statistics.

#### `user_settings`  ← per-user global study preferences
| column | type | notes |
|--------|------|-------|
| user_id | PK, FK → users (cascade) | |
| study_direction | ReviewMode | default EN_TO_FA |
| auto_play_audio | Boolean | default true |
| show_phonetics | Boolean | default true |
| show_examples | Boolean | default true |
| card_order | CardOrder | default SEQUENTIAL |
| updated_at | DateTime | |

`daily_new_words` / `daily_goal` live on `learning_plans` (per volume); these are the app-wide study settings.

#### `synonym_groups` (currently unused)
---

## Backend Structure

```
backend/src/
├── app.ts                    Express app setup, middleware, route mounting
├── server.ts                 HTTP server entry
├── config/index.ts           PORT, JWT secrets, CORS origin from .env
├── shared/
│   ├── types/index.ts        WordFilters, JwtPayload, ApiResponse, PaginatedResponse
│   ├── errors/               AppError, NotFoundError, etc.
│   ├── middleware/
│   │   ├── auth.middleware    JWT verify → req.user
│   │   ├── admin.middleware   requireAdmin checks req.user.role === ADMIN
│   │   ├── validate.middleware  Zod schema validation
│   │   └── error.middleware   Global error handler
│   └── utils/
│       ├── jwt.util.ts        sign/verify access & refresh tokens
│       └── password.util.ts   bcrypt hash/compare
└── modules/
    ├── auth/         login, register, refresh, logout
    ├── users/        user management (admin)
    ├── vocabulary/   words CRUD + examples CRUD
    ├── books/        books, volumes, lessons CRUD
    ├── progress/     user word progress tracking
    ├── synonyms/     synonym lookup (external provider)
    ├── study/        daily SM-2 study flow (srs.ts SM-2 engine)
    ├── plans/        learning plans (the "my learning list")
    ├── settings/     per-user study settings
    └── dashboard/    dashboard aggregation (streak, heatmap, accuracy)
```

### API Routes

**Base URL:** `http://localhost:3000/api`

#### Auth — `/api/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | public | Create user |
| POST | /login | public | Returns access + refresh tokens |
| POST | /refresh | public | Rotate refresh token |
| POST | /logout | bearer | Invalidate refresh token |

#### Words — `/api/words`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | bearer | List words (paginated, filtered) |
| GET | /modules | public | List learning modules |
| GET | /:id | public | Get single word |
| POST | / | admin | Create word |
| PUT | /:id | admin | Update word |
| DELETE | /:id | admin | Delete word |
| POST | /:id/examples | admin | Add example |
| PUT | /:id/examples/:exId | admin | Update example |
| DELETE | /:id/examples/:exId | admin | Delete example |

**GET /api/words query params:** `page, limit, chapter, unit, lessonId, volumeId, bookId, status, mode, sort, order, search`

#### Books — `/api/books`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | public | All books |
| GET | /simple | public | `[{id, title}]` |
| GET | /:id | public | Single book |
| POST | / | admin | Create book |
| PUT | /:id | admin | Update book |
| DELETE | /:id | admin | Delete book |
| GET | /:bookId/volumes | public | Volumes for book |
| GET | /:bookId/volumes/simple | public | `[{id, volumeNumber, title}]` |
| POST | /:bookId/volumes | admin | Create volume |
| PUT | /:bookId/volumes/:volumeId | admin | Update volume |
| DELETE | /:bookId/volumes/:volumeId | admin | Delete volume |
| GET | /:bookId/volumes/:volumeId/lessons | public | Lessons |
| GET | /:bookId/volumes/:volumeId/lessons/simple | public | Simple lessons |
| POST | /:bookId/volumes/:volumeId/lessons | admin | Create lesson |
| PUT | .../:lessonId | admin | Update lesson |
| DELETE | .../:lessonId | admin | Delete lesson |

#### Progress — `/api/progress`
Tracks per-user per-word status in each review mode.

#### Synonyms — `/api/synonyms`
External synonym lookup.

#### Study — `/api/study`
The daily SM-2 learning flow (all bearer).
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /today | bearer | Today's queue: due reviews + new words (per active plans) plus daily metadata |
| POST | /answer | bearer | Grade a card (EASY / HARD / AGAIN / SKIP) and reschedule via SM-2 |
| POST | /session | bearer | Record a finished session (creates a `study_sessions` row) |

#### Plans — `/api/plans`
The user's "learning list" (all bearer).
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | bearer | List the user's learning plans |
| POST | / | bearer | Add a volume to the learning list |
| PATCH | /:id | bearer | Update a plan (daily new words / goal / active) |
| DELETE | /:id | bearer | Remove a plan — resets that volume's SM-2 progress, preserves `manual_status` |

#### Settings — `/api/settings`
Per-user global study preferences (all bearer).
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | bearer | Get the user's settings (creates defaults if none) |
| PUT | / | bearer | Update study settings |

#### Dashboard — `/api/dashboard`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | bearer | Real aggregated dashboard (streak, heatmap, accuracy) — replaces the prior mock |

### Backend Patterns
- Each module: `router → controller → service → repository`
- Repository uses `PrismaClient` directly (one instance per module)
- DTOs validated with Zod via `validate` middleware before controller
- `authenticate` middleware attaches `req.user` (JwtPayload)
- `requireAdmin` checks `req.user.role === 'ADMIN'`

### SM-2 Engine (`study/srs.ts`)

The daily study flow offers four answers, mapped onto SM-2 recall qualities (q):

| Answer | Quality | Effect |
|--------|---------|--------|
| AGAIN | q1 | Lapse — relearn from scratch, due again today |
| HARD | q3 | Pass, but ease drops so intervals grow slowly |
| EASY | q5 | Pass, ease rises so intervals grow quickly |
| SKIP | — | No-op — card requeued in-session, schedule untouched |

- **Ease update:** `ease = max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))`
- **q < 3 (lapse):** `repetitions = 0`, `interval_days = 0`, `next_review_at = end of today`, `status = NOT_KNOWN`
- **q ≥ 3 (pass):** interval ladder `0 → 1 → 6 → round(prev × ease)`, `repetitions++`, `status = KNOWN`

Only the SM-2 `status` track is affected; `manual_status` is never touched by the engine.

---

## Frontend Structure

```
frontend/src/
├── App.tsx                   Router, route guards (ProtectedRoute, AdminRoute, PublicRoute)
├── main.tsx                  ReactDOM + QueryClient provider
├── index.css                 Tailwind base + Anjoman font import
├── config/api.ts             API_ENDPOINTS constants
├── lib/
│   ├── axios.ts              Axios instance with base URL + auth header interceptor
│   └── utils.ts             cn() helper (clsx + tailwind-merge)
├── store/
│   └── authStore.ts          Zustand store: user, tokens, isAuthenticated, isReady
├── types/index.ts            All shared TypeScript interfaces
├── services/                 Axios API calls (one file per domain)
│   ├── auth.service.ts
│   ├── vocabulary.service.ts
│   ├── book.service.ts
│   ├── progress.service.ts
│   ├── synonym.service.ts
│   ├── study.service.ts
│   ├── plan.service.ts
│   ├── settings.service.ts
│   ├── dashboard.service.ts
│   └── user.service.ts
├── hooks/                    TanStack Query hooks wrapping services
│   ├── useAuth.ts
│   ├── useVocabulary.ts
│   ├── useBooks.ts
│   ├── useProgress.ts
│   ├── useStudy.ts           useStudyToday + answer/session mutations
│   ├── usePlans.ts
│   ├── useSettings.ts
│   └── useDashboard.ts
├── offline/                  Native Android (Capacitor + SQLite) offline layer
│   ├── bootstrap.ts          prepareNative(): seed local DB on first launch
│   ├── db.ts, repo.ts        SQLite access + repositories
│   ├── seed.ts               bundled seed data
│   └── srs.ts                SM-2 engine (native mirror of backend study/srs.ts)
├── components/
│   ├── ui/                   shadcn/ui primitives (Button, Input, Card, Dialog, Select, etc.)
│   ├── layout/
│   │   ├── Layout.tsx        Sidebar + Navbar shell
│   │   ├── Navbar.tsx        Top bar with theme toggle + user menu
│   │   ├── Sidebar.tsx       Nav links, role-aware (shows Admin section for ADMIN)
│   │   └── ThemeProvider.tsx  light/dark theme via localStorage
│   ├── vocabulary/
│   │   ├── WordCard.tsx       Word card in vocabulary list
│   │   ├── ReviewCard.tsx     Flashcard for review mode
│   │   └── WordFilters.tsx    Filter bar (mode, status, book/volume/lesson, sort, search)
│   └── admin/
│       ├── ExampleManager.tsx  Add/edit/delete/reorder word examples (draft + edit modes)
│       └── PhraseManager.tsx   Add/delete phrase patterns with nested examples (draft mode)
└── pages/
    ├── LandingPage.tsx        Public landing (always accessible at /)
    ├── auth/
    │   ├── LoginPage.tsx
    │   └── RegisterPage.tsx
    ├── dashboard/
    │   └── DashboardPage.tsx   Streak, heatmap, accuracy + "study today" entry
    ├── library/
    │   └── LibraryPage.tsx     Browse volumes, add/remove learning plans
    ├── study/
    │   └── StudySessionPage.tsx Daily SM-2 session (grade cards, session summary)
    ├── settings/
    │   └── SettingsPage.tsx    Per-user study settings
    ├── vocabulary/
    │   ├── VocabularyPage.tsx  Word list with filters, pagination (browse-only)
    │   └── ReviewPage.tsx      Manual "free review" flashcards (EN→FA or FA→EN)
    └── admin/
        ├── AdminPage.tsx       Admin dashboard / word list with edit/delete
        ├── WordFormPage.tsx    Create / edit word (all fields)
        └── books/
            ├── BookListPage.tsx      Book grid (portrait covers, 5-column)
            ├── BookFormPage.tsx      Create / edit book + cover image upload
            ├── VolumeManagerPage.tsx Manage volumes (drag-drop cover image)
            └── LessonManagerPage.tsx Manage lessons + "افزودن لغت" button per lesson
```

### Frontend Routes
| Path | Component | Guard |
|------|-----------|-------|
| / | LandingPage (web) / Navigate → /dashboard (native) | public (always) |
| /login | LoginPage | PublicRoute (redirect to /dashboard if authed) |
| /register | RegisterPage | PublicRoute |
| /dashboard | DashboardPage | ProtectedRoute |
| /library | LibraryPage | ProtectedRoute |
| /study | StudySessionPage | ProtectedRoute |
| /settings | SettingsPage | ProtectedRoute |
| /vocabulary | VocabularyPage (browse-only) | ProtectedRoute |
| /vocabulary/review | ReviewPage ("free review" manual track) | ProtectedRoute |
| /admin | AdminPage | AdminRoute |
| /admin/words/new | WordFormPage | AdminRoute |
| /admin/words/:id/edit | WordFormPage | AdminRoute |
| /admin/books | BookListPage | AdminRoute |
| /admin/books/new | BookFormPage | AdminRoute |
| /admin/books/:id/edit | BookFormPage | AdminRoute |
| /admin/books/:bookId/volumes | VolumeManagerPage | AdminRoute |
| /admin/books/:bookId/volumes/:volumeId/lessons | LessonManagerPage | AdminRoute |

### Auth Flow
1. `App.tsx` calls `initAuth()` on mount
2. `initAuth()` reads `accessToken`, `refreshToken`, `authUser` from `localStorage`
3. Sets `isReady: true` when done — routes only render after this
4. Axios interceptor attaches `Authorization: Bearer <accessToken>` to every request
5. `setAuth()` saves tokens + serialized User object to localStorage
6. `clearAuth()` removes all localStorage keys

### WordFormPage — Pre-fill from lesson
Navigating from `LessonManagerPage` passes query params:
```
/admin/words/new?bookId=xxx&volumeId=xxx&lessonId=xxx
```
The form reads these params, shows a locked banner with book/volume/lesson pills, and hides the free-form selectors. On submit, `lessonId` is included in the payload.

### WordFormPage — Fields
- **جزئیات لغت:** eng, per, pronunciation, partOfSpeech, wordForms, description, moduleId
- **مترادف و متضاد:** synonyms (TagInput), antonyms (TagInput)
- **موقعیت در کتاب:** book → volume → lesson cascaded selects (or locked banner)
- **جمله مثال اصلی:** primaryExample + primaryExampleTrs
- **عبارات:** PhraseManager (patterns with nested examples)
- **مثال‌های اضافی:** ExampleManager

### WordFilters Component
State shape (`WordFiltersState`):
```ts
{ mode: ReviewMode, status: WordStatus|'ALL', sort, chapter, search, bookId, volumeId, lessonId }
```
Row 1: EN→FA / FA→EN toggle + status buttons (ALL / KNOWN / NOT_KNOWN / NOT_READ)
Row 2: Book → Volume → Lesson cascaded dropdowns (only shown when books exist; volume shown after book selected; lesson shown after volume selected)
Row 3: Sort dropdown + legacy chapter filter (hidden when bookId set) + search + reset

### BookListPage — Cover images
- Portrait aspect ratio: `padding-bottom: 140%` (3:4 ratio)
- Grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
- Cover stored as base64 data URL in DB

---

## Key Hooks

| Hook | Returns | Query key |
|------|---------|-----------|
| `useWords(filters)` | `PaginatedWords` | `['words', filters]` |
| `useWord(id)` | `Word` | `['words', id]` |
| `useModules()` | `LearningModule[]` | `['modules']` |
| `useCreateWord()` | mutation | invalidates `['words']` |
| `useUpdateWord()` | mutation | invalidates `['words']` |
| `useDeleteWord()` | mutation | invalidates `['words']` |
| `useBooks()` | `Book[]` | `['books']` |
| `useBooksSimple()` | `BookSimple[]` | `['books','simple']` |
| `useVolumes(bookId)` | `Volume[]` | `['volumes', bookId]` |
| `useVolumesSimple(bookId)` | `VolumeSimple[]` | `['volumes', bookId, 'simple']` |
| `useLessons(bookId, volumeId)` | `Lesson[]` | `['lessons', bookId, volumeId]` |
| `useLessonsSimple(bookId, volumeId)` | `LessonSimple[]` | `['lessons', bookId, volumeId, 'simple']` |
| `useStudyToday(enabled?)` | `StudyToday` | `['study', 'today']` |
| `usePlans()` | `LearningPlan[]` | `['plans']` |
| `useSettings()` | `UserSettings` | `['settings']` |
| `useDashboard()` | `DashboardData` | `['dashboard']` |

---

## NPM Scripts

### Backend (`backend/`)
```bash
npm run dev              # tsx watch src/server.ts
npm run build            # tsc
npm run db:migrate       # prisma migrate dev
npm run db:generate      # prisma generate
npm run db:seed          # tsx prisma/seed.ts  (creates vocabulary module)
npm run db:studio        # prisma studio
npm run db:migrate-mysql # tsx prisma/migrate-mysql.ts  (import volumes 1–5 from MySQL dump)
npm run db:import-volume6     # tsx prisma/import-volume6.ts (import scrap/output/volume-6.json)
npm run db:import-scraped -- /path/to/file.json   # generic import for any volume JSON
```

### Frontend (`frontend/`)
```bash
npm run dev     # vite
npm run build   # tsc + vite build
npm run preview # vite preview
```

### Scraper (`scrap/`)
```bash
npm run scrap -- <volume> <index-url>
# e.g.: npm run scrap -- 5 https://lang.b-amooz.com/en/vocabulary/categories/250/4000-essential-english-words-5
# Output: scrap/output/unit-01.json … unit-30.json + volume-5.json
```

---

## Database Setup (from zero)
```bash
# in backend/
npm install
npx prisma migrate deploy   # run all migrations
npx prisma generate         # generate Prisma client
npm run db:seed             # seed learning module

# optional — import book data
npm run db:migrate-mysql    # volumes 1–5 from words-new.sql
npm run db:import-volume6   # volume 6 from scrap/output/volume-6.json

npm run dev                 # start API server
```

### Reset DB
```bash
npx prisma migrate reset    # drops + recreates + seeds
```

---

## Environment Variables (backend/.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/eng1
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## UI Conventions
- Direction: RTL (`dir="rtl"`) for the whole admin form page; LTR for English inputs
- Font: Anjoman (Persian), loaded from `/public/fonts/`
- Components: always named exports, no anonymous function components
- Semantic HTML: `<Card>`, `<Label>`, `<figure>`, etc. — no raw div soup
- Toasts: `toast({ title, description, variant: 'success'|'destructive' })`
- Image upload: FileReader API → base64 data URL stored directly in DB (no multer/S3)
- Drag-and-drop covers: same pattern in both BookFormPage and VolumeManagerPage
