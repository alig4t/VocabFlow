import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, X, Loader2, BookOpen, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBook, useCreateBook, useUpdateBook } from '@/hooks/useBooks'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

// ─── Sub-components ──────────────────────────────────────────────────────────

function CoverPreview({
  src,
  onRemove,
}: {
  src: string
  onRemove: () => void
}) {
  return (
    <figure className="relative inline-block">
      <img
        src={src}
        alt="پیش‌نمایش جلد"
        className="h-48 w-auto rounded-lg border border-border object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="حذف تصویر"
        className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </figure>
  )
}

function DropZone({
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
}: {
  isDragOver: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onClick: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/30',
      )}
    >
      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden />
      <p className="text-sm font-medium text-foreground">تصویر را اینجا بکشید یا کلیک کنید</p>
      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP پشتیبانی می‌شود</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BookFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEditMode = Boolean(id)

  const { data: book, isLoading } = useBook(id ?? '')
  const createBook = useCreateBook()
  const updateBook = useUpdateBook()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditMode && book) {
      setTitle(book.title)
      setDescription(book.description ?? '')
      if (book.coverImage) setCoverPreview(book.coverImage)
    }
  }, [isEditMode, book])

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'لطفاً یک فایل تصویری انتخاب کنید', variant: 'destructive' })
      return
    }
    const dataUrl = await readFileAsDataUrl(file)
    setCoverPreview(dataUrl)
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) await handleFile(file)
    },
    [],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await handleFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast({ title: 'عنوان کتاب الزامی است', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        coverImage: coverPreview ?? undefined,
      }
      if (isEditMode && id) {
        await updateBook.mutateAsync({ id, data: payload })
        toast({ title: 'کتاب ویرایش شد', variant: 'success' })
      } else {
        await createBook.mutateAsync(payload)
        toast({ title: 'کتاب اضافه شد', variant: 'success' })
      }
      navigate('/admin/books')
    } catch {
      toast({ title: 'خطا در ذخیره کتاب', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <section className="max-w-2xl mx-auto space-y-6 pb-12 font-persian" dir="rtl">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/books')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? 'ویرایش کتاب' : 'افزودن کتاب جدید'}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Book details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              اطلاعات کتاب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">عنوان کتاب *</Label>
              <Input
                id="title"
                placeholder="مثال: ۴۰۰۰ لغت ضروری انگلیسی"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">توضیحات</Label>
              <Input
                id="description"
                placeholder="توضیح مختصری درباره کتاب..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cover image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" />
              تصویر جلد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DropZone
              isDragOver={isDragOver}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            {coverPreview && (
              <CoverPreview src={coverPreview} onRemove={() => setCoverPreview(null)} />
            )}
          </CardContent>
        </Card>

        <footer className="flex gap-3 justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/books')}
            disabled={submitting}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {isEditMode ? 'ذخیره تغییرات' : 'افزودن کتاب'}
          </Button>
        </footer>
      </form>
    </section>
  )
}
