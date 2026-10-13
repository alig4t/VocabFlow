import { useState, useId } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  SquarePen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useWordStatus } from "@/hooks/useProgress";
import { useAuthStore } from "@/store/authStore";
import { synonymService } from "@/services/synonym.service";
import { collectExamples, hasExamples } from "@/lib/word-examples";
import { SpeakButton } from "./SpeakButton";
import { WordDescription } from "./WordDescription";
import type { Word, ReviewMode, SynonymResult } from "@/types";

interface WordCardProps {
  word: Word;
  mode: ReviewMode;
  showBook?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "KNOWN") {
    return (
      <Badge className="border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
        بلدم
      </Badge>
    );
  }
  if (status === "NOT_KNOWN") {
    return (
      <Badge className="border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
        بلد نیستم
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      بدون علامت
    </Badge>
  );
}

export function WordCard({ word, mode, showBook = true }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [synonymsOpen, setSynonymsOpen] = useState(false);
  const [synonyms, setSynonyms] = useState<SynonymResult[] | null>(null);
  const [loadingSynonyms, setLoadingSynonyms] = useState(false);
  const [synonymsError, setSynonymsError] = useState(false);
  const synonymsId = useId();
  const examplesId = useId();

  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const status = useWordStatus(word, mode);

  async function loadSynonyms() {
    if (loadingSynonyms) return;
    setLoadingSynonyms(true);
    setSynonymsError(false);
    try {
      setSynonyms(await synonymService.getSynonyms(word.id));
    } catch {
      setSynonymsError(true);
    } finally {
      setLoadingSynonyms(false);
    }
  }

  async function handleSynonymsToggle() {
    if (synonymsOpen) {
      setSynonymsOpen(false);
      return;
    }
    setSynonymsOpen(true);
    if (synonyms === null) {
      await loadSynonyms();
    }
  }

  const phonetic = word.pronunciation;
  const pos = word.partOfSpeech;
  const engIsPrimary = mode === "EN_TO_FA";

  const lessonInfo = word.lesson;
  const locationBadge = lessonInfo
    ? `${showBook ? `${lessonInfo.volume.book.title} · ` : ""}جلد ${lessonInfo.volume.volumeNumber.toLocaleString("fa-IR")} · درس ${lessonInfo.lessonNumber.toLocaleString("fa-IR")}`
    : word.chapter != null || word.unit != null
      ? `${word.chapter != null ? `فصل ${word.chapter}` : ""}${word.chapter != null && word.unit != null ? " · " : ""}${word.unit != null ? `درس ${word.unit}` : ""}`
      : null;

  return (
    <Card
      data-word-id={word.id}
      className="overflow-hidden rounded-xl transition-shadow hover:shadow-md dark:hover:shadow-none dark:hover:border-border/80"
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Primary word (bold, on top): English in EN→FA, Persian in FA→EN */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                dir={mode === "FA_TO_EN" ? "rtl" : "ltr"}
                className={cn(
                  "text-xl font-bold text-foreground break-words [overflow-wrap:anywhere]",
                  mode === "FA_TO_EN" ? "rtl" : "tracking-tight",
                )}
              >
                {mode === "FA_TO_EN" ? word.per : word.eng}
              </span>

              {/* Phonetic (IPA) — shown next to the English word, tiny & faint */}
              {engIsPrimary && phonetic && (
                <span
                  dir="ltr"
                  className="font-ipa text-sm text-muted-foreground"
                >
                  {phonetic}
                </span>
              )}

              {/* Part of speech (noun/verb/…) from the data */}
              {pos && (
                <span
                  dir="ltr"
                  className="rounded-full border border-border px-1.5 py-0 text-xs font-medium text-muted-foreground"
                >
                  {pos}
                </span>
              )}
            </div>

            {/* Secondary word (below, muted): Persian in EN→FA, English in FA→EN */}
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <p
                dir={mode === "FA_TO_EN" ? "ltr" : "rtl"}
                className={cn(
                  "text-base text-foreground/80 font-medium break-words [overflow-wrap:anywhere]",
                  mode === "FA_TO_EN" ? "" : "rtl",
                )}
              >
                {mode === "FA_TO_EN" ? word.eng : word.per}
                {!engIsPrimary && phonetic && (
                  <span
                    dir="ltr"
                    className="ms-2 font-ipa text-sm text-muted-foreground"
                  >
                    {phonetic}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div
            className="flex flex-shrink-0 flex-col items-center gap-2 pt-0.5"
            title="وضعیت در مرور آزاد"
          >
            <StatusBadge status={status} />
            <SpeakButton
              text={word.eng}
              audioUrl={word.pronunciationAudio}
              label={`تلفظ ${word.eng}`}
              className="h-11 w-11"
            />
          </div>
        </div>

        <WordDescription word={word} variant="compact" />

        {/* Action row (browse-only: marking happens on the Review page) */}
        {locationBadge && (
          <p className="mt-3 break-words text-xs leading-6 text-muted-foreground">
            {locationBadge}
          </p>
        )}
        <div className="mt-2 flex items-center justify-end gap-1 flex-wrap">
          {/* Edit word (admins / offline app) */}
          {isAdmin && (
            <button
              onClick={() => navigate(`/admin/words/${word.id}/edit`)}
              className="flex min-h-11 items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SquarePen className="h-3.5 w-3.5" />
              ویرایش
            </button>
          )}

          {/* Synonyms button */}
          <button
            onClick={handleSynonymsToggle}
            aria-expanded={synonymsOpen}
            aria-controls={synonymsId}
            className="flex min-h-11 items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {synonymsOpen ? "پنهان کردن مترادف‌ها" : "مترادف‌ها"}
          </button>

          {/* Expand examples button */}
          {hasExamples(word) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={examplesId}
              className="flex min-h-11 items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {expanded ? (
                <>
                  پنهان کردن مثال‌ها <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  مثال‌ها <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Synonyms section */}
        <div
          id={synonymsId}
          aria-busy={loadingSynonyms}
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            synonymsOpen ? "max-h-64 mt-3 overflow-y-auto" : "max-h-0",
          )}
        >
          {synonymsOpen && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                مترادف‌ها
              </p>
              {loadingSynonyms ? (
                <div className="flex gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-6 w-16 rounded-full bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : synonymsError ? (
                <div role="alert" className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-destructive">
                    مترادف‌ها بارگذاری نشدند.
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadSynonyms()}
                    className="min-h-11 rounded-lg border border-border px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    تلاش مجدد
                  </button>
                </div>
              ) : synonyms && synonyms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {synonyms.map((syn, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
                    >
                      {syn.word}
                      <span className="text-muted-foreground">
                        {Math.round(syn.similarity * 100)}%
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  مترادفی یافت نشد.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Examples section */}
        <div
          id={examplesId}
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            expanded ? "max-h-[70vh] mt-3 overflow-y-auto" : "max-h-0",
          )}
        >
          {expanded && (
            <div className="border-t border-border pt-3 space-y-2">
              {/* Every example, including those nested under phrases */}
              {collectExamples(word).map((ex, i) => (
                <div key={i} className="space-y-0.5">
                  <div dir="ltr" className="flex items-start gap-2">
                    <SpeakButton
                      text={ex.eng}
                      label="پخش تلفظ مثال"
                      className="mt-0.5 h-11 w-11"
                    />
                    <p className="flex-1 text-start text-sm text-foreground leading-relaxed italic">
                      "{ex.eng}"
                    </p>
                  </div>
                  {ex.per && (
                    <p
                      dir="rtl"
                      className="text-start text-sm text-muted-foreground leading-relaxed rtl"
                    >
                      {ex.per}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
