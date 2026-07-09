import { useState } from 'react'
import { Compass, BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DiscoveryBookCard } from '@/components/library/DiscoveryBookCard'
import { StartPlanDialog } from '@/components/library/StartPlanDialog'
import { useDiscoveryBooks } from '@/hooks/useDashboard'
import type { DiscoveryBook } from '@/types'

export function LibraryPage() {
  const { data: books, isLoading, isError } = useDiscoveryBooks()
  const [dialogBook, setDialogBook] = useState<DiscoveryBook | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleStartPlan(book: DiscoveryBook) {
    setDialogBook(book)
    setDialogOpen(true)
  }

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
          کتابخانه
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          کتاب‌ها را کاوش کنید و به لیست یادگیری خود اضافه کنید.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : isError || !books ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">خطا در بارگذاری کتاب‌ها.</p>
          <p className="mt-1 text-xs text-muted-foreground">لطفاً بعداً دوباره تلاش کنید.</p>
        </Card>
      ) : books.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-40" aria-hidden="true" />
          <p className="text-base font-medium text-foreground">کتابی موجود نیست</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {books.map((book) => (
            <DiscoveryBookCard key={book.id} book={book} onStartPlan={handleStartPlan} />
          ))}
        </div>
      )}

      <StartPlanDialog book={dialogBook} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
