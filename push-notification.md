# VocabFlow — سیستم اعلان‌ها (Push / Local Notifications)

راهنمای کامل معماری، منطق، و جزئیات فنیِ سیستم یادآورِ مطالعه در نسخه‌ی **اندروید آفلاین** VocabFlow.
مکملِ [`ANDROID.md`](ANDROID.md) و [`PROJECT_TECH_REFERENCE.md`](PROJECT_TECH_REFERENCE.md).

> **خلاصه‌ی یک‌خطی:** چون نسخه‌ی اندروید کاملاً آفلاین است و **سرور ندارد**، اعلان‌ها به‌صورت
> **Local Notification زمان‌بندی‌شده روی خود گوشی** پیاده شده‌اند (نه Push سروری). منطقِ «چه‌وقت و چه پیامی»
> روی دستگاه و از روی دیتابیس محلیِ SQLite محاسبه می‌شود.

---

## ۱. هدف

طبق `notif.txt`: افزایش استمرار یادگیری و ساختِ عادت مطالعه‌ی روزانه، بدون آزار کاربر.
اعلان مثل یک «مربی یادگیری» عمل می‌کند: کاربر را سرِ وقتِ درست برمی‌گرداند، ولی اگر امروز مطالعه کرده یا کاری برای انجام نیست، **ساکت می‌ماند**.

---

## ۲. چالش معماری و راه‌حل

| | نسخه‌ی وب | نسخه‌ی اندروید (این پیاده‌سازی) |
|---|---|---|
| سرور/کرون‌جاب | دارد | **ندارد** |
| مکانیزم ارسال | Web Push / job سروری | **Local Notification روی دستگاه** |
| منبع وضعیت مطالعه | Postgres (per user) | **SQLite محلی** (`offline/repo.ts`) |

چون هیچ سروری وجود ندارد و ما نمی‌توانیم «در لحظه‌ی فایرشدن» منطق اجرا کنیم، از الگوی زیر استفاده شد:

### الگوی «Reschedule-on-open» (قلبِ سیستم)
> برنامه‌ی اعلان‌ها **هر بار از صفر بازسازی می‌شود** و یک افقِ ۷ روزه جلو زمان‌بندی می‌گردد.

بازسازی در سه لحظه رخ می‌دهد:
1. **باز شدن اپ** (بعد از آماده‌شدن DB) — `initNotifications()`
2. **برگشت اپ به فورگراند** — لیسنر `appStateChange`
3. **بعد از پایان جلسه‌ی مطالعه** — در `StudySessionPage`

**چرا این الگو درست است؟** چون کاربر **بدون باز کردن اپ نمی‌تواند مطالعه کند**، و هر باز کردن اپ برنامه را ریست می‌کند.
پس قاعده‌ی spec یعنی «به کسی که امروز مطالعه کرده یادآوری نفرست» به‌طور خودکار برقرار می‌شود: بعد از جلسه‌ی کامل‌شده،
بازسازیِ تازه صرفاً یادآورِ امشب را حذف می‌کند.

افقِ ۷ روزه باعث می‌شود کاربرِ غایب هم هر روز نادج بگیرد و لحن پیام **بعد از ۳ روز غیبت** به «عقب‌افتاده» تغییر کند.

---

## ۳. منطق دقیق: چه‌وقت پیام می‌رود و چه پیامی؟

### گیتِ اصلی
اگر `dailyReminderEnabled === false` → همه‌ی اعلان‌ها کنسل، هیچ‌چیز ارسال نمی‌شود.

### شرط «امروز» (روز ۰، ساعت پیش‌فرض ۲۰:۰۰)
پیامِ امروز فقط وقتی ست می‌شود که **هر سه** برقرار باشند:
1. ساعت یادآوری هنوز نگذشته باشد (`at > now`)
2. **امروز مطالعه نشده باشد** (`studiedToday === false`)
3. **کاری موجود باشد**: `dueCount + newCount > 0`

اگر امروز مطالعه شده، یا هیچ مرور/لغت جدیدی نیست → **هیچ پیامی نمی‌رود** (دقیقاً طبق فلوچارت spec).

### شرط روزهای آینده (روز ۱ تا ۶)
فقط اگر `hasPlans === true` (برنامه‌ی یادگیریِ فعال وجود دارد) زمان‌بندی می‌شوند.

### انتخاب نوع پیام (`kindForDay`) — به‌ترتیب اولویت
| شرط | نوع | تیکِ کنترل‌کننده |
|---|---|---|
| روز ≥ ۳ (غیبت طولانی) | `overdue` | `notifyOverdue` |
| روز ۰ و `streak > 0` | `streak` | `notifyStreak` |
| در غیر این صورت | `daily` | `notifyDailyStudy` |

اگر تیکِ نوعِ انتخاب‌شده خاموش باشد → fallback به `daily`؛ اگر آن هم خاموش باشد → آن روز رد می‌شود.

### متنِ پیام‌ها (`messageFor`) — فارسی، ارقام فارسی از `faNum`

**`daily` — امروز، هم مرور هم لغت جدید:**
> 🔥 جلسه‌ی امروزت آماده‌ست
> مرورها و لغت‌های جدید منتظرتن.

**`daily` — امروز، فقط مرور:**
> 📚 مرور امروزت آماده‌ست
> ‪N‬ لغت منتظر مرورن.

**`daily` — امروز، فقط لغت جدید:**
> ✨ لغت‌های جدید امروز
> ‪N‬ لغت جدید برای یادگیری داری. چند دقیقه وقت بذار.

**`daily` — روزهای آینده (شمارش نامعلوم، متن عمومی):**
> 📚 وقت مروره
> چند دقیقه برای مرور امروزت وقت بذار.

**`streak` — روز ۰، استریک فعال:**
> 🔥 امروز آخرین فرصت برای حفظ استریک ‪N‬ روزه‌ته
> یه مرور کوتاه انجام بده تا زنجیره‌ی یادگیری‌ت نشکنه.

**`overdue` — از روز ۳ غیبت به بعد:**
> 🔥 چند روزه ندیدیمت
> لغت‌هات منتظر مرورن؛ چند دقیقه وقت بذار و به مسیر یادگیری برگرد.

> **تعریفِ «مطالعه کردن»:** وجود یک ردیف در جدول `study_sessions` برای امروز (جلسه‌ی SM-2 «مطالعه امروز»).
> «مرور آزاد» (بلدم/بلد نیستم) جزو این حساب **نیست** — چون در `manual_status` و بدون session نگهداری می‌شود.

---

## ۴. تکنولوژی و ثابت‌ها

- پلاگین: **`@capacitor/local-notifications` ^6.1.3** (سازگار با Capacitor 6)
- Channel اندروید: `vocabflow-reminders` (importance = 4 / HIGH)
- ثابت‌ها در `src/lib/notifications.ts`:
  - `HORIZON_DAYS = 7` — تعداد روزهای زمان‌بندی جلوتر
  - `OVERDUE_AFTER_DAYS = 3` — آستانه‌ی تغییر لحن به «عقب‌افتاده»
  - `BASE_ID = 4200` — بازه‌ی id اعلان‌ها: `4200 .. 4206` (کنسل قطعی)
- زمان‌بندی با `schedule: { at, allowWhileIdle: true }` → فایرِ دقیق حتی در Doze.

---

## ۵. فایل‌های تغییر‌یافته/جدید

| فایل | تغییر |
|------|-------|
| `src/lib/notifications.ts` | **جدید** — کل موتور: `planReminders`, `messageFor`, `kindForDay`, `rescheduleNotifications`, `initNotifications`, `ensureNotificationPermission` |
| `src/offline/repo.ts` | `getNotificationStatus()` (studiedToday/due/new/streak/hasPlans) + خواندن/نوشتنِ فیلدهای جدیدِ settings |
| `src/offline/db.ts` | ۵ ستون جدید در `user_settings` + هلپرِ عمومی `addMissingColumns()` برای مهاجرت (self-healing نصب‌های قدیمی) |
| `src/types/index.ts` | فیلدهای اعلانِ `UserSettings` (اختیاری) + اینترفیس `NotificationStatus` |
| `src/App.tsx` | init هنگام لانچ + reschedule روی `appStateChange` |
| `src/pages/study/StudySessionPage.tsx` | reschedule بعد از ثبت جلسه (حذف یادآورِ امشب) |
| `src/pages/settings/SettingsPage.tsx` | کارتِ **«یادآورها»** (فقط `isNative()`): سوییچ اصلی، انتخاب ساعت، ۳ تیکِ نوع |
| `android/app/src/main/AndroidManifest.xml` | `SCHEDULE_EXACT_ALARM` + `USE_EXACT_ALARM` |
| `package.json` | افزودن `@capacitor/local-notifications@^6.1.3` |

---

## ۶. اسکیمای دیتابیس و تنظیمات

### ستون‌های جدید `user_settings` (تک‌ردیفی، `id='local'`)
| ستون | پیش‌فرض | نگاشتِ `UserSettings` |
|------|---------|----------------------|
| `daily_reminder_enabled` | `1` | `dailyReminderEnabled` |
| `daily_reminder_time` | `'20:00'` | `dailyReminderTime` |
| `notify_daily_study` | `1` | `notifyDailyStudy` |
| `notify_overdue` | `1` | `notifyOverdue` |
| `notify_streak` | `1` | `notifyStreak` |

### مهاجرت نصب‌های قدیمی
تابع `migrateSchema()` در `db.ts` حالا از هلپرِ عمومیِ `addMissingColumns(db, table, cols)` استفاده می‌کند و
همان الگوی `progress` را برای `user_settings` هم اجرا می‌کند (`ALTER TABLE ... ADD COLUMN`). نصب‌های قبلی
با اجرای بعدیِ اپ خودبه‌خود این ستون‌ها را می‌گیرند (self-healing) و seed دوباره لازم نیست.

> نکته‌ی سازگاریِ وب: فیلدهای اعلان در تایپ `UserSettings` **اختیاری (`?`)** هستند تا نسخه‌ی وب (که این ستون‌ها را
> ندارد) نشکند. UIِ اعلان‌ها هم پشتِ `isNative()` گِیت شده و در وب اصلاً رندر نمی‌شود.

---

## ۷. مجوزها و مانیفست

پلاگین خودش این‌ها را merge می‌کند: `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` + سه Receiver
(از جمله `LocalNotificationRestoreReceiver` که یادآورها را **بعد از ری‌بوت بازمی‌سازد**).

ما دستی به `AndroidManifest.xml` اضافه کردیم:
```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```
دلیل: چون از `allowWhileIdle: true` استفاده می‌کنیم، برای فایرِ دقیق روی اندروید ۱۲+ به این مجوز نیاز است
(auto-granted و revocable؛ برای سایدلود مشکلی ندارد).

**مجوزهای merge‌شده‌ی نهایی (تأییدشده):** `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`,
`RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`.

---

## ۸. ساخت و تست

```bash
cd frontend
npm install                 # پلاگین جدید نصب می‌شود
npx vite build              # ⚠ مستقیم vite، نه npm run build
npx cap sync android        # ثبت پلاگین + merge مانیفست
cd android && JAVA_HOME=/usr/lib/jvm/java-17-openjdk ./gradlew assembleDebug
```
خروجی: `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (کپی در روت: `VocabFlow-offline-debug.apk`).

### وضعیت فعلی (این سشن)
- ✅ `tsc --noEmit`: صفر خطا در کل پروژه
- ✅ `vite build` + `cap sync` موفق (پلاگین ثبت شد)
- ✅ **APK ساخته شد** با JDK 17؛ مانیفست merge‌شده مجوزها و Receiverِ boot را دارد
- ✅ فایل‌ها به سیستم دوم (`192.168.2.115:D:/project/VocabFlow`) mirror شد (byte-size match)

### تستِ روی دستگاه (هنوز انجام‌نشده — نیاز به گوشی)
1. نصب APK و اجرا؛ اولین بار اجازه‌ی اعلان را بده.
2. در تنظیمات → «یادآورها» ساعت را روی ۱–۲ دقیقه بعد بگذار.
3. اپ را ببند و منتظر بمان تا اعلان فایر شود.
4. سناریوها: (الف) مطالعه‌ی امروز کامل → نباید یادآور بیاید؛ (ب) بدون مطالعه با مرور/لغت جدید → باید بیاید.

---

## ۹. کارهای باقی‌مانده / ایده‌های آینده (برای سشنِ بعدی)

### تست و صحت‌سنجی
- [ ] **تست واقعیِ روی دستگاه** (تنها موردی که این سشن نتوانست verify کند) — فایرشدن، لحن‌ها، سناریوی «مطالعه‌کرده».
- [ ] بررسی رفتار روی OEMهای سخت‌گیر (Xiaomi/Samsung battery-optimization) که ممکن است alarm را بکشند؛ شاید نیاز به راهنمای «Auto-start / حذف بهینه‌سازی باتری».

### بهبود UX (پیشنهادِ همین سشن)
- [ ] **دکمه‌ی «ارسال یادآور آزمایشی»** در تنظیمات (schedule با `at = now + 5s`) تا کاربر بدون صبر تا ۲۰:۰۰ تست کند.
- [ ] نادجِ کوچک «اعلان‌ها را روشن کن» روی داشبورد وقتی permission داده نشده.
- [ ] **Deep-link**: با تپ روی اعلان مستقیم به `/study` برود (`extra` + هندلِ `localNotificationActionPerformed`).

### گسترش (طبق بخش Scalable Architecture در spec)
- [ ] یادآور بر اساس «ساعت معمول مطالعه‌ی کاربر» (از `study_sessions.started_at` یاد بگیرد).
- [ ] اعلان هنگام کامل‌شدن یک درس/بخش از کتاب.
- [ ] اعلان‌های انگیزشی مبتنی بر پیشرفت (مثلاً «به X لغت رسیدی»).
- [ ] چند یادآور در روز (صبح/عصر) به‌صورت اختیاری.

### دِبت فنی/دقت
- [ ] `getNotificationStatus()` الان `getStudyToday()` کامل را صدا می‌زند (سنگین‌تر از لازم)؛ در صورت نیاز به کوئریِ سبک‌ترِ شمارشی بازنویسی شود.
- [ ] شمارشِ روزهای آینده در پیام نامعلوم است (متنِ عمومی)؛ می‌شود برای روزهای آینده هم تخمینِ due را حساب کرد (چون `next_review_at` روزـگرینولار است).

---

## ۱۰. اسکیل / دانشِ لازم برای ادامه (سشنِ بعدی)

- **Capacitor 6 Local Notifications**: `schedule`, `cancel`, `createChannel`, `checkPermissions/requestPermissions`,
  رویدادهای `localNotificationReceived` و `localNotificationActionPerformed`.
- **الگوی سرویسِ پروژه**: شاخه‌زدن با `isNative()` + import پویا (`const off = () => import('@/offline/repo')`).
  اعلان‌ها native-only است، پس lib مستقیماً repo را dynamic-import می‌کند (مثل `pronounce.ts`).
- **مهاجرت SQLite**: `CREATE TABLE IF NOT EXISTS` هرگز جدولِ موجود را عوض نمی‌کند؛ ستون‌های جدید با
  `addMissingColumns()` اضافه می‌شوند.
- **AndroidManifest merge**: مجوز/Receiverِ پلاگین خودکار merge می‌شود؛ فقط exact-alarm را دستی افزودیم.
- **سازگاری دوگانه‌ی وب/نیتیو**: فیلدهای جدید در تایپ اختیاری بمانند و UI پشتِ `isNative()` گِیت شود تا وب نشکند.
- **همگام‌سازی دو سیستم**: بعد از هر تغییر، فایل‌ها با `sshpass -e scp` به
  `192.168.2.115` (کاربر `localadmin`، دایرکتوری `D:/project/VocabFlow`) کپی و byte-size چک شوند.
  APK همیشه فقط روی سیستم لینوکس ساخته می‌شود.
