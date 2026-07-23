import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ThemeProvider } from './components/layout/ThemeProvider'
import { Layout } from './components/layout/Layout'
import { PageLoader } from './components/layout/PageLoader'
import { SeedLoader } from './components/layout/SeedLoader'
import { TopLoadingBar } from './components/layout/TopLoadingBar'
import { NativeBackButton } from './components/layout/NativeBackButton'
import { Toaster } from './components/ui/toast'
import { isNative } from './lib/platform'
import { prepareNative } from './offline/bootstrap'
import { initNotifications, rescheduleNotifications } from './lib/notifications'
import { type Role } from './types'

// ── Lazy-loaded pages (code-split; PageLoader shows while chunks load) ────────
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const LibraryPage = lazy(() => import('./pages/library/LibraryPage').then((m) => ({ default: m.LibraryPage })))
const BookDetailPage = lazy(() => import('./pages/library/BookDetailPage').then((m) => ({ default: m.BookDetailPage })))
const VocabularyPage = lazy(() => import('./pages/vocabulary/VocabularyPage').then((m) => ({ default: m.VocabularyPage })))
const ReviewPage = lazy(() => import('./pages/vocabulary/ReviewPage').then((m) => ({ default: m.ReviewPage })))
const StudySessionPage = lazy(() => import('./pages/study/StudySessionPage').then((m) => ({ default: m.StudySessionPage })))
const ReviewTodayPage = lazy(() => import('./pages/study/ReviewTodayPage').then((m) => ({ default: m.ReviewTodayPage })))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const AboutPage = lazy(() => import('./pages/about/AboutPage').then((m) => ({ default: m.AboutPage })))
const GuidePage = lazy(() => import('./pages/guide/GuidePage').then((m) => ({ default: m.GuidePage })))
const AdminPage = lazy(() => import('./pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })))
const WordFormPage = lazy(() => import('./pages/admin/WordFormPage').then((m) => ({ default: m.WordFormPage })))
const BookListPage = lazy(() => import('./pages/admin/books/BookListPage').then((m) => ({ default: m.BookListPage })))
const BookFormPage = lazy(() => import('./pages/admin/books/BookFormPage').then((m) => ({ default: m.BookFormPage })))
const VolumeManagerPage = lazy(() => import('./pages/admin/books/VolumeManagerPage').then((m) => ({ default: m.VolumeManagerPage })))
const LessonManagerPage = lazy(() => import('./pages/admin/books/LessonManagerPage').then((m) => ({ default: m.LessonManagerPage })))

// ProtectedRoute: redirects unauthenticated users to /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// AdminRoute: requires ADMIN role; redirects others to /dashboard
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

  // Native offline build seeds the local SQLite DB on first launch.
  const [dbReady, setDbReady] = useState(!isNative())
  const [seed, setSeed] = useState({ progress: 0, label: '' })

  useEffect(() => {
    initAuth()
  }, [initAuth])

  useEffect(() => {
    if (!isNative()) return
    prepareNative((progress, label) => setSeed({ progress, label }))
      .then(() => setDbReady(true))
      .catch((e) => {
        console.error('offline seed failed', e)
        setDbReady(true)
      })
  }, [])

  // Native: schedule study reminders once the offline DB is ready, and rebuild
  // the schedule every time the app is brought back to the foreground (so a
  // session completed elsewhere / a new day is reflected). No-op on web.
  useEffect(() => {
    if (!isNative() || !dbReady) return
    initNotifications()
    let remove: (() => void) | undefined
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) rescheduleNotifications()
      }).then((handle) => {
        remove = () => handle.remove()
      })
    })
    return () => remove?.()
  }, [dbReady])

  // Block route rendering until auth is restored from localStorage.
  if (!isReady) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="eng-theme">
        <PageLoader />
      </ThemeProvider>
    )
  }

  // Native: block until the offline DB is seeded and ready.
  if (!dbReady) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="eng-theme">
        <SeedLoader progress={seed.progress} label={seed.label} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="eng-theme">
      <BrowserRouter>
        <NativeBackButton />
        <TopLoadingBar />
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing page (web) — native jumps straight into the app */}
            <Route
              path="/"
              element={isNative() ? <Navigate to="/dashboard" replace /> : <LandingPage />}
            />

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
              path="/library/:bookId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BookDetailPage />
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
            <Route
              path="/study"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudySessionPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/review-today"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReviewTodayPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/guide"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GuidePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/about"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AboutPage />
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
              path="/admin/users"
              element={
                <AdminRoute>
                  <Layout>
                    <UsersPage />
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
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}
