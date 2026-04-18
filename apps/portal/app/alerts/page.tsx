/**
 * Alerts Page — server component with client-side table
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { AlertTable } from '../../components/AlertTable'
import { DEMO_ALERTS, isDemoMode } from '../../lib/demo-data'
import type { Alert } from '../../lib/types'

interface AlertsPageProps {
  searchParams: { device?: string }
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  return createClient(url, anonKey)
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const deviceFilter = searchParams.device
  let dataMode: 'live' | 'inactive' | 'degraded' = 'live'
  let alerts: Alert[] = []

  const supabase = getServerSupabase()
  if (!supabase) {
    dataMode = 'inactive'
  } else {
    try {
      const query = supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (deviceFilter) {
        query.eq('device_ip', deviceFilter)
      }

      const { data } = await query
      alerts = (data ?? []) as Alert[]
    } catch {
      dataMode = 'degraded'
    }
  }

  const isDemo = isDemoMode(alerts, [])
  const displayAlerts = isDemo ? DEMO_ALERTS : alerts

  return (
    <div className="space-y-5" data-testid="alerts-page">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Alerts</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {deviceFilter ? (
            <>
              Filtering by device {deviceFilter}
              {' '}
              <a href="/alerts" className="text-teal-400 hover:underline text-xs">
                (clear)
              </a>
            </>
          ) : (
            'All risk alerts across all devices'
          )}
        </p>
      </div>

      {dataMode !== 'live' && (
        <div
          data-testid="supabase-status-banner"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          {dataMode === 'inactive'
            ? 'Supabase is inactive or not configured. Alerts are unavailable in offline mode.'
            : 'Supabase is temporarily unreachable. Alerts list may be incomplete.'}
        </div>
      )}

      <AlertTable alerts={displayAlerts} deviceFilter={deviceFilter} isDemo={isDemo} />
    </div>
  )
}
