import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ThemeProvider } from './components/layout/ThemeProvider'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { VocabularyPage } from './pages/vocabulary/VocabularyPage'
import { ReviewPage } from './pages/vocabulary/ReviewPage'
import { AdminPage } from './pages/admin/AdminPage'
import { WordFormPage } from './pages/admin/WordFormPage'
import LandingPage from './pages/LandingPage'
import { type Role } from './types'

// HomeRoute: shows LandingPage for guests, redirects authenticated users to /vocabulary
function HomeRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/vocabulary" replace />
  return <LandingPage />
}

// ProtectedRoute: redirects unauthenticated users to /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

// AdminRoute: requires ADMIN role; redirects others to /vocabulary
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== ('ADMIN' as Role)) {
    return <Navigate to="/vocabulary" replace />
  }

  return <>{children}</>
}

// PublicRoute: redirects authenticated users away from auth pages
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    return <Navigate to="/vocabulary" replace />
  }
  return <>{children}</>
}

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <ThemeProvider defaultTheme="light" storageKey="eng-theme">
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Landing page — unauthenticated users see it, authenticated users go to /vocabulary */}
          <Route
            path="/"
            element={
              <HomeRoute />
            }
          />
          <Route
            path="/vocabulary"
            element={
              <ProtectedRoute>
                <Layout>
                  <VocabularyPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vocabulary/review"
            element={
              <ProtectedRoute>
                <Layout>
                  <ReviewPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Layout>
                  <AdminPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/words/new"
            element={
              <AdminRoute>
                <Layout>
                  <WordFormPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/words/:id/edit"
            element={
              <AdminRoute>
                <Layout>
                  <WordFormPage />
                </Layout>
              </AdminRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
