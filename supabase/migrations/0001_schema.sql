-- =====================================================================
-- Mój Katalog Filatelistyczny — schemat bazy (Supabase / PostgreSQL)
--
-- Dwie warstwy danych:
--   1. KATALOG OGÓLNY  — countries, series, themes, stamps, stamp_catalog_numbers
--      Opis emisji niezależny od tego, czy znaczek jest w kolekcji.
--      Katalog może zawierać znaczki, których nie posiadam (lista brakujących).
--   2. MOJA KOLEKCJA   — storage_locations, specimens, valuations
--      Konkretne fizyczne egzemplarze, zawsze prywatne.
--   stamp_images obsługuje obie warstwy: specimen_id = null → zdjęcie katalogowe,
--   specimen_id ustawione → skan mojego egzemplarza.
--
-- Uruchom w Supabase: SQL Editor → wklej całość → Run.
-- =====================================================================

-- Supabase trzyma rozszerzenia w schemacie extensions.
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Funkcja pomocnicza: automatyczna aktualizacja updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 1. KATALOG OGÓLNY
-- =====================================================================

create table public.countries (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  iso_code    text,                      -- np. PL, DE; opcjonalnie dla terytoriów historycznych
  period      text,                      -- np. "1918–1939", "Generalna Gubernia 1939–1945"
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.themes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.series (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  country_id  uuid not null references public.countries (id) on delete restrict,
  name        text not null,
  issue_year  integer check (issue_year between 1840 and 2100),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.stamps (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  country_id       uuid not null references public.countries (id) on delete restrict,
  issue_date       date,
  issue_year       integer check (issue_year between 1840 and 2100),
  -- Główny numer katalogowy (zwykle Fischer). Zawsze tekst: prefiksy, litery, ukośniki, zera wiodące.
  catalog_number   text,
  catalog_system   text,
  series_id        uuid references public.series (id) on delete set null,
  theme_id         uuid references public.themes (id) on delete set null,
  -- Odmiana: wskazuje znaczek podstawowy, którego ten rekord jest odmianą.
  variant_of_id    uuid references public.stamps (id) on delete set null,
  stamp_type       text check (stamp_type in (
                     'obiegowy', 'okolicznosciowy', 'lotniczy', 'dobroczynny',
                     'doplata', 'sluzbowy', 'blok', 'arkusik', 'calostka', 'inny')),
  face_value       numeric(12, 2),
  currency         text,
  color            text,
  perforation      text,
  width_mm         numeric(6, 2),
  height_mm        numeric(6, 2),
  printing_method  text,
  watermark        text,
  designer         text,
  print_run        bigint,               -- nakład
  description      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (issue_date is null or issue_year is null or extract(year from issue_date) = issue_year)
);

-- Dodatkowe numery w innych katalogach (Michel, Scott, Yvert...) dla tej samej pozycji.
create table public.stamp_catalog_numbers (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stamp_id        uuid not null references public.stamps (id) on delete cascade,
  catalog_system  text not null,
  catalog_number  text not null,
  unique (stamp_id, catalog_system)
);

-- =====================================================================
-- 2. MOJA KOLEKCJA
-- =====================================================================

create table public.storage_locations (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  album_name     text not null,          -- np. "Klaser Polska 1945–1989"
  page_number    integer,
  pocket_number  integer,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.specimens (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stamp_id                  uuid not null references public.stamps (id) on delete restrict,
  -- Własny numer egzemplarza, np. PL-000001 (niezależny od numeru katalogowego).
  inventory_number          text,
  condition                 text check (condition in ('bardzo_dobry', 'dobry', 'sredni', 'uszkodzony')),
  gum_status                text check (gum_status in ('oryginalna', 'bez_gumy', 'podlepka', 'nie_dotyczy', 'nieznany')),
  cancellation_type         text check (cancellation_type in ('czysty', 'stemplowany', 'kasownik_specjalny')),
  purchase_date             date,
  purchase_price            numeric(12, 2) check (purchase_price >= 0),
  purchase_currency         text,
  purchase_source           text,
  estimated_value           numeric(12, 2) check (estimated_value >= 0),
  estimated_value_currency  text,
  storage_location_id       uuid references public.storage_locations (id) on delete set null,
  collection_status         text not null default 'w_kolekcji'
                              check (collection_status in ('w_kolekcji', 'na_wymiane', 'na_sprzedaz')),
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (owner_id, inventory_number)
);

create table public.valuations (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  specimen_id     uuid not null references public.specimens (id) on delete cascade,
  valuation_date  date not null default current_date,
  amount          numeric(12, 2) not null check (amount >= 0),
  currency        text not null default 'PLN',
  source          text check (source in ('katalog', 'aukcja', 'ekspert', 'wlasna')),
  notes           text,
  created_at      timestamptz not null default now()
);

create table public.stamp_images (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stamp_id      uuid not null references public.stamps (id) on delete cascade,
  specimen_id   uuid references public.specimens (id) on delete cascade,
  image_type    text not null default 'awers' check (image_type in ('awers', 'rewers', 'detal')),
  storage_path  text not null unique,    -- {owner_id}/{stamp_id}/{plik}
  thumb_path    text,                    -- pomniejszona kopia do galerii (JPEG ~480 px)
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Najwyżej jedno zdjęcie główne na pozycję katalogową.
create unique index stamp_images_one_primary
  on public.stamp_images (stamp_id) where is_primary;

-- ---------------------------------------------------------------------
-- Triggery updated_at
-- ---------------------------------------------------------------------
create trigger series_updated_at before update on public.series
  for each row execute function public.set_updated_at();
create trigger stamps_updated_at before update on public.stamps
  for each row execute function public.set_updated_at();
create trigger storage_locations_updated_at before update on public.storage_locations
  for each row execute function public.set_updated_at();
create trigger specimens_updated_at before update on public.specimens
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Indeksy wyszukiwania
-- ---------------------------------------------------------------------
create index stamps_name_trgm on public.stamps using gin (name extensions.gin_trgm_ops);
create index stamps_catalog_number_trgm on public.stamps using gin (catalog_number extensions.gin_trgm_ops);
create index stamps_country_year on public.stamps (country_id, issue_year);
create index stamps_series on public.stamps (series_id);
create index stamps_theme on public.stamps (theme_id);
create index stamp_catalog_numbers_number on public.stamp_catalog_numbers (catalog_number);
create index specimens_stamp on public.specimens (stamp_id);
create index specimens_location on public.specimens (storage_location_id);
create index valuations_specimen on public.valuations (specimen_id, valuation_date desc);
create index stamp_images_stamp on public.stamp_images (stamp_id);

-- ---------------------------------------------------------------------
-- Widok katalogu z informacją o posiadaniu (lista brakujących = owned_count = 0)
-- security_invoker: widok respektuje RLS zalogowanego użytkownika.
-- ---------------------------------------------------------------------
create view public.stamp_overview
with (security_invoker = true)
as
select
  s.*,
  c.name  as country_name,
  c.iso_code as country_iso,
  se.name as series_name,
  t.name  as theme_name,
  (select count(*) from public.specimens sp where sp.stamp_id = s.id)            as owned_count,
  (select coalesce(img.thumb_path, img.storage_path) from public.stamp_images img
     where img.stamp_id = s.id
     order by img.is_primary desc, img.created_at
     limit 1)                                                                     as primary_thumb_path
from public.stamps s
join public.countries c on c.id = s.country_id
left join public.series se on se.id = s.series_id
left join public.themes t  on t.id = s.theme_id;

-- =====================================================================
-- 3. BEZPIECZEŃSTWO — Row Level Security
-- Każda tabela: dostęp wyłącznie dla właściciela rekordu (owner_id = auth.uid()).
-- Niezalogowany użytkownik (rola anon) nie widzi nic.
--
-- Jeśli kiedyś katalog ogólny ma być publiczny (tylko do odczytu), wystarczy
-- dodać polityki "for select to anon using (true)" dla tabel katalogowych —
-- patrz plik 0002_public_catalog.sql.example. Tabele kolekcji zostają prywatne.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'countries', 'themes', 'series', 'stamps', 'stamp_catalog_numbers',
    'storage_locations', 'specimens', 'valuations', 'stamp_images'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: właściciel czyta" on public.%1$I for select to authenticated using (owner_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: właściciel dodaje" on public.%1$I for insert to authenticated with check (owner_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: właściciel edytuje" on public.%1$I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: właściciel usuwa" on public.%1$I for delete to authenticated using (owner_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- =====================================================================
-- 4. STORAGE — prywatny bucket na zdjęcia
-- Ścieżka pliku: {owner_id}/{stamp_id}/{nazwa}. Pierwszy segment = właściciel.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stamp-images', 'stamp-images', false, 20971520,
        array['image/jpeg', 'image/png', 'image/webp', 'image/tiff'])
on conflict (id) do nothing;

create policy "stamp-images: właściciel czyta" on storage.objects
  for select to authenticated
  using (bucket_id = 'stamp-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "stamp-images: właściciel przesyła" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'stamp-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "stamp-images: właściciel podmienia" on storage.objects
  for update to authenticated
  using (bucket_id = 'stamp-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "stamp-images: właściciel usuwa" on storage.objects
  for delete to authenticated
  using (bucket_id = 'stamp-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
