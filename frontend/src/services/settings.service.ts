import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { isNative } from '@/lib/platform'
import type { UserSettings } from '@/types'

const off = () => import('@/offline/repo')

export type UpdateSettingsInput = Partial<UserSettings>

/** User-settings data layer. Web → `/api/settings`; native → offline SQLite. */
export const settingsService = {
  get(): Promise<UserSettings> {
    if (isNative()) return off().then((o) => o.getSettings())
    return api.get<UserSettings>(API_ENDPOINTS.settings.get).then((r) => r.data)
  },

  update(input: UpdateSettingsInput): Promise<UserSettings> {
    if (isNative()) return off().then((o) => o.updateSettings(input))
    return api.put<UserSettings>(API_ENDPOINTS.settings.update, input).then((r) => r.data)
  },
}
