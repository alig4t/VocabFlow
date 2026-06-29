import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, BookOpen, Users, Layers, ChevronLeft, ChevronRight, Loader2, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useWords, useDeleteWord, useModules } from '@/hooks/useVocabulary'
import { useBooks } from '@/hooks/useBooks'
import type { Word } from '@/types'

const PAGE_SIZE = 20

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DeleteConfirmDialog({
  word,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  word: Word | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="font-persian">
        <DialogHeader>
          <DialogTitle>حذف لغت</DialogTitle>
          <DialogDescription>
            آیا مطمئنید که می‌خواهید{' '}
            <span className="font-semibold text-foreground">«{word?.eng}»</span> را حذف کنید؟ این عمل قابل بازگشت نیست و تمام مثال‌ها و پیشرفت‌های مرتبط نیز حذف خواهند شد.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                در حال حذف...
              </>
            ) : (
              'حذف'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            انصراف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminPage() {
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [wordToDelete, setWordToDelete] = useState<Word | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data, isLoading, isFetching } = useWords({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  })

  const { data: modules } = useModules()
  const { data: books } = useBooks()
  const deleteWordMutation = useDeleteWord()

  const words = data?.data ?? []
  const meta = data?.meta
  const totalWords = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1
  const totalModules = modules?.length ?? 0
  const totalBooks = books?.length ?? 0

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setPage(1)
      setSearch(searchInput)
    },
    [searchInput],
  )

  function handleSearchClear() {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  function openDeleteDialog(word: Word) {
    setWordToDelete(word)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!wordToDelete) return
    await deleteWordMutation.mutateAsync(wordToDelete.id)
    setDeleteDialogOpen(false)
    setWordToDelete(null)
    // اگر آخرین آیتم صفحه‌ای غیر از اول حذف شد، به صفحه قبل برو
    if (words.length === 1 && page > 1) {
      setPage((p) => p - 1)
    }
  }

  function getModuleName(moduleId: string) {
    return modules?.find((m) => m.id === moduleId)?.name ?? moduleId
  }

  return (
    <div dir="rtl" className="font-persian space-y-8 pb-12">
      {/* عنوان صفحه */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">پنل مدیریت</h1>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="مجموع لغات" value={totalWords} />
        <StatCard icon={Library} label="کتاب‌ها" value={totalBooks} />
        <StatCard icon={Users} label="کاربران" value="—" />
        <StatCard icon={Layers} label="ماژول‌ها" value={totalModules} />
      </div>

      {/* مدیریت کتاب‌ها */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            مدیریت کتاب‌ها
          </CardTitle>
          <Button onClick={() => navigate('/admin/books')}>
            <BookOpen className="h-4 w-4 ml-2" />
            مشاهده و مدیریت کتاب‌ها
          </Button>
        </CardHeader>
        <CardContent>
          {totalBooks === 0 ? (
            <p className="text-sm text-muted-foreground">
              هنوز کتابی اضافه نشده است.{' '}
              <button
                onClick={() => navigate('/admin/books/new')}
                className="text-primary hover:underline"
              >
                اولین کتاب را اضافه کنید
              </button>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(books ?? []).map((book) => (
                <button
                  key={book.id}
                  onClick={() => navigate(`/admin/books/${book.id}/volumes`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  {book.title}
                  <span className="text-muted-foreground text-xs">({book._count?.volumes ?? 0} جلد)</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* مدیریت لغات */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>مدیریت لغات</CardTitle>
          <Button onClick={() => navigate('/admin/words/new')}>
            <Plus className="h-4 w-4 ml-2" />
            افزودن لغت جدید
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* نوار جستجو */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pr-9"
                placeholder="جستجو در لغات..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              جستجو
            </Button>
            {search && (
              <Button type="button" variant="outline" onClick={handleSearchClear}>
                پاک کردن
              </Button>
            )}
          </form>

          {/* جدول */}
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    لغت انگلیسی
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    معنی فارسی
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">
                    فصل
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">
                    درس
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">
                    مثال‌ها
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">
                    ماژول
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>در حال بارگذاری لغات...</span>
                      </div>
                    </td>
                  </tr>
                ) : words.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      {search
                        ? `هیچ لغتی برای «${search}» یافت نشد.`
                        : 'هنوز لغتی اضافه نشده است. برای شروع یک لغت اضافه کنید.'}
                    </td>
                  </tr>
                ) : (
                  words.map((word) => (
                    <tr
                      key={word.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium" dir="ltr">{word.eng}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {word.per}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {word.chapter ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {word.unit ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {word.examples?.length ?? 0}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                          {getModuleName(word.moduleId)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-start gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/admin/words/${word.id}/edit`)}
                            aria-label="ویرایش"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">ویرایش</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(word)}
                            aria-label="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">حذف</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* صفحه‌بندی */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                صفحه {page} از {totalPages} — {totalWords} لغت در کل
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  بعدی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  قبلی
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* نشانگر بارگذاری پس‌زمینه */}
          {isFetching && !isLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              در حال بروزرسانی...
            </p>
          )}
        </CardContent>
      </Card>

      {/* تایید حذف */}
      <DeleteConfirmDialog
        word={wordToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteWordMutation.isPending}
      />
    </div>
  )
}
