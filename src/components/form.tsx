import type { ReactNode } from 'react'
import { Notice } from './ui'

interface SectionProps {
  id?: string
  step?: string
  title: string
  hint?: ReactNode
  children: ReactNode
}

export function Section({ id, step, title, hint, children }: SectionProps) {
  return (
    <section id={id} className="card scroll-mt-24 space-y-6 p-6 md:p-8">
      <header className="flex items-start gap-4">
        {step && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 font-serif text-navy-700">
            {step}
          </span>
        )}
        <div className="space-y-1">
          <h2 className="font-serif text-xl">{title}</h2>
          {hint && <p className="text-sm leading-relaxed text-muted">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

// Podgrupa pól wewnątrz sekcji (np. „Zakup i wycena”).
export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </div>
  )
}

export function Field({ label, children, wide, hint }: { label: string; children: ReactNode; wide?: boolean; hint?: string }) {
  return (
    <label className={`block space-y-2 text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-subtle">{hint}</span>}
    </label>
  )
}

export function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null
  return (
    <Notice tone="error">
      {errors.length === 1 ? (
        errors[0]
      ) : (
        <ul className="list-disc space-y-1 pl-4">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </Notice>
  )
}

// Pasek akcji przyklejony do dołu ekranu — przycisk zapisu zawsze pod ręką przy długim formularzu.
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-24 z-20 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-line bg-card/80 p-3 shadow-e4 backdrop-blur-md md:bottom-4">
      {children}
    </div>
  )
}

// Spis sekcji długiego formularza (widoczny od szerokości lg).
export function SectionNav({ items }: { items: { id: string; step: string; label: string }[] }) {
  return (
    <nav className="sticky top-24 hidden self-start lg:block" aria-label="Sekcje formularza">
      <ol className="space-y-1 border-l border-line">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              onClick={(e) => {
                // Hash służy routerowi — przewijamy ręcznie zamiast zmieniać adres.
                e.preventDefault()
                document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="-ml-px flex items-center gap-3 border-l border-transparent py-2 pl-4 text-sm text-muted transition duration-300 ease-out-expo hover:border-navy-500 hover:text-navy-700"
            >
              <span className="font-serif text-subtle">{i.step}</span> {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
