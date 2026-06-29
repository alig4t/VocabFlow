import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, BookOpen, ChevronLeft } from 'lucide-react'
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
  useCreateVolume,
  useUpdateVolume,
  useDeleteVolume,
} from '@/hooks/useBooks'
import { toast } from '@/components/ui/use-toast'
import type { Volume } from '@/types'

// ─── Sub-components ──────────────────────────────────────────────────────────

interface VolumeFormProps {
  volumeNumber: string
  title: string
  onVolumeNumberChange: (v: string) => void
  onTitleChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isLoading: boolean
}

function VolumeForm({
  volumeNumber,
  title,
  onVolumeNumberChange,
  onTitleChange,
  onSubmit,
  onCancel,
  isLoading,
}: VolumeFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="volNumber">شماره جلد *</Label>
        <Input
          id="volNumber"
          type="number"
          min="1"
          placeholder="مثال: ۱"
          value={volumeNumber}
          onChange={(e) => onVolumeNumberChange(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="volTitle">عنوان (اختیاری)</Label>
        <Input
          id="volTitle"
          placeholder="مثال: مقدماتی"
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

function VolumeRow({
  volume,
  onEdit,
  onLessons,
  onDelete,
}: {
  volume: Volume
  onEdit: () => void
  onLessons: () => void
  onDelete: () => void
}) {
  return (
    <li className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
      <span className="font-medium">
        جلد {volume.volumeNumber}
        {volume.title ? ` — ${volume.title}` : ''}
        <span className="text-sm text-muted-foreground font-normal mr-2">
          ({volume._count?.lessons ?? 0} درس)
        </span>
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onLessons}>
          درس‌ها
          <ChevronLeft className="h-3.5 w-3.5" />
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

function EmptyVolumes({ onAdd }: { onAdd: () => void }) {
  return (
    <CardContent className="py-12 text-center space-y-4">
      <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
      <p className="text-muted-foreground">هنوز جلدی اضافه نشده است.</p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 ml-2" />
        افزودن اولین جلد
      </Button>
    </CardContent>
  )
}

function DeleteVolumeDialog({
  volume,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: {
  volume: Volume | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="font-persian">
        <DialogHeader>
          <DialogTitle>حذف جلد</DialogTitle>
          <DialogDescription>
            آیا مطمئنید که می‌خواهید جلد {volume?.volumeNumber} را حذف کنید؟ تمام درس‌ها و
            ارتباط کلمات با این جلد نیز حذف خواهند شد.
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

export function VolumeManagerPage() {
  const navigate = useNavigate()
  const { bookId } = useParams<{ bookId: string }>()

  const { data: book } = useBook(bookId ?? '')
  const { data: volumes, isLoading } = useVolumes(bookId ?? '')
  const createVolume = useCreateVolume()
  const updateVolume = useUpdateVolume()
  const deleteVolume = useDeleteVolume()

  const [addOpen, setAddOpen] = useState(false)
  const [editVolume, setEditVolume] = useState<Volume | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Volume | null>(null)
  const [formNumber, setFormNumber] = useState('')
  const [formTitle, setFormTitle] = useState('')

  function openAdd() {
    setFormNumber('')
    setFormTitle('')
    setAddOpen(true)
  }

  function openEdit(vol: Volume) {
    setFormNumber(String(vol.volumeNumber))
    setFormTitle(vol.title ?? '')
    setEditVolume(vol)
  }

  function closeForm() {
    setAddOpen(false)
    setEditVolume(null)
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formNumber) return
    try {
      await createVolume.mutateAsync({
        bookId: bookId!,
        data: { volumeNumber: Number(formNumber), title: formTitle.trim() || undefined },
      })
      toast({ title: 'جلد اضافه شد', variant: 'success' })
      setAddOpen(false)
    } catch {
      toast({ title: 'خطا در افزودن جلد', variant: 'destructive' })
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editVolume || !formNumber) return
    try {
      await updateVolume.mutateAsync({
        bookId: bookId!,
        volumeId: editVolume.id,
        data: { volumeNumber: Number(formNumber), title: formTitle.trim() || undefined },
      })
      toast({ title: 'جلد ویرایش شد', variant: 'success' })
      setEditVolume(null)
    } catch {
      toast({ title: 'خطا در ویرایش جلد', variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteVolume.mutateAsync({ bookId: bookId!, volumeId: deleteTarget.id })
      toast({ title: 'جلد حذف شد', variant: 'success' })
    } catch {
      toast({ title: 'خطا در حذف جلد', variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const sharedFormProps = {
    volumeNumber: formNumber,
    title: formTitle,
    onVolumeNumberChange: setFormNumber,
    onTitleChange: setFormTitle,
    onCancel: closeForm,
  }

  return (
    <section dir="rtl" className="font-persian space-y-6 pb-12">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/books')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">مدیریت جلدها</h1>
          {book && <p className="text-sm text-muted-foreground">کتاب: {book.title}</p>}
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 ml-2" />
          افزودن جلد
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !volumes || volumes.length === 0 ? (
        <Card>
          <EmptyVolumes onAdd={openAdd} />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">جلدها ({volumes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {volumes.map((vol) => (
                <VolumeRow
                  key={vol.id}
                  volume={vol}
                  onEdit={() => openEdit(vol)}
                  onLessons={() =>
                    navigate(`/admin/books/${bookId}/volumes/${vol.id}/lessons`)
                  }
                  onDelete={() => setDeleteTarget(vol)}
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
            <DialogTitle>افزودن جلد جدید</DialogTitle>
          </DialogHeader>
          <VolumeForm
            {...sharedFormProps}
            onSubmit={handleAddSubmit}
            isLoading={createVolume.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(editVolume)} onOpenChange={(v) => !v && setEditVolume(null)}>
        <DialogContent dir="rtl" className="font-persian">
          <DialogHeader>
            <DialogTitle>ویرایش جلد</DialogTitle>
          </DialogHeader>
          <VolumeForm
            {...sharedFormProps}
            onSubmit={handleEditSubmit}
            isLoading={updateVolume.isPending}
          />
        </DialogContent>
      </Dialog>

      <DeleteVolumeDialog
        volume={deleteTarget}
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={deleteVolume.isPending}
      />
    </section>
  )
}
