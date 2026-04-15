/**
 * Dashboard — server component
 * Fetches initial data from Supabase, passes to client components.
 */
import { createClient } from '@supabase/supabase-js'
import { AlertFeed } from '../components/AlertFeed'
import { DeviceCard } from '../components/DeviceCard'
import { RiskBadge } from '../components/RiskBadge'
import type { Alert, Device, RiskLevel } from '../lib/types'

async function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return createClient(url, key)
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
  const supabase = await getServerSupabase()

  // Fetch last 20 alerts for initial feed
  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch enrolled devices
  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .order('enrolled_at', { ascending: false })

  // Today's stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count: alertsToday } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())

  const { count: eventsToday } = await supabase
    .from('content_events')
    .select('*', { count: 'exact', head: true })
    .gte('captured_at', todayStart.toISOString())

  const alertList = (recentAlerts ?? []) as Alert[]
  const deviceList = (devices ?? []) as Device[]
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

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="stats-grid">
        <StatCard
          label="Devices"
          value={deviceList.length}
          sub="enrolled"
        />
        <StatCard
          label="Events today"
          value={eventsToday ?? 0}
          sub="captured"
        />
        <StatCard
          label="Alerts today"
          value={alertsToday ?? 0}
          sub="triggered"
          accent={(alertsToday ?? 0) > 0 ? 'text-orange-400' : 'text-slate-100'}
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
