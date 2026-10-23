import { Link } from 'react-router'
import type { StampOverview } from '../lib/types'
import { StampThumb } from './StampThumb'
import { Pill } from './ui'

interface Props {
  stamp: StampOverview
  src: string | null | undefined
  // Tylko właściciel widzi, czy ma znaczek (dla gości liczba egzemplarzy zawsze wynosi 0).
  isOwner: boolean
  index?: number
}

const catalogLabel = (s: StampOverview) =>
  s.catalog_number ? `${s.catalog_system ?? 'Nr'} ${s.catalog_number}` : null

export function StampCard({ stamp: s, src, isOwner, index = 0 }: Props) {
  return (
    <Link
      to={`/znaczek/${s.id}`}
      className="group animate-rise space-y-3"
      style={{ animationDelay: `${Math.min(index, 24) * 30}ms` }}
    >
      <div className="relative">
        <StampThumb
          src={src}
          alt={s.name}
          missing={isOwner && s.owned_count === 0}
          caption={s.issue_year ? String(s.issue_year) : null}
          className="transition duration-500 ease-out-expo group-hover:-translate-y-1"
        />
        {isOwner && (
          <span className="absolute top-3 right-3">
            {s.owned_count > 0 ? <Pill tone="navy">×{s.owned_count}</Pill> : <Pill>brak</Pill>}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="line-clamp-2 text-sm leading-snug font-medium text-ink group-hover:text-navy-700">{s.name}</div>
        <div className="text-xs text-subtle">{[catalogLabel(s), s.issue_year].filter(Boolean).join(' · ')}</div>
      </div>
    </Link>
  )
}
