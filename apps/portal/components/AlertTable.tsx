'use client'

import { useState, useMemo } from 'react'
import { RiskBadge } from './RiskBadge'
import { isDemoMode, DEMO_ALERTS } from '../lib/demo-data'
import type { Alert, RiskLevel, Platform } from '../lib/types'

interface AlertTableProps {
  alerts: Alert[]
  deviceFilter?: string
  isDemo?: boolean
}

const RISK_LEVELS: RiskLevel[] = ['critical', 'high', 'medium', 'low']
const PLATFORMS: Platform[] = ['youtube', 'roblox', 'discord', 'instagram', 'tiktok', 'other']

type SortField = 'created_at' | 'risk_level' | 'platform' | 'device_ip'
type SortDir = 'asc' | 'desc'

const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 }

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function FunnelIcon() {
  return (
    <svg className="h-8 w-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 00-.894.553M3 4l6.893 10.002m0 0l6.897-10.002M3 4h18M17.107 14.107L24 4m-21 10h18" />
    </svg>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block transition-colors ${active ? 'text-teal-400' : 'text-slate-600'}`}>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  )
}

export function AlertTable({ alerts: initialAlerts, deviceFilter, isDemo: isdemoProp }: AlertTableProps) {
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: 'created_at',
    dir: 'desc',
  })

  const isDemo = isdemoProp || isDemoMode(initialAlerts, [])
  const alerts = isDemo && initialAlerts.length === 0 ? DEMO_ALERTS : initialAlerts

  function toggleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { field, dir: 'desc' },
    )
  }

  const filtered = useMemo(() => {
    let rows = [...alerts]

    if (deviceFilter) rows = rows.filter((a) => a.device_ip === deviceFilter)
    if (riskFilter) rows = rows.filter((a) => a.risk_level === riskFilter)
    if (platformFilter) rows = rows.filter((a) => a.platform === platformFilter)

    rows.sort((a, b) => {
      let cmp = 0
      if (sort.field === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sort.field === 'risk_level') {
        cmp = (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4)
      } else if (sort.field === 'platform') {
        cmp = a.platform.localeCompare(b.platform)
      } else if (sort.field === 'device_ip') {
        cmp = a.device_ip.localeCompare(b.device_ip)
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [alerts, deviceFilter, riskFilter, platformFilter, sort])

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          data-testid="filter-risk"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          aria-label="Filter by risk level"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
        >
          <option value="">All risks</option>
          {RISK_LEVELS.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>

        <select
          data-testid="filter-platform"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          aria-label="Filter by platform"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>

        {(riskFilter || platformFilter) && (
          <button
            onClick={() => { setRiskFilter(''); setPlatformFilter('') }}
            aria-label="Clear all active filters"
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-teal-400 transition-colors"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto font-mono text-[11px] text-slate-500">
          {filtered.length} / {alerts.length} events
        </span>
      </div>

      {/* Mobile Card View (sm:hidden) */}
      <div className="sm:hidden flex flex-col gap-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-2 rounded-lg border border-slate-700/60 bg-slate-800/20">
            <FunnelIcon />
            <p className="text-sm text-slate-400">No alerts match the current filters</p>
            <button
              onClick={() => { setRiskFilter(''); setPlatformFilter('') }}
              className="text-xs text-teal-400 hover:underline mt-2"
            >
              Clear filters
            </button>
          </div>
        )}
        {filtered.map((alert) => (
          <div
            key={alert.id}
            data-testid="alert-card"
            data-alert-id={alert.id}
            data-risk={alert.risk_level}
            className="rounded-lg border border-slate-700/60 bg-slate-800/20 p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200 truncate">{alert.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{alert.platform} • {formatTime(alert.created_at)}</p>
              </div>
              <RiskBadge level={alert.risk_level} size="sm" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">{alert.device_ip}</span>
              <span>
                {alert.risk_confidence != null
                  ? `${(alert.risk_confidence * 100).toFixed(0)}%`
                  : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (hidden sm:block) */}
      <div
        data-testid="alert-table"
        className="hidden sm:block overflow-hidden rounded-xl border border-slate-700/60"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Risk alerts" aria-rowcount={filtered.length}>
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-800/80">
                {(
                  [
                    { label: 'Time', field: 'created_at' as SortField },
                    { label: 'Device', field: 'device_ip' as SortField },
                    { label: 'Platform', field: 'platform' as SortField },
                    { label: 'Title', field: null },
                    { label: 'Risk', field: 'risk_level' as SortField },
                    { label: 'Conf.', field: null },
                    { label: 'AI', field: null },
                  ] as { label: string; field: SortField | null }[]
                ).map(({ label, field }) => (
                  <th
                    key={label}
                    onClick={field ? () => toggleSort(field) : undefined}
                    scope="col"
                    aria-sort={
                      field
                        ? sort.field === field
                          ? sort.dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                    className={[
                      'px-4 py-2.5 text-left font-medium text-slate-400 text-xs tracking-wider',
                      field ? 'cursor-pointer select-none hover:text-slate-200' : '',
                    ].join(' ')}
                  >
                    {label}
                    {field && (
                      <SortIcon
                        active={sort.field === field}
                        dir={sort.field === field ? sort.dir : 'desc'}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/30 bg-slate-800/20">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FunnelIcon />
                      <p className="text-sm text-slate-400">No alerts match the current filters</p>
                      <button
                        onClick={() => { setRiskFilter(''); setPlatformFilter('') }}
                        className="text-xs text-teal-400 hover:underline mt-2"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {filtered.map((alert) => (
                <tr
                  key={alert.id}
                  data-testid="alert-row"
                  data-alert-id={alert.id}
                  data-risk={alert.risk_level}
                  className="transition-colors hover:bg-slate-700/20"
                >
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {formatTime(alert.created_at)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                    {alert.device_ip}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-300 capitalize">
                    {alert.platform}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-300 max-w-[240px] truncate" title={alert.title}>
                    {alert.title}
                  </td>
                  <td className="px-4 py-2.5">
                    <RiskBadge level={alert.risk_level} size="sm" />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                    {alert.risk_confidence != null
                      ? `${(alert.risk_confidence * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 uppercase">
                    {alert.ai_provider ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
