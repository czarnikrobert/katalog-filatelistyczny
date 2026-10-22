import { IMAGES_BUCKET, supabase } from './supabase'
import type { ImageType, StampImage } from './types'

export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024 // zgodnie z limitem bucketu

// Zwraca komunikat błędu albo null, gdy plik nadaje się do wysłania.
export function validateImageFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.split(',').includes(file.type)) return `${file.name}: obsługiwane formaty to JPEG, PNG i WebP.`
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: plik jest większy niż 20 MB.`
  return null
}

const THUMB_MAX_PX = 480

// Pomniejszona kopia JPEG do galerii; oryginał zostaje w pełnej jakości.
async function makeThumbnail(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, THUMB_MAX_PX / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  } catch {
    return null
  }
}

async function currentUserId() {
  const { data } = await supabase!.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Sesja wygasła — zaloguj się ponownie.')
  return id
}

export interface NewImage {
  file: File
  stampId: string
  specimenId?: string | null
  imageType: ImageType
  isPrimary: boolean
}

export async function uploadStampImage({ file, stampId, specimenId, imageType, isPrimary }: NewImage) {
  const db = supabase!
  const bucket = db.storage.from(IMAGES_BUCKET)
  // Pierwszy segment ścieżki = właściciel; wymagają tego polityki Storage.
  const base = `${await currentUserId()}/${stampId}/${crypto.randomUUID()}`
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `${base}.${ext}`

  const original = await bucket.upload(storagePath, file, { contentType: file.type })
  if (original.error) throw original.error

  let thumbPath: string | null = null
  const thumb = await makeThumbnail(file)
  if (thumb) {
    const uploaded = await bucket.upload(`${base}_min.jpg`, thumb, { contentType: 'image/jpeg' })
    if (!uploaded.error) thumbPath = `${base}_min.jpg`
  }

  if (isPrimary) await clearPrimary(stampId)
  const { error } = await db.from('stamp_images').insert({
    stamp_id: stampId,
    specimen_id: specimenId ?? null,
    image_type: imageType,
    storage_path: storagePath,
    thumb_path: thumbPath,
    is_primary: isPrimary,
  })
  if (error) {
    await bucket.remove([storagePath, ...(thumbPath ? [thumbPath] : [])])
    throw error
  }
}

async function clearPrimary(stampId: string) {
  await supabase!.from('stamp_images').update({ is_primary: false }).eq('stamp_id', stampId).eq('is_primary', true)
}

export async function setPrimaryImage(image: StampImage) {
  await clearPrimary(image.stamp_id)
  const { error } = await supabase!.from('stamp_images').update({ is_primary: true }).eq('id', image.id)
  if (error) throw error
}

function filePaths(images: Pick<StampImage, 'storage_path' | 'thumb_path'>[]) {
  return images.flatMap((i) => (i.thumb_path ? [i.storage_path, i.thumb_path] : [i.storage_path]))
}

export async function deleteImages(images: StampImage[]) {
  if (images.length === 0) return
  const db = supabase!
  const { error } = await db.from('stamp_images').delete().in('id', images.map((i) => i.id))
  if (error) throw error
  await db.storage.from(IMAGES_BUCKET).remove(filePaths(images))
}

// Usuwa pliki zdjęć powiązanych z rekordami — wiersze w bazie usuwa kaskada.
export async function removeImageFiles(filter: { stampId?: string; specimenId?: string }) {
  const db = supabase!
  let q = db.from('stamp_images').select('storage_path, thumb_path')
  if (filter.stampId) q = q.eq('stamp_id', filter.stampId)
  if (filter.specimenId) q = q.eq('specimen_id', filter.specimenId)
  const { data } = await q
  if (data && data.length > 0) await db.storage.from(IMAGES_BUCKET).remove(filePaths(data))
}

// Wysyła zdjęcia wybrane w formularzu; zwraca nazwy plików, których nie udało się zapisać.
export async function uploadPending(
  images: { file: File; imageType: ImageType; isPrimary: boolean }[],
  stampId: string,
  specimenId?: string,
) {
  const failed: string[] = []
  for (const img of images) {
    try {
      await uploadStampImage({ ...img, stampId, specimenId })
    } catch {
      failed.push(img.file.name)
    }
  }
  return failed
}
