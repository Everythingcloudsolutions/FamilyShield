'use client'

import Link from 'next/link'
import type { Device, DeviceProfile } from '../lib/types'

interface DeviceCardProps {
  device: Device
}

const PROFILE_STYLE: Record<DeviceProfile, { label: string; color: string; desc: string }> = {
  strict: { label: 'Strict', color: 'bg-green-500/10 text-green-400 ring-green-500/30', desc: 'Ages 6–10' },
  moderate: { label: 'Moderate', color: 'bg-teal-500/10 text-teal-400 ring-teal-500/30', desc: 'Ages 11–14' },
  guided: { label: 'Guided', color: 'bg-blue-500/10 text-blue-400 ring-blue-500/30', desc: 'Ages 15–17' },
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

export function DeviceCard({ device }: DeviceCardProps) {
  const profile = PROFILE_STYLE[device.profile]

  return (
    <div
      data-testid="device-card"
      data-device-ip={device.device_ip}
      className="group rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 transition-all hover:border-teal-500/40 hover:bg-slate-800 hover:shadow-lg hover:shadow-teal-500/5"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700/60 text-slate-400 group-hover:text-teal-400 transition-colors">
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
      <div className="flex items-center justify-between border-t border-slate-700/40 pt-3">
        <span className="text-[11px] text-slate-500">
          <span className="text-slate-400">{profile.desc}</span>
          {' · '}
          <span data-testid="device-last-seen">{formatLastSeen(device.last_seen)}</span>
        </span>

        <Link
          href={`/alerts?device=${device.device_ip}`}
          data-testid="device-alerts-link"
          className="text-[11px] font-medium text-teal-400/70 hover:text-teal-400 transition-colors"
        >
          View alerts →
        </Link>
      </div>
    </div>
  )
}
