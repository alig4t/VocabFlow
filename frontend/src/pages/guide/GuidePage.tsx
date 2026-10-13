import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Layers,
  Repeat,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEVEL_CLASS, type BookLevel } from "@/lib/bookMeta";
import { isNative } from "@/lib/platform";

const BOOKS: { title: string; level: BookLevel; good: string }[] = [
  {
    title: "۵۰۴ واژه‌ی کاملاً ضروری",
    level: "متوسط",
    good: "تقویت واژگان پرکاربرد روزمره",
  },
  {
    title: "۴۰۰۰ واژه‌ی ضروری (۶ جلد)",
    level: "مبتدی تا پیشرفته",
    good: "مسیر مرحله‌به‌مرحله و مدرج",
  },
  {
    title: "Oxford Word Skills",
    level: "مبتدی تا پیشرفته",
    good: "یادگیری واژه بر پایه‌ی موضوع (سه سطح)",
  },
  {
    title: "Vocabulary in Use",
    level: "مبتدی تا پیشرفته",
    good: "واژگان کاربردی کمبریج در چند سطح",
  },
  {
    title: "۱۰۰۰ باهم‌آیی انگلیسی",
    level: "متوسط",
    good: "ترکیب‌های طبیعی و پرکاربرد کلمات",
  },
  {
    title: "English Collocations in Use",
    level: "متوسط تا پیشرفته",
    good: "باهم‌آیی‌های واقعی در بافت طبیعی",
  },
  {
    title: "افعال عبارتی در کاربرد",
    level: "متوسط",
    good: "phrasal verbهای رایج مکالمه",
  },
  {
    title: "English Idioms in Use",
    level: "متوسط تا پیشرفته",
    good: "اصطلاحات رایج با مثال و کاربرد",
  },
  {
    title: "اصطلاحات و افعال عبارتی (آکسفورد)",
    level: "متوسط",
    good: "اصطلاحات و phrasal verbها به‌صورت تمرین‌محور",
  },
  {
    title: "Street Talk 1",
    level: "متوسط",
    good: "زبان محاوره و اصطلاحات روزمره",
  },
  {
    title: "۱۱۰۰ واژه‌ی Barron",
    level: "پیشرفته",
    good: "تقویت جدی واژگان آکادمیک",
  },
  {
    title: "واژگان ضروری GRE (Barron)",
    level: "پیشرفته",
    good: "آمادگی آزمون GRE",
  },
  {
    title: "واژگان ضروری IELTS (Barron)",
    level: "متوسط تا پیشرفته",
    good: "آمادگی آزمون آیلتس",
  },
  {
    title: "واژگان ضروری TOEFL (Barron)",
    level: "متوسط تا پیشرفته",
    good: "آمادگی آزمون تافل",
  },
];

const ANSWERS: { label: string; desc: string; dot: string }[] = [
  {
    label: "بلد نیستم",
    desc: "معنی را به یاد نیاوردی؛ واژه در همین جلسه دوباره نمایش داده می‌شود.",
    dot: "bg-destructive",
  },
  {
    label: "سخت",
    desc: "معنی را با تلاش به یاد آوردی؛ فاصله‌ی مرورهای آینده با احتیاط بیشتری افزایش پیدا می‌کند.",
    dot: "bg-warning",
  },
  {
    label: "بلدم",
    desc: "معنی را راحت به یاد آوردی؛ با ادامه‌ی مرورهای موفق، فاصله‌ی مرورها بیشتر می‌شود.",
    dot: "bg-success",
  },
  {
    label: "رد",
    desc: "فعلاً از این کارت عبور می‌کنی؛ زمان مرورش تغییر نمی‌کند.",
    dot: "bg-muted-foreground",
  },
];

const STEPS = [
  {
    number: "۱",
    title: "یک کتاب انتخاب کن",
    desc: "از کتابخانه، کتابی متناسب با سطح یا هدفت پیدا کن.",
  },
  {
    number: "۲",
    title: "جلد یا سطح را انتخاب کن",
    desc: "در «شروع یادگیری» یا صفحه‌ی کتاب، جلد دلخواهت را انتخاب کن.",
  },
  {
    number: "۳",
    title: "برنامه‌ی روزانه‌ات را بساز",
    desc: "تعداد واژه‌های جدید روزانه را مشخص کن و «شروع یادگیری» را بزن. پیشنهاد شروع: ۱۰ واژه.",
  },
];

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          {icon}
        </span>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Disclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group min-w-0 rounded-xl border border-border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform"
        />
      </summary>
      <div className="border-t border-border p-4 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

export function GuidePage() {
  const native = isNative();

  return (
    <div dir="rtl" className="mx-auto max-w-2xl px-4 py-6 font-persian">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">راهنمای شروع</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          از انتخاب اولین کتاب تا مرور روزانه؛ چند قدم ساده برای شروع یادگیری و
          کمک به ماندگاری واژه‌ها در حافظه.
        </p>
      </header>

      <div className="space-y-12">
        <Section icon={<Rocket className="h-5 w-5" />} title="شروع در سه قدم">
          <div className="space-y-5 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:p-5">
            <ol className="space-y-4">
              {STEPS.map((step) => (
                <li key={step.number} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-foreground"
                  >
                    {step.number}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">
                      {step.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
              <Link to="/library">
                انتخاب کتاب
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            بعد از ساخت برنامه، هر روز از «مطالعه امروز» ادامه بده. تعداد
            انتخاب‌شده مربوط به واژه‌های جدید است؛ مرورهای سررسیده هم به
            مطالعه‌ی روزانه اضافه می‌شوند.
          </p>
        </Section>

        <Section
          icon={<Repeat className="h-5 w-5" />}
          title="در «مطالعه امروز» چه کار کنم؟"
        >
          <div className="space-y-4 text-[15px] leading-8 text-muted-foreground">
            <p>
              هر روز واژه‌های جدید برنامه و واژه‌هایی را می‌بینی که وقت مرورشان
              رسیده است. وکب فلو با الگوریتم{" "}
              <strong className="text-foreground">SM-2</strong> زمان مرور بعدی
              را بر اساس پاسخ‌هایت تنظیم می‌کند. این{" "}
              <strong className="text-foreground">تکرار فاصله‌دار</strong> به
              ماندگاری واژه‌ها با تمرین منظم کمک می‌کند.
            </p>
            <p>
              برای مرور یک واژه، اول تلاش کن معنی را به یاد بیاوری. بعد روی کارت
              بزن تا پاسخ را ببینی و بر اساس چیزی که واقعاً به یاد آوردی، یکی از
              دکمه‌های زیر را انتخاب کن.
            </p>
          </div>

          <div className="space-y-1 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-7">
            <h3 className="font-bold text-foreground">
              اولین بار که واژه‌ای جدید می‌بینی: «خواندم»
            </h3>
            <p className="text-muted-foreground">
              معنی و مثال را بخوان و «خواندم» را بزن. این پاسخ آشنایی اولیه‌ات
              را ثبت می‌کند و واژه بعداً در همین جلسه دوباره می‌آید تا آن را از
              حافظه به یاد بیاوری؛ آن بار دکمه‌های زیر را می‌بینی.
            </p>
          </div>

          <ul className="space-y-2.5 rounded-xl border border-border bg-card/50 p-4">
            {ANSWERS.map((a) => (
              <li key={a.label} className="flex items-start gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.dot}`}
                />
                <span className="leading-7 text-muted-foreground">
                  <strong className="text-foreground">{a.label}:</strong>{" "}
                  {a.desc}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          icon={<Layers className="h-5 w-5" />}
          title="کدام روش مرور را انتخاب کنم؟"
        >
          <div className="divide-y divide-border rounded-xl border border-border bg-card px-4">
            <div className="space-y-1 py-4">
              <h3 className="text-sm font-bold text-foreground">
                مطالعه امروز
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                مسیر اصلی برنامه‌ی روزانه است. پاسخ‌هایت زمان مرور بعدی هر واژه
                را تنظیم می‌کنند.
              </p>
            </div>
            <div className="space-y-1 py-4">
              <h3 className="text-sm font-bold text-foreground">مرور آزاد</h3>
              <p className="text-sm leading-7 text-muted-foreground">
                برای تمرین دلخواه واژه‌هاست. «گرفتم» و «نگرفتم» فقط علامت دستیِ
                بلدم و بلد نیستم را ثبت می‌کنند و زمان‌بندی مطالعه‌ی روزانه را
                تغییر نمی‌دهند. این علامت‌ها در صفحه‌ی واژگان هم برای فیلترکردن
                قابل استفاده‌اند.
              </p>
            </div>
            <div className="space-y-1 py-4">
              <h3 className="text-sm font-bold text-foreground">
                تمرین واژه‌های جدید و سخت امروز
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                بعد از تکمیل مطالعه‌ی روزانه، از داشبورد واژه‌های جدید یا
                واژه‌هایی را که «سخت» و «بلد نیستم» پاسخ داده‌ای دوباره تمرین
                کن. هر گزینه وقتی واژه‌ای برای تمرین داشته باشی نمایش داده
                می‌شود. پاسخ‌های این تمرین هم فقط علامت دستی را ثبت می‌کنند.
              </p>
            </div>
          </div>
        </Section>

        <Section
          icon={<BookOpen className="h-5 w-5" />}
          title="با کدام کتاب شروع کنم؟"
        >
          <p className="text-[15px] leading-8 text-muted-foreground">
            لازم نیست همه‌ی کتاب‌ها را باز کنی. یک کتاب متناسب با سطحت انتخاب
            کن، برایش برنامه بگذار و روی همان تمرکز کن.
          </p>

          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
            <Sparkles
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            />
            <p className="text-sm leading-7 text-foreground">
              <strong>پیشنهاد ما:</strong> اگر تازه‌کاری، با «Vocabulary in Use
              (پایه)» یا جلد ۱ از «۴۰۰۰ واژه» شروع کن. اگر برای آزمون آماده
              می‌شوی، کتاب Barron همان آزمون (GRE، آیلتس یا تافل) را متناسب با
              سطحت انتخاب کن.
            </p>
          </div>

          <Disclosure title="مقایسه‌ی کتاب‌ها بر اساس سطح و هدف">
            <ul className="grid gap-3 sm:hidden">
              {BOOKS.map((book) => (
                <li
                  key={book.title}
                  className="min-w-0 space-y-2 rounded-lg border border-border bg-background p-3"
                >
                  <h3 className="font-semibold text-foreground">
                    <bdi>{book.title}</bdi>
                  </h3>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${LEVEL_CLASS[book.level]}`}
                  >
                    {book.level}
                  </span>
                  <p>{book.good}</p>
                </li>
              ))}
            </ul>
            <table className="hidden w-full text-right text-sm sm:table">
              <caption className="sr-only">
                سطح و کاربرد کتاب‌های وکب فلو
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    کتاب
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    سطح
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    مناسب برای
                  </th>
                </tr>
              </thead>
              <tbody>
                {BOOKS.map((b, i) => (
                  <tr key={b.title} className={i % 2 ? "bg-muted/20" : ""}>
                    <th
                      scope="row"
                      className="px-3 py-2.5 align-top font-medium text-foreground"
                    >
                      <bdi>{b.title}</bdi>
                    </th>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_CLASS[b.level]}`}
                      >
                        {b.level}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top leading-6 text-muted-foreground">
                      {b.good}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
        </Section>

        <Section
          icon={<CircleHelp className="h-5 w-5" />}
          title="پرسش‌های متداول"
        >
          <div className="space-y-3">
            <Disclosure title="چطور جهت مطالعه را عوض کنم؟">
              <p>
                در تنظیمات، «جهت مطالعه» را روی انگلیسی به فارسی یا فارسی به
                انگلیسی بگذار. پیشرفت و زمان‌بندی هر جهت جداست؛ با تغییر جهت،
                مرورها بر اساس سابقه‌ی همان جهت نمایش داده می‌شوند.
              </p>
              <Button asChild variant="outline" size="lg" className="mt-3">
                <Link to="/settings">تنظیم جهت مطالعه</Link>
              </Button>
            </Disclosure>
            <Disclosure title="روز جدید از چه ساعتی شروع می‌شود؟">
              <p>
                روز مطالعه از ساعت ۶ صبح به وقت محلی دستگاه شروع می‌شود. اگر
                نیمه‌شب مطالعه کنی، تا قبل از ۶ صبح هنوز در روز مطالعه‌ی قبلی
                هستی.
              </p>
            </Disclosure>
            <Disclosure title="چرا تمرین واژه‌های امروز قفل است؟">
              <p>
                اول باید همه‌ی واژه‌های جدید و مرورهای سررسیده‌ی «مطالعه امروز»
                را تکمیل کنی. «رد» زمان‌بندی را تغییر نمی‌دهد و به‌تنهایی مطالعه
                را کامل نمی‌کند. بعد از تکمیل، گزینه‌های تمرین با توجه به
                واژه‌های جدید و سخت همان روز در داشبورد باز می‌شوند.
              </p>
            </Disclosure>
            {native && (
              <>
                <Disclosure title="در اندروید بدون اینترنت هم می‌توانم مطالعه کنم؟">
                  <p>
                    مطالعه، مرور و ذخیره‌ی پیشرفت در اندروید روی همین دستگاه و
                    به‌صورت آفلاین انجام می‌شوند. برای خرید، بازیابی خرید یا
                    بررسی اشتراک بازار به اینترنت نیاز داری. پس از تأیید اشتراک
                    فعال، دسترسی تا ۷ روز از زمان تأیید برای استفاده‌ی آفلاین
                    معتبر است؛ سپس اشتراک باید دوباره بررسی شود.
                  </p>
                </Disclosure>
                <Disclosure title="دوره‌ی آزمایشی شش‌روزه چطور حساب می‌شود؟">
                  <p>
                    دوره‌ی آزمایشی ۶ روز مطالعه است و لازم نیست این روزها
                    پشت‌سرهم باشند. اولین پاسخ ذخیره‌شده در مطالعه یا
                    علامت‌گذاری در مرور آزاد، روز آزمایشی را مصرف می‌کند؛
                    بازکردن برنامه یا «رد» مصرفی ندارد. هر روز از ۶ صبح تا ۶ صبح
                    بعدی حساب می‌شود و روز ششم هم تا پایان همان روز قابل استفاده
                    است. هنگام دسترسی با اشتراک فعال، روز آزمایشی مصرف نمی‌شود.
                  </p>
                  <Button asChild variant="outline" size="lg" className="mt-3">
                    <Link to="/subscription">دیدن وضعیت دسترسی</Link>
                  </Button>
                </Disclosure>
              </>
            )}
          </div>
        </Section>

        <Button asChild size="lg" className="w-full gap-2">
          <Link to="/library">
            انتخاب کتاب و شروع یادگیری
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
