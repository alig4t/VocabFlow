import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Pencil, Trash2, Loader2, Layers, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBooks, useDeleteBook } from '@/hooks/useBooks'
import { toast } from '@/components/ui/use-toast'
import type { Book } from '@/types'

// ─── Sub-components ──────────────────────────────────────────────────────────

function BookCover({ book }: { book: Book }) {
  if (book.coverImage) {
    return (
      <figure className="h-40 overflow-hidden bg-muted">
        <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
      </figure>
    )
  }
  return (
    <div className="h-40 bg-muted flex items-center justify-center" aria-hidden>
      <BookOpen className="h-12 w-12 text-muted-foreground opacity-30" />
    </div>
  )
}

function BookMeta({ book }: { book: Book }) {
  return (
    <header className="space-y-1">
      <h3 className="font-semibold text-foreground text-base leading-tight">{book.title}</h3>
      {book.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{book.description}</p>
      )}
      <p className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
        <Layers className="h-3.5 w-3.5" />
        {book._count?.volumes ?? 0} جلد
      </p>
    </header>
  )
}

function BookActions({
  book,
  onEdit,
  onVolumes,
  onDelete,
}: {
  book: Book
  onEdit: () => void
  onVolumes: () => void
  onDelete: () => void
}) {
  return (
    <footer className="flex gap-2 pt-1">
      <Button size="sm" variant="outline" className="flex-1" onClick={onVolumes}>
        <Layers className="h-3.5 w-3.5 ml-1.5" />
        مدیریت جلدها
      </Button>
      <Button size="sm" variant="ghost" onClick={onEdit} aria-label="ویرایش">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
        aria-label="حذف"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </footer>
  )
}

function BookCard({
  book,
  onEdit,
  onVolumes,
  onDelete,
}: {
  book: Book
  onEdit: () => void
  onVolumes: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden">
      <BookCover book={book} />
      <div className="p-4 space-y-3">
        <BookMeta book={book} />
        <BookActions book={book} onEdit={onEdit} onVolumes={onVolumes} onDelete={onDelete} />
      </div>
    </article>
  )
}

function DeleteBookDialog({
  book,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: {
  book: Book | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="font-persian">
        <DialogHeader>
          <DialogTitle>حذف کتاب</DialogTitle>
          <DialogDescription>
            آیا مطمئنید که می‌خواهید کتاب{' '}
            <strong className="text-foreground">«{book?.title}»</strong> را حذف کنید؟ تمام
            جلدها، درس‌ها و ارتباط کلمات با این کتاب نیز حذف خواهند شد.
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardContent className="py-16 text-center space-y-4">
        <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
        <p className="text-muted-foreground">هنوز کتابی اضافه نشده است.</p>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 ml-2" />
          افزودن اولین کتاب
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BookListPage() {
  const navigate = useNavigate()
  const { data: books, isLoading } = useBooks()
  const deleteBook = useDeleteBook()
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)

  async function handleDeleteConfirm() {
    if (!bookToDelete) return
    try {
      await deleteBook.mutateAsync(bookToDelete.id)
      toast({ title: 'کتاب حذف شد', variant: 'success' })
    } catch {
      toast({ title: 'خطا در حذف کتاب', variant: 'destructive' })
    } finally {
      setBookToDelete(null)
    }
  }

  return (
    <section dir="rtl" className="font-persian space-y-6 pb-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Library className="h-6 w-6 text-primary" />
          مدیریت کتاب‌ها
        </h1>
        <Button onClick={() => navigate('/admin/books/new')}>
          <Plus className="h-4 w-4 ml-2" />
          افزودن کتاب
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !books || books.length === 0 ? (
        <EmptyState onAdd={() => navigate('/admin/books/new')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={() => navigate(`/admin/books/${book.id}/edit`)}
              onVolumes={() => navigate(`/admin/books/${book.id}/volumes`)}
              onDelete={() => setBookToDelete(book)}
            />
          ))}
        </div>
      )}

      <DeleteBookDialog
        book={bookToDelete}
        open={Boolean(bookToDelete)}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteBook.isPending}
      />
    </section>
  )
}
