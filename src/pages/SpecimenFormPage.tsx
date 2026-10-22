import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormActions, FormErrors, Section } from '../components/form'
import { ImageGallery } from '../components/ImageGallery'
import { ImagePicker, type PendingImage } from '../components/ImagePicker'
import { SpecimenFields } from '../components/SpecimenFields'
import { PageHeader, Skeleton } from '../components/ui'
import { uploadPending } from '../lib/images'
import { Validator } from '../lib/parse'
import {
  deleteSpecimen,
  emptySpecimenDraft,
  loadAlbumNames,
  saveSpecimen,
  specimenToDraft,
  validateSpecimen,
  type SpecimenDraft,
} from '../lib/specimens'
import { supabase } from '../lib/supabase'
import type { Specimen, StampImage, StorageLocation } from '../lib/types'

type LoadedSpecimen = Specimen & { storage_locations: StorageLocation | null }

export function SpecimenFormPage() {
  const { id: stampId, specimenId } = useParams()
  const isEdit = Boolean(specimenId)
  const navigate = useNavigate()

  const [stamp, setStamp] = useState<{ name: string; country_iso: string | null } | null>(null)
  const [existing, setExisting] = useState<Specimen | null>(null)
  const [draft, setDraft] = useState<SpecimenDraft>(emptySpecimenDraft)
  const [albums, setAlbums] = useState<string[]>([])
  const [newImages, setNewImages] = useState<PendingImage[]>([])
  const [images, setImages] = useState<StampImage[]>([])
  const [imagesVersion, setImagesVersion] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const db = supabase!
    db.from('stamp_overview').select('name, country_iso').eq('id', stampId!).single()
      .then(({ data }) => setStamp(data))
    loadAlbumNames().then(setAlbums)
    if (specimenId) {
      db.from('specimens').select('*, storage_locations(*)').eq('id', specimenId).single().then(({ data }) => {
        if (!data) return
        const row = data as LoadedSpecimen
        setExisting(row)
        setDraft(specimenToDraft(row, row.storage_locations))
      })
    }
  }, [stampId, specimenId])

  useEffect(() => {
    if (!specimenId) return
    supabase!
      .from('stamp_images')
      .select('*')
      .eq('specimen_id', specimenId)
      .order('created_at')
      .then(({ data }) => setImages((data as StampImage[]) ?? []))
  }, [specimenId, imagesVersion])

  const backTo = `/znaczek/${stampId}`

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = new Validator()
    const parsed = validateSpecimen(draft, v)
    if (v.errors.length > 0) {
      setErrors(v.errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors([])
    setBusy(true)
    try {
      const savedId = await saveSpecimen(stampId!, draft, parsed, stamp?.country_iso ?? null, existing ?? undefined)
      const failed = await uploadPending(newImages, stampId!, savedId)
      navigate(backTo, {
        state: {
          flash: isEdit ? 'Egzemplarz zaktualizowany.' : 'Egzemplarz dodany do kolekcji.',
          warning: failed.length > 0 ? `Nie udało się zapisać zdjęć: ${failed.join(', ')}.` : undefined,
        },
      })
    } catch (err) {
      setErrors([`Nie udało się zapisać: ${err instanceof Error ? err.message : 'nieznany błąd'}`])
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!existing) return
    setBusy(true)
    try {
      await deleteSpecimen(existing.id)
      navigate(backTo, { state: { flash: 'Egzemplarz usunięty.' } })
    } catch (err) {
      setErrors([`Nie udało się usunąć: ${err instanceof Error ? err.message : 'nieznany błąd'}`])
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  if (!stamp || (isEdit && !existing)) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={backTo} className="btn btn-ghost -ml-2 mb-4 px-2 text-sm text-muted">
        <ArrowLeft size={16} /> {stamp.name}
      </Link>
      <PageHeader
        eyebrow={isEdit ? 'Edycja egzemplarza' : 'Nowy egzemplarz'}
        title={isEdit ? <span className="font-mono">{existing?.inventory_number ?? 'Egzemplarz'}</span> : 'Dodaj egzemplarz'}
        description={isEdit ? undefined : `Kolejny egzemplarz pozycji „${stamp.name}”.`}
      />
      <form onSubmit={submit} className="space-y-6">
        <FormErrors errors={errors} />

        <Section step="1" title="Egzemplarz">
          <SpecimenFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} albums={albums} />
        </Section>

        <Section step="2" title="Skany egzemplarza" hint="Zdjęcia tego konkretnego egzemplarza, np. stempla lub wad.">
          {images.length > 0 && (
            <div className="rounded-xl bg-paper-200/40 px-6 py-8">
              <ImageGallery
                images={images}
                alt={stamp.name}
                onChanged={() => setImagesVersion((n) => n + 1)}
                onError={(m) => setErrors([m])}
              />
            </div>
          )}
          {/* Zdjęcie główne pozycji ustawia się w katalogu, skany egzemplarza go nie przejmują. */}
          <ImagePicker
            value={newImages}
            onChange={setNewImages}
            onReject={(m) => setErrors((list) => [...list, m])}
            hasExistingPrimary
          />
        </Section>

        <FormActions>
          {isEdit && (
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className="btn btn-danger-link mr-auto">
              <Trash2 size={16} /> Usuń egzemplarz
            </button>
          )}
          <Link to={backTo} className="btn btn-ghost">
            Anuluj
          </Link>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? 'Zapisywanie…' : isEdit ? 'Zapisz zmiany' : 'Dodaj egzemplarz'}
          </button>
        </FormActions>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć ten egzemplarz?"
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      >
        Egzemplarz zniknie z kolekcji razem ze skanami i historią wycen. Pozycja w katalogu zostaje.
      </ConfirmDialog>
    </div>
  )
}
