import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '../components/NavBar'

export const metadata: Metadata = {
  title: 'FamilyShield — Parent Portal',
  description: 'Intelligent Digital Safety for Every Child',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  )
}
