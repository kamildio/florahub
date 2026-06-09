import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ExternalLink, Menu, X, type LucideIcon } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { cn } from '@/lib/utils'

export interface ConsoleNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
}

export function ConsoleLayout({
  title,
  subtitle,
  nav,
  accent = 'primary',
  children,
}: {
  title: string
  subtitle: string
  nav: ConsoleNavItem[]
  accent?: 'primary' | 'accent'
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5 lg:h-20">
        <Link to="/" aria-label="FloraHub"><Logo /></Link>
      </div>
      <div className="px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{subtitle}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? accent === 'accent'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground tabular">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ExternalLink className="h-5 w-5" /> FloraHub
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-card shadow-soft animate-fade-in">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl lg:h-20 lg:px-8">
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-muted lg:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate font-display text-xl font-bold lg:text-2xl">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </div>

      {/* close button for mobile drawer reachability */}
      {open && (
        <button onClick={() => setOpen(false)} className="fixed right-4 top-4 z-[60] grid h-10 w-10 place-items-center rounded-full bg-card shadow-soft lg:hidden" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export function StatCard({
  label, value, hint, icon: Icon, tone = 'primary',
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: 'primary' | 'accent' | 'success' | 'warning'
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className={cn('grid h-11 w-11 place-items-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 font-display text-2xl font-bold tabular lg:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
      {hint && <p className="mt-2 text-xs font-semibold text-success">{hint}</p>}
    </div>
  )
}
