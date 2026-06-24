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
