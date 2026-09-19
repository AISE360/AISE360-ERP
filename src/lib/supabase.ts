import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Auth and data fetching will fail — check Netlify environment variables.'
  )
}

// Fall back to placeholder values so `createClient` doesn't throw at import
// time (which would white-screen / infinite-load the whole app). All requests
// will fail fast and our guards will redirect to /login instead of hanging.
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key'
)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
