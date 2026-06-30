import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import type { Role } from '@/types'

/** A user row as returned by the admin users list. */
export interface AdminUser {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
  updatedAt: string
}

export const userService = {
  /** Admin: list all users. */
  getUsers(): Promise<AdminUser[]> {
    return api.get<AdminUser[]>(API_ENDPOINTS.users.list).then((res) => res.data)
  },
}
