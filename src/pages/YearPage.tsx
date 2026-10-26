import { CalendarDays, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/context'
import { StampCard } from '../components/StampCard'
import { EmptyState, PageHeader, Skeleton, StampGridSkeleton } from '../components/ui'
import { formatDate, plural } from '../lib/format'
import { groupIntoIssues } from '../lib/issues'
import { catalogOrder } from '../lib/stamps'
import { supabase } from '../lib/supabase'
import type { StampOverview } from '../lib/types'
import { useSignedUrls } from '../lib/useSignedUrls'

type Ownership = 'wszystkie' | 'posiadane' | 'brakujace'

// Szerokość emisji w siatce (2 / 3 / 4 / 6 kolumn): tyle kolumn, ile znaczków, najwyżej cały wiersz.
const ISSUE_SPAN = [
  '',
  'col-span-1',
  'col-span-2',
  'col-span-2 sm:col-span-3',
  'col-span-2 sm:col-span-3 md:col-span-4',
  'col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5',
  'col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-6',
]

// Klucz = rok: przejście do sąsiedniego rocznika zaczyna widok od czystego stanu.
export function YearPage() {
  const { year } = useParams()
  return <YearView key={year} year={Number(year)} />
}

function YearView({ year }: { year: number }) {
  const { session } = useAuth()
  const isOwner = Boolean(session)
  const [stamps, setStamps] = useState<StampOverview[] | null>(null)
  const [neighbours, setNeighbours] = useState<{ prev: number | null; next: number | null }>({ prev: null, next: null })
  const [ownership, setOwnership] = useState<Ownership>('wszystkie')

  useEffect(() => {
    const db = supabase!
    Promise.all([
      db.from('stamp_overview').select('*').eq('issue_year', year),
      db.from('stamps').select('issue_year').lt('issue_year', year).order('issue_year', { ascending: false }).limit(1),
      db.from('stamps').select('issue_year').gt('issue_year', year).order('issue_year', { ascending: true }).limit(1),
    ]).then(([list, prev, next]) => {
      setStamps(((list.data as StampOverview[]) ?? []).sort(catalogOrder))
      setNeighbours({ prev: prev.data?.[0]?.issue_year ?? null, next: next.data?.[0]?.issue_year ?? null })
    })
  }, [year])

  const visible = (stamps ?? []).filter(
    (s) => ownership === 'wszystkie' || (ownership === 'posiadane' ? s.owned_count > 0 : s.owned_count === 0),
  )
  const issues = groupIntoIssues(visible)
  const urls = useSignedUrls(visible.map((s) => s.primary_thumb_path))
  const owned = (stamps ?? []).filter((s) => s.owned_count > 0).length

  const yearNav = (
    <div className="flex flex-wrap items-center gap-2">
      {neighbours.prev && (
        <Link to={`/rocznik/${neighbours.prev}`} className="btn btn-secondary">
          <ChevronLeft size={16} /> {neighbours.prev}
        </Link>
      )}
      {neighbours.next && (
        <Link to={`/rocznik/${neighbours.next}`} className="btn btn-secondary">
          {neighbours.next} <ChevronRight size={16} />
        </Link>
      )}
    </div>
  )

  return (
    <>
      <nav className="mb-4 flex items-center gap-2 text-sm text-subtle" aria-label="Okruszki">
        <Link to="/roczniki" className="hover:text-navy-700">
          Roczniki
        </Link>
        <ChevronRight size={14} />
        <span>{year}</span>
      </nav>
      <PageHeader
        eyebrow="Rocznik"
        title={year}
        description={
          stamps === null
            ? ' '
            : [
                plural(stamps.length, 'znaczek', 'znaczki', 'znaczków'),
                plural(groupIntoIssues(stamps).length, 'emisja', 'emisje', 'emisji'),
                isOwner ? `w kolekcji ${owned}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
        }
        actions={
          <>
            {isOwner && (
              <Link to={`/brakujace?od=${year}&do=${year}`} className="btn btn-ghost">
                <ListChecks size={16} /> Lista brakujących z {year}
              </Link>
            )}
            {yearNav}
          </>
        }
      />

      {isOwner && stamps && stamps.length > 0 && (
        <div className="mb-8 inline-flex rounded-lg bg-paper-200/60 p-1" role="radiogroup" aria-label="Posiadanie">
          {(
            [
              ['wszystkie', 'Wszystkie'],
              ['posiadane', 'Posiadane'],
              ['brakujace', 'Brakujące'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={ownership === value}
              onClick={() => setOwnership(value)}
              className={`rounded-lg px-3 py-1 text-sm font-medium transition duration-300 ease-out-expo ${
                ownership === value ? 'bg-card text-navy-700 shadow-e1' : 'text-muted hover:text-navy-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {stamps === null ? (
        <div className="space-y-8">
          <Skeleton className="h-6 w-64" />
          <StampGridSkeleton count={6} />
        </div>
      ) : issues.length === 0 ? (
        <EmptyState icon={CalendarDays} title={stamps.length === 0 ? 'Brak znaczków z tego roku' : 'Nic nie pasuje do filtra'} />
      ) : (
        <div className="space-y-16">
          {/* Emisje układają się obok siebie: każda zajmuje tyle kolumn, ile ma znaczków (subgrid). */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {issues.map((issue) => (
              <section
                key={issue.key}
                className={`grid grid-cols-subgrid content-start gap-y-6 ${ISSUE_SPAN[Math.min(issue.stamps.length, 6)]}`}
              >
                <header className="col-span-full min-h-24 space-y-1 border-b border-line pb-3">
                  <div className="flex flex-wrap gap-x-3 text-xs text-subtle">
                    {issue.date && <span className="font-mono">{formatDate(issue.date)}</span>}
                    <span>{plural(issue.stamps.length, 'znaczek', 'znaczki', 'znaczków')}</span>
                  </div>
                  <h2 className="line-clamp-2 font-serif text-lg leading-snug" title={issue.title}>
                    {issue.title}
                  </h2>
                </header>
                {issue.stamps.map((s, i) => (
                  <StampCard
                    key={s.id}
                    stamp={s}
                    src={s.primary_thumb_path ? urls[s.primary_thumb_path] : null}
                    isOwner={isOwner}
                    index={i}
                  />
                ))}
              </section>
            ))}
          </div>
          <div className="flex justify-center">{yearNav}</div>
        </div>
      )}
    </>
  )
}
