import { CircleCheck, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import { EmptyState, Logo, Notice } from '../components/ui'
import { supabase } from '../lib/supabase'

const MIN_LENGTH = 8

// Ekran po kliknięciu linku z maila „Resetuj hasło”. Supabase loguje użytkownika kodem z adresu,
// a tutaj ustawia się nowe hasło.
export function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Usuwa ?reset=1 z adresu i przechodzi do aplikacji.
  const goToApp = () => window.location.replace(`${window.location.pathname}#/`)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_LENGTH) {
      setError(`Hasło musi mieć co najmniej ${MIN_LENGTH} znaków.`)
      return
    }
    if (password !== repeat) {
      setError('Hasła nie są takie same.')
      return
    }
    setError(null)
    setBusy(true)
    const { error: updateError } = await supabase!.auth.updateUser({ password })
    setBusy(false)
    if (updateError) {
      setError('Nie udało się zmienić hasła. Spróbuj ponownie albo poproś o nowy link.')
      return
    }
    setDone(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-4 py-12">
      <Logo />
      {loading ? (
        <p className="text-sm text-muted">Sprawdzanie linku…</p>
      ) : !session ? (
        <EmptyState
          icon={KeyRound}
          title="Link wygasł lub jest nieprawidłowy"
          action={
            <button className="btn btn-primary" onClick={() => window.location.replace(`${window.location.pathname}#/logowanie`)}>
              Wróć do logowania
            </button>
          }
        >
          Link do zmiany hasła działa jednorazowo i tylko w przeglądarce, w której poproszono o reset. Poproś o nowy link
          na ekranie logowania.
        </EmptyState>
      ) : done ? (
        <div className="animate-rise space-y-6">
          <Notice tone="success">Hasło zostało zmienione.</Notice>
          <button className="btn btn-primary w-full py-3" onClick={goToApp}>
            <CircleCheck size={16} /> Przejdź do katalogu
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="animate-rise space-y-8">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl tracking-tight">Ustaw nowe hasło</h1>
            <p className="text-sm text-muted">Konto: {session.user.email}</p>
          </div>
          <div className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              <span>Nowe hasło</span>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="block text-xs font-normal text-subtle">Co najmniej {MIN_LENGTH} znaków.</span>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Powtórz hasło</span>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                required
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </label>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
            {busy ? 'Zapisywanie…' : 'Zapisz nowe hasło'}
          </button>
        </form>
      )}
    </div>
  )
}
