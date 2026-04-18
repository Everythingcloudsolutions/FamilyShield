'use client'

import { useEffect, useState } from 'react'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { RiskBadge } from './RiskBadge'
import { SkeletonCard } from './SkeletonCard'
import { isDemoMode, DEMO_ALERTS } from '../lib/demo-data'
import type { Alert, Platform } from '../lib/types'

interface AlertFeedProps {
  initialAlerts: Alert[]
}

const PLATFORM_ABBREV: Record<Platform, string> = {
  youtube: 'YT',
  roblox: 'RBX',
  discord: 'DC',
  twitch: 'TWI',
  instagram: 'IG',
  tiktok: 'TT',
  other: '?',
}

const PLATFORM_COLOR: Record<Platform, string> = {
  youtube: 'bg-red-500/10 text-red-400',
  roblox: 'bg-blue-500/10 text-blue-400',
  discord: 'bg-indigo-500/10 text-indigo-400',
  twitch: 'bg-purple-500/10 text-purple-400',
  instagram: 'bg-pink-500/10 text-pink-400',
  tiktok: 'bg-slate-500/10 text-slate-400',
  other: 'bg-slate-600/10 text-slate-500',
}

function ShieldCheckIcon() {
  return (
    <svg
      className="h-10 w-10 text-teal-500/30"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m7.784-4.817a9 9 0 01-7.784 15.634c-4.142 0-6.05-.877-7.784-2.817m0-10.6a9 9 0 0110.956 2.864m-7.172 5.753a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function AlertFeed({ initialAlerts }: AlertFeedProps) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts.slice(0, 20))
  const [mounted, setMounted] = useState(false)

  const isDemo = isDemoMode(initialAlerts, [])
  const displayAlerts = isDemo ? DEMO_ALERTS.slice(0, 20) : alerts

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured() || isDemo) {
      return
    }

    const channel = getSupabase()
      .channel('alerts-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const incoming = payload.new as Alert
          setAlerts((prev) => [incoming, ...prev].slice(0, 20))
        },
      )
      .subscribe()

    return () => { void getSupabase().removeChannel(channel) }
  }, [isDemo])

  if (!mounted) {
    return (
      <div
        data-testid="alert-feed"
        className="flex flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50"
      >
        <div className="border-b border-slate-700/40 px-4 py-3 h-12" />
        <div className="flex-1 space-y-2 p-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="alert-feed"
      className="flex flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50"
      role="region"
      aria-label="Live Alerts"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/40 px-4 py-3">
        <div className="flex items-center gap-2">
          {!isDemo ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
            </span>
          ) : (
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500/60" />
          )}
          <h2 className="text-sm font-semibold text-slate-200">Live Alerts</h2>
        </div>
        <span className="font-mono text-[11px] text-slate-500">{displayAlerts.length} shown</span>
      </div>

      {/* Feed */}
      <ul
        className="flex-1 overflow-y-auto divide-y divide-slate-700/30"
        role="list"
        aria-live="polite"
        aria-relevant="additions"
      >
        {displayAlerts.length === 0 && (
          <li className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheckIcon />
            <p className="text-sm font-medium text-slate-400">All clear — no alerts yet</p>
            <p className="text-xs text-slate-600">System monitoring is active</p>
          </li>
        )}

        {displayAlerts.map((alert) => {
          const abbrev = PLATFORM_ABBREV[alert.platform] ?? '?'
          const color = PLATFORM_COLOR[alert.platform] ?? 'bg-slate-600/10 text-slate-500'

          return (
            <li
              key={alert.id}
              data-testid="alert-item"
              data-alert-id={alert.id}
              data-risk={alert.risk_level}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-700/20 animate-fade-in"
            >
              <span
                className={`mt-0.5 shrink-0 inline-flex h-7 w-9 items-center justify-center rounded-md font-mono text-[10px] font-bold ${color}`}
              >
                {abbrev}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  data-testid="alert-title"
                  className="truncate text-sm text-slate-200"
                  title={alert.title}
                >
                  {alert.title.length > 60 ? alert.title.slice(0, 60) + '…' : alert.title}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  {alert.device_ip}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <RiskBadge level={alert.risk_level} size="sm" />
                <span className="font-mono text-[10px] text-slate-600">
                  {timeAgo(alert.created_at)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
