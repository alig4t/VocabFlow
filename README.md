# English Learning Platform

A full-stack web application for learning English vocabulary with bilingual (English/Persian) support, spaced-repetition-style review modes, and an admin panel for content management.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              React Frontend (Vite)              │   │
│   │                                                 │   │
│   │  Pages: Login · Register · Vocabulary ·        │   │
│   │         Review · Admin · WordForm               │   │
│   │                                                 │   │
│   │  State: Zustand (auth) · TanStack Query (data) │   │
│   │  HTTP:  Axios → /api/*                         │   │
│   └───────────────────┬─────────────────────────────┘   │
└───────────────────────│─────────────────────────────────┘
                        │ HTTP/JSON
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Express Backend (Node.js / TypeScript)     │
│                                                         │
│  Middleware: Helmet · CORS · Morgan · Auth · Validate   │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   Auth   │ │  Words   │ │ Progress │ │ Synonyms │  │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       └────────────┴────────────┴─────────────┘        │
│                          │                              │
│                    Prisma ORM                           │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   PostgreSQL 15+                        │
│                                                         │
│  users · refresh_tokens · learning_modules · words      │
│  word_examples · user_word_progress · synonym_groups    │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript 5 |
| Framework | Express 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL 15+ |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod |
| Password hashing | bcryptjs |
| Security | Helmet, CORS |
| Logging | Morgan |

### Frontend
| Layer | Technology |
|---|---|
| Build tool | Vite 5 |
| Framework | React 18 |
| Language | TypeScript 5 |
| Routing | React Router v6 |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Forms | React Hook Form + Zod |
| HTTP client | Axios |
| UI components | Radix UI primitives |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |

---

## Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later
- **PostgreSQL** 15 or later (running locally or via a remote connection string)

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd eng
```

### 2. Backend setup

```bash
cd backend

# Install dependencies
npm install

# Copy the example environment file and fill in your values
cp .env.example .env
# Edit .env and set DATABASE_URL and JWT secrets (see Environment Variables section)

# Run database migrations
npx prisma migrate dev

# Seed the database with the default module, admin user, and sample words
npx prisma db seed
# or: npm run db:seed

# Start the development server (hot-reload via tsx)
npm run dev
```

The API server starts on `http://localhost:3000` by default.

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

The frontend is served at `http://localhost:5173` by default.

---

## Environment Variables

File: `backend/.env` (copy from `backend/.env.example`)

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/english_learning` | Full PostgreSQL connection string used by Prisma |
| `JWT_SECRET` | Yes | (32+ random characters) | Secret key for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | (32+ random characters, different from above) | Secret key for signing refresh tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime (default: `7d`) |
| `PORT` | No | `3000` | Port the Express server listens on |
| `NODE_ENV` | No | `development` | Enables Morgan request logging when set to `development` |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed origin for CORS; must match the frontend URL |

---

## API Endpoints Reference

Base URL: `http://localhost:3000/api`

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Returns server status and timestamp |

### Authentication (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register a new user account |
| POST | `/auth/login` | None | Login and receive access + refresh tokens |
| POST | `/auth/refresh` | None | Exchange a refresh token for a new access token |
| POST | `/auth/logout` | None | Invalidate a refresh token |
| GET | `/auth/me` | Bearer | Return the authenticated user's profile |

### Users (`/users`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Bearer | Get the current user's profile |
| PUT | `/users/me` | Bearer | Update name/email |
| PUT | `/users/me/password` | Bearer | Change password |

### Vocabulary (`/words`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/words` | Bearer | List words (filterable by module, chapter, unit, status, search) |
| GET | `/words/modules` | None | List all active learning modules |
| GET | `/words/:id` | None | Get a single word with examples |
| POST | `/words` | Admin | Create a new word |
| PUT | `/words/:id` | Admin | Update an existing word |
| DELETE | `/words/:id` | Admin | Delete a word |
| POST | `/words/:id/examples` | Admin | Add an example sentence to a word |
| PUT | `/words/:id/examples/:exampleId` | Admin | Update an example sentence |
| DELETE | `/words/:id/examples/:exampleId` | Admin | Delete an example sentence |

### Progress (`/progress`)

| Method | Path | Auth | Description |
|---|---|---|---|
| PUT | `/progress/words/:wordId` | Bearer | Update learning status for a word in a review mode |
| GET | `/progress/stats` | Bearer | Get summary statistics (total, known, not-known per mode) |
| DELETE | `/progress/reset` | Bearer | Reset all progress for the authenticated user |

### Synonyms (`/synonyms`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/synonyms/words/:wordId` | Bearer | Get synonym suggestions for a word |

---

## Database Schema Overview

```
users
  id            cuid (PK)
  email         unique
  password_hash
  name
  role          USER | ADMIN
  created_at
  updated_at

refresh_tokens
  id            cuid (PK)
  token         unique
  user_id       → users.id  (cascade delete)
  expires_at
  created_at

learning_modules
  id            cuid (PK)
  name          unique
  slug          unique
  description
  is_active     boolean
  order         int
  created_at

words
  id                  cuid (PK)
  eng                 English word
  per                 Persian translation
  description
  primary_example     English example sentence
  primary_example_trs Persian translation of primary example
  chapter             int (nullable)
  unit                int (nullable)
  module_id           → learning_modules.id
  created_at
  updated_at

word_examples
  id              cuid (PK)
  word_id         → words.id  (cascade delete)
  eng_sentence    English sentence
  per_translation Persian translation
  order           int
  created_at

user_word_progress
  id          cuid (PK)
  user_id     → users.id  (cascade delete)
  word_id     → words.id  (cascade delete)
  review_mode EN_TO_FA | FA_TO_EN
  status      NOT_READ | KNOWN | NOT_KNOWN
  updated_at
  UNIQUE (user_id, word_id, review_mode)

synonym_groups
  id            cuid (PK)
  concept_name
  created_at
```

---

## Review Modes

The platform tracks learning progress separately for two review directions:

| Mode | Direction | Description |
|---|---|---|
| `EN_TO_FA` | English to Persian | The English word is shown; the learner must recall the Persian meaning |
| `FA_TO_EN` | Persian to English | The Persian word is shown; the learner must recall the English word |

Each `(user, word, review_mode)` triple has its own independent status, so a word can be KNOWN in one direction and NOT_KNOWN in the other.

---

## Learning States

Each word in each review mode moves through the following states:

| Status | Meaning |
|---|---|
| `NOT_READ` | The word has not yet been encountered in review (default) |
| `KNOWN` | The learner confirmed they know this word |
| `NOT_KNOWN` | The learner marked this word as not yet known; it will be re-queued |

Progress is per-user and per-review-mode. Resetting progress (`DELETE /progress/reset`) returns all words to `NOT_READ` for that user.

---

## Admin Panel

The admin panel is accessible at `/admin` and is restricted to users with the `ADMIN` role.

Default admin credentials created by the seed script:
- Email: `admin@example.com`
- Password: `Admin123!`

**Admin capabilities:**

1. **Word list** — Browse all words with chapter/unit filters.
2. **Add word** — Navigate to `/admin/words/new` to create a new word, including the English term, Persian translation, description, primary example sentence (with Persian translation), chapter, and unit.
3. **Edit word** — Navigate to `/admin/words/:id/edit` to update any field on an existing word.
4. **Delete word** — Remove a word and all associated examples and progress records.
5. **Manage examples** — Add, edit, or delete additional example sentences for any word.

Non-admin users who attempt to access `/admin` routes are automatically redirected to `/vocabulary`.

---

## Future Modules Roadmap

The `learning_modules` table is designed to host additional content modules beyond vocabulary. Planned additions include:

| Module | Slug | Description |
|---|---|---|
| Grammar | `grammar` | Structured grammar lessons with rule explanations and exercises |
| Reading | `reading` | Short reading passages with comprehension questions |
| Listening | `listening` | Audio-based exercises tied to vocabulary words |
| Phrases & Idioms | `phrases` | Common English phrases and idiomatic expressions |
| Writing | `writing` | Guided sentence and paragraph construction exercises |
| Pronunciation | `pronunciation` | Phonetic guides and audio pronunciation for vocabulary words |
| Spaced Repetition | `srs` | Automated SM-2 scheduling for review intervals based on performance history |

New modules can be added by inserting a row into `learning_modules` and associating words or content via a new relation. The existing `ReviewMode` and `WordStatus` enums are already generalized enough to support additional content types with no schema changes.
