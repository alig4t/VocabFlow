# مستندات پروژه یادگیری انگلیسی

## ساختار پروژه

```
eng1/
├── backend/          ← API (Express + Prisma + PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma         ← تعریف مدل‌های دیتابیس
│   │   ├── seed.ts               ← ایجاد module اولیه
│   │   ├── import-all.ts         ← ایمپورت تمام کتاب‌ها از /books
│   │   └── import-volume6.ts     ← ایمپورت قدیمی (فقط volume 6 کتاب 4000)
│   └── src/                      ← کد API
├── frontend/         ← رابط کاربری
├── scrap/            ← اسکرپرها
│   ├── scraper.js        ← اسکرپر قدیمی (فقط 4000 Essential English Words)
│   ├── book-scraper.js   ← اسکرپر جدید (همه کتاب‌ها)
│   └── output/           ← خروجی اسکرپر (JSON موقت)
└── books/            ← فایل‌های JSON نهایی (ورودی دیتابیس)
```

---

## کتاب‌های موجود

| فایل در `/books` | کتاب | Volume | درس‌ها | لغات تقریبی |
|---|---|---|---|---|
| `4000-essential-english-words-1.json` | 4000 Essential English Words | 1 | 30 | 599 |
| `4000-essential-english-words-2.json` | 4000 Essential English Words | 2 | 30 | ~600 |
| `4000-essential-english-words-3.json` | 4000 Essential English Words | 3 | 30 | ~600 |
| `4000-essential-english-words-4.json` | 4000 Essential English Words | 4 | 30 | ~600 |
| `4000-essential-english-words-5.json` | 4000 Essential English Words | 5 | 30 | ~600 |
| `4000-essential-english-words-6.json` | 4000 Essential English Words | 6 | 30 | ~600 |
| `oxford-word-skills-basic.json` | Oxford Word Skills | 1 (Basic) | 81 | 2265 |
| `oxford-word-skills-intermediate.json` | Oxford Word Skills | 2 (Intermediate) | 69/80 | 2432 |
| `oxford-word-skills-advanced.json` | Oxford Word Skills | 3 (Advanced) | ~80 | ~3000 |
| `1000-english-collocations.json` | 1000 English Collocations | 1 | ~50 | ~1000 |

> **نکته:** فایل `oxford-word-skills-intermediate.json` به‌دلیل خرابی هنگام اسکرپ (null bytes + truncation)، فقط ۶۹ درس از ۸۰ درس آن ریکاور شده. ۱۱ درس باقی‌مانده نیاز به re-scrape دارند.

> **کتاب نداریم:** `english-phrasal-verbs-in-use` هنوز اسکرپ نشده.

---

## سایت منبع

**آدرس:** `https://lang.b-amooz.com`

### ساختار URL‌ها

```
صفحه کتاب (index):
  /en/vocabulary/categories/{categoryId}/{book-slug}

صفحه درس:
  /en/vocabulary/subcategories/{unitId}/{lesson-slug}

API مرور لغات (AJAX):
  /en/vocab/{unitId}/review
  Header: X-Requested-With: XMLHttpRequest
```

---

## اسکرپرها

### ۱. `scraper.js` — اسکرپر قدیمی

فقط برای کتاب **4000 Essential English Words** طراحی شده.

```bash
# اجرا از پوشه scrap/
node scraper.js <volumeNumber> <indexUrl>

# مثال — volume 6:
node scraper.js 6 https://lang.b-amooz.com/en/vocabulary/categories/251/4000-essential-english-words-6

# یا با npm:
npm run scrap -- 6 https://lang.b-amooz.com/en/vocabulary/categories/251/4000-essential-english-words-6
```

**خروجی:** `output/volume-{N}.json`

**فرمت خروجی (Old Format):**
```json
{
  "volume": 6,
  "totalUnits": 30,
  "totalWords": 600,
  "units": [
    {
      "unit": 1,
      "unitId": "2690",
      "url": "...",
      "words": [ ... ]
    }
  ]
}
```

---

### ۲. `book-scraper.js` — اسکرپر جدید (همه کتاب‌ها)

```bash
# اجرا از پوشه scrap/
node book-scraper.js <bookSlug> <volumeNumber> <indexUrl>

# یا با npm:
npm run scrap:book -- <bookSlug> <volumeNumber> <indexUrl>
```

#### دستورات اسکرپ هر کتاب

**Oxford Word Skills:**
```bash
# Basic (volume 1)
node book-scraper.js oxford-word-skills-basic 1 https://lang.b-amooz.com/en/vocabulary/categories/113/oxford-word-skills-basic

# Intermediate (volume 2) — 11 درس هنوز نیاز به اسکرپ دارد
node book-scraper.js oxford-word-skills-basic 2 https://lang.b-amooz.com/en/vocabulary/categories/148/oxford-word-skills-intermediate

# Advanced (volume 3)
node book-scraper.js oxford-word-skills-basic 3 https://lang.b-amooz.com/en/vocabulary/categories/149/oxford-word-skills-advanced
```

> توجه: هر سه volume از slug یکسان `oxford-word-skills-basic` استفاده می‌کنند تا در دیتابیس زیر یک کتاب جمع شوند.

**1000 English Collocations:**
```bash
node book-scraper.js 1000-english-collocations 1 https://lang.b-amooz.com/en/vocabulary/categories/344/1000-english-collocations
```

**English Phrasal Verbs in Use:**
```bash
node book-scraper.js english-phrasal-verbs-in-use 1 https://lang.b-amooz.com/en/vocabulary/categories/345/english-phrasal-verbs-in-use
```

#### خروجی اسکرپر جدید

```
output/
└── {bookSlug}-v{N}/
    ├── lesson-01.json
    ├── lesson-02.json
    └── ...
output/{bookSlug}-v{N}.json   ← فایل ترکیبی (این را به /books کپی کن)
```

**فرمت خروجی (New Format):**
```json
{
  "bookSlug": "oxford-word-skills-basic",
  "volumeNumber": 1,
  "totalLessons": 81,
  "totalWords": 2265,
  "lessons": [
    {
      "lessonNumber": 1,
      "unitId": "100",
      "title": "درس 1 - اعداد",
      "url": "...",
      "words": [ ... ]
    }
  ]
}
```

#### منطق شناسایی شماره درس

اسکرپر برای تشخیص شماره درس سه روش به ترتیب اولویت دارد:

1. **عدد فارسی در عنوان:** `درس\s+(\d+)` — مثل "درس 5" (Oxford, 1000 Collocations)
2. **`unit-N` در URL:** `unit-(\d+)` — مثل `/unit-3` (4000 Essential Words)
3. **`lesson-N` در URL:** `lesson-(\d+)` — مثل `/lesson-4-nouns-...` (Phrasal Verbs)
4. **فال‌بک:** شماره ترتیبی بر اساس موقعیت در صفحه

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

---

## ساختار دیتابیس (PostgreSQL + Prisma)

### مدل‌ها و روابط

```
LearningModule
    └── Word (moduleId)

Book
    └── Volume (bookId)
            └── Lesson (volumeId)
                    └── Word (lessonId)
                            ├── WordExample[]
                            └── WordPhrase[]
                                    └── WordPhraseExample[]

User
    ├── RefreshToken[]
    └── UserWordProgress[] → Word
```

### جزئیات مدل‌ها

**Book**
```
id, title, description?, coverImage?, createdAt, updatedAt
```
> عنوان @unique نیست — از `findFirst + create` استفاده می‌شود نه upsert.

**Volume**
```
id, bookId, volumeNumber, title?, coverImage?, createdAt
@@unique([bookId, volumeNumber])
```

**Lesson**
```
id, volumeId, lessonNumber, title?, createdAt
@@unique([volumeId, lessonNumber])
```

**Word**
```
id, eng, per, pronunciation?, partOfSpeech?, wordForms?,
synonyms[], antonyms[], primaryExample?, primaryExampleTrs?,
chapter?, unit?, lessonId?, moduleId, createdAt, updatedAt
```

**UserWordProgress**
```
id, userId, wordId, reviewMode (EN_TO_FA | FA_TO_EN), status (NOT_READ | KNOWN | NOT_KNOWN)
manualStatus (NOT_READ | KNOWN | NOT_KNOWN)   ← مسیر جداگانه برای «مرور آزاد»؛ مستقل از status در SM-2
+ SM-2: repetitions, intervalDays, easeFactor, reviewCount, correctCount, wrongCount,
        lastReviewedAt?, nextReviewAt?, introducedAt?   (اضافه‌شده 2026-07-09)
@@unique([userId, wordId, reviewMode])
```

**LearningPlan** (لیست یادگیری در سطح جلد — جایگزین watchlist سطح کتاب)
```
id, userId, volumeId, dailyNewWords, dailyGoal, isActive
@@unique([userId, volumeId])
```

**StudySession** (هر جلسه‌ی مطالعه‌ی روزانه — برای streak/heatmap/آمار)
```
id, userId, startedAt, endedAt?, durationSec, reviewedCount,
correctCount, wrongCount, hardCount, skippedCount, newCount
```

**UserSettings** (تنظیمات کاربر)
```
userId (PK), studyDirection, autoPlayAudio, showPhonetics, showExamples, cardOrder (SEQUENTIAL | RANDOM)
```

---

## ایمپورت به دیتابیس

### پیش‌نیاز

```bash
# از پوشه backend/
npm run db:seed        # ایجاد LearningModule با slug: "vocabulary"
```

### ایمپورت همه کتاب‌ها

```bash
# از پوشه backend/
npm run db:seed-all-datas

# یا با مسیر دلخواه:
npm run db:seed-all-datas -- /path/to/books
```

این دستور:
1. همه فایل‌های `.json` در پوشه `/books` را می‌خواند
2. فرمت قدیمی و جدید را تشخیص می‌دهد
3. Book → Volume → Lesson → Word را upsert می‌کند

### نگاشت نام کتاب‌ها (`import-all.ts`)

| slug فایل | عنوان در دیتابیس |
|---|---|
| `4000-essential-english-words` | 4000 Essential English Words |
| `oxford-word-skills-basic` | Oxford Word Skills |
| `1000-english-collocations` | 1000 English Collocations |
| `english-phrasal-verbs-in-use` | English Phrasal Verbs in Use |

### نگاشت عنوان Volume های Oxford

| slug | volumeNumber | عنوان Volume |
|---|---|---|
| `oxford-word-skills-basic` | 1 | Basic |
| `oxford-word-skills-basic` | 2 | Intermediate |
| `oxford-word-skills-basic` | 3 | Advanced |

> همه سه فایل Oxford در دیتابیس زیر یک Book به نام "Oxford Word Skills" ذخیره می‌شوند.

### تشخیص فرمت JSON

```typescript
// اگر کلید "units" وجود داشت → Old Format (4000 Words)
// اگر کلید "lessons" وجود داشت → New Format (بقیه کتاب‌ها)
function isOldFormat(d): d is OldFormat { return 'units' in d }
```

---

## روند کامل اضافه کردن کتاب جدید

```
1. اسکرپ:
   cd scrap
   node book-scraper.js <slug> <volume> <indexUrl>

2. کپی خروجی به /books:
   cp output/<slug>-v<N>.json ../books/<slug>.json
   (یا هر نام دلخواهی — slug از داخل JSON خوانده می‌شود)

3. اگر slug جدید است، اضافه کن به import-all.ts:
   BOOK_TITLE_MAP['<slug>'] = 'عنوان فارسی/انگلیسی کتاب'

4. ایمپورت:
   cd ../backend
   npm run db:seed-all-datas
```

---

## نکات و مشکلات شناخته‌شده

### خرابی فایل intermediate
فایل `oxford-word-skills-intermediate.json` هنگام اسکرپ دچار مشکل شد:
- **۴۸۳٬۷۲۲ null byte** داخل فایل تعبیه شده بود
- فایل در وسط لغت "pleased" قطع شده بود
- با اسکریپت Python ریپر شد: null bytes حذف، JSON در آخرین لغت کامل بسته شد
- نتیجه: **۶۹ از ۸۰ درس** ریکاور شد (۲۴۳۲ لغت)
- ۱۱ درس آخر نیاز به re-scrape دارند

### کتاب Phrasal Verbs — عناوین ترتیبی فارسی
این کتاب از اعداد ترتیبی فارسی استفاده می‌کند: درس **اول**، درس **دوم**، ...
این‌ها با regex `درس\s+(\d+)` match نمی‌شوند. اسکرپر به‌جای آن از `lesson-N` در URL استفاده می‌کند.

### تأخیر بین درخواست‌ها
اسکرپر ۹۰۰ms بین هر درخواست صبر می‌کند تا از rate-limit سایت جلوگیری شود.
برای کتاب‌های بزرگ (۸۰ درس) حدود **۷۲ ثانیه** طول می‌کشد.
