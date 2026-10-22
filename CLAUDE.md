# Mój Katalog Filatelistyczny — wskazówki dla Claude

Język: interfejs, komentarze w kodzie i dokumentacja po polsku.

## Najważniejsze zasady modelu danych

- `stamps` = **katalog ogólny** (pozycja/emisja/odmiana). Może istnieć bez żadnego egzemplarza — tak powstaje lista brakujących.
- `specimens` = **mój fizyczny egzemplarz**. Jeden rekord na jeden fizyczny znaczek. Własny numer `inventory_number` (np. `PL-000001`) jest niezależny od numeru katalogowego.
- Numery katalogowe zawsze jako `text`. Główny numer w `stamps.catalog_number`, numery z innych katalogów w `stamp_catalog_numbers`.
- Odmiany: `stamps.variant_of_id` wskazuje znaczek podstawowy.
- Wartości wyliczeniowe trzymane jako kody bez polskich znaków (`okolicznosciowy`, `w_kolekcji`); polskie etykiety w `src/lib/labels.ts`.
- `stamp_overview` (widok, `security_invoker`) — katalog + nazwa kraju/serii/tematu + `owned_count` + ścieżka głównego zdjęcia. Front czyta listy z tego widoku.

## Bezpieczeństwo

- **Decyzja (2026-10-22): cała aplikacja, łącznie z katalogiem ogólnym, jest prywatna** — dostęp tylko po zalogowaniu. Nie dodawać polityk dla roli `anon`; plik `0002_public_catalog.sql.example` zostaje nieużywany.
- Każda tabela ma RLS z warunkiem `owner_id = auth.uid()`; `owner_id` ma domyślnie `auth.uid()`, więc front go nie wysyła.
- Zdjęcia: prywatny bucket `stamp-images`, ścieżka `{owner_id}/{stamp_id}/{uuid}.{ext}` + miniatura `{uuid}_min.jpg` (`thumb_path`), wyświetlane przez podpisane URL-e (`useSignedUrls`). Logika w `src/lib/images.ts`; `specimen_id = null` → zdjęcie katalogowe, ustawione → skan egzemplarza.
- Usuwanie: najpierw pliki w Storage, potem wiersze (kaskada nie usuwa plików) — patrz `deleteStamp`, `deleteSpecimen`.
- Nowe tabele: zawsze `owner_id` + RLS w nowej migracji `supabase/migrations/000N_*.sql`.
- Tylko klucz publiczny Supabase w froncie (`VITE_SUPABASE_ANON_KEY`).

## Konwencje frontu

- Formularze: stan jako tekst, konwersja i walidacja przy zapisie przez `Validator` z `src/lib/parse.ts` (przecinek dziesiętny dozwolony). Komunikat po zapisie przekazywany w `navigate(..., { state: { flash, warning } })`.
- Wycena egzemplarza: zmiana `estimated_value` dopisuje wiersz do `valuations` (`saveSpecimen`).
- Routing: `HashRouter` (GitHub Pages), polskie ścieżki (`/katalog`, `/znaczek/:id`).
- Style: Tailwind v4, system wizualny w `src/index.css`: rampy `paper-50…900` (jedyna neutralna), `navy-*` (akcent marki), `gold-*` (wyróżnienia); aliasy `ink`/`muted`/`subtle` (3 kolory tekstu), `line`, `card`; cienie `shadow-e1…e5` wg osi Z; `rounded-xl` kontenery, `rounded-lg` kontrolki; easing `ease-out-expo`, animacje `animate-rise`, `.skeleton`.
- Klasy: `btn` + `btn-primary` (jeden na widok) / `btn-secondary` / `btn-ghost` / `btn-danger-link` (usuwanie poza dialogiem), `input`, `card`, `eyebrow`, `perforated` + `stamp-shadow` (ząbkowany znaczek).
- Fonty: Geist (UI), Geist Mono (liczby, numery), Fraunces tylko w tytułach (charakter katalogu). Ikony Lucide, `strokeWidth` 1.75 globalnie (`LucideProvider` w `App.tsx`).
- Komponenty wspólne: `components/ui.tsx` (`PageHeader`, `EmptyState`, `Notice`, `Skeleton`, `Pill`, `Logo`), `StampThumb`, `ConfirmDialog` (zamiast `window.confirm`), `form.tsx` (`Section`, `FieldGroup`, `Field`, `FormActions`, `SectionNav`).
- Każdy ekran ma stan ładowania (szkielet), pusty i błędu. Liczniki odmieniaj przez `plural()` z `lib/format.ts`.
- Sprawdzanie: `npm run build` (tsc + vite) i `npm run lint` (oxlint) muszą przechodzić bez ostrzeżeń.
