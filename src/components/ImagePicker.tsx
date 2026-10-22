import { ImagePlus, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ACCEPTED_IMAGE_TYPES, validateImageFile } from '../lib/images'
import { imageTypeLabels } from '../lib/labels'
import type { ImageType } from '../lib/types'
import { StampThumb } from './StampThumb'

export interface PendingImage {
  key: string
  file: File
  previewUrl: string
  imageType: ImageType
  isPrimary: boolean
}

interface Props {
  value: PendingImage[]
  onChange: (images: PendingImage[]) => void
  onReject: (message: string) => void
  // Gdy pozycja ma już zdjęcie główne, nowe zdjęcia nie przejmują tej roli automatycznie.
  hasExistingPrimary?: boolean
}

// Zdjęcia wybrane przed zapisem — trafiają do Storage dopiero po zapisaniu rekordu.
export function ImagePicker({ value, onChange, onReject, hasExistingPrimary }: Props) {
  const [dragging, setDragging] = useState(false)
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  }, [value])
  useEffect(() => () => latest.current.forEach((img) => URL.revokeObjectURL(img.previewUrl)), [])

  const add = (files: FileList | null) => {
    if (!files) return
    const accepted = [...files].filter((f) => {
      const error = validateImageFile(f)
      if (error) onReject(error)
      return !error
    })
    const needsPrimary = !hasExistingPrimary && !value.some((i) => i.isPrimary)
    const added = accepted.map((file, i) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      imageType: (value.length + i === 0 ? 'awers' : value.length + i === 1 ? 'rewers' : 'detal') as ImageType,
      isPrimary: needsPrimary && i === 0,
    }))
    onChange([...value, ...added])
  }

  const remove = (key: string) => {
    const img = value.find((i) => i.key === key)
    if (img) URL.revokeObjectURL(img.previewUrl)
    const rest = value.filter((i) => i.key !== key)
    if (img?.isPrimary && rest[0] && !hasExistingPrimary) rest[0] = { ...rest[0], isPrimary: true }
    onChange(rest)
  }

  const patch = (key: string, changes: Partial<PendingImage>) =>
    onChange(
      value.map((i) =>
        i.key === key ? { ...i, ...changes } : changes.isPrimary ? { ...i, isPrimary: false } : i,
      ),
    )

  return (
    <div className="space-y-6">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {value.map((img) => (
            <div key={img.key} className="animate-rise space-y-3">
              <div className="relative">
                <StampThumb src={img.previewUrl} alt="" />
                <button
                  type="button"
                  onClick={() => remove(img.key)}
                  className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted shadow-e2 transition duration-300 ease-out-expo hover:text-danger"
                  aria-label="Usuń zdjęcie"
                >
                  <X size={16} />
                </button>
              </div>
              <select
                className="input py-1 text-xs"
                aria-label="Rodzaj zdjęcia"
                value={img.imageType}
                onChange={(e) => patch(img.key, { imageType: e.target.value as ImageType })}
              >
                {Object.entries(imageTypeLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => patch(img.key, { isPrimary: !img.isPrimary })}
                className={`inline-flex items-center gap-1 text-xs font-medium transition duration-300 ease-out-expo ${
                  img.isPrimary ? 'text-gold-600' : 'text-subtle hover:text-navy-700'
                }`}
              >
                <Star size={14} fill={img.isPrimary ? 'currentColor' : 'none'} />
                {img.isPrimary ? 'Zdjęcie główne' : 'Ustaw jako główne'}
              </button>
            </div>
          ))}
        </div>
      )}
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          add(e.dataTransfer.files)
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition duration-300 ease-out-expo ${
          dragging ? 'border-navy-400 bg-navy-50' : 'border-paper-300 bg-paper-50 hover:border-paper-400'
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-gold-700">
          <ImagePlus size={20} />
        </span>
        <span className="text-sm font-medium text-ink">Przeciągnij zdjęcia tutaj albo kliknij, aby wybrać</span>
        <span className="text-xs text-subtle">Awers, rewers, detale · JPEG, PNG lub WebP do 20 MB</span>
        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="sr-only"
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}
