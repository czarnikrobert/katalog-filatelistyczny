import { BookOpen, CalendarDays, Library, LayoutDashboard, ListChecks, LogIn, LogOut, Plus, Stamp } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/context'
import { Logo } from './ui'

// Gość przegląda katalog; właściciel ma dodatkowo pulpit, kolekcję i klasery.
const ownerNav = [
  { to: '/', label: 'Pulpit', icon: LayoutDashboard, end: true },
  { to: '/roczniki', label: 'Roczniki', icon: CalendarDays },
  { to: '/katalog', label: 'Katalog', icon: BookOpen },
  { to: '/kolekcja', label: 'Kolekcja', icon: Stamp },
  { to: '/brakujace', label: 'Brakujące', icon: ListChecks, desktopOnly: true },
  { to: '/klasery', label: 'Klasery', icon: Library },
]
const guestNav = [
  { to: '/', label: 'Roczniki', icon: CalendarDays, end: true },
  { to: '/katalog', label: 'Katalog', icon: BookOpen },
]

export function Layout() {
  const { session, signOut } = useAuth()
  const { pathname } = useLocation()
  const nav = session ? ownerNav : guestNav
  // Na telefonie gość ma logowanie w dolnym menu.
  // Dolne menu mieści 5 pozycji — „Brakujące” jest tam dostępne z pulpitu i roczników.
  const mobileNav = session
    ? ownerNav.filter((n) => !n.desktopOnly)
    : [...guestNav, { to: '/logowanie', label: 'Zaloguj', icon: LogIn, end: false }]

  // HashRouter nie przewija strony przy zmianie trasy.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="min-h-dvh pb-24 md:pb-0 print:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-paper-50/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-8 lg:gap-8">
          <Link to="/" aria-label="Mój Katalog — strona główna">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition duration-300 ease-out-expo ${
                    isActive ? 'bg-navy-50 text-navy-700' : 'text-muted hover:bg-paper-200/60 hover:text-navy-700'
                  }`
                }
              >
                <Icon size={16} /> <span className={session ? 'hidden lg:inline' : ''}>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <>
                <Link to="/dodaj" className="btn btn-secondary px-3">
                  <Plus size={16} className="text-gold-600" />
                  <span className="hidden sm:inline md:hidden lg:inline">Dodaj znaczek</span>
                </Link>
                <button onClick={signOut} className="btn btn-ghost px-2" aria-label="Wyloguj" title="Wyloguj">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link to="/logowanie" state={{ from: pathname }} className="btn btn-secondary hidden px-3 md:inline-flex">
                <LogIn size={16} className="text-gold-600" /> Zaloguj się
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12 print:max-w-none print:p-0">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-7xl border-t border-line px-4 py-6 text-xs leading-relaxed text-subtle md:px-8 print:hidden">
        Grafiki znaczków:{' '}
        <a href="https://www.kzp.pl" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-navy-700">
          Katalog Znaków Pocztowych — kzp.pl
        </a>{' '}
        (Marek Jedziniak), wykorzystane za zgodą autora serwisu.
      </footer>

      <nav
        className={`fixed inset-x-0 bottom-0 z-30 grid print:hidden ${session ? 'grid-cols-5' : 'grid-cols-3'} border-t border-line bg-paper-50/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden`}
      >
        {mobileNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-xs font-medium transition duration-300 ease-out-expo ${
                isActive ? 'text-navy-700' : 'text-subtle'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`rounded-full px-3 py-1 ${isActive ? 'bg-navy-50' : ''}`}>
                  <Icon size={20} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
