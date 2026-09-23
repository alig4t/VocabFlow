import { useNavigate } from "react-router-dom";
import { BookText, Check, GraduationCap, Info, Sparkles } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { faNum } from "../../lib/format";
import { getBookMeta, LEVEL_CLASS } from "../../lib/bookMeta";
import type { DiscoveryBook } from "../../types";

interface RecommendedBookCardProps {
  book: DiscoveryBook;
  /** One-line Persian answer to "why is this recommended?". */
  reason: string;
  onStartPlan: (book: DiscoveryBook) => void;
}

/**
 * A discovery card variant for curated recommendations: visually elevated
 * (primary ring + badge) so it reads as an editor's pick, not just another
 * list item. Kept structurally close to DiscoveryBookCard for consistency.
 */
export function RecommendedBookCard({
  book,
  reason,
  onStartPlan,
}: RecommendedBookCardProps) {
  const navigate = useNavigate();
  const meta = getBookMeta(book.title);

  return (
    <Card className="relative flex flex-col gap-3 p-5 ring-1 ring-primary/25 bg-gradient-to-b from-primary/[0.06] to-background shadow-soft transition-shadow hover:shadow-md">
      <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        پیشنهاد ما
      </span>

      <header className="flex items-start gap-3 pt-1">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            loading="lazy"
            className="h-20 w-14 shrink-0 rounded-lg object-cover ring-1 ring-border bg-muted"
          />
        ) : (
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <BookText className="h-7 w-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-foreground">
            {book.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLASS[meta.level]}`}
            >
              {meta.level}
            </span>
            <span className="text-xs text-muted-foreground">
              {faNum(book.totalWords)} واژه
            </span>
            {book.inWatchlist && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" aria-hidden="true" />
                در حال یادگیری
              </span>
            )}
          </div>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-muted-foreground">{reason}</p>

      <footer className="mt-auto flex items-center gap-2 pt-1">
        <Button
          variant={book.inWatchlist ? "outline" : "default"}
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onStartPlan(book)}
        >
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          {book.inWatchlist ? "مدیریت برنامه" : "شروع یادگیری"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={() => navigate(`/library/${book.id}`)}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          توضیحات
        </Button>
      </footer>
    </Card>
  );
}
