import type { Metadata } from 'next'
import { IBM_Plex_Sans, Bricolage_Grotesque } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { NavBar } from '../components/NavBar'

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'FamilyShield — Parent Portal',
  description: 'Intelligent Digital Safety for Every Child',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased transition-colors duration-200">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:block focus:rounded-lg focus:bg-teal-600 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
          >
            Skip to main content
          </a>
          <NavBar />
          <main
            id="main-content"
            className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
