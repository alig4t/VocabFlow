# خط تولید محتوا — اسکرپ، فایل‌های کتاب، ایمپورت و seed

> **وضعیت:** با کد تطبیق داده شد در 2026-10-04 (قبلاً `PROJECT_DOCS.md` در ریشه بود). بخش‌های اسکرپ تا حدی
> تاریخی‌اند — به برچسب‌ها توجه کن. روال گام‌به‌گام افزودن/تغییر کتاب: مهارت `.claude/skills/add-book-content`.

## نمای کلی

```
scrap/  ──(اسکرپ)──►  JSON کتاب  ──┬──►  books/*.json            ──► backend: npm run db:seed-all-datas  ──► PostgreSQL (وب)
                                    └──►  frontend/seed-src/*.json ──► npm run seed:encrypt ──► public/seed-enc/*.enc ──► SQLite (اندروید)
```

دو نسخه‌ی موازی از فایل‌های کتاب وجود دارد و **هیچ همگام‌سازی خودکاری بینشان نیست**:

| مسیر | مصرف‌کننده | محتوا (2026-10-04) |
|---|---|---|
| `books/` (ریشه) | `backend/prisma/import-all.ts` (پیش‌فرض: `path.resolve(__dirname, '../../books')`) | ۲۶ فایل |
| `frontend/seed-src/` | `frontend/scripts/encrypt-seed.mjs` (فقط فایل‌های داخل `manifest.json`) | همان ۲۶ نام + `manifest.json` + شش فایل مرده‌ی `4000-essential-english-words-1..6.json` (فرمت قدیمی، در manifest نیستند) |

> ⚠ چند فایل هم‌نام در `books/` و `seed-src/` چند بایت با هم فرق دارند (مثلاً `1000-english-collocations.json`).
> اینکه کدام نسخه مرجع است از repo مشخص نیست — قبل از ویرایش محتوا از کاربر بپرس و تغییر را در هر دو اعمال کن.

---

## کتاب‌های موجود (۲۶ فایل)

- **4000 Essential English Words** — `4000-essential-english-words-v1..v6.json` (۶ جلد)
- **Oxford Word Skills** — `oxford-word-skills-basic|intermediate|advanced.json` (هر سه زیر یک Book با جلدهای Basic/Intermediate/Advanced)
- **Vocabulary in Use** — `vocabulary-in-use-basic|pre-intermediate-and-intermediate|academic.json`
- **English Collocations in Use** — `english-collocations-in-use-intermediate|advanced.json`
- **English Idioms in Use** — `english-idioms-in-use-intermediate|advanced.json`
- **Idioms and Phrasal Verbs** — `idoms-and-phrasal-verbs-intermediate|advanced.json` (املای `idoms` عمدی/تاریخی است؛ عوضش نکن)
- **English Phrasal Verbs in Use** — `english-phrasal-verbs-in-use-v1.json`
- **1000 English Collocations** — `1000-english-collocations.json`
- **Barron's** — `barron-1100-words-you-need-to-know-v1`، `barron-essential-words-for-the-gre-v1`، `barron-s-essential-words-for-the-ielts-v1`، `barron-s-essential-words-for-the-toefl-v1`
- **504 Absolutely Essential Words** — `504-absolutely-essential-words-v1.json`
- **Street Talk 1** — `street-talk-1-v1.json`

> تاریخی: فایل `oxford-word-skills-intermediate.json` هنگام اسکرپ خراب شد (۴۸۳٬۷۲۲ null byte + قطع شدن وسط لغت «pleased»)؛ با اسکریپت Python ترمیم شد و فقط **۶۹ از ۸۰ درس** (۲۴۳۲ لغت) ریکاور شد. ۱۱ درس باقی‌مانده نیاز به re-scrape دارند — وضعیت فعلی این کمبود تأیید نشده است.

---

## نگاشت عنوان‌ها (دو جا، باید یکسان بمانند)

عنوان Book و Volume از روی `bookSlug` داخل JSON تعیین می‌شود (نه نام فایل). نگاشت‌ها در **دو** فایل تکرار شده‌اند و باید همیشه با هم ویرایش شوند:
- `backend/prisma/import-all.ts` — `BOOK_TITLE_MAP` و نگاشت عنوان جلدها
- `frontend/src/offline/seed.ts` — نگاشت‌های معادل

نکات:
- slug کتاب collocations سطح advanced در JSON یک **خط تیره‌ی انتهایی** دارد: `english-collocations-in-use-advanced-`. نگاشت‌ها به همین وابسته‌اند.
- سه فایل Oxford همه از slug `oxford-word-skills-basic` استفاده می‌کنند تا زیر یک Book جمع شوند (volumeNumber ۱/۲/۳ → Basic/Intermediate/Advanced).
- `books.title` در Postgres یکتا نیست؛ ایمپورت از `findFirst + create` استفاده می‌کند نه upsert.
- کاور کتاب‌ها/جلدها روی نیتیو از `frontend/public/books/` با نگاشت‌های `COVER_BY_TITLE` / `VOLUME_COVER_BY_TITLE` در `offline/repo.ts` می‌آید؛ عنوان جدید ⇒ نگاشت کاور هم لازم است.

---

## ایمپورت به PostgreSQL (وب)

```bash
cd backend
npm run db:seed                         # پیش‌نیاز: ساخت LearningModule با slug "vocabulary"
npm run db:seed-all-datas               # همه‌ی *.json در <repo>/books
npm run db:seed-all-datas -- /path/dir  # یا یک پوشه‌ی دلخواه (پوشه‌ای که manifest.json دارد را نده)
```
تشخیص فرمت: کلید `units` ⇒ فرمت قدیمی (4000 Words قدیمی)، کلید `lessons` ⇒ فرمت جدید. ساختار Book → Volume → Lesson → Word (+ examples/phrases) ساخته می‌شود.

## seed اندروید (آفلاین)

1. فایل را در `frontend/seed-src/` بگذار و نامش را به `seed-src/manifest.json` اضافه کن.
2. `cd frontend && npm run seed:encrypt` (نیازمند `VITE_SEED_SECRET` در `frontend/.env`؛ پوشه‌ی `public/seed-enc/` کامل بازسازی می‌شود).
3. برای اینکه نصب‌های موجود محتوای جدید را بگیرند باید `SEED_VERSION` در `frontend/src/offline/seed.ts` بالا برود — **که پیشرفت کاربر (`progress`) را پاک می‌کند** (→ [`ANDROID.md`](ANDROID.md) بخش ۳.۳). این تصمیم محصولی است؛ بدون تأیید کاربر انجامش نده.

---

## ساختار لغت در JSON

```json
{
  "eng": "allot",
  "pronunciation": "/əˈlɑːt/",
  "partOfSpeech": "فعل",
  "meanings": [
    {
      "per": "اختصاص دادن",
      "examples": [
        { "eng": "How much money has been allotted?", "per": "چقدر پول اختصاص داده شده؟" }
      ],
      "phrases": [
        {
          "patternEng": "allot time to",
          "patternPer": "زمان اختصاص دادن به",
          "examples": [
            { "eng": "Allot more time to revision.", "per": "زمان بیشتری به مرور اختصاص بده." }
          ]
        }
      ],
      "synonyms": ["assign", "allocate"],
      "antonyms": []
    }
  ],
  "wordForms": { "label": "Word forms", "forms": "allots / allotted / allotting" }
}
```

فرمت فایل جدید (`lessons`):
```json
{ "bookSlug": "oxford-word-skills-basic", "volumeNumber": 1, "totalLessons": 81, "totalWords": 2265,
  "lessons": [ { "lessonNumber": 1, "unitId": "100", "title": "درس 1 - اعداد", "url": "...", "words": [ ... ] } ] }
```
فرمت قدیمی (`units`): `{ "volume": 6, "totalUnits": 30, "totalWords": 600, "units": [ { "unit": 1, "unitId": "2690", "url": "...", "words": [ ... ] } ] }`

---

## اسکرپرها (`scrap/`)

| فایل | وضعیت |
|---|---|
| `book-scraper.js` | اسکرپر اصلی lang.b-amooz.com. **در `.gitignore` است** — فقط روی سیستمی که ساخته شده وجود دارد. |
| `quzlet-scrapper.js` | اسکرپ مجموعه‌های Quizlet (idioms / phrasal verbs / collocations) به همان شکل JSON؛ هر مجموعه = یک کتاب، جلد ۱، یک درس. معنی فارسی ندارد (`per: ""`). ورودی: `site-source.txt` یا URL/HTML. خروجی‌های ثبت‌شده در `scrap/quz-out/`. |
| `scraper.js` | **وجود ندارد.** اسکرپر قدیمیِ فقط-4000-Words بود؛ اسکریپت `npm run scrap` در `scrap/package.json` هنوز به آن اشاره می‌کند و خراب است. |
| `scrap/source/*.txt` | متن خام منبع چند کتاب Cambridge. |
| `scrap/output/` | خروجی موقت؛ در `.gitignore`. |

### `book-scraper.js` (تاریخی ولی هنوز معتبر برای اسکرپ جدید)

```bash
cd scrap
node book-scraper.js <bookSlug> <volumeNumber> <indexUrl>     # یا: npm run scrap:book -- ...
# مثال:
node book-scraper.js oxford-word-skills-basic 1 https://lang.b-amooz.com/en/vocabulary/categories/113/oxford-word-skills-basic
```
خروجی: `output/<slug>-v<N>/lesson-XX.json` و فایل ترکیبی `output/<slug>-v<N>.json` (این را کپی کن).

منبع: `https://lang.b-amooz.com` — صفحه‌ی کتاب `/en/vocabulary/categories/{categoryId}/{slug}`، صفحه‌ی درس `/en/vocabulary/subcategories/{unitId}/{slug}`، API مرور `/en/vocab/{unitId}/review` با هدر `X-Requested-With: XMLHttpRequest`. فاصله‌ی ۹۰۰ms بین درخواست‌ها (کتاب ۸۰ درسی ≈ ۷۲ ثانیه).

تشخیص شماره‌ی درس به ترتیب: (۱) `درس\s+(\d+)` در عنوان، (۲) `unit-(\d+)` در URL، (۳) `lesson-(\d+)` در URL (Phrasal Verbs از اعداد ترتیبی فارسی «درس اول» استفاده می‌کند)، (۴) ترتیب در صفحه.
