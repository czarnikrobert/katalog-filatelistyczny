import { ArrowUpRight, BookOpen, Plus, Stamp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { StampThumb } from '../components/StampThumb'
import { EmptyState, PageHeader, Skeleton } from '../components/ui'
import { fetchAll } from '../lib/fetchAll'
import { formatMoney } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { StampOverview } from '../lib/types'
import { useSignedUrls } from '../lib/useSignedUrls'

interface Stats {
  catalog: number
  owned: number
  specimens: number
  polish: number
  forTrade: number
  valuePln: number
  valuedCount: number
  costPln: number
  otherCurrencies: string[]
  countries: { name: string; total: number; owned: number }[]
}

async function loadStats(): Promise<Stats> {
  const db = supabase!
  const head = { count: 'exact' as const, head: true }
  const [catalog, missing, specimens, polish, forTrade, values, perCountry] = await Promise.all([
    db.from('stamps').select('*', head),
    db.from('stamp_overview').select('*', head).eq('owned_count', 0),
    db.from('specimens').select('*', head),
    db.from('stamp_overview').select('*', head).eq('country_iso', 'PL'),
    db.from('specimens').select('*', head).neq('collection_status', 'w_kolekcji'),
    fetchAll<{ estimated_value: number | null; estimated_value_currency: string | null; purchase_price: number | null; purchase_currency: string | null }>(
      (from, to) => db.from('specimens').select('estimated_value, estimated_value_currency, purchase_price, purchase_currency').range(from, to),
    ),
    fetchAll<{ country_name: string; owned_count: number }>((from, to) =>
      db.from('stamp_overview').select('country_name, owned_count').range(from, to),
    ),
  ])

  // Sumujemy tylko złotówki; inne waluty wymieniamy osobno, bez przeliczania kursów.
  let valuePln = 0
  let costPln = 0
  let valuedCount = 0
  const other = new Set<string>()
  for (const v of values) {
    if (v.estimated_value != null) {
      valuedCount++
      if ((v.estimated_value_currency ?? 'PLN') === 'PLN') valuePln += v.estimated_value
      else other.add(v.estimated_value_currency!)
    }
    if (v.purchase_price != null && (v.purchase_currency ?? 'PLN') === 'PLN') costPln += v.purchase_price
  }

  const byCountry = new Map<string, { total: number; owned: number }>()
  for (const row of perCountry) {
    const entry = byCountry.get(row.country_name) ?? { total: 0, owned: 0 }
    entry.total++
    if (row.owned_count > 0) entry.owned++
    byCountry.set(row.country_name, entry)
  }

  const catalogCount = catalog.count ?? 0
  return {
    catalog: catalogCount,
    owned: catalogCount - (missing.count ?? 0),
    specimens: specimens.count ?? 0,
    polish: polish.count ?? 0,
    forTrade: forTrade.count ?? 0,
    valuePln,
    valuedCount,
    costPln,
    otherCurrencies: [...other],
    countries: [...byCountry]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6),
  }
}

const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Skeleton className="h-64 lg:col-span-2" />
      <Skeleton className="h-64" />
      <Skeleton className="h-80 lg:col-span-2" />
      <Skeleton className="h-80" />
    </div>
  )
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<StampOverview[]>([])
  const [error, setError] = useState(false)
  const urls = useSignedUrls(recent.map((s) => s.primary_thumb_path))

  useEffect(() => {
    Promise.all([
      loadStats(),
      supabase!.from('stamp_overview').select('*').order('created_at', { ascending: false }).limit(6),
    ])
      .then(([s, latest]) => {
        setStats(s)
        setRecent((latest.data as StampOverview[]) ?? [])
      })
      .catch(() => setError(true))
  }, [])

  const header = <PageHeader eyebrow={today} title="Twoja kolekcja" />

  if (error) {
    return (
      <>
        {header}
        <EmptyState icon={Stamp} title="Nie udało się wczytać danych">
          Sprawdź połączenie z internetem i odśwież stronę.
        </EmptyState>
      </>
    )
  }
  if (!stats) {
    return (
      <>
        {header}
        <DashboardSkeleton />
      </>
    )
  }

  if (stats.catalog === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Stamp}
          title="Zacznij od pierwszego znaczka"
          action={
            <Link to="/dodaj" className="btn btn-primary">
              <Plus size={16} /> Dodaj znaczek
            </Link>
          }
        >
          Dodaj emisję do katalogu, a jeśli ją masz — od razu zapisz swój egzemplarz, jego stan i miejsce w klaserze.
          Pozycje bez egzemplarza trafią na listę brakujących.
        </EmptyState>
      </>
    )
  }

  const percent = Math.round((stats.owned / stats.catalog) * 1000) / 10
  const missing = stats.catalog - stats.owned

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card flex animate-rise flex-col justify-between gap-8 p-6 md:p-8 lg:col-span-2">
          <div className="space-y-4">
            <div className="eyebrow">Kompletność kolekcji</div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="font-serif text-5xl leading-none text-navy-700 md:text-6xl">{percent.toLocaleString('pl-PL')}%</span>
              <span className="text-base text-muted">
                {stats.owned} z {stats.catalog} pozycji katalogu
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full bg-gold-400 transition-[width] duration-1000 ease-out-expo"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <dl className="flex flex-wrap gap-x-8 gap-y-4">
              {[
                ['Egzemplarzy', stats.specimens],
                ['Polskich pozycji', stats.polish],
                ['Na wymianę / sprzedaż', stats.forTrade],
              ].map(([label, value]) => (
                <div key={label} className="space-y-1">
                  <dt className="text-xs text-subtle">{label}</dt>
                  <dd className="font-mono text-xl font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {missing > 0 && (
              <Link to="/brakujace" className="btn btn-secondary">
                Brakujące ({missing}) <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        </section>

        <section className="flex animate-rise flex-col justify-between gap-8 rounded-xl bg-navy-800 p-6 text-paper-50 shadow-e3 [animation-delay:80ms] md:p-8">
          <div className="space-y-4">
            <div className="eyebrow text-gold-300">Szacunkowa wartość</div>
            <div className="font-serif text-4xl leading-none md:text-5xl">{formatMoney(stats.valuePln, 'PLN')}</div>
            <p className="text-sm leading-relaxed text-navy-100">
              {stats.valuedCount > 0
                ? `Na podstawie ${stats.valuedCount} wycenionych egzemplarzy.`
                : 'Dodaj wycenę do egzemplarza, a suma pojawi się tutaj.'}
              {stats.otherCurrencies.length > 0 && ` Wyceny w ${stats.otherCurrencies.join(', ')} liczone osobno.`}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-navy-600 pt-4 text-sm">
            <span className="text-navy-100">Koszt zakupów</span>
            <span className="font-mono">{formatMoney(stats.costPln, 'PLN')}</span>
          </div>
        </section>

        <section className="card animate-rise p-6 [animation-delay:160ms] md:p-8 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="font-serif text-xl">Ostatnio dodane</h2>
            <Link to="/katalog" className="btn btn-ghost -mr-2 text-sm">
              Cały katalog <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
            {recent.map((s) => (
              <Link key={s.id} to={`/znaczek/${s.id}`} className="group space-y-2">
                <StampThumb
                  src={s.primary_thumb_path ? urls[s.primary_thumb_path] : null}
                  alt={s.name}
                  missing={s.owned_count === 0}
                  caption={s.issue_year ? String(s.issue_year) : null}
                  className="transition duration-500 ease-out-expo group-hover:-translate-y-1"
                />
                <div className="line-clamp-2 text-xs leading-snug text-muted group-hover:text-navy-700">{s.name}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card animate-rise p-6 [animation-delay:240ms] md:p-8">
          <h2 className="mb-6 font-serif text-xl">Według krajów</h2>
          <ul className="space-y-4">
            {stats.countries.map((c) => (
              <li key={c.name} className="space-y-2">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="font-mono text-xs text-subtle">
                    {c.owned}/{c.total}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-paper-200">
                  <div className="h-full rounded-full bg-navy-500" style={{ width: `${(c.owned / c.total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <Link to="/katalog" className="btn btn-ghost mt-6 -ml-2 text-sm">
            <BookOpen size={16} /> Przeglądaj katalog
          </Link>
        </section>
      </div>
    </>
  )
}
