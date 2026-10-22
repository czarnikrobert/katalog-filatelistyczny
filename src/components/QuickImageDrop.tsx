import { Check, ClipboardPaste, ImagePlus, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ACCEPTED_IMAGE_TYPES, uploadStampImage, validateImageFile } from '../lib/images'
import type { ImageType, StampImage } from '../lib/types'

interface Props {
  stampId: string
  images: StampImage[]
  onUploaded: () => void
  onError: (message: string) => void
  children: ReactNode
}

const pasteShortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘V' : 'Ctrl+V'

// Szybkie dodawanie zdjęć katalogowych na karcie znaczka: przeciągnięcie, wybór pliku albo wklejenie ze schowka.
export function QuickImageDrop({ stampId, images, onUploaded, onError, children }: Props) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle')
  const [dragging, setDragging] = useState(false)
  const busy = useRef(false)
  const latestImages = useRef(images)
  useEffect(() => {
    latestImages.current = images
  }, [images])

  // Kolejne zdjęcia: awers (główne) → rewers → detale.
  const upload = async (files: File[]) => {
    if (busy.current || files.length === 0) return
    const valid = files.filter((f) => {
      const error = validateImageFile(f)
      if (error) onError(error)
      return !error
    })
    if (valid.length === 0) return
    busy.current = true
    setStatus('busy')
    const types = latestImages.current.map((i) => i.image_type)
    let hasPrimary = latestImages.current.some((i) => i.is_primary)
    try {
      for (const file of valid) {
        const imageType: ImageType = !types.includes('awers') ? 'awers' : !types.includes('rewers') ? 'rewers' : 'detal'
        await uploadStampImage({ file, stampId, imageType, isPrimary: !hasPrimary })
        types.push(imageType)
        hasPrimary = true
      }
      setStatus('done')
      onUploaded()
      setTimeout(() => setStatus('idle'), 2500)
    } catch (e) {
      setStatus('idle')
      onError(e instanceof Error ? e.message : 'Nie udało się zapisać zdjęcia.')
    } finally {
      busy.current = false
    }
  }

  // Wklejanie działa na całej karcie znaczka, poza polami tekstowymi.
  const uploadRef = useRef(upload)
  useEffect(() => {
    uploadRef.current = upload
  })
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable="true"]')) return
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) return
      e.preventDefault()
      // Obraz ze schowka ma zwykle nazwę „image.png” — nadajemy czytelniejszą.
      uploadRef.current(files.map((f) => new File([f], `wklejone-${Date.now()}.${f.type.split('/')[1]}`, { type: f.type })))
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        upload([...e.dataTransfer.files])
      }}
    >
      {children}

      <label
        className={`mt-6 flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-sm transition duration-300 ease-out-expo ${
          status === 'done'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : 'border-paper-300 text-muted hover:border-paper-400 hover:text-navy-700'
        }`}
      >
        {status === 'busy' ? (
          <>
            <LoaderCircle size={16} className="animate-spin" /> Zapisywanie zdjęcia…
          </>
        ) : status === 'done' ? (
          <>
            <Check size={16} /> Zdjęcie dodane
          </>
        ) : (
          <>
            <ImagePlus size={16} className="shrink-0 text-gold-600" />
            <span>
              Przeciągnij, wybierz plik albo wklej
              <kbd className="ml-2 inline-flex items-center gap-1 rounded border border-paper-300 bg-card px-1 font-mono text-xs text-ink">
                <ClipboardPaste size={12} /> {pasteShortcut}
              </kbd>
            </span>
          </>
        )}
        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="sr-only"
          disabled={status === 'busy'}
          onChange={(e) => {
            upload([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </label>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex animate-rise flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-400 bg-navy-50/80 text-navy-700 backdrop-blur-sm">
          <ImagePlus size={24} />
          <span className="text-sm font-medium">Upuść, aby dodać zdjęcie</span>
        </div>
      )}
    </div>
  )
}
