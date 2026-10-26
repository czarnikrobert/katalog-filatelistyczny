import type { StampOverview } from './types'

export interface Issue {
  key: string
  title: string
  date: string | null
  stamps: StampOverview[]
}

// Emisja = seria (albo pojedynczy znaczek bez serii) wydana danego dnia. Zachowuje kolejność wejściową.
export function groupIntoIssues(stamps: StampOverview[]): Issue[] {
  const issues: Issue[] = []
  const byKey = new Map<string, Issue>()
  for (const s of stamps) {
    const key = s.series_id ?? `${s.issue_date}|${s.name}`
    let issue = byKey.get(key)
    if (!issue) {
      issue = { key, title: s.series_name ?? s.name, date: s.issue_date, stamps: [] }
      byKey.set(key, issue)
      issues.push(issue)
    }
    issue.stamps.push(s)
  }
  return issues
}
