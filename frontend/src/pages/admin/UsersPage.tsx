import { useMemo, useState } from 'react'
import { Users, Search, ShieldCheck, UserRound } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers } from '@/hooks/useUsers'
import { faNum } from '@/lib/format'
import type { AdminUser } from '@/services/user.service'

function formatJoinDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso))
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '؟'
}

function UserRow({ user }: { user: AdminUser }) {
  const isAdmin = user.role === 'ADMIN'
  return (
    <tr className="border-t border-border transition-colors hover:bg-muted/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
              (isAdmin ? 'bg-amber-500/15 text-amber-600 dark:text-amber-500' : 'bg-primary/10 text-primary')
            }
            aria-hidden="true"
          >
            {initial(user.name)}
          </span>
          <span className="font-medium text-foreground">{user.name}</span>
        </div>
      </td>
      <td dir="ltr" className="px-4 py-3 text-right text-sm text-muted-foreground">{user.email}</td>
      <td className="px-4 py-3">
        {isAdmin ? (
          <Badge className="gap-1 bg-amber-600 hover:bg-amber-600/90">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            مدیر
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <UserRound className="h-3 w-3" aria-hidden="true" />
            کاربر
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatJoinDate(user.createdAt)}</td>
    </tr>
  )
}

export function UsersPage() {
  const { data: users, isLoading, isError } = useUsers()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users ?? []
    return (users ?? []).filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, query])

  const adminCount = useMemo(() => (users ?? []).filter((u) => u.role === 'ADMIN').length, [users])

  return (
    <div dir="rtl" className="font-persian mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Users className="h-6 w-6 text-primary" aria-hidden="true" />
            کاربران
          </h1>
          {users && (
            <p className="mt-1 text-sm text-muted-foreground">
              {faNum(users.length)} کاربر · {faNum(adminCount)} مدیر
            </p>
          )}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="text"
            placeholder="جستجوی نام یا ایمیل..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9"
          />
        </div>
      </header>

      {isLoading ? (
        <Card className="p-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="m-2 h-12 rounded-lg" />
          ))}
        </Card>
      ) : isError ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">خطا در بارگذاری کاربران.</p>
          <p className="mt-1 text-xs text-muted-foreground">لطفاً بعداً دوباره تلاش کنید.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Users className="h-10 w-10 text-muted-foreground opacity-40" aria-hidden="true" />
          <p className="text-base font-medium text-foreground">
            {query ? 'کاربری با این مشخصات یافت نشد' : 'هنوز کاربری ثبت نشده است'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">نام</th>
                  <th className="px-4 py-3 font-semibold">ایمیل</th>
                  <th className="px-4 py-3 font-semibold">نقش</th>
                  <th className="px-4 py-3 font-semibold">تاریخ عضویت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
