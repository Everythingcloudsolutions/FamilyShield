'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isSupabaseConfigured } from '@/lib/supabase'
import { DemoBanner } from './DemoBanner'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/devices', label: 'Devices' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/cert', label: 'Setup' },
]

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
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

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  )
}

export function NavBar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const supabaseConfigured = isSupabaseConfigured()

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-white/5 bg-surface-100/80 backdrop-blur-md"
        data-testid="navbar"
      >
        <nav
          className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 select-none"
            data-testid="navbar-logo"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/10 ring-1 ring-accent-500/30">
              <ShieldIcon />
            </div>
            <span className="font-display font-bold text-slate-100 tracking-tight text-base">
              Family<span className="text-accent-500">Shield</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden sm:flex items-center gap-0.5" role="list">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <li key={href}>
                  <Link
                    href={href}
                    data-testid={`nav-link-${label.toLowerCase()}`}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'relative inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150',
                      active
                        ? 'text-accent-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
                    ].join(' ')}
                  >
                    {label}
                    {active && (
                      <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent-500 rounded-full" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Right: hamburger only on mobile */}
          <div className="flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="sm:hidden rounded-lg p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              data-testid="mobile-menu-toggle"
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-white/5 bg-surface-100/95 backdrop-blur-sm">
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
                        'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'text-accent-400 bg-accent-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
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

      <DemoBanner show={!supabaseConfigured} />
    </>
  )
}
