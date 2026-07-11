# Backend — English Learning Platform

## تکنولوژی‌ها

| ابزار | نسخه | کاربرد |
|-------|------|--------|
| Node.js | 20+ | Runtime |
| TypeScript | 5.6 | زبان اصلی |
| Express.js | 4.21 | فریم‌ورک HTTP |
| PostgreSQL | 15+ | دیتابیس |
| Prisma ORM | 5.22 | ارتباط با دیتابیس |
| Zod | 3.23 | اعتبارسنجی داده |
| JWT | — | احراز هویت |
| bcryptjs | — | هش کردن پسورد |

---

## ساختار پروژه

```
backend/
├── prisma/
│   ├── schema.prisma       # تعریف مدل‌های دیتابیس
│   └── seed.ts             # داده اولیه (admin user + نمونه لغات)
│
└── src/
    ├── app.ts              # تنظیم Express و middleware‌ها
    ├── server.ts           # راه‌اندازی سرور
    ├── config/
    │   └── index.ts        # خواندن متغیرهای محیطی
    │
    ├── shared/
    │   ├── errors/         # کلاس‌های خطا (AppError, NotFoundError, ...)
    │   ├── middleware/
    │   │   ├── auth.middleware.ts      # بررسی JWT
    │   │   ├── admin.middleware.ts     # بررسی نقش ADMIN
    │   │   ├── validate.middleware.ts  # اعتبارسنجی body با Zod
    │   │   └── error.middleware.ts     # هندلر مرکزی خطا
    │   ├── types/
    │   │   └── index.ts    # تایپ‌های مشترک (JwtPayload, WordFilters, ...)
    │   └── utils/
    │       ├── jwt.util.ts       # تولید و تایید توکن
    │       └── password.util.ts  # هش و مقایسه پسورد
    │
    └── modules/
        ├── auth/           # ثبت‌نام، ورود، refresh، logout
        ├── users/          # پروفایل کاربر، تغییر پسورد
        ├── vocabulary/     # مدیریت لغات و مثال‌ها
        ├── progress/       # پیشرفت یادگیری هر کاربر
        ├── synonyms/       # سیستم مترادف‌ها (قابل توسعه)
        ├── books/          # کتاب‌ها، جلدها (volume) و درس‌ها (lesson)
        ├── watchlist/      # لیست کتاب‌های دنبال‌شده هر کاربر
        ├── study/          # یادگیری روزانه با الگوریتم SM-2 (شامل srs.ts)
        ├── plans/          # برنامه‌های یادگیری (به ازای هر جلد)
        ├── settings/       # تنظیمات کاربر (جهت مرور، صوت، فونتیک، ...)
        └── dashboard/      # جمع‌بندی آمار داشبورد
```

> ماژول `study/` علاوه بر لایه‌های استاندارد، فایل `srs.ts` را دارد که موتور خالص الگوریتم SM-2 است (بدون وابستگی به دیتابیس).

هر ماژول شامل این لایه‌هاست:

```
module/
├── module.controller.ts   # دریافت request و ارسال response
├── module.service.ts      # منطق کسب‌وکار
├── module.repository.ts   # کوئری‌های Prisma
├── module.router.ts       # تعریف route‌ها
└── dto/                   # اسکیمای Zod برای اعتبارسنجی
```

---

## مدل‌های دیتابیس

```
users                  ← حساب کاربری
refresh_tokens         ← توکن‌های refresh (یک‌بار مصرف)
learning_modules       ← ماژول‌های آموزشی (vocabulary، proverbs، ...)
books                  ← کتاب‌ها
volumes                ← جلدهای هر کتاب
lessons                ← درس‌های هر جلد
words                  ← لغات (متصل به learning_module و lesson)
word_examples          ← مثال‌های اضافه هر لغت
watchlist_items        ← کتاب‌های دنبال‌شده هر کاربر
user_word_progress     ← وضعیت یادگیری: [user × word × mode] → status + زمان‌بندی SM-2
learning_plans         ← برنامه یادگیری هر کاربر برای هر جلد
study_sessions         ← جلسات مطالعه‌ی تمام‌شده (خلاصه، streak، دقت)
user_settings          ← تنظیمات سراسری هر کاربر
synonym_groups         ← گروه‌بندی مترادف‌ها (زیربنا برای توسعه آینده)
```

کلید منحصربه‌فرد جدول progress:

```sql
UNIQUE (user_id, word_id, review_mode)
```

یعنی هر کاربر برای هر لغت، در هر حالت (EN→FA و FA→EN) یک وضعیت جداگانه دارد.

### ستون‌های SM-2 روی `user_word_progress`

جدول `user_word_progress` علاوه بر `status` (وضعیت مسیر برنامه‌ی روزانه‌ی SM-2)، این ستون‌ها را دارد:

| ستون | پیش‌فرض | توضیح |
|------|---------|-------|
| `manual_status` | `NOT_READ` | مسیر **جداگانه**ی مرور آزاد دستی؛ مستقل از SM-2 و هرگز توسط برنامه‌ی روزانه تغییر نمی‌کند |
| `repetitions` | `0` | تعداد پاسخ‌های درست پیاپی |
| `interval_days` | `0` | فاصله‌ی روزهای مرور بعدی |
| `ease_factor` | `2.5` | ضریب سهولت SM-2 (کف: 1.3) |
| `review_count` | `0` | تعداد کل مرورها |
| `correct_count` / `wrong_count` | `0` | شمارش پاسخ‌های درست / نادرست |
| `last_reviewed_at` | `null` | زمان آخرین مرور |
| `next_review_at` | `null` | زمان سررسید مرور بعدی |
| `introduced_at` | `null` | زمان ورود لغت به چرخه‌ی یادگیری (`null` = هنوز لغت جدید محسوب می‌شود) |

اندیس جدید برای صف مرور روزانه: `@@index([userId, reviewMode, nextReviewAt])`.

### مدل‌های سیستم یادگیری روزانه

- **`learning_plans`** — برنامه‌ی یادگیری هر کاربر برای یک جلد؛ منبع حقیقت «لیست یادگیری من» است و جایگزین watchlist در سطح کتاب برای هدایت مطالعه‌ی روزانه می‌شود. فیلدها: `daily_new_words` (پیش‌فرض ۱۰)، `daily_goal` (پیش‌فرض ۳۰)، `is_active`. کلید یکتا: `UNIQUE (user_id, volume_id)`.
- **`study_sessions`** — یک جلسه‌ی مطالعه‌ی تمام‌شده؛ خوراک خلاصه‌ی پایان جلسه، streak، نقشه‌ی فعالیت و آمار دقت. شمارنده‌ها: `reviewed_count`، `correct_count`، `wrong_count`، `hard_count`، `skipped_count`، `new_count` به‌همراه `duration_sec`.
- **`user_settings`** — تنظیمات سراسری هر کاربر (کلید اصلی = `user_id`): `study_direction` (`ReviewMode`، پیش‌فرض `EN_TO_FA`)، `auto_play_audio`، `show_phonetics`، `show_examples`، `card_order` (`CardOrder`: `SEQUENTIAL` | `RANDOM`).

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| POST | `/register` | عمومی | ثبت‌نام |
| POST | `/login` | عمومی | ورود |
| POST | `/refresh` | عمومی | تمدید توکن |
| POST | `/logout` | عمومی | خروج |
| GET | `/me` | کاربر | اطلاعات کاربر جاری |

### Words — `/api/words`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/` | عمومی | لیست لغات با فیلتر و صفحه‌بندی |
| GET | `/modules` | عمومی | لیست ماژول‌های آموزشی |
| GET | `/:id` | عمومی | جزئیات یک لغت |
| POST | `/` | ادمین | افزودن لغت |
| PUT | `/:id` | ادمین | ویرایش لغت |
| DELETE | `/:id` | ادمین | حذف لغت |
| POST | `/:id/examples` | ادمین | افزودن مثال |
| PUT | `/:id/examples/:exId` | ادمین | ویرایش مثال |
| DELETE | `/:id/examples/:exId` | ادمین | حذف مثال |

Query params برای GET `/words`:

```
?page=1&limit=20&chapter=1&unit=2&status=NOT_KNOWN&mode=EN_TO_FA&sort=chapter&order=asc&search=afraid
```

### Progress — `/api/progress`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| PUT | `/words/:wordId` | کاربر | تغییر وضعیت لغت |
| GET | `/stats` | کاربر | آمار پیشرفت |
| DELETE | `/reset` | کاربر | ریست پیشرفت |

### Synonyms — `/api/synonyms`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/words/:wordId` | کاربر | مترادف‌های یک لغت |

### Users — `/api/users`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/me` | کاربر | پروفایل |
| PUT | `/me` | کاربر | ویرایش پروفایل |
| PUT | `/me/password` | کاربر | تغییر پسورد |

### Books — `/api/books`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/` | عمومی | لیست کتاب‌ها |
| GET | `/simple` | عمومی | لیست ساده‌ی کتاب‌ها |
| GET | `/:id` | عمومی | جزئیات یک کتاب |
| POST | `/` | ادمین | افزودن کتاب |
| PUT | `/:id` | ادمین | ویرایش کتاب |
| DELETE | `/:id` | ادمین | حذف کتاب |
| GET | `/:bookId/volumes` | عمومی | جلدهای یک کتاب |
| POST | `/:bookId/volumes` | ادمین | افزودن جلد |
| PUT | `/:bookId/volumes/:volumeId` | ادمین | ویرایش جلد |
| DELETE | `/:bookId/volumes/:volumeId` | ادمین | حذف جلد |
| GET | `/:bookId/volumes/:volumeId/lessons` | عمومی | درس‌های یک جلد |
| POST | `/:bookId/volumes/:volumeId/lessons` | ادمین | افزودن درس |
| PUT | `/:bookId/volumes/:volumeId/lessons/:lessonId` | ادمین | ویرایش درس |
| DELETE | `/:bookId/volumes/:volumeId/lessons/:lessonId` | ادمین | حذف درس |

### Watchlist — `/api/watchlist`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/` | کاربر | لیست کتاب‌های دنبال‌شده |
| GET | `/discovery` | کاربر | کتاب‌های پیشنهادی برای دنبال کردن |
| POST | `/` | کاربر | افزودن کتاب به لیست |
| DELETE | `/:bookId` | کاربر | حذف کتاب از لیست |

### Study — `/api/study`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/today` | کاربر | صف امروز (لغات سررسیدشده + لغات جدید) |
| POST | `/answer` | کاربر | ثبت یک پاسخ و به‌روزرسانی زمان‌بندی SM-2 |
| POST | `/session` | کاربر | ثبت یک جلسه‌ی مطالعه‌ی تمام‌شده |

### Plans — `/api/plans`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/` | کاربر | لیست برنامه‌های یادگیری |
| POST | `/` | کاربر | ساخت برنامه برای یک جلد |
| PATCH | `/:id` | کاربر | ویرایش برنامه |
| DELETE | `/:id` | کاربر | حذف برنامه (پیشرفت SM-2 آن جلد ریست می‌شود ولی وضعیت مرور آزاد دستی حفظ می‌ماند) |

### Settings — `/api/settings`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/` | کاربر | خواندن تنظیمات |
| PUT | `/` | کاربر | ذخیره‌ی تنظیمات |

### Dashboard — `/api/dashboard`

| Method | Path | دسترسی | توضیح |
|--------|------|--------|-------|
| GET | `/` | کاربر | جمع‌بندی آمار داشبورد (واقعی) |

---

## احراز هویت

سیستم بر پایه دو توکن کار می‌کند:

- **Access Token** — عمر کوتاه (15 دقیقه)، در هدر `Authorization: Bearer` ارسال می‌شود
- **Refresh Token** — عمر بلند (7 روز)، در دیتابیس ذخیره می‌شود (یک‌بار مصرف)

هنگام refresh، توکن قدیمی حذف و یک جفت توکن جدید صادر می‌شود.

---

## سیستم یادگیری روزانه (SM-2)

مطالعه‌ی روزانه بر پایه‌ی الگوریتم تکرار فاصله‌دار **SM-2** کار می‌کند (موتور خالص آن در `src/modules/study/srs.ts`).

**جریان کار:**

1. کاربر برای هر جلد یک **برنامه‌ی یادگیری** (`learning_plans`) با سهمیه‌ی لغات جدید روزانه و هدف روزانه می‌سازد.
2. `GET /api/study/today` صف امروز را می‌سازد: لغات سررسیدشده (`next_review_at ≤ امروز`) به‌همراه چند لغت جدید تا سقف سهمیه.
3. برای هر کارت، کاربر یکی از چهار پاسخ را می‌دهد؛ `POST /api/study/answer` زمان‌بندی SM-2 را به‌روزرسانی می‌کند.
4. در پایان، `POST /api/study/session` یک ردیف در `study_sessions` ثبت می‌کند (خوراک خلاصه، streak و آمار دقت).

**نگاشت پاسخ به کیفیت (quality) در SM-2:**

| پاسخ | quality | اثر |
|------|---------|-----|
| AGAIN | 1 | لغزش: `repetitions=0`، `interval_days=0`، سررسید همین امروز، وضعیت `NOT_KNOWN` |
| HARD | 3 | قبول با رشد کند فاصله‌ها |
| EASY | 5 | قبول با رشد سریع فاصله‌ها |
| SKIP | — | بدون تغییر؛ کارت فقط در همان جلسه دوباره به صف بازمی‌گردد |

**قواعد زمان‌بندی:**

- برای `quality < 3`: تکرارها ریست، سررسید پایان امروز، وضعیت `NOT_KNOWN`.
- برای `quality >= 3`: نردبان فاصله‌ها `0 → 1 → 6 → round(interval × ease)`، `repetitions++`، وضعیت `KNOWN`.
- به‌روزرسانی ضریب سهولت: `ease = max(1.3, ease + (0.1 − (5−q) × (0.08 + (5−q) × 0.02)))`.

> مسیر SM-2 (`status`) کاملاً از مسیر مرور آزاد دستی (`manual_status`) جداست؛ حذف یک برنامه فقط پیشرفت SM-2 آن جلد را ریست می‌کند و `manual_status` دست‌نخورده می‌ماند.

---

## راه‌اندازی

### پیش‌نیازها

- Node.js نسخه 20 یا بالاتر
- PostgreSQL نسخه 15 یا بالاتر
- npm

### مراحل

**۱. نصب وابستگی‌ها**

```bash
cd backend
npm install
```

**۲. تنظیم متغیرهای محیطی**

```bash
cp .env.example .env
```

فایل `.env` را باز کنید و مقادیر زیر را پر کنید:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/english_learning"
JWT_SECRET="یک رشته تصادفی حداقل ۳۲ کاراکتر"
JWT_REFRESH_SECRET="یک رشته تصادفی دیگر حداقل ۳۲ کاراکتر"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

**۳. ساخت دیتابیس**

```bash
npm run db:migrate
```

این دستور جدول‌ها را می‌سازد.

**۴. تولید Prisma Client**

```bash
npm run db:generate
```

**۵. بارگذاری داده اولیه**

```bash
npm run db:seed
```

بعد از seed، این حساب‌ها آماده‌اند:

| نقش | ایمیل | پسورد |
|-----|-------|-------|
| ادمین | admin@example.com | Admin123! |
| کاربر | user@example.com | User123! |

**۶. اجرا در محیط توسعه**

```bash
npm run dev
```

سرور روی `http://localhost:3000` بالا می‌آید.

---

## دستورات کامل

```bash
npm run dev          # اجرا با hot-reload
npm run build        # کامپایل TypeScript به dist/
npm run start        # اجرای نسخه کامپایل‌شده (production)
npm run db:migrate   # اجرای migration‌های جدید
npm run db:generate  # بازسازی Prisma Client
npm run db:push      # sync مستقیم schema (بدون migration — فقط توسعه)
npm run db:seed      # بارگذاری داده اولیه
npm run db:studio    # باز کردن Prisma Studio در مرورگر
```

---

## Health Check

```bash
curl http://localhost:3000/api/health
# { "status": "ok", "timestamp": "..." }
```

---

## افزودن ماژول جدید

برای اضافه کردن ماژول‌هایی مثل Proverbs، Idioms یا Grammar:

1. یک رکورد در جدول `learning_modules` اضافه کن
2. پوشه `src/modules/new-module/` بساز با همان ساختار لایه‌ای
3. Router را در `src/app.ts` mount کن

نیازی به تغییر در ساختار موجود نیست.
