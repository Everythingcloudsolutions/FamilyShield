/**
 * Supabase Browser Client — lazy singleton factory
 *
 * createClient() is NOT called at module load time. This prevents Next.js
 * from throwing "supabaseUrl is required" when it evaluates the module
 * graph during `next build` (env vars are not set in the Docker build env).
 *
 * Call getSupabase() inside components, hooks, and event handlers only —
 * never at module scope.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | undefined

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { realtime: { params: { eventsPerSecond: 10 } } },
    )
  }
  return _client
}
