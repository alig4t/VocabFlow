import { useRef, useEffect } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ReviewMode, WordStatus } from '@/types'

export interface WordFiltersState {
  mode: ReviewMode
  status: WordStatus | 'ALL'
  sort: 'chapter' | 'eng' | 'per'
  chapter: number | undefined
  search: string
}

interface WordFiltersProps {
  filters: WordFiltersState
  onChange: (filters: WordFiltersState) => void
  className?: string
}

const STATUS_OPTIONS: { label: string; value: WordStatus | 'ALL' }[] = [
  { label: 'همه', value: 'ALL' },
  { label: 'یاد گرفتم', value: 'KNOWN' },
  { label: 'یاد نگرفتم', value: 'NOT_KNOWN' },
  { label: 'نخوانده', value: 'NOT_READ' },
]

const SORT_OPTIONS: { label: string; value: 'chapter' | 'eng' | 'per' }[] = [
  { label: 'بر اساس فصل', value: 'chapter' },
  { label: 'انگلیسی الفبایی', value: 'eng' },
  { label: 'فارسی الفبایی', value: 'per' },
]

const CHAPTERS = Array.from({ length: 30 }, (_, i) => i + 1)

export function WordFilters({ filters, onChange, className }: WordFiltersProps) {
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  function update(partial: Partial<WordFiltersState>) {
    onChange({ ...filters, ...partial })
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      update({ search: val })
    }, 350)
    // keep the input visually updated immediately by storing in a local ref approach
    // but since we're controlled via filters.search (debounced), we need uncontrolled input
  }

  function clearSearch() {
    if (searchInputRef.current) searchInputRef.current.value = ''
    update({ search: '' })
  }

  function resetAll() {
    if (searchInputRef.current) searchInputRef.current.value = ''
    onChange({
      mode: 'EN_TO_FA',
      status: 'ALL',
      sort: 'chapter',
      chapter: undefined,
      search: '',
    })
  }

  const isDefaultState =
    filters.mode === 'EN_TO_FA' &&
    filters.status === 'ALL' &&
    filters.sort === 'chapter' &&
    filters.chapter === undefined &&
    filters.search === ''

  return (
    <div className={cn('space-y-4', className)}>
      {/* Row 1: Review Mode + Status filter */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Review Mode toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-full p-1">
          <button
            onClick={() => update({ mode: 'EN_TO_FA' })}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              filters.mode === 'EN_TO_FA'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            EN → FA
          </button>
          <button
            onClick={() => update({ mode: 'FA_TO_EN' })}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              filters.mode === 'FA_TO_EN'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            FA → EN
          </button>
        </div>

        {/* Status filter buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ status: opt.value })}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium border transition-all duration-200',
                filters.status === opt.value
                  ? opt.value === 'KNOWN'
                    ? 'bg-green-500 text-white border-green-500 shadow-sm'
                    : opt.value === 'NOT_KNOWN'
                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                      : opt.value === 'NOT_READ'
                        ? 'bg-secondary text-secondary-foreground border-border shadow-sm'
                        : 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Sort + Chapter + Search + Reset */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">مرتب‌سازی:</label>
          <select
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as 'chapter' | 'eng' | 'per' })}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter filter dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">فصل:</label>
          <select
            value={filters.chapter ?? ''}
            onChange={(e) =>
              update({ chapter: e.target.value ? Number(e.target.value) : undefined })
            }
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
          >
            <option value="">همه فصل‌ها</option>
            {CHAPTERS.map((ch) => (
              <option key={ch} value={ch}>
                فصل {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="جستجو در لغات..."
            defaultValue={filters.search}
            onChange={handleSearchChange}
            className="pr-8"
          />
          {filters.search && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Reset button */}
        {!isDefaultState && (
          <Button variant="ghost" size="sm" onClick={resetAll} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            بازنشانی
          </Button>
        )}
      </div>
    </div>
  )
}
