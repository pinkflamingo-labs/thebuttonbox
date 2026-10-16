// Supabase with the secret key: bypasses row-level security. Server routes only (webhooks, account deletion,
// connection tokens). Never import this into a client component.
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './env'

export function supabaseAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set')
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
