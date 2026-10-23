import { Stamp } from 'lucide-react'
import { useState } from 'react'

// Małe grafiki (np. ~90 px) powiększamy najwyżej 2×, żeby nie były rozmyte.
const MAX_UPSCALE = 2

interface Props {
  src?: string | null
  alt: string
  // Pozycja z katalogu, której nie ma w kolekcji — pokazywana wyblakle.
  missing?: boolean
  // Podpis na pustym znaczku, gdy brak zdjęcia (np. rok emisji).
  caption?: string | null
  className?: string
}

// Znaczek z ząbkowaną krawędzią; bez zdjęcia pokazuje „czysty” znaczek z giloszem.
export function StampThumb({ src, alt, missing, caption, className = '' }: Props) {
  return (
    <div className={`stamp-shadow ${className}`}>
      <div className="perforated aspect-[4/5]">
        <div
          className={`flex h-full w-full items-center justify-center overflow-hidden bg-paper-50 transition duration-500 ease-out-expo ${
            missing ? 'opacity-60 grayscale' : ''
          }`}
        >
          {src ? (
            <StampImage src={src} alt={alt} />
          ) : (
            // Bez zdjęcia: posiadany znaczek w ciepłym, złotym tonie, brakujący — szary.
            <div
              className={`flex h-full w-full flex-col items-center justify-center gap-2 border ${
                missing
                  ? 'border-paper-200 bg-[repeating-linear-gradient(135deg,var(--color-paper-100)_0_2px,transparent_2px_8px)] text-paper-400'
                  : 'border-gold-200 bg-gold-50 bg-[repeating-linear-gradient(135deg,var(--color-gold-100)_0_2px,transparent_2px_8px)] text-gold-600'
              }`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ring-1 ${
                  missing ? 'bg-paper-50 ring-paper-200' : 'bg-gold-50 ring-gold-200'
                }`}
              >
                <Stamp size={24} />
              </span>
              {caption && <span className={`font-serif text-sm ${missing ? 'text-paper-500' : 'text-gold-700'}`}>{caption}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StampImage({ src, alt }: { src: string; alt: string }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      style={natural ? { maxWidth: natural.w * MAX_UPSCALE, maxHeight: natural.h * MAX_UPSCALE } : undefined}
      className="h-full w-full object-contain"
    />
  )
}
