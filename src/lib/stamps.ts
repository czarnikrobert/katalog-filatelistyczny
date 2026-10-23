import { fetchAll } from './fetchAll'
import { removeImageFiles } from './images'
import { supabase } from './supabase'

export async function findOrCreateSeries(countryId: string, name: string, issueYear: number | null) {
  const db = supabase!
  const { data: found } = await db.from('series').select('id').eq('country_id', countryId).eq('name', name).limit(1)
  if (found?.[0]) return found[0].id as string
  const { data, error } = await db
    .from('series')
    .insert({ country_id: countryId, name, issue_year: issueYear })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

// Kolejność ma znaczenie: egzemplarze blokują usunięcie pozycji (on delete restrict),
// a pliki w Storage trzeba usunąć, zanim kaskada skasuje wiersze stamp_images.
export async function deleteStamp(id: string) {
  const db = supabase!
  await removeImageFiles({ stampId: id })
  const specimens = await db.from('specimens').delete().eq('stamp_id', id)
  if (specimens.error) throw specimens.error
  const { error } = await db.from('stamps').delete().eq('id', id)
  if (error) throw error
}

export interface OrderRow {
  id: string
  issue_year: number | null
  issue_date: string | null
  catalog_number: string | null
  primary_thumb_path: string | null
}

// Kolejność katalogowa: rok, data emisji (puste na końcu roku), numer katalogowy sortowany „po ludzku” (339 < 1841, 347-a < 347-b).
export function catalogOrder(a: OrderRow, b: OrderRow) {
  return (
    (a.issue_year ?? 9999) - (b.issue_year ?? 9999) ||
    (a.issue_date ?? '9999').localeCompare(b.issue_date ?? '9999') ||
    (a.catalog_number ?? '').localeCompare(b.catalog_number ?? '', 'pl', { numeric: true })
  )
}

// Następny (w kolejności katalogowej) znaczek bez zdjęcia; po końcu katalogu zaczyna od początku.
export async function findNextWithoutImage(currentId: string) {
  const rows = await fetchAll<OrderRow>((from, to) =>
    supabase!
      .from('stamp_overview')
      .select('id, issue_year, issue_date, catalog_number, primary_thumb_path')
      .range(from, to),
  )
  rows.sort(catalogOrder)
  const start = rows.findIndex((r) => r.id === currentId)
  for (let step = 1; step < rows.length; step++) {
    const row = rows[(start + step) % rows.length]
    if (!row.primary_thumb_path) return row.id
  }
  return null
}

export async function countWithoutImage() {
  const { count } = await supabase!.from('stamp_overview').select('*', { count: 'exact', head: true }).is('primary_thumb_path', null)
  return count ?? 0
}
