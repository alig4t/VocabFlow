import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookText, Check, Loader2, GraduationCap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useVolumes } from '@/hooks/useBooks'
import { usePlans, useCreatePlan } from '@/hooks/usePlans'
import { useToast } from '@/components/ui/use-toast'
import { cn, getErrorMessage } from '@/lib/utils'
import { faNum } from '@/lib/format'
import type { DiscoveryBook } from '@/types'

const DAILY_OPTIONS = [10, 20, 30, 40, 50]

interface StartPlanDialogProps {
  book: DiscoveryBook | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select this volume when the dialog opens (e.g. from the book detail page). */
  initialVolumeId?: string
}

/**
 * Add a book VOLUME (not the whole book) to the learning plan and choose how
 * many new words to learn per day. Single-volume books skip volume selection.
 */
export function StartPlanDialog({ book, open, onOpenChange, initialVolumeId }: StartPlanDialogProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: volumes, isLoading: volumesLoading } = useVolumes(open && book ? book.id : '')
  const { data: plans } = usePlans()
  const createPlan = useCreatePlan()

  const [volumeId, setVolumeId] = useState<string>('')
  const [dailyNewWords, setDailyNewWords] = useState<number>(20)

  const plannedVolumeIds = useMemo(
    () => new Set((plans ?? []).map((p) => p.volumeId)),
    [plans],
  )

  // Auto-select when there is exactly one volume.
  useEffect(() => {
    if (open && volumes && volumes.length === 1) setVolumeId(volumes[0].id)
  }, [open, volumes])

  // Reset selection each time the dialog opens for a new book. When the caller
  // pre-selects a volume (from the detail page), honour it instead of clearing.
  useEffect(() => {
    if (open) {
      setVolumeId(initialVolumeId ?? '')
      setDailyNewWords(20)
    }
  }, [open, book?.id, initialVolumeId])

  const singleVolume = volumes?.length === 1
  const canConfirm = Boolean(volumeId) && !createPlan.isPending
  const alreadyPlanned = volumeId ? plannedVolumeIds.has(volumeId) : false

  function handleConfirm() {
    if (!volumeId) return
    createPlan.mutate(
      { volumeId, dailyNewWords, dailyGoal: dailyNewWords * 3 },
      {
        onSuccess: () => {
          toast({
            title: alreadyPlanned ? 'برنامه به‌روزرسانی شد' : 'به برنامه‌ی یادگیری اضافه شد',
            description: `${dailyNewWords} لغت جدید در روز`,
            variant: 'success',
          })
          onOpenChange(false)
          navigate('/study')
        },
        onError: (error) => {
          toast({
            title: 'خطا',
            description: getErrorMessage(error, 'عملیات ناموفق بود.'),
            variant: 'destructive',
          })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="font-persian max-w-lg">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            برنامه‌ی یادگیری
          </DialogTitle>
          <DialogDescription>{book?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Volume picker */}
          {!singleVolume && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">جلد را انتخاب کنید</p>
              {volumesLoading ? (
                <div className="h-20 animate-pulse rounded-lg bg-muted" />
              ) : (
                <div className="grid max-h-64 grid-cols-2 gap-y-2 gap-x-2 p-1.5 overflow-y-auto sm:grid-cols-3">
                  {volumes?.map((v) => {
                    const planned = plannedVolumeIds.has(v.id)
                    const selected = volumeId === v.id
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVolumeId(v.id)}
                        className={cn(
                          'group relative flex flex-col items-center gap-2 rounded-xl border p-2 text-center transition-colors',
                          selected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-border hover:border-primary/50 hover:bg-accent',
                        )}
                      >
                        {v.coverImage ? (
                          <img
                            src={v.coverImage}
                            alt={v.title ?? `جلد ${v.volumeNumber}`}
                            loading="lazy"
                            className="h-[215px] md:h-[180px] w-full rounded-lg object-cover ring-1 ring-border"
                          />
                        ) : (
                          <span className="flex h-34 w-full items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookText className="h-[215px] md:h-[180px] w-7" />
                          </span>
                        )}
                        <span className="text-xs font-medium leading-tight text-foreground">
                          {v.title ?? `جلد ${v.volumeNumber}`}
                        </span>
                        {planned && (
                          <span className="absolute right-1 top-1 rounded-full bg-green-500 p-0.5 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        {selected && (
                          <span className="absolute left-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Daily new-words picker */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">هر روز چند لغت جدید؟</p>
            <div className="flex flex-wrap gap-2">
              {DAILY_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setDailyNewWords(n)}
                  className={cn(
                    'min-w-[3.5rem] rounded-lg border px-4 py-2 text-sm font-semibold tabular-nums transition-colors',
                    dailyNewWords === n
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border text-foreground hover:bg-accent',
                  )}
                >
                  {faNum(n)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              لغات جدید به‌تدریج و بر اساس این سقف روزانه وارد چرخه‌ی یادگیری می‌شوند.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="gap-2">
            {createPlan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GraduationCap className="h-4 w-4" />
            )}
            {alreadyPlanned ? 'به‌روزرسانی برنامه' : 'شروع یادگیری'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
