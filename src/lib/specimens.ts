import { textOrNull, parseDate, parseDecimal, parseInteger, Validator } from './parse'
import { removeImageFiles } from './images'
import { supabase } from './supabase'
import type {
  CancellationType,
  CollectionStatus,
  Condition,
  GumStatus,
  Specimen,
  StorageLocation,
  ValuationSource,
} from './types'

// Stan formularza egzemplarza — wszystkie pola jako tekst, konwersja przy zapisie.
export interface SpecimenDraft {
  inventory_number: string
  condition: Condition | ''
  gum_status: GumStatus | ''
  cancellation_type: CancellationType | ''
  purchase_date: string
  purchase_price: string
  purchase_currency: string
  purchase_source: string
  estimated_value: string
  estimated_value_currency: string
  valuation_source: ValuationSource | ''
  valuation_date: string
  album_name: string
  page_number: string
  pocket_number: string
  collection_status: CollectionStatus
  notes: string
}

export const emptySpecimenDraft = (): SpecimenDraft => ({
  inventory_number: '',
  condition: '',
  gum_status: '',
  cancellation_type: '',
  purchase_date: '',
  purchase_price: '',
  purchase_currency: 'PLN',
  purchase_source: '',
  estimated_value: '',
  estimated_value_currency: 'PLN',
  valuation_source: '',
  valuation_date: new Date().toISOString().slice(0, 10),
  album_name: '',
  page_number: '',
  pocket_number: '',
  collection_status: 'w_kolekcji',
  notes: '',
})

const asText = (v: number | string | null | undefined) => (v == null ? '' : String(v).replace('.', ','))

export function specimenToDraft(s: Specimen, location: StorageLocation | null): SpecimenDraft {
  return {
    ...emptySpecimenDraft(),
    inventory_number: s.inventory_number ?? '',
    condition: s.condition ?? '',
    gum_status: s.gum_status ?? '',
    cancellation_type: s.cancellation_type ?? '',
    purchase_date: s.purchase_date ?? '',
    purchase_price: asText(s.purchase_price),
    purchase_currency: s.purchase_currency ?? 'PLN',
    purchase_source: s.purchase_source ?? '',
    estimated_value: asText(s.estimated_value),
    estimated_value_currency: s.estimated_value_currency ?? 'PLN',
    album_name: location?.album_name ?? '',
    page_number: asText(location?.page_number),
    pocket_number: asText(location?.pocket_number),
    collection_status: s.collection_status,
    notes: s.notes ?? '',
  }
}

export function validateSpecimen(d: SpecimenDraft, v: Validator) {
  return {
    purchase_date: v.take(parseDate(d.purchase_date, 'Data pozyskania')),
    purchase_price: v.take(parseDecimal(d.purchase_price, 'Cena zakupu')),
    estimated_value: v.take(parseDecimal(d.estimated_value, 'Szacowana wartość')),
    valuation_date: v.take(parseDate(d.valuation_date, 'Data wyceny')),
    page_number: v.take(parseInteger(d.page_number, 'Strona klasera', 1, 10000)),
    pocket_number: v.take(parseInteger(d.pocket_number, 'Kieszonka', 1, 1000)),
  }
}

type ParsedSpecimen = ReturnType<typeof validateSpecimen>

// Kolejny własny numer egzemplarza w formacie PREFIKS-000001 (prefiks = kod kraju).
async function nextInventoryNumber(prefix: string) {
  const { data } = await supabase!
    .from('specimens')
    .select('inventory_number')
    .like('inventory_number', `${prefix}-%`)
    .order('inventory_number', { ascending: false })
    .limit(1)
  const last = Number(data?.[0]?.inventory_number?.split('-').pop() ?? 0)
  return `${prefix}-${String((Number.isFinite(last) ? last : 0) + 1).padStart(6, '0')}`
}

async function findOrCreateLocation(album: string, page: number | null, pocket: number | null) {
  const db = supabase!
  let q = db.from('storage_locations').select('id').eq('album_name', album)
  q = page === null ? q.is('page_number', null) : q.eq('page_number', page)
  q = pocket === null ? q.is('pocket_number', null) : q.eq('pocket_number', pocket)
  const { data: found } = await q.limit(1)
  if (found?.[0]) return found[0].id as string
  const { data, error } = await db
    .from('storage_locations')
    .insert({ album_name: album, page_number: page, pocket_number: pocket })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function saveSpecimen(
  stampId: string,
  draft: SpecimenDraft,
  parsed: ParsedSpecimen,
  countryIso: string | null,
  existing?: Specimen,
) {
  const db = supabase!
  const album = draft.album_name.trim()
  const locationId = album ? await findOrCreateLocation(album, parsed.page_number, parsed.pocket_number) : null

  const payload = {
    stamp_id: stampId,
    inventory_number: textOrNull(draft.inventory_number) ?? (await nextInventoryNumber(countryIso ?? 'XX')),
    condition: draft.condition || null,
    gum_status: draft.gum_status || null,
    cancellation_type: draft.cancellation_type || null,
    purchase_date: parsed.purchase_date,
    purchase_price: parsed.purchase_price,
    purchase_currency: parsed.purchase_price === null ? null : draft.purchase_currency,
    purchase_source: textOrNull(draft.purchase_source),
    estimated_value: parsed.estimated_value,
    estimated_value_currency: parsed.estimated_value === null ? null : draft.estimated_value_currency,
    storage_location_id: locationId,
    collection_status: draft.collection_status,
    notes: textOrNull(draft.notes),
  }

  const { data, error } = existing
    ? await db.from('specimens').update(payload).eq('id', existing.id).select('id').single()
    : await db.from('specimens').insert(payload).select('id').single()
  if (error) {
    if (error.code === '23505') throw new Error(`Numer własny ${payload.inventory_number} jest już zajęty.`)
    throw error
  }

  // Nowa wycena trafia do historii, gdy pojawiła się lub zmieniła wartość.
  const valueChanged =
    parsed.estimated_value !== null &&
    (existing?.estimated_value !== parsed.estimated_value ||
      existing?.estimated_value_currency !== payload.estimated_value_currency)
  if (valueChanged) {
    const { error: valError } = await db.from('valuations').insert({
      specimen_id: data.id,
      amount: parsed.estimated_value,
      currency: payload.estimated_value_currency,
      source: draft.valuation_source || null,
      valuation_date: parsed.valuation_date ?? new Date().toISOString().slice(0, 10),
    })
    if (valError) throw valError
  }

  return data.id as string
}

export async function deleteSpecimen(id: string) {
  await removeImageFiles({ specimenId: id })
  const { error } = await supabase!.from('specimens').delete().eq('id', id)
  if (error) throw error
}

export async function loadAlbumNames() {
  const { data } = await supabase!.from('storage_locations').select('album_name')
  return [...new Set((data ?? []).map((r) => r.album_name as string))].sort((a, b) => a.localeCompare(b, 'pl'))
}
