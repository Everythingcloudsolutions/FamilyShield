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
      className="text-teal-400"
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
        className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md"
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 ring-1 ring-teal-500/30 transition-colors group-hover:bg-teal-500/20">
              <ShieldIcon />
            </div>
            <span className="font-semibold text-slate-100 tracking-tight">
              Family<span className="text-teal-400">Shield</span>
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
                      'relative inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'text-teal-400'
                        : 'text-slate-400 hover:text-slate-200',
                    ].join(' ')}
                  >
                    {label}
                    {active && (
                      <span className="absolute inset-x-1 -bottom-px h-px bg-teal-400 rounded-full" />
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
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
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
              className="sm:hidden rounded-lg p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              data-testid="mobile-menu-toggle"
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
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
                        'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'text-teal-400 bg-teal-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30',
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
