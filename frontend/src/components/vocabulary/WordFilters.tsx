import { useRef, useEffect, useState, useId } from "react";
import {
  X,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSelect } from "@/components/ui/bottom-select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useBooksSimple,
  useVolumesSimple,
  useLessonsSimple,
} from "@/hooks/useBooks";
import {
  DEFAULT_VOCAB_FILTERS,
  type WordFiltersState,
} from "@/lib/vocabFilters";
import type { WordStatus, ProgressStats } from "@/types";

export type { WordFiltersState };

interface WordFiltersProps {
  filters: WordFiltersState;
  onChange: (filters: WordFiltersState) => void;
  counts?: ProgressStats["EN_TO_FA"];
  countsLoading?: boolean;
  countsError?: boolean;
  onRetryCounts?: () => void;
  className?: string;
}

const STATUS_OPTIONS: { label: string; value: WordStatus | "ALL" }[] = [
  { label: "همه", value: "ALL" },
  { label: "بلدم", value: "KNOWN" },
  { label: "بلد نیستم", value: "NOT_KNOWN" },
  { label: "بدون علامت", value: "NOT_READ" },
];
const SORT_OPTIONS = [
  { label: "بر اساس فصل", value: "chapter" },
  { label: "انگلیسی الفبایی", value: "eng" },
  { label: "فارسی الفبایی", value: "per" },
] as const;
const CHAPTERS = Array.from({ length: 30 }, (_, i) => i + 1);

export function WordFilters({
  filters,
  onChange,
  counts,
  countsLoading,
  countsError,
  onRetryCounts,
  className,
}: WordFiltersProps) {
  const panelId = useId();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef(filters);
  const onChangeRef = useRef(onChange);
  filtersRef.current = filters;
  onChangeRef.current = onChange;

  function cancelSearch() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  useEffect(() => {
    cancelSearch();
    setSearchValue(filters.search);
  }, [
    filters.mode,
    filters.status,
    filters.sort,
    filters.chapter,
    filters.search,
    filters.bookId,
    filters.volumeId,
    filters.lessonId,
  ]);
  useEffect(() => () => cancelSearch(), []);

  const booksQuery = useBooksSimple();
  const volumesQuery = useVolumesSimple(filters.bookId ?? "");
  const lessonsQuery = useLessonsSimple(
    filters.bookId ?? "",
    filters.volumeId ?? "",
  );
  const { data: books } = booksQuery;
  const { data: volumes } = volumesQuery;
  const { data: lessons } = lessonsQuery;

  function update(partial: Partial<WordFiltersState>) {
    cancelSearch();
    const next = { ...filtersRef.current, search: searchValue, ...partial };
    filtersRef.current = next;
    onChangeRef.current(next);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchValue(val);
    cancelSearch();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onChangeRef.current({ ...filtersRef.current, search: val });
    }, 350);
  }

  function resetAll() {
    cancelSearch();
    setSearchValue("");
    const next = { ...DEFAULT_VOCAB_FILTERS };
    filtersRef.current = next;
    onChangeRef.current(next);
  }

  const advancedCount = [
    filters.bookId,
    filters.volumeId,
    filters.lessonId,
    filters.chapter,
    filters.sort !== "chapter",
    filters.mode !== "EN_TO_FA",
  ].filter(Boolean).length;
  const hasFilters =
    advancedCount > 0 || filters.status !== "ALL" || searchValue !== "";
  const selectedVolume = volumes?.find((v) => v.id === filters.volumeId);
  const selectedLesson = lessons?.find((l) => l.id === filters.lessonId);
  const scopeText = [
    filters.volumeId
      ? (selectedVolume?.title ??
        `جلد ${selectedVolume?.volumeNumber ?? "انتخاب‌شده"}`)
      : undefined,
    filters.lessonId
      ? (selectedLesson?.title ??
        `درس ${selectedLesson?.lessonNumber ?? "انتخاب‌شده"}`)
      : undefined,
    filters.chapter
      ? `فصل ${filters.chapter.toLocaleString("fa-IR")}`
      : undefined,
    filters.sort !== "chapter"
      ? SORT_OPTIONS.find((s) => s.value === filters.sort)?.label
      : undefined,
    filters.mode === "FA_TO_EN" ? "فارسی به انگلیسی" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search
          aria-hidden
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="جستجو در واژگان انگلیسی و فارسی"
          type="search"
          placeholder="جستجوی واژهٔ انگلیسی یا فارسی…"
          value={searchValue}
          onChange={handleSearchChange}
          className="h-12 rounded-xl pr-10 pl-12 text-base [&::-webkit-search-cancel-button]:appearance-none"
        />
        {searchValue && (
          <button
            type="button"
            aria-label="پاک کردن جستجو"
            onClick={() => {
              setSearchValue("");
              update({ search: "" });
            }}
            className="absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          aria-controls={panelId}
          className="h-11 gap-2 px-2 text-muted-foreground"
        >
          <SlidersHorizontal className="h-4 w-4" />
          فیلترهای بیشتر
          {advancedCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 text-xs text-foreground">
              {advancedCount.toLocaleString("fa-IR")}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform motion-reduce:transition-none",
              advancedOpen && "rotate-180",
            )}
          />
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={resetAll}
            className="h-11 gap-1.5 px-2 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            بازنشانی
          </Button>
        )}
      </div>
      {!advancedOpen && scopeText && (
        <p className="text-xs leading-6 text-muted-foreground break-words">
          {scopeText}
        </p>
      )}

      <div
        id={panelId}
        hidden={!advancedOpen}
        className="space-y-3 border-t border-border pt-3"
      >
        <div
          role="group"
          aria-label="جهت مرور"
          className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:max-w-xs"
        >
          {(["EN_TO_FA", "FA_TO_EN"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={filters.mode === mode}
              onClick={() => update({ mode })}
              className={cn(
                "min-h-11 rounded-lg px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring",
                filters.mode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {mode === "EN_TO_FA" ? "انگلیسی به فارسی" : "فارسی به انگلیسی"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <BottomSelect
            label="کتاب"
            value={filters.bookId ?? ""}
            disabled={booksQuery.isLoading || booksQuery.isError}
            onValueChange={(value) =>
              update({
                bookId: value || undefined,
                volumeId: undefined,
                lessonId: undefined,
                chapter: undefined,
              })
            }
            options={[
              {
                value: "",
                label: booksQuery.isLoading
                  ? "در حال دریافت کتاب‌ها…"
                  : "همه کتاب‌ها",
              },
              ...(books?.map((book) => ({
                value: book.id,
                label: book.title,
              })) ?? []),
            ]}
          />
          {filters.bookId && (
            <BottomSelect
              label="جلد"
              value={filters.volumeId ?? ""}
              disabled={volumesQuery.isLoading || volumesQuery.isError}
              onValueChange={(value) =>
                update({ volumeId: value || undefined, lessonId: undefined })
              }
              options={[
                {
                  value: "",
                  label: volumesQuery.isLoading
                    ? "در حال دریافت جلدها…"
                    : "همه جلدها",
                },
                ...(volumes?.map((volume) => ({
                  value: volume.id,
                  label: volume.title ?? `جلد ${volume.volumeNumber}`,
                })) ?? []),
              ]}
            />
          )}
          {filters.volumeId && (
            <BottomSelect
              label="درس"
              value={filters.lessonId ?? ""}
              disabled={lessonsQuery.isLoading || lessonsQuery.isError}
              onValueChange={(value) =>
                update({ lessonId: value || undefined })
              }
              options={[
                {
                  value: "",
                  label: lessonsQuery.isLoading
                    ? "در حال دریافت درس‌ها…"
                    : "همه درس‌ها",
                },
                ...(lessons?.map((lesson) => ({
                  value: lesson.id,
                  label: lesson.title ?? `درس ${lesson.lessonNumber}`,
                })) ?? []),
              ]}
            />
          )}
          {filters.bookId && (
            <BottomSelect
              label="فصل"
              value={filters.chapter?.toString() ?? ""}
              onValueChange={(value) =>
                update({ chapter: value ? Number(value) : undefined })
              }
              options={[
                { value: "", label: "همه فصل‌ها" },
                ...CHAPTERS.map((chapter) => ({
                  value: chapter.toString(),
                  label: `فصل ${chapter.toLocaleString("fa-IR")}`,
                })),
              ]}
            />
          )}
          <BottomSelect<WordFiltersState["sort"]>
            label="مرتب‌سازی"
            value={filters.sort}
            onValueChange={(sort) => update({ sort })}
            options={SORT_OPTIONS}
          />
        </div>
        {(booksQuery.isError ||
          (filters.bookId && volumesQuery.isError) ||
          (filters.volumeId && lessonsQuery.isError)) && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 text-xs text-destructive"
          >
            <span>فیلترهای کتاب بارگذاری نشدند.</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (booksQuery.isError) void booksQuery.refetch();
                if (volumesQuery.isError) void volumesQuery.refetch();
                if (lessonsQuery.isError) void lessonsQuery.refetch();
              }}
            >
              تلاش مجدد
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[11px] leading-5 text-muted-foreground">
          علامت‌های مرور آزاد؛ مستقل از مطالعهٔ روزانه
        </p>
        <div
          role="group"
          aria-label="وضعیت در مرور آزاد"
          className="grid grid-cols-4 gap-1.5"
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={filters.status === opt.value}
              onClick={() => update({ status: opt.value })}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-xs focus-visible:ring-2 focus-visible:ring-ring",
                filters.status === opt.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground",
                opt.value === "KNOWN" && "text-green-700 dark:text-green-400",
                opt.value === "NOT_KNOWN" && "text-red-700 dark:text-red-400",
              )}
            >
              <span>{opt.label}</span>
              {countsLoading ? (
                <span
                  aria-label="در حال شمارش"
                  className="h-4 w-9 animate-pulse rounded bg-muted"
                />
              ) : counts && !countsError ? (
                <span className="text-sm font-bold tabular-nums" dir="ltr">
                  {(opt.value === "ALL"
                    ? counts.total
                    : counts[opt.value]
                  ).toLocaleString("fa-IR")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {countsError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 text-xs text-destructive"
          >
            <span>آمار مرور آزاد بارگذاری نشد.</span>
            <Button
              type="button"
              variant="ghost"
              onClick={onRetryCounts}
              className="h-11 px-2 text-xs"
            >
              تلاش مجدد
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
