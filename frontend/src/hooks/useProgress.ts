import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { progressService } from '@/services/progress.service'
import type { ReviewMode, WordStatus, ProgressStats, Word, UserWordProgress } from '@/types'

export function useProgressStats() {
  return useQuery<ProgressStats, Error>({
    queryKey: ['progress', 'stats'],
    queryFn: () => progressService.getStats(),
  })
}

export interface UpdateWordStatusVariables {
  wordId: string
  reviewMode: ReviewMode
  status: WordStatus
}

export function useUpdateWordStatus() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateWordStatusVariables>({
    mutationFn: ({ wordId, reviewMode, status }) =>
      progressService.updateWordStatus(wordId, reviewMode, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
    },
  })
}

export interface ResetProgressVariables {
  reviewMode?: ReviewMode
}

export function useResetProgress() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ResetProgressVariables | void>({
    mutationFn: (variables) =>
      progressService.resetProgress(variables?.reviewMode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
    },
  })
}

/**
 * The MANUAL free-review mark for a word + review mode (a track separate from
 * the SM-2 daily program). Returns NOT_READ if no entry exists.
 */
export function useWordStatus(
  word: Word,
  mode: ReviewMode,
): WordStatus {
  if (!word.progress || word.progress.length === 0) {
    return 'NOT_READ'
  }
  const entry: UserWordProgress | undefined = word.progress.find(
    (p) => p.reviewMode === mode,
  )
  return entry?.manualStatus ?? 'NOT_READ'
}
