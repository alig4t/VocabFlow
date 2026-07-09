import { useQuery } from '@tanstack/react-query'
import { studyService } from '@/services/study.service'
import type { StudyToday } from '@/types'

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
