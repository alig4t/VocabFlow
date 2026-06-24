import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  vocabularyService,
  type CreateWordData,
  type UpdateWordData,
  type CreateExampleData,
  type UpdateExampleData,
} from '@/services/vocabulary.service'
import type { Word, WordFilters, WordExample, LearningModule, PaginatedWords } from '@/types'

export function useWords(filters: WordFilters) {
  return useQuery<PaginatedWords, Error>({
    queryKey: ['words', filters],
    queryFn: () => vocabularyService.getWords(filters),
  })
}

export function useWord(id: string) {
  return useQuery<Word, Error>({
    queryKey: ['words', id],
    queryFn: () => vocabularyService.getWord(id),
    enabled: Boolean(id),
  })
}

export function useModules() {
  return useQuery<LearningModule[], Error>({
    queryKey: ['modules'],
    queryFn: () => vocabularyService.getModules(),
  })
}

export function useCreateWord() {
  const queryClient = useQueryClient()

  return useMutation<Word, Error, CreateWordData>({
    mutationFn: (data) => vocabularyService.createWord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] })
    },
  })
}

export function useUpdateWord() {
  const queryClient = useQueryClient()

  return useMutation<Word, Error, { id: string; data: UpdateWordData }>({
    mutationFn: ({ id, data }) => vocabularyService.updateWord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] })
    },
  })
}

export function useDeleteWord() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => vocabularyService.deleteWord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] })
    },
  })
}

export function useAddExample() {
  return useMutation<WordExample, Error, { wordId: string; data: CreateExampleData }>({
    mutationFn: ({ wordId, data }) => vocabularyService.addExample(wordId, data),
  })
}

export function useDeleteExample() {
  return useMutation<void, Error, { wordId: string; exampleId: string }>({
    mutationFn: ({ wordId, exampleId }) =>
      vocabularyService.deleteExample(wordId, exampleId),
  })
}

export function useUpdateExample() {
  return useMutation<
    WordExample,
    Error,
    { wordId: string; exampleId: string; data: UpdateExampleData }
  >({
    mutationFn: ({ wordId, exampleId, data }) =>
      vocabularyService.updateExample(wordId, exampleId, data),
  })
}
