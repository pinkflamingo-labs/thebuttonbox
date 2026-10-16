'use client'
// Supabase in the browser. Row-level security decides what each maker can see.
import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_KEY } from './env'

let client = null

export function supabaseBrowser() {
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  return client
}
