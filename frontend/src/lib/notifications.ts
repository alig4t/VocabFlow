/**
 * Local study-reminder notifications — fully offline, native (Android) only.
 *
 * There is no server in the offline build, so reminders are OS-scheduled
 * *local* notifications (`@capacitor/local-notifications`). We can't run logic
 * at fire time, so instead we **reschedule everything from scratch on each app
 * launch/resume and after every study session**. Because you cannot study
 * without opening the app — and opening the app reschedules — the spec's rule
 * "don't remind a user who already studied today" falls out for free: a fresh
 * reschedule after a completed session simply omits today's reminder.
 *
 * The horizon is a **tapering ladder** (`REMINDER_DAYS`), not one-per-day: the
 * longer the absence, the wider the gap. Nagging daily is what the spec warns
 * against ("limit the number of notifications"), and since only opening the app
 * reschedules, a dense-but-short horizon would also abandon the very user who
 * stayed away longest. The ladder sends *fewer* messages across a *longer*
 * window, and the tone escalates to "overdue" after 3 idle days.
 *
 * On the web build every export is a no-op.
 */
import { isNative } from './platform'
import { faNum } from './format'
import type { NotificationStatus, UserSettings } from '@/types'

const off = () => import('@/offline/repo')

const CHANNEL_ID = 'vocabflow-reminders'

/**
 * The reminder ladder: days (from the last app open) to schedule a nudge on.
 * Gaps widen as the absence grows — 8 messages across a month instead of one
 * per day. Days 0 and 1 are the real "daily reminder" (0 = you haven't studied
 * yet today; 1 = you didn't open the app today at all); everything past
 * OVERDUE_AFTER_DAYS is a gentle come-back nudge, spaced ever wider.
 */
const REMINDER_DAYS = [0, 1, 3, 6, 10, 15, 21, 30]
const OVERDUE_AFTER_DAYS = 3 // idle days before the message turns "overdue"
const BASE_ID = 4200 // ids: BASE_ID .. BASE_ID+REMINDER_DAYS.length-1

/** The ladder days that use the "overdue" tone — drives message rotation. */
const OVERDUE_DAYS = REMINDER_DAYS.filter((d) => d >= OVERDUE_AFTER_DAYS)

/**
 * Come-back messages, rotated across the overdue rungs so a long absence never
 * repeats the same text. Tone is deliberately low-pressure — the spec asks for
 * "friendly and motivational, not demanding or stressful".
 */
const OVERDUE_MESSAGES: { title: string; body: string }[] = [
  { title: '📚 چند روزه ندیدیمت', body: 'هر وقت فرصت داشتی، واژه‌هات همین‌جا منتظرتن.' },
  { title: '🌱 یه مرور کوتاه کافیه', body: 'چند دقیقه وقت بذار و پشتکارت رو دوباره بساز.' },
  { title: '✨ هر وقت آماده بودی، از همون‌جا ادامه بده', body: 'شروع دوباره سخت نیست؛ از همون واژه بعدی.' },
]

type Kind = 'daily' | 'overdue' | 'streak'

interface Reminder {
  id: number
  at: Date
  title: string
  body: string
}

/** Parse `"HH:mm"` → `[h, m]`, tolerant of bad input (defaults to 20:00). */
function parseTime(t: string | undefined): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '')
  if (!m) return [20, 0]
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const min = Math.min(59, Math.max(0, Number(m[2])))
  return [h, min]
}

/** A Date at the configured reminder time, `dayOffset` days from today. */
function fireDate(dayOffset: number, h: number, min: number): Date {
  const d = new Date()
  d.setHours(h, min, 0, 0)
  d.setDate(d.getDate() + dayOffset)
  return d
}

/**
 * Build the message for a rung of the ladder. `day` selects the overdue variant
 * and decides whether exact counts are known (only day 0 is "today").
 */
function messageFor(kind: Kind, s: NotificationStatus, day: number): { title: string; body: string } {
  const exact = day === 0
  if (kind === 'overdue') {
    const rung = OVERDUE_DAYS.indexOf(day)
    return OVERDUE_MESSAGES[(rung < 0 ? 0 : rung) % OVERDUE_MESSAGES.length]
  }
  if (kind === 'streak') {
    // "پشتکار" is the term the dashboard already uses for this number
    // (GlobalStats stat tile) — keep the user-facing wording identical.
    return {
      title: `🔥 پشتکار ${faNum(s.streak)} روزه‌ات در خطره`,
      body: 'امروز هنوز مطالعه نکرده‌ای؛ یه مرور کوتاه کافیه.',
    }
  }
  // daily — use exact counts only for today (future-day counts are unknown).
  if (exact && s.dueCount > 0 && s.newCount > 0) {
    return { title: '🔥 جلسه‌ی امروزت آماده‌ست', body: 'مرورها و واژه‌های جدید منتظرتن.' }
  }
  if (exact && s.dueCount > 0) {
    return { title: '📚 مرور امروزت آماده‌ست', body: `${faNum(s.dueCount)} واژه منتظر مرورن.` }
  }
  if (exact && s.newCount > 0) {
    return {
      title: '✨ واژه‌های جدید امروز',
      body: `${faNum(s.newCount)} واژه جدید برای یادگیری داری. چند دقیقه وقت بذار.`,
    }
  }
  return { title: '📚 وقت مروره', body: 'چند دقیقه برای مرور امروزت وقت بذار.' }
}

/**
 * Decide the notification kind for day `d`, honoring the per-type toggles.
 * Returns null when nothing should fire that day.
 */
function kindForDay(d: number, s: UserSettings, status: NotificationStatus): Kind | null {
  const overdue = s.notifyOverdue !== false
  const streak = s.notifyStreak !== false
  const daily = s.notifyDailyStudy !== false

  // After a few idle days, prefer the "come back" tone.
  if (d >= OVERDUE_AFTER_DAYS) {
    if (overdue) return 'overdue'
    return daily ? 'daily' : null
  }
  // Today, if there is a live streak worth protecting.
  if (d === 0 && status.streak > 0) {
    if (streak) return 'streak'
    return daily ? 'daily' : null
  }
  return daily ? 'daily' : null
}

/** Compute the full set of reminders to schedule (native decision logic). */
function planReminders(settings: UserSettings, status: NotificationStatus): Reminder[] {
  const [h, min] = parseTime(settings.dailyReminderTime)
  const now = new Date()
  const out: Reminder[] = []

  REMINDER_DAYS.forEach((d, idx) => {
    const at = fireDate(d, h, min)

    if (d === 0) {
      // Today: skip if the time has passed, already studied, or nothing to do.
      if (at.getTime() <= now.getTime()) return
      if (status.studiedToday) return
      if (status.dueCount + status.newCount === 0) return
    } else {
      // Future days: only meaningful if the user actually has a plan to study.
      if (!status.hasPlans) return
    }

    const kind = kindForDay(d, settings, status)
    if (!kind) return

    const { title, body } = messageFor(kind, status, d)
    out.push({ id: BASE_ID + idx, at, title, body })
  })

  return out
}

/**
 * Cancel every reminder we may have scheduled (our whole id range). The range
 * only ever grows, so ids left over from an older/shorter ladder are cleared
 * too — no orphaned notifications survive an app update.
 */
async function cancelAll(LocalNotifications: typeof import('@capacitor/local-notifications').LocalNotifications) {
  const ids = Array.from({ length: REMINDER_DAYS.length }, (_, i) => ({ id: BASE_ID + i }))
  await LocalNotifications.cancel({ notifications: ids })
}

/**
 * Ensure an Android notification channel + runtime permission. Safe to call
 * repeatedly. Returns true when notifications are permitted.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'یادآور مطالعه',
        description: 'یادآوری روزانه‌ی مرور و واژه‌های جدید',
        importance: 4, // HIGH — heads-up
      })
    } catch {
      /* createChannel is Android-only; ignore elsewhere */
    }
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions()
    }
    return perm.display === 'granted'
  } catch (e) {
    console.error('notif permission failed', e)
    return false
  }
}

/**
 * Rebuild the entire reminder schedule from the current settings + live study
 * status. Cancels all previously-scheduled reminders first. No-op on web.
 */
export async function rescheduleNotifications(): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await cancelAll(LocalNotifications)

    const repo = await off()
    const settings = await repo.getSettings()

    // Master switch off → stay cancelled.
    if (settings.dailyReminderEnabled === false) return

    const status = await repo.getNotificationStatus()
    const reminders = planReminders(settings, status)
    if (reminders.length === 0) return

    await LocalNotifications.schedule({
      notifications: reminders.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        channelId: CHANNEL_ID,
        schedule: { at: r.at, allowWhileIdle: true },
      })),
    })
  } catch (e) {
    console.error('reschedule notifications failed', e)
  }
}

/**
 * One-time setup at app launch: request permission (if reminders are enabled),
 * then lay down the schedule. No-op on web.
 */
export async function initNotifications(): Promise<void> {
  if (!isNative()) return
  try {
    const repo = await off()
    const settings = await repo.getSettings()
    if (settings.dailyReminderEnabled !== false) {
      await ensureNotificationPermission()
    }
  } catch (e) {
    console.error('init notifications failed', e)
  }
  await rescheduleNotifications()
}
