import { LucideProvider } from 'lucide-react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { isPasswordReset, isSupabaseConfigured } from './lib/supabase'
import { AlbumsPage } from './pages/AlbumsPage'
import { CatalogPage } from './pages/CatalogPage'
import { CollectionPage } from './pages/CollectionPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MissingPage } from './pages/MissingPage'
import { NotConfiguredPage } from './pages/NotConfiguredPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ScansPage } from './pages/ScansPage'
import { SpecimenFormPage } from './pages/SpecimenFormPage'
import { StampDetailPage } from './pages/StampDetailPage'
import { StampFormPage } from './pages/StampFormPage'
import { YearPage } from './pages/YearPage'
import { YearsPage } from './pages/YearsPage'

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
              <Route element={<Layout />}>
                {/* Publiczne: przeglądanie katalogu bez logowania. */}
                <Route index element={<HomePage />} />
                <Route path="roczniki" element={<YearsPage />} />
                <Route path="rocznik/:year" element={<YearPage />} />
                <Route path="katalog" element={<CatalogPage />} />
                <Route path="znaczek/:id" element={<StampDetailPage />} />
                {/* Tylko właściciel: kolekcja i wszelkie zmiany. */}
                <Route element={<RequireAuth />}>
                  <Route path="kolekcja" element={<CollectionPage />} />
                  <Route path="klasery" element={<AlbumsPage />} />
                  <Route path="brakujace" element={<MissingPage />} />
                  <Route path="skany" element={<ScansPage />} />
                  <Route path="dodaj" element={<StampFormPage />} />
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
