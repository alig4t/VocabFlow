import { create } from 'zustand'
import { User } from '../types'
import { isNative } from '../lib/platform'

// Offline (native) build has no server/login: every install is a fully-featured
// local ADMIN so all pages (browse, review, edit) are reachable without auth.
const LOCAL_USER: User = {
  id: 'local',
  email: 'local@vocabflow.app',
  name: 'کاربر محلی',
  role: 'ADMIN',
  createdAt: new Date().toISOString(),
}

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'authUser'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isReady: boolean
}

interface AuthActions {
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  initAuth: () => void
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isReady: false,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user, accessToken, refreshToken, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
  },

  initAuth: () => {
    // Native offline build: always authenticated as the local user.
    if (isNative()) {
      set({
        user: LOCAL_USER,
        accessToken: 'offline',
        refreshToken: 'offline',
        isAuthenticated: true,
        isReady: true,
      })
      return
    }

    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const userRaw = localStorage.getItem(USER_KEY)

    if (accessToken && refreshToken && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User
        set({ user, accessToken, refreshToken, isAuthenticated: true, isReady: true })
        return
      } catch {
        // corrupted storage — fall through to clear
        localStorage.removeItem(USER_KEY)
      }
    }

    set({ isReady: true })
  },
}))
