import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WordCard } from "@/components/vocabulary/WordCard";
import {
  WordFilters,
  type WordFiltersState,
} from "@/components/vocabulary/WordFilters";
import { useWords } from "@/hooks/useVocabulary";
import { useProgressStats } from "@/hooks/useProgress";
import { useBooksSimple } from "@/hooks/useBooks";
import { scrollToTop } from "@/lib/scroll";
import {
  parseVocabParams,
  serializeVocabParams,
  serializeReviewParams,
  toApiFilters,
  VOCAB_PARAMS_STORAGE_KEY,
  DEFAULT_VOCAB_FILTERS,
} from "@/lib/vocabFilters";

const LIMIT = 20;

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="h-6 w-32 rounded bg-muted" />
      <div className="h-4 w-48 rounded bg-muted" />
      <div className="h-11 w-28 rounded bg-muted" />
    </div>
  );
}

export function VocabularyPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const didRestore = useRef(false);
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    if (searchParams.toString() === "") {
      try {
        const saved = localStorage.getItem(VOCAB_PARAMS_STORAGE_KEY);
        if (saved)
          setSearchParams(new URLSearchParams(saved), { replace: true });
      } catch {
        /* Storage can be unavailable. */
      }
    }
  }, [searchParams, setSearchParams]);

  const { filters, page } = parseVocabParams(searchParams);
  useEffect(() => {
    try {
      if (searchParams.toString())
        localStorage.setItem(VOCAB_PARAMS_STORAGE_KEY, searchParams.toString());
      localStorage.setItem("vocab_review_mode", filters.mode);
    } catch {
      /* Storage can be unavailable. */
    }
  }, [searchParams, filters.mode]);

  const handleFiltersChange = useCallback(
    (newFilters: WordFiltersState) => {
      setSearchParams(serializeVocabParams(newFilters, 1));
      scrollToTop("smooth");
    },
    [setSearchParams],
  );

  const { data, isLoading, isError, isFetching, refetch } = useWords(
    toApiFilters(filters, page, LIMIT),
  );
  const statsQuery = useProgressStats({
    bookId: filters.bookId,
    volumeId: filters.volumeId,
    lessonId: filters.lessonId,
    chapter: filters.chapter,
    search: filters.search.trim() || undefined,
  });
  const { data: books } = useBooksSimple();
  const selectedBook = books?.find((book) => book.id === filters.bookId);
  const words = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  useEffect(() => {
    if (meta && !isFetching && page > totalPages)
      setSearchParams(serializeVocabParams(filters, totalPages), {
        replace: true,
      });
  }, [meta, isFetching, page, totalPages, filters, setSearchParams]);

  function goToPage(nextPage: number) {
    setSearchParams(serializeVocabParams(filters, nextPage));
    scrollToTop("smooth");
  }

  function renderPageButtons() {
    if (totalPages <= 1) return null;
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      )
        pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return (
      <nav
        aria-label="صفحه‌بندی واژگان"
        className="flex flex-wrap items-center justify-center gap-1"
      >
        <Button
          variant="outline"
          size="icon"
          aria-label="صفحهٔ قبلی"
          className="h-11 w-11"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              aria-hidden
              className="px-1 text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              aria-label={`صفحهٔ ${p.toLocaleString("fa-IR")}`}
              aria-current={p === page ? "page" : undefined}
              className="h-11 w-11 text-sm"
              onClick={() => goToPage(p)}
            >
              {p.toLocaleString("fa-IR")}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="صفحهٔ بعدی"
          className="h-11 w-11"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </nav>
    );
  }

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <BookOpen className="h-6 w-6 text-primary" />
          واژگان
        </h1>
        <Button
          disabled={isLoading || isError || words.length === 0}
          onClick={() =>
            navigate(
              `/vocabulary/review?${serializeReviewParams(filters).toString()}`,
            )
          }
          className="h-11 shrink-0 gap-2 rounded-xl text-xs sm:text-sm"
        >
          <LayoutGrid className="h-4 w-4" />
          مرور همین نتایج
        </Button>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {filters.bookId
          ? (selectedBook?.title ?? "کتاب انتخاب‌شده")
          : "همهٔ کتاب‌ها"}
        {meta && (
          <>
            {" "}
            · {meta.total.toLocaleString("fa-IR")}{" "}
            {filters.search || filters.status !== "ALL" ? "نتیجه" : "واژه"}
          </>
        )}
      </p>

      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <WordFilters
          filters={filters}
          onChange={handleFiltersChange}
          counts={statsQuery.data?.[filters.mode]}
          countsLoading={statsQuery.isLoading}
          countsError={statsQuery.isError}
          onRetryCounts={() => void statsQuery.refetch()}
        />
      </div>

      <div aria-busy={isFetching}>
        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
          >
            <p className="text-sm font-medium text-destructive">
              خطا در بارگذاری واژگان.
            </p>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-11 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              تلاش مجدد
            </Button>
          </div>
        ) : words.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-border bg-card px-6 py-10 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="font-medium">واژه‌ای یافت نشد</p>
            <p className="text-sm text-muted-foreground">
              فیلترها یا عبارت جستجو را تغییر دهید.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                handleFiltersChange({
                  ...DEFAULT_VOCAB_FILTERS,
                  mode: filters.mode,
                })
              }
              className="h-11"
            >
              پاک کردن فیلترها
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {words.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                mode={filters.mode}
                showBook={!filters.bookId}
              />
            ))}
          </div>
        )}
      </div>

      {!isLoading && !isError && words.length > 0 && (
        <div className="flex flex-col items-center gap-3 pt-2">
          {renderPageButtons()}
          {meta && (
            <p className="text-xs text-muted-foreground">
              نمایش {((page - 1) * LIMIT + 1).toLocaleString("fa-IR")} تا{" "}
              {Math.min(page * LIMIT, meta.total).toLocaleString("fa-IR")} از{" "}
              {meta.total.toLocaleString("fa-IR")} واژه
            </p>
          )}
        </div>
      )}
    </div>
  );
}
