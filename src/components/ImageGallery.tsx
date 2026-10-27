import { Expand, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { deleteImages, setPrimaryImage } from '../lib/images'
import { imageTypeLabels } from '../lib/labels'
import type { StampImage } from '../lib/types'
import { useSignedUrls } from '../lib/useSignedUrls'
import { ConfirmDialog } from './ConfirmDialog'
import { StampThumb } from './StampThumb'

interface Props {
  images: StampImage[]
  onChanged: () => void
  onError: (message: string) => void
  alt: string
  // Podpis pustego znaczka, gdy pozycja nie ma jeszcze zdjęć.
  caption?: string | null
  // Pozycja bez egzemplarza w kolekcji — pusty znaczek w szarym tonie.
  missing?: boolean
  // Podgląd bez akcji (gość): bez ustawiania zdjęcia głównego i usuwania.
  readOnly?: boolean
}

// Link do oryginału ma sens tylko dla dużych zdjęć — stare grafiki z kzp.pl mają ok. 100 px.
const MIN_ORIGINAL_PX = 400

function useImageSize(url: string | undefined) {
  const [size, setSize] = useState<{ url: string; w: number; h: number } | null>(null)
  useEffect(() => {
    if (!url) return
    const img = new Image()
    img.onload = () => setSize({ url, w: img.naturalWidth, h: img.naturalHeight })
    img.src = url
  }, [url])
  return size && size.url === url ? size : null
}

// Duże zdjęcie + pasek miniatur z akcjami (zdjęcie główne, usuwanie).
export function ImageGallery({ images, onChanged, onError, alt, caption, missing, readOnly }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const selected = images.find((i) => i.id === selectedId) ?? images.find((i) => i.is_primary) ?? images[0] ?? null
  const urls = useSignedUrls([...images.map((i) => i.thumb_path ?? i.storage_path), selected?.storage_path ?? null])
  const fullUrl = selected ? urls[selected.storage_path] : undefined
  const fullSize = useImageSize(fullUrl)
  const canOpenOriginal = fullSize !== null && Math.max(fullSize.w, fullSize.h) >= MIN_ORIGINAL_PX

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
      onChanged()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Operacja na zdjęciu nie powiodła się.')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  if (!selected) return <StampThumb alt={alt} caption={caption} missing={missing} className="mx-auto max-w-72" />

  const stamp = <StampThumb src={fullUrl ?? urls[selected.thumb_path ?? '']} alt={alt} />

  return (
    <div className="space-y-6">
      {canOpenOriginal ? (
        <a
          href={fullUrl}
          target="_blank"
          rel="noreferrer"
          title={`Otwórz oryginał w pełnej rozdzielczości (${fullSize.w}×${fullSize.h} px)`}
          className="group relative mx-auto block max-w-72"
        >
          {stamp}
          <span className="absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 text-navy-700 opacity-0 shadow-e2 backdrop-blur transition duration-300 ease-out-expo group-hover:opacity-100">
            <Expand size={16} />
          </span>
        </a>
      ) : (
        <div className="mx-auto max-w-72">{stamp}</div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-subtle">
        <span>
          {imageTypeLabels[selected.image_type]}
          {selected.specimen_id ? ' · skan egzemplarza' : ' · zdjęcie katalogowe'}
        </span>
        {!readOnly && (
          <span className="flex gap-1">
            {selected.is_primary ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-gold-600">
                <Star size={14} fill="currentColor" /> Zdjęcie główne
              </span>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => setPrimaryImage(selected))}
                className="btn btn-ghost px-2 py-1 text-xs"
              >
                <Star size={14} /> Ustaw jako główne
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="btn btn-danger-link px-2 py-1 text-xs"
            >
              <Trash2 size={14} /> Usuń
            </button>
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex flex-wrap justify-center gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedId(img.id)}
              aria-label={`Pokaż: ${imageTypeLabels[img.image_type]}`}
              aria-pressed={img.id === selected.id}
              className={`relative w-16 transition duration-300 ease-out-expo ${
                img.id === selected.id ? '-translate-y-1' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <StampThumb src={urls[img.thumb_path ?? img.storage_path]} alt="" />
              {img.is_primary && <Star size={12} className="absolute top-2 left-2 text-gold-500" fill="currentColor" />}
            </button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć to zdjęcie?"
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => run(() => deleteImages([selected]))}
      >
        Plik zostanie trwale usunięty z magazynu razem z miniaturą.
      </ConfirmDialog>
    </div>
  )
}
