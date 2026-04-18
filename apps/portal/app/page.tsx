/**
 * Dashboard — server component
 * Fetches initial data from Supabase, passes to client components.
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { AlertFeed } from '../components/AlertFeed'
import { DeviceCard } from '../components/DeviceCard'
import { DEMO_DEVICES, DEMO_ALERTS, isDemoMode } from '../lib/demo-data'
import type { Alert, Device } from '../lib/types'

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  return createClient(url, anonKey)
}

function StatCard({
  label,
  value,
  sub,
  accent,
  accentBorder,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
  accentBorder?: string
}) {
  return (
    <div
      data-testid="stat-card"
      className={`rounded-xl border bg-slate-800/50 p-4 ${accentBorder ?? 'border-slate-700/60'}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-slate-100'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function ShieldPlusIcon() {
  return (
    <svg className="h-12 w-12 text-teal-500/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export default async function DashboardPage() {
  const supabase = getServerSupabase()
  let dataMode: 'live' | 'inactive' | 'degraded' = supabase ? 'live' : 'inactive'

  let alertList: Alert[] = []
  let deviceList: Device[] = []
  let alertsToday = 0
  let eventsToday = 0

  if (supabase) {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [{ data: recentAlerts }, { data: devices }, { count: alertsTodayCount }, { count: eventsTodayCount }] = await Promise.all([
        supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('devices')
          .select('*')
          .order('enrolled_at', { ascending: false }),
        supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString()),
        supabase
          .from('content_events')
          .select('*', { count: 'exact', head: true })
          .gte('captured_at', todayStart.toISOString()),
      ])

      alertList = (recentAlerts ?? []) as Alert[]
      deviceList = (devices ?? []) as Device[]
      alertsToday = alertsTodayCount ?? 0
      eventsToday = eventsTodayCount ?? 0
    } catch {
      dataMode = 'degraded'
    }
  }

  const isDemo = isDemoMode(alertList, deviceList)
  const displayAlerts = isDemo ? DEMO_ALERTS : alertList
  const displayDevices = isDemo ? DEMO_DEVICES : deviceList
  const criticalCount = displayAlerts.filter((a) => a.risk_level === 'critical').length

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Overview</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {displayDevices.length} device{displayDevices.length !== 1 ? 's' : ''} monitored · updated in real-time
        </p>
      </div>

      {dataMode !== 'live' && (
        <div
          data-testid="supabase-status-banner"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          {dataMode === 'inactive'
            ? 'Supabase is inactive or not configured. Dashboard is running in offline mode.'
            : 'Supabase is temporarily unreachable. Showing degraded view with no live data.'}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="stats-grid">
          <StatCard
            label="Devices"
            value={displayDevices.length}
            sub="enrolled"
          />
          <StatCard
            label="Events today"
            value={eventsToday}
            sub="captured"
          />
          <StatCard
            label="Alerts today"
            value={alertsToday}
            sub="triggered"
            accent={alertsToday > 0 ? 'text-orange-400' : 'text-slate-100'}
            accentBorder={alertsToday > 0 ? 'border-l-2 border-l-orange-500/50 border-slate-700/60' : 'border-slate-700/60'}
          />
          <StatCard
            label="Critical"
            value={criticalCount}
            sub="last 20 alerts"
            accent={criticalCount > 0 ? 'text-red-400' : 'text-slate-100'}
            accentBorder={criticalCount > 0 ? 'border-l-2 border-l-red-500/50 border-slate-700/60' : 'border-slate-700/60'}
          />
      </div>

      {/* Main grid: feed + devices */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left — live alert feed takes 2/3 */}
        <div className="lg:col-span-2">
          <AlertFeed initialAlerts={displayAlerts} />
        </div>

        {/* Right — enrolled devices */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Devices</h2>
            <a
              href="/devices"
              className="text-xs text-teal-400/70 hover:text-teal-400 transition-colors"
            >
              Manage →
            </a>
          </div>

          {displayDevices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center space-y-3">
              <ShieldPlusIcon />
              <div>
                <p className="text-sm font-medium text-slate-300">No devices enrolled</p>
                <p className="mt-1 text-xs text-slate-500">Start monitoring by enrolling your first device</p>
              </div>
              <a
                href="/devices"
                data-testid="enroll-cta"
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600/20 px-3 py-1.5 text-sm text-teal-400 ring-1 ring-teal-500/20 hover:bg-teal-600/30 transition-colors"
              >
                Enrol a device →
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3" data-testid="device-list">
              {displayDevices.map((device) => (
                <DeviceCard key={device.device_ip} device={device} isDemo={isDemo} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
