# Backend — VocabFlow API

> **وضعیت:** با کد تطبیق داده شد در 2026-10-04. منبع حقیقت خودِ کد است؛ اسکیمای کامل در
> `backend/prisma/schema.prisma` و توضیح جدول‌ها در [`DATABASE_SCHEMA.html`](DATABASE_SCHEMA.html).
> این بک‌اند فقط نسخه‌ی **وب** را سرویس می‌دهد؛ نسخه‌ی اندروید هیچ تماسی با آن ندارد (→ [`ANDROID.md`](ANDROID.md)).

## تکنولوژی‌ها

| ابزار | نسخه | کاربرد |
|-------|------|--------|
| Node.js | 20+ | Runtime |
| TypeScript | 5.9.3 در lockfile؛ بازه‌ی manifest: `^5.6.3` (`strict`) | زبان اصلی |
| Express.js | 4.21 + `express-async-errors` | فریم‌ورک HTTP |
| PostgreSQL | 16 (Docker، `docker-compose.yml`) | دیتابیس |
| Prisma ORM | 5.22 — **ارتقا نده** | ارتباط با دیتابیس |
| Zod | 3.23 | اعتبارسنجی |
| jsonwebtoken / bcryptjs | — | احراز هویت / هش پسورد (۱۲ round) |

هیچ تست، ESLint، Prettier یا CI در بک‌اند وجود ندارد. تنها بررسی خودکار: `npx tsc --noEmit` (در 2026-10-04 بدون خطا).

---

## ساختار پروژه

```
backend/
├── prisma/
│   ├── schema.prisma               # 17 مدل، 5 enum
│   ├── migrations/                 # 10 migration (آخری: 20260813000000_add_review_events)
│   ├── seed.ts                     # ماژول vocabulary + دو حساب تستی (لغت seed نمی‌کند)
│   ├── import-all.ts               # ایمپورت همه‌ی *.json از پوشه‌ی books/ ریشه (→ CONTENT_PIPELINE.md)
│   ├── migrate-mysql.ts            # تاریخی: ایمپورت یک‌باره از words-new.sql (→ MIGRATION.md)
│   └── backfill-pattern-examples.ts# پر کردن primaryExample از اولین phrase برای لغات بی‌مثال
└── src/
    ├── server.ts                   # $connect + listen + shutdown روی SIGTERM/SIGINT
    ├── app.ts                      # helmet → cors → json(10mb) → morgan(dev) → routerها → 404 → errorMiddleware
    ├── config/index.ts             # خواندن env (پایین‌تر)
    ├── shared/
    │   ├── errors/                 # AppError + زیرکلاس‌ها
    │   ├── middleware/             # auth, admin (requireAdmin), validate, error
    │   ├── types/                  # JwtPayload, WordFilters, ...
    │   └── utils/                  # jwt.util, password.util
    └── modules/                    # 12 ماژول، همه زیر /api/<name> در app.ts mount شده‌اند
        ├── auth/  users/  vocabulary/ (→ /api/words)  progress/  synonyms/  books/
        └── watchlist/  study/  plans/  settings/  dashboard/  stats/
```

### الگوی ماژول — و استثناهایش

الگوی رایج (auth, books, dashboard, plans, settings, stats, study, vocabulary, watchlist):

```
<name>.router.ts      # ساخت repository → service → controller (کلاس‌ها) + تعریف routeها
<name>.controller.ts  # خواندن req، صدا زدن service، ارسال envelope
<name>.service.ts     # منطق کسب‌وکار؛ AppError پرتاب می‌کند
<name>.repository.ts  # تنها جای استفاده از Prisma؛ هر فایل `new PrismaClient()` خودش را دارد
```

استثناها (هنگام تغییر، از الگوی **ماژول همسایه** پیروی کن، نه از این قالب):
- پوشه‌ی `dto/` فقط در `auth`، `books`، `vocabulary` هست. بقیه اسکیمای zod را داخل controller تعریف و با `safeParse` → `ValidationError` چک می‌کنند.
- `users`، `progress`، `synonyms` کنترلرِ تابعی دارند (service در سطح ماژول ساخته می‌شود).
- `synonyms` repository ندارد؛ service مستقیم Prisma را صدا می‌زند و تنها provider یک `MockSynonymProvider` هاردکد است (`synonym.provider.ts` فقط interface است).
- `auth/auth.routes.ts` یک re-export مرده است؛ `auth.router.ts` استفاده می‌شود.
- `router.use(authenticate)` در سطح router: dashboard, plans, settings, stats, study, watchlist. بقیه per-route.

---

## مدل‌های دیتابیس (17 جدول، 5 enum)

```
users, refresh_tokens, learning_modules
books → volumes → lessons → words → word_examples
                                  → word_phrases → word_phrase_examples
user_word_progress     ← [user × word × review_mode] → status + SM-2 + manual_status
learning_plans         ← برنامه‌ی هر کاربر برای هر جلد (موتور سیستم روزانه)
study_sessions         ← جلسات تمام‌شده (streak، heatmap، دقت)
review_events          ← لاگ append-only هر پاسخ (تنها تاریخچه)
user_settings          ← تنظیمات سراسری کاربر (PK = user_id)
watchlist_items        ← فقط نوشته می‌شود، هرگز خوانده نمی‌شود (پایین‌تر)
synonym_groups         ← بدون رابطه و بلااستفاده
```
Enumها: `Role` (USER/ADMIN)، `ReviewMode` (EN_TO_FA/FA_TO_EN)، `WordStatus` (NOT_READ/KNOWN/NOT_KNOWN)، `CardOrder` (SEQUENTIAL/RANDOM)، `ReviewAnswer` (EASY/HARD/AGAIN).

نکات حیاتی:
- `UNIQUE (user_id, word_id, review_mode)` روی `user_word_progress` ⇒ هر لغت تا دو ردیف برای هر کاربر دارد. **هر شمارشی باید روی `review_mode` فیلتر کند** وگرنه دو برابر می‌شود. لغتی که کاربر هرگز لمس نکرده **هیچ** ردیفی ندارد.
- `words.lesson_id` nullable است ولی `module_id` اجباری؛ لغتِ بدون درس در کتابخانه دیده نمی‌شود.
- `learning_plans`: `UNIQUE (user_id, volume_id)`.

### ستون‌های `user_word_progress`

| ستون | پیش‌فرض | توضیح |
|------|---------|-------|
| `status` | `NOT_READ` | مسیر برنامه‌ی روزانه‌ی SM-2 |
| `manual_status` | `NOT_READ` | مسیر **جداگانه**ی مرور آزاد دستی |
| `repetitions` / `interval_days` / `ease_factor` | `0` / `0` / `2.5` | وضعیت SM-2 (کف ease = 1.3) |
| `review_count` / `correct_count` / `wrong_count` / `hard_count` | `0` | شمارنده‌ها |
| `last_reviewed_at` / `next_review_at` | `null` | زمان آخرین مرور / سررسید |
| `introduced_at` | `null` | ورود به چرخه؛ `null` = هنوز «لغت جدید» |

**چه کسی کدام ستون را می‌نویسد** (تأییدشده):
- `manual_status` → فقط `progress.repository.ts` (`PUT /api/progress/words/:wordId` و `DELETE /api/progress/reset`). فیلتر وضعیت در `GET /api/words` هم روی `manual_status` است.
- `status` + ستون‌های SM-2 → `study.repository.saveSchedule` (از `POST /api/study/answer`) **و** `plan.repository.resetVolumeSm2` (از `DELETE /api/plans/:id`، که SM-2 آن جلد را ریست می‌کند و `manual_status` را دست نمی‌زند).
- این دو مسیر هرگز ستونِ یکدیگر را نمی‌نویسند.

### `review_events`
یک ردیف برای هر پاسخی که زمان‌بندی را تغییر می‌دهد (EASY/HARD/AGAIN — **SKIP ثبت نمی‌شود**)، با وضعیتِ *بعد از* پاسخ: `answer, repetitions, interval_days, ease_factor, is_first, is_lapse, reviewed_at`. در `study.service.answer()` بعد از `saveSchedule` اضافه می‌شود (دو نوشتن بدون transaction). صفحه‌ی `/statistics` (`/api/stats`) از روی همین لاگ کار می‌کند؛ روی نصب‌های قدیمی لاگ خالی شروع می‌شود.
> ⚠ نمودار رشد در `/api/dashboard` **هنوز** از `user_word_progress.last_reviewed_at` ساخته می‌شود، نه از `review_events` (`dashboard.service.ts`).

### Watchlist (تاریخی)
`watchlist_items` (سطح کتاب) قبلاً منبع «لیست من» بود؛ از 2026-07-09 جایش را `learning_plans` (سطح جلد) گرفته. `GET /api/watchlist` و `GET /api/watchlist/discovery` (`inWatchlist`) از **planهای فعال** مشتق می‌شوند. `POST`/`DELETE /api/watchlist` هنوز در جدول می‌نویسند ولی هیچ کدی آن را نمی‌خواند. جدول عمداً حذف نشده.

---

## قرارداد پاسخ و خطا

- موفق: `{ success: true, data }` یا `{ success: true, message }`.
- صفحه‌بندی (فقط `GET /api/words`): `meta` **داخل** `data` است: `{ success, data: { data: words, meta: { page, limit, total, totalPages } } }`. چون axios فرانت `.data` را باز می‌کند، سرویس فرانت `{ data, meta }` دریافت می‌کند.
- خطا: `error.middleware.ts` به‌صورت مرکزی:
  - `AppError` → `{ success:false, message, code }`؛ زیرکلاس‌ها: `UnauthorizedError` 401، `ForbiddenError` 403، `NotFoundError` 404، `ValidationError` 400، `ConflictError` 409 (**`BadRequestError` وجود ندارد**).
  - Prisma `P2002` → 409، `P2025` → 404؛ بقیه → 500 `INTERNAL_ERROR` (پیام واقعی فقط در development).
  - شاخه‌ی `ZodError` (بدون `code`) عملاً اجرا نمی‌شود چون همه‌جا `safeParse` استفاده شده.
  - 404ِ مسیر ناموجود شکل متفاوتی دارد: `{ status:'error', message:'Route not found' }`.
- در controller هرگز پاسخ خطا نساز؛ `AppError` پرتاب کن.

---

## API Endpoints

`A` = نیازمند `authenticate`؛ `AD` = `authenticate` + `requireAdmin`. شناسه‌ی کاربر در کد: `req.user.sub`.

| ماژول | Method و مسیر |
|---|---|
| **auth** `/api/auth` | `POST /register`، `POST /login`، `POST /refresh`، `POST /logout` (عمومی)؛ `GET /me` (A — همان payload توکن) |
| **users** `/api/users` | `GET /` (AD)؛ `GET /me`، `PUT /me`، `PUT /me/password` (A) |
| **words** `/api/words` | `GET /` (**A**)؛ `GET /modules`، `GET /:id` (عمومی)؛ `POST /`، `PUT /:id`، `DELETE /:id`، `POST /:id/examples`، `PUT\|DELETE /:id/examples/:exampleId` (AD) |
| **progress** `/api/progress` | `PUT /words/:wordId`، `GET /stats`، `DELETE /reset` (A) — همه روی `manual_status` |
| **synonyms** `/api/synonyms` | `GET /words/:wordId` (A) |
| **books** `/api/books` | GET عمومی: `/`، `/simple`، `/:id`، `/:bookId/volumes`، `/:bookId/volumes/simple`، `/:bookId/volumes/:volumeId`، `/:bookId/volumes/:volumeId/lessons`، `.../lessons/simple`؛ POST/PUT/DELETE کتاب، جلد، درس (AD) |
| **watchlist** `/api/watchlist` | `GET /`، `GET /discovery`، `POST /`، `DELETE /:bookId` (A) |
| **study** `/api/study` | `GET /today`، `GET /today-new` (لغاتی که امروز وارد چرخه شدند)، `POST /answer`، `POST /session` (A) |
| **plans** `/api/plans` | `GET /`، `POST /`، `PATCH /:id`، `DELETE /:id` (A) |
| **settings** `/api/settings` | `GET /` (پیش‌فرض‌ها را lazy می‌سازد)، `PUT /` (A) |
| **dashboard** `/api/dashboard` | `GET /`، `GET /hard-words` (A) |
| **stats** `/api/stats` | `GET /` (A) — آمار از `review_events` |
| health | `GET /api/health` → `{ status: 'ok', timestamp }` |

### `GET /api/words` — فیلترها و تله‌ها (`word.repository.ts`)
- پارامترها: `page, limit, chapter, unit, lessonId, volumeId, bookId, bookIds (CSV), status, mode, sort, order, search`.
- `bookId`/`bookIds` و `volumeId` باید داخل **یک** فیلتر تو در توی `lesson` ادغام شوند؛ دو spread جدا روی کلید `lesson` همدیگر را بی‌صدا overwrite می‌کنند.
- `status=NOT_READ` نمی‌تواند `progress: { some }` باشد (لغات بدون ردیف را از قلم می‌اندازد)؛ از شکل منفی استفاده می‌شود: `NOT: { progress: { some: { userId, reviewMode: mode, manualStatus: { in: ['KNOWN','NOT_KNOWN'] } } } }`.

---

## احراز هویت

- Access token: HS256، payload `{ sub, email, role }`، با `JWT_SECRET`، پیش‌فرض ۱۵ دقیقه.
- Refresh token: `{ sub, jti }` با `JWT_REFRESH_SECRET`، پیش‌فرض ۷ روز، **plaintext** در `refresh_tokens.token` ذخیره می‌شود.
- refresh = تأیید → lookup → حذف → صدور جفت جدید (یک‌بار مصرف؛ بدون تشخیص reuse).
- logout فقط توکنِ ارسال‌شده را حذف می‌کند. تغییر پسورد refresh tokenها را باطل **نمی‌کند**.
- ⚠ اگر `JWT_SECRET`/`JWT_REFRESH_SECRET` در `.env` نباشند، `config/index.ts` بی‌صدا به یک رشته‌ی هاردکد برمی‌گردد. هیچ env در شروع اعتبارسنجی نمی‌شود.
- هیچ منطق اشتراک/trial/premium در بک‌اند وجود ندارد (طرحِ آینده: `docs/VocabFlow (Subscription Architecture v1).txt`).

---

## سیستم یادگیری روزانه (SM-2)

موتور خالص در `src/modules/study/srs.ts`؛ کپیِ منطقاً معادل در `frontend/src/offline/srs.ts` (سبک کد متفاوت است، ثابت‌ها و فرمول‌ها یکی) — **هر تغییری باید در هر دو اعمال شود.**

| پاسخ | quality | اثر |
|------|---------|-----|
| AGAIN | 1 | لغزش: `repetitions=0`، `interval=0`، سررسید = **شروعِ امروز** (همان روز دوباره)، `NOT_KNOWN` |
| HARD | 3 | قبول؛ ease −0.14 |
| EASY | 5 | قبول؛ ease +0.10 |
| SKIP | — | سرور هیچ چیز نمی‌نویسد (`{ skipped: true }`)؛ فرانت هم آن را requeue نمی‌کند — فقط AGAIN در جلسه دوباره صف می‌شود |

- فاصله برای قبول: `1 → 6 → round(interval × ease_قبلی)`، `repetitions++`، `KNOWN`.
- ease روی همه‌ی پاسخ‌ها (حتی لغزش): `max(1.3, ease + (0.1 − (5−q)(0.08 + (5−q)·0.02)))`.
- **روز ساعت 06:00 محلی شروع می‌شود** (`DAY_START_HOUR = 6`)، نه نیمه‌شب.
- جهت مطالعه یک تنظیم است (`user_settings.study_direction`، پیش‌فرض `EN_TO_FA`)؛ چون progress per-mode است دو جهت مستقل زمان‌بندی می‌شوند.

**ساخت صف امروز** (`study.service.getToday`): برای هر plan فعال (قدیمی‌ترین اول):
1. سررسیدها: `introduced_at` غیر null و `next_review_at ≤ پایان امروز`، با سقف `daily_goal` آن plan.
2. لغات جدید: ظرفیت `daily_new_words − introducedToday`، به ترتیب درس (lesson, chapter, createdAt, id).
3. با `card_order = RANDOM` هر گروه جدا shuffle می‌شود.

**قوانین plan** (`plan.service.ts`): `daily_new_words ∈ {10,20,30,40,50}`؛ `5 ≤ daily_goal ≤ 500` و `daily_goal ≥ daily_new_words`؛ جمع planهای فعال ≤ 200. اگر `dailyGoal` ارسال نشود controller آن را `dailyNewWords × 3` می‌گذارد (پیش‌فرض 30ِ اسکیما عملاً استفاده نمی‌شود).

**جریان:** `GET /study/today` → برای هر کارت `POST /study/answer` (→ `saveSchedule` + `review_events`) → در پایان `POST /study/session` (یک ردیف `study_sessions`).

---

## راه‌اندازی

```bash
docker compose up -d              # از ریشه — postgres:16 روی :5432، دیتابیس english_learning
cd backend
npm install
cp .env.example .env              # مقادیر پیش‌فرض به دیتابیس Docker وصل می‌شوند
npm run db:migrate                # prisma migrate dev
npm run db:generate               # بعد از هر تغییر schema.prisma
npm run db:seed                   # ماژول vocabulary + حساب‌ها
npm run db:seed-all-datas         # اختیاری: ایمپورت کتاب‌ها از ../books
npm run dev                       # tsx watch → http://localhost:3000
```

حساب‌های توسعه که `seed.ts` می‌سازد: `admin@example.com / Admin123!` (ADMIN)، `user@example.com / User123!` (USER).

متغیرهای محیطی (`.env.example`): `DATABASE_URL`، `JWT_SECRET`، `JWT_REFRESH_SECRET`، `JWT_EXPIRES_IN`، `JWT_REFRESH_EXPIRES_IN`، `PORT`، `NODE_ENV`، `CORS_ORIGIN` (یک origin).

## دستورات کامل

```bash
npm run dev                          # tsx watch src/server.ts
npm run build                        # tsc → dist/ (فقط src/؛ اسکریپت‌های prisma/ با tsx اجرا می‌شوند)
npm run start                        # node dist/server.js
npm run db:migrate                   # prisma migrate dev
npm run db:generate                  # prisma generate
npm run db:push                      # sync مستقیم schema بدون migration (فقط توسعه)
npm run db:seed                      # prisma/seed.ts
npm run db:seed-all-datas [-- dir]   # prisma/import-all.ts (پیش‌فرض: <repo>/books)
npm run db:migrate-mysql             # prisma/migrate-mysql.ts (تاریخی)
npm run db:backfill-pattern-examples # prisma/backfill-pattern-examples.ts
npm run db:studio                    # Prisma Studio
```

بعد از تغییر `schema.prisma`: `db:migrate` **و** `db:generate`، سپس تغییر ساختاری را در `frontend/src/offline/db.ts` آینه کن (مهارت `.claude/skills/schema-change`).
