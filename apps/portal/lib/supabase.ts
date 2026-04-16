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

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function getSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }

  if (!_client) {
    _client = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { realtime: { params: { eventsPerSecond: 10 } } },
    )
  }
  return _client
}
