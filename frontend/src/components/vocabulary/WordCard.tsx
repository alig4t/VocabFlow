import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, BookOpen, Sparkles, Volume2, SquarePen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useWordStatus } from '@/hooks/useProgress'
import { useAuthStore } from '@/store/authStore'
import { synonymService } from '@/services/synonym.service'
import { playPronunciation } from '@/lib/pronounce'
import { collectExamples, hasExamples } from '@/lib/word-examples'
import { SpeakButton } from './SpeakButton'
import { WordDescription } from './WordDescription'
import type { Word, ReviewMode, SynonymResult } from '@/types'

interface WordCardProps {
  word: Word
  mode: ReviewMode
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'KNOWN') {
    return (
      <Badge className="border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
        یاد گرفتم
      </Badge>
    )
  }
  if (status === 'NOT_KNOWN') {
    return (
      <Badge className="border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
        یاد نگرفتم
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      نخوانده
    </Badge>
  )
}

export function WordCard({ word, mode }: WordCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [synonymsOpen, setSynonymsOpen] = useState(false)
  const [synonyms, setSynonyms] = useState<SynonymResult[] | null>(null)
  const [loadingSynonyms, setLoadingSynonyms] = useState(false)

  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN')

  const status = useWordStatus(word, mode)

  const handleSpeak = useCallback(() => {
    playPronunciation({ eng: word.eng, pronunciationAudio: word.pronunciationAudio })
  }, [word.eng, word.pronunciationAudio])

  async function handleSynonymsToggle() {
    if (synonymsOpen) {
      setSynonymsOpen(false)
      return
    }
    setSynonymsOpen(true)
    if (synonyms === null) {
      setLoadingSynonyms(true)
      try {
        const data = await synonymService.getSynonyms(word.id)
        setSynonyms(data)
      } catch {
        setSynonyms([])
      } finally {
        setLoadingSynonyms(false)
      }
    }
  }

  const phonetic = word.pronunciation
  const pos = word.partOfSpeech
  const engIsPrimary = mode === 'EN_TO_FA'

  const lessonInfo = word.lesson
  const locationBadge = lessonInfo
    ? `${lessonInfo.volume.book.title} · جلد ${lessonInfo.volume.volumeNumber} · درس ${lessonInfo.lessonNumber}`
    : word.chapter != null || word.unit != null
      ? `${word.chapter != null ? `فصل ${word.chapter}` : ''}${word.chapter != null && word.unit != null ? ' · ' : ''}${word.unit != null ? `درس ${word.unit}` : ''}`
      : null

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md dark:hover:shadow-none dark:hover:border-border/80">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Primary word (bold, on top): English in EN→FA, Persian in FA→EN */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                dir={mode === 'FA_TO_EN' ? 'rtl' : 'ltr'}
                className={cn(
                  'text-xl font-bold text-foreground',
                  mode === 'FA_TO_EN' ? 'rtl' : 'tracking-tight',
                )}
              >
                {mode === 'FA_TO_EN' ? word.per : word.eng}
              </span>

              {/* Phonetic (IPA) — shown next to the English word, tiny & faint */}
              {engIsPrimary && phonetic && (
                <span dir="ltr" className="font-ipa text-xs text-muted-foreground/60">
                  {phonetic}
                </span>
              )}

              {/* Part of speech (noun/verb/…) from the data */}
              {pos && (
                <span className="rounded-full border border-border px-1.5 py-0 text-[10px] font-medium text-muted-foreground/70">
                  {pos}
                </span>
              )}

              {/* Audio pronunciation button — sits beside the English word, so
                  only in the top row when English is the primary word (EN→FA).
                  In FA→EN it moves down next to the English (secondary) line. */}
              {engIsPrimary && (
                <button
                  onClick={handleSpeak}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  title="تلفظ"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Location badge */}
              {locationBadge && (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">
                  {locationBadge}
                </span>
              )}
            </div>

            {/* Secondary word (below, muted): Persian in EN→FA, English in FA→EN */}
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <p
                dir={mode === 'FA_TO_EN' ? 'ltr' : 'rtl'}
                className={cn(
                  'text-base text-muted-foreground font-medium',
                  mode === 'FA_TO_EN' ? '' : 'rtl',
                )}
              >
                {mode === 'FA_TO_EN' ? word.eng : word.per}
                {!engIsPrimary && phonetic && (
                  <span dir="ltr" className="ms-2 font-ipa text-xs text-muted-foreground/50">
                    {phonetic}
                  </span>
                )}
              </p>

              {/* In FA→EN the English word lives here — attach its play button. */}
              {!engIsPrimary && (
                <button
                  onClick={handleSpeak}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  title="تلفظ"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Definition gloss — clamped so the list stays scannable */}
            <WordDescription word={word} variant="compact" />
          </div>

          {/* Status badge */}
          <div className="flex-shrink-0 pt-0.5">
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Action row (browse-only: marking happens on the Review page) */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="flex-1" />

          {/* Edit word (admins / offline app) */}
          {isAdmin && (
            <button
              onClick={() => navigate(`/admin/words/${word.id}/edit`)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <SquarePen className="h-3.5 w-3.5" />
              ویرایش
            </button>
          )}

          {/* Synonyms button */}
          <button
            onClick={handleSynonymsToggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {synonymsOpen ? 'پنهان کردن مترادف‌ها' : 'مترادف‌ها'}
          </button>

          {/* Expand examples button */}
          {hasExamples(word) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            synonymsOpen ? 'max-h-64 mt-3' : 'max-h-0',
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
                    <div key={i} className="h-6 w-16 rounded-full bg-muted animate-pulse" />
                  ))}
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
                <p className="text-sm text-muted-foreground italic">مترادفی یافت نشد.</p>
              )}
            </div>
          )}
        </div>

        {/* Examples section */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            expanded ? 'max-h-[600px] mt-3' : 'max-h-0',
          )}
        >
          {expanded && (
            <div className="border-t border-border pt-3 space-y-2">
              {/* Every example, including those nested under phrases */}
              {collectExamples(word).map((ex, i) => (
                <div key={i} className="space-y-0.5">
                  <div dir="ltr" className="flex items-start gap-2">
                    <SpeakButton text={ex.eng} label="پخش تلفظ مثال" className="mt-0.5" />
                    <p className="flex-1 text-start text-sm text-foreground leading-relaxed italic">
                      "{ex.eng}"
                    </p>
                  </div>
                  {ex.per && (
                    <p dir="rtl" className="text-start text-sm text-muted-foreground leading-relaxed rtl">
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
  )
}
