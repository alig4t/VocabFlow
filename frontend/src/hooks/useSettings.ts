import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsService, UpdateSettingsInput } from '@/services/settings.service'
import type { UserSettings } from '@/types'

export function useSettings() {
  return useQuery<UserSettings, Error>({
    queryKey: ['settings'],
    queryFn: () => settingsService.get(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => settingsService.update(input),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      // Direction change alters the whole daily queue.
      qc.invalidateQueries({ queryKey: ['study', 'today'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
