import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, API_ENDPOINTS } from '../config/api'

// Lazy import to avoid circular dependency — read state directly from store
let _getAccessToken: (() => string | null) | null = null
let _getRefreshToken: (() => string | null) | null = null
let _setAuth: ((user: any, accessToken: string, refreshToken: string) => void) | null = null
let _clearAuth: (() => void) | null = null

function getStore() {
  if (!_getAccessToken) {
    // Dynamic import resolved synchronously after first render via module cache
    const { useAuthStore } = require('../store/authStore')
    const state = useAuthStore.getState()
    _getAccessToken = () => useAuthStore.getState().accessToken
    _getRefreshToken = () => useAuthStore.getState().refreshToken
    _setAuth = (user, accessToken, refreshToken) =>
      useAuthStore.getState().setAuth(user, accessToken, refreshToken)
    _clearAuth = () => useAuthStore.getState().clearAuth()
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    getStore()
    const token = _getAccessToken?.()
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

    getStore()
    const refreshToken = _getRefreshToken?.()

    if (!refreshToken) {
      _clearAuth?.()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue request until refresh completes
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

      const { accessToken, refreshToken: newRefreshToken, user } = response.data

      _setAuth?.(user, accessToken, newRefreshToken)

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
      }

      processPendingRequests(accessToken)

      return api(originalRequest)
    } catch (refreshError) {
      processPendingRequests(null, refreshError)
      _clearAuth?.()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
