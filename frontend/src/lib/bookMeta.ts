// Static, offline-friendly metadata for the seeded books — category, author,
// level and a longer Persian description. Keyed by the exact seeded book title
// (mirrors the titles in offline/seed.ts BOOK_TITLE_MAP and the backend import).
//
// This lives on the client because the seed DB stores no author/level/category
// columns; the same map therefore powers both the web and offline builds.

export type BookLevel =
  | 'مبتدی'
  | 'متوسط'
  | 'پیشرفته'
  | 'مبتدی تا پیشرفته'
  | 'متوسط تا پیشرفته'

/** Tailwind classes for a level pill — shared by the guide and library pages. */
export const LEVEL_CLASS: Record<BookLevel, string> = {
  'مبتدی': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'متوسط': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'پیشرفته': 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'مبتدی تا پیشرفته': 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  'متوسط تا پیشرفته': 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
}

export type BookCategory = 'words' | 'collocations' | 'phrasal'

/** Display copy for each category section on the discovery page. */
export const CATEGORY_META: Record<
  BookCategory,
  { title: string; subtitle: string }
> = {
  words: {
    title: 'لغات و واژگان',
    subtitle: 'گسترش دامنه‌ی واژگان؛ از لغات پایه‌ی روزمره تا سطح آکادمیک و آزمون.',
  },
  collocations: {
    title: 'باهم‌آیی‌ها (Collocations)',
    subtitle: 'ترکیب‌های طبیعی و پرکاربرد کلمات تا مثل یک بومی‌زبان صحبت کنی.',
  },
  phrasal: {
    title: 'افعال عبارتی و اصطلاحات',
    subtitle: 'افعال دوکلمه‌ای و اصطلاحات رایج، قلبِ زبان محاوره‌ی روزمره.',
  },
}

/** Order the category sections appear in on the discovery page. */
export const CATEGORY_ORDER: BookCategory[] = ['words', 'collocations', 'phrasal']

export interface BookMeta {
  category: BookCategory
  author: string
  level: BookLevel
  /** A short Persian introduction shown on the book detail page. */
  about: string
}

/** Keyed by the exact seeded book title. */
export const BOOK_META: Record<string, BookMeta> = {
  '504 Absolutely Essential Words': {
    category: 'words',
    author: 'Murray Bromberg & Julius Liebb',
    level: 'متوسط',
    about:
      '۵۰۴ لغتِ پرکاربرد و ضروری زبان انگلیسی که در درس‌های کوتاه و همراه با مثال ارائه شده‌اند. یک انتخاب کلاسیک برای ساختن پایه‌ای محکم از واژگان روزمره.',
  },
  '4000 Essential English Words': {
    category: 'words',
    author: 'Paul Nation',
    level: 'مبتدی تا پیشرفته',
    about:
      'مجموعه‌ی شش‌جلدی و مدرج پاول نیشن که ۴۰۰۰ واژه‌ی پرتکرار زبان را از ساده به دشوار پوشش می‌دهد. هر جلد گامی است رو به جلو؛ بهترین مسیر مرحله‌به‌مرحله برای رشد پیوسته‌ی واژگان.',
  },
  'Oxford Word Skills': {
    category: 'words',
    author: 'Ruth Gairns & Stuart Redman',
    level: 'مبتدی تا پیشرفته',
    about:
      'یادگیری واژه بر پایه‌ی موضوع، در سه سطح مبتدی، متوسط و پیشرفته. هر بخش لغات را در بافتِ کاربردی و همراه با تمرین آموزش می‌دهد.',
  },
  "Barron's Essential Words for the GRE": {
    category: 'words',
    author: "Barron's",
    level: 'پیشرفته',
    about:
      'واژگان آکادمیک و سطح‌بالا برای آمادگی آزمون GRE. مناسب کسانی که به‌دنبال تسلط جدی بر لغات دشوار و رسمی هستند.',
  },
  "Barron's Essential Words for the IELTS": {
    category: 'words',
    author: "Barron's",
    level: 'متوسط تا پیشرفته',
    about:
      'لغات کلیدی و پرتکرار آزمون آیلتس، دسته‌بندی‌شده بر پایه‌ی موضوع‌های رایج این آزمون. همراهی مطمئن برای آمادگی هدفمند.',
  },
  "Barron's Essential Words for the TOEFL": {
    category: 'words',
    author: "Barron's",
    level: 'متوسط تا پیشرفته',
    about:
      'واژگان ضروری آزمون تافل با تمرکز بر انگلیسی آکادمیک. برای تقویت دقیقِ دایره‌ی لغات پیش از آزمون.',
  },
  "Barron's 1100 Words You Need to Know": {
    category: 'words',
    author: "Barron's",
    level: 'پیشرفته',
    about:
      '۱۱۰۰ واژه‌ی پیشرفته و آکادمیک در قالب یک برنامه‌ی هفتگیِ منظم. تقویت جدی واژگان برای خواندنِ متن‌های سطح‌بالا.',
  },
  'Vocabulary in Use': {
    category: 'words',
    author: 'Michael McCarthy & Felicity O’Dell',
    level: 'مبتدی تا پیشرفته',
    about:
      'مجموعه‌ی محبوب کمبریج برای یادگیری واژگان از سطح پایه تا آکادمیک. هر درس در یک صفحه: توضیح در سمت راست، تمرین در سمت چپ.',
  },
  '1000 English Collocations in 10 Minutes a Day': {
    category: 'collocations',
    author: 'LiveABC',
    level: 'متوسط',
    about:
      'هزار باهم‌آییِ رایج در قالب درس‌های کوتاه روزانه. یاد می‌گیری کدام کلمه‌ها به‌طور طبیعی کنار هم می‌نشینند تا انگلیسیِ روان‌تری داشته باشی.',
  },
  'English Collocations in Use': {
    category: 'collocations',
    author: 'Michael McCarthy & Felicity O’Dell',
    level: 'متوسط تا پیشرفته',
    about:
      'مرجع کمبریج برای باهم‌آیی‌ها در دو سطح متوسط و پیشرفته. ترکیب‌های واقعی و پرکاربرد را در بافت طبیعی‌شان می‌آموزی.',
  },
  'English Phrasal Verbs in Use': {
    category: 'phrasal',
    author: 'Michael McCarthy & Felicity O’Dell',
    level: 'متوسط',
    about:
      'افعال عبارتیِ پرکاربرد مکالمه در قالب درس‌های کاربردی کمبریج. کلید صحبت‌کردنِ طبیعی و روزمره به انگلیسی.',
  },
  'English Idioms in Use': {
    category: 'phrasal',
    author: 'Michael McCarthy & Felicity O’Dell',
    level: 'متوسط تا پیشرفته',
    about:
      'اصطلاحات رایج انگلیسی در دو سطح متوسط و پیشرفته. معنا، کاربرد و بافتِ درستِ هر اصطلاح را با مثال یاد می‌گیری.',
  },
  'Idioms and Phrasal Verbs': {
    category: 'phrasal',
    author: 'Ruth Gairns & Stuart Redman',
    level: 'متوسط',
    about:
      'اصطلاحات و افعال عبارتی از مجموعه‌ی آکسفورد، در دو سطح متوسط و پیشرفته. تمرین‌محور و مناسب برای تقویت زبان محاوره.',
  },
  'Street Talk 1': {
    category: 'phrasal',
    author: 'David Burke',
    level: 'متوسط',
    about:
      'زبان کوچه‌وبازار و اصطلاحات خودمانیِ انگلیسیِ آمریکایی. برای فهم فیلم‌ها، سریال‌ها و مکالمه‌های واقعیِ روزمره.',
  },
}

const DEFAULT_META: BookMeta = {
  category: 'words',
  author: '—',
  level: 'مبتدی تا پیشرفته',
  about: '',
}

export function getBookMeta(title: string): BookMeta {
  return BOOK_META[title] ?? DEFAULT_META
}
