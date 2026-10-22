import { Trash2 } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Okno potwierdzenia akcji nieodwracalnej — jedyne miejsce, gdzie przycisk usuwania jest czerwony i pełny.
export function ConfirmDialog({ open, title, children, confirmLabel = 'Usuń', busy, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-card p-0 text-ink shadow-e5 backdrop:bg-navy-900/40 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="animate-rise">
          <div className="flex gap-4 p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
              <Trash2 size={20} />
            </span>
            <div className="space-y-2">
              <h2 className="font-serif text-xl">{title}</h2>
              {children && <div className="text-sm leading-relaxed text-muted">{children}</div>}
            </div>
          </div>
          <div className="flex justify-end gap-2 rounded-b-xl border-t border-line bg-paper-50 px-6 py-4">
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
              Anuluj
            </button>
            <button
              type="button"
              className="btn bg-red-700 text-white shadow-e1 hover:bg-red-800"
              onClick={onConfirm}
              disabled={busy}
              autoFocus
            >
              {busy ? 'Usuwanie…' : confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
