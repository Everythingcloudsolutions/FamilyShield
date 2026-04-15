'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { RiskBadge } from './RiskBadge'
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

// Teal-adjacent colors per platform for visual differentiation
const PLATFORM_COLOR: Record<Platform, string> = {
  youtube: 'bg-red-500/10 text-red-400',
  roblox: 'bg-blue-500/10 text-blue-400',
  discord: 'bg-indigo-500/10 text-indigo-400',
  twitch: 'bg-purple-500/10 text-purple-400',
  instagram: 'bg-pink-500/10 text-pink-400',
  tiktok: 'bg-slate-500/10 text-slate-400',
  other: 'bg-slate-600/10 text-slate-500',
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

  useEffect(() => {
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
  }, [])

  return (
    <div
      data-testid="alert-feed"
      className="flex flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
          </span>
          <h2 className="text-sm font-semibold text-slate-200">Live Alerts</h2>
        </div>
        <span className="font-mono text-[11px] text-slate-500">{alerts.length} shown</span>
      </div>

      {/* Feed */}
      <ul className="flex-1 overflow-y-auto divide-y divide-slate-700/30" role="list">
        {alerts.length === 0 && (
          <li className="flex items-center justify-center py-12 text-slate-500 text-sm">
            No alerts yet — system monitoring active
          </li>
        )}

        {alerts.map((alert) => {
          const abbrev = PLATFORM_ABBREV[alert.platform] ?? '?'
          const color = PLATFORM_COLOR[alert.platform] ?? 'bg-slate-600/10 text-slate-500'

          return (
            <li
              key={alert.id}
              data-testid="alert-item"
              data-alert-id={alert.id}
              data-risk={alert.risk_level}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-700/20"
            >
              {/* Platform abbrev badge */}
              <span
                className={`mt-0.5 shrink-0 inline-flex h-7 w-9 items-center justify-center rounded-md font-mono text-[10px] font-bold ${color}`}
              >
                {abbrev}
              </span>

              {/* Content */}
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

              {/* Right side */}
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
