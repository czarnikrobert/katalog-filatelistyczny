import { CalendarDays, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context'
import { StampThumb } from '../components/StampThumb'
import { EmptyState, PageHeader, Skeleton } from '../components/ui'
import { plural } from '../lib/format'
import { useSignedUrls } from '../lib/useSignedUrls'
import { loadYears, type YearSummary } from '../lib/years'

// Spis roczników — strona startowa dla osób niezalogowanych.
export function YearsPage() {
  const { session } = useAuth()
  const [years, setYears] = useState<YearSummary[] | null>(null)
  const [error, setError] = useState(false)
  const urls = useSignedUrls((years ?? []).map((y) => y.thumb))

  useEffect(() => {
    loadYears()
      .then(setYears)
      .catch(() => setError(true))
  }, [])

  // Grupowanie w dekady ułatwia orientację przy wielu rocznikach.
  const decades = new Map<number, YearSummary[]>()
  for (const y of years ?? []) {
    const d = Math.floor(y.year / 10) * 10
    decades.set(d, [...(decades.get(d) ?? []), y])
  }

  return (
    <>
      <PageHeader
        eyebrow="Katalog znaczków polskich"
        title="Roczniki"
        description="Wybierz rok, aby zobaczyć wszystkie znaczki wydane w tym roku, emisja po emisji."
        actions={
          session && (
            <Link to="/brakujace" className="btn btn-secondary">
              <ListChecks size={16} /> Lista brakujących
            </Link>
          )
        }
      />
      {error ? (
        <EmptyState icon={CalendarDays} title="Nie udało się wczytać roczników">
          Sprawdź połączenie z internetem i odśwież stronę.
        </EmptyState>
      ) : years === null ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : years.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Katalog jest jeszcze pusty" />
      ) : (
        <div className="space-y-12">
          {[...decades].map(([decade, list]) => (
            <section key={decade} className="space-y-4">
              <h2 className="eyebrow">Lata {decade}.</h2>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
                {list.map((y, i) => (
                  <Link
                    key={y.year}
                    to={`/rocznik/${y.year}`}
                    className="group card flex animate-rise flex-col items-center gap-4 p-6 transition duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-e3"
                    style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                  >
                    <StampThumb src={y.thumb ? urls[y.thumb] : null} alt="" className="w-16" />
                    <div className="text-center">
                      <div className="font-serif text-3xl text-navy-700">{y.year}</div>
                      <div className="text-xs text-subtle">{plural(y.total, 'znaczek', 'znaczki', 'znaczków')}</div>
                      {session && (
                        <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-paper-200">
                          <div className="h-full rounded-full bg-gold-400" style={{ width: `${(y.owned / y.total) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
