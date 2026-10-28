# Mój Katalog Filatelistyczny — wskazówki dla Claude

Język: interfejs, komentarze w kodzie i dokumentacja po polsku. Użytkownik pisze po polsku i nie jest programistą — wyjaśniaj prosto, kroki w panelach (Supabase, home.pl, GitHub) opisuj pole po polu.

- Strona: https://filatelistyka.com (GitHub Pages, własna domena) · repozytorium: https://github.com/czarnikrobert/katalog-filatelistyczny (publiczne — sam kod, dane są w Supabase).
- Szkic i założenia projektu: `docs/plan-projektu.md`.

## Najważniejsze zasady modelu danych

- `stamps` = **katalog ogólny** (pozycja/emisja/odmiana). Może istnieć bez żadnego egzemplarza — tak powstaje lista brakujących.
- `specimens` = **mój fizyczny egzemplarz**. Jeden rekord na jeden fizyczny znaczek. Własny numer `inventory_number` (`PL-000001`…, nadawany automatycznie z kodu kraju) jest niezależny od numeru katalogowego.
- Numery katalogowe zawsze jako `text`, system domyślnie **Fischer**. Główny numer w `stamps.catalog_number`, numery z innych katalogów w `stamp_catalog_numbers`.
- Odmiany: osobne pozycje z literą/cyfrą rzymską w numerze (`347-a`, `420A`, `5494I`). Gdy użytkownik ma w katalogu numer bazowy (`5431`), **nie dokładaj** obok odmian z innych źródeł (`5431A`, `5431B`) — to byłyby duble. `stamps.variant_of_id` istnieje, ale nie ma jeszcze UI.
- Emisja = seria (`series`) albo pojedynczy znaczek bez serii wydany danego dnia — grupowanie w `lib/issues.ts` (`groupIntoIssues`).
- Nazwy znaczków: `„Seria — temat”`, a gdy razem > 90 znaków — sam temat (seria widoczna w polu „Seria”).
- Nominał liczbowy w `face_value` + `currency` (`zł`, kwoty w złotych: 40 gr = 0.40). Nominał literowy/tekstowy (`A`, `B`, `Priorytetowy S`) zapisany w opisie jako linia `Nominał: …` — do wyświetlania używaj `nominalLabel()` z `lib/format.ts`.
- Wartości wyliczeniowe trzymane jako kody bez polskich znaków (`okolicznosciowy`, `w_kolekcji`); polskie etykiety w `src/lib/labels.ts`.
- `stamp_overview` (widok, `security_invoker`) — katalog + nazwa kraju/serii/tematu + `country_iso` + `owned_count` + `primary_thumb_path`. Front czyta listy z tego widoku.
- Kolejność katalogowa: `catalogOrder` z `lib/stamps.ts` (rok → data → numer sortowany „po ludzku”). Kolumna `catalog_number` jako tekst sortuje się źle (`1841` < `339`), więc listy sortuj po stronie klienta.
- Supabase zwraca max 1000 wierszy — do pełnych list używaj `fetchAll()` z `lib/fetchAll.ts`.

## Skąd są dane (stan 2026-10-28)

- W bazie: **2145 pozycji** katalogu (roczniki 1944–1948, 1970–1990, 2019–2026), 840+ serii, **755 egzemplarzy** użytkownika, 2145 zdjęć katalogowych (każda pozycja ma zdjęcie główne). Zawsze sprawdzaj aktualne liczby zapytaniem — użytkownik dodaje dane sam.
- **521 pozycji 1982–1990 (2644–3157, 209 emisji) z kzp.pl (2026-10-28)** — na prośbę użytkownika numery, daty, nazwy emisji, nominały i **opisy** („Na znaczku przedstawiono…” → `description`, jak w danych z arkusza). Nakładów, techniki druku, ząbkowania i projektantów nie pobierano. Bloki (Fi: Blok NN) pominięte, jak w pozostałych latach — znaczki z bloków są (np. 2695). Odmiany jako osobne pozycje (`2768I`/`2768II`, `3124a`/`3124b`). Każda emisja = osobna seria (nazwa z kzp, `issue_year`). Nazwy: temat z opisu przepisany ręcznie na mianownik (opis z kzp jest w bierniku); emisje bez opisu dla poszczególnych znaczków (np. ikony z Łańcuta) mają samą nazwę emisji.
- Zdjęcia 1982–1990: kzp.pl ma dla tych lat tylko małe grafiki (~90 px, większych brak — zapowiedzi emisji są dopiero od nowszych lat). Wgrane są **grafiki powiększone ok. 3–4×** (Core Image: Lanczos + wyostrzenie), dłuższy bok < 400 px — więc tryb „usuń zdjęcia < 400 px” w `/skany` zastąpi je skanami użytkownika.
- 1521 pozycji z arkusza użytkownika „Znaczki spis-roczniki.xls” (roczniki 1944–1948, 1970–1981, 2019–2025); **zielona czcionka = posiadane** → 755 egzemplarzy `PL-000001…PL-000755` z notatką „Zaimportowano z arkusza…”. Kraj: do 1989 „Polska Ludowa (PRL)”, od 1990 „Polska”.
- 103 pozycje 2025 (5451–5493) i 2026 (5494–5526) oraz **wszystkie grafiki** — z kzp.pl (Katalog Znaków Pocztowych, Marek Jedziniak) **za zgodą autora**, obejmującą zdjęcia i dane (nazwy, numery, daty, nominały). Opisy („Na znaczku przedstawiono…”) użytkownik zatwierdził 2026-10-28; innych materiałów z kzp.pl (nakłady, technika druku, projektanci, teksty o emisji) nie pobieraj bez potwierdzenia. Pobieraj spokojnie (przerwy między żądaniami).
- Grafiki z kzp.pl są małe (~80–150 px) — `StampThumb` powiększa obraz najwyżej 2×, a `ImageGallery` pokazuje link do oryginału tylko dla zdjęć ≥ 400 px.
- 402 znaczki z 2019–2026 mają duże zdjęcia (~500–1000 px) ze stron zapowiedzi emisji kzp.pl, dopasowane do znaczków porównaniem obrazów z małą grafiką. Lata 1944–1981 i część 2019–2026 — tylko małe grafiki; większe ma dać użytkownik skanami (`/skany`). Wikimedia Commons sprawdzone 2026-10-27: ok. 50 plików na wszystkie roczniki — nieprzydatne.

## Bezpieczeństwo

- **Decyzja (2026-10-23, zastępuje prywatny katalog z 2026-10-22): katalog ogólny jest publiczny (tylko odczyt), kolekcja prywatna.** Migracja `0002_publiczny_katalog.sql`: rola `anon` czyta `countries`, `themes`, `series`, `stamps`, `stamp_catalog_numbers` oraz zdjęcia katalogowe (`stamp_images.specimen_id is null`) i ich pliki w Storage. `specimens`, `valuations`, `storage_locations`, skany egzemplarzy i wszelkie zapisy — tylko właściciel.
- Informację o posiadaniu (`owned_count`, „×1 / brak”, kolory posiadane/brakujące, filtry posiadania, egzemplarze) pokazuj tylko przy `session` — dla gościa `owned_count` zawsze wynosi 0, a `StampCard`/`StampThumb` dostają `isOwner`/`missing` tylko dla właściciela.
- Grafiki z kzp.pl — podpis w stopce `Layout` musi zostać.
- Każda tabela ma RLS z warunkiem `owner_id = auth.uid()`; `owner_id` ma domyślnie `auth.uid()`, więc front go nie wysyła.
- Zdjęcia: prywatny bucket `stamp-images`, ścieżka `{owner_id}/{stamp_id}/{uuid}.{ext}` + miniatura `{uuid}_min.jpg` (`thumb_path`), wyświetlane przez podpisane URL-e (`useSignedUrls`). Logika w `src/lib/images.ts`; `specimen_id = null` → zdjęcie katalogowe, ustawione → skan egzemplarza.
- Usuwanie: najpierw pliki w Storage, potem wiersze (kaskada nie usuwa plików) — patrz `deleteStamp`, `deleteSpecimen`.
- Nowe tabele/polityki: zawsze `owner_id` + RLS w nowej migracji `supabase/migrations/000N_*.sql`. Migracje uruchamia **użytkownik** w Supabase → SQL Editor (skopiuj plik do schowka `pbcopy`, poproś o wynik kontrolny). Uruchomione: `0001_schema.sql`, `seed.sql`, `0002_publiczny_katalog.sql`. Po zmianie uprawnień sprawdź dostęp gościa `curl` z kluczem publicznym (REST + podpisywanie plików Storage).
- Tylko klucz publiczny Supabase w froncie (`VITE_SUPABASE_ANON_KEY`); `.env.local` jest w `.gitignore`.
- Reset hasła: klient Supabase w trybie PKCE, link z maila wraca na `…/?reset=1` → `ResetPasswordPage` (poza routerem). W Supabase → URL Configuration: Site URL `https://filatelistyka.com`, Redirect URLs dla domeny, github.io i `http://localhost:5173/**`.

## Trasy i ekrany

- Publiczne: `/` (gość: Roczniki, właściciel: Pulpit — `HomePage`), `/roczniki`, `/rocznik/:year` (emisje obok siebie przez `grid-cols-subgrid`), `/katalog` (filtry: fraza, rok, kraj, sortowanie; widok galerii/tabeli; paginacja 48). Fraza (`lib/search.ts`): każde słowo musi wystąpić w nazwie, opisie, nazwie emisji albo numerze; słowo-numer (`2645`, `2768II`, `347-a`, „2580 I”) dopasowuje numer dokładnie z odmianami (`imatch`), nie „po kawałku”. Gdy słowo jest tylko w opisie, karta pokazuje fragment opisu. Bez odmiany wyrazów i bez ignorowania polskich znaków — „Banach” znajdzie „Banacha”, ale „Lodz” nie znajdzie „Łódź”, `/znaczek/:id`.
- Właściciel (`RequireAuth`): `/kolekcja`, `/klasery`, `/brakujace` (okres od–do, tryb „rozpoczęte emisje”, druk i CSV), `/skany` (hurtowe wgrywanie skanów), `/dodaj`, `/znaczek/:id/edytuj`, `/znaczek/:id/egzemplarz/nowy|:specimenId`.
- Karta znaczka (właściciel): szybkie dodawanie zdjęć `QuickImageDrop` (przeciągnij / plik / ⌘V — pierwsze = awers główne, potem rewers, detale) i „Następny bez zdjęcia” (`findNextWithoutImage`). Komponent jest kluczowany `id`, żeby przejście do innego znaczka zerowało stan.
- Skany (`ScansPage`, `lib/scans.ts`): nazwa pliku = numer Fischera (`1841.jpg` awers, `1841_r.jpg` rewers, inny dopisek po `_`/spacji = detal; `347-a`, `420A`, `2580 I` = odmiany). Tryb „zdjęcie w katalogu” (awers = główne, opcjonalnie usuwa zdjęcia katalogowe < 400 px, czyli stare grafiki kzp.pl) albo „skan mojego egzemplarza” (prywatny, przy pierwszym egzemplarzu). Przed wgraniem tabela dopasowań; numery występujące kilka razy (np. 4949) są pomijane.
- Menu: na komputerze pełne; dolne menu na telefonie max 5 pozycji (pozycje z `desktopOnly` tylko na komputerze).

## Konwencje frontu

- Formularze: stan jako tekst, konwersja i walidacja przy zapisie przez `Validator` z `src/lib/parse.ts` (przecinek dziesiętny dozwolony). Komunikat po zapisie przekazywany w `navigate(..., { state: { flash, warning } })`.
- Wycena egzemplarza: zmiana `estimated_value` dopisuje wiersz do `valuations` (`saveSpecimen`).
- Routing: `HashRouter` (GitHub Pages), polskie ścieżki. Kotwice na stronie przewijaj `scrollIntoView` — `#` w adresie należy do routera.
- Style: Tailwind v4, system wizualny w `src/index.css`: rampy `paper-50…900` (jedyna neutralna), `navy-*` (akcent marki), `gold-*` (wyróżnienia); aliasy `ink`/`muted`/`subtle` (3 kolory tekstu), `line`, `card`; cienie `shadow-e1…e5` wg osi Z; `rounded-xl` kontenery, `rounded-lg` kontrolki; easing `ease-out-expo`, animacje `animate-rise`, `.skeleton`.
- Klasy: `btn` + `btn-primary` (jeden na widok) / `btn-secondary` / `btn-ghost` / `btn-danger-link` (usuwanie poza dialogiem), `input`, `card`, `eyebrow`, `perforated` + `stamp-shadow` (ząbkowany znaczek). Klasy Tailwinda zawsze dosłownie (np. tablica `ISSUE_SPAN`), nie składane ze zmiennych.
- Wydruk: warianty `print:` (`print:hidden` dla menu/stopki/przycisków, `hidden print:block` dla nagłówka wydruku) + reguły `@media print` w `index.css` (A4, białe tło, bez animacji i cieni). Grupy nie łamią się między stronami: `break-inside-avoid`.
- Eksport: `downloadCsv()` z `lib/csv.ts` (średnik + BOM — polski Excel).
- Fonty: Geist (UI), Geist Mono (liczby, numery), Fraunces tylko w tytułach (charakter katalogu). Ikony Lucide, `strokeWidth` 1.75 globalnie (`LucideProvider` w `App.tsx`).
- Komponenty wspólne: `components/ui.tsx` (`PageHeader`, `EmptyState`, `Notice`, `Skeleton`, `StampGridSkeleton`, `Pill`, `Logo`), `StampCard`, `StampThumb`, `ImageGallery` (`readOnly` dla gościa), `ConfirmDialog` (zamiast `window.confirm`), `form.tsx` (`Section`, `FieldGroup`, `Field`, `FormActions`, `SectionNav`).
- Każdy ekran ma stan ładowania (szkielet), pusty i błędu. Liczniki odmieniaj przez `plural()` z `lib/format.ts`, daty i kwoty przez `formatDate()` / `formatMoney()`.
- Wartości zależne od czasu (np. dzisiejsza data) licz poza renderem (stała modułu) — oxlint zgłasza `react(purity)`.

## Sprawdzanie i testy

- `npm run build` (tsc + vite) i `npm run lint` (oxlint) muszą przechodzić bez ostrzeżeń.
- Podgląd: `.claude/launch.json` → serwer `katalog-dev` (port 5173). Panel przeglądarki często traci sesję — przy ekranach właściciela poproś użytkownika o zalogowanie (nigdy nie wpisuj jego hasła). Widok gościa testuj na `http://127.0.0.1:5173` (inna domena = brak sesji).
- Testy na prawdziwej bazie: dane testowe nazywaj `TEST…` / `PRZYKŁAD…` i usuwaj po teście (także pliki w Storage i osierocone serie/klasery). Jeśli test podmienia lub usuwa prawdziwe zdjęcie, najpierw pobierz oryginał (podpisany URL) i po teście wgraj go z powrotem jako awers główny; na koniec porównaj liczbę wierszy `stamp_images` z liczbą sprzed testu. Importy i wgrywanie zdjęć rób w karcie zalogowanego właściciela (moduły `/src/lib/*.ts` przez dynamiczny `import()`), długie operacje w tle z postępem w `window.__…`. Pliki do importu podawaj stronie przez tymczasowy `public/_import/` (usuń po imporcie). Import pisz jako wznawialny (pomija istniejące numery, dogrywa brakujące zdjęcia) i **w trakcie nie edytuj plików projektu** — 2026-10-28 karta przeładowała się w połowie importu zaraz po edycji CLAUDE.md, a przerwany zapis zostawił osierocone pliki w Storage (po imporcie porównaj pliki w folderach znaczków z `stamp_images`).

## Publikacja

- Push na `main` → GitHub Actions „Publikacja na GitHub Pages” → https://filatelistyka.com (ok. 30 s). Commit i push **tylko na prośbę użytkownika**; przed commitem sprawdź `git grep --cached` pod kątem kluczy i prywatnych adresów.
- Autor commitów w tym repo: `Robert Czarnik <105284724+czarnikrobert@users.noreply.github.com>` (repo publiczne — bez Gmaila).
- Zmienne Actions (repo variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Domena w home.pl: 4 rekordy A na IP GitHub Pages (`185.199.108–111.153`) + CNAME `www` → `czarnikrobert.github.io`; HTTPS wymuszone w ustawieniach Pages.
- Na Macu nie ma Homebrew ani globalnego `gh` — w razie potrzeby pobierz oficjalne wydanie `gh` (sprawdź sumę kontrolną) do folderu tymczasowego. Użytkownik jest zalogowany (`czarnikrobert`, token w pęku kluczy macOS), więc świeżo pobrany `gh` działa od razu; `git push` też działa bez dodatkowego logowania. Gdyby logowanie wygasło: `gh auth login --web --scopes workflow` uruchamia użytkownik w terminalu.
- Postęp publikacji: `gh run watch <id> --exit-status`, potem sprawdź, że nowy plik `assets/index-*.js` na filatelistyka.com zawiera nowy tekst z interfejsu.

## Otwarte sprawy (do zaproponowania, gdy będzie okazja)

- Większe zdjęcia dla 1944–1981 i ok. 289 znaczków 2019–2026: czekamy na skany użytkownika (`/skany`); alternatywa — prośba do autora kzp.pl o większe pliki.
- Numer 4949 występuje w katalogu dwa razy (literówka w arkuszu) — do poprawy przez użytkownika.
- Część nazw z kzp.pl 2025–2026 jest w bierniku („Owoce naszych sadów — Malinę Polkę”) — kandydat do poprawy hurtowej za zgodą użytkownika.
- `stamps.variant_of_id` bez interfejsu (wybór „odmiana znaczka …”).
- Bloki (Fischer „Blok NN”) nie są osobnymi pozycjami w żadnym roczniku — ewentualne dodanie (np. `stamp_type = 'blok'`, grafiki `fs….jpg` z kzp.pl) do decyzji użytkownika.
- Brak lat 1949–1969 i 1991–2018. Dla 1982–1990 na kzp.pl są jeszcze nakłady, technika druku, ząbkowanie i projektanci (pola `print_run`, `printing_method`, `perforation`, `designer`) — pobrać tylko za zgodą użytkownika.
- README.md („Stan prac”, „Struktura”) jest nieaktualne względem CLAUDE.md.
- GitHub Actions ostrzega o Node 20 w akcjach v4 — zaktualizować wersje akcji przy okazji.
- Strona ma `noindex` w `index.html` — zmiana tylko na wyraźną prośbę (wyszukiwarki).
- Reset hasła nie był testowany od początku do końca (wymaga maila użytkownika).
