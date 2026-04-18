'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/useTheme'
import { isSupabaseConfigured } from '@/lib/supabase'
import { DemoBanner } from './DemoBanner'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/devices', label: 'Devices' },
  { href: '/alerts', label: 'Alerts' },
]

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent-500"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1m-16 0H1m15.364 1.636l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 015.646 5.646 9.001 9.001 0 0020.354 15.354z"
      />
    </svg>
  )
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {open ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      )}
    </svg>
  )
}

export function NavBar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const theme = useTheme((state) => state.theme)
  const toggleTheme = useTheme((state) => state.toggle)
  const supabaseConfigured = isSupabaseConfigured()

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-surface-200/10 bg-surface-100/40 backdrop-blur-md shadow-sm-glass"
        data-testid="navbar"
      >
        <nav
          className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 select-none group"
            data-testid="navbar-logo"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/10 ring-1 ring-accent-500/30 transition-all group-hover:bg-accent-500/20 group-hover:ring-accent-500/50 group-hover:shadow-lg group-hover:shadow-accent-500/20">
              <ShieldIcon />
            </div>
            <span className="font-display font-bold text-slate-100 tracking-tight text-lg">
              Family<span className="text-accent-500">Shield</span>
            </span>
          </Link>

          {/* Desktop Nav links */}
          <ul className="hidden sm:flex items-center gap-1" role="list">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <li key={href}>
                  <Link
                    href={href}
                    data-testid={`nav-link-${label.toLowerCase()}`}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'relative inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200',
                      active
                        ? 'text-accent-400 bg-accent-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-200/20',
                    ].join(' ')}
                  >
                    {label}
                    {active && (
                      <span className="absolute inset-x-1 -bottom-px h-0.5 bg-gradient-to-r from-accent-500 to-orange-500 rounded-full" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Right side: Theme toggle + Hamburger */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="rounded-lg p-2 text-slate-400 hover:text-accent-400 hover:bg-accent-500/10 transition-all duration-200"
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Hamburger menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="sm:hidden rounded-lg p-2 text-slate-400 hover:text-accent-400 hover:bg-accent-500/10 transition-all duration-200"
              data-testid="mobile-menu-toggle"
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-surface-200/10 bg-surface-100/30 backdrop-blur-sm animate-slide-up">
            <ul
              id="mobile-nav"
              className="flex flex-col gap-1 px-4 py-3"
              role="list"
              data-testid="mobile-nav"
            >
              {NAV_LINKS.map(({ href, label }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      data-testid={`nav-link-${label.toLowerCase()}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={[
                        'block rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        active
                          ? 'text-accent-400 bg-accent-500/10 border-l-2 border-l-accent-500'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-surface-200/20',
                      ].join(' ')}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </header>

      {/* Demo Banner */}
      <DemoBanner show={!supabaseConfigured} />
    </>
  )
}
