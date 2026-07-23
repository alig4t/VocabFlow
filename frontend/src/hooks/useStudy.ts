import { useQuery } from '@tanstack/react-query'
import { studyService } from '@/services/study.service'
import type { StudyToday, TodayNewWords } from '@/types'

/** Today's study queue (due reviews + new words) and daily metadata. */
export function useStudyToday(enabled = true) {
  return useQuery<StudyToday, Error>({
    queryKey: ['study', 'today'],
    queryFn: () => studyService.getToday(),
    enabled,
    staleTime: 0,
    // Always refetch when the page mounts so a plan just created in the library
    // (which invalidates this key) is reflected without a manual refresh.
    refetchOnMount: 'always',
  })
}

/**
 * The words introduced today — the pool for the practice reviewer. Disabled
 * until needed (the Home card decides from `useStudyToday` metadata alone, so
 * the dashboard never pays for this query).
 */
export function useTodayNewWords(enabled = true) {
  return useQuery<TodayNewWords, Error>({
    queryKey: ['study', 'today-new'],
    queryFn: () => studyService.getTodayNew(),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
