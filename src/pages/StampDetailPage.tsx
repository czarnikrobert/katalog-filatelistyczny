import { ArrowRight, ChevronRight, MapPin, Pencil, Plus, Search, Stamp, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useAuth } from '../auth/context'
import { ImageGallery } from '../components/ImageGallery'
import { QuickImageDrop } from '../components/QuickImageDrop'
import { EmptyState, Notice, Pill, Skeleton } from '../components/ui'
import { formatDate, formatMoney, formatNumber } from '../lib/format'
import {
  cancellationLabels,
  collectionStatusLabels,
  conditionLabels,
  gumStatusLabels,
  stampTypeLabels,
  valuationSourceLabels,
} from '../lib/labels'
import { countWithoutImage, deleteStamp, findNextWithoutImage } from '../lib/stamps'
import { supabase } from '../lib/supabase'
import type { CatalogNumber, Specimen, StampImage, StampOverview, StorageLocation, Valuation } from '../lib/types'

type SpecimenRow = Specimen & { storage_locations: StorageLocation | null; valuations: Valuation[] }

interface Flash {
  flash?: string
  warning?: string
}

type Fact = [string, string | number | null | undefined]

function FactList({ title, facts }: { title: string; facts: Fact[] }) {
  const visible = facts.filter(([, v]) => v != null && v !== '')
  if (visible.length === 0) return null
  return (
    <div className="space-y-3">
      <h2 className="eyebrow">{title}</h2>
      <dl className="divide-y divide-line border-y border-line">
        {visible.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2 text-sm">
            <dt className="text-subtle">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,400px)_1fr]">
      <Skeleton className="aspect-[4/5] rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

// Klucz = id: przejście do innego znaczka (np. „Następny bez zdjęcia”) zaczyna kartę od czystego stanu.
export function StampDetailPage() {
  const { id } = useParams()
  return <StampDetail key={id} id={id!} />
}

function StampDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [notice, setNotice] = useState<Flash>(() => (location.state as Flash | null) ?? {})
  const [stamp, setStamp] = useState<StampOverview | null>(null)
  const [numbers, setNumbers] = useState<CatalogNumber[]>([])
  const [specimens, setSpecimens] = useState<SpecimenRow[]>([])
  const [images, setImages] = useState<StampImage[]>([])
  const [version, setVersion] = useState(0)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { session } = useAuth()
  // Gość widzi katalog; kolekcja, zdjęcia do dodania i edycja są tylko dla właściciela.
  const isOwner = Boolean(session)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [seeking, setSeeking] = useState(false)
  const [busy, setBusy] = useState(false)

  // Komunikat jest jednorazowy — czyścimy go z historii, żeby nie wracał po odświeżeniu.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    const db = supabase!
    Promise.all([
      db.from('stamp_overview').select('*').eq('id', id).maybeSingle(),
      db
        .from('stamp_catalog_numbers')
        .select('catalog_system, catalog_number')
        .eq('stamp_id', id)
        .order('catalog_system'),
      db
        .from('specimens')
        .select('*, storage_locations(*), valuations(*)')
        .eq('stamp_id', id)
        .order('inventory_number')
        .order('valuation_date', { referencedTable: 'valuations', ascending: false })
        .order('created_at', { referencedTable: 'valuations', ascending: false }),
      db.from('stamp_images').select('*').eq('stamp_id', id).order('created_at'),
    ]).then(([s, n, sp, img]) => {
      setStamp(s.data as StampOverview | null)
      setNumbers((n.data as CatalogNumber[]) ?? [])
      setSpecimens((sp.data as SpecimenRow[]) ?? [])
      setImages((img.data as StampImage[]) ?? [])
      setLoadedId(id)
    })
  }, [id, version])

  useEffect(() => {
    if (isOwner) countWithoutImage().then(setRemaining)
  }, [version, isOwner])

  const goToNextWithoutImage = async () => {
    setSeeking(true)
    try {
      const next = await findNextWithoutImage(id)
      if (next) navigate(`/znaczek/${next}`)
      else setNotice({ flash: 'Wszystkie znaczki w katalogu mają już zdjęcia.' })
    } catch {
      setNotice({ warning: 'Nie udało się znaleźć następnego znaczka. Spróbuj ponownie.' })
    } finally {
      setSeeking(false)
    }
  }

  const remove = async () => {
    if (!stamp) return
    setBusy(true)
    try {
      await deleteStamp(stamp.id)
      navigate('/katalog', { replace: true })
    } catch (err) {
      setNotice({ warning: `Nie udało się usunąć: ${err instanceof Error ? err.message : 'nieznany błąd'}` })
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  if (loadedId !== id) return <DetailSkeleton />
  if (!stamp) {
    return (
      <EmptyState
        icon={Search}
        title="Nie znaleziono znaczka"
        action={
          <Link to="/katalog" className="btn btn-secondary">
            Wróć do katalogu
          </Link>
        }
      >
        Pozycja mogła zostać usunięta albo link jest nieprawidłowy.
      </EmptyState>
    )
  }

  const issueFacts: Fact[] = [
    ['Data emisji', formatDate(stamp.issue_date) ?? stamp.issue_year],
    ['Rodzaj', stamp.stamp_type && stampTypeLabels[stamp.stamp_type]],
    ['Seria', stamp.series_name],
    ['Tematyka', stamp.theme_name],
    ['Projektant', stamp.designer],
    ['Nakład', stamp.print_run?.toLocaleString('pl-PL')],
  ]
  const paramFacts: Fact[] = [
    ['Nominał', formatMoney(stamp.face_value, stamp.currency)],
    ['Kolor', stamp.color],
    ['Ząbkowanie', stamp.perforation],
    [
      'Wymiary',
      stamp.width_mm && stamp.height_mm
        ? `${formatNumber(stamp.width_mm)} × ${formatNumber(stamp.height_mm)} mm`
        : null,
    ],
    ['Technika druku', stamp.printing_method],
    ['Znak wodny', stamp.watermark],
  ]
  const allNumbers = [
    ...(stamp.catalog_number
      ? [{ catalog_system: stamp.catalog_system ?? 'Nr', catalog_number: stamp.catalog_number }]
      : []),
    ...numbers,
  ]

  return (
    <>
      <nav className="mb-8 flex flex-wrap items-center gap-4" aria-label="Okruszki">
        <ol className="mr-auto flex items-center gap-2 text-sm text-subtle">
          <li>
            <Link to="/katalog" className="hover:text-navy-700">
              Katalog
            </Link>
          </li>
          <ChevronRight size={14} />
          <li>
            <Link to={`/katalog?kraj=${stamp.country_id}`} className="hover:text-navy-700">
              {stamp.country_name}
            </Link>
          </li>
          {stamp.issue_year && (
            <>
              <ChevronRight size={14} />
              <li>
                <Link to={`/rocznik/${stamp.issue_year}`} className="hover:text-navy-700">
                  Rocznik {stamp.issue_year}
                </Link>
              </li>
            </>
          )}
        </ol>
        {isOwner && (
          <>
            <button
              onClick={goToNextWithoutImage}
              disabled={seeking || remaining === 0}
              className="btn btn-secondary"
              title="Przejdź do kolejnego znaczka w katalogu, który nie ma jeszcze zdjęcia"
            >
              {seeking ? 'Szukam…' : 'Następny bez zdjęcia'}
              {remaining !== null && (
                <span className="rounded-full bg-paper-200/60 px-2 py-1 font-mono text-xs leading-none text-muted">
                  {remaining}
                </span>
              )}
              <ArrowRight size={16} />
            </button>
            <Link to={`/znaczek/${stamp.id}/edytuj`} className="btn btn-secondary">
              <Pencil size={16} /> Edytuj
            </Link>
            <button onClick={() => setConfirmDelete(true)} className="btn btn-danger-link">
              <Trash2 size={16} /> Usuń
            </button>
          </>
        )}
      </nav>

      {(notice.flash || notice.warning) && (
        <div className="mb-8 space-y-3">
          {notice.flash && <Notice tone="success">{notice.flash}</Notice>}
          {notice.warning && <Notice tone="error">{notice.warning}</Notice>}
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className="animate-rise self-start rounded-xl bg-paper-200/40 px-6 py-12 lg:sticky lg:top-24">
          {isOwner ? (
            <QuickImageDrop
              stampId={stamp.id}
              images={images}
              onUploaded={() => setVersion((n) => n + 1)}
              onError={(m) => setNotice({ warning: m })}
            >
              <ImageGallery
                images={images}
                alt={stamp.name}
                caption={stamp.issue_year ? String(stamp.issue_year) : null}
                missing={stamp.owned_count === 0}
                onChanged={() => setVersion((n) => n + 1)}
                onError={(m) => setNotice({ warning: m })}
              />
            </QuickImageDrop>
          ) : (
            <ImageGallery
              images={images}
              alt={stamp.name}
              caption={stamp.issue_year ? String(stamp.issue_year) : null}
              readOnly
              onChanged={() => setVersion((n) => n + 1)}
              onError={(m) => setNotice({ warning: m })}
            />
          )}
        </div>

        <div className="animate-rise space-y-12 [animation-delay:80ms]">
          <header className="space-y-4">
            <div className="eyebrow">{[stamp.country_name, stamp.issue_year].filter(Boolean).join(' · ')}</div>
            <h1 className="font-serif text-3xl leading-tight tracking-tight md:text-5xl">{stamp.name}</h1>
            <div className="flex flex-wrap gap-2">
              {isOwner &&
                (stamp.owned_count > 0 ? (
                  <Pill tone="navy">
                    <Stamp size={12} /> W kolekcji ×{stamp.owned_count}
                  </Pill>
                ) : (
                  <Pill tone="gold">Brakuje w kolekcji</Pill>
                ))}
              {allNumbers.map((n) => (
                <Pill key={n.catalog_system}>
                  <span className="text-subtle">{n.catalog_system}</span>
                  <span className="font-mono">{n.catalog_number}</span>
                </Pill>
              ))}
            </div>
            {stamp.description && (
              <p className="max-w-[65ch] text-base leading-relaxed whitespace-pre-line text-muted">
                {stamp.description}
              </p>
            )}
          </header>

          <div className="grid gap-8 md:grid-cols-2">
            <FactList title="Emisja" facts={issueFacts} />
            <FactList title="Parametry" facts={paramFacts} />
          </div>

          {isOwner && (
            <section className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="mr-auto font-serif text-2xl">
                  Moje egzemplarze <span className="text-subtle">({specimens.length})</span>
                </h2>
                <Link to={`/znaczek/${stamp.id}/egzemplarz/nowy`} className="btn btn-primary">
                  <Plus size={16} /> Dodaj egzemplarz
                </Link>
              </div>

              {specimens.length === 0 ? (
                <EmptyState icon={Stamp} title="Tego znaczka jeszcze nie masz">
                  Pozycja figuruje na liście brakujących. Gdy zdobędziesz egzemplarz, dodaj go tutaj — razem ze stanem,
                  ceną i miejscem w klaserze.
                </EmptyState>
              ) : (
                <div className="space-y-4">
                  {specimens.map((sp) => {
                    const loc = sp.storage_locations
                    const traits = [
                      sp.cancellation_type && cancellationLabels[sp.cancellation_type],
                      sp.condition && `stan ${conditionLabels[sp.condition].toLowerCase()}`,
                      sp.gum_status && gumStatusLabels[sp.gum_status].toLowerCase(),
                    ].filter(Boolean)
                    return (
                      <article key={sp.id} className="card space-y-4 p-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm font-medium text-navy-700">
                            {sp.inventory_number ?? 'bez numeru'}
                          </span>
                          <Pill tone={sp.collection_status === 'w_kolekcji' ? 'neutral' : 'gold'}>
                            {collectionStatusLabels[sp.collection_status]}
                          </Pill>
                          <Link
                            to={`/znaczek/${stamp.id}/egzemplarz/${sp.id}`}
                            className="btn btn-ghost ml-auto px-2 py-1 text-sm"
                          >
                            <Pencil size={14} /> Edytuj
                          </Link>
                        </div>
                        {traits.length > 0 && <p className="text-sm text-ink">{traits.join(' · ')}</p>}
                        <dl className="grid gap-4 text-sm sm:grid-cols-3">
                          <div className="space-y-1">
                            <dt className="text-xs text-subtle">Zakup</dt>
                            <dd className="font-mono">{formatMoney(sp.purchase_price, sp.purchase_currency) ?? '—'}</dd>
                            {sp.purchase_date && (
                              <dd className="text-xs text-subtle">{formatDate(sp.purchase_date)}</dd>
                            )}
                          </div>
                          <div className="space-y-1">
                            <dt className="text-xs text-subtle">Wartość</dt>
                            <dd className="font-mono">
                              {formatMoney(sp.estimated_value, sp.estimated_value_currency) ?? '—'}
                            </dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-xs text-subtle">Miejsce</dt>
                            <dd className="flex items-start gap-1">
                              {loc ? (
                                <>
                                  <MapPin size={14} className="mt-1 shrink-0 text-gold-500" />
                                  <span>
                                    {loc.album_name}
                                    {loc.page_number != null && `, s. ${loc.page_number}`}
                                    {loc.pocket_number != null && `, kiesz. ${loc.pocket_number}`}
                                  </span>
                                </>
                              ) : (
                                '—'
                              )}
                            </dd>
                          </div>
                        </dl>
                        {sp.notes && (
                          <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{sp.notes}</p>
                        )}
                        {sp.valuations.length > 0 && (
                          <details className="group border-t border-line pt-4 text-sm">
                            <summary className="flex cursor-pointer list-none items-center gap-1 text-muted hover:text-navy-700">
                              <ChevronRight
                                size={14}
                                className="transition duration-300 ease-out-expo group-open:rotate-90"
                              />
                              Historia wycen ({sp.valuations.length})
                            </summary>
                            <ol className="mt-3 space-y-2 pl-4">
                              {sp.valuations.map((v) => (
                                <li key={v.id} className="flex flex-wrap gap-x-4">
                                  <span className="w-24 text-subtle">{formatDate(v.valuation_date)}</span>
                                  <span className="font-mono">{formatMoney(v.amount, v.currency)}</span>
                                  {v.source && <span className="text-subtle">{valuationSourceLabels[v.source]}</span>}
                                </li>
                              ))}
                            </ol>
                          </details>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Usunąć „${stamp.name}”?`}
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      >
        Pozycja zniknie z katalogu razem ze zdjęciami.
        {specimens.length > 0 && ` Usunięte zostaną też egzemplarze (${specimens.length}) i ich historia wycen.`} Tej
        operacji nie można cofnąć.
      </ConfirmDialog>
    </>
  )
}
