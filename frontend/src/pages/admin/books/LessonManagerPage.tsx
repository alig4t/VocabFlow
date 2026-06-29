import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, BookOpen, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useBook,
  useVolumes,
  useLessons,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
} from '@/hooks/useBooks'
import { toast } from '@/components/ui/use-toast'
import type { Lesson } from '@/types'

// ─── Sub-components ──────────────────────────────────────────────────────────

interface LessonFormProps {
  lessonNumber: string
  title: string
  onLessonNumberChange: (v: string) => void
  onTitleChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isLoading: boolean
}

function LessonForm({
  lessonNumber,
  title,
  onLessonNumberChange,
  onTitleChange,
  onSubmit,
  onCancel,
  isLoading,
}: LessonFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="lessonNumber">شماره درس *</Label>
        <Input
          id="lessonNumber"
          type="number"
          min="1"
          placeholder="مثال: ۱"
          value={lessonNumber}
          onChange={(e) => onLessonNumberChange(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lessonTitle">عنوان (اختیاری)</Label>
        <Input
          id="lessonTitle"
          placeholder="مثال: Colors and Shapes"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
      <DialogFooter className="flex-row-reverse gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          ذخیره
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          انصراف
        </Button>
      </DialogFooter>
    </form>
  )
}

function LessonRow({
  lesson,
  onEdit,
  onDelete,
  onAddWord,
}: {
  lesson: Lesson
  onEdit: () => void
  onDelete: () => void
  onAddWord: () => void
}) {
  return (
    <li className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors gap-3">
      <div className="min-w-0">
        <span className="font-medium">
          درس {lesson.lessonNumber}
          {lesson.title ? ` — ${lesson.title}` : ''}
        </span>
        <span className="text-sm text-muted-foreground mr-2">
          ({lesson._count?.words ?? 0} لغت)
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-primary border-primary/40 hover:bg-primary/5 hover:border-primary"
          onClick={onAddWord}
        >
          <PenLine className="h-3.5 w-3.5" />
          افزودن لغت
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label="ویرایش">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  )
}

function EmptyLessons({ onAdd }: { onAdd: () => void }) {
  return (
    <CardContent className="py-12 text-center space-y-4">
      <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
      <p className="text-muted-foreground">هنوز درسی اضافه نشده است.</p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 ml-2" />
        افزودن اولین درس
      </Button>
    </CardContent>
  )
}

function DeleteLessonDialog({
  lesson,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: {
  lesson: Lesson | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="font-persian">
        <DialogHeader>
          <DialogTitle>حذف درس</DialogTitle>
          <DialogDescription>
            آیا مطمئنید که می‌خواهید درس {lesson?.lessonNumber} را حذف کنید؟ ارتباط کلمات با
            این درس نیز حذف خواهد شد.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row-reverse gap-2">
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            حذف
          </Button>
          <Button variant="outline" onClick={onClose}>
            انصراف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LessonManagerPage() {
  const navigate = useNavigate()
  const { bookId, volumeId } = useParams<{ bookId: string; volumeId: string }>()

  const { data: book } = useBook(bookId ?? '')
  const { data: volumes } = useVolumes(bookId ?? '')
  const { data: lessons, isLoading } = useLessons(bookId ?? '', volumeId ?? '')
  const createLesson = useCreateLesson()
  const updateLesson = useUpdateLesson()
  const deleteLesson = useDeleteLesson()

  const [addOpen, setAddOpen] = useState(false)
  const [editLesson, setEditLesson] = useState<Lesson | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null)
  const [formNumber, setFormNumber] = useState('')
  const [formTitle, setFormTitle] = useState('')

  const currentVolume = volumes?.find((v) => v.id === volumeId)

  function openAdd() {
    setFormNumber('')
    setFormTitle('')
    setAddOpen(true)
  }

  function openEdit(lesson: Lesson) {
    setFormNumber(String(lesson.lessonNumber))
    setFormTitle(lesson.title ?? '')
    setEditLesson(lesson)
  }

  function closeForm() {
    setAddOpen(false)
    setEditLesson(null)
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formNumber) return
    try {
      await createLesson.mutateAsync({
        bookId: bookId!,
        volumeId: volumeId!,
        data: { lessonNumber: Number(formNumber), title: formTitle.trim() || undefined },
      })
      toast({ title: 'درس اضافه شد', variant: 'success' })
      setAddOpen(false)
    } catch {
      toast({ title: 'خطا در افزودن درس', variant: 'destructive' })
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editLesson || !formNumber) return
    try {
      await updateLesson.mutateAsync({
        bookId: bookId!,
        volumeId: volumeId!,
        lessonId: editLesson.id,
        data: { lessonNumber: Number(formNumber), title: formTitle.trim() || undefined },
      })
      toast({ title: 'درس ویرایش شد', variant: 'success' })
      setEditLesson(null)
    } catch {
      toast({ title: 'خطا در ویرایش درس', variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteLesson.mutateAsync({
        bookId: bookId!,
        volumeId: volumeId!,
        lessonId: deleteTarget.id,
      })
      toast({ title: 'درس حذف شد', variant: 'success' })
    } catch {
      toast({ title: 'خطا در حذف درس', variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const sharedFormProps = {
    lessonNumber: formNumber,
    title: formTitle,
    onLessonNumberChange: setFormNumber,
    onTitleChange: setFormTitle,
    onCancel: closeForm,
  }

  return (
    <section dir="rtl" className="font-persian space-y-6 pb-12">
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/admin/books/${bookId}/volumes`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">مدیریت درس‌ها</h1>
          {book && currentVolume && (
            <p className="text-sm text-muted-foreground">
              {book.title} ← جلد {currentVolume.volumeNumber}
              {currentVolume.title ? ` (${currentVolume.title})` : ''}
            </p>
          )}
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 ml-2" />
          افزودن درس
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !lessons || lessons.length === 0 ? (
        <Card>
          <EmptyLessons onAdd={openAdd} />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">درس‌ها ({lessons.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {lessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  onEdit={() => openEdit(lesson)}
                  onDelete={() => setDeleteTarget(lesson)}
                  onAddWord={() =>
                    navigate(
                      `/admin/words/new?bookId=${bookId}&volumeId=${volumeId}&lessonId=${lesson.id}`,
                    )
                  }
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" className="font-persian">
          <DialogHeader>
            <DialogTitle>افزودن درس جدید</DialogTitle>
          </DialogHeader>
          <LessonForm
            {...sharedFormProps}
            onSubmit={handleAddSubmit}
            isLoading={createLesson.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(editLesson)} onOpenChange={(v) => !v && setEditLesson(null)}>
        <DialogContent dir="rtl" className="font-persian">
          <DialogHeader>
            <DialogTitle>ویرایش درس</DialogTitle>
          </DialogHeader>
          <LessonForm
            {...sharedFormProps}
            onSubmit={handleEditSubmit}
            isLoading={updateLesson.isPending}
          />
        </DialogContent>
      </Dialog>

      <DeleteLessonDialog
        lesson={deleteTarget}
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={deleteLesson.isPending}
      />
    </section>
  )
}
