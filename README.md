# English Learning Platform

A complete, scalable English learning platform built with React and Node.js. The platform is designed to support multiple learning modules (Vocabulary, Proverbs, Grammar, Reading, Listening, etc.) with a modular architecture that makes adding new features straightforward.

**Current Implementation**: The first module, "4000 Essential English Words" vocabulary learning, is fully implemented with dual review modes, progress tracking, and admin management.

## ✨ Key Features

### Vocabulary Learning Module
- **4000 Essential English Words** dataset
- **Dual review modes**:
  - English → Persian
  - Persian → English
- **Learning states** per word per mode (Not Read, Known, Not Known)
- **Sorting** by: Lesson/Chapter, Unit, English Alphabet, Persian Alphabet
- **Filtering**: Show All, Not Known, Not Read, Known
- **Synonyms** feature with extensible architecture (WordNet/AI ready)
- **Admin panel** for word management (CRUD + examples)

### Authentication & User System
- JWT Authentication with refresh tokens
- Personal progress tracking per user
- Admin/User role separation

### Modern Tech Stack
- **Backend**: Node.js + TypeScript + Express + PostgreSQL + Prisma
- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui
- **State Management**: TanStack Query (server) + Zustand (client)
- **Styling**: Tailwind CSS with dark mode and RTL support

### Architecture Highlights
- Clean Architecture with Repository, Service, and DTO patterns
- Modular design for easy addition of new learning modules
- Dependency Injection and Validation layers
- Scalable and maintainable codebase

## 🚀 Quick Start

### Prerequisites
- Node.js (v20 or higher)
- PostgreSQL (v15 or higher)
- npm

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/english-learning-platform.git
cd english-learning-platform
```

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Configure Environment Variables
```bash
cp .env.example .env
```
Edit .env with your values:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/english_learning"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

#### Setup Database & Seed Data
```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```
This creates default admin and user accounts:
- Admin: admin@example.com / Admin123!
- User: user@example.com / User123!

#### Start Backend
```bash
npm run dev
```
Server runs on http://localhost:3000

### 3. Frontend Setup

```bash
cd frontend
npm install
```

#### Start Frontend
```bash
npm run dev
```
Application runs on http://localhost:5173

### 4. Full Stack Development
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## 📚 Project Structure

```
english-learning-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database models
│   │   └── seed.ts             # Initial seed data
│   └── src/
│       ├── app.ts              # Express configuration
│       ├── server.ts           # Server entry
│       ├── config/             # Environment configuration
│       ├── shared/
│       │   ├── errors/         # Custom error classes
│       │   ├── middleware/     # Auth, validation, error handling
│       │   ├── types/          # Shared TypeScript types
│       │   └── utils/          # JWT, password utilities
│       └── modules/
│           ├── auth/           # Authentication module
│           ├── users/          # User profile management
│           ├── vocabulary/     # Word CRUD and retrieval
│           ├── progress/       # User progress tracking
│           └── synonyms/       # Synonym system (extensible)
│
└── frontend/
    ├── public/
    │   └── fonts/              # Persian font files
    └── src/
        ├── pages/
        │   ├── auth/           # Login, Register
        │   ├── vocabulary/     # Vocabulary list, Review mode
        │   └── admin/          # Admin panel, Word form
        ├── components/
        │   ├── ui/             # shadcn/ui components
        │   ├── layout/         # Layout, Navbar, Theme toggle
        │   ├── vocabulary/     # WordCard, ReviewCard, Filters
        │   └── admin/          # ExampleManager
        ├── services/           # API service functions
        ├── hooks/              # React Query hooks
        ├── store/              # Zustand store (auth)
        ├── lib/                # Axios, utilities
        └── types/              # Shared TypeScript types
```

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts with role (ADMIN/USER)
- **refresh_tokens** - One-time use refresh tokens
- **learning_modules** - Educational modules (Vocabulary, Proverbs, etc.)
- **words** - Vocabulary records with chapter, unit, translations
- **word_examples** - Additional examples (0 to many per word)
- **user_word_progress** - Learning status per user, word, and review mode
- **synonym_groups** - Semantic grouping for synonyms (extensible)

### Key Relationships
- user_word_progress has a **unique constraint**: (user_id, word_id, review_mode)
- Each user tracks progress separately per word and review mode
- One word can have multiple examples
- Words belong to a learning module

## 🔌 API Endpoints

### Authentication /api/auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | Create new account |
| POST | /login | Login with credentials |
| POST | /refresh | Refresh access token |
| POST | /logout | Logout user |
| GET | /me | Get current user info |

### Words /api/words
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | / | Public - List words with filters |
| GET | /modules | Public - List learning modules |
| GET | /:id | Public - Get word details |
| POST | / | Admin - Create word |
| PUT | /:id | Admin - Update word |
| DELETE | /:id | Admin - Delete word |
| POST | /:id/examples | Admin - Add example |
| PUT | /:id/examples/:exId | Admin - Update example |
| DELETE | /:id/examples/:exId | Admin - Delete example |

### Progress /api/progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | /words/:wordId | Update word learning status |
| GET | /stats | Get user progress statistics |
| DELETE | /reset | Reset user progress |

### Synonyms /api/synonyms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /words/:wordId | Get synonyms for a word |

### Users /api/users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /me | Get user profile |
| PUT | /me | Update user profile |
| PUT | /me/password | Change password |

### Query Parameters for GET /words
```
?page=1
&limit=20
&chapter=1
&unit=2
&status=NOT_KNOWN    # NOT_READ | KNOWN | NOT_KNOWN
&mode=EN_TO_FA       # EN_TO_FA | FA_TO_EN
&sort=chapter        # chapter | unit | eng | per
&order=asc           # asc | desc
&search=afraid
```

## 📱 Frontend Pages

| Route | Component | Access |
|-------|-----------|--------|
| /login | LoginPage | Public |
| /register | RegisterPage | Public |
| /vocabulary | VocabularyPage | Authenticated |
| /vocabulary/review | ReviewPage | Authenticated |
| /admin | AdminPage | Admin only |
| /admin/words/new | WordFormPage | Admin only |
| /admin/words/:id/edit | WordFormPage | Admin only |

## 🔐 Authentication Flow

1. User logs in → receives access_token & refresh_token
2. Tokens stored in localStorage
3. All requests include Authorization: Bearer {access_token}
4. On 401 response → auto-refresh using refresh token
5. Original request retried with new token
6. On refresh failure → user redirected to /login

## 🎨 Theme & Styling

- **Dark Mode** support with system preference detection
- **RTL Support** for Persian language
- **Custom Font**: "Anjoman" Persian font pre-loaded
- **Tailwind CSS** with shadcn/ui components

## 🛠️ Development Commands

### Backend
```bash
npm run dev          # Development with hot-reload
npm run build        # Build for production
npm run start        # Run production build
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes (development)
npm run db:seed      # Seed database with initial data
npm run db:studio    # Open Prisma Studio
```

### Frontend
```bash
npm run dev          # Development with hot-reload
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🔮 Adding a New Learning Module

1. Add a record to learning_modules table
2. Create new module folder in backend/src/modules/
3. Follow the same layered structure (controller, service, repository)
4. Mount the router in src/app.ts
5. No changes needed to existing architecture

## 🧠 Synonym System Architecture

The synonym system is designed to be extensible:
- **Current**: Basic implementation with synonym_groups table
- **Future-ready**:
  - Integration with WordNet
  - AI-powered semantic search
  - Third-party dictionary APIs
  - Natural Language Processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit changes (git commit -m 'Add amazing feature')
4. Push to branch (git push origin feature/amazing-feature)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [4000 Essential English Words](https://www.4000essentialenglishwords.com/) - Vocabulary source
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Prisma](https://www.prisma.io/) - ORM
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [Anjoman Font](https://fontiran.com/) - Persian typography

---

**Built with ❤️ for language learners in IRAN**
