import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { isNative } from '@/lib/platform'
import type { LearningPlan } from '@/types'

const off = () => import('@/offline/repo')

export interface CreatePlanInput {
  volumeId: string
  dailyNewWords: number
  dailyGoal?: number
}

export interface UpdatePlanInput {
  dailyNewWords?: number
  dailyGoal?: number
  isActive?: boolean
}

/** Learning-plan (per-volume) data layer. Web → `/api/plans`; native → SQLite. */
export const planService = {
  list(): Promise<LearningPlan[]> {
    if (isNative()) return off().then((o) => o.getPlans())
    return api.get<LearningPlan[]>(API_ENDPOINTS.plans.list).then((r) => r.data)
  },

  create(input: CreatePlanInput): Promise<{ id: string; volumeId: string }> {
    if (isNative()) return off().then((o) => o.createPlan(input))
    return api
      .post<{ id: string; volumeId: string }>(API_ENDPOINTS.plans.create, input)
      .then((r) => r.data)
  },

  update(id: string, input: UpdatePlanInput): Promise<{ id: string }> {
    if (isNative()) return off().then((o) => o.updatePlan(id, input))
    return api.patch<{ id: string }>(API_ENDPOINTS.plans.update(id), input).then((r) => r.data)
  },

  remove(id: string): Promise<{ id: string }> {
    if (isNative()) return off().then((o) => o.deletePlan(id))
    return api.delete<{ id: string }>(API_ENDPOINTS.plans.remove(id)).then((r) => r.data)
  },
}
