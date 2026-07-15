import { useState } from 'react'
import { SlidersHorizontal, Volume2, Eye, BookOpen, Shuffle, ArrowLeftRight, Trash2, Loader2, AlertTriangle, Bell, Clock, Flame, History, BookMarked } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { usePlans, useUpdatePlan, useDeletePlan } from '@/hooks/usePlans'
import { useToast } from '@/components/ui/use-toast'
import { isNative } from '@/lib/platform'
import { ensureNotificationPermission, rescheduleNotifications } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import { faNum } from '@/lib/format'
import type { CardOrder, LearningPlan, ReviewMode, UserSettings } from '@/types'

const DAILY_OPTIONS = [10, 20, 30, 50]

function SettingRow({
  icon,
  title,
  description,
  children,
  /**
   * Stack the control on its own full-width row below the title/description
   * instead of beside it. Use for wide controls (e.g. the segmented toggles)
   * that would otherwise squeeze the description into several lines on narrow
   * screens.
   */
  stacked = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  stacked?: boolean
}) {
  if (stacked) {
    return (
      <div className="py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-primary">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-3 ps-8">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 text-primary">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** A two-option segmented toggle. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex w-full items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function PlanCard({ plan }: { plan: LearningPlan }) {
  const updatePlan = useUpdatePlan()
  const deletePlan = useDeletePlan()
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleDelete() {
    deletePlan.mutate(plan.id, {
      onSuccess: () => {
        toast({ title: 'برنامه حذف شد', description: plan.volumeTitle, variant: 'default' })
        setConfirmOpen(false)
      },
      onError: () => toast({ title: 'خطا', description: 'حذف ناموفق بود.', variant: 'destructive' }),
    })
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">
            {plan.bookTitle} — {plan.volumeTitle}
          </p>
          <p className="text-xs text-muted-foreground">{faNum(plan.totalWords)} لغت</p>
        </div>
        <Tooltip label="حذف برنامه یادگیری" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
            aria-label="حذف برنامه یادگیری"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>

      {/* Delete confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dir="rtl" className="font-persian max-w-md">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              حذف برنامه یادگیری؟
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              برنامه‌ی <span className="font-semibold text-foreground">{plan.bookTitle} — {plan.volumeTitle}</span>{' '}
              حذف می‌شود و <span className="font-semibold text-foreground">پیشرفت مرور و زمان‌بندی SM-2</span> شما
              برای لغات این جلد نیز پاک خواهد شد. این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deletePlan.isPending}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePlan.isPending}
              className="gap-2"
            >
              {deletePlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف کن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">لغات جدید در روز</p>
        <div className="flex flex-wrap gap-1.5">
          {DAILY_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() =>
                updatePlan.mutate({
                  id: plan.id,
                  input: { dailyNewWords: n, dailyGoal: Math.max(plan.dailyGoal, n) },
                })
              }
              className={cn(
                'min-w-[3rem] rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors',
                plan.dailyNewWords === n
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground hover:bg-accent',
              )}
            >
              {faNum(n)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">هدف روزانه (مرور)</p>
        <Input
          type="number"
          min={plan.dailyNewWords}
          defaultValue={plan.dailyGoal}
          onBlur={(e) => {
            const v = Number(e.target.value)
            if (v >= plan.dailyNewWords && v !== plan.dailyGoal) {
              updatePlan.mutate({ id: plan.id, input: { dailyGoal: v } })
            }
          }}
          className="w-24 tabular-nums"
        />
      </div>
    </div>
  )
}

/**
 * Study-reminder notifications (native offline build only). Toggling the master
 * switch requests OS permission; every change rebuilds the local schedule.
 */
function NotificationsCard({ settings }: { settings: UserSettings }) {
  const updateSettings = useUpdateSettings()
  const { toast } = useToast()

  const enabled = settings.dailyReminderEnabled !== false

  const apply = (patch: Partial<UserSettings>, opts?: { requestPermission?: boolean }) =>
    updateSettings.mutate(patch, {
      onSuccess: async () => {
        if (opts?.requestPermission) {
          const granted = await ensureNotificationPermission()
          if (!granted) {
            toast({
              title: 'اجازه‌ی اعلان داده نشد',
              description: 'برای دریافت یادآور، اعلان‌ها را در تنظیمات گوشی برای وکب فعال کنید.',
              variant: 'destructive',
            })
          }
        }
        await rescheduleNotifications()
      },
    })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">یادآورها</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <SettingRow
          icon={<Bell className="h-5 w-5" />}
          title="یادآور روزانه‌ی مطالعه"
          description="اگر امروز مطالعه نکرده باشید و مرور یا لغت جدید داشته باشید، یادآوری می‌شوید."
        >
          <Switch
            checked={enabled}
            onCheckedChange={(v) => apply({ dailyReminderEnabled: v }, { requestPermission: v })}
          />
        </SettingRow>

        {enabled && (
          <>
            <SettingRow
              icon={<Clock className="h-5 w-5" />}
              title="زمان یادآوری"
              description="ساعتی که هر روز یادآور مطالعه ارسال می‌شود."
            >
              <Input
                type="time"
                value={settings.dailyReminderTime ?? '20:00'}
                onChange={(e) => {
                  if (e.target.value) apply({ dailyReminderTime: e.target.value })
                }}
                className="w-32 tabular-nums"
              />
            </SettingRow>

            <SettingRow
              icon={<BookMarked className="h-5 w-5" />}
              title="یادآور مطالعه‌ی روزانه"
              description="پیام آماده‌بودن مرورها و لغت‌های جدیدِ امروز."
            >
              <Switch
                checked={settings.notifyDailyStudy !== false}
                onCheckedChange={(v) => apply({ notifyDailyStudy: v })}
              />
            </SettingRow>

            <SettingRow
              icon={<History className="h-5 w-5" />}
              title="یادآور مرورهای عقب‌افتاده"
              description="وقتی چند روز اپ را باز نکرده‌اید و مرورها روی هم جمع شده‌اند."
            >
              <Switch
                checked={settings.notifyOverdue !== false}
                onCheckedChange={(v) => apply({ notifyOverdue: v })}
              />
            </SettingRow>

            <SettingRow
              icon={<Flame className="h-5 w-5" />}
              title="یادآور حفظ پشتکار"
              description="وقتی چند روز متوالی مطالعه کرده‌اید ولی مطالعه‌ی امروز کامل نشده."
            >
              <Switch
                checked={settings.notifyStreak !== false}
                onCheckedChange={(v) => apply({ notifyStreak: v })}
              />
            </SettingRow>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const { data: plans } = usePlans()
  const updateSettings = useUpdateSettings()

  const set = (patch: Partial<UserSettings>) => updateSettings.mutate(patch)

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <SlidersHorizontal className="h-6 w-6 text-primary" aria-hidden="true" />
          تنظیمات
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">مطالعه و برنامه‌ی یادگیری خود را شخصی‌سازی کنید.</p>
      </header>

      {/* Study preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">مطالعه</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {isLoading || !settings ? (
            <div className="space-y-3 py-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <SettingRow
                icon={<ArrowLeftRight className="h-5 w-5" />}
                title="جهت مطالعه"
                description="لغات به کدام جهت مرور و زمان‌بندی شوند."
                stacked
              >
                <Segmented<ReviewMode>
                  value={settings.studyDirection}
                  onChange={(v) => set({ studyDirection: v })}
                  options={[
                    { value: 'EN_TO_FA', label: 'انگلیسی → فارسی' },
                    { value: 'FA_TO_EN', label: 'فارسی → انگلیسی' },
                  ]}
                />
              </SettingRow>

              <SettingRow
                icon={<Volume2 className="h-5 w-5" />}
                title="پخش خودکار تلفظ"
                description="هنگام نمایش هر لغت، تلفظ به‌طور خودکار پخش شود."
              >
                <Switch
                  checked={settings.autoPlayAudio}
                  onCheckedChange={(v) => set({ autoPlayAudio: v })}
                />
              </SettingRow>

              <SettingRow
                icon={<Eye className="h-5 w-5" />}
                title="نمایش تلفظ آوایی"
                description="نمایش آوانگاری (IPA) روی کارت‌ها."
              >
                <Switch
                  checked={settings.showPhonetics}
                  onCheckedChange={(v) => set({ showPhonetics: v })}
                />
              </SettingRow>

              <SettingRow
                icon={<BookOpen className="h-5 w-5" />}
                title="نمایش مثال‌ها"
                description="نمایش جملات نمونه هنگام مرور."
              >
                <Switch
                  checked={settings.showExamples}
                  onCheckedChange={(v) => set({ showExamples: v })}
                />
              </SettingRow>

              <SettingRow
                icon={<Shuffle className="h-5 w-5" />}
                title="ترتیب کارت‌ها"
                description="ترتیب نمایش لغات جدید."
                stacked
              >
                <Segmented<CardOrder>
                  value={settings.cardOrder}
                  onChange={(v) => set({ cardOrder: v })}
                  options={[
                    { value: 'SEQUENTIAL', label: 'ترتیبی' },
                    { value: 'RANDOM', label: 'تصادفی' },
                  ]}
                />
              </SettingRow>
            </>
          )}
        </CardContent>
      </Card>

      {/* Study reminders — native offline build only (no web push). */}
      {isNative() && settings && <NotificationsCard settings={settings} />}

      {/* Per-volume learning plans */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">برنامه‌های یادگیری</CardTitle>
        </CardHeader>
        <CardContent>
          {!plans ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز برنامه‌ی یادگیری ندارید. از کتابخانه یک جلد اضافه کنید.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
