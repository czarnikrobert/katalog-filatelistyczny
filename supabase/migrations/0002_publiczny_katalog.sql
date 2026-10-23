-- =====================================================================
-- Publiczny katalog (tylko odczyt) — decyzja z 2026-10-23.
--
-- Bez logowania (rola anon) można przeglądać:
--   - katalog ogólny: countries, themes, series, stamps, stamp_catalog_numbers,
--   - zdjęcia katalogowe (stamp_images z specimen_id = null) i ich pliki w Storage.
-- Pozostaje prywatne (tylko właściciel):
--   - kolekcja: specimens, valuations, storage_locations,
--   - skany egzemplarzy (stamp_images ze specimen_id),
--   - wszelkie zmiany — anon nie ma polityk insert/update/delete.
--
-- Skrypt można uruchomić ponownie (najpierw usuwa swoje polityki).
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array['countries', 'themes', 'series', 'stamps', 'stamp_catalog_numbers']
  loop
    execute format('drop policy if exists "%1$s: publiczny odczyt" on public.%1$I', t);
    execute format('create policy "%1$s: publiczny odczyt" on public.%1$I for select to anon using (true)', t);
  end loop;
end;
$$;

drop policy if exists "stamp_images: publiczny odczyt zdjęć katalogowych" on public.stamp_images;
create policy "stamp_images: publiczny odczyt zdjęć katalogowych" on public.stamp_images
  for select to anon
  using (specimen_id is null);

-- Pliki: anon może podpisać/odczytać tylko pliki należące do zdjęć katalogowych.
create index if not exists stamp_images_thumb_path on public.stamp_images (thumb_path);

drop policy if exists "stamp-images: publiczny odczyt zdjęć katalogowych" on storage.objects;
create policy "stamp-images: publiczny odczyt zdjęć katalogowych" on storage.objects
  for select to anon
  using (
    bucket_id = 'stamp-images'
    and exists (
      select 1 from public.stamp_images i
      where i.specimen_id is null
        and (i.storage_path = storage.objects.name or i.thumb_path = storage.objects.name)
    )
  );

-- Kontrola: powinno pokazać 7 polityk publicznego odczytu.
select count(*) as polityki_publiczne
from pg_policies
where policyname like '%publiczny odczyt%';
