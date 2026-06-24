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
        └── synonyms/       # سیستم مترادف‌ها (قابل توسعه)
```

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
words                  ← لغات (متصل به learning_module)
word_examples          ← مثال‌های اضافه هر لغت
user_word_progress     ← وضعیت یادگیری: [user × word × mode] → status
synonym_groups         ← گروه‌بندی مترادف‌ها (زیربنا برای توسعه آینده)
```

کلید منحصربه‌فرد جدول progress:

```sql
UNIQUE (user_id, word_id, review_mode)
```

یعنی هر کاربر برای هر لغت، در هر حالت (EN→FA و FA→EN) یک وضعیت جداگانه دارد.

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

---

## احراز هویت

سیستم بر پایه دو توکن کار می‌کند:

- **Access Token** — عمر کوتاه (15 دقیقه)، در هدر `Authorization: Bearer` ارسال می‌شود
- **Refresh Token** — عمر بلند (7 روز)، در دیتابیس ذخیره می‌شود (یک‌بار مصرف)

هنگام refresh، توکن قدیمی حذف و یک جفت توکن جدید صادر می‌شود.

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
