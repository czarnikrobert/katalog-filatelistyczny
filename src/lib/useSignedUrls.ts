import { useEffect, useState } from 'react'
import { IMAGES_BUCKET, supabase } from './supabase'

// Zdjęcia leżą w prywatnym buckecie — do wyświetlenia potrzebne są krótkotrwałe podpisane adresy.
export function useSignedUrls(paths: (string | null)[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = paths.filter(Boolean).join('|')

  useEffect(() => {
    const list = key ? key.split('|') : []
    if (!supabase || list.length === 0) return
    supabase.storage
      .from(IMAGES_BUCKET)
      .createSignedUrls(list, 60 * 60)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach((item) => {
          if (item.path && item.signedUrl) map[item.path] = item.signedUrl
        })
        setUrls(map)
      })
  }, [key])

  return urls
}
