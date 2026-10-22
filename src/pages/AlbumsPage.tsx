import { ArrowUpRight, Library } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState, PageHeader, Skeleton } from '../components/ui'
import { fetchAll } from '../lib/fetchAll'
import { plural } from '../lib/format'
import { supabase } from '../lib/supabase'

interface LocationRow {
  album_name: string
  page_number: number | null
  specimens: { count: number }[]
}

interface Album {
  name: string
  pages: number
  specimens: number
}

export function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[] | null>(null)

  useEffect(() => {
    fetchAll<LocationRow>((from, to) =>
      supabase!.from('storage_locations').select('album_name, page_number, specimens(count)').range(from, to),
    ).then((rows) => {
      const map = new Map<string, { pages: Set<number>; specimens: number }>()
      for (const r of rows) {
        const a = map.get(r.album_name) ?? { pages: new Set<number>(), specimens: 0 }
        if (r.page_number != null) a.pages.add(r.page_number)
        a.specimens += r.specimens[0]?.count ?? 0
        map.set(r.album_name, a)
      }
      setAlbums(
        [...map]
          .map(([name, a]) => ({ name, pages: a.pages.size, specimens: a.specimens }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
      )
    })
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Przechowywanie"
        title="Klasery i albumy"
        description="Gdzie fizycznie leżą Twoje znaczki. Kliknij klaser, aby zobaczyć jego zawartość."
      />
      {albums === null ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <EmptyState icon={Library} title="Nie masz jeszcze klaserów">
          Klaser tworzy się sam, gdy przy egzemplarzu wpiszesz jego nazwę, stronę i kieszonkę.
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a, i) => (
            <Link
              key={a.name}
              to={`/kolekcja?klaser=${encodeURIComponent(a.name)}`}
              className="group card flex animate-rise flex-col gap-6 p-6 transition duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-e3"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                  <Library size={20} />
                </span>
                <ArrowUpRight size={18} className="text-subtle transition duration-300 ease-out-expo group-hover:text-navy-700" />
              </div>
              <div className="space-y-1">
                <h2 className="font-serif text-xl">{a.name}</h2>
                <p className="text-sm text-muted">
                  {plural(a.specimens, 'egzemplarz', 'egzemplarze', 'egzemplarzy')}
                  {a.pages > 0 && ` · ${plural(a.pages, 'strona', 'strony', 'stron')}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
