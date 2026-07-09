import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planService, CreatePlanInput, UpdatePlanInput } from '@/services/plan.service'
import type { LearningPlan } from '@/types'

export function usePlans() {
  return useQuery<LearningPlan[], Error>({
    queryKey: ['plans'],
    queryFn: () => planService.list(),
  })
}

/** Invalidate every query that reflects the learning list after a plan change. */
function useInvalidatePlanViews() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['plans'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['discovery-books'] })
    qc.invalidateQueries({ queryKey: ['watchlist', 'books'] })
    qc.invalidateQueries({ queryKey: ['study', 'today'] })
  }
}

export function useCreatePlan() {
  const invalidate = useInvalidatePlanViews()
  return useMutation({
    mutationFn: (input: CreatePlanInput) => planService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdatePlan() {
  const invalidate = useInvalidatePlanViews()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlanInput }) =>
      planService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeletePlan() {
  const invalidate = useInvalidatePlanViews()
  return useMutation({
    mutationFn: (id: string) => planService.remove(id),
    onSuccess: invalidate,
  })
}
