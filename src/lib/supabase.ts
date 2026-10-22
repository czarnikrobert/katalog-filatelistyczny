import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// Klient tworzony tylko przy kompletnej konfiguracji; bez niej aplikacja pokazuje instrukcję.
// PKCE: link z maila wraca z parametrem ?code=… (nie w #), więc nie koliduje z HashRouterem.
export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { flowType: 'pkce' } })
  : null

// Adres powrotu z maila resetującego hasło — parametr ?reset=1 otwiera ekran nowego hasła.
export const passwordResetRedirect = () => `${window.location.origin}${window.location.pathname}?reset=1`
export const isPasswordReset = () => new URLSearchParams(window.location.search).has('reset')

export const IMAGES_BUCKET = 'stamp-images'
