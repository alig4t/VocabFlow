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
      const topPct = 5 + pseudo(i * 3) * 85
      const leftPct = 2 + pseudo(i * 7) * 92
      // Central band = where the hero headline + book stack sit. Words landing
      // there are kept very faint so the text underneath stays readable.
      const inContentBand = topPct > 14 && topPct < 82 && leftPct > 10 && leftPct < 90
      const base = 0.10 + pseudo(i * 11) * 0.22
      return {
        word: WORD_LIST[i % WORD_LIST.length],
        top: `${topPct}%`,
        left: `${leftPct}%`,
        fontSize: Math.round(10 + pseudo(i * 5) * 14),
        maxOpacity: inContentBand ? 0.06 : base,
        duration: `${9 + pseudo(i * 13) * 10}s`,
        delay: `${pseudo(i * 17) * 9}s`,
      }
    })
  }, [count])
}

// ─── Book stack configuration ─────────────────────────────────────────────────
const BOOKS = [
  { src: '/books/oxford-word-skills-advanced.webp', rotate: -26, left: 0,   w: 100, z: 2  },
  { src: '/books/oxford-word-skills-intermediate.webp', rotate: -17, left: 48,  w: 113, z: 3  },
  { src: '/books/4000-v5.webp',   rotate: -9,  left: 98,  w: 126, z: 4  },
  { src: '/books/4000-v4.webp',   rotate: -3,  left: 152, w: 138, z: 5  },
  { src: '/books/4000-v3.webp',   rotate:  1,  left: 210, w: 152, z: 10 }, // hero book
  { src: '/books/4000-v2.webp',   rotate:  7,  left: 268, w: 138, z: 5  },
  { src: '/books/4000-v1.webp',   rotate: 14,  left: 320, w: 126, z: 4  },
  { src: '/books/oxford-word-skills-basic.webp', rotate: 22,  left: 368, w: 113, z: 3  },
]

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Layers,
    title: 'فلش‌کارت دو طرفه',
    desc: 'انگلیسی به فارسی یا فارسی به انگلیسی — شما انتخاب کنید.',
    gradient: 'from-indigo-500 to-blue-600',
    shadow: 'shadow-indigo-500/25',
  },
  {
    icon: Target,
    title: 'فیلتر هوشمند',
    desc: 'فقط لغاتی که هنوز یاد نگرفتید را با دقت بیشتری مرور کنید.',
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/25',
  },
  {
    icon: BarChart3,
    title: 'آمار پیشرفت شخصی',
    desc: 'هر روز ببینید چقدر یاد گرفتید و چه لغاتی هنوز باقی مانده.',
    gradient: 'from-blue-500 to-cyan-600',
    shadow: 'shadow-blue-500/25',
  },
  {
    icon: Brain,
    title: 'مترادف‌های هوشمند',
    desc: 'لغات هم‌معنی هر کلمه را کشف کنید و دایره لغاتتان را گسترش دهید.',
    gradient: 'from-purple-500 to-pink-600',
    shadow: 'shadow-purple-500/25',
  },
  {
    icon: BookOpen,
    title: 'مثال‌های کاربردی',
    desc: 'هر لغت با جمله مثال انگلیسی و ترجمه فارسی یاد بگیرید.',
    gradient: 'from-cyan-500 to-teal-600',
    shadow: 'shadow-cyan-500/25',
  },
  {
    icon: Users,
    title: 'چند کاربره',
    desc: 'هر نفر پیشرفت، آمار و وضعیت یادگیری جداگانه و مستقل دارد.',
    gradient: 'from-teal-500 to-green-600',
    shadow: 'shadow-teal-500/25',
  },
]

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '۱',
    title: 'ثبت‌نام رایگان',
    desc: 'در چند ثانیه حساب بسازید. هیچ پرداختی لازم نیست.',
    icon: Check,
    color: 'from-indigo-600 to-blue-700',
  },
  {
    num: '۲',
    title: 'حالت مرور را انتخاب کنید',
    desc: 'انگلیسی به فارسی، فارسی به انگلیسی، یا هر دو با هم.',
    icon: Zap,
    color: 'from-purple-600 to-violet-700',
  },
  {
    num: '۳',
    title: 'شروع به یادگیری کنید',
    desc: 'هر روز چند لغت مرور کنید و پیشرفت واقعی خود را ببینید.',
    icon: Trophy,
    color: 'from-blue-600 to-indigo-700',
  },
]

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'نیلوفر احمدی',
    role: 'دانشجوی کارشناسی ارشد',
    avatar: 'ن',
    text: 'بهترین روش برای یادگیری لغات تخصصی. با این پلتفرم ظرف سه ماه واژگانم دو برابر شد.',
    color: 'from-indigo-400 to-purple-500',
  },
  {
    name: 'رضا مرادی',
    role: 'مترجم حرفه‌ای',
    avatar: 'ر',
    text: 'حالت فارسی به انگلیسی فوق‌العاده‌ست. کمکم کرد تسلطم بر واژه‌ها را جدی‌تر بگیرم.',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    name: 'سارا کریمی',
    role: 'زبان‌آموز آیلتس',
    avatar: 'س',
    text: 'آمار پیشرفت و فیلتر «هنوز یاد نگرفتم» خیلی کمکم کرد روی نقاط ضعفم تمرکز کنم.',
    color: 'from-purple-400 to-pink-500',
  },
]

// ─── Mini stat pill ───────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-2xl font-bold text-white leading-none">{value}</span>
      <span className="text-[11px] text-white/45 leading-none">{label}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const words = useFloatingWords(30)

  return (
    <div dir="rtl" className="min-h-screen font-persian bg-[#0c0a1e] text-white overflow-x-hidden">

      {/* ════════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 sm:px-8 h-16 backdrop-blur-xl bg-white/[0.04] border-b border-white/[0.07]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <BookOpen size={15} strokeWidth={2.2} />
          </div>
          <span className="font-bold text-[15px] tracking-tight">یادگیری زبان انگلیسی</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-7 text-[13px] text-white/55">
          {[['#features','ویژگی‌ها'],['#how','نحوه کار'],['#testimonials','نظرات']].map(([href,label])=>(
            <a key={href} href={href} className="hover:text-white transition-colors duration-200">{label}</a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <Link
              to="/vocabulary"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-100"
            >
              <span>ورود به پنل</span>
              <ArrowLeft size={13} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-[13px] text-white/55 hover:text-white transition-colors px-3 py-1.5 hidden sm:block">
                ورود
              </Link>
              <Link
                to="/register"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-100 shadow-md shadow-indigo-900/50"
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
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-bl from-[#0c0a1e] via-[#1a1650] to-[#0d1535]" />

        {/* Ambient light orbs */}
        <div className="orb absolute top-[20%] right-[35%] w-[480px] h-[480px] rounded-full bg-indigo-600/18 blur-[96px]" />
        <div className="orb absolute bottom-[20%] left-[20%] w-[380px] h-[380px] rounded-full bg-purple-600/14 blur-[80px]" style={{ animationDelay: '2s' }} />
        <div className="orb absolute top-[50%] left-[55%] w-[280px] h-[280px] rounded-full bg-blue-500/10 blur-[60px]" style={{ animationDelay: '4s' }} />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #818cf8 1px, transparent 1px)',
            backgroundSize: '38px 38px',
          }}
        />

        {/* Floating English words */}
        {words.map((w, i) => (
          <span
            key={i}
            className="float-word absolute pointer-events-none select-none font-mono text-white"
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
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-28 pb-20 flex flex-col-reverse lg:flex-row-reverse items-center gap-14 lg:gap-10">

          {/* ── Books visual (LEFT in RTL = LTR end) ── */}
          <div className="flex-1 flex justify-center items-end pb-4 lg:pb-0 min-w-0">
            <div className="relative select-none" style={{ width: 490, height: 360 }}>

              {/* Ground glow */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-80 h-8 bg-indigo-500/25 blur-2xl rounded-full" />

              {/* Particle dots around books */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-indigo-400/60"
                  style={{
                    top: `${15 + pseudo(i * 31) * 65}%`,
                    left: `${5 + pseudo(i * 43) * 88}%`,
                    opacity: 0.3 + pseudo(i * 7) * 0.5,
                    animationDelay: `${pseudo(i * 19) * 6}s`,
                  }}
                />
              ))}

              {/* Books */}
              {BOOKS.map((book, i) => (
                <img
                  key={i}
                  src={book.src}
                  alt=""
                  draggable={false}
                  className="landing-book absolute"
                  style={{
                    bottom: i === 4 ? 10 : 0, // center book slightly elevated
                    left: book.left,
                    width: book.w,
                    zIndex: book.z,
                    transformOrigin: 'bottom center',
                    transform: `rotate(${book.rotate}deg)`,
                    filter: `drop-shadow(0 10px 24px rgba(0,0,0,0.65))${i === 4 ? ' drop-shadow(0 0 20px rgba(99,102,241,0.35))' : ''}`,
                  }}
                />
              ))}

              {/* "4000 words" tag floating near books */}
              <div
                className="absolute z-20 bg-indigo-500/80 backdrop-blur-md border border-indigo-400/30 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-xl"
                style={{ top: '8%', right: '5%' }}
              >
                ۴٬۰۰۰ لغت ضروری
              </div>

              {/* "Series 1-6" badge */}
              <div
                className="absolute z-20 bg-white/8 backdrop-blur-md border border-white/15 text-white/80 text-[11px] px-2.5 py-1 rounded-full"
                style={{ bottom: '12%', left: '3%' }}
              >
                ۶ سطح
              </div>
            </div>
          </div>

          {/* ── Text (RIGHT in RTL = LTR start) ── */}
          <div className="flex-1 text-right min-w-0">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs px-3.5 py-1.5 rounded-full mb-7"
              style={{ animation: 'badge-glow 3s ease-in-out infinite' }}
            >
              <Sparkles size={12} />
              <span>پلتفرم یادگیری واژگان انگلیسی</span>
            </div>

            {/* Headline */}
            <h1 className="text-[2.6rem] sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.18] mb-6">
              <span className="block text-white">یادگیری زبان</span>
              <span className="block bg-gradient-to-l from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent pb-1">
                انگلیسی
              </span>
              <span className="block text-white">به سبک حرفه‌ای</span>
            </h1>

            {/* Subheadline */}
            <p className="text-white/55 text-[1.05rem] leading-[1.9] mb-9 max-w-md">
              با فلش‌کارت هوشمند، آمار پیشرفت شخصی و دو حالت مرور،
              مسیر یادگیری ۴٬۰۰۰ لغت ضروری را هوشمندانه طی کنید.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 flex-wrap mb-10">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3.5 rounded-xl shadow-xl shadow-indigo-900/50 transition-all hover:scale-[1.04] active:scale-100"
              >
                <span>همین حالا شروع کن</span>
                <ArrowLeft size={15} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/13 border border-white/15 text-white/80 hover:text-white font-medium px-6 py-3.5 rounded-xl transition-all hover:scale-[1.04] active:scale-100 backdrop-blur-sm"
              >
                ورود به حساب
              </Link>
            </div>

            {/* Mini stats row */}
            <div className="flex items-center gap-5 flex-wrap">
              <div className="h-8 w-px bg-white/10" />
              <StatPill value="۴٬۰۰۰+" label="لغت ضروری" />
              <div className="h-8 w-px bg-white/10" />
              <StatPill value="۶" label="سطح یادگیری" />
              <div className="h-8 w-px bg-white/10" />
              <StatPill value="۲" label="حالت مرور" />
              <div className="h-8 w-px bg-white/10" />
              {/* Avatar stack */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2.5 rtl:space-x-reverse">
                  {['from-indigo-400 to-purple-500','from-purple-400 to-pink-500','from-blue-400 to-cyan-500','from-cyan-400 to-teal-500'].map((g,i)=>(
                    <div key={i} className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} border-2 border-[#1a1650]`} />
                  ))}
                </div>
                <span className="text-[11px] text-white/40">یادگیرنده فعال</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 inset-x-0 pointer-events-none">
          <svg viewBox="0 0 1440 72" preserveAspectRatio="none" className="w-full h-[72px]" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,36 C240,72 480,0 720,36 C960,72 1200,0 1440,36 L1440,72 L0,72 Z" fill="#0c0a1e" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          TRUST BAR
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-[#0c0a1e] py-10 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-white/30 text-xs mb-6 tracking-widest uppercase">ویژگی‌های کلیدی</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              ['۴٬۰۰۰', 'لغت ضروری'],
              ['۶ کتاب', 'مجموعه کامل'],
              ['۲ حالت', 'مرور یادگیری'],
              ['۱۰۰٪', 'پیشرفت شخصی'],
            ].map(([n,l])=>(
              <div key={l} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold bg-gradient-to-l from-indigo-400 to-purple-400 bg-clip-text text-transparent">{n}</span>
                <span className="text-white/40 text-xs">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-28 bg-[#0c0a1e]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">

          <div className="text-center mb-16">
            <p className="text-indigo-400 text-xs font-semibold mb-3 tracking-widest uppercase">چرا ما؟</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              همه چیز در یک پلتفرم
            </h2>
            <p className="text-white/45 max-w-lg mx-auto text-sm leading-relaxed">
              یادگیری واژگان انگلیسی با روشی هوشمندانه، طراحی‌شده خصوصاً برای زبان‌آموزان فارسی‌زبان.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-1.5 text-right overflow-hidden"
              >
                {/* Subtle top highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} shadow-lg ${f.shadow} flex items-center justify-center mb-5 text-white`}>
                  <f.icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>

                {/* Corner glow on hover */}
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════ */}
      <section id="how" className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a1e] via-[#111038] to-[#0c0a1e]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/8 blur-[80px] rounded-full" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <p className="text-purple-400 text-xs font-semibold mb-3 tracking-widest uppercase">مراحل</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              سه قدم تا شروع یادگیری
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-9 right-[16.6%] left-[16.6%] h-px bg-gradient-to-l from-transparent via-indigo-500/30 to-transparent" />

            {STEPS.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-4">
                {/* Number circle */}
                <div className={`relative z-10 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-3xl font-bold shadow-2xl`}>
                  {s.num}
                  <div className="absolute inset-0 rounded-2xl bg-white/10" />
                </div>
                <h3 className="text-white font-semibold text-base">{s.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed max-w-[220px] mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          REVIEW MODES SHOWCASE
      ════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#0c0a1e]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-12">
            <p className="text-indigo-400 text-xs font-semibold mb-3 tracking-widest uppercase">حالت‌های مرور</p>
            <h2 className="text-3xl font-bold text-white mb-3">دو روش یادگیری در یک پلتفرم</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EN → FA card */}
            <div className="relative p-7 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/30 to-indigo-900/10 text-right overflow-hidden group hover:border-indigo-500/40 transition-colors">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:opacity-150 transition-opacity" />

              <div className="inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/25 rounded-lg px-3 py-1.5 mb-5">
                <span className="text-indigo-300 text-xs font-semibold tracking-wide">EN → FA</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">انگلیسی به فارسی</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                کلمه انگلیسی نشان داده می‌شود. معنی فارسی را حدس بزنید، سپس نمایان کنید.
              </p>

              {/* Mock card preview */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">Afraid</div>
                <div className="text-white/25 text-sm">···  معنی را می‌دانید؟  ···</div>
              </div>
            </div>

            {/* FA → EN card */}
            <div className="relative p-7 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 to-purple-900/10 text-right overflow-hidden group hover:border-purple-500/40 transition-colors">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl group-hover:opacity-150 transition-opacity" />

              <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/25 rounded-lg px-3 py-1.5 mb-5">
                <span className="text-purple-300 text-xs font-semibold tracking-wide">FA → EN</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">فارسی به انگلیسی</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                معنی فارسی نشان داده می‌شود. کلمه انگلیسی معادل را به خاطر بیاورید.
              </p>

              {/* Mock card preview */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1 font-persian">ترسیده</div>
                <div className="text-white/25 text-sm">···  کلمه انگلیسی چیست؟  ···</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a1e] via-[#0e0c28] to-[#0c0a1e]" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <p className="text-indigo-400 text-xs font-semibold mb-3 tracking-widest uppercase">نظرات</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              یادگیرندگان درباره ما چه می‌گویند؟
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="relative p-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] text-right group hover:border-white/[0.13] transition-colors"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-4 flex-row-reverse justify-start">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-white/60 text-[13.5px] leading-[1.85] mb-6">«{t.text}»</p>

                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-sm font-bold shrink-0`}>
                    {t.avatar}
                  </div>
                  <div className="text-right">
                    <div className="text-white text-sm font-semibold leading-tight">{t.name}</div>
                    <div className="text-white/35 text-[11px] mt-0.5">{t.role}</div>
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
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/25 to-[#0c0a1e]" />
        <div className="orb absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/15 blur-[80px] rounded-full" />

        {/* Floating words (fewer, larger) in CTA */}
        {['Achieve','Master','Excel','Fluent','Success'].map((w, i) => (
          <span
            key={w}
            className="float-word absolute pointer-events-none select-none font-mono text-white/8"
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

        <div className="relative z-10 max-w-2xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-1.5 bg-white/8 border border-white/12 rounded-full px-4 py-1.5 mb-8">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-white/60 text-xs">رایگان شروع کنید</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            آماده‌ای یادگیری را شروع کنی؟
          </h2>
          <p className="text-white/50 text-base leading-relaxed mb-10">
            همین الان ثبت‌نام کن، پیشرفتت را دنبال کن و زبانت را ارتقا بده — کاملاً رایگان.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl shadow-indigo-900/60 transition-all hover:scale-[1.04] active:scale-100 text-base"
            >
              <span>ثبت‌نام رایگان</span>
              <ArrowLeft size={17} />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/6 hover:bg-white/10 border border-white/12 text-white/70 hover:text-white font-medium px-8 py-4 rounded-2xl transition-all text-base"
            >
              قبلاً عضو شدم
            </Link>
          </div>

          {/* Trust chips */}
          <div className="flex items-center justify-center gap-5 mt-10 flex-wrap">
            {['بدون نیاز به کارت اعتباری','شروع فوری','پیشرفت کاملاً شخصی'].map(chip => (
              <div key={chip} className="flex items-center gap-1.5 text-white/35 text-xs">
                <Check size={12} className="text-green-400 shrink-0" />
                {chip}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.06] bg-[#0c0a1e] py-10">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen size={13} strokeWidth={2.2} />
              </div>
              <span className="text-white/50 text-sm font-medium">پلتفرم یادگیری زبان انگلیسی</span>
            </div>

            <div className="flex items-center gap-6 text-xs text-white/25">
              <Link to="/register" className="hover:text-white/60 transition-colors">ثبت‌نام</Link>
              <Link to="/login" className="hover:text-white/60 transition-colors">ورود</Link>
            </div>

            <p className="text-white/20 text-xs">© ۱۴۰۴ — تمام حقوق محفوظ است</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
