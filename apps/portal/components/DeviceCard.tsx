'use client'

import Link from 'next/link'
import type { Device, DeviceProfile } from '../lib/types'

interface DeviceCardProps {
  device: Device
  isDemo?: boolean
}

const PROFILE_STYLE: Record<DeviceProfile, { label: string; color: string; desc: string }> = {
  strict: { label: 'Strict', color: 'bg-green-500/15 text-green-300 ring-green-500/40 border border-green-500/30', desc: 'Ages 6–10' },
  moderate: { label: 'Moderate', color: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/40 border border-cyan-500/30', desc: 'Ages 11–14' },
  guided: { label: 'Guided', color: 'bg-blue-500/15 text-blue-300 ring-blue-500/40 border border-blue-500/30', desc: 'Ages 15–17' },
}

function formatLastSeen(iso: string | undefined): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function DeviceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  )
}

export function DeviceCard({ device, isDemo }: DeviceCardProps) {
  const profile = PROFILE_STYLE[device.profile]

  return (
    <div
      data-testid="device-card"
      data-device-ip={device.device_ip}
      role="article"
      aria-label={device.device_name}
      className="group card-premium p-4 cursor-pointer"
    >
      {/* Demo badge */}
      {isDemo && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/30">
            Demo
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-200/30 text-slate-400 group-hover:text-accent-400 group-hover:bg-accent-500/10 transition-all">
            <DeviceIcon />
          </div>
          <div className="min-w-0">
            <p
              data-testid="device-name"
              className="truncate font-semibold text-slate-100 text-sm"
            >
              {device.device_name}
            </p>
            <p
              data-testid="device-ip"
              className="font-mono text-[11px] text-slate-500"
            >
              {device.device_ip}
            </p>
          </div>
        </div>

        <span
          data-testid="device-profile"
          className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${profile.color}`}
        >
          {profile.label}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-surface-200/20 pt-3 mt-3">
        <span className="text-xs text-slate-500">
          <span className="text-slate-400">{profile.desc}</span>
          {' · '}
          <span data-testid="device-last-seen" className="text-slate-500">{formatLastSeen(device.last_seen)}</span>
        </span>

        <Link
          href={`/alerts?device=${device.device_ip}`}
          data-testid="device-alerts-link"
          aria-label={`View alerts for ${device.device_name}`}
          className="text-xs font-medium text-accent-400/80 hover:text-accent-300 transition-colors focus:ring-2 focus:ring-accent-500/30 focus:rounded focus:outline-none"
        >
          View alerts →
        </Link>
      </div>
    </div>
  )
}
