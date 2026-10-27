import type { ImageType } from './types'

// Nazwy plików skanów: numer Fischera + opcjonalny dopisek po „_” albo spacji.
//   1841.jpg            → awers znaczka 1841
//   1841_r.jpg          → rewers (dopisek zaczyna się od „r”: r, rew, rewers)
//   1841_d.jpg, 1841_2  → detal (każdy inny dopisek)
//   347-a.jpg, 420A.jpg, 5494I.jpg, „2580 I.jpg” → odmiany — litera/cyfra rzymska należy do numeru
export interface ParsedScanName {
  number: string
  imageType: ImageType
}

// Zwraca możliwe odczytania w kolejności preferencji — wybiera się pierwsze, którego numer jest w katalogu.
export function parseScanName(fileName: string): ParsedScanName[] {
  const base = fileName.replace(/\.[^.]+$/, '').trim()
  const m = base.match(/^(\d+(?:[-.]?[a-z]|[-.]?[IVX]+)?)(?:[_ ]+(.*))?$/i)
  if (!m) return []
  const suffix = (m[2] ?? '').trim()
  const type: ImageType = !suffix ? 'awers' : suffix.toLowerCase().startsWith('r') ? 'rewers' : 'detal'
  const options: ParsedScanName[] = []
  // „2580 I” — dopisek wygląda jak oznaczenie odmiany, więc najpierw próbujemy go jako części numeru.
  if (/^([IVX]+|[a-z])$/i.test(suffix)) options.push({ number: `${m[1]}${suffix}`, imageType: 'awers' })
  options.push({ number: m[1], imageType: type })
  return options
}

// Porównywanie numerów bez znaczenia myślników, kropek, spacji i wielkości liter („347-a” = „347A”).
export const normalizeCatalogNumber = (n: string) => n.replace(/[\s.\-–]/g, '').toLowerCase()
