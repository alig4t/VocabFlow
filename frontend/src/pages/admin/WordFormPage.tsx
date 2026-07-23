import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useWord,
  useModules,
  useCreateWord,
  useUpdateWord,
} from '@/hooks/useVocabulary'
import { useBooksSimple, useVolumesSimple, useLessonsSimple } from '@/hooks/useBooks'
import { ExampleManager, type DraftExample } from '@/components/admin/ExampleManager'
import { PhraseManager, type DraftPhrase } from '@/components/admin/PhraseManager'
import { vocabularyService } from '@/services/vocabulary.service'
import { toast } from '@/components/ui/use-toast'
import { isNative } from '@/lib/platform'

const wordSchema = z.object({
  eng: z.string().min(1, 'واژه انگلیسی الزامی است'),
  per: z.string().min(1, 'معنی فارسی الزامی است'),
  description: z.string().optional(),
  descriptionPer: z.string().optional(),
  pronunciation: z.string().optional(),
  partOfSpeech: z.string().optional(),
  wordForms: z.string().optional(),
  chapter: z
    .string()
    .optional()
    .transform((v) => (v && v !== '' ? parseInt(v, 10) : undefined)),
  unit: z
    .string()
    .optional()
    .transform((v) => (v && v !== '' ? parseInt(v, 10) : undefined)),
  primaryExample: z.string().optional(),
  primaryExampleTrs: z.string().optional(),
  moduleId: z.string().min(1, 'ماژول الزامی است'),
})

type WordFormInput = {
  eng: string
  per: string
  description?: string
  descriptionPer?: string
  pronunciation?: string
  partOfSpeech?: string
  wordForms?: string
  chapter?: string
  unit?: string
  primaryExample?: string
  primaryExampleTrs?: string
  moduleId: string
}

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder,
  dir = 'ltr',
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  dir?: 'ltr' | 'rtl'
}) {
  const [input, setInput] = useState('')

  function commit() {
    const val = input.trim()
    if (!val || tags.includes(val)) { setInput(''); return }
    onChange([...tags, val])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        dir={dir}
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
      />
      <p className="text-xs text-muted-foreground">با Enter یا ویرگول تأیید کنید</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WordFormPage() {
  const navigate = useNavigate()
  // Return to wherever the editor was opened from, preserving that page's
  // filters/scroll/position (vocabulary list or review session).
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(isNative() ? '/vocabulary' : '/admin')
  }
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const isEditMode = Boolean(id)

  const prefilledBookId   = searchParams.get('bookId')   ?? ''
  const prefilledVolumeId = searchParams.get('volumeId') ?? ''
  const prefilledLessonId = searchParams.get('lessonId') ?? ''
  const isLessonPrefilled = Boolean(prefilledLessonId)

  const { data: word, isLoading: wordLoading } = useWord(id ?? '')
  const { data: modules, isLoading: modulesLoading } = useModules()
  const createWordMutation = useCreateWord()
  const updateWordMutation = useUpdateWord()

  const { data: books } = useBooksSimple()
  const [selectedBookId,   setSelectedBookId]   = useState<string>(prefilledBookId)
  const [selectedVolumeId, setSelectedVolumeId] = useState<string>(prefilledVolumeId)
  const [selectedLessonId, setSelectedLessonId] = useState<string>(prefilledLessonId)

  const { data: volumes } = useVolumesSimple(selectedBookId)
  const { data: lessons } = useLessonsSimple(selectedBookId, selectedVolumeId)

  const selectedBook   = useMemo(() => books?.find((b) => b.id === selectedBookId),   [books, selectedBookId])
  const selectedVolume = useMemo(() => volumes?.find((v) => v.id === selectedVolumeId), [volumes, selectedVolumeId])
  const selectedLesson = useMemo(() => lessons?.find((l) => l.id === selectedLessonId), [lessons, selectedLessonId])

  const [draftExamples, setDraftExamples] = useState<DraftExample[]>([])
  const [draftPhrases,  setDraftPhrases]  = useState<DraftPhrase[]>([])
  const [draftSynonyms, setDraftSynonyms] = useState<string[]>([])
  const [draftAntonyms, setDraftAntonyms] = useState<string[]>([])
  const [submitError,   setSubmitError]   = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WordFormInput>({
    resolver: zodResolver(wordSchema) as any,
    defaultValues: {
      eng: '', per: '', description: '', descriptionPer: '', pronunciation: '', partOfSpeech: '',
      wordForms: '', chapter: '', unit: '', primaryExample: '', primaryExampleTrs: '', moduleId: '',
    },
  })

  useEffect(() => {
    if (isEditMode && word) {
      reset({
        eng:               word.eng,
        per:               word.per,
        description:       word.description       ?? '',
        descriptionPer:    word.descriptionPer    ?? '',
        pronunciation:     word.pronunciation      ?? '',
        partOfSpeech:      word.partOfSpeech       ?? '',
        wordForms:         word.wordForms          ?? '',
        chapter:           word.chapter?.toString() ?? '',
        unit:              word.unit?.toString()    ?? '',
        primaryExample:    word.primaryExample     ?? '',
        primaryExampleTrs: word.primaryExampleTrs  ?? '',
        moduleId:          word.moduleId,
      })
      if (word.lesson) {
        setSelectedBookId(word.lesson.volume.book.id)
        setSelectedVolumeId(word.lesson.volume.id)
        setSelectedLessonId(word.lessonId ?? '')
      }
      setDraftSynonyms(word.synonyms ?? [])
      setDraftAntonyms(word.antonyms ?? [])
      setDraftPhrases(
        (word.phrases ?? []).map((p) => ({
          tempId:     p.id,
          patternEng: p.patternEng,
          patternPer: p.patternPer,
          examples:   (p.examples ?? []).map((ex) => ({
            tempId: ex.id,
            eng:    ex.engSentence,
            per:    ex.perTranslation,
          })),
        })),
      )
    }
  }, [isEditMode, word, reset])

  function handleBookChange(bookId: string) {
    setSelectedBookId(bookId)
    setSelectedVolumeId('')
    setSelectedLessonId('')
  }

  function handleVolumeChange(volumeId: string) {
    setSelectedVolumeId(volumeId)
    setSelectedLessonId('')
  }

  async function onSubmit(raw: WordFormInput) {
    setSubmitError(null)
    // `raw` is already validated AND transformed by the zodResolver (chapter/unit
    // are numbers here). Re-parsing with the schema would double-transform and
    // throw "invalid type" — so use the resolved values directly.
    const parsed = raw as unknown as z.output<typeof wordSchema>

    const payload = {
      ...parsed,
      lessonId:  selectedLessonId || undefined,
      synonyms:  draftSynonyms,
      antonyms:  draftAntonyms,
      phrases:   draftPhrases.map((p, pi) => ({
        patternEng: p.patternEng,
        patternPer: p.patternPer,
        order:      pi,
        examples:   p.examples.map((ex, ei) => ({
          engSentence:    ex.eng,
          perTranslation: ex.per,
          order:          ei,
        })),
      })),
    }

    try {
      if (isEditMode && id) {
        await updateWordMutation.mutateAsync({ id, data: payload })
        toast({ title: 'واژه با موفقیت ویرایش شد', variant: 'success' })
        goBack()
      } else {
        const created = await createWordMutation.mutateAsync(payload)
        for (let i = 0; i < draftExamples.length; i++) {
          const ex = draftExamples[i]
          await vocabularyService.addExample(created.id, {
            engSentence:    ex.engSentence,
            perTranslation: ex.perTranslation,
            order: i,
          })
        }
        toast({ title: 'واژه با موفقیت اضافه شد', variant: 'success' })
        goBack()
      }
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'خطا در ذخیره واژه'
      setSubmitError(message)
      toast({ title: 'خطا در ذخیره واژه', description: message, variant: 'destructive' })
    }
  }

  const isLoading = (isEditMode && wordLoading) || modulesLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 font-persian" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => goBack()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEditMode ? 'ویرایش واژه' : 'افزودن واژه'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── جزئیات واژه ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">جزئیات واژه</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eng">واژه انگلیسی *</Label>
              <Input id="eng" placeholder="eloquent" dir="ltr" {...register('eng')} />
              {errors.eng && <p className="text-xs text-destructive">{errors.eng.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="per">معنی فارسی *</Label>
              <Input id="per" placeholder="معنی فارسی" dir="rtl" {...register('per')} />
              {errors.per && <p className="text-xs text-destructive">{errors.per.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pronunciation">تلفظ</Label>
                <Input id="pronunciation" placeholder="/ˈel.ə.kwənt/" dir="ltr" {...register('pronunciation')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partOfSpeech">نوع کلمه</Label>
                <Input id="partOfSpeech" placeholder="adjective" dir="ltr" {...register('partOfSpeech')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="description">تعریف (انگلیسی)</Label>
                <Input id="description" placeholder="obey or do what sth states" dir="ltr" {...register('description')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="descriptionPer">تعریف (فارسی)</Label>
                <Input id="descriptionPer" placeholder="توضیح یا یادداشت اختیاری..." {...register('descriptionPer')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wordForms">حالات کلمه</Label>
              <Input id="wordForms" placeholder="مثال: تفضیلی: more afraid  عالی: most afraid" dir="ltr" {...register('wordForms')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="moduleId">نوع محتوا *</Label>
              <Controller
                name="moduleId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="moduleId">
                      <SelectValue placeholder="یک نوع انتخاب کنید..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(modules ?? []).map((mod) => (
                        <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.moduleId && <p className="text-xs text-destructive">{errors.moduleId.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* ── مترادف و متضاد ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مترادف و متضاد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>مترادف‌ها</Label>
              <TagInput
                tags={draftSynonyms}
                onChange={setDraftSynonyms}
                placeholder="frightened, scared, ..."
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>متضادها</Label>
              <TagInput
                tags={draftAntonyms}
                onChange={setDraftAntonyms}
                placeholder="brave, unafraid, ..."
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── موقعیت در کتاب ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">موقعیت در کتاب (اختیاری)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLessonPrefilled ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 space-y-2">
                <p className="text-xs font-medium text-primary">این واژه به درس زیر اضافه می‌شود:</p>
                <div className="flex flex-wrap gap-2 text-sm font-medium text-foreground">
                  {selectedBook && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-0.5 text-xs">
                      📚 {selectedBook.title}
                    </span>
                  )}
                  {selectedVolume && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-0.5 text-xs">
                      📖 جلد {selectedVolume.volumeNumber}{selectedVolume.title ? ` — ${selectedVolume.title}` : ''}
                    </span>
                  )}
                  {selectedLesson && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs text-primary font-semibold">
                      درس {selectedLesson.lessonNumber}{selectedLesson.title ? ` — ${selectedLesson.title}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">برای تغییر درس، از صفحه مدیریت درس‌ها اقدام کنید.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  اگر این واژه به درس خاصی تعلق دارد آن را انتخاب کنید.
                </p>
                {books && books.length > 0 ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>کتاب</Label>
                      <select
                        value={selectedBookId}
                        onChange={(e) => handleBookChange(e.target.value)}
                        className="select-field"
                      >
                        <option value="">— بدون کتاب —</option>
                        {books.map((b) => (
                          <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                      </select>
                    </div>

                    {selectedBookId && volumes && volumes.length > 0 && (
                      <div className="space-y-1.5">
                        <Label>جلد</Label>
                        <select
                          value={selectedVolumeId}
                          onChange={(e) => handleVolumeChange(e.target.value)}
                          className="select-field"
                        >
                          <option value="">— انتخاب جلد —</option>
                          {volumes.map((v) => (
                            <option key={v.id} value={v.id}>{v.title ?? `جلد ${v.volumeNumber}`}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedVolumeId && lessons && lessons.length > 0 && (
                      <div className="space-y-1.5">
                        <Label>درس</Label>
                        <select
                          value={selectedLessonId}
                          onChange={(e) => setSelectedLessonId(e.target.value)}
                          className="select-field"
                        >
                          <option value="">— انتخاب درس —</option>
                          {lessons.map((l) => (
                            <option key={l.id} value={l.id}>{l.title ?? `درس ${l.lessonNumber}`}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    هنوز کتابی تعریف نشده است. ابتدا از بخش «کتاب‌ها» یک کتاب اضافه کنید.
                  </p>
                )}

                {!selectedBookId && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="chapter">فصل (قدیمی)</Label>
                      <Input id="chapter" type="number" min="1" placeholder="مثال: ۳" {...register('chapter')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="unit">درس (قدیمی)</Label>
                      <Input id="unit" type="number" min="1" placeholder="مثال: ۲" {...register('unit')} />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── جمله مثال اصلی ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">جمله مثال اصلی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="primaryExample">جمله انگلیسی</Label>
              <Input id="primaryExample" placeholder="She is an eloquent speaker." dir="ltr" {...register('primaryExample')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primaryExampleTrs">ترجمه فارسی</Label>
              <Input id="primaryExampleTrs" placeholder="او یک سخنران سخنور است." dir="rtl" {...register('primaryExampleTrs')} />
            </div>
          </CardContent>
        </Card>

        {/* ── عبارات ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">عبارات و الگوهای کاربردی</CardTitle>
          </CardHeader>
          <CardContent>
            <PhraseManager phrases={draftPhrases} onChange={setDraftPhrases} />
          </CardContent>
        </Card>

        {/* ── مثال‌های اضافی ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مثال‌های اضافی</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditMode && word ? (
              <ExampleManager wordId={word.id} existingExamples={word.examples} />
            ) : (
              <ExampleManager draftExamples={draftExamples} onDraftChange={setDraftExamples} />
            )}
          </CardContent>
        </Card>

        {submitError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {submitError}
          </p>
        )}

        <div className="flex gap-3 justify-start">
          <Button type="button" variant="outline" onClick={() => goBack()} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin ml-2" />در حال ذخیره...</>
            ) : isEditMode ? 'ویرایش واژه' : 'ذخیره واژه'}
          </Button>
        </div>
      </form>
    </div>
  )
}
