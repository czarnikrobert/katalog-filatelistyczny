import { CircleAlert, CircleCheck, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="stamp-shadow">
        <span className="perforated block h-8 w-8 [--hole:2px] [--step:6px]">
          <span className="flex h-full w-full items-center justify-center bg-navy-700 font-serif text-sm text-gold-300">K</span>
        </span>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-serif text-lg text-navy-700">Mój Katalog</span>
          <span className="eyebrow">filatelistyczny</span>
        </span>
      )}
    </span>
  )
}

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end gap-4">
      <div className="mr-auto max-w-[65ch] space-y-2">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="font-serif text-3xl leading-tight tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-paper-300 bg-paper-50 px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-gold-700">
        <Icon size={24} />
      </span>
      <h2 className="font-serif text-xl">{title}</h2>
      {children && <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

const tones = {
  success: { icon: CircleCheck, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  warning: { icon: TriangleAlert, className: 'border-amber-200 bg-amber-50 text-amber-900' },
  error: { icon: CircleAlert, className: 'border-red-200 bg-red-50 text-red-800' },
}

export function Notice({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  const { icon: Icon, className } = tones[tone]
  return (
    <div
      role={tone === 'success' ? 'status' : 'alert'}
      className={`flex animate-rise items-start gap-3 rounded-xl border px-4 py-3 text-sm ${className}`}
    >
      <Icon size={18} className="mt-px shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

// Szkielet siatki znaczków — ten sam układ co galeria, żeby strona nie „skakała”.
export function StampGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'navy' | 'gold' }) {
  const styles = {
    neutral: 'bg-paper-200/60 text-paper-700',
    navy: 'bg-navy-700 text-paper-50',
    gold: 'bg-gold-100 text-gold-800',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-none font-medium whitespace-nowrap ${styles[tone]}`}>
      {children}
    </span>
  )
}
