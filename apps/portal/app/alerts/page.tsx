/**
 * Alerts Page — server component with client-side table
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { AlertTable } from '../../components/AlertTable'
import type { Alert } from '../../lib/types'

interface AlertsPageProps {
  searchParams: { device?: string }
}

async function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const deviceFilter = searchParams.device

  const supabase = await getServerSupabase()
  const query = supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (deviceFilter) {
    query.eq('device_ip', deviceFilter)
  }

  const { data } = await query
  const alerts = (data ?? []) as Alert[]

  return (
    <div className="space-y-5" data-testid="alerts-page">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Alerts</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {deviceFilter
            ? `Filtering by device ${deviceFilter}`
            : 'All risk alerts across all devices'}
        </p>
      </div>

      <AlertTable alerts={alerts} deviceFilter={deviceFilter} />
    </div>
  )
}
