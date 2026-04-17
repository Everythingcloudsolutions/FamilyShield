/**
 * Dashboard — server component
 * Fetches initial data from Supabase, passes to client components.
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { AlertFeed } from '../components/AlertFeed'
import { DeviceCard } from '../components/DeviceCard'
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
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div
      data-testid="stat-card"
      className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-slate-100'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
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

  const criticalCount = alertList.filter((a) => a.risk_level === 'critical').length

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Overview</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {deviceList.length} device{deviceList.length !== 1 ? 's' : ''} monitored · updated in real-time
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
          value={deviceList.length}
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
        />
        <StatCard
          label="Critical"
          value={criticalCount}
          sub="last 20 alerts"
          accent={criticalCount > 0 ? 'text-red-400' : 'text-slate-100'}
        />
      </div>

      {/* Main grid: feed + devices */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left — live alert feed takes 2/3 */}
        <div className="lg:col-span-2">
          <AlertFeed initialAlerts={alertList} />
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

          {deviceList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
              <p className="text-sm text-slate-500">No devices enrolled</p>
              <a
                href="/devices"
                data-testid="enroll-cta"
                className="mt-2 inline-flex text-sm text-teal-400 hover:underline"
              >
                Enrol a device →
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3" data-testid="device-list">
              {deviceList.map((device) => (
                <DeviceCard key={device.device_ip} device={device} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
