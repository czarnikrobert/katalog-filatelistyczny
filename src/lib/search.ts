// Wyszukiwanie w katalogu po frazie: nazwa, opis, nazwa emisji i numer katalogowy.

// Numer katalogowy z opcjonalną odmianą: 2645, 2768II, 347-a, 3062IIA.
const NUMBER_WORD = /^(\d+)[-.]?([a-z]+)?$/i

// Słowa frazy; „2580 I” (numer + odmiana wielką literą) łączymy w jedno słowo — małe „i” to spójnik.
export function searchWords(query: string) {
  return query
    .replace(/(\d+)\s+([IVX]+|[A-Z])(?=\s|$)/g, '$1$2')
    .replace(/["\\*%]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// Filtry .or() — po jednym na słowo, więc każde słowo musi gdzieś wystąpić.
// Numer trafia w numer katalogowy dokładnie (razem z odmianami), a nie „po kawałku” (339 nie znajdzie 1339).
export function searchFilters(query: string) {
  return searchWords(query).map((word) => {
    const text = ['name', 'description', 'series_name'].map((c) => `${c}.ilike."*${word}*"`)
    const number = word.match(NUMBER_WORD)
    if (!number) return [...text, `catalog_number.ilike."*${word}*"`].join(',')
    const variant = number[2] ?? '[a-z]*'
    return [`catalog_number.imatch."^${number[1]}[-. ]?${variant}$"`, ...text].join(',')
  })
}

// Fragment opisu z szukanym słowem — gdy nazwa go nie zawiera, żeby było widać, dlaczego znaczek pasuje.
export function descriptionSnippet(s: { name: string; description: string | null }, query: string) {
  if (!s.description) return null
  const words = searchWords(query).filter((w) => !NUMBER_WORD.test(w))
  const name = s.name.toLowerCase()
  // Stały początek opisów z kzp.pl i arkusza („Na znaczku przedstawiono:”) nic nie mówi — pomijamy go.
  const desc = s.description.replace(/\s+/g, ' ').replace(/^Na \S+ przedstawiono\s*:?\s*/i, '')
  const lower = desc.toLowerCase()
  const word = words.find((w) => !name.includes(w.toLowerCase()) && lower.includes(w.toLowerCase()))
  if (!word) return null
  const at = lower.indexOf(word.toLowerCase())
  const start = Math.max(0, desc.lastIndexOf(' ', Math.max(0, at - 40)) + 1)
  return `${start > 0 ? '…' : ''}${desc.slice(start, start + 110).trim()}${start + 110 < desc.length ? '…' : ''}`
}
