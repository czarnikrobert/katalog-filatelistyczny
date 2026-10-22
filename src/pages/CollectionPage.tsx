import { Library, MapPin, Plus, Stamp, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { StampThumb } from '../components/StampThumb'
import { EmptyState, PageHeader, Pill, Skeleton } from '../components/ui'
import { fetchAll } from '../lib/fetchAll'
import { formatMoney, plural } from '../lib/format'
import { cancellationLabels, collectionStatusLabels, conditionLabels } from '../lib/labels'
import { supabase } from '../lib/supabase'
import type { CollectionStatus, Specimen } from '../lib/types'
import { useSignedUrls } from '../lib/useSignedUrls'

type Row = Specimen & {
  stamps: {
    name: string
    catalog_number: string | null
    issue_year: number | null
    stamp_images: { thumb_path: string | null; storage_path: string; is_primary: boolean }[]
  } | null
  storage_locations: { album_name: string; page_number: number | null; pocket_number: number | null } | null
}

const statusFilters: { value: CollectionStatus | ''; label: string }[] = [
  { value: '', label: 'Wszystkie' },
  { value: 'w_kolekcji', label: 'W kolekcji' },
  { value: 'na_wymiane', label: 'Na wymianę' },
  { value: 'na_sprzedaz', label: 'Na sprzedaż' },
]

const thumbOf = (r: Row) => {
  const images = r.stamps?.stamp_images ?? []
  const img = images.find((i) => i.is_primary) ?? images[0]
  return img ? (img.thumb_path ?? img.storage_path) : null
}

const locationOf = (r: Row) => {
  const l = r.storage_locations
  if (!l) return null
  return [l.album_name, l.page_number != null && `s. ${l.page_number}`, l.pocket_number != null && `k. ${l.pocket_number}`]
    .filter(Boolean)
    .join(', ')
}

export function CollectionPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as CollectionStatus | null) ?? ''
  const album = params.get('klaser') ?? ''
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchAll<Row>((from, to) =>
      supabase!
        .from('specimens')
        .select(
          '*, stamps(name, catalog_number, issue_year, stamp_images(thumb_path, storage_path, is_primary)), storage_locations(album_name, page_number, pocket_number)',
        )
        .order('inventory_number')
        .range(from, to),
    )
      .then(setRows)
      .catch(() => setError(true))
  }, [])

  const visible = (rows ?? []).filter(
    (r) => (!status || r.collection_status === status) && (!album || r.storage_locations?.album_name === album),
  )
  const urls = useSignedUrls(visible.slice(0, 200).map(thumbOf))
  const value = visible.reduce((sum, r) => sum + ((r.estimated_value_currency ?? 'PLN') === 'PLN' ? (r.estimated_value ?? 0) : 0), 0)

  const setFilter = (key: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(key, v)
    else next.delete(key)
    setParams(next)
  }

  return (
    <>
      <PageHeader
        eyebrow="Moja kolekcja"
        title="Egzemplarze"
        description={
          rows && rows.length > 0
            ? `${plural(visible.length, 'egzemplarz', 'egzemplarze', 'egzemplarzy')} · szacunkowo ${formatMoney(value, 'PLN')}`
            : 'Każdy fizyczny znaczek, który masz — ze stanem, wyceną i miejscem w klaserze.'
        }
      />

      {error ? (
        <EmptyState icon={Stamp} title="Nie udało się wczytać kolekcji">
          Sprawdź połączenie z internetem i odśwież stronę.
        </EmptyState>
      ) : rows === null ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Stamp}
          title="Kolekcja jest jeszcze pusta"
          action={
            <Link to="/dodaj" className="btn btn-primary">
              <Plus size={16} /> Dodaj znaczek
            </Link>
          }
        >
          Dodaj znaczek do katalogu i zaznacz „Mam ten znaczek” — egzemplarz pojawi się tutaj.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex flex-wrap rounded-lg bg-paper-200/60 p-1" role="radiogroup" aria-label="Status">
              {statusFilters.map((f) => (
                <button
                  key={f.value}
                  role="radio"
                  aria-checked={status === f.value}
                  onClick={() => setFilter('status', f.value)}
                  className={`rounded-lg px-3 py-1 text-sm font-medium transition duration-300 ease-out-expo ${
                    status === f.value ? 'bg-card text-navy-700 shadow-e1' : 'text-muted hover:text-navy-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {album && (
              <button onClick={() => setFilter('klaser', '')} className="inline-flex" aria-label="Usuń filtr klasera">
                <Pill tone="gold">
                  <Library size={12} /> {album} <X size={12} />
                </Pill>
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={Stamp} title="Brak egzemplarzy z tym filtrem" />
          ) : (
            <>
              <ul className="space-y-3 md:hidden">
                {visible.map((r) => (
                  <li key={r.id}>
                    <Link to={`/znaczek/${r.stamp_id}`} className="card flex items-center gap-4 p-3">
                      <StampThumb src={urls[thumbOf(r) ?? '']} alt="" className="w-12 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="truncate text-sm font-medium">{r.stamps?.name}</div>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
                          <span className="font-mono">{r.inventory_number}</span>
                          {r.cancellation_type && <span>{cancellationLabels[r.cancellation_type]}</span>}
                          {locationOf(r) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} /> {locationOf(r)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-muted">{formatMoney(r.estimated_value, r.estimated_value_currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="card hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      {['', 'Nr własny', 'Znaczek', 'Kasowanie', 'Stan', 'Miejsce', 'Wartość', 'Status'].map((h, i) => (
                        <th key={i} className={`eyebrow px-4 py-3 font-medium whitespace-nowrap ${i === 6 ? 'text-right' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/znaczek/${r.stamp_id}`)}
                        className="cursor-pointer transition duration-300 ease-out-expo hover:bg-paper-100"
                      >
                        <td className="w-16 py-2 pl-4">
                          <StampThumb src={urls[thumbOf(r) ?? '']} alt="" className="w-8" />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-navy-700">{r.inventory_number ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.stamps?.name}</div>
                          <div className="text-xs text-subtle">
                            {[r.stamps?.catalog_number, r.stamps?.issue_year].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{r.cancellation_type ? cancellationLabels[r.cancellation_type] : '—'}</td>
                        <td className="px-4 py-3 text-muted">{r.condition ? conditionLabels[r.condition] : '—'}</td>
                        <td className="px-4 py-3 text-muted">{locationOf(r) ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                          {formatMoney(r.estimated_value, r.estimated_value_currency) ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone={r.collection_status === 'w_kolekcji' ? 'neutral' : 'gold'}>
                            {collectionStatusLabels[r.collection_status]}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
