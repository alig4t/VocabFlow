import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface DraftPhraseExample {
  tempId: string
  eng: string
  per: string
}

export interface DraftPhrase {
  tempId: string
  patternEng: string
  patternPer: string
  examples: DraftPhraseExample[]
}

interface PhraseManagerProps {
  phrases: DraftPhrase[]
  onChange: (phrases: DraftPhrase[]) => void
}

function PhraseForm({
  onSave,
  onCancel,
}: {
  onSave: (phrase: Omit<DraftPhrase, 'tempId'>) => void
  onCancel: () => void
}) {
  const [patternEng, setPatternEng] = useState('')
  const [patternPer, setPatternPer] = useState('')
  const [examples, setExamples] = useState<DraftPhraseExample[]>([])
  const [exEng, setExEng] = useState('')
  const [exPer, setExPer] = useState('')

  function addExample() {
    const trimmed = exEng.trim()
    if (!trimmed) return
    setExamples([...examples, { tempId: crypto.randomUUID(), eng: trimmed, per: exPer.trim() }])
    setExEng('')
    setExPer('')
  }

  function handleExampleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addExample() }
  }

  function removeExample(tempId: string) {
    setExamples(examples.filter((e) => e.tempId !== tempId))
  }

  function handleSave() {
    const trimmed = patternEng.trim()
    if (!trimmed) return
    onSave({ patternEng: trimmed, patternPer: patternPer.trim(), examples })
  }

  return (
    <div className="border border-border rounded-md p-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>عبارت انگلیسی *</Label>
          <Input
            dir="ltr"
            placeholder="to be afraid of..."
            value={patternEng}
            onChange={(e) => setPatternEng(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>معادل فارسی</Label>
          <Input
            dir="rtl"
            placeholder="از چیزی ترسیدن"
            value={patternPer}
            onChange={(e) => setPatternPer(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">مثال‌ها (اختیاری)</p>

        {examples.map((ex) => (
          <div
            key={ex.tempId}
            className="flex gap-2 items-start bg-background rounded p-2 border border-border"
          >
            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="text-sm" dir="ltr">{ex.eng}</p>
              {ex.per && (
                <p className="text-sm text-muted-foreground" dir="rtl">{ex.per}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive shrink-0"
              onClick={() => removeExample(ex.tempId)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-2">
          <Input
            dir="ltr"
            placeholder="جمله انگلیسی..."
            value={exEng}
            onChange={(e) => setExEng(e.target.value)}
            onKeyDown={handleExampleKeyDown}
            className="text-sm"
          />
          <Input
            dir="rtl"
            placeholder="ترجمه فارسی..."
            value={exPer}
            onChange={(e) => setExPer(e.target.value)}
            onKeyDown={handleExampleKeyDown}
            className="text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addExample}
          disabled={!exEng.trim()}
        >
          <Plus className="h-3 w-3 ml-1" />
          افزودن مثال
        </Button>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          انصراف
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={!patternEng.trim()}>
          ذخیره عبارت
        </Button>
      </div>
    </div>
  )
}

export function PhraseManager({ phrases, onChange }: PhraseManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function addPhrase(data: Omit<DraftPhrase, 'tempId'>) {
    onChange([...phrases, { tempId: crypto.randomUUID(), ...data }])
    setShowAddForm(false)
  }

  function removePhrase(tempId: string) {
    onChange(phrases.filter((p) => p.tempId !== tempId))
    setExpanded((prev) => { const next = new Set(prev); next.delete(tempId); return next })
  }

  function toggleExpand(tempId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(tempId) ? next.delete(tempId) : next.add(tempId)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          عبارات ({phrases.length})
        </h3>
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 ml-1" />
            افزودن عبارت
          </Button>
        )}
      </div>

      {phrases.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground italic">عبارتی ثبت نشده است.</p>
      )}

      <div className="space-y-2">
        {phrases.map((phrase, idx) => (
          <div key={phrase.tempId} className="border border-border rounded-md bg-card">
            <div className="flex items-center gap-2 p-3">
              <span className="text-xs text-muted-foreground w-5 shrink-0 text-left">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" dir="ltr">{phrase.patternEng}</p>
                {phrase.patternPer && (
                  <p className="text-xs text-muted-foreground" dir="rtl">{phrase.patternPer}</p>
                )}
              </div>
              {phrase.examples.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                  onClick={() => toggleExpand(phrase.tempId)}
                >
                  {expanded.has(phrase.tempId) ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {phrase.examples.length}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => removePhrase(phrase.tempId)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {expanded.has(phrase.tempId) && phrase.examples.length > 0 && (
              <div className="border-t border-border px-4 py-2 space-y-2 bg-muted/30">
                {phrase.examples.map((ex, ei) => (
                  <div key={ex.tempId} className="text-sm">
                    <p dir="ltr">{ei + 1}. {ex.eng}</p>
                    {ex.per && (
                      <p dir="rtl" className="text-muted-foreground">{ex.per}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {showAddForm && (
          <PhraseForm
            onSave={addPhrase}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>
    </div>
  )
}
