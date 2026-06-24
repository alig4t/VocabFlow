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
    console.log(data);
    
    return api.post<AuthResponse>(API_ENDPOINTS.auth.register, data).then((res) => res.data)
  },

  login(data: LoginData): Promise<AuthResponse> {
        console.log(data);
    return api.post<AuthResponse>(API_ENDPOINTS.auth.login, data).then((res) => res.data)
  },

  logout(refreshToken: string): Promise<void> {
    return api.post(API_ENDPOINTS.auth.logout, { refreshToken }).then((res) => res.data)
  },

  refreshToken(refreshToken: string): Promise<AuthResponse> {
    return api
      .post<AuthResponse>(API_ENDPOINTS.auth.refresh, { refreshToken })
      .then((res) => res.data)
  },

  getMe(): Promise<User> {
    return api.get<User>(API_ENDPOINTS.auth.me).then((res) => res.data)
  },
}
