import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(new Date(date))
}

export function getWordStatusColor(status: string): string {
  switch (status) {
    case 'KNOWN': return 'text-green-600 dark:text-green-400'
    case 'NOT_KNOWN': return 'text-red-600 dark:text-red-400'
    default: return 'text-muted-foreground'
  }
}

export function getWordStatusLabel(status: string): string {
  switch (status) {
    case 'KNOWN': return 'Known'
    case 'NOT_KNOWN': return 'Not Known'
    default: return 'Not Read'
  }
}

/**
 * User-facing message from a mutation error. Web errors are AxiosErrors whose
 * real backend message lives at `response.data.message` (the axios interceptor
 * doesn't unwrap error responses); native/offline errors are plain `Error`s
 * whose `.message` is already the right text.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { message?: string } }; message?: string } | undefined
  return e?.response?.data?.message ?? e?.message ?? fallback
}
