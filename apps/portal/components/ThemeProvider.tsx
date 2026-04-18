'use client'

import { useEffect } from 'react'
import { useTheme } from '@/lib/useTheme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme((state) => state.theme)

  useEffect(() => {
    const html = document.documentElement
    html.className = theme
  }, [theme])

  return <>{children}</>
}
