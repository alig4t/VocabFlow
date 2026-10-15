import { useState, useEffect, useCallback, useMemo, useId } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  SquarePen,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSelect } from "@/components/ui/bottom-select";
import { ReviewCard } from "@/components/vocabulary/ReviewCard";
import { ReviewActions } from "@/components/vocabulary/ReviewActions";
import { useWords } from "@/hooks/useVocabulary";
import { useUpdateWordStatus } from "@/hooks/useProgress";
import {
  useBooksSimple,
  useVolumesSimple,
  useLessonsSimple,
} from "@/hooks/useBooks";
import { useWatchlistBooks } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";
import { isNative } from "@/lib/platform";
import { parseVocabParams, serializeVocabParams } from "@/lib/vocabFilters";
import {
  playPronunciation,
  stopPronunciation,
  warmUpPronunciation,
} from "@/lib/pronounce";
import type { ReviewMode, WordStatus, Word } from "@/types";

type ReviewFilter = WordStatus | "ALL";

const REVIEW_FILTER_OPTIONS: { label: string; value: ReviewFilter }[] = [
  { label: "همه", value: "ALL" },
  { label: "بلدم", value: "KNOWN" },
  { label: "بلد نیستم", value: "NOT_KNOWN" },
  { label: "بدون علامت", value: "NOT_READ" },
];
const MODE_OPTIONS: { label: string; value: ReviewMode }[] = [
  { label: "انگلیسی به فارسی", value: "EN_TO_FA" },
  { label: "فارسی به انگلیسی", value: "FA_TO_EN" },
];

function loadPersistedMode(): ReviewMode {
  try {
    const val = localStorage.getItem("vocab_review_mode");
    if (val === "EN_TO_FA" || val === "FA_TO_EN") return val;
  } catch {
    // ignore
  }
  return "EN_TO_FA";
}

function loadPersistedMuted(): boolean {
  try {
    return localStorage.getItem("vocab_review_muted") === "1";
  } catch {
    return false;
  }
}

function loadPersistedFilter(): ReviewFilter {
  try {
    const val = localStorage.getItem("vocab_review_filter");
    if (
      val === "ALL" ||
      val === "NOT_READ" ||
      val === "NOT_KNOWN" ||
      val === "KNOWN"
    )
      return val;
  } catch {
    // ignore
  }
  return "NOT_READ";
}

/** The last book/volume/lesson scope the user reviewed, remembered across visits. */
function loadPersistedScope(): {
  bookId?: string;
  volumeId?: string;
  lessonId?: string;
} {
  try {
    const raw = localStorage.getItem("vocab_review_scope");
    if (raw) {
      const p = JSON.parse(raw) as {
        bookId?: string;
        volumeId?: string;
        lessonId?: string;
      };
      return {
        bookId: p.bookId || undefined,
        volumeId: p.volumeId || undefined,
        lessonId: p.lessonId || undefined,
      };
    }
  } catch {
    // ignore
  }
  return {};
}

/** Map a vocabulary status param to the review page's filter options. */
function statusToReviewFilter(status: WordStatus | "ALL"): ReviewFilter {
  if (status === "NOT_READ") return "NOT_READ";
  if (status === "NOT_KNOWN") return "NOT_KNOWN";
  if (status === "KNOWN") return "KNOWN";
  return "ALL";
}

// Remembers the last review position (per filter scope) so returning to the
// page — after editing a word or visiting another page — resumes where you were.
let lastReviewPos: { key: string; index: number } | null = null;

export function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterPanelId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Seed the session from URL params carried over from the vocabulary page,
  // so "continue review" opens the same book/mode/status scope.
  const initial = useMemo(() => parseVocabParams(searchParams), [searchParams]);
  const fromVocabulary = searchParams.get("source") === "vocabulary";
  const [search, setSearch] = useState(
    fromVocabulary ? initial.filters.search : "",
  );
  const [chapter, setChapter] = useState(
    fromVocabulary ? initial.filters.chapter : undefined,
  );
  const sort = fromVocabulary ? initial.filters.sort : "chapter";

  const [mode, setMode] = useState<ReviewMode>(() =>
    searchParams.get("mode") ? initial.filters.mode : loadPersistedMode(),
  );
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(() =>
    fromVocabulary || searchParams.has("status")
      ? statusToReviewFilter(initial.filters.status)
      : loadPersistedFilter(),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  // Whether the current card shows the translation (controlled here so Space can toggle it).
  const [flipped, setFlipped] = useState(false);
  // Global sound switch. When muted, no pronunciation plays (auto or manual).
  const [muted, setMuted] = useState<boolean>(loadPersistedMuted);

  // Book/volume/lesson scope — editable in-page via the selectors. Seeded from
  // the URL when arriving via "continue review" (authoritative); otherwise
  // restored from the last scope the user reviewed (persisted in localStorage).
  const persistedScope = useMemo(() => loadPersistedScope(), []);
  const urlHasScope = fromVocabulary || searchParams.has("bookId");
  const [bookId, setBookId] = useState<string | undefined>(
    urlHasScope ? initial.filters.bookId : persistedScope.bookId,
  );
  const [volumeId, setVolumeId] = useState<string | undefined>(
    urlHasScope ? initial.filters.volumeId : persistedScope.volumeId,
  );
  const [lessonId, setLessonId] = useState<string | undefined>(
    urlHasScope ? initial.filters.lessonId : persistedScope.lessonId,
  );

  // Direct free review uses active plans; vocabulary results retain their full scope.
  const watchlistQuery = useWatchlistBooks();
  const allBooksQuery = useBooksSimple();
  const booksQuery = fromVocabulary ? allBooksQuery : watchlistQuery;
  const books = booksQuery.data;
  const volumesQuery = useVolumesSimple(bookId ?? "");
  const lessonsQuery = useLessonsSimple(bookId ?? "", volumeId ?? "");
  const { data: volumes } = volumesQuery;
  const { data: lessons } = lessonsQuery;

  // A pinned book (from "ادامه مطالعه" or a past visit, restored via
  // localStorage) can outlive its watchlist membership — its plan may have
  // been deleted since. Without this, `bookId` keeps pointing at a book no
  // longer in `books`, its words keep getting fetched/frozen forever, and
  // (since `sessionKey` below only reacts to watchlist composition when NO
  // book is pinned) the session/counter never resets either. Drop the pin
  // once the watchlist has loaded and no longer contains it, falling back to
  // the whole-watchlist scope.
  useEffect(() => {
    if (
      !fromVocabulary &&
      bookId &&
      books &&
      !books.some((b) => b.id === bookId)
    ) {
      setBookId(undefined);
      setVolumeId(undefined);
      setLessonId(undefined);
    }
  }, [bookId, books, fromVocabulary]);

  function handleBookChange(id: string) {
    setBookId(id || undefined);
    setVolumeId(undefined);
    setLessonId(undefined);
    setChapter(undefined);
  }

  function handleVolumeChange(id: string) {
    setVolumeId(id || undefined);
    setLessonId(undefined);
  }

  const { mutate: updateStatus } = useUpdateWordStatus();

  // Freeze a bounded set of matches; larger scopes show the session's cap.
  const apiStatus = reviewFilter === "ALL" ? undefined : reviewFilter;

  const watchlistBookIds = books?.map((b) => b.id) ?? [];
  // Direct review needs an active-plan scope; vocabulary entry can span all words.
  const hasScope =
    fromVocabulary || Boolean(bookId) || watchlistBookIds.length > 0;

  // A review session runs on a FROZEN snapshot of the matching words. Marking a
  // word updates its status in place (and on the server) but never drops it from
  // the list mid-session, so the counter advances one step per action
  // (۱/۵۰۰ → ۲/۵۰۰ → …) instead of collapsing words off the front of the list.
  // When no single book is pinned, the session spans the whole watchlist union —
  // so the key must include watchlist membership too. Otherwise adding/removing
  // a book leaves `sessionKey` unchanged, and the frozen snapshot + remembered
  // position (`lastReviewPos`) get silently reused against a now-different word
  // list on the next visit.
  const watchlistKey =
    fromVocabulary || bookId ? "" : watchlistBookIds.slice().sort().join(",");
  const sessionKey = JSON.stringify([
    fromVocabulary,
    mode,
    reviewFilter,
    bookId,
    volumeId,
    lessonId,
    watchlistKey,
    search,
    chapter,
    sort,
  ]);
  const [session, setSession] = useState<{
    key: string;
    words: Word[];
    matchedTotal?: number;
  }>({
    key: "",
    words: [],
  });
  const sessionReady = hasScope && session.key === sessionKey;

  const { data, isError, isFetching, refetch } = useWords(
    {
      limit: 500,
      page: 1,
      mode,
      status: apiStatus,
      sort,
      order: "asc",
      // Direct review falls back to active books; vocabulary keeps its exact scope.
      bookId,
      bookIds:
        fromVocabulary || bookId
          ? undefined
          : watchlistBookIds.length > 0
            ? watchlistBookIds
            : undefined,
      volumeId,
      lessonId,
      chapter,
      search: search.trim() || undefined,
    },
    // Fetch only until the snapshot is frozen; status updates must not refetch
    // and reshuffle the list under the user.
    { enabled: hasScope && !sessionReady },
  );

  // Freeze the fetched list as the session snapshot when a new session's data
  // lands. Wait until the query is no longer fetching so we never freeze STALE
  // cached data (which would show outdated known/not-known statuses on return).
  useEffect(() => {
    if (
      hasScope &&
      session.key !== sessionKey &&
      data?.data &&
      !isFetching &&
      !isError
    ) {
      setSession({
        key: sessionKey,
        words: data.data,
        matchedTotal: data.meta.total,
      });
      const saved = lastReviewPos?.key === sessionKey ? lastReviewPos.index : 0;
      setCurrentIndex(
        Math.min(Math.max(0, saved), Math.max(0, data.data.length - 1)),
      );
      setFlipped(false);
    }
  }, [hasScope, sessionKey, session.key, data, isFetching, isError]);

  // Remember the current position so we can resume it when the page remounts.
  useEffect(() => {
    if (sessionReady) lastReviewPos = { key: sessionKey, index: currentIndex };
  }, [sessionReady, sessionKey, currentIndex]);

  // Persist the review filter + book/volume/lesson scope so the next visit to
  // this page restores the same filters the user last set.
  useEffect(() => {
    if (fromVocabulary) return;
    try {
      localStorage.setItem("vocab_review_filter", reviewFilter);
    } catch {
      // ignore
    }
  }, [reviewFilter, fromVocabulary]);

  useEffect(() => {
    if (fromVocabulary) return;
    try {
      localStorage.setItem(
        "vocab_review_scope",
        JSON.stringify({ bookId, volumeId, lessonId }),
      );
    } catch {
      // ignore
    }
  }, [bookId, volumeId, lessonId, fromVocabulary]);

  const words = sessionReady ? session.words : [];
  const total = words.length;
  const contentError = isError || booksQuery.isError;
  const isLoading =
    !contentError && (booksQuery.isLoading || (hasScope && !sessionReady));
  const vocabularyUrl = `/vocabulary?${serializeVocabParams({ ...initial.filters, mode, status: reviewFilter, bookId, volumeId, lessonId, chapter, search, sort }, 1).toString()}`;

  const currentWord = words[currentIndex] ?? null;

  // Move the card to another word, always landing on the front face. Resetting
  // `flipped` synchronously (batched with the index change) — combined with the
  // `key` remount on the card — means the next word never shows its back mid-flip,
  // so you can't glimpse the next translation.
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, total - 1));
    setFlipped(false);
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
    setFlipped(false);
  }, []);

  const toggleFlip = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  // Play the current word's English pronunciation on demand (both review modes),
  // unless sound is muted.
  const pronounce = useCallback(() => {
    if (muted || !currentWord) return;
    playPronunciation(currentWord);
  }, [muted, currentWord]);

  function toggleMuted() {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem("vocab_review_muted", next ? "1" : "0");
      } catch {
        // ignore
      }
      if (next) stopPronunciation();
      return next;
    });
  }

  // Auto-play pronunciation when entering a new word — only in EN→FA mode and
  // only when not muted. Triggers on word change (not on mute/mode toggles).
  useEffect(() => {
    if (!muted && mode === "EN_TO_FA" && currentWord) {
      playPronunciation(currentWord);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord?.id]);

  // Stop any audio when leaving the review page.
  useEffect(() => {
    warmUpPronunciation();
    return () => stopPronunciation();
  }, []);

  const markStatus = useCallback(
    (status: "KNOWN" | "NOT_KNOWN") => {
      if (!currentWord) return;
      const wordId = currentWord.id;
      // Update the card's status in the frozen session list (badge updates in
      // place) + persist to the server, then advance one step. The word stays
      // put, so the counter moves 1→2→… instead of collapsing off the front.
      setSession((s) => ({
        ...s,
        words: s.words.map((w) =>
          w.id === wordId
            ? {
                ...w,
                progress: [
                  ...(w.progress ?? []).filter((p) => p.reviewMode !== mode),
                  // Manual free-review mark (separate from the SM-2 program).
                  {
                    id: "",
                    userId: "",
                    wordId,
                    reviewMode: mode,
                    status: "NOT_READ",
                    manualStatus: status,
                  },
                ],
              }
            : w,
        ),
      }));
      updateStatus({ wordId, reviewMode: mode, status });
      goNext();
    },
    [currentWord, mode, updateStatus, goNext],
  );

  const handleKnown = useCallback(() => markStatus("KNOWN"), [markStatus]);
  const handleNotKnown = useCallback(
    () => markStatus("NOT_KNOWN"),
    [markStatus],
  );

  // Keyboard shortcuts: ← → navigate, Space flips, ↑ = بلدم, ↓ = بلد نیستم.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't interfere with inputs / form controls (e.g. the book selectors)
      if (
        e.defaultPrevented ||
        (e.target instanceof HTMLElement &&
          e.target.closest('[role="dialog"], [contenteditable="true"]')) ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goNext();
      } else if (e.key === " " || e.code === "Space") {
        if (e.target instanceof HTMLElement && e.target.closest("button, a"))
          return;
        // Space reveals/hides the translation. preventDefault stops page scroll
        // and any focused-button activation.
        e.preventDefault();
        toggleFlip();
      } else if (e.key === "ArrowUp") {
        // ↑ = بلدم (known)
        e.preventDefault();
        handleKnown();
      } else if (e.key === "ArrowDown") {
        // ↓ = بلد نیستم (not known)
        e.preventDefault();
        handleNotKnown();
      } else if (e.key === "p" || e.key === "P") {
        // P = پخش تلفظ انگلیسی (هر دو حالت)
        e.preventDefault();
        pronounce();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, toggleFlip, handleKnown, handleNotKnown, pronounce]);

  function handleModeChange(newMode: ReviewMode) {
    setMode(newMode);
    setFlipped(false);
    try {
      localStorage.setItem("vocab_review_mode", newMode);
    } catch {
      // ignore
    }
  }

  function handleSkip() {
    goNext();
  }

  const progressPercent =
    total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  const selectedVolume = volumes?.find((volume) => volume.id === volumeId);
  const selectedLesson = lessons?.find((lesson) => lesson.id === lessonId);
  const filterSummary = [
    MODE_OPTIONS.find((option) => option.value === mode)?.label,
    REVIEW_FILTER_OPTIONS.find((option) => option.value === reviewFilter)
      ?.label,
    bookId
      ? books?.find((book) => book.id === bookId)?.title
      : fromVocabulary
        ? "همه کتاب‌ها"
        : "کتاب‌های لیست من",
    volumeId &&
      (selectedVolume?.title ??
        `جلد ${selectedVolume?.volumeNumber ?? "انتخاب‌شده"}`),
    lessonId &&
      (selectedLesson?.title ??
        `درس ${selectedLesson?.lessonNumber ?? "انتخاب‌شده"}`),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      dir="rtl"
      className="font-persian mx-auto w-full max-w-3xl space-y-3 px-1 py-1 sm:px-2"
    >
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate(fromVocabulary ? vocabularyUrl : "/vocabulary")
            }
            className="h-11 w-11 flex-shrink-0 rounded-xl"
            title="بازگشت به واژگان"
            aria-label="بازگشت به واژگان"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-lg font-bold text-foreground">
            مرور آزاد
          </h1>
          <button
            type="button"
            onClick={toggleMuted}
            title={muted ? "صدا خاموش است" : "صدا روشن است"}
            aria-label={muted ? "روشن کردن صدا" : "خاموش کردن صدا"}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              muted
                ? "border-border bg-muted text-muted-foreground"
                : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
            )}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">
          مرور دلخواه واژه‌ها، بدون تغییر زمان‌بندی مطالعهٔ روزانه.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls={filterPanelId}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium">فیلترهای مرور</span>
            <span
              className="block truncate text-[11px] leading-5 text-muted-foreground"
              title={filterSummary}
            >
              {filterSummary}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none",
              filtersOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <div
          id={filterPanelId}
          hidden={!filtersOpen}
          className="space-y-3 border-t border-border p-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BottomSelect
              label="جهت مرور"
              value={mode}
              onValueChange={handleModeChange}
              options={MODE_OPTIONS}
            />
            <BottomSelect
              label="کتاب"
              value={bookId ?? ""}
              disabled={booksQuery.isLoading || booksQuery.isError}
              onValueChange={handleBookChange}
              options={[
                {
                  value: "",
                  label: fromVocabulary
                    ? "همه کتاب‌ها"
                    : "همه کتاب‌های لیست من",
                },
                ...(books?.map((book) => ({
                  value: book.id,
                  label: book.title,
                })) ?? []),
              ]}
            />
            {bookId && (
              <BottomSelect
                label="جلد"
                value={volumeId ?? ""}
                disabled={volumesQuery.isLoading || volumesQuery.isError}
                onValueChange={handleVolumeChange}
                options={[
                  { value: "", label: "همه جلدها" },
                  ...(volumes?.map((volume) => ({
                    value: volume.id,
                    label: volume.title ?? `جلد ${volume.volumeNumber}`,
                  })) ?? []),
                ]}
              />
            )}
            {volumeId && (
              <BottomSelect
                label="درس"
                value={lessonId ?? ""}
                disabled={lessonsQuery.isLoading || lessonsQuery.isError}
                onValueChange={(value) => setLessonId(value || undefined)}
                options={[
                  { value: "", label: "همه درس‌ها" },
                  ...(lessons?.map((lesson) => ({
                    value: lesson.id,
                    label: lesson.title ?? `درس ${lesson.lessonNumber}`,
                  })) ?? []),
                ]}
              />
            )}
          </div>
          <div
            role="group"
            aria-label="وضعیت واژه"
            className="grid grid-cols-4 gap-1.5 sm:gap-2"
          >
            {REVIEW_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={reviewFilter === option.value}
                onClick={() => setReviewFilter(option.value)}
                className={cn(
                  "min-h-11 min-w-0 whitespace-nowrap rounded-full border px-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none sm:px-3",
                  reviewFilter === option.value
                    ? option.value === "KNOWN"
                      ? "border-success/50 bg-success/10 font-semibold text-success shadow-sm"
                      : option.value === "NOT_KNOWN"
                        ? "border-destructive/50 bg-destructive/10 font-semibold text-destructive shadow-sm"
                        : "border-primary bg-primary/15 font-semibold text-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {((bookId && volumesQuery.isError) ||
            (volumeId && lessonsQuery.isError)) && (
            <div className="flex items-center justify-between gap-2 text-xs text-destructive">
              <span>فیلترهای کتاب بارگذاری نشدند.</span>
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => {
                  if (volumesQuery.isError) void volumesQuery.refetch();
                  if (lessonsQuery.isError) void lessonsQuery.refetch();
                }}
              >
                تلاش مجدد
              </Button>
            </div>
          )}
        </div>
      </div>

      {fromVocabulary && (
        <div className="flex flex-wrap items-center gap-2 text-xs leading-6 text-muted-foreground">
          <span>مرور نتایج انتخاب‌شده در واژگان</span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="min-h-11 rounded-lg border border-border px-2"
              aria-label="حذف فیلتر جستجو"
            >
              جستجو: {search} ×
            </button>
          )}
          {chapter !== undefined && (
            <button
              type="button"
              onClick={() => setChapter(undefined)}
              className="min-h-11 rounded-lg border border-border px-2"
              aria-label="حذف فیلتر فصل"
            >
              فصل {chapter.toLocaleString("fa-IR")} ×
            </button>
          )}
          <Button
            variant="ghost"
            className="h-11 text-xs"
            onClick={() => navigate(vocabularyUrl)}
          >
            ویرایش فیلترها
          </Button>
          {sessionReady && (session.matchedTotal ?? 0) > total && (
            <p className="w-full">
              این جلسه شامل {total.toLocaleString("fa-IR")} واژهٔ نخست از{" "}
              {session.matchedTotal?.toLocaleString("fa-IR")} نتیجه است.
            </p>
          )}
        </div>
      )}

      {/* Progress — one counter for the whole session */}
      {!isLoading && total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span dir="ltr">
              <span className="font-semibold text-foreground">
                {(currentIndex + 1).toLocaleString("fa-IR")}
              </span>
              {" / "}
              {total.toLocaleString("fa-IR")}
            </span>
            <span>{progressPercent.toLocaleString("fa-IR")}٪</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      {isLoading ? (
        <div className="h-72 rounded-2xl bg-muted animate-pulse" />
      ) : contentError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
          <p className="text-sm text-destructive font-medium">
            خطا در بارگذاری واژگان.
          </p>
          <Button
            variant="outline"
            className="mt-3 h-11"
            disabled={isFetching || booksQuery.isFetching}
            onClick={() => {
              if (booksQuery.isError) void booksQuery.refetch();
              void refetch();
            }}
          >
            تلاش مجدد
          </Button>
        </div>
      ) : !hasScope ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">
            لیست یادگیری شما خالی است
          </p>
          <p className="text-sm text-muted-foreground">
            برای شروع مرور، ابتدا از کتابخانه یک یا چند کتاب به لیست یادگیری‌تان
            اضافه کنید.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/library")}
            className="mt-2"
          >
            رفتن به کتابخانه
          </Button>
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">
            واژه‌ای برای مرور وجود ندارد
          </p>
          <p className="text-sm text-muted-foreground">
            {fromVocabulary
              ? "واژه‌ای با این فیلترها پیدا نشد؛ جستجو یا وضعیت را تغییر دهید."
              : reviewFilter === "NOT_READ"
                ? "همهٔ واژه‌های این انتخاب در مرور آزاد علامت دارند."
                : reviewFilter === "NOT_KNOWN"
                  ? "واژه‌ای با وضعیت «بلد نیستم» در این حالت ندارید."
                  : "واژه‌ای یافت نشد."}
          </p>
          <Button
            variant="outline"
            onClick={() => setReviewFilter("ALL")}
            className="mt-2"
          >
            نمایش همه واژگان
          </Button>
        </div>
      ) : currentWord ? (
        <div className="space-y-3">
          {/* Flashcard (hero) — `key` remounts it fresh (front face) on word/mode
              change, so the next card's translation is never briefly visible. */}
          <ReviewCard
            key={currentWord.id + mode}
            word={currentWord}
            mode={mode}
            flipped={flipped}
            onToggle={toggleFlip}
            muted={muted}
            compact
          />

          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full flex-shrink-0"
              disabled={currentIndex === 0}
              onClick={goPrev}
              title="قبلی (→)"
              aria-label="قبلی"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <ReviewActions
              word={currentWord}
              mode={mode}
              onKnown={handleKnown}
              onNotKnown={handleNotKnown}
              onSkip={handleSkip}
            />

            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full flex-shrink-0"
              disabled={currentIndex === total - 1}
              onClick={goNext}
              title="بعدی (←)"
              aria-label="بعدی"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Footer: pronounce + edit link (compact) */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <button
              onClick={pronounce}
              disabled={muted}
              className="inline-flex min-h-11 items-center gap-1.5 hover:text-primary transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isNative() ? "پخش تلفظ" : "پخش تلفظ (P)"}
            </button>
            <button
              onClick={() => navigate(`/admin/words/${currentWord.id}/edit`)}
              className="inline-flex min-h-11 items-center gap-1.5 hover:text-primary transition-colors"
            >
              <SquarePen className="h-3.5 w-3.5" />
              اصلاح این واژه
            </button>
          </div>

          {/* Keyboard hint — web only (no physical keyboard on the app) */}
          {!isNative() && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground/80">
              {(
                [
                  { key: "→", label: "قبلی" },
                  { key: "←", label: "بعدی" },
                  { key: "Space", label: "برگرداندن" },
                  { key: "↑", label: "بلدم" },
                  { key: "↓", label: "بلد نیستم" },
                  { key: "P", label: "تلفظ" },
                ] as { key: string; label: string }[]
              ).map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-[11px]">
                    {s.key}
                  </kbd>
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
