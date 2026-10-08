# Frontend — VocabFlow (وب + اندروید)

> **وضعیت:** با کد تطبیق داده شد در 2026-10-04. یک کدبیس، دو خروجی: وب (متصل به API) و اندروید آفلاین
> (Capacitor + SQLite). جزئیات لایه‌ی آفلاین و بیلد اندروید → [`ANDROID.md`](ANDROID.md)؛ اعلان‌ها →
> [`NOTIFICATIONS.md`](NOTIFICATIONS.md)؛ API → [`BACKEND.md`](BACKEND.md).

## تکنولوژی‌ها

| ابزار | نسخه | کاربرد |
|-------|------|--------|
| React / React DOM | 18.3 | UI |
| TypeScript | 5.9.3 در lockfile؛ بازه‌ی manifest: `^5.6.3` (`strict`, `noUnusedLocals/Parameters`) | زبان |
| Vite | 5.4 | dev server و build |
| Tailwind CSS + shadcn/ui (Radix) | 3.4 | استایل و کامپوننت |
| TanStack Query | 5.62 | state داده (devtools در development فعال است؛ export بسته در production فقط `null` برمی‌گرداند) |
| Zustand | 5.0 | فقط auth |
| React Router | 6.28 | مسیریابی |
| React Hook Form + Zod | 7.54 / 3.23 | فرم‌ها |
| Axios | 1.7 | HTTP (فقط وب) |
| easy-speech | 2.4 | تلفظ روی وب |
| Capacitor | 6.2 + پلاگین‌های `sqlite`, `text-to-speech`, `local-notifications`, `status-bar`, `app` | پوسته‌ی اندروید |

ابزار کیفیت: `npm run format` / `format:check` (Prettier، بدون فایل config ⇒ پیش‌فرض‌ها). **`npm run lint` خراب است** — ESLint نصب نیست و config ندارد. بررسی واقعی: `npx tsc --noEmit` (در 2026-10-04 بدون خطا) و `npx vite build`.

---

## ساختار `src/`

```
main.tsx            StrictMode → QueryClientProvider (staleTime 5m, retry 1) → App
App.tsx             ThemeProvider → BrowserRouter → گیت‌ها → Suspense → Routes (همه‌ی صفحات lazy)
index.css           توکن‌های تم (:root / .dark / .study)، فونت‌ها، safe-area، .font-ipa
config/api.ts       API_BASE_URL (VITE_API_URL || '/api') + همه‌ی API_ENDPOINTS
lib/                platform (isNative)، axios، pronounce، notifications، safeArea، onboarding،
                    scroll، format، bookMeta، vocabFilters، word-examples، utils (cn)
store/authStore.ts  Zustand (بدون persist middleware — نوشتن دستی در localStorage)
services/           لایه‌ی داده؛ سوییچ وب/نیتیو اینجاست
hooks/              wrapperهای TanStack Query روی services
offline/            آینه‌ی SQLite بک‌اند (→ ANDROID.md)
types/index.ts      تایپ‌های مشترک
components/         ui/ (shadcn)، layout/، dashboard/، library/، study/، vocabulary/، admin/
pages/              پایین‌تر
```

---

## مسیرها (`App.tsx`)

| مسیر | صفحه | گارد |
|------|------|------|
| `/onboarding` | OnboardingPage (۳ اسلاید) | بدون گارد؛ اگر `onboardingCompleted` ست باشد → `/dashboard` |
| `/` | وب: LandingPage — نیتیو: → `/onboarding` یا `/dashboard` | بدون گارد |
| `/login`، `/register` | LoginPage، RegisterPage | PublicRoute |
| `/dashboard` | DashboardPage | ProtectedRoute |
| `/statistics` | StatisticsPage (از `review_events`) | ProtectedRoute |
| `/hard-words` | HardWordsPage | ProtectedRoute |
| `/library`، `/library/:bookId` | LibraryPage، BookDetailPage (شروع plan) | ProtectedRoute |
| `/vocabulary` | VocabularyPage — مرور فهرست، فقط نمایش badge وضعیت دستی | ProtectedRoute |
| `/vocabulary/review` | ReviewPage — **«مرور آزاد»**، مسیر دستی (`manual_status`) | ProtectedRoute |
| `/study` | StudySessionPage — **«مطالعه‌ی امروز»** (SM-2) | ProtectedRoute |
| `/review-today` | ReviewTodayPage — مرور آزادِ لغات امروز (`/study/today-new`) | ProtectedRoute |
| `/review-hard-today` | ReviewHardTodayPage — تمرین واژه‌های سخت امروز، فقط پس از تکمیل صف روزانه (`/study/today-hard`) | ProtectedRoute |
| `/settings` | SettingsPage (تنظیمات، planها، یادآورها روی نیتیو) | ProtectedRoute |
| `/guide`، `/about` | GuidePage، AboutPage | ProtectedRoute |
| `/admin`، `/admin/users`، `/admin/words/new`، `/admin/words/:id/edit`، `/admin/books`، `/admin/books/new`، `/admin/books/:id/edit`، `/admin/books/:bookId/volumes`، `/admin/books/:bookId/volumes/:volumeId/lessons` | صفحات ادمین | AdminRoute |
| `*` | → `/` | — |

> «مرور آزاد» (`/vocabulary/review`) و «مطالعه‌ی امروز» (`/study`) دو مسیر مستقل‌اند و نباید یکی شوند: اولی `manual_status` را می‌نویسد، دومی `status` + SM-2 را.

**گیت‌های راه‌اندازی:** `initAuth()` → تا `isReady` فقط PageLoader؛ روی نیتیو تا `dbReady` صفحه‌ی SeedLoader (`prepareNative()` = باز کردن DB + seed). اگر seed شکست بخورد خطا لاگ می‌شود و `dbReady` باز هم true می‌شود. روی نیتیو بعد از آماده شدن: `syncSafeAreaVars`، `initNotifications` و listener `appStateChange` (بازسازی یادآورها + safe-area).

---

## سوییچ وب ↔ نیتیو (مهم‌ترین قرارداد)

`isNative()` در `lib/platform.ts` = `Capacitor.isNativePlatform()`. الگو در هر سرویس:

```ts
const off = () => import('@/offline/repo')
getToday() {
  if (isNative()) return off().then((o) => o.getStudyToday())
  return api.get(API_ENDPOINTS.study.today).then((r) => r.data)
}
```

پوشش واقعی (تأییدشده 2026-10-04):
- **همه‌ی متدها شاخه دارند:** `study`، `plan`، `settings`، `progress`، `synonym`، `vocabulary`، `dashboard` (`getStats` → `getLearningStats`).
- **فقط وب (بدون شاخه):** `auth.service`، `user.service`، و ۱۲ متد از ۱۶ متدِ `book.service` (CRUD کتاب/جلد/درس، `getBooks`، `getBook`، `getLessons`). فقط `getBooksSimple`، `getVolumes`، `getVolumesSimple`، `getLessonsSimple` شاخه دارند.
- متدهای فقط‌وب روی نیتیو خطا نمی‌دهند؛ به axios و `/api/...` روی origin وب‌ویو می‌روند. صفحات ادمینِ کتاب‌ها روی نیتیو با URL قابل دسترسی‌اند (کاربر محلی ADMIN است) ولی سایدبار آن‌ها را مخفی می‌کند.
- ⚠ «import پویا SQLite را از باندل وب بیرون نگه می‌دارد» فقط برای `repo.ts` درست است. `App.tsx` به‌صورت **ایستا** `offline/bootstrap` را import می‌کند ← `seed` ← `db` (`@capacitor-community/sqlite`) و `seed-crypto`؛ پس باندل وب هم SQLite و `VITE_SEED_SECRET` را دارد.

هر قابلیت داده‌ای جدید باید در **هر دو** سمت پیاده شود (API + `offline/repo.ts`).

---

## HTTP و احراز هویت (فقط وب)

- `lib/axios.ts`: هدر `Authorization: Bearer <accessToken>`؛ interceptor پاسخ، `.data` را باز می‌کند ⇒ سرویس‌ها payload را مستقیم می‌گیرند (برای `/words`: `{ data, meta }`).
- روی 401: refresh تک‌پرواز با صف درخواست‌ها → retry؛ اگر refresh token نباشد یا refresh شکست بخورد → `clearAuth()` + ریدایرکت سخت به `/login`.
- `authStore`: `user`، `accessToken`، `refreshToken`، `isAuthenticated`، `isReady` + `setAuth`/`clearAuth`/`initAuth`. کلیدهای localStorage: `accessToken`، `refreshToken`، `authUser`.
- روی نیتیو `initAuth` کاربر محلی `LOCAL_USER` (id `local`، نقش **ADMIN**، توکن `"offline"`) را ست می‌کند؛ لاگین وجود ندارد.
- خروج در Navbar فقط `clearAuth()` می‌کند؛ `useLogout` استفاده نمی‌شود، پس refresh token روی سرور باطل نمی‌شود.
- همه‌ی مسیرهای API در `config/api.ts` هستند؛ رشته‌ی URL را inline ننویس.

---

## داده و state

Query keyها: `['words', filters]`، `['words', id]`، `['modules']`، `['progress','stats']`، `['auth','me']`، `['books']`، `['books','simple']`، `['books', id]`، `['volumes', bookId(, 'simple')]`، `['lessons', bookId, volumeId(, 'simple')]`، `['dashboard']`، `['dashboard','hard-words']`، `['stats']`، `['discovery-books']`، `['watchlist','books']`، `['plans']`، `['settings']`، `['study','today']`، `['study','today-new']`، `['study','today-hard']`، `['users']`.

- mutationهای plan هفت key را invalidate می‌کنند (`usePlans.ts`)، از جمله هر دو تمرین امروز؛ toggle واچ‌لیست optimistic با rollback است؛ تغییر settings کش را مستقیم می‌نویسد و خانواده‌ی `study` و `dashboard` را invalidate می‌کند؛ hookهای study `staleTime: 0`.
- قرارداد: کامپوننت‌ها از hookها استفاده کنند. **استثناهای موجود** (عمداً دست نخورده): `StudySessionPage` (`studyService.answer` و `recordSession` + invalidate دستی)، `WordFormPage` (`vocabularyService.addExample`)، `WordCard` (`synonymService.getSynonyms` — hook مترادف وجود ندارد).

### ReviewPage (`/vocabulary/review`)
- جلسه روی یک **snapshot منجمد** از لغات اجرا می‌شود (کلید: حالت|فیلتر|کتاب|جلد|درس)؛ علامت‌گذاری وضعیت را درجا عوض می‌کند ولی کارت را از جلسه حذف نمی‌کند (شمارنده یک قدم در هر عمل جلو می‌رود).
- انتخاب کتاب محدود به `useWatchlistBooks` (یعنی planهای فعال) است.
- کیبورد: `←`/`→` جابجایی، `Space` چرخاندن، `↑` بلدم، `↓` بلد نیستم، `P` تلفظ.
- localStorage: `vocab_review_mode`، `vocab_review_muted`، `vocab_review_filter`، `vocab_review_scope`.

### StudySessionPage (`/study`)
پاسخ‌ها: بلدم (EASY)، سخت (HARD)، بلد نیستم (AGAIN — کارت دوباره در صف همین جلسه قرار می‌گیرد)، رد (SKIP — فقط رد می‌شود: نه زمان‌بندی، نه requeue، نه ثبت در سرور). لغت جدید در **اولین** نمایش به‌جای دکمه‌های معمول نوار «خواندم/رد» دارد؛ «خواندم» دقیقاً مثل AGAIN رفتار می‌کند. پاسخ‌ها حین مطالعه غیرمسدودکننده ثبت می‌شوند؛ پایان جلسه پیش از ثبت خلاصه و تازه‌سازی داده‌ی تمرین، منتظر پاسخ‌های در حال ذخیره می‌ماند. جلسه snapshot منجمد دارد؛ در پایان `SessionSummaryScreen` و ثبت جلسه، و روی نیتیو بازسازی یادآورها.

### تمرین امروز و واژه‌های سخت (`/review-today` و `/review-hard-today`)

- کارت `TodayPracticeCard` گزینه‌های تمرین را از متادیتای صف روزانه می‌سازد: پیش از پایان مطالعه، هر دو گزینه‌ی واژه‌های جدید و سخت با ظاهر قفل‌شده نمایش داده می‌شوند؛ اگر امروز واژه‌ی جدیدی در صف یا خوانده‌شده نباشد، فقط گزینه‌ی سخت قفل‌شده می‌ماند. پس از خالی‌شدن هر دو صف، گزینه‌ی جدید با `introducedToday > 0` و گزینه‌ی سخت با `hardTodayCount > 0` باز می‌شوند. در خلاصه‌ی جلسه، دکمه‌ی outline «تمرین واژه‌های سخت» جایگزین «مطالعه‌ی دوباره» شده و تا پایان ذخیره/تازه‌سازی صف یا در نبود واژه‌ی سخت غیرفعال است؛ کادر توضیح و میان‌بر جداگانه حذف شده‌اند. ردکردن کارت‌ها به‌تنهایی شرط تکمیل صف را برآورده نمی‌کند.
- هر دو صفحه از `ReviewTodayPage` و `ReviewCard` استفاده می‌کنند؛ نوع سخت با hook `useTodayHardWords` و کلید `['study','today-hard']` خوانده می‌شود. پاسخ `available=false` حتی هنگام ورود مستقیم به مسیر، کاربر را به ادامه‌ی مطالعه هدایت می‌کند. حالت خطا، فهرست خالی، شمارنده، پایان تمرین و شروع دوباره پوشش داده شده‌اند؛ فهرست کارت‌ها در طول تمرین ثابت می‌ماند.
- هر دو تمرین از نوار یکسان `ReviewActions` («نگرفتم/رد/گرفتم» همراه با قبلی/بعدی) استفاده می‌کنند. «گرفتم/نگرفتم» فقط `manual_status` را در جهت نمایش فعلی ثبت می‌کنند؛ «رد» و جابجایی هیچ نوشتنی ندارند و هیچ‌کدام زمان‌بندی SM-2، تاریخچه یا آمار جلسه‌ی روزانه را تغییر نمی‌دهند. شمارنده‌های دستی و دکمه‌های پایان تمرین هم مشترک‌اند. کیبورد در هر دو: `→` قبلی، `←` بعدی، `Space` نمایش معنی، `↑` گرفتم، `↓` نگرفتم، `P` تلفظ.
- پس از مطالعه و تغییر جهت تنظیمات، خانواده‌ی queryهای `['study']` invalidate می‌شود؛ سرویس داده در هر دو پلتفرم شاخه دارد. قواعد انتخاب واژه‌ها و مرز روز در [`BACKEND.md`](BACKEND.md) آمده است.

---

## UI، تم و RTL

- **تم‌ها:** `ThemeProvider` (کلید localStorage `eng-theme`، پیش‌فرض `system`) یکی از کلاس‌های `light`/`dark`/`study` را روی `<html>` می‌گذارد؛ توکن‌ها متغیرهای HSL در `index.css` هستند: `:root` (روشن)، `.dark`، `.study` (سپیا). Tailwind: `darkMode: ['class']`.
- **برند:** رنگ‌های لوگو navy `#18243C` + طلایی `#E4A824`. در توکن‌ها به‌صورت HSL پیاده شده‌اند (`--primary` طلایی؛ مقدار دقیق hex نیست). سبزِ وضعیت KNOWN و قرمزِ destructive عمداً حفظ شده‌اند؛ accent سایدبارِ ادمین slate است. لوگوهای `public/logo/` شفافیت ندارند ⇒ روی سطح تیره داخل یک chip روشن.
- **RTL:** `index.html` دارای `<html lang="fa" dir="ltr">` است؛ RTL **per-element** با `dir="rtl"` (حدود ۴۵ فایل، مثلاً `Layout.tsx`) یا کلاس `.rtl` اعمال می‌شود. ورودی‌های انگلیسی LTR بمانند.
- **فونت‌ها:** `font-persian` = Anjoman (`/fonts/7285anjoman.woff2|woff`)؛ فونت محلی woff2 در `index.html` preload می‌شود. AnjomanMax برای bold است. درخواست stylesheet خارجی Interِ بلااستفاده حذف شد چون در حالت آفلاین می‌توانست اولین paint را تا timeout شبکه عقب بیندازد. `@font-face`های Vazirmatn در `index.css` به مسیر ناموجود اشاره دارند و استفاده نمی‌شوند. آوانگاری IPA با `.font-ipa` (نه `font-mono` — Roboto Mono در وب‌ویو اندروید گلیف IPA ندارد).
- **Safe area (نیتیو، edge-to-edge با targetSdk 35):** پلاگین بومی `SafeAreaPlugin` (`android/.../SafeAreaPlugin.java`) → `lib/safeArea.ts` متغیرهای `--safe-top-px`/`--safe-bottom-px` را می‌گذارد (مقدار = هم‌پوشانی واقعی نوار با WebView، نه ارتفاع خام نوار؛ روی اندروید ≤۱۴ نوار ناوبری پایین ۰ است. پلاگین هر تغییر را با رویداد `insetsChange` هم می‌فرستد)؛ `--safe-top`/`--safe-bottom` = `max(env(), px)` در `index.css`؛ مصرف در Navbar، Sidebar، BottomNav، toast. ارتفاع BottomNav `calc(4rem+var(--safe-bottom))` است (با `border-box`، padding از `h-16` کم می‌شد و تب‌ها زیر دکمه‌های سیستم می‌رفتند). `StatusBarSync` نوار وضعیت را overlay شفاف با استایل آیکون متناسب با تم می‌کند.
- **تلفظ** (`lib/pronounce.ts`): اول `word.pronunciationAudio` اگر باشد؛ نیتیو مستقیم پلاگین TTS با `lang: 'en'` (نه `en-US`) و ۶ تلاش با فاصله‌ی ۳۰۰ms؛ وب easy-speech و در نهایت `speechSynthesis`. هیچ صدای آنلاینی استفاده نمی‌شود.
- Toast: `toast({ title, description, variant })`؛ آپلود کاور کتاب/جلد: FileReader → data URL base64 مستقیم در DB.
- ادمین: دکمه‌ی «افزودن لغت» در `LessonManagerPage` به `/admin/words/new?bookId=&volumeId=&lessonId=` می‌رود؛ `WordFormPage` این پارامترها را می‌خواند، بنر قفل‌شده‌ی کتاب/جلد/درس نشان می‌دهد و `lessonId` را در payload می‌فرستد.

---

## راه‌اندازی و دستورات

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 — proxy: /api → http://localhost:3000 (بک‌اند باید بالا باشد)
npm run build          # tsc && vite build → dist/
npm run preview
npm run format         # prettier --write روی src
npm run format:check
npm run seed:encrypt   # seed-src → public/seed-enc (نیازمند VITE_SEED_SECRET؛ → ANDROID.md)
npx tsc --noEmit       # بررسی تایپ
```

متغیرهای محیطی (`frontend/.env`، در git نیست): `VITE_SEED_SECRET` (برای seed اندروید)؛ اختیاری `VITE_API_URL` (پیش‌فرض `/api`).
