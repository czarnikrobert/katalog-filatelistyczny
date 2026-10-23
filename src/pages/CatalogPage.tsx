import { BookOpen, ChevronLeft, ChevronRight, LayoutGrid, Plus, Search, Table, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context'
import { StampCard } from '../components/StampCard'
import { EmptyState, PageHeader, Pill, Skeleton, StampGridSkeleton } from '../components/ui'
import { fetchAll } from '../lib/fetchAll'
import { plural } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Country, StampOverview } from '../lib/types'
import { useSignedUrls } from '../lib/useSignedUrls'

const PAGE_SIZE = 48

type Ownership = 'wszystkie' | 'posiadane' | 'brakujace'

const ownershipOptions: { value: Ownership; label: string }[] = [
  { value: 'wszystkie', label: 'Wszystkie' },
  { value: 'posiadane', label: 'Posiadane' },
  { value: 'brakujace', label: 'Brakujące' },
]

const sortOptions = {
  rok: { label: 'Rok emisji', column: 'issue_year', ascending: true },
  nazwa: { label: 'Nazwa', column: 'name', ascending: true },
  nowe: { label: 'Ostatnio dodane', column: 'created_at', ascending: false },
} as const

type SortKey = keyof typeof sortOptions

export function CatalogPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { session } = useAuth()
  const isOwner = Boolean(session)
  const countryId = params.get('kraj') ?? ''
  const year = params.get('rok') ?? ''
  // Filtr posiadania ma sens tylko dla zalogowanego właściciela.
  const ownership = isOwner ? ((params.get('posiadanie') as Ownership | null) ?? 'wszystkie') : 'wszystkie'
  const sort: SortKey = (params.get('sort') as SortKey | null) ?? 'rok'
  const view = params.get('widok') === 'tabela' ? 'tabela' : 'galeria'
  const page = Math.max(1, Number(params.get('strona') ?? 1))

  const [countries, setCountries] = useState<Country[]>([])
  const [years, setYears] = useState<number[]>([])
  const [rows, setRows] = useState<StampOverview[]>([])
  const [total, setTotal] = useState(0)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [draft, setDraft] = useState(query)
  const urls = useSignedUrls(rows.map((r) => r.primary_thumb_path))

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('strona' in changes)) next.delete('strona')
    setParams(next)
  }

  useEffect(() => {
    supabase!
      .from('countries')
      .select('id, name, iso_code, period, sort_order')
      .order('sort_order')
      .order('name')
      .then(({ data }) => setCountries((data as Country[]) ?? []))
    fetchAll<{ issue_year: number | null }>((from, to) =>
      supabase!.from('stamps').select('issue_year').range(from, to),
    ).then((rows) =>
      setYears(
        [...new Set(rows.map((r) => r.issue_year).filter((y): y is number => y !== null))].sort((a, b) => b - a),
      ),
    )
  }, [])

  const requestKey = [query, countryId, year, ownership, sort, page].join('|')
  const loading = loadedKey !== requestKey

  useEffect(() => {
    let q = supabase!.from('stamp_overview').select('*', { count: 'exact' })
    if (query) {
      // Przecinki i nawiasy rozbijają składnię filtra .or() — usuwamy je z frazy.
      const term = query.replace(/[,()]/g, ' ').trim()
      q = q.or(`name.ilike.%${term}%,catalog_number.ilike.%${term}%`)
    }
    if (countryId) q = q.eq('country_id', countryId)
    if (year) q = q.eq('issue_year', Number(year))
    if (ownership === 'posiadane') q = q.gt('owned_count', 0)
    if (ownership === 'brakujace') q = q.eq('owned_count', 0)
    const { column, ascending } = sortOptions[sort] ?? sortOptions.rok
    const from = (page - 1) * PAGE_SIZE
    q.order(column, { ascending, nullsFirst: false })
      .order('catalog_number', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .then(({ data, count }) => {
        setRows((data as StampOverview[]) ?? [])
        setTotal(count ?? 0)
        setLoadedKey(requestKey)
      })
  }, [requestKey, query, countryId, year, ownership, sort, page])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtered = Boolean(query || countryId || year || ownership !== 'wszystkie')

  return (
    <>
      <PageHeader
        eyebrow="Katalog ogólny"
        title="Katalog znaczków"
        description={
          isOwner
            ? 'Wszystkie emisje — te z Twojej kolekcji i te, których jeszcze szukasz.'
            : 'Znaczki polskie z opisem emisji, numerami katalogowymi i grafikami. Szukaj po nazwie, numerze, roku lub kraju.'
        }
      />

      <div className="mb-8 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_220px_200px]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              update({ q: draft.trim() })
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute top-3 left-3 text-subtle" size={16} />
            <input
              className="input pr-8 pl-8"
              placeholder="Szukaj po nazwie lub numerze katalogowym…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              enterKeyHint="search"
            />
            {draft && (
              <button
                type="button"
                onClick={() => {
                  setDraft('')
                  update({ q: '' })
                }}
                className="absolute top-2 right-2 rounded p-1 text-subtle hover:text-navy-700"
                aria-label="Wyczyść wyszukiwanie"
              >
                <X size={16} />
              </button>
            )}
          </form>
          <select className="input" value={year} onChange={(e) => update({ rok: e.target.value })} aria-label="Rok">
            <option value="">Wszystkie lata</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={countryId}
            onChange={(e) => update({ kraj: e.target.value })}
            aria-label="Kraj"
          >
            <option value="">Wszystkie kraje</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={sort}
            onChange={(e) => update({ sort: e.target.value === 'rok' ? '' : e.target.value })}
            aria-label="Sortowanie"
          >
            {Object.entries(sortOptions).map(([key, o]) => (
              <option key={key} value={key}>
                Sortuj: {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isOwner && (
            <div className="inline-flex rounded-lg bg-paper-200/60 p-1" role="radiogroup" aria-label="Posiadanie">
              {ownershipOptions.map((o) => (
                <button
                  key={o.value}
                  role="radio"
                  aria-checked={ownership === o.value}
                  onClick={() => update({ posiadanie: o.value === 'wszystkie' ? '' : o.value })}
                  className={`rounded-lg px-3 py-1 text-sm font-medium transition duration-300 ease-out-expo ${
                    ownership === o.value ? 'bg-card text-navy-700 shadow-e1' : 'text-muted hover:text-navy-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {year && (
            <Link to={`/rocznik/${year}`} className="btn btn-ghost px-2 py-1 text-sm">
              Rocznik {year} z podziałem na emisje <ChevronRight size={16} />
            </Link>
          )}
          <span className="text-sm text-subtle">
            {loading ? <Skeleton className="h-4 w-24" /> : plural(total, 'pozycja', 'pozycje', 'pozycji')}
          </span>
          <div className="ml-auto inline-flex rounded-lg bg-paper-200/60 p-1">
            {(
              [
                ['galeria', LayoutGrid, 'Widok galerii'],
                ['tabela', Table, 'Widok tabeli'],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                onClick={() => update({ widok: value === 'galeria' ? '' : value })}
                className={`rounded-lg px-2 py-1 transition duration-300 ease-out-expo ${
                  view === value ? 'bg-card text-navy-700 shadow-e1' : 'text-subtle hover:text-navy-700'
                }`}
                aria-label={label}
                aria-pressed={view === value}
                title={label}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <StampGridSkeleton />
      ) : rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={Search}
            title="Nic nie pasuje do filtrów"
            action={
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setDraft('')
                  setParams(new URLSearchParams(view === 'tabela' ? { widok: 'tabela' } : {}))
                }}
              >
                Wyczyść filtry
              </button>
            }
          >
            Spróbuj innej frazy, roku lub kraju albo pokaż cały katalog.
          </EmptyState>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Katalog jest pusty"
            action={
              isOwner && (
                <Link to="/dodaj" className="btn btn-primary">
                  <Plus size={16} /> Dodaj pierwszy znaczek
                </Link>
              )
            }
          >
            Każda dodana emisja pojawi się tutaj — z informacją, czy masz ją w kolekcji.
          </EmptyState>
        )
      ) : view === 'galeria' ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {rows.map((s, i) => (
            <StampCard
              key={s.id}
              stamp={s}
              src={s.primary_thumb_path ? urls[s.primary_thumb_path] : null}
              isOwner={isOwner}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                {['Nr kat.', 'Nazwa', 'Kraj', 'Rok', 'Seria', ...(isOwner ? ['Posiadam'] : [])].map((h, i) => (
                  <th
                    key={h}
                    className={`eyebrow px-4 py-3 font-medium whitespace-nowrap ${i === 5 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/znaczek/${s.id}`)}
                  className="cursor-pointer transition duration-300 ease-out-expo hover:bg-paper-100"
                >
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted">
                    {s.catalog_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/znaczek/${s.id}`} className="hover:text-navy-700" onClick={(e) => e.stopPropagation()}>
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{s.country_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{s.issue_year ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{s.series_name ?? '—'}</td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      {s.owned_count > 0 ? <Pill tone="navy">×{s.owned_count}</Pill> : <Pill>brak</Pill>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && !loading && (
        <nav className="mt-12 flex items-center justify-center gap-4 text-sm" aria-label="Strony katalogu">
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => update({ strona: String(page - 1) })}
          >
            <ChevronLeft size={16} /> Poprzednia
          </button>
          <span className="font-mono text-subtle">
            {page} / {pages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= pages}
            onClick={() => update({ strona: String(page + 1) })}
          >
            Następna <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </>
  )
}
