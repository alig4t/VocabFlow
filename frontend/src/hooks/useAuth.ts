import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService, type LoginData, type RegisterData } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import type { AuthResponse, User } from '@/types'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation<AuthResponse, Error, LoginData>({
    mutationFn: (data) => authService.login(data),
    onSuccess: (response) => {
      setAuth(response.user, response.accessToken, response.refreshToken)
    },
  })
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation<AuthResponse, Error, RegisterData>({
    mutationFn: (data) => authService.register(data),
    onSuccess: (response) => {
      setAuth(response.user, response.accessToken, response.refreshToken)
    },
  })
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const navigate = useNavigate()

  return useMutation<void, Error, void>({
    mutationFn: () => {
      if (refreshToken) {
        return authService.logout(refreshToken)
      }
      return Promise.resolve()
    },
    onSuccess: () => {
      clearAuth()
      navigate('/login')
    },
    onError: () => {
      // Clear auth state even if the server call fails
      clearAuth()
      navigate('/login')
    },
  })
}

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery<User, Error>({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getMe(),
    enabled: isAuthenticated,
  })
}
