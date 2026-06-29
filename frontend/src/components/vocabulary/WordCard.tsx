import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Sparkles, Volume2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useUpdateWordStatus, useWordStatus } from '@/hooks/useProgress'
import { synonymService } from '@/services/synonym.service'
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

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

export function WordCard({ word, mode }: WordCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [synonymsOpen, setSynonymsOpen] = useState(false)
  const [synonyms, setSynonyms] = useState<SynonymResult[] | null>(null)
  const [loadingSynonyms, setLoadingSynonyms] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const status = useWordStatus(word, mode)
  const { mutate: updateStatus, isPending } = useUpdateWordStatus()

  function handleStatus(newStatus: 'KNOWN' | 'NOT_KNOWN') {
    if (isPending) return
    updateStatus({ wordId: word.id, reviewMode: mode, status: newStatus })
  }

  const handleSpeak = useCallback(() => {
    if (!('speechSynthesis' in window)) return
    setIsSpeaking(true)
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word.eng)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [word.eng])

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
            {/* English word + audio button */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-bold text-foreground tracking-tight">
                {word.eng}
              </span>

              {/* Audio pronunciation button */}
              {'speechSynthesis' in window && (
                <button
                  onClick={handleSpeak}
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors',
                    isSpeaking
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/10',
                  )}
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

            {/* Persian meaning */}
            <p dir="rtl" className="mt-1 text-base text-muted-foreground font-medium rtl">
              {word.per}
            </p>

            {/* Description */}
            {word.description && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-snug line-clamp-2">
                {word.description}
              </p>
            )}
          </div>

          {/* Status badge */}
          <div className="flex-shrink-0 pt-0.5">
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Action row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {/* Status change buttons */}
          <button
            onClick={() => handleStatus('KNOWN')}
            disabled={isPending}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-semibold border transition-all duration-150',
              status === 'KNOWN'
                ? 'bg-green-500 text-white border-green-500'
                : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30',
              isPending && 'opacity-50 cursor-not-allowed',
            )}
          >
            یاد گرفتم
          </button>
          <button
            onClick={() => handleStatus('NOT_KNOWN')}
            disabled={isPending}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-semibold border transition-all duration-150',
              status === 'NOT_KNOWN'
                ? 'bg-red-500 text-white border-red-500'
                : 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30',
              isPending && 'opacity-50 cursor-not-allowed',
            )}
          >
            یاد نگرفتم
          </button>

          <div className="flex-1" />

          {/* Synonyms button */}
          <button
            onClick={handleSynonymsToggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {synonymsOpen ? 'پنهان کردن مترادف‌ها' : 'مترادف‌ها'}
          </button>

          {/* Expand examples button */}
          {(word.examples?.length > 0 || word.primaryExample) && (
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
            <div className="border-t border-border pt-3 space-y-3">
              {/* Primary example */}
              {word.primaryExample && (
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-foreground leading-relaxed italic flex-1">
                      "{word.primaryExample}"
                    </p>
                    <button
                      onClick={() => speak(word.primaryExample!)}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                      title="تلفظ"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {word.primaryExampleTrs && (
                    <p dir="rtl" className="text-sm text-muted-foreground leading-relaxed rtl">
                      {word.primaryExampleTrs}
                    </p>
                  )}
                </div>
              )}

              {/* Additional examples */}
              {word.examples?.length > 0 && (
                <div className="space-y-2">
                  {word.examples.map((ex, i) => (
                    <div key={ex.id ?? i} className="space-y-0.5">
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-foreground leading-relaxed italic flex-1">
                          "{ex.engSentence}"
                        </p>
                        <button
                          onClick={() => speak(ex.engSentence)}
                          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                          title="تلفظ"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {ex.perTranslation && (
                        <p dir="rtl" className="text-sm text-muted-foreground leading-relaxed rtl">
                          {ex.perTranslation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
