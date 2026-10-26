import { CircleCheck, Download, ListChecks, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { StampThumb } from '../components/StampThumb'
import { EmptyState, PageHeader, Pill, Skeleton } from '../components/ui'
import { downloadCsv } from '../lib/csv'
import { fetchAll } from '../lib/fetchAll'
import { formatDate, nominalLabel, plural } from '../lib/format'
import { groupIntoIssues, type Issue } from '../lib/issues'
import { catalogOrder } from '../lib/stamps'
import { supabase } from '../lib/supabase'
import type { StampOverview } from '../lib/types'
import { useSignedUrls } from '../lib/useSignedUrls'

type Mode = 'wszystkie' | 'rozpoczete'

const today = new Date().toLocaleDateString('pl-PL')

interface IssueGap {
  issue: Issue
  owned: number
  missing: StampOverview[]
}

interface YearGap {
  year: number
  total: number
  owned: number
  issues: IssueGap[]
}

// Pod nagłówkiem emisji nazwa bez powtórzonego tytułu emisji („Droga do wolności — Strajki…” → „Strajki…”).
const withoutIssueTitle = (name: string, title: string) =>
  name.startsWith(`${title} — `) ? name.slice(title.length + 3) : name

// Brakujące znaczki z wybranego okresu, rocznik po roczniku i emisja po emisji.
function buildGaps(stamps: StampOverview[], mode: Mode): YearGap[] {
  const byYear = new Map<number, StampOverview[]>()
  for (const s of stamps) byYear.set(s.issue_year!, [...(byYear.get(s.issue_year!) ?? []), s])
  return [...byYear].map(([year, list]) => {
    const issues = groupIntoIssues(list)
      .map((issue) => ({
        issue,
        owned: issue.stamps.filter((s) => s.owned_count > 0).length,
        missing: issue.stamps.filter((s) => s.owned_count === 0),
      }))
      // „Rozpoczęte”: emisje, z których masz już coś, ale nie wszystko — do uzupełnienia kompletu.
      .filter((g) => g.missing.length > 0 && (mode === 'wszystkie' || g.owned > 0))
    return { year, total: list.length, owned: list.filter((s) => s.owned_count > 0).length, issues }
  })
}

export function MissingPage() {
  const [params, setParams] = useSearchParams()
  const [years, setYears] = useState<number[] | null>(null)
  const [stamps, setStamps] = useState<StampOverview[] | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const first = years?.[0]
  const last = years?.[years.length - 1]
  let from = Number(params.get('od') ?? first)
  let to = Number(params.get('do') ?? last)
  if (from > to) [from, to] = [to, from]
  const mode: Mode = params.get('tryb') === 'rozpoczete' ? 'rozpoczete' : 'wszystkie'

  useEffect(() => {
    fetchAll<{ issue_year: number | null }>((a, b) => supabase!.from('stamps').select('issue_year').range(a, b)).then(
      (rows) =>
        setYears(
          [...new Set(rows.map((r) => r.issue_year).filter((y): y is number => y !== null))].sort((a, b) => a - b),
        ),
    )
  }, [])

  const requestKey = years ? `${from}-${to}` : null
  useEffect(() => {
    if (!requestKey) return
    fetchAll<StampOverview>((a, b) =>
      supabase!.from('stamp_overview').select('*').gte('issue_year', from).lte('issue_year', to).range(a, b),
    ).then((rows) => {
      setStamps(rows.sort(catalogOrder))
      setLoadedKey(requestKey)
    })
  }, [requestKey, from, to])

  const loading = !years || loadedKey !== requestKey
  const gaps = !loading && stamps ? buildGaps(stamps, mode) : []
  const missingAll = gaps.flatMap((y) => y.issues.flatMap((g) => g.missing))
  const issueCount = gaps.reduce((n, y) => n + y.issues.length, 0)
  const urls = useSignedUrls(missingAll.map((s) => s.primary_thumb_path))
  const period = from === to ? String(from) : `${from}–${to}`

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  const exportCsv = () =>
    downloadCsv(
      `brakujace-znaczki-${period}${mode === 'rozpoczete' ? '-rozpoczete-emisje' : ''}.csv`,
      ['Rok', 'Data emisji', 'Emisja', 'Katalog', 'Numer', 'Nazwa', 'Nominał', 'Mam z emisji'],
      gaps.flatMap((y) =>
        y.issues.flatMap((g) =>
          g.missing.map((s) => [
            y.year,
            formatDate(s.issue_date),
            g.issue.title,
            s.catalog_system,
            s.catalog_number,
            s.name,
            nominalLabel(s),
            `${g.owned} z ${g.issue.stamps.length}`,
          ]),
        ),
      ),
    )

  const yearSelect = (label: string, value: number, key: string) => (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <select className="input" value={value} onChange={(e) => update({ [key]: e.target.value })}>
        {years?.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Moja kolekcja"
          title="Brakujące znaczki"
          description="Wybierz okres, a zobaczysz, czego brakuje Ci do kompletu każdego rocznika i emisji. Listę możesz wydrukować, zapisać jako PDF albo pobrać do Excela."
          actions={
            <>
              <button className="btn btn-secondary" onClick={exportCsv} disabled={loading || missingAll.length === 0}>
                <Download size={16} /> Pobierz (Excel/CSV)
              </button>
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
                disabled={loading || missingAll.length === 0}
              >
                <Printer size={16} /> Drukuj / zapisz PDF
              </button>
            </>
          }
        />

        <div className="card mb-8 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-[160px_160px_1fr]">
          {years ? (
            <>
              {yearSelect('Od roku', from, 'od')}
              {yearSelect('Do roku', to, 'do')}
            </>
          ) : (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          )}
          <div className="space-y-2 text-sm sm:col-span-2 lg:col-span-1">
            <span className="block font-medium">Pokaż</span>
            <div
              className="inline-flex flex-wrap rounded-lg bg-paper-200/60 p-1"
              role="radiogroup"
              aria-label="Zakres listy"
            >
              {(
                [
                  ['wszystkie', 'Wszystkie brakujące'],
                  ['rozpoczete', 'Tylko do uzupełnienia rozpoczętych emisji'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => update({ tryb: value === 'wszystkie' ? '' : value })}
                  className={`rounded-lg px-3 py-1 text-sm font-medium transition duration-300 ease-out-expo ${
                    mode === value ? 'bg-card text-navy-700 shadow-e1' : 'text-muted hover:text-navy-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Nagłówek tylko na wydruku. */}
      <header className="mb-6 hidden border-b border-ink pb-3 print:block">
        <h1 className="font-serif text-2xl text-ink">Brakujące znaczki · {period}</h1>
        <p className="text-sm">
          {mode === 'rozpoczete' ? 'Tylko emisje rozpoczęte (częściowo posiadane). ' : ''}
          Stan na {today} · filatelistyka.com
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      ) : stamps!.length === 0 ? (
        <EmptyState icon={ListChecks} title="Brak znaczków w tym okresie" />
      ) : (
        <div className="space-y-12 print:space-y-6">
          <p className="text-base text-muted print:text-sm print:text-ink">
            {missingAll.length === 0 ? (
              <span className="inline-flex items-center gap-2 font-medium text-emerald-700">
                <CircleCheck size={18} /> Masz komplet — nic nie brakuje w tym okresie.
              </span>
            ) : (
              <>
                Brakuje{' '}
                <strong className="text-ink">{plural(missingAll.length, 'znaczka', 'znaczków', 'znaczków')}</strong> w{' '}
                {plural(issueCount, 'emisji', 'emisjach', 'emisjach')}
                {' · '}
                {period}
              </>
            )}
          </p>

          <section className="card overflow-x-auto print:overflow-visible print:border-0 print:shadow-none">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  {['Rocznik', 'W katalogu', 'Mam', 'Brakuje', 'Kompletność'].map((h, i) => (
                    <th
                      key={h}
                      className={`eyebrow px-4 py-3 font-medium whitespace-nowrap print:px-2 print:py-1 ${i > 0 && i < 4 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {gaps.map((y) => {
                  const percent = Math.round((y.owned / y.total) * 100)
                  return (
                    <tr key={y.year}>
                      <td className="px-4 py-2 print:px-2 print:py-1">
                        <a
                          href={`#rok-${y.year}`}
                          onClick={(e) => {
                            e.preventDefault()
                            document.getElementById(`rok-${y.year}`)?.scrollIntoView({ behavior: 'smooth' })
                          }}
                          className="font-mono font-medium text-navy-700 hover:underline print:text-ink print:no-underline"
                        >
                          {y.year}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-right font-mono print:px-2 print:py-1">{y.total}</td>
                      <td className="px-4 py-2 text-right font-mono print:px-2 print:py-1">{y.owned}</td>
                      <td className="px-4 py-2 text-right font-mono font-medium print:px-2 print:py-1">
                        {y.total - y.owned}
                      </td>
                      <td className="px-4 py-2 print:px-2 print:py-1">
                        <div className="flex items-center gap-3">
                          <div className="h-1 w-24 overflow-hidden rounded-full bg-paper-200 print:hidden">
                            <div className="h-full rounded-full bg-gold-400" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="font-mono text-xs text-subtle print:text-ink">{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          {gaps.map((y) => (
            <section key={y.year} id={`rok-${y.year}`} className="scroll-mt-24 space-y-6 print:space-y-3">
              <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-navy-700 pb-2 print:border-ink">
                <h2 className="font-serif text-2xl print:text-xl print:text-ink">Rocznik {y.year}</h2>
                <span className="text-sm text-subtle print:text-ink">
                  masz {y.owned} z {y.total}
                </span>
                {y.issues.length === 0 ? (
                  <span className="ml-auto">
                    <Pill tone="gold">
                      <CircleCheck size={12} />{' '}
                      {mode === 'rozpoczete' && y.owned < y.total ? 'rozpoczęte emisje skompletowane' : 'komplet'}
                    </Pill>
                  </span>
                ) : (
                  <Link
                    to={`/rocznik/${y.year}`}
                    className="ml-auto text-sm text-navy-700 hover:underline print:hidden"
                  >
                    Otwórz rocznik
                  </Link>
                )}
              </header>

              {y.issues.map((g) => (
                <div key={g.issue.key} className="break-inside-avoid space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                    {g.issue.date && (
                      <span className="font-mono text-xs text-subtle print:text-ink">{formatDate(g.issue.date)}</span>
                    )}
                    <span className="font-medium text-ink">{g.issue.title}</span>
                    <span className="text-xs text-subtle print:text-ink">
                      masz {g.owned} z {g.issue.stamps.length}
                    </span>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-line print:divide-paper-300">
                      {g.missing.map((s) => (
                        <tr key={s.id}>
                          <td className="w-12 py-1 pr-3 print:w-6">
                            <span className="hidden h-4 w-4 border border-ink print:block" aria-hidden />
                            <StampThumb
                              src={s.primary_thumb_path ? urls[s.primary_thumb_path] : null}
                              alt=""
                              className="w-8 print:hidden"
                            />
                          </td>
                          <td className="w-24 py-1 pr-3 font-mono text-xs whitespace-nowrap text-muted print:text-ink">
                            {s.catalog_number}
                          </td>
                          <td className="py-1 pr-3">
                            <Link to={`/znaczek/${s.id}`} className="hover:text-navy-700 print:text-ink">
                              {withoutIssueTitle(s.name, g.issue.title)}
                            </Link>
                          </td>
                          <td className="w-28 py-1 text-right font-mono text-xs whitespace-nowrap text-muted print:text-ink">
                            {nominalLabel(s)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
