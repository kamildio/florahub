import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, LogOut, Menu, Search, ShoppingBag, Store, User as UserIcon, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { CitySelector } from './CitySelector'
import { useCart } from '@/store/useCart'
import { useAuth } from '@/store/useAuth'
import { cn, maskPhone } from '@/lib/utils'

export function Navbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items = useCart((s) => s.items)
  const count = items.reduce((n, i) => n + i.quantity, 0)
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')

  const navLinks = [
    { to: '/catalog', label: t('nav.catalog') },
    { to: '/catalog?occasions=1', label: t('nav.occasions') },
    { to: '/seller', label: t('nav.becomeSeller') },
  ]

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/catalog?q=${encodeURIComponent(query)}`)
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 glass">
      <div className="container flex h-16 items-center gap-3 lg:h-20">
        <Link to="/" className="shrink-0" aria-label="FloraHub">
          <Logo />
        </Link>

        <div className="ml-1 hidden lg:block">
          <CitySelector />
        </div>

        {/* Desktop search */}
        <form onSubmit={submitSearch} className="relative mx-2 hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search')}
            className="h-11 w-full rounded-full border border-border bg-card pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('common.search')}
          />
        </form>

        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:text-primary',
                  isActive ? 'text-primary' : 'text-foreground',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-2">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <ThemeToggle className="hidden sm:grid" />

          {/* Cart */}
          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('nav.cart')}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground animate-scale-in tabular">
                {count}
              </span>
            )}
          </Link>

          {/* Auth */}
          {user ? (
            <Dropdown
              trigger={({ toggle }) => (
                <button
                  onClick={toggle}
                  className="hidden h-10 items-center gap-2 rounded-full border border-border bg-card pl-1.5 pr-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <span className="max-w-[7rem] truncate">{user.name || maskPhone(user.phone)}</span>
                </button>
              )}
            >
              {(close) => (
                <>
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user.name || t('nav.profile')}</p>
                    <p className="text-xs text-muted-foreground">{maskPhone(user.phone)}</p>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <DropdownItem onClick={() => { navigate('/profile'); close() }}>
                    <UserIcon className="h-4 w-4" /> {t('nav.profile')}
                  </DropdownItem>
                  <DropdownItem onClick={() => { navigate('/profile#orders'); close() }}>
                    <ShoppingBag className="h-4 w-4" /> {t('nav.orders')}
                  </DropdownItem>
                  {user.role === 'admin' && (
                    <DropdownItem onClick={() => { navigate('/admin'); close() }}>
                      <LayoutDashboard className="h-4 w-4" /> {t('nav.admin')}
                    </DropdownItem>
                  )}
                  <DropdownItem onClick={() => { navigate('/seller'); close() }}>
                    <Store className="h-4 w-4" /> {t('nav.sellerPanel')}
                  </DropdownItem>
                  <div className="my-1 h-px bg-border" />
                  <DropdownItem className="text-destructive hover:bg-destructive/10" onClick={() => { logout(); close(); navigate('/') }}>
                    <LogOut className="h-4 w-4" /> {t('nav.logout')}
                  </DropdownItem>
                </>
              )}
            </Dropdown>
          ) : (
            <Button asChild size="sm" className="hidden h-10 sm:inline-flex">
              <Link to="/login">{t('nav.login')}</Link>
            </Button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted cursor-pointer xl:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search row */}
      <div className="container pb-3 md:hidden">
        <form onSubmit={submitSearch} className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search')}
            className="h-11 w-full rounded-full border border-border bg-card pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('common.search')}
          />
        </form>
      </div>

      {/* Mobile menu sheet */}
      {mobileOpen && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl xl:hidden animate-fade-in">
          <div className="container space-y-1 py-4">
            <div className="flex items-center justify-between gap-2 pb-3">
              <CitySelector />
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-3 py-3 text-base font-semibold text-foreground hover:bg-muted"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="h-px bg-border" />
            {user ? (
              <>
                <NavLink to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold hover:bg-muted">
                  <UserIcon className="h-5 w-5" /> {t('nav.profile')}
                </NavLink>
                <button onClick={() => { logout(); setMobileOpen(false); navigate('/') }} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-destructive hover:bg-destructive/10">
                  <LogOut className="h-5 w-5" /> {t('nav.logout')}
                </button>
              </>
            ) : (
              <Button asChild className="mt-1 w-full" onClick={() => setMobileOpen(false)}>
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
