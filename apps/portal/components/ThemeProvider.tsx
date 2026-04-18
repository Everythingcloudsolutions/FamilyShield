'use client'

import { useEffect } from 'react'

// Dark mode only — no light mode toggle.
// Forces `dark` class on <html> at hydration to prevent FOUC on first paint.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.className = 'dark'
  }, [])

  return <>{children}</>
}
