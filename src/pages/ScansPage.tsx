import { CircleAlert, CircleCheck, FolderOpen, ImagePlus, LoaderCircle, RotateCcw, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState, Notice, PageHeader, Pill, Skeleton } from '../components/ui'
import { fetchAll } from '../lib/fetchAll'
import { plural } from '../lib/format'
import { deleteImages, uploadStampImage, validateImageFile } from '../lib/images'
import { imageTypeLabels } from '../lib/labels'
import { normalizeCatalogNumber, parseScanName } from '../lib/scans'
import { IMAGES_BUCKET, supabase } from '../lib/supabase'
import type { ImageType, StampImage } from '../lib/types'

type Target = 'katalog' | 'egzemplarz'
type Status = 'gotowy' | 'brak-numeru' | 'zla-nazwa' | 'niejednoznaczny' | 'format' | 'duplikat' | 'bez-egzemplarza'

interface StampLite {
  id: string
  catalog_number: string
  name: string
  issue_year: number | null
}

interface Row {
  key: string
  file: File
  preview: string | null
  status: Status
  note?: string
  stamp?: StampLite
  imageType?: ImageType
  specimen?: { id: string; inventory_number: string | null }
  result?: 'wgrany' | 'blad'
  error?: string
}

const statusLabels: Record<Status, string> = {
  gotowy: 'Gotowy',
  'brak-numeru': 'Brak numeru w katalogu',
  'zla-nazwa': 'Nazwa nie zaczyna się od numeru',
  niejednoznaczny: 'Numer występuje kilka razy',
  format: 'Nieobsługiwany plik',
  duplikat: 'Drugi awers tego znaczka',
  'bez-egzemplarza': 'Nie masz egzemplarza',
}

// Stare grafiki z kzp.pl mają ~100 px — przy nowym awersie usuwamy tylko takie małe zdjęcia katalogowe.
const SMALL_IMAGE_PX = 400

function naturalSize(url: string) {
  return new Promise<number>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(Math.max(img.naturalWidth, img.naturalHeight))
    img.onerror = () => resolve(Infinity)
    img.src = url
  })
}

async function removeSmallCatalogImages(stampId: string, before: string) {
  const db = supabase!
  const { data } = await db
    .from('stamp_images')
    .select('*')
    .eq('stamp_id', stampId)
    .is('specimen_id', null)
    .lt('created_at', before)
  const old = (data as StampImage[]) ?? []
  if (old.length === 0) return
  const { data: signed } = await db.storage.from(IMAGES_BUCKET).createSignedUrls(old.map((i) => i.storage_path), 120)
  const small: StampImage[] = []
  for (const [i, img] of old.entries()) {
    const url = signed?.[i]?.signedUrl
    if (url && (await naturalSize(url)) < SMALL_IMAGE_PX) small.push(img)
  }
  await deleteImages(small)
}

// Hurtowe wgrywanie skanów nazwanych numerem Fischera (np. „1841.jpg”, „1841_r.jpg”).
export function ScansPage() {
  const [stamps, setStamps] = useState<StampLite[] | null>(null)
  const [specimens, setSpecimens] = useState<Map<string, { id: string; inventory_number: string | null }[]>>(new Map())
  const [rows, setRows] = useState<Row[]>([])
  const [target, setTarget] = useState<Target>('katalog')
  const [replaceSmall, setReplaceSmall] = useState(true)
  const [filter, setFilter] = useState<'wszystkie' | 'gotowe' | 'problemy'>('wszystkie')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [finished, setFinished] = useState(false)
  const [dragging, setDragging] = useState(false)
  const filesRef = useRef<File[]>([])

  useEffect(() => {
    const db = supabase!
    Promise.all([
      fetchAll<StampLite>((a, b) => db.from('stamps').select('id, catalog_number, name, issue_year').range(a, b)),
      fetchAll<{ id: string; stamp_id: string; inventory_number: string | null }>((a, b) =>
        db.from('specimens').select('id, stamp_id, inventory_number').order('inventory_number').range(a, b),
      ),
    ]).then(([s, sp]) => {
      setStamps(s)
      const map = new Map<string, { id: string; inventory_number: string | null }[]>()
      for (const x of sp) map.set(x.stamp_id, [...(map.get(x.stamp_id) ?? []), x])
      setSpecimens(map)
    })
  }, [])

  // Podgląd zdjęć zwalniamy przy zmianie partii i wyjściu ze strony.
  const previews = useRef<string[]>([])
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), [])

  // Ostrzeżenie przed zamknięciem karty w trakcie wgrywania.
  useEffect(() => {
    if (!busy) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const analyse = (files: File[], forTarget: Target) => {
    if (!stamps) return
    previews.current.forEach((u) => URL.revokeObjectURL(u))
    previews.current = []
    const index = new Map<string, StampLite[]>()
    for (const s of stamps) {
      const k = normalizeCatalogNumber(s.catalog_number ?? '')
      index.set(k, [...(index.get(k) ?? []), s])
    }
    const seenAwers = new Set<string>()
    const next: Row[] = files
      .filter((f) => !f.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true }))
      .map((file, i) => {
        const key = `${i}-${file.name}`
        const formatError = validateImageFile(file)
        if (formatError) {
          const tiff = /tiff?$/i.test(file.name)
          return { key, file, preview: null, status: 'format', note: tiff ? 'TIFF — zapisz skan jako JPEG' : formatError }
        }
        const preview = URL.createObjectURL(file)
        previews.current.push(preview)
        const options = parseScanName(file.name)
        if (options.length === 0) return { key, file, preview, status: 'zla-nazwa' }
        const chosen = options.find((o) => index.has(normalizeCatalogNumber(o.number)))
        if (!chosen) return { key, file, preview, status: 'brak-numeru', note: `nr ${options[options.length - 1].number}` }
        const found = index.get(normalizeCatalogNumber(chosen.number))!
        if (found.length > 1) {
          return { key, file, preview, status: 'niejednoznaczny', note: found.map((s) => s.name).join(' / ') }
        }
        const stamp = found[0]
        const row: Row = { key, file, preview, status: 'gotowy', stamp, imageType: chosen.imageType }
        if (forTarget === 'egzemplarz') {
          const owned = specimens.get(stamp.id)
          if (!owned?.length) return { ...row, status: 'bez-egzemplarza' }
          row.specimen = owned[0]
          if (owned.length > 1) row.note = `masz ${owned.length} egzemplarze — skan trafi do ${owned[0].inventory_number}`
        }
        if (chosen.imageType === 'awers') {
          if (seenAwers.has(stamp.id)) return { ...row, status: 'duplikat' }
          seenAwers.add(stamp.id)
        }
        return row
      })
    setRows(next)
    setFinished(false)
    setProgress(0)
    setFilter('wszystkie')
  }

  const pickFiles = (list: FileList | null) => {
    if (!list) return
    filesRef.current = [...list]
    analyse(filesRef.current, target)
  }

  const changeTarget = (t: Target) => {
    setTarget(t)
    if (filesRef.current.length) analyse(filesRef.current, t)
  }

  const reset = () => {
    previews.current.forEach((u) => URL.revokeObjectURL(u))
    previews.current = []
    filesRef.current = []
    setRows([])
    setFinished(false)
    setProgress(0)
  }

  const upload = async () => {
    const queue = rows.filter((r) => r.status === 'gotowy' && !r.result)
    if (queue.length === 0) return
    setBusy(true)
    setProgress(0)
    const batchStart = new Date().toISOString()
    const results = new Map<string, Pick<Row, 'result' | 'error'>>()
    let done = 0
    const worker = async () => {
      while (queue.length) {
        const row = queue.shift()!
        try {
          if (target === 'katalog') {
            await uploadStampImage({ file: row.file, stampId: row.stamp!.id, imageType: row.imageType!, isPrimary: row.imageType === 'awers' })
            if (row.imageType === 'awers' && replaceSmall) await removeSmallCatalogImages(row.stamp!.id, batchStart)
          } else {
            await uploadStampImage({
              file: row.file,
              stampId: row.stamp!.id,
              specimenId: row.specimen!.id,
              imageType: row.imageType!,
              isPrimary: false,
            })
          }
          results.set(row.key, { result: 'wgrany' })
        } catch (e) {
          results.set(row.key, { result: 'blad', error: e instanceof Error ? e.message : 'nieznany błąd' })
        }
        done++
        setProgress(done)
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setRows((list) => list.map((r) => (results.has(r.key) ? { ...r, ...results.get(r.key) } : r)))
    setBusy(false)
    setFinished(true)
  }

  const ready = rows.filter((r) => r.status === 'gotowy')
  const problems = rows.filter((r) => r.status !== 'gotowy')
  const uploaded = rows.filter((r) => r.result === 'wgrany').length
  const failed = rows.filter((r) => r.result === 'blad').length
  const visible = filter === 'gotowe' ? ready : filter === 'problemy' ? problems : rows

  return (
    <>
      <PageHeader
        eyebrow="Moja kolekcja"
        title="Wgraj skany"
        description="Wybierz folder ze skanami nazwanymi numerem Fischera. Przed wgraniem zobaczysz, który plik trafi do którego znaczka."
        actions={
          rows.length > 0 && (
            <button className="btn btn-ghost" onClick={reset} disabled={busy}>
              <RotateCcw size={16} /> Nowa partia
            </button>
          )
        }
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card space-y-4 p-6">
          <h2 className="font-serif text-lg">Jak nazwać pliki</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {[
                ['1841.jpg', 'awers znaczka nr 1841'],
                ['1841_r.jpg', 'rewers (dopisek „_r” lub „_rewers”)'],
                ['1841_d.jpg', 'detal (każdy inny dopisek, np. „_2”, „_stempel”)'],
                ['347-a.jpg · 420A.jpg · 2580 I.jpg', 'odmiany — tak jak numer w katalogu'],
              ].map(([name, what]) => (
                <tr key={name}>
                  <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap text-navy-700">{name}</td>
                  <td className="py-2 text-muted">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs leading-relaxed text-subtle">
            Formaty: JPEG, PNG lub WebP, do 20 MB na plik. Skany w TIFF zapisz najpierw jako JPEG. Wystarczy 600 dpi.
          </p>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="font-serif text-lg">Gdzie zapisać skany</h2>
          {(
            [
              ['katalog', 'Zdjęcie w katalogu', 'Widoczne dla wszystkich. Awers zostaje zdjęciem głównym znaczka.'],
              ['egzemplarz', 'Skan mojego egzemplarza', 'Prywatny, przy Twoim egzemplarzu (np. ze stemplem). Tylko dla znaczków, które masz.'],
            ] as const
          ).map(([value, title, hint]) => (
            <label
              key={value}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition duration-300 ease-out-expo ${
                target === value ? 'border-navy-500 bg-navy-50' : 'border-line hover:border-paper-400'
              }`}
            >
              <input
                type="radio"
                name="target"
                className="mt-1 accent-navy-700"
                checked={target === value}
                onChange={() => changeTarget(value)}
                disabled={busy}
              />
              <span>
                <span className="block font-medium">{title}</span>
                <span className="text-muted">{hint}</span>
              </span>
            </label>
          ))}
          {target === 'katalog' && (
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 accent-navy-700"
                checked={replaceSmall}
                onChange={(e) => setReplaceSmall(e.target.checked)}
                disabled={busy}
              />
              <span>
                Usuń małe grafiki z kzp.pl, gdy wgrywam awers
                <span className="block text-xs text-subtle">Tylko zdjęcia mniejsze niż {SMALL_IMAGE_PX} px — większych nie ruszam.</span>
              </span>
            </label>
          )}
        </section>
      </div>

      {stamps === null ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pickFiles(e.dataTransfer.files)
          }}
          className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-16 text-center transition duration-300 ease-out-expo ${
            dragging ? 'border-navy-400 bg-navy-50' : 'border-paper-300 bg-paper-50'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <ImagePlus size={24} />
          </span>
          <p className="text-sm text-muted">Przeciągnij tu pliki skanów albo wybierz:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <label className="btn btn-primary cursor-pointer">
              <FolderOpen size={16} /> Wybierz folder
              <input
                type="file"
                className="sr-only"
                multiple
                {...{ webkitdirectory: '' }}
                onChange={(e) => {
                  pickFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            <label className="btn btn-secondary cursor-pointer">
              <ImagePlus size={16} /> Wybierz pliki
              <input
                type="file"
                className="sr-only"
                multiple
                accept="image/jpeg,image/png,image/webp,image/tiff"
                onChange={(e) => {
                  pickFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {finished ? (
            <Notice tone={failed ? 'warning' : 'success'}>
              Wgrano {plural(uploaded, 'skan', 'skany', 'skanów')}
              {failed > 0 && `, nie udało się: ${failed} (szczegóły w tabeli)`}.{' '}
              <Link to="/katalog" className="underline underline-offset-2">
                Zobacz katalog
              </Link>
            </Notice>
          ) : (
            <div className="card flex flex-wrap items-center gap-4 p-4">
              <span className="text-sm">
                Gotowe do wgrania: <strong>{ready.length}</strong>
                {problems.length > 0 && (
                  <>
                    {' · '}
                    <span className="text-amber-800">do sprawdzenia: {problems.length}</span>
                  </>
                )}
              </span>
              {busy && (
                <div className="flex min-w-48 flex-1 items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-200">
                    <div className="h-full rounded-full bg-gold-400 transition-[width] duration-300" style={{ width: `${(progress / ready.length) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs">
                    {progress}/{ready.length}
                  </span>
                </div>
              )}
              <button className="btn btn-primary ml-auto" onClick={upload} disabled={busy || ready.length === 0}>
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
                {busy ? 'Wgrywanie…' : `Wgraj ${ready.length}`}
              </button>
            </div>
          )}

          <div className="inline-flex rounded-lg bg-paper-200/60 p-1" role="radiogroup" aria-label="Filtr">
            {(
              [
                ['wszystkie', `Wszystkie (${rows.length})`],
                ['gotowe', `Gotowe (${ready.length})`],
                ['problemy', `Do sprawdzenia (${problems.length})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="radio"
                aria-checked={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition duration-300 ease-out-expo ${
                  filter === value ? 'bg-card text-navy-700 shadow-e1' : 'text-muted hover:text-navy-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Nic tu nie ma" />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {['', 'Plik', 'Znaczek', 'Rodzaj', 'Stan'].map((h, i) => (
                      <th key={i} className="eyebrow px-4 py-3 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((r) => (
                    <tr key={r.key}>
                      <td className="w-16 py-2 pl-4">
                        {r.preview ? (
                          <img src={r.preview} alt="" loading="lazy" className="h-12 w-12 rounded object-contain" />
                        ) : (
                          <span className="block h-12 w-12 rounded bg-paper-100" />
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs break-all">{r.file.name}</td>
                      <td className="px-4 py-2">
                        {r.stamp ? (
                          <>
                            <Link to={`/znaczek/${r.stamp.id}`} className="font-medium hover:text-navy-700">
                              {r.stamp.catalog_number}
                            </Link>{' '}
                            <span className="text-muted">{r.stamp.name}</span>
                            {r.specimen && <div className="text-xs text-subtle">egzemplarz {r.specimen.inventory_number}</div>}
                          </>
                        ) : (
                          <span className="text-subtle">{r.note ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.imageType ? imageTypeLabels[r.imageType] : '—'}</td>
                      <td className="px-4 py-2">
                        {r.result === 'wgrany' ? (
                          <Pill tone="navy">
                            <CircleCheck size={12} /> Wgrany
                          </Pill>
                        ) : r.result === 'blad' ? (
                          <span className="text-xs text-danger">Błąd: {r.error}</span>
                        ) : r.status === 'gotowy' ? (
                          <>
                            <Pill>Gotowy</Pill>
                            {r.note && <div className="mt-1 text-xs text-subtle">{r.note}</div>}
                          </>
                        ) : (
                          <span className="inline-flex items-start gap-1 text-xs text-amber-800">
                            <CircleAlert size={14} className="mt-px shrink-0" />
                            <span>
                              {statusLabels[r.status]}
                              {r.stamp && r.note && <span className="block text-subtle">{r.note}</span>}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
