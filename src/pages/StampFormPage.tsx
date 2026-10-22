import { Plus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Field, FieldGroup, FormActions, FormErrors, Section, SectionNav } from '../components/form'
import { ImageGallery } from '../components/ImageGallery'
import { ImagePicker, type PendingImage } from '../components/ImagePicker'
import { SpecimenFields } from '../components/SpecimenFields'
import { Notice, PageHeader, Skeleton } from '../components/ui'
import { uploadPending } from '../lib/images'
import { CATALOG_SYSTEMS, CURRENCIES, stampTypeLabels } from '../lib/labels'
import { parseDate, parseDecimal, parseInteger, parseMillimeters, textOrNull, Validator } from '../lib/parse'
import { emptySpecimenDraft, loadAlbumNames, saveSpecimen, validateSpecimen, type SpecimenDraft } from '../lib/specimens'
import { findOrCreateSeries } from '../lib/stamps'
import { supabase } from '../lib/supabase'
import type { CatalogNumber, Country, Stamp, StampImage, StampType } from '../lib/types'

interface Option {
  id: string
  name: string
}

const emptyStamp = {
  name: '',
  country_id: '',
  issue_year: '',
  issue_date: '',
  catalog_system: 'Fischer',
  catalog_number: '',
  series_name: '',
  theme_id: '',
  stamp_type: '' as StampType | '',
  face_value: '',
  currency: 'PLN',
  color: '',
  perforation: '',
  width_mm: '',
  height_mm: '',
  printing_method: '',
  watermark: '',
  designer: '',
  print_run: '',
  description: '',
}

type StampDraft = typeof emptyStamp

const asText = (v: number | string | null) => (v == null ? '' : String(v).replace('.', ','))

function stampToDraft(s: Stamp, seriesName: string | null): StampDraft {
  return {
    name: s.name,
    country_id: s.country_id,
    issue_year: asText(s.issue_year),
    issue_date: s.issue_date ?? '',
    catalog_system: s.catalog_system ?? 'Fischer',
    catalog_number: s.catalog_number ?? '',
    series_name: seriesName ?? '',
    theme_id: s.theme_id ?? '',
    stamp_type: s.stamp_type ?? '',
    face_value: asText(s.face_value),
    currency: s.currency ?? 'PLN',
    color: s.color ?? '',
    perforation: s.perforation ?? '',
    width_mm: asText(s.width_mm),
    height_mm: asText(s.height_mm),
    printing_method: s.printing_method ?? '',
    watermark: s.watermark ?? '',
    designer: s.designer ?? '',
    print_run: asText(s.print_run),
    description: s.description ?? '',
  }
}

export function StampFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [countries, setCountries] = useState<Country[]>([])
  const [themes, setThemes] = useState<Option[]>([])
  const [seriesNames, setSeriesNames] = useState<string[]>([])
  const [albums, setAlbums] = useState<string[]>([])
  const [form, setForm] = useState<StampDraft>(emptyStamp)
  const [extraNumbers, setExtraNumbers] = useState<CatalogNumber[]>([])
  const [newImages, setNewImages] = useState<PendingImage[]>([])
  const [existingImages, setExistingImages] = useState<StampImage[]>([])
  const [imagesVersion, setImagesVersion] = useState(0)
  const [addSpecimen, setAddSpecimen] = useState(true)
  const [specimen, setSpecimen] = useState<SpecimenDraft>(emptySpecimenDraft)
  const [duplicates, setDuplicates] = useState<Option[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const loaded = !isEdit || loadedId === id

  useEffect(() => {
    const db = supabase!
    db.from('countries').select('id, name, iso_code, period, sort_order').order('sort_order').order('name')
      .then(({ data }) => setCountries((data as Country[]) ?? []))
    db.from('themes').select('id, name').order('name').then(({ data }) => setThemes(data ?? []))
    loadAlbumNames().then(setAlbums)
  }, [])

  useEffect(() => {
    if (!id) return
    const db = supabase!
    Promise.all([
      db.from('stamps').select('*, series(name)').eq('id', id).single(),
      db.from('stamp_catalog_numbers').select('catalog_system, catalog_number').eq('stamp_id', id).order('catalog_system'),
    ]).then(([stamp, numbers]) => {
      if (stamp.data) {
        const row = stamp.data as Stamp & { series: { name: string } | null }
        setForm(stampToDraft(row, row.series?.name ?? null))
      }
      setExtraNumbers((numbers.data as CatalogNumber[]) ?? [])
      setLoadedId(id)
    })
  }, [id])

  useEffect(() => {
    if (!id) return
    supabase!
      .from('stamp_images')
      .select('*')
      .eq('stamp_id', id)
      .order('created_at')
      .then(({ data }) => setExistingImages((data as StampImage[]) ?? []))
  }, [id, imagesVersion])

  useEffect(() => {
    if (!form.country_id) return
    supabase!
      .from('series')
      .select('name')
      .eq('country_id', form.country_id)
      .order('name')
      .then(({ data }) => setSeriesNames((data ?? []).map((r) => r.name as string)))
  }, [form.country_id])

  // Ostrzeżenie o możliwych duplikatach — nie blokuje zapisu.
  const checkDuplicates = Boolean(form.country_id) && (Boolean(form.catalog_number) || form.name.trim().length >= 4)
  const visibleDuplicates = checkDuplicates ? duplicates : []

  useEffect(() => {
    if (!checkDuplicates) return
    const timer = setTimeout(() => {
      let q = supabase!.from('stamps').select('id, name').eq('country_id', form.country_id).limit(5)
      if (id) q = q.neq('id', id)
      q = form.catalog_number
        ? q.eq('catalog_number', form.catalog_number.trim())
        : q.ilike('name', `%${form.name.trim()}%`)
      q.then(({ data }) => setDuplicates(data ?? []))
    }, 400)
    return () => clearTimeout(timer)
  }, [checkDuplicates, id, form.country_id, form.catalog_number, form.name])

  const field = (key: keyof StampDraft) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = new Validator()
    const issueYear = v.take(parseInteger(form.issue_year, 'Rok emisji', 1840, 2100))
    const issueDate = v.take(parseDate(form.issue_date, 'Data emisji'))
    if (issueDate && issueYear !== null && Number(issueDate.slice(0, 4)) !== issueYear) {
      v.errors.push('Rok emisji nie zgadza się z datą emisji.')
    }
    const faceValue = v.take(parseDecimal(form.face_value, 'Nominał'))
    const widthMm = v.take(parseMillimeters(form.width_mm, 'Szerokość'))
    const heightMm = v.take(parseMillimeters(form.height_mm, 'Wysokość'))
    const printRun = v.take(parseInteger(form.print_run, 'Nakład', 1, 1e12))
    const numbers = extraNumbers
      .map((n) => ({ catalog_system: n.catalog_system.trim(), catalog_number: n.catalog_number.trim() }))
      .filter((n) => n.catalog_number)
    if (new Set(numbers.map((n) => n.catalog_system)).size !== numbers.length) {
      v.errors.push('Każdy dodatkowy katalog może wystąpić tylko raz.')
    }
    const parsedSpecimen = !isEdit && addSpecimen ? validateSpecimen(specimen, v) : null
    if (v.errors.length > 0) {
      setErrors(v.errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors([])
    setBusy(true)
    const db = supabase!
    let stampId = id ?? null
    try {
      const seriesName = form.series_name.trim()
      const payload = {
        name: form.name.trim(),
        country_id: form.country_id,
        issue_year: issueYear ?? (issueDate ? Number(issueDate.slice(0, 4)) : null),
        issue_date: issueDate,
        catalog_system: form.catalog_number.trim() ? form.catalog_system : null,
        catalog_number: textOrNull(form.catalog_number),
        series_id: seriesName ? await findOrCreateSeries(form.country_id, seriesName, issueYear) : null,
        theme_id: form.theme_id || null,
        stamp_type: form.stamp_type || null,
        face_value: faceValue,
        currency: faceValue === null ? null : form.currency,
        color: textOrNull(form.color),
        perforation: textOrNull(form.perforation),
        width_mm: widthMm,
        height_mm: heightMm,
        printing_method: textOrNull(form.printing_method),
        watermark: textOrNull(form.watermark),
        designer: textOrNull(form.designer),
        print_run: printRun,
        description: textOrNull(form.description),
      }
      const saved = id
        ? await db.from('stamps').update(payload).eq('id', id).select('id').single()
        : await db.from('stamps').insert(payload).select('id').single()
      if (saved.error) throw saved.error
      stampId = saved.data.id as string

      if (isEdit) await db.from('stamp_catalog_numbers').delete().eq('stamp_id', stampId)
      if (numbers.length > 0) {
        const res = await db.from('stamp_catalog_numbers').insert(numbers.map((n) => ({ ...n, stamp_id: stampId })))
        if (res.error) throw res.error
      }

      let specimenId: string | undefined
      if (parsedSpecimen) {
        const iso = countries.find((c) => c.id === form.country_id)?.iso_code ?? null
        specimenId = await saveSpecimen(stampId, specimen, parsedSpecimen, iso)
      }

      // Zdjęcia dodane razem z egzemplarzem to skany tego egzemplarza.
      const failed = await uploadPending(newImages, stampId, specimenId)
      navigate(`/znaczek/${stampId}`, {
        state: {
          flash: isEdit ? 'Zmiany zapisane.' : 'Znaczek dodany do katalogu.',
          warning: failed.length > 0 ? `Nie udało się zapisać zdjęć: ${failed.join(', ')}.` : undefined,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'nieznany błąd'
      if (stampId && !isEdit) {
        // Pozycja katalogowa już istnieje — przechodzimy do niej, żeby nie tworzyć duplikatu.
        navigate(`/znaczek/${stampId}`, {
          state: { warning: `Znaczek zapisany, ale nie wszystko się udało: ${message}` },
        })
        return
      }
      setErrors([`Nie udało się zapisać: ${message}`])
      setBusy(false)
    }
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const sections = [
    { id: 'dane', step: 'A', label: 'Dane podstawowe' },
    { id: 'parametry', step: 'B', label: 'Parametry' },
    { id: 'zdjecia', step: 'C', label: 'Zdjęcia' },
    ...(isEdit ? [] : [{ id: 'egzemplarz', step: 'D', label: 'Mój egzemplarz' }]),
  ]

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? 'Edycja' : 'Nowa pozycja'}
        title={isEdit ? form.name || 'Edycja znaczka' : 'Dodaj znaczek'}
        description={
          isEdit
            ? undefined
            : 'Wymagane są tylko nazwa i kraj — resztę możesz uzupełnić później.'
        }
      />
      <div className="grid gap-12 lg:grid-cols-[180px_minmax(0,1fr)]">
        <SectionNav items={sections} />
        <form onSubmit={submit} className="max-w-3xl space-y-6">
          <FormErrors errors={errors} />

          <Section id="dane" step="A" title="Dane podstawowe">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nazwa znaczka" wide>
                <input className="input" required placeholder="np. 1000-lecie Państwa Polskiego" {...field('name')} />
              </Field>
              <Field label="Kraj lub terytorium" wide>
                <select className="input" required {...field('country_id')}>
                  <option value="">Wybierz…</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.period ? ` (${c.period})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rok emisji">
                <input className="input" inputMode="numeric" placeholder="np. 1966" {...field('issue_year')} />
              </Field>
              <Field label="Dokładna data emisji">
                <input className="input" type="date" {...field('issue_date')} />
              </Field>
              <Field label="Numer katalogowy" wide>
                <div className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)] gap-2">
                  <select className="input" aria-label="System katalogowy" {...field('catalog_system')}>
                    {CATALOG_SYSTEMS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <input className="input font-mono" placeholder="np. 1523 lub Bl. 42" {...field('catalog_number')} />
                </div>
              </Field>
              <Field label="Seria lub emisja" hint="Wybierz z listy albo wpisz nową — zostanie utworzona.">
                <input className="input" list="series-list" {...field('series_name')} />
                <datalist id="series-list">
                  {seriesNames.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <Field label="Tematyka">
                <select className="input" {...field('theme_id')}>
                  <option value="">—</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rodzaj emisji">
                <select className="input" {...field('stamp_type')}>
                  <option value="">—</option>
                  {Object.entries(stampTypeLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-medium">Numery w innych katalogach</span>
              {extraNumbers.map((n, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)_auto] gap-2">
                  <select
                    className="input"
                    aria-label="System katalogowy"
                    value={n.catalog_system}
                    onChange={(e) =>
                      setExtraNumbers((list) => list.map((x, j) => (j === i ? { ...x, catalog_system: e.target.value } : x)))
                    }
                  >
                    {CATALOG_SYSTEMS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    className="input font-mono"
                    aria-label="Numer"
                    value={n.catalog_number}
                    onChange={(e) =>
                      setExtraNumbers((list) => list.map((x, j) => (j === i ? { ...x, catalog_number: e.target.value } : x)))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-ghost px-2"
                    aria-label="Usuń numer"
                    onClick={() => setExtraNumbers((list) => list.filter((_, j) => j !== i))}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost -ml-2 px-2 py-1"
                onClick={() => setExtraNumbers((list) => [...list, { catalog_system: 'Michel', catalog_number: '' }])}
              >
                <Plus size={16} /> Dodaj numer z innego katalogu
              </button>
            </div>

            {visibleDuplicates.length > 0 && (
              <Notice tone="warning">
                <p className="font-medium">Podobne pozycje już są w katalogu:</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {visibleDuplicates.map((d) => (
                    <li key={d.id}>
                      <Link to={`/znaczek/${d.id}`} className="underline underline-offset-2">
                        {d.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-1">Możesz mimo to zapisać nową pozycję, np. odmianę.</p>
              </Notice>
            )}
          </Section>

          <Section id="parametry" step="B" title="Parametry filatelistyczne" hint="Wszystkie pola opcjonalne.">
            <FieldGroup title="Wygląd">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nominał">
                  <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                    <input className="input font-mono" inputMode="decimal" placeholder="np. 0,60" {...field('face_value')} />
                    <input className="input" list="currency-list" aria-label="Waluta" {...field('currency')} />
                    <datalist id="currency-list">
                      {[...CURRENCIES, 'zł', 'gr', 'mk', 'fen'].map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </Field>
                <Field label="Kolor / odmiana barwna">
                  <input className="input" {...field('color')} />
                </Field>
                <Field label="Ząbkowanie">
                  <input className="input" placeholder="np. 11 ¼ : 11 ½, bez ząbków" {...field('perforation')} />
                </Field>
                <Field label="Wymiary (mm)">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input className="input font-mono" inputMode="decimal" placeholder="szer." aria-label="Szerokość w mm" {...field('width_mm')} />
                    <span className="text-subtle">×</span>
                    <input className="input font-mono" inputMode="decimal" placeholder="wys." aria-label="Wysokość w mm" {...field('height_mm')} />
                  </div>
                </Field>
              </div>
            </FieldGroup>
            <FieldGroup title="Druk">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Technika druku">
                  <input className="input" placeholder="np. rotograwiura, offset" {...field('printing_method')} />
                </Field>
                <Field label="Znak wodny">
                  <input className="input" {...field('watermark')} />
                </Field>
                <Field label="Projektant">
                  <input className="input" {...field('designer')} />
                </Field>
                <Field label="Nakład">
                  <input className="input font-mono" inputMode="numeric" {...field('print_run')} />
                </Field>
              </div>
            </FieldGroup>
            <FieldGroup title="Opis">
              <textarea className="input min-h-32" placeholder="Historia emisji, ciekawostki, odmiany…" aria-label="Opis i ciekawostki" {...field('description')} />
            </FieldGroup>
          </Section>

          <Section
            id="zdjecia"
            step="C"
            title="Zdjęcia"
            hint={
              isEdit
                ? 'Zapisane zdjęcia możesz usunąć lub oznaczyć jako główne. Nowe zostaną dodane po zapisie.'
                : 'Zalecane zdjęcie awersu. Pierwsze zdjęcie zostanie zdjęciem głównym.'
            }
          >
            {isEdit && existingImages.length > 0 && (
              <div className="rounded-xl bg-paper-200/40 px-6 py-8">
                <ImageGallery
                  images={existingImages}
                  alt={form.name}
                  onChanged={() => setImagesVersion((n) => n + 1)}
                  onError={(m) => setErrors([m])}
                />
              </div>
            )}
            <ImagePicker
              value={newImages}
              onChange={setNewImages}
              onReject={(m) => setErrors((list) => [...list, m])}
              hasExistingPrimary={existingImages.some((i) => i.is_primary)}
            />
          </Section>

          {!isEdit && (
            <Section id="egzemplarz" step="D" title="Mój egzemplarz">
              <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-line bg-paper-50 p-4">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={addSpecimen}
                  onChange={(e) => setAddSpecimen(e.target.checked)}
                />
                <span
                  aria-hidden
                  className="relative h-6 w-12 shrink-0 rounded-full bg-paper-300 transition duration-300 ease-out-expo peer-checked:bg-navy-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-400 after:absolute after:top-1 after:left-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-e1 after:transition after:duration-300 after:ease-out-expo peer-checked:after:translate-x-6"
                />
                <span className="text-sm">
                  <span className="block font-medium">Mam ten znaczek</span>
                  <span className="text-muted">
                    {addSpecimen ? 'Egzemplarz zostanie dodany do kolekcji.' : 'Pozycja trafi do katalogu jako brakująca.'}
                  </span>
                </span>
              </label>
              {addSpecimen && (
                <SpecimenFields value={specimen} onChange={(p) => setSpecimen((s) => ({ ...s, ...p }))} albums={albums} />
              )}
            </Section>
          )}

          <FormActions>
            <Link to={id ? `/znaczek/${id}` : '/katalog'} className="btn btn-ghost">
              Anuluj
            </Link>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? 'Zapisywanie…' : isEdit ? 'Zapisz zmiany' : 'Zapisz znaczek'}
            </button>
          </FormActions>
        </form>
      </div>
    </>
  )
}
