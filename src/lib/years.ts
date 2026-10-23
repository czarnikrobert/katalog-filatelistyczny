import { fetchAll } from './fetchAll'
import { supabase } from './supabase'

export interface YearSummary {
  year: number
  total: number
  owned: number
  // Miniatura pierwszego (w kolejności katalogowej) znaczka z grafiką.
  thumb: string | null
}

interface Row {
  issue_year: number | null
  issue_date: string | null
  catalog_number: string | null
  primary_thumb_path: string | null
  owned_count: number
}

// Lista roczników z liczbą pozycji; owned liczy się tylko dla zalogowanego właściciela (RLS ukrywa egzemplarze).
export async function loadYears(): Promise<YearSummary[]> {
  const rows = await fetchAll<Row>((from, to) =>
    supabase!
      .from('stamp_overview')
      .select('issue_year, issue_date, catalog_number, primary_thumb_path, owned_count')
      .not('issue_year', 'is', null)
      .order('issue_date', { ascending: true, nullsFirst: false })
      .range(from, to),
  )
  const map = new Map<number, YearSummary>()
  for (const r of rows) {
    const y = map.get(r.issue_year!) ?? { year: r.issue_year!, total: 0, owned: 0, thumb: null }
    y.total++
    if (r.owned_count > 0) y.owned++
    if (!y.thumb && r.primary_thumb_path) y.thumb = r.primary_thumb_path
    map.set(r.issue_year!, y)
  }
  return [...map.values()].sort((a, b) => a.year - b.year)
}
