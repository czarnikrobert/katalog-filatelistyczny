import { LucideProvider } from 'lucide-react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { isPasswordReset, isSupabaseConfigured } from './lib/supabase'
import { AlbumsPage } from './pages/AlbumsPage'
import { CatalogPage } from './pages/CatalogPage'
import { CollectionPage } from './pages/CollectionPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotConfiguredPage } from './pages/NotConfiguredPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SpecimenFormPage } from './pages/SpecimenFormPage'
import { StampDetailPage } from './pages/StampDetailPage'
import { StampFormPage } from './pages/StampFormPage'

// HashRouter (adresy z #/) — GitHub Pages nie obsługuje przekierowań dla tras SPA.
export default function App() {
  if (!isSupabaseConfigured) return <NotConfiguredPage />

  return (
    <LucideProvider strokeWidth={1.75}>
      <AuthProvider>
        {isPasswordReset() ? (
          <ResetPasswordPage />
        ) : (
          <HashRouter>
            <Routes>
              <Route path="/logowanie" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="katalog" element={<CatalogPage />} />
                  <Route path="kolekcja" element={<CollectionPage />} />
                  <Route path="klasery" element={<AlbumsPage />} />
                  <Route path="dodaj" element={<StampFormPage />} />
                  <Route path="znaczek/:id" element={<StampDetailPage />} />
                  <Route path="znaczek/:id/edytuj" element={<StampFormPage />} />
                  <Route path="znaczek/:id/egzemplarz/nowy" element={<SpecimenFormPage />} />
                  <Route path="znaczek/:id/egzemplarz/:specimenId" element={<SpecimenFormPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        )}
      </AuthProvider>
    </LucideProvider>
  )
}
