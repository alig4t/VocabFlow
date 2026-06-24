import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import type { AuthResponse, User } from '@/types'

export interface RegisterData {
  email: string
  password: string
  name: string
}

export interface LoginData {
  email: string
  password: string
}

export const authService = {
  register(data: RegisterData): Promise<AuthResponse> {
    return api.post(API_ENDPOINTS.auth.register, data).then((res) => res.data.data)
  },

  login(data: LoginData): Promise<AuthResponse> {
    return api.post(API_ENDPOINTS.auth.login, data).then((res) => res.data.data)
  },

  logout(refreshToken: string): Promise<void> {
    return api.post(API_ENDPOINTS.auth.logout, { refreshToken }).then(() => undefined)
  },

  refreshToken(refreshToken: string): Promise<AuthResponse> {
    return api.post(API_ENDPOINTS.auth.refresh, { refreshToken }).then((res) => res.data.data)
  },

  getMe(): Promise<User> {
    return api.get(API_ENDPOINTS.auth.me).then((res) => res.data.data)
  },
}
