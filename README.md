# Mój Katalog Filatelistyczny

Prywatna aplikacja webowa łącząca dwie rzeczy:

1. **Katalog ogólny znaczków** — opis emisji (głównie polskich), niezależnie od tego, czy znaczek posiadam. Pozwala prowadzić listę brakujących.
2. **Moją kolekcję** — konkretne fizyczne egzemplarze: stan, kasowanie, cena, wycena, miejsce w klaserze.

Pełny szkic projektu: [docs/plan-projektu.md](docs/plan-projektu.md).

## Technologie

React + TypeScript + Vite · Tailwind CSS · Lucide · Supabase (Auth, PostgreSQL, Storage) · GitHub Pages + GitHub Actions

## Uruchomienie lokalne

```bash
npm install
cp .env.example .env.local   # uzupełnij danymi Supabase
npm run dev
```

## Konfiguracja Supabase (jednorazowo)

1. Załóż projekt na [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers → Email**: wyłącz „Allow new users to sign up”.
3. **Authentication → Users → Add user**: utwórz konto właściciela (e-mail + hasło).
4. **SQL Editor**: wklej i uruchom `supabase/migrations/0001_schema.sql` (tabele, RLS, bucket na zdjęcia).
5. **SQL Editor**: uruchom `supabase/seed.sql` (kraje i tematy startowe; trafiają do jedynego konta w projekcie).
6. **Project Settings → API**: skopiuj *Project URL* i klucz *anon / publishable* do `.env.local`.

Nigdy nie umieszczaj klucza `service_role` w kodzie ani w repozytorium.

## Publikacja na GitHub Pages

1. Utwórz repozytorium na GitHubie i wypchnij kod na gałąź `main`.
2. **Settings → Pages → Source**: GitHub Actions.
3. **Settings → Secrets and variables → Actions → Variables**: dodaj `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
4. W Supabase **Authentication → URL Configuration** dodaj adres strony (`https://<login>.github.io/<repo>/`) do *Redirect URLs* (potrzebne do resetu hasła).

## Struktura

```
src/
  auth/        logowanie i ochrona tras
  components/  układ strony, miniatury
  lib/         klient Supabase, typy, etykiety
  pages/       ekrany: pulpit, katalog, kolekcja, klasery, karta znaczka, formularze znaczka i egzemplarza
supabase/
  migrations/  schemat bazy z politykami RLS
  seed.sql     słowniki startowe
docs/          plan projektu
```

## Stan prac

- [x] Etap 1 — szkielet aplikacji, wygląd, konfiguracja GitHub Pages
- [x] Etap 2 — schemat bazy i RLS (do uruchomienia w Supabase)
- [x] Etap 3 — logowanie, reset hasła, ochrona tras
- [x] Etap 4 — pełny formularz (sekcje A–D), egzemplarze, upload zdjęć z miniaturami, edycja i usuwanie, historia wycen
- [ ] Etap 5 — rozszerzone filtry, klasery, dashboard z wartością kolekcji
- [ ] Etap 6 — testy bezpieczeństwa, kopie zapasowe
