// Supabase zwraca najwyżej 1000 wierszy na zapytanie — pobieramy kolejne strony, aż do końca.
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
) {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) return rows
  }
}
