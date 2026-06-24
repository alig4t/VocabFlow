import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, API_ENDPOINTS } from '../config/api'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Track whether a token refresh is in flight to avoid concurrent refresh calls
let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processPendingRequests(token: string | null, error: unknown = null) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token)
    } else {
      reject(error)
    }
  })
  pendingRequests = []
}

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = useAuthStore.getState().refreshToken

    if (!refreshToken) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            resolve(api(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const response = await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.auth.refresh}`,
        { refreshToken }
      )

      const { accessToken, refreshToken: newRefreshToken } = response.data.data
      const currentUser = useAuthStore.getState().user!

      useAuthStore.getState().setAuth(currentUser, accessToken, newRefreshToken)

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
      }

      processPendingRequests(accessToken)

      return api(originalRequest)
    } catch (refreshError) {
      processPendingRequests(null, refreshError)
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
