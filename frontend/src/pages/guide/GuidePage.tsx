import { Repeat, BookOpen, Sparkles } from 'lucide-react'

// «راهنمای شروع» — onboarding: what the SM-2 review system is (and why it moves
// words into long-term memory) + which book to start with, compared by level.

type Level = 'مبتدی' | 'متوسط' | 'پیشرفته' | 'مبتدی تا پیشرفته' | 'متوسط تا پیشرفته'

const LEVEL_CLASS: Record<Level, string> = {
  'مبتدی': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'متوسط': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'پیشرفته': 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'مبتدی تا پیشرفته': 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  'متوسط تا پیشرفته': 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
}

const BOOKS: { title: string; level: Level; good: string }[] = [
  { title: '۵۰۴ واژه‌ی کاملاً ضروری', level: 'مبتدی', good: 'شروع پایه و تقویت واژگان روزمره' },
  { title: '۴۰۰۰ واژه‌ی ضروری (۶ جلد)', level: 'مبتدی تا پیشرفته', good: 'مسیر مرحله‌به‌مرحله و مدرج' },
  { title: 'Oxford Word Skills', level: 'مبتدی تا پیشرفته', good: 'یادگیری واژه بر پایه‌ی موضوع (سه سطح)' },
  { title: '۱۰۰۰ باهم‌آیی انگلیسی', level: 'متوسط', good: 'ترکیب‌های طبیعی و پرکاربرد کلمات' },
  { title: 'افعال عبارتی در کاربرد', level: 'متوسط', good: 'phrasal verbهای رایج مکالمه' },
  { title: 'Street Talk 1', level: 'متوسط', good: 'زبان محاوره و اصطلاحات روزمره' },
  { title: "۱۱۰۰ واژه‌ی Barron", level: 'پیشرفته', good: 'تقویت جدی واژگان آکادمیک' },
  { title: "واژگان ضروری GRE (Barron)", level: 'پیشرفته', good: 'آمادگی آزمون GRE' },
  { title: "واژگان ضروری IELTS (Barron)", level: 'متوسط تا پیشرفته', good: 'آمادگی آزمون آیلتس' },
  { title: "واژگان ضروری TOEFL (Barron)", level: 'متوسط تا پیشرفته', good: 'آمادگی آزمون تافل' },
]

const ANSWERS: { label: string; desc: string; dot: string }[] = [
  { label: 'دوباره', desc: 'یادت نبود؛ کلمه همین امروز دوباره برمی‌گردد.', dot: 'bg-rose-500' },
  { label: 'سخت', desc: 'با تلاش یادت آمد؛ فاصله‌ی مرور بعدی کوتاه می‌ماند.', dot: 'bg-amber-500' },
  { label: 'آسان', desc: 'راحت یادت بود؛ فاصله‌ی مرور بعدی بلندتر می‌شود.', dot: 'bg-emerald-500' },
  { label: 'رد کردن', desc: 'فعلاً بی‌خیال این کارت؛ بدون تغییر در زمان‌بندی.', dot: 'bg-slate-400' },
]

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function GuidePage() {
  return (
    <div dir="rtl" className="mx-auto max-w-2xl px-4 py-8 font-persian">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-foreground">راهنمای شروع</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          چند دقیقه وقت بگذار تا با قلب اپلیکیشن آشنا شوی: چطور کلمه‌ها را برای همیشه به یاد
          بسپاری و از کجا شروع کنی.
        </p>
      </header>

      <div className="space-y-12">
        {/* ── SM-2 ─────────────────────────────────────────────────────── */}
        <Section icon={<Repeat className="h-5 w-5" />} title="سیستم مرور چطور کار می‌کند؟">
          <div className="space-y-4 text-[15px] leading-8 text-muted-foreground">
            <p>
              مغز ما کلمه‌های تازه را به‌سرعت فراموش می‌کند؛ به این پدیده «منحنی فراموشی»
              می‌گویند. راه‌حلِ اثبات‌شده، <strong className="text-foreground">تکرار فاصله‌دار</strong> است:
              هر کلمه را دقیقاً کمی پیش از آنکه فراموشش کنی دوباره مرور می‌کنی.
            </p>
            <p>
              وکب از الگوریتم <strong className="text-foreground">SM-2</strong> استفاده می‌کند. با هر
              مرورِ موفق، فاصله‌ی مرور بعدی بیشتر می‌شود — از یک روز به چند روز و بعد به چند
              هفته. به این ترتیب کلمه پله‌پله از حافظه‌ی کوتاه‌مدت به{' '}
              <strong className="text-foreground">حافظه‌ی بلندمدت</strong> منتقل می‌شود و ماندگار
              می‌ماند.
            </p>
            <p>
              در «مطالعه‌ی امروز» هر روز دو دسته کارت می‌بینی: کلمه‌های سررسیدشده (که وقت
              مرورشان است) و چند کلمه‌ی جدید طبق برنامه‌ات. برای هر کارت یکی از این پاسخ‌ها را
              می‌دهی:
            </p>
          </div>

          <ul className="space-y-2.5 rounded-xl border border-border bg-card/50 p-4">
            {ANSWERS.map((a) => (
              <li key={a.label} className="flex items-start gap-3 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                <span className="leading-7 text-muted-foreground">
                  <strong className="text-foreground">{a.label}:</strong> {a.desc}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-[15px] leading-8 text-muted-foreground">
            کافی است هر روز چند دقیقه ثابت‌قدم باشی؛ باقی کار — یعنی اینکه چه کلمه‌ای در چه
            روزی مرور شود — با الگوریتم است.
          </p>
        </Section>

        {/* ── Which book ───────────────────────────────────────────────── */}
        <Section icon={<BookOpen className="h-5 w-5" />} title="با کدام کتاب شروع کنم؟">
          <p className="text-[15px] leading-8 text-muted-foreground">
            لازم نیست همه‌ی کتاب‌ها را باز کنی. یک کتاب متناسب با سطحت انتخاب کن، برایش برنامه
            بگذار و روی همان تمرکز کن.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[420px] text-right text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">کتاب</th>
                  <th className="px-3 py-2.5 font-semibold">سطح</th>
                  <th className="px-3 py-2.5 font-semibold">مناسب برای</th>
                </tr>
              </thead>
              <tbody>
                {BOOKS.map((b, i) => (
                  <tr
                    key={b.title}
                    className={i % 2 ? 'bg-muted/20' : ''}
                  >
                    <td className="px-3 py-2.5 font-medium text-foreground">{b.title}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_CLASS[b.level]}`}
                      >
                        {b.level}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 leading-6 text-muted-foreground">{b.good}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm leading-7 text-foreground">
              <strong>پیشنهاد ما:</strong> اگر تازه‌کاری، با «۵۰۴ واژه» یا جلد ۱ از «۴۰۰۰ واژه»
              شروع کن. اگر برای آزمون آماده می‌شوی، مستقیم سراغ کتاب Barron همان آزمون (GRE،
              آیلتس یا تافل) برو.
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}
