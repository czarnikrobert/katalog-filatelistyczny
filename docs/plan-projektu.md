# Mój Katalog Filatelistyczny
## Szczegółowy projekt aplikacji

**Wersja dokumentu:** 1.0  
**Cel:** prywatny katalog znaczków pocztowych, przede wszystkim polskich, dostępny przez przeglądarkę.

---

## 1. Założenia projektu

- Aplikacja przeznaczona dla jednego, prywatnego użytkownika.
- Kolekcja obejmuje głównie znaczki polskie, z możliwością dodawania znaczków zagranicznych.
- Znaczki dodawane są ręcznie przez formularz.
- Interfejs jest hostowany na GitHub Pages.
- Dane i zdjęcia przechowywane są w prywatnym backendzie.
- Aplikacja powinna być responsywna i działać na komputerze, tablecie oraz telefonie.

## 2. Architektura techniczna

| Element | Proponowana technologia | Zadanie |
|---|---|---|
| Hosting interfejsu | GitHub Pages | Publikowanie statycznej aplikacji |
| Frontend | React + TypeScript + Vite | Interfejs i logika po stronie przeglądarki |
| Logowanie | Supabase Auth | Uwierzytelnianie właściciela |
| Baza danych | Supabase PostgreSQL | Dane katalogowe i ewidencja kolekcji |
| Zdjęcia | Supabase Storage | Przechowywanie skanów i zdjęć |
| Styl interfejsu | Tailwind CSS | Responsywny wygląd |
| Ikony | Lucide | Ikony funkcji aplikacji |
| Publikacja | GitHub Actions | Automatyczne wdrażanie na GitHub Pages |

### Schemat działania

1. Użytkownik otwiera aplikację opublikowaną na GitHub Pages.
2. Loguje się przez Supabase Auth.
3. Frontend wysyła uwierzytelnione żądania do Supabase.
4. Polityki Row Level Security (RLS) kontrolują dostęp do rekordów.
5. Zdjęcia są przechowywane w prywatnym bucketcie Supabase Storage i udostępniane po autoryzacji.

**Ważne:** GitHub Pages hostuje tylko frontend statyczny. Nie jest serwerem aplikacyjnym i nie zabezpiecza samodzielnie bazy danych. W kodzie frontendu można umieścić klucz publiczny Supabase, ale nigdy klucz `service_role`, hasła administratora ani inne sekrety uprzywilejowane.

## 3. Model danych

Najważniejsza zasada: oddzielić **pozycję katalogową znaczka** od **konkretnego egzemplarza posiadanego w kolekcji**.

Przykładowo: jedna pozycja katalogowa może mieć trzy egzemplarze — czysty, stemplowany i uszkodzony. Dane emisji wpisuje się raz, a stan i informacje o każdym egzemplarzu prowadzi osobno.

### 3.1. Tabela `stamps` — pozycje katalogowe

Jeden rekord opisuje konkretny znaczek lub jego odmianę.

| Pole | Typ | Opis |
|---|---|---|
| `id` | UUID | Identyfikator techniczny |
| `name` | tekst | Nazwa znaczka |
| `country_id` | UUID | Kraj lub terytorium wydania |
| `issue_date` | data, opcjonalnie | Dokładna data emisji |
| `issue_year` | liczba całkowita, opcjonalnie | Rok emisji |
| `catalog_number` | tekst, opcjonalnie | Numer katalogowy |
| `catalog_system` | tekst, opcjonalnie | Np. Fischer, Michel, Scott, Yvert |
| `series_id` | UUID, opcjonalnie | Powiązana seria |
| `face_value` | liczba dziesiętna, opcjonalnie | Nominał |
| `currency` | tekst, opcjonalnie | Waluta nominału |
| `theme_id` | UUID, opcjonalnie | Tematyka |
| `stamp_type` | tekst, opcjonalnie | Rodzaj emisji |
| `perforation` | tekst, opcjonalnie | Ząbkowanie |
| `width_mm` | liczba, opcjonalnie | Szerokość w milimetrach |
| `height_mm` | liczba, opcjonalnie | Wysokość w milimetrach |
| `printing_method` | tekst, opcjonalnie | Technika druku |
| `watermark` | tekst, opcjonalnie | Znak wodny |
| `description` | tekst, opcjonalnie | Opis i ciekawostki |
| `created_at` | data i czas | Data utworzenia |
| `updated_at` | data i czas | Data ostatniej aktualizacji |

Numery katalogowe należy przechowywać jako tekst, nie jako liczby. Pozwoli to zachować prefiksy, litery, ukośniki i zera wiodące.

### 3.2. Tabela `specimens` — posiadane egzemplarze

Każdy rekord opisuje indywidualny egzemplarz.

| Pole | Typ | Opis |
|---|---|---|
| `id` | UUID | Identyfikator egzemplarza |
| `stamp_id` | UUID | Powiązanie z pozycją `stamps` |
| `owner_id` | UUID | Identyfikator właściciela z Supabase Auth |
| `condition` | tekst / enum | Stan zachowania |
| `gum_status` | tekst / enum | Stan gumy |
| `cancellation_type` | tekst / enum | Czysty, stemplowany, kasownik specjalny itp. |
| `purchase_date` | data, opcjonalnie | Data pozyskania |
| `purchase_price` | liczba dziesiętna, opcjonalnie | Cena zakupu |
| `purchase_currency` | tekst, opcjonalnie | Waluta ceny zakupu |
| `estimated_value` | liczba dziesiętna, opcjonalnie | Szacowana wartość |
| `estimated_value_currency` | tekst, opcjonalnie | Waluta wyceny |
| `storage_location_id` | UUID, opcjonalnie | Miejsce przechowywania |
| `collection_status` | tekst / enum | W kolekcji, na wymianę, na sprzedaż |
| `notes` | tekst, opcjonalnie | Notatki o egzemplarzu |
| `created_at` | data i czas | Data dodania |
| `updated_at` | data i czas | Data aktualizacji |

**Rekomendacja:** na początku przechowywać jeden rekord na każdy fizyczny egzemplarz. Dzięki temu każdy może mieć indywidualny stan, cenę i lokalizację. Pole ilości nie jest wtedy konieczne; można je dodać, jeśli później będzie potrzebna ewidencja grupowa identycznych egzemplarzy.

### 3.3. Tabela `stamp_images` — zdjęcia

| Pole | Typ | Opis |
|---|---|---|
| `id` | UUID | Identyfikator zdjęcia |
| `stamp_id` | UUID | Powiązanie z pozycją katalogową |
| `specimen_id` | UUID, opcjonalnie | Powiązanie z konkretnym egzemplarzem |
| `owner_id` | UUID | Właściciel zdjęcia |
| `image_type` | tekst / enum | Awers, rewers, detal |
| `storage_path` | tekst | Ścieżka pliku w prywatnym Storage |
| `is_primary` | boolean | Czy to główne zdjęcie |
| `created_at` | data i czas | Data dodania |

Oryginalne zdjęcia warto zachować w wysokiej jakości, a dla galerii generować mniejsze miniatury.

### 3.4. Tabele pomocnicze

| Tabela | Zawartość |
|---|---|
| `countries` | Nazwy krajów i terytoriów |
| `series` | Serie i emisje znaczków |
| `themes` | Tematy, np. przyroda, sport, historia, architektura |
| `storage_locations` | Klasery, albumy, strony i kieszonki |
| `valuations` | Historia wycen, daty i źródła wyceny |

Dane tożsamości użytkownika zapewnia Supabase Auth. W rekordach prywatnych warto przechowywać `owner_id`, aby polityki dostępu mogły weryfikować właściciela.

### 3.5. Lokalizacje w klaserach

Przykładowe pola tabeli `storage_locations`:

- `id`
- `owner_id`
- `album_name` — np. „Klaser Polska 1945–1989”
- `page_number` — numer strony
- `pocket_number` — numer kieszonki, opcjonalnie
- `notes`

Pole lokalizacji pozwala szybko odnaleźć fizyczny znaczek.

### 3.6. Historia wycen

Tabela `valuations` może zawierać:

- `id`
- `specimen_id`
- `owner_id`
- `valuation_date`
- `amount`
- `currency`
- `source` — katalog, aukcja, ekspert lub własna ocena
- `notes`

Cena katalogowa nie musi odpowiadać cenie rynkowej. Wartość zależy m.in. od stanu, odmiany, popytu i rzeczywistych cen sprzedaży.

## 4. Formularz „Dodaj znaczek”

Formularz powinien być podzielony na sekcje, żeby nie przytłaczał użytkownika.

### Sekcja A — dane podstawowe

- Nazwa znaczka — wymagane.
- Kraj lub terytorium — wymagane.
- Rok emisji — opcjonalnie, jeśli nieznany.
- Dokładna data emisji — opcjonalnie.
- Numer katalogowy — opcjonalnie.
- System katalogowy — np. Fischer, Michel, Scott, Yvert.
- Seria lub emisja.
- Tematyka.
- Rodzaj emisji — obiegowy, okolicznościowy, lotniczy, dobroczynny itp.

### Sekcja B — parametry filatelistyczne

- Nominał.
- Waluta nominału.
- Ząbkowanie.
- Szerokość i wysokość w milimetrach.
- Technika druku.
- Znak wodny.
- Kolor i odmiana, jeśli znane.
- Opis i ciekawostki.

### Sekcja C — zdjęcia

- Zdjęcie awersu — zalecane.
- Zdjęcie rewersu — opcjonalne.
- Zdjęcia detali — opcjonalne.
- Podgląd przed zapisem.
- Możliwość oznaczenia głównego zdjęcia.

### Sekcja D — konkretny egzemplarz

- Stan zachowania: bardzo dobry, dobry, średni, uszkodzony.
- Stan gumy: oryginalna guma, bez gumy, ślad podlepki/podlepka, nie dotyczy lub nie wiadomo.
- Rodzaj kasowania: czysty, stemplowany, kasownik specjalny.
- Data pozyskania.
- Cena zakupu i waluta.
- Szacowana wartość i waluta.
- Źródło i data wyceny.
- Klaser, strona i kieszonka.
- Status: w kolekcji, na wymianę, na sprzedaż.
- Notatki.

### Walidacja i wygoda

- Wymagać tylko nazwy i kraju na początku.
- Pozwalać uzupełnić pozostałe dane później.
- Sprawdzać format roku, dat i cen.
- Ostrzegać o możliwych duplikatach, ale nie blokować zapisu automatycznie.
- Zapisywać daty utworzenia i aktualizacji.
- Wyświetlać jasny komunikat o powodzeniu lub błędzie zapisu.

## 5. Ekrany aplikacji

### 5.1. Logowanie

- Formularz e-mail i hasło.
- Odzyskiwanie hasła.
- Brak publicznej rejestracji nowych użytkowników.
- Wylogowanie.

### 5.2. Dashboard

- Liczba pozycji katalogowych.
- Liczba fizycznych egzemplarzy.
- Liczba znaczków polskich.
- Ostatnio dodane znaczki.
- Szacunkowa wartość kolekcji, jeśli dostępne są wyceny.
- Skróty do dodawania znaczka i przeglądania katalogu.

### 5.3. Katalog

- Widok galerii i widok tabeli.
- Miniatury znaczków.
- Wyszukiwanie po nazwie i numerze katalogowym.
- Filtry po kraju, roku, tematyce, stanie, statusie i klaserze.
- Sortowanie.
- Paginacja, aby katalog działał sprawnie przy dużej liczbie rekordów.

### 5.4. Karta szczegółowa znaczka

- Duże zdjęcie i galeria.
- Dane katalogowe.
- Lista posiadanych egzemplarzy.
- Stan każdego egzemplarza.
- Cena zakupu i historia wycen.
- Lokalizacja w klaserze.
- Notatki.
- Przyciski edycji i usuwania.

### 5.5. Dodawanie i edycja

- Formularz podzielony na sekcje.
- Podgląd zdjęć.
- Walidacja pól.
- Ostrzeżenie o podobnych rekordach.
- Potwierdzenie zapisu.

### 5.6. Klasery i lokalizacje

- Lista klaserów i albumów.
- Numery stron i kieszonek.
- Możliwość filtrowania katalogu po lokalizacji.
- Szybkie odnajdywanie fizycznego egzemplarza.

### 5.7. Raporty i eksport

- Eksport CSV.
- Opcjonalny eksport XLSX.
- Raport wartości kolekcji.
- Zestawienie według krajów, lat i tematów.
- Procedura tworzenia i odtwarzania kopii zapasowych.

## 6. Wyszukiwanie i filtry

Podstawowe filtry:

- nazwa lub fragment nazwy;
- kraj lub terytorium;
- rok lub zakres lat;
- numer katalogowy;
- system katalogowy;
- seria;
- tematyka;
- rodzaj emisji;
- czysty/stemplowany;
- stan zachowania;
- status w kolekcji;
- klaser i strona;
- przedział cenowy lub wartości.

Wyszukiwanie powinno działać niezależnie od tego, czy użytkownik wpisze pełną nazwę, fragment tekstu, czy numer katalogowy.

## 7. Bezpieczeństwo

Ponieważ frontend jest publicznie dostępny, prywatność musi być egzekwowana przez backend.

### Wymagane zabezpieczenia

1. **Jedno konto właściciela:** utworzyć konto w Supabase i wyłączyć rejestrację publiczną.
2. **Row Level Security:** włączyć RLS dla wszystkich tabel zawierających prywatne dane.
3. **Weryfikacja właściciela:** polityki sprawdzają, czy `owner_id` rekordu odpowiada zalogowanemu użytkownikowi.
4. **Prywatne zdjęcia:** bucket Supabase Storage ustawiony jako prywatny.
5. **Kontrola Storage:** osobne polityki dostępu do przesyłania, odczytu i usuwania zdjęć.
6. **Klucze:** w kodzie frontendu używać wyłącznie klucza publicznego przeznaczonego do klienta. Nigdy nie umieszczać klucza `service_role` ani haseł administratora w repozytorium.
7. **Sesja:** prawidłowa obsługa tokenów, wylogowania i odzyskiwania dostępu.
8. **Kopie zapasowe:** osobne kopie bazy danych i plików zdjęciowych.
9. **Repozytorium:** nie przechowywać prywatnych zdjęć kolekcji, danych użytkownika ani sekretów w GitHub.
10. **Testy:** sprawdzić, czy niezalogowana osoba nie może odczytać danych ani zdjęć.

RLS chroni rekordy bazy danych, ale samo w sobie nie zabezpiecza plików w Storage — tam także trzeba skonfigurować polityki.

## 8. Plan wdrożenia

### Etap 1 — przygotowanie

- Utworzyć repozytorium GitHub.
- Przygotować React + TypeScript + Vite.
- Ustalić układ ekranów, typografię i kolorystykę.
- Skonfigurować ścieżkę bazową dla GitHub Pages.

### Etap 2 — baza danych

- Utworzyć projekt Supabase.
- Utworzyć tabele i relacje.
- Przygotować słowniki krajów, tematów i stanów.
- Dodać indeksy dla najczęściej wyszukiwanych pól.
- Włączyć RLS i przetestować polityki dostępu.

### Etap 3 — logowanie

- Utworzyć jedno konto właściciela.
- Wyłączyć rejestrację publiczną.
- Zabezpieczyć widoki aplikacji.
- Sprawdzić dostęp do danych bez zalogowania.

### Etap 4 — katalog

- Dodać CRUD: tworzenie, odczyt, edycja i usuwanie pozycji.
- Zbudować formularz znaczka.
- Dodać ewidencję egzemplarzy.
- Dodać upload awersu i rewersu.
- Zbudować kartę szczegółową.

### Etap 5 — wyszukiwanie i klasery

- Dodać wyszukiwarkę.
- Dodać filtry i sortowanie.
- Dodać widok galerii i tabeli.
- Dodać lokalizacje fizyczne.
- Dodać podstawowy dashboard.

### Etap 6 — publikacja i testy

- Skonfigurować GitHub Actions i GitHub Pages.
- Skonfigurować zmienne środowiskowe.
- Przetestować logowanie, upload, filtrowanie i edycję.
- Sprawdzić działanie na telefonie.
- Przetestować kopię zapasową i odtwarzanie.
- Sprawdzić, że repozytorium nie zawiera sekretów.

## 9. Zakres wersji

### MVP — pierwsza działająca wersja

- Prywatne logowanie.
- Katalog ze zdjęciami.
- Dodawanie, edycja i usuwanie pozycji.
- Dane katalogowe i ewidencja egzemplarzy.
- Wyszukiwanie i podstawowe filtry.
- Prywatne zdjęcia.
- Podstawowe zabezpieczenia i kopie zapasowe.

### Wersja 1.0

- Dashboard.
- Klasery i lokalizacje.
- Widok galerii i tabeli.
- Lista duplikatów.
- Rozszerzone filtry.
- Testy bezpieczeństwa.

### Wersja 1.1

- Eksport CSV/XLSX.
- Historia wycen.
- Raporty kolekcji.
- Wydruk katalogu.

### Wersja 2.0 — opcjonalnie

- Rozpoznawanie znaczków ze zdjęć z pomocą AI.
- Import z istniejącego pliku CSV/XLSX.
- Integracje z legalnie dostępnymi źródłami danych katalogowych.
- Automatyczne podpowiedzi dotyczące identyfikacji odmian.

Automatyczna identyfikacja i wycena powinny być traktowane jako podpowiedzi do weryfikacji, a nie jako pewne rozstrzygnięcia.

## 10. Wygląd graficzny

Rekomendowany styl:

- jasne tło, aby zdjęcia znaczków były dobrze widoczne;
- czytelna typografia i delikatne linie podziału;
- duże miniatury znaczków w galerii;
- opcjonalny tryb ciemny;
- responsywny układ;
- proste formularze i widoczne przyciski akcji.

Alternatywnie można zastosować ciemny granat, złamane biele i subtelne złote akcenty, uzyskując bardziej kolekcjonerski charakter.

## 11. Szacunkowy zakres pracy

| Wersja | Zakres |
|---|---|
| MVP | Logowanie, katalog, formularz, zdjęcia, wyszukiwarka |
| 1.0 | Dashboard, egzemplarze, klasery, filtry i testy |
| 1.1 | Eksport, wyceny i raporty |
| 2.0 | AI, import i dodatkowe integracje |

Orientacyjnie MVP może zająć 3–7 dni intensywnej pracy osobie znającej ten stos technologiczny. Dla początkującego, który uczy się w trakcie, należy raczej zaplanować kilka tygodni. To szacunek, nie gwarantowany termin.

## 12. Rekomendacje końcowe

1. Zacząć od modelu danych i bezpieczeństwa, a dopiero potem rozwijać interfejs.
2. Oddzielić pozycję katalogową od każdego fizycznego egzemplarza.
3. Używać numerów katalogowych jako tekstu.
4. Nie wymagać wszystkich danych przy pierwszym dodaniu znaczka.
5. Zapisywać lokalizację w klaserze.
6. Przechowywać zdjęcia w prywatnym Storage.
7. Testować polityki RLS i Storage przed publikacją.
8. Zaplanować kopię zapasową zarówno bazy, jak i zdjęć.
9. Na początku pominąć AI i automatyczną wycenę — dodać je po sprawdzeniu podstawowego katalogu.

### Rekomendacja dotycząca numeracji

Stosować dwa niezależne identyfikatory:

- **Numer katalogowy** — identyfikuje emisję lub odmianę według wybranego katalogu, np. Fischer.
- **Własny numer egzemplarza** — identyfikuje fizyczny znaczek w kolekcji, np. `PL-000001`.

Numer własny najlepiej przypisywać konkretnemu egzemplarzowi, a nie tylko pozycji katalogowej. Dzięki temu każdy fizyczny znaczek można niezależnie opisać, zlokalizować i wycenić.
