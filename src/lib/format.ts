// Formatowanie wartości do wyświetlenia po polsku (przecinek dziesiętny, data dzień.miesiąc.rok).

export const formatNumber = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 2 })

export const formatMoney = (amount: number | null, currency: string | null) =>
  amount == null
    ? null
    : `${amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ''}`.trim()

export const formatDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pl-PL') : null

// Polska odmiana liczebników: 1 egzemplarz, 2–4 egzemplarze (poza 12–14), 5+ egzemplarzy.
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return `${n} ${one}`
  const last = n % 10
  const lastTwo = n % 100
  return `${n} ${last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many}`
}
