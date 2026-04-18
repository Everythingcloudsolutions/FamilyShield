'use client'

import { useState } from 'react'

export function DemoBanner({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(false)

  if (!show || dismissed) {
    return null
  }

  return (
    <div
      className="w-full bg-gradient-to-r from-accent-500/5 to-orange-500/5 border-b border-accent-500/20 px-4 py-3.5 flex items-center justify-between gap-3 animate-fade-in"
      role="alert"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent-500/20 border border-accent-500/30">
            <svg className="h-4 w-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-accent-300 leading-tight">
            <span className="font-semibold">Demo Mode:</span> Showing sample data
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect Supabase to enable live monitoring
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-accent-400 hover:bg-accent-500/10 transition-all duration-200 focus:ring-2 focus:ring-accent-500/30"
        aria-label="Dismiss demo banner"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
