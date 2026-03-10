import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    })
    throw new Error(
      `Missing Supabase environment variables. URL: ${supabaseUrl ? 'set' : 'missing'}, Key: ${supabaseAnonKey ? 'set' : 'missing'}`
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
