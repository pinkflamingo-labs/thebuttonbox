// Where Google sign-in and the password reset email come back to: swap the one-time code for a session,
// then carry on to a page on this site.
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'
import { OTP_TYPES, safeNext } from '@/components/auth/safeNext'

export async function GET(request) {
  const url = new URL(request.url)
  const next = safeNext(url.searchParams.get('next'), '/studio')
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const failTo = next === '/reset' ? '/forgot?error=link' : `/sign-in?error=${url.searchParams.get('error') ? 'google' : 'link'}`

  if (!supabaseConfigured()) return NextResponse.redirect(new URL('/sign-in', url))

  try {
    const supabase = await supabaseServer()
    let result = null
    if (code) result = await supabase.auth.exchangeCodeForSession(code)
    else if (tokenHash && OTP_TYPES.includes(type)) result = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!result || result.error) return NextResponse.redirect(new URL(failTo, url))
  } catch {
    return NextResponse.redirect(new URL(failTo, url))
  }
  return NextResponse.redirect(new URL(next, url))
}
