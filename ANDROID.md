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

امکانات آفلاین: مرور کتاب‌ها/واژگان با فیلتر، «بلدم/بلد نیستم/نخوانده»، صفحه‌ی مرور با تلفظ نیتیو، ویرایش لغت و مثال‌ها، واچ‌لیست، داشبورد با آمار واقعیِ محلی.

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

سرویس‌های شاخه‌دار: `vocabulary`, `progress`, `book` (سلکتورهای ساده)، `dashboard`, `synonym`.
**صفحات و کامپوننت‌های React دست‌نخورده‌اند** — فقط لایه‌ی سرویس عوض می‌شود.

### ۳.۲. لایه‌ی داده‌ی آفلاین (`src/offline/`)

| فایل | نقش |
|------|-----|
| `db.ts` | باز کردن اتصال SQLite + اسکیمای جداول (آینه‌ی مدل Prisma، ولی تک‌کاربره بدون `userId`) + هلپرهای `query/run` |
| `seed.ts` | seed اولیه از JSONها؛ منطق پارس مثل `backend/prisma/import-all.ts`؛ idempotent با فلگ `meta.seeded` |
| `repo.ts` | همه‌ی توابع کوئری (words+فیلترها، progress، books/volumes/lessons، watchlist، ویرایش لغت، داشبورد، synonyms) با **همان شکل خروجیِ** سرویس‌های HTTP |
| `bootstrap.ts` | `prepareNative()` — باز کردن DB و seed در اولین اجرا |

جداول SQLite: `books, volumes, lessons, words, word_examples, word_phrases, word_phrase_examples, progress (word_id, review_mode → status), watchlist, meta`.

### ۳.۳. seed اولیه

- فایل‌های کتاب در `frontend/public/seed/*.json` + `manifest.json` (لیست فایل‌ها) قرار دارند.
- هنگام `cap sync` این‌ها داخل assets اپ بسته‌بندی می‌شوند.
- در **اولین اجرا** `App.tsx` صفحه‌ی `SeedLoader` (نوار پیشرفت) را نشان می‌دهد و `seedIfNeeded()` همه‌ی JSONها را می‌خواند و ~۱۷هزار واژه را در SQLite درج می‌کند (در یک transaction). بعد از آن اپ کاملاً آفلاین است.

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
- **داشبورد:** آمار واقعی از progress محلی محاسبه می‌شود (`repo.getDashboard`)؛ روی وب هنوز mock است.
- **کاور کتاب‌ها:** از `public/books/` با نگاشت `COVER_BY_TITLE` در `repo.getDiscovery`.
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
| برای شروع دوباره‌ی seed | داده‌ی اپ را از تنظیمات گوشی پاک کن (فلگ `meta.seeded` ریست می‌شود). |

---

## ۸. نکات انتقال به سیستم دوم
فقط **سورس و پیکربندی** منتقل می‌شود، نه کش/بیلد اندروید. موارد نادیده‌گرفته‌شده هنگام sync:
`android/.gradle`, `android/build`, `android/app/build`, `android/app/src/main/assets/public` (تولیدی)، `node_modules`.
APK همیشه روی همین سیستم لینوکس ساخته می‌شود.
