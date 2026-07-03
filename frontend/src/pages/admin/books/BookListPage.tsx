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
import { faNum } from '@/lib/format'
import type { Book } from '@/types'

// ─── Sub-components ──────────────────────────────────────────────────────────

function BookCover({ book }: { book: Book }) {
  const volumes = book._count?.volumes ?? 0
  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-muted to-muted/50">
      {book.coverImage ? (
        <img
          src={book.coverImage}
          alt={book.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" aria-hidden>
          <BookOpen className="h-14 w-14 text-muted-foreground opacity-20" />
        </div>
      )}
      {/* depth + slight darkening toward the bottom */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
      {/* volume-count badge */}
      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
        <Layers className="h-3 w-3" />
        {faNum(volumes)} جلد
      </span>
    </div>
  )
}

function BookActions({
  onEdit,
  onVolumes,
  onDelete,
}: {
  onEdit: () => void
  onVolumes: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" className="h-8 flex-1 gap-1.5 text-xs" onClick={onVolumes}>
        <Layers className="h-3.5 w-3.5" />
        مدیریت جلدها
      </Button>
      <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={onEdit} aria-label="ویرایش">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        aria-label="حذف"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
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
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <BookCover book={book} />
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground">
          {book.title}
        </h3>
        <div className="mt-auto">
          <BookActions onEdit={onEdit} onVolumes={onVolumes} onDelete={onDelete} />
        </div>
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
        <div className="grid grid-cols-1 gap-5 min-[440px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
