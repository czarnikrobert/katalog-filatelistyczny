import { PlugZap } from 'lucide-react'
import { EmptyState, Logo } from '../components/ui'

export function NotConfiguredPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-4 py-16">
      <Logo />
      <EmptyState icon={PlugZap} title="Brak połączenia z bazą">
        Aplikacja potrzebuje adresu i klucza publicznego projektu Supabase. Skopiuj plik .env.example jako .env.local,
        uzupełnij wartości i uruchom ponownie npm run dev. Szczegóły w README.md, sekcja „Konfiguracja Supabase”.
      </EmptyState>
    </div>
  )
}
