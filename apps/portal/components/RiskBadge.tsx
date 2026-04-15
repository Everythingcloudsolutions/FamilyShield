'use client'

import type { RiskLevel } from '../lib/types'

interface RiskBadgeProps {
  level: RiskLevel
  size?: 'sm' | 'md'
}

const CONFIG: Record<RiskLevel, { bg: string; ring: string; dot: string; label: string; pulse: boolean }> = {
  critical: {
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/30',
    dot: 'bg-red-500',
    label: 'text-red-400',
    pulse: true,
  },
  high: {
    bg: 'bg-orange-500/10',
    ring: 'ring-orange-500/30',
    dot: 'bg-orange-500',
    label: 'text-orange-400',
    pulse: false,
  },
  medium: {
    bg: 'bg-yellow-500/10',
    ring: 'ring-yellow-500/30',
    dot: 'bg-yellow-500',
    label: 'text-yellow-400',
    pulse: false,
  },
  low: {
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'text-emerald-400',
    pulse: false,
  },
}

export function RiskBadge({ level, size = 'sm' }: RiskBadgeProps) {
  const c = CONFIG[level]
  const isSmall = size === 'sm'

  return (
    <span
      data-testid="risk-badge"
      data-level={level}
      className={[
        'inline-flex items-center gap-1.5 rounded-full ring-1 font-mono font-semibold tracking-wider uppercase',
        c.bg, c.ring, c.label,
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
      ].join(' ')}
    >
      <span className="relative flex">
        {c.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${c.dot}`}
          />
        )}
        <span
          className={[
            'relative inline-flex rounded-full',
            c.dot,
            isSmall ? 'h-1.5 w-1.5' : 'h-2 w-2',
          ].join(' ')}
        />
      </span>
      {level}
    </span>
  )
}
