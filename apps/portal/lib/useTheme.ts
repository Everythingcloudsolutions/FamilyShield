'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  toggle: () => void
  setTheme: (theme: Theme) => void
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggle: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme: Theme) => set({ theme }),
    }),
    {
      name: 'familyshield-theme',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : null as any),
    }
  )
)
