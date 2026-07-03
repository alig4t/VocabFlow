import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Brain,
  BarChart3,
  Target,
  Zap,
  Trophy,
  Layers,
  Star,
  Users,
  ArrowLeft,
  Check,
  Sparkles,
  Blocks,
  Link2,
  Repeat,
  CalendarCheck,
  Flame,
  GraduationCap,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

// ─── Deterministic pseudo-random (no hydration mismatch) ─────────────────────
function pseudo(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// ─── Floating English words config ───────────────────────────────────────────
const WORD_LIST = [
  'Afraid', 'Battle', 'Century', 'Danger', 'Elegant', 'Freedom',
  'Grace', 'Harmony', 'Inspire', 'Journey', 'Knowledge', 'Language',
  'Master', 'Noble', 'Origin', 'Passion', 'Reason', 'Skill',
  'Transform', 'Unique', 'Victory', 'Wisdom', 'Achieve', 'Beyond',
  'Create', 'Dream', 'Explore', 'Focus', 'Growth', 'Honor',
]

interface WordConfig {
  word: string
  top: string
  left: string
  fontSize: number
  maxOpacity: number
  duration: string
  delay: string
}

function useFloatingWords(count: number): WordConfig[] {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const topPct = 3 + pseudo(i * 3) * 88
      const leftPct = 2 + pseudo(i * 7) * 92
      // Headline text sits on the right half, vertically centered — keep those
      // faint so the copy stays readable.
      const inTextBand = leftPct > 46 && topPct > 22 && topPct < 74
      // Upper region (the empty space above the book stack) — make these denser,
      // larger and bolder so the area feels alive.
      const inUpperBand = topPct < 32
      let maxOpacity: number
      if (inTextBand) maxOpacity = 0.05 + pseudo(i * 11) * 0.05
      else if (inUpperBand) maxOpacity = 0.30 + pseudo(i * 11) * 0.32
      else maxOpacity = 0.14 + pseudo(i * 11) * 0.20
      const fontSize = inUpperBand
        ? 16 + pseudo(i * 5) * 22
        : 11 + pseudo(i * 5) * 14
      return {
        word: WORD_LIST[i % WORD_LIST.length],
        top: `${topPct}%`,
        left: `${leftPct}%`,
        fontSize: Math.round(fontSize),
        maxOpacity,
        duration: `${9 + pseudo(i * 13) * 10}s`,
        delay: `${pseudo(i * 17) * 9}s`,
      }
    })
  }, [count])
}

// ─── Hero book fan — real covers, phrasal & collocation featured ──────────────
const HERO_BOOKS = [
  { src: '/books/Essentaial-words-for-the-ielts.png', rotate: -27, left: 4,   w: 104, z: 2 },
  { src: '/books/oxford-word-skills-advanced.webp',   rotate: -18, left: 52,  w: 116, z: 3 },
  { src: '/books/1000-collocation.png',               rotate: -9,  left: 104, w: 130, z: 4 },
  { src: '/books/4000-v3.webp',                        rotate: -2,  left: 162, w: 146, z: 6 },
  { src: '/books/english-phrasal-verbs-in-use.png',    rotate: 4,   left: 224, w: 152, z: 10 }, // hero
  { src: '/books/4000-v1.webp',                        rotate: 12,  left: 288, w: 138, z: 5 },
  { src: '/books/oxford-word-skills-basic.webp',       rotate: 20,  left: 342, w: 120, z: 3 },
  { src: '/books/street-talk.png',                     rotate: 28,  left: 392, w: 106, z: 2 },
]

// ─── Full library for the marquee showcase ────────────────────────────────────
const LIBRARY = [
  { src: '/books/4000-v1.webp', label: '4000 Essential Words · 1' },
  { src: '/books/4000-v2.webp', label: '4000 Essential Words · 2' },
  { src: '/books/4000-v3.webp', label: '4000 Essential Words · 3' },
  { src: '/books/4000-v4.webp', label: '4000 Essential Words · 4' },
  { src: '/books/oxford-word-skills-basic.webp', label: 'Oxford Word Skills · Basic' },
  { src: '/books/oxford-word-skills-intermediate.webp', label: 'Oxford Word Skills · Intermediate' },
  { src: '/books/oxford-word-skills-advanced.webp', label: 'Oxford Word Skills · Advanced' },
  { src: '/books/english-phrasal-verbs-in-use.png', label: 'English Phrasal Verbs in Use' },
  { src: '/books/1000-collocation.png', label: '1000 English Collocations' },
  { src: '/books/Essentaial-words-for-the-ielts.png', label: 'Essential Words · IELTS' },
  { src: '/books/Essentaial-words-for-the-toefl.png', label: 'Essential Words · TOEFL' },
  { src: '/books/Essentaial-words-for-the-GRE-1.png', label: 'Essential Words · GRE' },
  { src: '/books/street-talk.png', label: 'Street Talk · Slang & Idioms' },
  { src: '/books/4000-v5.webp', label: '4000 Essential Words · 5' },
  { src: '/books/4000-v6.webp', label: '4000 Essential Words · 6' },
]

// ─── Content pillars — the three learning tracks ──────────────────────────────
const PILLARS = [
  {
    icon: BookOpen,
    tag: 'واژگان',
    en: 'Words',
    title: 'لغات ضروری',
    desc: 'هزاران واژه پرکاربرد با تلفظ، معنی، مترادف و مثال — از پایه تا آزمون‌های IELTS و TOEFL.',
    sample: { eng: 'elegant', per: 'شیک، ظریف' },
    ring: 'ring-amber-400/30',
    glow: 'from-amber-400/20',
    chip: 'bg-amber-400/15 text-amber-300 border-amber-400/25',
  },
  {
    icon: Blocks,
    tag: 'افعال عبارتی',
    en: 'Phrasal Verbs',
    title: 'Phrasal Verbs',
    desc: 'ترکیب فعل با حرف اضافه که معنی تازه می‌سازد — با الگو، مثال و ترجمه روان فارسی.',
    sample: { eng: 'give up', per: 'تسلیم شدن، دست کشیدن' },
    ring: 'ring-sky-400/30',
    glow: 'from-sky-400/20',
    chip: 'bg-sky-400/15 text-sky-300 border-sky-400/25',
  },
  {
    icon: Link2,
    tag: 'باهم‌آیی‌ها',
    en: 'Collocations',
    title: 'Collocations',
    desc: 'کلماتی که همیشه با هم می‌آیند و انگلیسی شما را طبیعی می‌کنند — بیش از ۱۰۰۰ ترکیب رایج.',
    sample: { eng: 'make a decision', per: 'تصمیم گرفتن' },
    ring: 'ring-emerald-400/30',
    glow: 'from-emerald-400/20',
    chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25',
  },
]

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Layers,
    title: 'فلش‌کارت دو طرفه',
    desc: 'انگلیسی به فارسی یا فارسی به انگلیسی — حالت مرور را خودتان انتخاب کنید.',
  },
  {
    icon: Target,
    title: 'فیلتر هوشمند',
    desc: 'فقط لغاتی که هنوز یاد نگرفته‌اید را با تمرکز بیشتر مرور کنید.',
  },
  {
    icon: BarChart3,
    title: 'داشبورد پیشرفت',
    desc: 'نوار پیشرفت هر کتاب، آمار روزانه و درصد تسلط شما همیشه پیش چشم است.',
  },
  {
    icon: Brain,
    title: 'مترادف و متضاد',
    desc: 'برای هر لغت، هم‌معنی‌ها و متضادها را ببینید و دایره واژگان را گسترش دهید.',
  },
  {
    icon: BookOpen,
    title: 'مثال‌های واقعی',
    desc: 'هر لغت، عبارت و باهم‌آیی با جمله مثال انگلیسی و ترجمه فارسی همراه است.',
  },
  {
    icon: CalendarCheck,
    title: 'نقشه فعالیت',
    desc: 'مثل گیت‌هاب، روزهای مطالعه‌تان را ببینید و رشته یادگیری‌تان را حفظ کنید.',
  },
  {
    icon: Repeat,
    title: 'مرور فاصله‌دار',
    desc: 'صف مرور هوشمند، لغات را دقیقاً زمانی که در آستانه فراموشی هستند برمی‌گرداند.',
  },
  {
    icon: Users,
    title: 'حساب مستقل',
    desc: 'پیشرفت، آمار و کتاب‌های هر کاربر کاملاً جدا و شخصی نگه‌داری می‌شود.',
  },
]

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '۱',
    title: 'ثبت‌نام رایگان',
    desc: 'در چند ثانیه حساب بسازید. هیچ پرداختی لازم نیست.',
    icon: Check,
  },
  {
    num: '۲',
    title: 'کتاب‌ها را انتخاب کنید',
    desc: 'از میان لغات، افعال عبارتی و باهم‌آیی‌ها، مسیر خود را بچینید.',
    icon: Zap,
  },
  {
    num: '۳',
    title: 'هر روز مرور کنید',
    desc: 'چند دقیقه در روز مرور کنید و پیشرفت واقعی‌تان را در داشبورد ببینید.',
    icon: Trophy,
  },
]

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'نیلوفر احمدی',
    role: 'دانشجوی کارشناسی ارشد',
    avatar: 'ن',
    text: 'بهترین روش برای یادگیری لغات تخصصی. با این پلتفرم ظرف سه ماه واژگانم دو برابر شد.',
  },
  {
    name: 'رضا مرادی',
    role: 'مترجم حرفه‌ای',
    avatar: 'ر',
    text: 'بخش افعال عبارتی و باهم‌آیی‌ها فوق‌العاده‌ست؛ حالا انگلیسی‌ام خیلی طبیعی‌تر شده.',
  },
  {
    name: 'سارا کریمی',
    role: 'زبان‌آموز آیلتس',
    avatar: 'س',
    text: 'نوار پیشرفت و فیلتر «هنوز یاد نگرفتم» کمکم کرد دقیقاً روی نقاط ضعفم تمرکز کنم.',
  },
]

// ─── Brand logo mark (white app-icon chip) ────────────────────────────────────
function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl bg-white shadow-lg shadow-amber-950/30 ring-1 ring-white/20"
      style={{ width: size, height: size }}
    >
      <img
        src="/logo/logo-192-192.png"
        alt="وکب"
        width={size}
        height={size}
        className="h-full w-full object-contain p-1"
        draggable={false}
      />
    </div>
  )
}

// ─── Mini stat pill ───────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-2xl font-bold leading-none text-white">{value}</span>
      <span className="text-[11px] leading-none text-white/45">{label}</span>
    </div>
  )
}

// ─── One book cover for the marquee ───────────────────────────────────────────
function CoverCard({ src, label }: { src: string; label: string }) {
  return (
    <div className="group relative w-[132px] shrink-0 sm:w-[150px]">
      <div className="relative aspect-[7/10] overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-xl shadow-black/40 transition-transform duration-300 group-hover:-translate-y-1.5">
        <img
          src={src}
          alt={label}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
        {/* gold shine on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber-500/0 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:from-amber-500/20 group-hover:opacity-100" />
      </div>
      <p className="mt-2.5 line-clamp-1 text-center text-[11px] text-white/40" title={label}>
        {label}
      </p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const words = useFloatingWords(44)
  const marquee = [...LIBRARY, ...LIBRARY]

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#0a0f1a] font-persian text-white">

      {/* ════════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════════ */}
      <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#0a0f1a]/70 px-5 backdrop-blur-xl sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark size={36} />
          <div className="leading-none">
            <span className="block text-[15px] font-extrabold tracking-tight">وکب</span>
            <span className="block text-[10px] text-amber-300/70">VocabFlow</span>
          </div>
        </Link>

        <div className="hidden items-center gap-7 text-[13px] text-white/55 md:flex">
          {[['#pillars', 'مسیرها'], ['#library', 'کتابخانه'], ['#features', 'ویژگی‌ها'], ['#how', 'نحوه کار']].map(([href, label]) => (
            <a key={href} href={href} className="transition-colors duration-200 hover:text-white">{label}</a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-semibold text-[#1a1206] transition-all hover:bg-amber-400 hover:scale-105 active:scale-100"
            >
              <span>ورود به پنل</span>
              <ArrowLeft size={13} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden px-3 py-1.5 text-[13px] text-white/55 transition-colors hover:text-white sm:block">
                ورود
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-semibold text-[#1a1206] shadow-md shadow-amber-900/40 transition-all hover:bg-amber-400 hover:scale-105 active:scale-100"
              >
                شروع رایگان
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        {/* Background gradient — deep navy */}
        <div className="absolute inset-0 bg-gradient-to-bl from-[#0a0f1a] via-[#101a30] to-[#0b1424]" />

        {/* Ambient light orbs (navy + gold) */}
        <div className="orb absolute right-[34%] top-[18%] h-[480px] w-[480px] rounded-full bg-amber-500/12 blur-[100px]" />
        <div className="orb absolute bottom-[18%] left-[18%] h-[380px] w-[380px] rounded-full bg-sky-500/10 blur-[90px]" style={{ animationDelay: '2s' }} />
        <div className="orb absolute left-[52%] top-[48%] h-[300px] w-[300px] rounded-full bg-amber-400/8 blur-[70px]" style={{ animationDelay: '4s' }} />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #e4a824 1px, transparent 1px)',
            backgroundSize: '38px 38px',
          }}
        />

        {/* Floating English words */}
        {words.map((w, i) => (
          <span
            key={i}
            className="float-word pointer-events-none absolute select-none font-mono font-semibold tracking-tight text-amber-200"
            style={{
              top: w.top,
              left: w.left,
              fontSize: w.fontSize,
              opacity: w.maxOpacity,
              animationDuration: w.duration,
              animationDelay: w.delay,
              ['--word-max-opacity' as string]: w.maxOpacity,
            } as React.CSSProperties}
          >
            {w.word}
          </span>
        ))}

        {/* Hero content */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col-reverse items-center gap-14 px-6 pb-20 pt-28 sm:px-10 lg:flex-row-reverse lg:gap-10">

          {/* ── Books visual ── */}
          <div className="flex min-w-0 flex-1 items-end justify-center pb-4 lg:pb-0">
            <div className="relative select-none" style={{ width: 510, height: 370 }}>
              {/* Ground glow */}
              <div className="absolute -bottom-3 left-1/2 h-8 w-80 -translate-x-1/2 rounded-full bg-amber-500/25 blur-2xl" />

              {/* Particle dots */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-1 w-1 rounded-full bg-amber-300/60"
                  style={{
                    top: `${15 + pseudo(i * 31) * 65}%`,
                    left: `${5 + pseudo(i * 43) * 88}%`,
                    opacity: 0.3 + pseudo(i * 7) * 0.5,
                  }}
                />
              ))}

              {/* Books */}
              {HERO_BOOKS.map((book, i) => (
                <img
                  key={i}
                  src={book.src}
                  alt=""
                  draggable={false}
                  className="landing-book absolute"
                  style={{
                    bottom: i === 4 ? 10 : 0,
                    left: book.left,
                    width: book.w,
                    zIndex: book.z,
                    transformOrigin: 'bottom center',
                    transform: `rotate(${book.rotate}deg)`,
                    borderRadius: 6,
                    filter: `drop-shadow(0 10px 24px rgba(0,0,0,0.7))${i === 4 ? ' drop-shadow(0 0 22px rgba(228,168,36,0.4))' : ''}`,
                  }}
                />
              ))}

              {/* Floating tags */}
              <div
                className="absolute z-20 rounded-full border border-amber-400/30 bg-amber-500/85 px-3 py-1.5 text-[11px] font-bold text-[#1a1206] shadow-xl backdrop-blur-md"
                style={{ top: '6%', right: '4%' }}
              >
                ۱۳+ کتاب مرجع
              </div>
              <div
                className="absolute z-20 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-md"
                style={{ bottom: '10%', left: '2%' }}
              >
                Phrasal + Collocations
              </div>
            </div>
          </div>

          {/* ── Text ── */}
          <div className="min-w-0 flex-1 text-right">
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3.5 py-1.5 text-xs text-amber-300"
              style={{ animation: 'badge-glow 3s ease-in-out infinite' }}
            >
              <Sparkles size={12} />
              <span>پلتفرم جامع یادگیری واژگان انگلیسی</span>
            </div>

            <h1 className="mb-6 text-[2.6rem] font-extrabold leading-[1.18] sm:text-5xl lg:text-[3.4rem]">
              <span className="block text-white">واژه‌ها را</span>
              <span className="block bg-gradient-to-l from-amber-300 via-amber-400 to-yellow-500 bg-clip-text pb-1 text-transparent">
                عمیق یاد بگیر
              </span>
              <span className="block text-white">نه فقط حفظ کن</span>
            </h1>

            <p className="mb-9 max-w-md text-[1.05rem] leading-[1.9] text-white/55">
              لغات، افعال عبارتی و باهم‌آیی‌ها را با فلش‌کارت دوطرفه، مثال‌های واقعی
              و داشبورد پیشرفت شخصی مرور کنید — همه در یک پلتفرم فارسی.
            </p>

            <div className="mb-10 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-amber-500 to-yellow-500 px-6 py-3.5 font-bold text-[#1a1206] shadow-xl shadow-amber-900/40 transition-all hover:scale-[1.04] hover:from-amber-400 hover:to-yellow-400 active:scale-100"
              >
                <span>همین حالا شروع کن</span>
                <ArrowLeft size={15} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3.5 font-medium text-white/80 backdrop-blur-sm transition-all hover:scale-[1.04] hover:bg-white/[0.12] hover:text-white active:scale-100"
              >
                ورود به حساب
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <StatPill value="۲۰٬۰۰۰+" label="لغت و عبارت" />
              <div className="h-8 w-px bg-white/10" />
              <StatPill value="۱۳+" label="کتاب مرجع" />
              <div className="h-8 w-px bg-white/10" />
              <StatPill value="۳" label="مسیر یادگیری" />
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2.5 rtl:space-x-reverse">
                  {['from-amber-300 to-yellow-500', 'from-sky-400 to-cyan-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500'].map((g, i) => (
                    <div key={i} className={`h-7 w-7 rounded-full bg-gradient-to-br ${g} border-2 border-[#101a30]`} />
                  ))}
                </div>
                <span className="text-[11px] text-white/40">یادگیرنده فعال</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <svg viewBox="0 0 1440 72" preserveAspectRatio="none" className="h-[72px] w-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,36 C240,72 480,0 720,36 C960,72 1200,0 1440,36 L1440,72 L0,72 Z" fill="#0a0f1a" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          TRUST BAR
      ════════════════════════════════════════════════════════════ */}
      <div className="border-y border-white/[0.05] bg-[#0a0f1a] py-10">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-6 text-center text-xs uppercase tracking-widest text-white/30">یک کتابخانه کامل در جیب شما</p>
          <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {[
              ['۲۰٬۰۰۰+', 'لغت و عبارت'],
              ['۱۳+', 'کتاب مرجع'],
              ['۳ مسیر', 'واژه · عبارت · باهم‌آیی'],
              ['۲ حالت', 'مرور دوطرفه'],
            ].map(([n, l]) => (
              <div key={l} className="flex flex-col items-center gap-1">
                <span className="bg-gradient-to-l from-amber-300 to-yellow-500 bg-clip-text text-2xl font-bold text-transparent">{n}</span>
                <span className="text-xs text-white/40">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          CONTENT PILLARS  (the three learning tracks)
      ════════════════════════════════════════════════════════════ */}
      <section id="pillars" className="bg-[#0a0f1a] py-28">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">سه مسیر، یک هدف</p>
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              فراتر از حفظ کردن لغت
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/45">
              زبان طبیعی فقط واژه نیست. وکب سه لایه کلیدی زبان را به شما می‌آموزد
              تا انگلیسی شما روان و واقعی شود.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-7 text-right ring-1 ring-inset ${p.ring} transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/[0.05]`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className={`pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-gradient-to-tr ${p.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`} />

                <div className="mb-5 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${p.chip}`}>
                    {p.en}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white">
                    <p.icon size={22} strokeWidth={1.8} />
                  </div>
                </div>

                <h3 className="mb-1 text-lg font-bold text-white">{p.tag}</h3>
                <p className="mb-5 text-sm leading-relaxed text-white/50">{p.desc}</p>

                {/* mini flashcard preview */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="mb-1 font-mono text-lg font-bold text-white" dir="ltr">{p.sample.eng}</div>
                  <div className="text-sm text-white/50">{p.sample.per}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          LIBRARY SHOWCASE  (real covers, marquee)
      ════════════════════════════════════════════════════════════ */}
      <section id="library" className="relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] via-[#0e1830] to-[#0a0f1a]" />
        <div className="absolute left-1/2 top-1/3 h-[280px] w-[680px] -translate-x-1/2 rounded-full bg-amber-500/8 blur-[90px]" />

        <div className="relative z-10">
          <div className="mx-auto mb-14 max-w-6xl px-6 text-center sm:px-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">کتابخانه</p>
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              معتبرترین منابع واژگان، یک‌جا
            </h2>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-white/45">
              از ۴۰۰۰ لغت ضروری و Oxford Word Skills تا افعال عبارتی، باهم‌آیی‌ها
              و واژگان تخصصی آزمون‌ها — همه به‌صورت فلش‌کارت آماده مرور.
            </p>
          </div>

          {/* marquee row 1 — forced LTR so the loop stays seamless on an RTL page */}
          <div dir="ltr" className="marquee-mask relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0a0f1a] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0a0f1a] to-transparent" />
            <div className="marquee-track flex gap-6 px-3">
              {marquee.map((b, i) => (
                <CoverCard key={i} src={b.src} label={b.label} />
              ))}
            </div>
          </div>

          <div className="mt-14 text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-3 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-400/20"
            >
              <GraduationCap size={16} />
              کاوش کل کتابخانه
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════════════════════ */}
      <section id="features" className="bg-[#0a0f1a] py-28">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">چرا وکب؟</p>
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              همه‌چیز برای یادگیری واقعی
            </h2>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-white/45">
              ابزارهایی که یادگیری واژگان را از یک کار خسته‌کننده به عادتی روزانه و لذت‌بخش تبدیل می‌کند.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 text-right transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/[0.05]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <f.icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/45">{f.desc}</p>
                <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-amber-500/5 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          DASHBOARD PREVIEW
      ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] via-[#0d1526] to-[#0a0f1a]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* copy */}
            <div className="text-right">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">داشبورد شخصی</p>
              <h2 className="mb-5 text-3xl font-bold text-white sm:text-4xl">
                پیشرفتت را می‌بینی، پس ادامه می‌دهی
              </h2>
              <p className="mb-8 text-sm leading-relaxed text-white/50">
                هر کتاب نوار پیشرفت مخصوص خودش را دارد. رشته یادگیری، آمار روزانه،
                لغات آماده مرور و درصد تسلط — همه در یک نگاه.
              </p>
              <ul className="space-y-3.5">
                {[
                  ['نوار پیشرفت هر کتاب', 'درصد لغات یادگرفته‌شده را زنده دنبال کنید.'],
                  ['صف مرور هوشمند', 'دقیقاً بدانید امروز کدام لغات را باید مرور کنید.'],
                  ['نقشه فعالیت و رشته', 'انگیزه‌تان را با حفظ رشته روزهای مطالعه بالا نگه دارید.'],
                ].map(([t, d]) => (
                  <li key={t} className="flex items-start gap-3 text-right">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                      <Check size={13} strokeWidth={2.5} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{t}</p>
                      <p className="text-[13px] text-white/45">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* mock dashboard */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-amber-500/10 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#0e1626]/90 p-5 shadow-2xl backdrop-blur-sm">
                {/* stat strip */}
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { icon: Flame, v: '۱۲', l: 'روز رشته' },
                    { icon: Trophy, v: '۸۴۰', l: 'لغت آموخته' },
                    { icon: Target, v: '۷۳٪', l: 'دقت مرور' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.045] ring-1 ring-inset ring-white/[0.04] p-3 text-center">
                      <s.icon size={16} className="mx-auto mb-1.5 text-amber-300" />
                      <div className="text-lg font-bold text-white">{s.v}</div>
                      <div className="text-[10px] text-white/40">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* book progress list */}
                <div className="space-y-3">
                  {[
                    { title: '4000 Essential Words · 3', pct: 78, tint: 'from-amber-400 to-yellow-500' },
                    { title: 'English Phrasal Verbs', pct: 45, tint: 'from-sky-400 to-cyan-500' },
                    { title: '1000 Collocations', pct: 26, tint: 'from-emerald-400 to-teal-500' },
                  ].map((b) => (
                    <div key={b.title} className="rounded-xl bg-white/[0.045] ring-1 ring-inset ring-white/[0.04] p-3.5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-amber-300">{b.pct}٪</span>
                        <span className="text-[13px] font-medium text-white/85" dir="ltr">{b.title}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full bg-gradient-to-l ${b.tint}`} style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* mini heatmap */}
                <div className="mt-4 rounded-xl bg-white/[0.045] ring-1 ring-inset ring-white/[0.04] p-3.5">
                  <div className="mb-2 text-right text-[11px] text-white/40">فعالیت ۵ هفته اخیر</div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {[...Array(35)].map((_, i) => {
                      const lvl = Math.floor(pseudo(i * 5) * 5)
                      const shades = ['bg-white/8', 'bg-amber-500/25', 'bg-amber-500/45', 'bg-amber-500/70', 'bg-amber-400']
                      return <div key={i} className={`h-3 w-3 rounded-[3px] ${shades[lvl]}`} />
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          REVIEW MODES SHOWCASE
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0a0f1a] py-24">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">حالت‌های مرور</p>
            <h2 className="mb-3 text-3xl font-bold text-white">دو جهت یادگیری، در یک فلش‌کارت</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* EN → FA */}
            <div className="group relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] p-7 text-right transition-colors hover:border-amber-400/40">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/15 px-3 py-1.5">
                <span className="text-xs font-semibold tracking-wide text-amber-300">EN → FA</span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">انگلیسی به فارسی</h3>
              <p className="mb-5 text-sm leading-relaxed text-white/50">
                کلمه انگلیسی نشان داده می‌شود؛ معنی فارسی را حدس بزنید، سپس نمایان کنید.
              </p>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                <div className="mb-1 font-mono text-2xl font-bold text-white">Afraid</div>
                <div className="text-sm text-white/25">···  معنی را می‌دانید؟  ···</div>
              </div>
            </div>

            {/* FA → EN */}
            <div className="group relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 to-sky-500/[0.02] p-7 text-right transition-colors hover:border-sky-400/40">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-sky-400/25 bg-sky-400/15 px-3 py-1.5">
                <span className="text-xs font-semibold tracking-wide text-sky-300">FA → EN</span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">فارسی به انگلیسی</h3>
              <p className="mb-5 text-sm leading-relaxed text-white/50">
                معنی فارسی نشان داده می‌شود؛ کلمه انگلیسی معادل را به خاطر بیاورید.
              </p>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                <div className="mb-1 text-2xl font-bold text-white">ترسیده</div>
                <div className="text-sm text-white/25">···  کلمه انگلیسی چیست؟  ···</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════ */}
      <section id="how" className="relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] via-[#0e1830] to-[#0a0f1a]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/8 blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 sm:px-10">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">مراحل</p>
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">سه قدم تا شروع یادگیری</h2>
          </div>

          <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="absolute right-[16.6%] left-[16.6%] top-9 hidden h-px bg-gradient-to-l from-transparent via-amber-500/30 to-transparent md:block" />
            {STEPS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-4 text-center">
                <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-3xl font-bold text-[#1a1206] shadow-2xl shadow-amber-900/40">
                  {s.num}
                  <div className="absolute inset-0 rounded-2xl bg-white/10" />
                </div>
                <h3 className="text-base font-semibold text-white">{s.title}</h3>
                <p className="mx-auto max-w-[220px] text-sm leading-relaxed text-white/45">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="relative overflow-hidden bg-[#0a0f1a] py-28">
        <div className="relative z-10 mx-auto max-w-5xl px-6 sm:px-10">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">نظرات</p>
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              یادگیرندگان درباره وکب چه می‌گویند؟
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 text-right transition-colors hover:border-white/[0.13]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="mb-4 flex flex-row-reverse items-center justify-start gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-6 text-[13.5px] leading-[1.85] text-white/60">«{t.text}»</p>
                <div className="flex flex-row-reverse items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-sm font-bold text-[#1a1206]">
                    {t.avatar}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold leading-tight text-white">{t.name}</div>
                    <div className="mt-0.5 text-[11px] text-white/35">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/25 via-[#0e1830] to-[#0a0f1a]" />
        <div className="orb absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[80px]" />

        {['Achieve', 'Master', 'Fluent', 'Success', 'Confident'].map((w, i) => (
          <span
            key={w}
            className="float-word pointer-events-none absolute select-none font-mono text-amber-100/10"
            style={{
              top: `${20 + i * 14}%`,
              left: `${5 + pseudo(i * 37) * 85}%`,
              fontSize: `${18 + i * 4}px`,
              animationDuration: `${12 + i * 2}s`,
              animationDelay: `${i * 2}s`,
            }}
          >
            {w}
          </span>
        ))}

        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <div className="mb-8 inline-flex items-center justify-center">
            <LogoMark size={56} />
          </div>
          <div className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-4 py-1.5">
            <Sparkles size={13} className="text-amber-400" />
            <span className="text-xs text-white/60">رایگان شروع کنید</span>
          </div>

          <h2 className="mb-5 text-3xl font-bold text-white sm:text-4xl">
            آماده‌ای انگلیسی‌ات را زیر و رو کنی؟
          </h2>
          <p className="mb-10 text-base leading-relaxed text-white/50">
            همین حالا ثبت‌نام کن، کتاب‌هایت را انتخاب کن و پیشرفتت را
            روز به روز تماشا کن — کاملاً رایگان.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-yellow-500 px-8 py-4 text-base font-bold text-[#1a1206] shadow-2xl shadow-amber-900/50 transition-all hover:scale-[1.04] hover:from-amber-400 hover:to-yellow-400 active:scale-100 sm:w-auto"
            >
              <span>ثبت‌نام رایگان</span>
              <ArrowLeft size={17} />
            </Link>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-8 py-4 text-base font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white sm:w-auto"
            >
              قبلاً عضو شدم
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            {['بدون نیاز به کارت اعتباری', 'شروع فوری', 'پیشرفت کاملاً شخصی'].map((chip) => (
              <div key={chip} className="flex items-center gap-1.5 text-xs text-white/35">
                <Check size={12} className="shrink-0 text-emerald-400" />
                {chip}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.06] bg-[#0a0f1a] py-10">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <LogoMark size={32} />
              <div className="leading-none">
                <span className="block text-sm font-bold text-white/80">وکب</span>
                <span className="block text-[10px] text-white/35">پلتفرم یادگیری واژگان انگلیسی</span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-white/25">
              <a href="#pillars" className="transition-colors hover:text-white/60">مسیرها</a>
              <a href="#library" className="transition-colors hover:text-white/60">کتابخانه</a>
              <Link to="/register" className="transition-colors hover:text-white/60">ثبت‌نام</Link>
              <Link to="/login" className="transition-colors hover:text-white/60">ورود</Link>
            </div>

            <p className="text-xs text-white/20">© ۱۴۰۴ — تمام حقوق محفوظ است</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
