/** Persian/RTL-friendly formatting helpers for the dashboard. */

/** Format a number with Persian digits and grouping (e.g. 4000 → ۴٬۰۰۰). */
export function faNum(value: number): string {
  return value.toLocaleString('fa-IR')
}

/** Percentage with a Persian-digit value (e.g. 52 → ۵۲٪). */
export function faPercent(value: number): string {
  return `${faNum(Math.round(value))}٪`
}

/** Relative date in Persian: امروز / دیروز / N روز پیش / full date. */
export function faRelativeDate(iso: string | null): string {
  if (!iso) return 'هنوز مطالعه نشده'
  const then = new Date(iso)
  const now = new Date()
  then.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const days = Math.round((now.getTime() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'امروز'
  if (days === 1) return 'دیروز'
  if (days < 30) return `${faNum(days)} روز پیش`
  return new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(then)
}

export interface Motivation {
  label: string
  /** Tailwind text color token for the message. */
  tone: string
}

/** Progress-based motivational message (feature.txt thresholds). */
export function motivation(progress: number): Motivation {
  if (progress < 20) return { label: 'تازه شروع کرده‌ای 🚀', tone: 'text-chart-5' }
  if (progress < 50) return { label: 'ادامه بده 💪', tone: 'text-chart-4' }
  if (progress < 80) return { label: 'پیشرفت عالی 🔥', tone: 'text-primary' }
  return { label: 'تقریباً مسلط شدی 🏆', tone: 'text-success' }
}
