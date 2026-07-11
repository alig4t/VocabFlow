# VocabFlow — نسخه‌ی اندروید آفلاین (وکب)

راهنمای معماری، تکنولوژی‌ها و ساخت/اجرای نسخه‌ی اندرویدِ **کاملاً آفلاین** اپلیکیشن VocabFlow.

> این پروژه **یک کدبیس** دارد که هم نسخه‌ی وب (سروری، با لاگین) و هم نسخه‌ی اندروید (آفلاین، بدون سرور) را می‌سازد. تفاوت دو نسخه فقط در **لایه‌ی داده** است که در زمان اجرا سوییچ می‌شود.

---

## ۱. نمای کلی

| ویژگی | نسخه‌ی وب | نسخه‌ی اندروید |
|-------|-----------|----------------|
| منبع داده | سرور (Express + PostgreSQL) از طریق HTTP | **SQLite محلی روی گوشی** |
| اینترنت | لازم است | **لازم نیست (کاملاً آفلاین)** |
| لاگین/ثبت‌نام | دارد | **ندارد** — هر نصب = کاربر محلی با دسترسی کامل |
| ادمین/مدیریت کاربران و کتاب‌ها | دارد | مخفی است (سروری) |
| ویرایش لغت | روی سرور | محلی روی گوشی |
| داده‌ی اولیه | دیتابیس سرور | seed از فایل‌های JSON داخل خود اپ |

امکانات آفلاین: مرور کتاب‌ها/واژگان با فیلتر، «بلدم/بلد نیستم/نخوانده»، صفحه‌ی مرور آزاد با تلفظ نیتیو، ویرایش لغت و مثال‌ها، واچ‌لیست، و داشبورد با آمار واقعیِ محلی. علاوه بر این‌ها، **سیستم یادگیری روزانه** به‌صورت کامل آفلاین اضافه شده است: «مطالعه امروز» با زمان‌بندی مرور فاصله‌دار **SM-2** (لغات جدید + مرورهای سررسیده)، **برنامه‌ی یادگیری** برای هر جلد (تعداد لغت جدید و هدف روزانه)، **تنظیمات** (جهت مطالعه، پخش خودکار صدا، نمایش فونتیک/مثال، ترتیب کارت‌ها)، و **استریک/هیت‌مپ فعالیت** روی داشبورد. توجه: «مرور آزاد» (علامت‌گذاری دستیِ بلدم/بلد نیستم) از برنامه‌ی SM-2 جداست و در ستون جداگانه‌ای نگهداری می‌شود.

---

## ۲. تکنولوژی‌ها

**اپلیکیشن (مشترک وب و اندروید)**
- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui، RTL فارسی، دارک‌مود
- TanStack Query (state سرور/داده)، Zustand (auth)
- react-router-dom v6

**پل نیتیو و آفلاین**
- **Capacitor 6.2.1** (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) — بسته‌بندی وب‌اپ داخل APK
- **`@capacitor-community/sqlite` 6.0.2** — پایگاه‌داده‌ی SQLite نیتیو
- **`@capacitor-community/text-to-speech` 5.1.0** — تلفظ نیتیو (نسخه‌ی سازگار با Capacitor 6)
- `@capacitor/app` 6.0.3

**تولچین اندروید**
- JDK **17** (برای Android Gradle Plugin 8.2.1)
- Gradle **8.10.2** (wrapper)، AGP 8.2.1
- Android SDK: `compileSdk/targetSdk = 35`، `minSdk = 22`
- appId: `ir.vocabflow.app`

---

## ۳. معماری

### ۳.۱. سوییچ لایه‌ی داده (وب ↔ آفلاین)

قلب معماری این تابع است:

```ts
// src/lib/platform.ts
import { Capacitor } from '@capacitor/core'
export function isNative(): boolean {
  return Capacitor.isNativePlatform()   // در APK: true — در مرورگر: false
}
```

هر سرویس بین HTTP (وب) و SQLite (اندروید) شاخه می‌زند. کد آفلاین با **import پویا** بارگذاری می‌شود تا در باندل وب نیاید:

```ts
// نمونه: src/services/vocabulary.service.ts
const off = () => import('@/offline/repo')

getWords(filters) {
  if (isNative()) return off().then((o) => o.getWords(filters))   // آفلاین
  return api.get(API_ENDPOINTS.words.list, { params }).then((r) => r.data)   // وب
}
```

سرویس‌های شاخه‌دار: `vocabulary`, `progress`, `book` (سلکتورهای ساده + `getVolumes`)، `dashboard`, `synonym`, `study` (مطالعه امروز/پاسخ/ثبت سشن)، `plan` (برنامه‌های یادگیری)، `settings`.
**صفحات و کامپوننت‌های React دست‌نخورده‌اند** — فقط لایه‌ی سرویس عوض می‌شود.

### ۳.۲. لایه‌ی داده‌ی آفلاین (`src/offline/`)

| فایل | نقش |
|------|-----|
| `db.ts` | باز کردن اتصال SQLite + اسکیمای جداول (آینه‌ی مدل Prisma، ولی تک‌کاربره بدون `userId`) + `migrateSchema()` (افزودن ستون‌های SM-2 به نصب‌های قدیمی) + هلپرهای `query/run` |
| `seed.ts` | seed اولیه از JSONها؛ منطق پارس مثل `backend/prisma/import-all.ts`؛ idempotent با فلگ `meta.seed_version` |
| `repo.ts` | همه‌ی توابع کوئری (words+فیلترها، progress، books/volumes/lessons، watchlist، ویرایش لغت، داشبورد، synonyms، مطالعه‌ی امروز/پاسخ/سشن، برنامه‌های یادگیری، تنظیمات) با **همان شکل خروجیِ** سرویس‌های HTTP |
| `srs.ts` | آینه‌ی نیتیو موتور SM-2 (مثل `backend/src/modules/study/srs.ts`) — تابع `schedule` و هلپرهای روز |
| `bootstrap.ts` | `prepareNative()` — باز کردن DB و seed در اولین اجرا |

جداول SQLite: `books, volumes, lessons, words, word_examples, word_phrases, word_phrase_examples, progress, watchlist, learning_plans, study_sessions, user_settings, meta`.

جدول `progress` (کلید `word_id, review_mode`) اکنون دو مسیرِ مستقل را نگه می‌دارد:
- `status` — وضعیت برنامه‌ی SM-2 (به‌همراه ستون‌های `manual_status` هم دارد، `repetitions, interval_days, ease_factor, review_count, correct_count, wrong_count, last_reviewed_at, next_review_at, introduced_at`).
- `manual_status` — علامت دستیِ «مرور آزاد» (بلدم/بلد نیستم/نخوانده)، جدا از SM-2.

جدول‌های تازه: `learning_plans` (برنامه‌ی هر جلد: `daily_new_words, daily_goal, is_active`)، `study_sessions` (یک ردیف برای هر سشنِ کامل‌شده؛ برای استریک/هیت‌مپ/دقت)، `user_settings` (تنظیماتِ تک‌ردیفی کاربر محلی).

> **مهاجرت اسکیمای نصب‌های قدیمی:** چون `CREATE TABLE IF NOT EXISTS` هرگز جدول موجود را تغییر نمی‌دهد، تابع `migrateSchema()` با `ALTER TABLE ... ADD COLUMN` ستون‌های `manual_status` و SM-2 را به `progress` قدیمی اضافه می‌کند (و علامت‌های دستیِ قبلی را از `status` به `manual_status` کپی می‌کند). ایندکس `idx_progress_due` **بعد از** این ADD COLUMN داخل همین تابع ساخته می‌شود.

### ۳.۳. seed اولیه

- فایل‌های کتاب در `frontend/public/seed/*.json` + `manifest.json` (لیست فایل‌ها) قرار دارند.
- هنگام `cap sync` این‌ها داخل assets اپ بسته‌بندی می‌شوند.
- در **اولین اجرا** `App.tsx` صفحه‌ی `SeedLoader` (نوار پیشرفت) را نشان می‌دهد و `seedIfNeeded()` همه‌ی JSONها را می‌خواند و ~۱۷هزار واژه را در SQLite درج می‌کند (در یک transaction). بعد از آن اپ کاملاً آفلاین است.
- idempotent با فلگ `meta.seed_version`؛ با بالا رفتن `SEED_VERSION` جدول‌های داده پاک و دوباره seed می‌شوند (تنظیمات/برنامه‌ها دست‌نخورده می‌مانند).

### ۳.۴. بدون لاگین

```ts
// src/store/authStore.ts — initAuth
if (isNative()) {
  set({ user: LOCAL_USER /* role: ADMIN */, isAuthenticated: true, isReady: true })
  return
}
```
روی نیتیو کاربرِ محلیِ ادمین ست می‌شود تا همه‌ی مسیرها (از جمله ویرایش لغت) باز باشند و صفحه‌ی لاگین نیاید. `App.tsx` هم مسیر `/` را روی نیتیو به `/dashboard` هدایت می‌کند.

### ۳.۵. تفاوت‌های UIِ نیتیو
- **سایدبار:** بخش مدیریت سروری (کاربران/کتاب‌ها/پنل) مخفی؛ فقط «افزودن لغت» می‌ماند.
- **داشبورد:** آمار واقعی از progress محلی محاسبه می‌شود (`repo.getDashboard`)؛ روی وب همان آمار واقعی از `/api/dashboard` می‌آید (دیگر mock نیست).
- **کاور کتاب‌ها:** از `public/books/` با نگاشت `COVER_BY_TITLE` در `repo.getDiscovery`.
- **کاور جلدها:** در دیالوگ برنامه‌ی یادگیری، `repo.getVolumes` کاورِ هر جلد را از `public/books/` با نگاشت `VOLUME_COVER_BY_TITLE` می‌سازد (`4000-v1..v6.webp` و `oxford-word-skills-basic/intermediate/advanced.webp`)؛ جلدهای تک‌جلدی به کاور کتاب برمی‌گردند.
- **فونتیک (IPA):** متن آوانگاری با کلاس `.font-ipa` رندر می‌شود (استک sans با Roboto/Noto Sans که گلیف‌های IPA را پوشش می‌دهند)، نه `font-mono`؛ چون Roboto Mono در وب‌ویو اندروید گلیف IPA ندارد و کاراکترها به‌صورت مربع خالی (▯) دیده می‌شدند. (`src/index.css`)
- **تلفظ:** روی نیتیو `TextToSpeech.speak` نیتیو، روی وب `speechSynthesis` مرورگر (`src/lib/pronounce.ts`).

---

## ۴. پیش‌نیازهای ساخت (روی همین سیستم لینوکس)

- **Node.js** ۱۸+ و npm
- **JDK 17** — مسیر: `/usr/lib/jvm/java-17-openjdk`
- **Android SDK** — متغیر `ANDROID_HOME` (مثلاً `~/Android/Sdk`) با پلتفرم `android-35` و build-tools 35
- Gradle نیازی به نصب دستی ندارد؛ wrapper نسخه‌ی 8.10.2 را از کش برمی‌دارد.

---

## ۵. ساخت APK

```bash
cd frontend

# ۱) نصب وابستگی‌ها (یک‌بار)
npm install

# ۲) بیلد وب‌اپ  (⚠ از vite مستقیم استفاده کن، نه `npm run build`)
npx vite build

# ۳) انتقال assets و پلاگین‌ها به پروژه‌ی اندروید
npx cap sync android

# ۴) ساخت APK دیباگ (با JDK 17)
cd android
JAVA_HOME=/usr/lib/jvm/java-17-openjdk ./gradlew assembleDebug
```

خروجی:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```
(در روت پروژه هم کپی شده: `VocabFlow-offline-debug.apk`)

> **چرا `npx vite build` و نه `npm run build`؟** اسکریپت `build` اول `tsc` را اجرا می‌کند و چند خطای تایپیِ قدیمیِ نسخه‌ی وب باعث توقف می‌شود. `vite build` (esbuild) این‌ها را نادیده می‌گیرد و APK را می‌سازد.

### نصب روی گوشی
فایل APK را به گوشی منتقل کن → «نصب از منابع ناشناس» را برای فایل‌منیجر/مرورگر فعال کن → نصب. (APK دیباگ با کلید دیباگِ خودکار امضا می‌شود و برای سایدلود کافی است.)

### چرخه‌ی رفرش بعد از تغییر کد
```bash
cd frontend && npx vite build && npx cap sync android \
  && cd android && JAVA_HOME=/usr/lib/jvm/java-17-openjdk ./gradlew assembleDebug
```

---

## ۶. تنظیمات کلیدی

- **`frontend/capacitor.config.ts`** — `appId: ir.vocabflow.app`، `webDir: dist`.
- **`android/gradle/wrapper/gradle-wrapper.properties`** — پین‌شده روی `gradle-8.10.2-all` (چون کش کامل دارد).
- **`android/variables.gradle`** — `compileSdkVersion/targetSdkVersion = 35`.
- **`android/app/src/main/AndroidManifest.xml`** — علاوه بر `INTERNET`، عنصر زیر برای تلفظ لازم است (اندروید ۱۱+ بدون آن موتور TTS را نمی‌بیند):
  ```xml
  <queries>
    <intent><action android:name="android.intent.action.TTS_SERVICE" /></intent>
  </queries>
  ```
- **آیکون‌ها** — از `public/logo/logo-1024.png` با ImageMagick در `android/app/src/main/res/mipmap-*` ساخته شده‌اند.

---

## ۷. عیب‌یابی

| مشکل | راه‌حل |
|------|--------|
| Gradle می‌خواهد دانلود کند و شبکه ندارد | مطمئن شو `distributionUrl` روی `gradle-8.10.2-all.zip` است (کش کامل دارد؛ `8.2.1` کشِ ناقص دارد). |
| خطای «SDK/platform not found» | `compileSdk` باید ۳۵ باشد (فقط `android-35` نصب است). |
| بیلد با JDK پیش‌فرض شکست می‌خورد | حتماً `JAVA_HOME=/usr/lib/jvm/java-17-openjdk` را ست کن (java پیش‌فرض PATH نسخه‌ی ۱۱ است). |
| تلفظ بی‌صداست | موتور TTS گوشی را در تنظیمات → «خروجی متن‌به‌گفتار» فعال کن (مثلاً Google TTS). عنصر `<queries>` باید در manifest باشد. |
| seed اولیه طول می‌کشد | طبیعی است (اولین اجرا ~۱۷هزار واژه را درج می‌کند)؛ فقط یک‌بار اتفاق می‌افتد. |
| برای شروع دوباره‌ی seed | داده‌ی اپ را از تنظیمات گوشی پاک کن (فلگ `meta.seed_version` ریست می‌شود). |
| کرش داشبورد با «no such column: next_review_at» روی نصب قدیمی | برطرف شده: ایندکس `idx_progress_due` حالا **داخل** `migrateSchema()` و **بعد از** افزوده‌شدنِ ستون `next_review_at` ساخته می‌شود. با اجرای بعدیِ اپ خودبه‌خود درست می‌شود (self-healing). |
| باز کردن دیالوگ برنامه‌ی یادگیریِ کتاب با خطای `t.map is not a function` | برطرف شده: `bookService.getVolumes()` شاخه‌ی `isNative()` نداشت و به API وب می‌خورد (که `index.html` برمی‌گرداند)؛ حالا `getVolumes` آفلاین در `repo.ts` اضافه شده. |
| فونتیک به‌صورت مربع خالی (▯) دیده می‌شود | برطرف شده: آوانگاری با کلاس `.font-ipa` رندر می‌شود، نه `font-mono` (Roboto Mono در وب‌ویو گلیف IPA ندارد). |

---

## ۸. نکات انتقال به سیستم دوم
فقط **سورس و پیکربندی** منتقل می‌شود، نه کش/بیلد اندروید. موارد نادیده‌گرفته‌شده هنگام sync:
`android/.gradle`, `android/build`, `android/app/build`, `android/app/src/main/assets/public` (تولیدی)، `node_modules`.
APK همیشه روی همین سیستم لینوکس ساخته می‌شود.
