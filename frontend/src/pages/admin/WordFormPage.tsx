import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
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
import { ExampleManager, type DraftExample } from '@/components/admin/ExampleManager'
import { vocabularyService } from '@/services/vocabulary.service'
import { toast } from '@/components/ui/use-toast'

const wordSchema = z.object({
  eng: z.string().min(1, 'لغت انگلیسی الزامی است'),
  per: z.string().min(1, 'معنی فارسی الزامی است'),
  description: z.string().optional(),
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
  chapter?: string
  unit?: string
  primaryExample?: string
  primaryExampleTrs?: string
  moduleId: string
}

export function WordFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEditMode = Boolean(id)

  const { data: word, isLoading: wordLoading } = useWord(id ?? '')
  const { data: modules, isLoading: modulesLoading } = useModules()
  const createWordMutation = useCreateWord()
  const updateWordMutation = useUpdateWord()

  const [draftExamples, setDraftExamples] = useState<DraftExample[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WordFormInput>({
    resolver: zodResolver(wordSchema) as any,
    defaultValues: {
      eng: '',
      per: '',
      description: '',
      chapter: '',
      unit: '',
      primaryExample: '',
      primaryExampleTrs: '',
      moduleId: '',
    },
  })

  // پر کردن فرم هنگام ویرایش لغت موجود
  useEffect(() => {
    if (isEditMode && word) {
      reset({
        eng: word.eng,
        per: word.per,
        description: word.description ?? '',
        chapter: word.chapter?.toString() ?? '',
        unit: word.unit?.toString() ?? '',
        primaryExample: word.primaryExample ?? '',
        primaryExampleTrs: word.primaryExampleTrs ?? '',
        moduleId: word.moduleId,
      })
    }
  }, [isEditMode, word, reset])

  async function onSubmit(raw: WordFormInput) {
    setSubmitError(null)
    const parsed = wordSchema.parse(raw)

    try {
      if (isEditMode && id) {
        await updateWordMutation.mutateAsync({ id, data: parsed })
        toast({ title: 'لغت با موفقیت ویرایش شد', variant: 'success' })
        navigate('/admin')
      } else {
        const created = await createWordMutation.mutateAsync(parsed)
        // ذخیره مثال‌های موقت پس از ایجاد لغت
        for (let i = 0; i < draftExamples.length; i++) {
          const ex = draftExamples[i]
          await vocabularyService.addExample(created.id, {
            engSentence: ex.engSentence,
            perTranslation: ex.perTranslation,
            order: i,
          })
        }
        toast({ title: 'لغت با موفقیت اضافه شد', variant: 'success' })
        navigate('/admin')
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? 'خطا در ذخیره لغت'
      setSubmitError(message)
      toast({ title: 'خطا در ذخیره لغت', description: message, variant: 'destructive' })
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
      {/* سربرگ */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? 'ویرایش لغت' : 'افزودن لغت'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* فیلدهای اصلی لغت */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">جزئیات لغت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* لغت انگلیسی */}
            <div className="space-y-1.5">
              <Label htmlFor="eng">لغت انگلیسی *</Label>
              <Input
                id="eng"
                placeholder="مثال: eloquent"
                dir="ltr"
                {...register('eng')}
              />
              {errors.eng && (
                <p className="text-xs text-destructive">{errors.eng.message}</p>
              )}
            </div>

            {/* معنی فارسی */}
            <div className="space-y-1.5">
              <Label htmlFor="per">معنی فارسی *</Label>
              <Input
                id="per"
                placeholder="معنی فارسی"
                dir="rtl"
                {...register('per')}
              />
              {errors.per && (
                <p className="text-xs text-destructive">{errors.per.message}</p>
              )}
            </div>

            {/* توضیح / تعریف */}
            <div className="space-y-1.5">
              <Label htmlFor="description">توضیح / تعریف</Label>
              <Input
                id="description"
                placeholder="توضیح یا یادداشت اختیاری..."
                {...register('description')}
              />
            </div>

            {/* فصل و درس */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="chapter">فصل</Label>
                <Input
                  id="chapter"
                  type="number"
                  min="1"
                  placeholder="مثال: ۳"
                  {...register('chapter')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">درس</Label>
                <Input
                  id="unit"
                  type="number"
                  min="1"
                  placeholder="مثال: ۲"
                  {...register('unit')}
                />
              </div>
            </div>

            {/* ماژول */}
            <div className="space-y-1.5">
              <Label htmlFor="moduleId">ماژول *</Label>
              <Controller
                name="moduleId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="moduleId">
                      <SelectValue placeholder="یک ماژول انتخاب کنید..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(modules ?? []).map((mod) => (
                        <SelectItem key={mod.id} value={mod.id}>
                          {mod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.moduleId && (
                <p className="text-xs text-destructive">{errors.moduleId.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* جمله مثال اصلی */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">جمله مثال اصلی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="primaryExample">جمله مثال اصلی</Label>
              <Input
                id="primaryExample"
                placeholder="مثال: She is an eloquent speaker."
                dir="ltr"
                {...register('primaryExample')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primaryExampleTrs">ترجمه جمله مثال</Label>
              <Input
                id="primaryExampleTrs"
                placeholder="ترجمه فارسی جمله..."
                dir="rtl"
                {...register('primaryExampleTrs')}
              />
            </div>
          </CardContent>
        </Card>

        {/* مثال‌های اضافی */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مثال‌های اضافی</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditMode && word ? (
              <ExampleManager
                wordId={word.id}
                existingExamples={word.examples}
              />
            ) : (
              <ExampleManager
                draftExamples={draftExamples}
                onDraftChange={setDraftExamples}
              />
            )}
          </CardContent>
        </Card>

        {/* پیام خطا */}
        {submitError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {submitError}
          </p>
        )}

        {/* دکمه‌های عملیات */}
        <div className="flex gap-3 justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin')}
            disabled={isSubmitting}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                در حال ذخیره...
              </>
            ) : isEditMode ? (
              'ویرایش لغت'
            ) : (
              'ذخیره لغت'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
