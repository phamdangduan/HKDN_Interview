import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Bell, Menu, Moon, Sparkles, Sun, X } from 'lucide-react'
import { Logo } from './Logo'
import { useI18n } from '@/i18n/I18nProvider'
import { useTheme } from '@/theme/ThemeProvider'
import type { Lang } from '@/types'
import { cn } from '@/lib/utils'

const USER = {
  name: 'Minh Nguyễn',
  email: 'ncm071205@gmail.com',
  initial: 'M',
}

export function Header() {
  const { t, lang, setLang } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { key: 'nav.positions', to: '/positions', active: true, icon: null },
    { key: 'nav.pricing', to: '#pricing', active: false, icon: null },
    { key: 'nav.cv', to: '#cv', active: false, icon: Sparkles },
    { key: 'nav.journey', to: '#journey', active: false, icon: null },
  ] as const

  return (
    <header className="border-border bg-card">
      <div className="container-page flex h-20 items-center gap-4">
        <Link to="/positions" className="shrink-0" aria-label="interview68">
          <Logo className="h-8 sm:h-9" />
        </Link>

        <nav className="ml-6 hidden items-center gap-7 lg:flex" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1 border-b-2 py-1 text-sm font-semibold transition-colors',
                  item.active && isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary-foreground hover:text-primary'
                )
              }
            >
              {item.icon && <item.icon className="h-3.5 w-3.5 text-primary/60" aria-hidden="true" />}
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div
            className="flex items-center rounded-full bg-muted p-0.5"
            role="group"
            aria-label={t('common.language')}
          >
            {(['en', 'vi'] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold uppercase transition-colors',
                  lang === code
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-primary'
                )}
              >
                {code}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t('common.theme')}
            title={t('common.theme')}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted text-secondary-foreground transition-colors hover:bg-border hover:text-primary"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            aria-label={t('nav.notifications')}
            className="relative hidden h-9 w-9 place-items-center rounded-full bg-muted text-secondary-foreground transition-colors hover:bg-border hover:text-primary sm:grid"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              4
            </span>
          </button>

          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-foreground">{USER.name}</p>
              <p className="text-xs text-muted-foreground">{USER.email}</p>
            </div>
            <span
              className="grid h-9 w-9 place-items-center rounded-full bg-chart-3/10 text-sm font-bold text-chart-3"
              aria-hidden="true"
            >
              {USER.initial}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={t('nav.menu')}
            aria-expanded={mobileOpen}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted text-secondary-foreground lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-border bg-card px-4 pb-4 lg:hidden" aria-label="Mobile">
          <ul className="container-page flex flex-col gap-1 p-0">
            {navItems.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold',
                      item.active && isActive
                        ? 'bg-accent text-primary'
                        : 'text-secondary-foreground hover:bg-muted'
                    )
                  }
                >
                  {item.icon && <item.icon className="h-3.5 w-3.5 text-primary/60" aria-hidden="true" />}
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}