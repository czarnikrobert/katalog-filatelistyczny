// Walidacja pól tekstowych formularza. Zwracają wartość albo błąd do wyświetlenia.

export type Parsed<T> = { ok: true; value: T | null } | { ok: false; error: string }

export function parseDecimal(raw: string, label: string): Parsed<number> {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!s) return { ok: true, value: null }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, error: `${label}: wpisz liczbę, np. 12,50.` }
  return { ok: true, value: Number(s) }
}

export function parseInteger(raw: string, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): Parsed<number> {
  const s = raw.trim().replace(/\s/g, '')
  if (!s) return { ok: true, value: null }
  const n = Number(s)
  if (!Number.isInteger(n) || n < min || n > max) return { ok: false, error: `${label}: wpisz liczbę całkowitą ${min}–${max}.` }
  return { ok: true, value: n }
}

export function parseMillimeters(raw: string, label: string): Parsed<number> {
  const parsed = parseDecimal(raw, label)
  if (parsed.ok && parsed.value !== null && parsed.value > 1000) return { ok: false, error: `${label}: za duża wartość.` }
  return parsed
}

export function parseDate(raw: string, label: string): Parsed<string> {
  if (!raw) return { ok: true, value: null }
  const year = Number(raw.slice(0, 4))
  if (year < 1840 || year > 2100) return { ok: false, error: `${label}: nieprawidłowa data.` }
  return { ok: true, value: raw }
}

export const textOrNull = (s: string) => s.trim() || null

// Zbiera błędy kilku pól naraz, żeby pokazać je wszystkie po jednym kliknięciu „Zapisz”.
export class Validator {
  errors: string[] = []
  take<T>(parsed: Parsed<T>): T | null {
    if (parsed.ok) return parsed.value
    this.errors.push(parsed.error)
    return null
  }
}
