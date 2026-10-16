// Supabase keys. The publishable key is safe in the browser; the secret key never leaves the server.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}
