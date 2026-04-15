'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

export function NavBar() {
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md"
      data-testid="navbar"
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
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

        {/* Nav links */}
        <ul className="flex items-center gap-1" role="list">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  data-testid={`nav-link-${label.toLowerCase()}`}
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
      </nav>
    </header>
  )
}
