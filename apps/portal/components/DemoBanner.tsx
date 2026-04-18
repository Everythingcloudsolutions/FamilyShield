'use client'

import { useState } from 'react'

export function DemoBanner({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(false)

  if (!show || dismissed) {
    return null
  }

  return (
    <div
      className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-between gap-2"
      role="alert"
    >
      <div className="flex items-center gap-2 flex-1">
        <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400 ring-1 ring-amber-500/30">
          DEMO
        </span>
        <p className="text-sm text-amber-400">
          Showing sample data — connect Supabase to see live monitoring
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
        aria-label="Dismiss demo banner"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
