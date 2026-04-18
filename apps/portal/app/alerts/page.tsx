/**
 * Alerts Page — server component (reads URL params only)
 * Data fetching is handled client-side inside AlertTable so that
 * Playwright route mocks and Supabase Realtime both work correctly.
 */
export const dynamic = 'force-dynamic'

import { AlertTable } from '../../components/AlertTable'

interface AlertsPageProps {
  searchParams: Promise<{ device?: string }>
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const resolvedParams = await searchParams
  const deviceFilter = resolvedParams.device

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

      <AlertTable deviceFilter={deviceFilter} />
    </div>
  )
}
