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
      className={`card-premium group cursor-default ${accentBorder ?? ''}`}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 group-hover:text-slate-300 transition-colors">{label}</p>
          <p className={`mt-3 text-3xl font-display font-bold tracking-tight ${accent ?? 'text-slate-100'}`}>{value}</p>
        </div>
        {sub && <p className="mt-2 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{sub}</p>}
      </div>
    </div>
  )
}

function ShieldPlusIcon() {
  return (
    <svg className="h-12 w-12 text-accent-500/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400 text-sm">
          {displayDevices.length} device{displayDevices.length !== 1 ? 's' : ''} monitored · updated in real-time
        </p>
      </div>

      {dataMode !== 'live' && (
        <div
          data-testid="supabase-status-banner"
          className="card border-l-4 border-l-accent-500 bg-gradient-to-r from-accent-500/5 to-orange-500/5 p-4 text-sm"
        >
          <div className="flex gap-3">
            <svg className="h-5 w-5 text-accent-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-slate-300">
              {dataMode === 'inactive'
                ? 'Supabase is not configured. Running in demo mode.'
                : 'Supabase connection temporary. Showing degraded view.'}
            </p>
          </div>
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
            accentBorder={alertsToday > 0 ? 'border-l-2 border-l-orange-500/60 shadow-lg shadow-orange-500/10' : ''}
          />
          <StatCard
            label="Critical"
            value={criticalCount}
            sub="last 20 alerts"
            accent={criticalCount > 0 ? 'text-red-400' : 'text-slate-100'}
            accentBorder={criticalCount > 0 ? 'border-l-2 border-l-red-500/60 shadow-lg shadow-red-500/10' : ''}
          />
      </div>

      {/* Main grid: feed + devices */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left — live alert feed takes 2/3 */}
        <div className="lg:col-span-2">
          <AlertFeed initialAlerts={displayAlerts} />
        </div>

        {/* Right — enrolled devices */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Devices</h2>
            <a
              href="/devices"
              className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors underline underline-offset-2"
            >
              Manage →
            </a>
          </div>

          {displayDevices.length === 0 ? (
            <div className="card border-dashed p-8 text-center space-y-4 flex flex-col justify-center">
              <ShieldPlusIcon />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">No devices enrolled</p>
                <p className="text-xs text-slate-500">Start monitoring by enrolling your first device</p>
              </div>
              <a
                href="/devices"
                data-testid="enroll-cta"
                className="btn-primary mt-2 mx-auto"
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
