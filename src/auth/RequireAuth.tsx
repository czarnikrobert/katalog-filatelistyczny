import { Navigate, Outlet, useLocation } from 'react-router'
import { Logo } from '../components/ui'
import { useAuth } from './context'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-dvh animate-pulse items-center justify-center">
        <Logo />
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/logowanie" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
