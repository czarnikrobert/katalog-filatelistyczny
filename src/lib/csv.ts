// Plik CSV dla polskiego Excela: średnik jako separator i BOM, żeby polskie znaki otwierały się poprawnie.
function cell(value: string | number | null | undefined) {
  const s = value == null ? '' : String(value)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const content = [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
