import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from './store/authStore'
import { ThemeProvider } from './components/layout/ThemeProvider'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LibraryPage } from './pages/library/LibraryPage'
import { VocabularyPage } from './pages/vocabulary/VocabularyPage'
import { ReviewPage } from './pages/vocabulary/ReviewPage'
import { AdminPage } from './pages/admin/AdminPage'
import { WordFormPage } from './pages/admin/WordFormPage'
import { BookListPage } from './pages/admin/books/BookListPage'
import { BookFormPage } from './pages/admin/books/BookFormPage'
import { VolumeManagerPage } from './pages/admin/books/VolumeManagerPage'
import { LessonManagerPage } from './pages/admin/books/LessonManagerPage'
import LandingPage from './pages/LandingPage'
import { Toaster } from './components/ui/toast'
import { type Role } from './types'

// ProtectedRoute: redirects unauthenticated users to /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// AdminRoute: requires ADMIN role; redirects others to /vocabulary
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== ('ADMIN' as Role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// PublicRoute: redirects authenticated users away from auth pages
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth)
  const isReady = useAuthStore((s) => s.isReady)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Block route rendering until auth is restored from localStorage.
  // Without this gate, AdminRoute renders with user=null and redirects
  // to /vocabulary before initAuth has a chance to run.
  if (!isReady) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="eng-theme">
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="eng-theme">
      <BrowserRouter>
        <Toaster />
        <Routes>
          {/* Landing page — always accessible */}
          <Route path="/" element={<LandingPage />} />

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

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <Layout>
                  <LibraryPage />
                </Layout>
              </ProtectedRoute>
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
          <Route
            path="/admin/books"
            element={
              <AdminRoute>
                <Layout>
                  <BookListPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/books/new"
            element={
              <AdminRoute>
                <Layout>
                  <BookFormPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/books/:id/edit"
            element={
              <AdminRoute>
                <Layout>
                  <BookFormPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/books/:bookId/volumes"
            element={
              <AdminRoute>
                <Layout>
                  <VolumeManagerPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/books/:bookId/volumes/:volumeId/lessons"
            element={
              <AdminRoute>
                <Layout>
                  <LessonManagerPage />
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
