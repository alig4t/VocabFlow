# Frontend — English Learning Platform

## تکنولوژی‌ها

| ابزار | نسخه | کاربرد |
|-------|------|--------|
| React | 18.3 | UI Framework |
| TypeScript | 5.6 | زبان اصلی |
| Vite | 5.4 | Build tool و dev server |
| Tailwind CSS | 3.4 | استایل‌دهی |
| shadcn/ui | — | کامپوننت‌های آماده (Radix UI) |
| TanStack Query | 5.62 | مدیریت state سرور و کش |
| React Router | 6.28 | مسیریابی |
| React Hook Form | 7.54 | مدیریت فرم‌ها |
| Zod | 3.23 | اعتبارسنجی فرم |
| Zustand | 5.0 | state سمت کلاینت (auth) |
| Axios | 1.7 | HTTP client |
| Capacitor | 6.2 | پوسته اپ اندروید (build نیتیو/آفلاین) |
| @capacitor-community/sqlite | 6.0 | دیتابیس محلی SQLite برای حالت آفلاین |

---

## ساختار پروژه

```
frontend/
├── public/
│   └── fonts/
│       ├── 7285anjoman.woff    # فونت انجمن (فارسی)
│       └── 7285anjoman.woff2
│
├── index.html
└── src/
    ├── main.tsx            # نقطه ورود — QueryClient + ReactDOM
    ├── App.tsx             # تعریف route‌ها و محافظت از صفحات
    ├── index.css           # متغیرهای تم + @font-face انجمن
    │
    ├── types/
    │   └── index.ts        # تایپ‌های مشترک (Word, User, ReviewMode, ...)
    │
    ├── config/
    │   └── api.ts          # آدرس endpoint‌های API
    │
    ├── lib/
    │   ├── utils.ts        # توابع کمکی (cn, formatDate, ...)
    │   ├── axios.ts        # instance با interceptor (auto refresh token)
    │   └── platform.ts     # isNative() — تشخیص اجرا روی وب یا نیتیو (Capacitor)
    │
    ├── store/
    │   └── authStore.ts    # Zustand store — user، توکن‌ها، isAuthenticated
    │
    ├── services/           # توابع خام HTTP (بدون React) — روی نیتیو به offline/ سوییچ می‌کنند
    │   ├── auth.service.ts
    │   ├── vocabulary.service.ts
    │   ├── progress.service.ts
    │   ├── synonym.service.ts
    │   ├── study.service.ts       # صف مطالعه‌ی امروز و ثبت پاسخ SM-2
    │   ├── plan.service.ts        # برنامه‌های یادگیری (کتابخانه)
    │   ├── settings.service.ts    # تنظیمات کاربر (جهت مرور، تعداد لغت روزانه، ...)
    │   ├── dashboard.service.ts   # داده‌ی داشبورد + watchlist و کتاب‌های پیشنهادی
    │   ├── book.service.ts        # کتاب‌ها/جلدها/درس‌ها
    │   └── user.service.ts        # فهرست کاربران (ادمین)
    │
    ├── hooks/              # React Query wrapper روی services
    │   ├── useAuth.ts
    │   ├── useVocabulary.ts
    │   ├── useProgress.ts
    │   ├── useStudy.ts
    │   ├── usePlans.ts
    │   ├── useSettings.ts
    │   ├── useDashboard.ts
    │   ├── useBooks.ts
    │   └── useUsers.ts
    │
    ├── offline/           # فقط build نیتیو — با dynamic import بارگذاری می‌شود (خارج از بندل وب)
    │   ├── db.ts          # اتصال به SQLite محلی (@capacitor-community/sqlite)
    │   ├── repo.ts        # لایه‌ی داده‌ی محلی (معادل services روی سرور)
    │   ├── srs.ts         # پیاده‌سازی الگوریتم SM-2 روی دستگاه
    │   ├── seed.ts        # پرکردن اولیه‌ی دیتابیس از داده‌ی همراه اپ
    │   └── bootstrap.ts   # آماده‌سازی نیتیو (prepareNative) در اولین اجرا
    │
    ├── components/
    │   ├── ui/             # کامپوننت‌های shadcn (Button, Card, Dialog, ...)
    │   ├── layout/         # Layout، Navbar، Sidebar، ThemeProvider
    │   ├── vocabulary/     # WordCard، ReviewCard، WordFilters
    │   └── admin/          # ExampleManager
    │
    └── pages/
        ├── auth/           # LoginPage، RegisterPage
        ├── dashboard/      # DashboardPage
        ├── library/        # LibraryPage
        ├── study/          # StudySessionPage
        ├── settings/       # SettingsPage
        ├── vocabulary/     # VocabularyPage، ReviewPage
        └── admin/          # AdminPage، UsersPage، WordFormPage، books/
```

---

## Route‌ها

| مسیر | کامپوننت | دسترسی |
|------|----------|--------|
| `/` | LandingPage (وب) / ریدایرکت به `/dashboard` (نیتیو) | عمومی |
| `/login` | LoginPage | عمومی |
| `/register` | RegisterPage | عمومی |
| `/dashboard` | DashboardPage | کاربر لاگین‌کرده |
| `/library` | LibraryPage | کاربر لاگین‌کرده |
| `/vocabulary` | VocabularyPage (فقط مرور — نشان وضعیت، بدون دکمه‌ی علامت‌گذاری) | کاربر لاگین‌کرده |
| `/vocabulary/review` | ReviewPage — «مرور آزاد» (مسیر دستی مجزا) | کاربر لاگین‌کرده |
| `/study` | StudySessionPage — «مطالعه‌ی امروز» (SM-2) | کاربر لاگین‌کرده |
| `/settings` | SettingsPage | کاربر لاگین‌کرده |
| `/admin` | AdminPage | فقط ADMIN |
| `/admin/users` | UsersPage | فقط ADMIN |
| `/admin/words/new` | WordFormPage | فقط ADMIN |
| `/admin/words/:id/edit` | WordFormPage | فقط ADMIN |
| `/admin/books` | BookListPage | فقط ADMIN |
| `/admin/books/new` | BookFormPage | فقط ADMIN |
| `/admin/books/:id/edit` | BookFormPage | فقط ADMIN |
| `/admin/books/:bookId/volumes` | VolumeManagerPage | فقط ADMIN |
| `/admin/books/:bookId/volumes/:volumeId/lessons` | LessonManagerPage | فقط ADMIN |

صفحاتی که نیاز به لاگین دارند با `ProtectedRoute` محافظت شده‌اند؛ کاربر بدون لاگین به `/login` هدایت می‌شود. مسیرهای `/admin/*` با `AdminRoute` محافظت شده‌اند و کاربر غیرادمین به `/dashboard` ریدایرکت می‌شود. صفحه‌ی `/` روی وب صفحه‌ی معرفی (LandingPage) را نشان می‌دهد و روی نیتیو مستقیم به `/dashboard` می‌رود.

> «مرور آزاد» (`/vocabulary/review`) و «مطالعه‌ی امروز» (`/study`) دو مسیر جدا هستند: مورد اول مرور دستی و آزاد لغت‌هاست و مورد دوم صف روزانه‌ی مبتنی بر الگوریتم SM-2 (لغت‌های سررسیدشده + لغت‌های جدید طبق برنامه).

---

## جریان احراز هویت

```
کاربر وارد می‌شود
    → authStore.setAuth(user, accessToken, refreshToken)
    → توکن‌ها در localStorage ذخیره می‌شوند

هر درخواست HTTP
    → interceptor هدر Authorization: Bearer {accessToken} را اضافه می‌کند

اگر سرور 401 برگرداند
    → interceptor به‌صورت خودکار refresh می‌زند
    → درخواست اصلی retry می‌شود
    → اگر refresh هم خطا داد، کاربر به /login هدایت می‌شود

خروج
    → authStore.clearAuth() → localStorage پاک می‌شود → ریدایرکت /login
```

---

## معماری دو-هدفه (وب و نیتیو)

همین یک کدبیس دو خروجی می‌سازد:

- **وب** — اپ متصل به سرور/API با لاگین (همان جریان احراز هویت بالا).
- **اندروید (نیتیو)** — اپ کاملاً آفلاین با پوسته‌ی Capacitor و دیتابیس محلی SQLite، **بدون لاگین**.

تشخیص محیط با تابع `isNative()` در `src/lib/platform.ts` (روی `Capacitor.isNativePlatform()`) انجام می‌شود. service‌ها بر اساس همین تابع شاخه‌بندی می‌کنند: روی وب از HTTP + سرور استفاده می‌کنند و روی نیتیو به لایه‌ی محلی داخل `src/offline/` سوییچ می‌شوند.

کد نیتیو (`db.ts`، `repo.ts`، `srs.ts`، `seed.ts`، `bootstrap.ts`) با **dynamic import** بارگذاری می‌شود تا از بندل وب خارج بماند. در اولین اجرای نیتیو، `prepareNative()` دیتابیس محلی SQLite را seed می‌کند و تا آماده‌شدن آن `SeedLoader` نمایش داده می‌شود (منطق در `App.tsx`).

> جزئیات کامل build و راه‌اندازی نیتیو در فایل `ANDROID.md` آمده است؛ اینجا تکرار نمی‌شود.

---

## مدیریت State

### State سرور — TanStack Query

تمام داده‌هایی که از API می‌آیند توسط TanStack Query کش می‌شوند:

```typescript
// query key‌ها
['words', filters]         // لیست لغات
['words', wordId]          // یک لغت
['modules']                // ماژول‌های آموزشی
['progress', 'stats']      // آمار پیشرفت
['auth', 'me']             // اطلاعات کاربر
['study', 'today']         // صف مطالعه‌ی امروز (SM-2)
['plans']                  // برنامه‌های یادگیری
['settings']               // تنظیمات کاربر
['dashboard']              // داده‌ی داشبورد
['discovery-books']        // کتاب‌های پیشنهادی
['watchlist', 'books']     // کتاب‌های watchlist
['books'] / ['books', id]  // کتاب‌ها (ادمین/کتابخانه)
['volumes', bookId]        // جلدهای یک کتاب
['lessons', bookId, volumeId] // درس‌های یک جلد
['users']                  // فهرست کاربران (ادمین)
```

بعد از mutation (تغییر وضعیت لغت، ویرایش کلمه و...)، query مرتبط invalidate می‌شود و داده‌ها به‌روز می‌شوند.

### State کلاینت — Zustand

فقط اطلاعات احراز هویت:

```typescript
authStore = {
  user: User | null,
  accessToken: string | null,
  refreshToken: string | null,
  isAuthenticated: boolean,
  setAuth(), clearAuth(), initAuth()
}
```

---

## فونت انجمن

فونت فارسی انجمن برای تمام متن‌های RTL/فارسی استفاده می‌شود.

```css
/* در index.css تعریف شده */
@font-face {
  font-family: 'Anjoman';
  src: url('/fonts/7285anjoman.woff2') format('woff2'),
       url('/fonts/7285anjoman.woff') format('woff');
  font-display: swap;
}
```

استفاده در کامپوننت‌ها:

```tsx
// با کلاس Tailwind
<p className="font-persian">متن فارسی</p>

// با کلاس RTL (direction + font با هم)
<div className="rtl">محتوای فارسی</div>

// با class مستقیم CSS
<span className="font-persian text-right">معنی فارسی</span>
```

### کلاس `font-ipa` برای آوانگاری IPA

برای نمایش آوانگاری فونتیک (IPA) از کلاس `font-ipa` استفاده می‌شود (در `index.css` تعریف شده). این کلاس عمداً از یک استک sans-serif استفاده می‌کند و نه `font-mono`؛ چون فونت monospace پیش‌فرض WebView اندروید (Roboto Mono) بیشتر گلیف‌های IPA را ندارد و آن‌ها را به‌صورت مربع خالی (tofu) نشان می‌دهد. استک انتخاب‌شده fallback‌هایی دارد که روی اندروید (Roboto / Noto Sans) و ویندوز (Segoe UI) گلیف‌های IPA را پوشش می‌دهند.

```tsx
<span className="font-ipa">/prəˌnʌnsiˈeɪʃən/</span>
```

---

## تم و Dark Mode

تم از طریق `ThemeProvider` مدیریت می‌شود. انتخاب کاربر در `localStorage` ذخیره می‌شود.

```tsx
const { theme, setTheme } = useTheme()
setTheme('dark')   // یا 'light' یا 'system'
```

متغیرهای CSS تم در `index.css` تعریف شده‌اند. کافیست کلاس `dark` روی `<html>` باشد تا تم تاریک فعال شود.

---

## راه‌اندازی

### پیش‌نیازها

- Node.js نسخه 20 یا بالاتر
- npm
- **Backend باید در حال اجرا باشد** روی `http://localhost:3000`

### مراحل

**۱. نصب وابستگی‌ها**

```bash
cd frontend
npm install
```

**۲. اجرا در محیط توسعه**

```bash
npm run dev
```

برنامه روی `http://localhost:5173` بالا می‌آید.

درخواست‌های `/api/*` به‌صورت خودکار توسط Vite proxy به `http://localhost:3000` فوروارد می‌شوند — نیازی به تنظیم CORS یا آدرس جداگانه نیست.

---

## دستورات کامل

```bash
npm run dev       # اجرا با hot-reload روی localhost:5173
npm run build     # build برای production در پوشه dist/
npm run preview   # پیش‌نمایش نسخه production
npm run lint      # بررسی کد با ESLint
```

---

## متغیرهای محیطی (اختیاری)

اگر backend روی آدرس دیگری باشد، فایل `.env.local` بسازید:

```env
VITE_API_URL=http://localhost:3000/api
```

در غیر این صورت از proxy پیش‌فرض Vite استفاده می‌شود.

---

## اجرای کامل پروژه (هر دو با هم)

```bash
# ترمینال ۱ — Backend
cd backend && npm run dev

# ترمینال ۲ — Frontend
cd frontend && npm run dev
```

سپس مرورگر را روی `http://localhost:5173` باز کنید.
