import { useAuth } from '../auth/context'
import { Skeleton } from '../components/ui'
import { DashboardPage } from './DashboardPage'
import { YearsPage } from './YearsPage'

// Strona startowa: właściciel widzi pulpit kolekcji, gość — spis roczników katalogu.
export function HomePage() {
  const { session, loading } = useAuth()
  if (loading) return <Skeleton className="h-64" />
  return session ? <DashboardPage /> : <YearsPage />
}
