import { Navigate, Outlet, useLocation } from 'react-router'
import { Skeleton } from '../components/ui'
import { useAuth } from './context'

// Strefa właściciela (kolekcja, dodawanie, edycja) — gość trafia na logowanie i wraca tu po zalogowaniu.
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Skeleton className="h-64" />
  if (!session) {
    return <Navigate to="/logowanie" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
