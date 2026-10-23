import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/context'
import { Logo, Notice } from '../components/ui'
import { passwordResetRedirect, supabase } from '../lib/supabase'

// Dekoracyjne znaczki na panelu powitalnym — czysty CSS, bez zdjęć.
function DecorStamp({ className, art, value, label }: { className: string; art: string; value: string; label: string }) {
  return (
    <div className={`stamp-shadow absolute ${className}`} aria-hidden>
      <div className="perforated">
        <div className={`relative flex h-full w-full flex-col justify-between p-3 ${art}`}>
          <span className="eyebrow text-current opacity-80">Polska</span>
          <span className="font-serif text-2xl leading-none">{value}</span>
          <span className="text-xs opacity-80">{label}</span>
        </div>
      </div>
    </div>
  )
}

// Brak rejestracji — konto właściciela zakłada się ręcznie w panelu Supabase.
export function LoginPage() {
  const { session } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) setMessage({ kind: 'error', text: 'Nieprawidłowy e-mail lub hasło.' })
    setBusy(false)
  }

  const resetPassword = async () => {
    if (!email) {
      setMessage({ kind: 'error', text: 'Wpisz najpierw adres e-mail.' })
      return
    }
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirect(),
    })
    setMessage(
      error
        ? { kind: 'error', text: 'Nie udało się wysłać wiadomości. Spróbuj ponownie.' }
        : { kind: 'success', text: 'Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.' },
    )
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-navy-800 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--color-navy-600),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-paper-50">
          <div className="max-w-[40ch] space-y-4">
            <div className="eyebrow text-gold-300">Prywatny katalog</div>
            <p className="font-serif text-4xl leading-tight">Twoja kolekcja i katalog znaczków w jednym albumie.</p>
            <p className="text-base leading-relaxed text-navy-100">
              Emisje, odmiany i numery katalogowe — razem z każdym egzemplarzem, jego stanem, wyceną i miejscem w klaserze.
            </p>
          </div>
          <div className="relative h-96">
            <DecorStamp className="bottom-12 left-0 w-48 -rotate-6 [&_.perforated]:h-64" art="bg-gold-100 text-gold-900" value="60 gr" label="Tysiąclecie" />
            <DecorStamp className="bottom-24 left-48 w-48 rotate-3 [&_.perforated]:h-64" art="bg-navy-100 text-navy-800" value="1,35 zł" label="Poczta lotnicza" />
            <DecorStamp className="bottom-4 left-96 w-32 rotate-12 [&_.perforated]:h-48" art="bg-red-100 text-red-900" value="2 zł" label="Flora" />
          </div>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-12 md:px-12">
        <form onSubmit={signIn} className="w-full max-w-sm animate-rise space-y-8">
          <Logo />
          <div className="space-y-2">
            <h1 className="font-serif text-3xl tracking-tight">Witaj z powrotem</h1>
            <p className="text-sm text-muted">Zaloguj się, aby prowadzić swoją kolekcję i edytować katalog.</p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              <span>E-mail</span>
              <span className="relative block">
                <Mail size={16} className="pointer-events-none absolute top-3 left-3 text-subtle" />
                <input className="input pl-8" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </span>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Hasło</span>
              <span className="relative block">
                <Lock size={16} className="pointer-events-none absolute top-3 left-3 text-subtle" />
                <input
                  className="input px-8"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-2 right-2 rounded p-1 text-subtle hover:text-navy-700"
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
          </div>

          {message && <Notice tone={message.kind}>{message.text}</Notice>}

          <div className="space-y-3">
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
              {busy ? 'Logowanie…' : 'Zaloguj się'}
            </button>
            <button type="button" onClick={resetPassword} className="btn btn-ghost w-full text-muted">
              Nie pamiętam hasła
            </button>
          </div>

          <div className="border-t border-line pt-6 text-center">
            <Link to="/" className="btn btn-ghost text-sm">
              <ArrowLeft size={16} /> Przeglądaj katalog bez logowania
            </Link>
            <p className="mt-2 text-xs text-subtle">Logowanie jest potrzebne tylko do prowadzenia własnej kolekcji.</p>
          </div>
        </form>
      </div>
    </div>
  )
}
