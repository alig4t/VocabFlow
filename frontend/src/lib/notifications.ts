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
 * We lay down a 7-day horizon so a user who stays away still gets a daily nudge,
 * and the message escalates to the "overdue" tone after 3 idle days. Opening the
 * app at any point wipes and rebuilds the whole schedule.
 *
 * On the web build every export is a no-op.
 */
import { isNative } from './platform'
import { faNum } from './format'
import type { NotificationStatus, UserSettings } from '@/types'

const off = () => import('@/offline/repo')

const CHANNEL_ID = 'vocabflow-reminders'
const HORIZON_DAYS = 7 // schedule this many days ahead
const OVERDUE_AFTER_DAYS = 3 // idle days before the message turns "overdue"
const BASE_ID = 4200 // notification id range: BASE_ID .. BASE_ID+HORIZON_DAYS-1

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

/** Build the message for a given notification kind. Persian, matches spec tone. */
function messageFor(kind: Kind, s: NotificationStatus, exact: boolean): { title: string; body: string } {
  if (kind === 'overdue') {
    return {
      title: '🔥 چند روزه ندیدیمت',
      body: 'لغت‌هات منتظر مرورن؛ چند دقیقه وقت بذار و پشتکارت رو دوباره بساز.',
    }
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
    return { title: '🔥 جلسه‌ی امروزت آماده‌ست', body: 'مرورها و لغت‌های جدید منتظرتن.' }
  }
  if (exact && s.dueCount > 0) {
    return { title: '📚 مرور امروزت آماده‌ست', body: `${faNum(s.dueCount)} لغت منتظر مرورن.` }
  }
  if (exact && s.newCount > 0) {
    return {
      title: '✨ لغت‌های جدید امروز',
      body: `${faNum(s.newCount)} لغت جدید برای یادگیری داری. چند دقیقه وقت بذار.`,
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

  for (let d = 0; d < HORIZON_DAYS; d++) {
    const at = fireDate(d, h, min)

    if (d === 0) {
      // Today: skip if the time has passed, already studied, or nothing to do.
      if (at.getTime() <= now.getTime()) continue
      if (status.studiedToday) continue
      if (status.dueCount + status.newCount === 0) continue
    } else {
      // Future days: only meaningful if the user actually has a plan to study.
      if (!status.hasPlans) continue
    }

    const kind = kindForDay(d, settings, status)
    if (!kind) continue

    const { title, body } = messageFor(kind, status, d === 0)
    out.push({ id: BASE_ID + d, at, title, body })
  }

  return out
}

/** Cancel every reminder we may have scheduled (our whole id range). */
async function cancelAll(LocalNotifications: typeof import('@capacitor/local-notifications').LocalNotifications) {
  const ids = Array.from({ length: HORIZON_DAYS }, (_, d) => ({ id: BASE_ID + d }))
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
        description: 'یادآوری روزانه‌ی مرور و لغت‌های جدید',
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
