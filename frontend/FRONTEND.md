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
    │   └── axios.ts        # instance با interceptor (auto refresh token)
    │
    ├── store/
    │   └── authStore.ts    # Zustand store — user، توکن‌ها، isAuthenticated
    │
    ├── services/           # توابع خام HTTP (بدون React)
    │   ├── auth.service.ts
    │   ├── vocabulary.service.ts
    │   ├── progress.service.ts
    │   └── synonym.service.ts
    │
    ├── hooks/              # React Query wrapper روی services
    │   ├── useAuth.ts
    │   ├── useVocabulary.ts
    │   └── useProgress.ts
    │
    ├── components/
    │   ├── ui/             # کامپوننت‌های shadcn (Button, Card, Dialog, ...)
    │   ├── layout/         # Layout، Navbar، Sidebar، ThemeProvider
    │   ├── vocabulary/     # WordCard، ReviewCard، WordFilters
    │   └── admin/          # ExampleManager
    │
    └── pages/
        ├── auth/           # LoginPage، RegisterPage
        ├── vocabulary/     # VocabularyPage، ReviewPage
        └── admin/          # AdminPage، WordFormPage
```

---

## Route‌ها

| مسیر | کامپوننت | دسترسی |
|------|----------|--------|
| `/login` | LoginPage | عمومی |
| `/register` | RegisterPage | عمومی |
| `/vocabulary` | VocabularyPage | کاربر لاگین‌کرده |
| `/vocabulary/review` | ReviewPage | کاربر لاگین‌کرده |
| `/admin` | AdminPage | فقط ADMIN |
| `/admin/words/new` | WordFormPage | فقط ADMIN |
| `/admin/words/:id/edit` | WordFormPage | فقط ADMIN |

صفحاتی که نیاز به لاگین دارند با `ProtectedRoute` محافظت شده‌اند. مسیر `/` به `/vocabulary` ریدایرکت می‌شود.

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

## مدیریت State

### State سرور — TanStack Query

تمام داده‌هایی که از API می‌آیند توسط TanStack Query کش می‌شوند:

```typescript
// query key‌ها
['words', filters]      // لیست لغات
['words', wordId]       // یک لغت
['modules']             // ماژول‌های آموزشی
['progress', 'stats']   // آمار پیشرفت
['auth', 'me']          // اطلاعات کاربر
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
