// The link in the "confirm your email" message: check it with Supabase, then on to setting up the second step.
// Works with the token_hash email template and with the default template (a one-time code).
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'
import { OTP_TYPES, safeNext } from '@/components/auth/safeNext'

export async function GET(request) {
  const url = new URL(request.url)
  const next = safeNext(url.searchParams.get('next'), '/security/setup')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const code = url.searchParams.get('code')
  const failTo = type === 'recovery' ? '/forgot?error=link' : '/sign-in?error=confirm'

  if (!supabaseConfigured()) return NextResponse.redirect(new URL('/sign-in', url))

  try {
    const supabase = await supabaseServer()
    let result = null
    if (tokenHash && OTP_TYPES.includes(type)) result = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    else if (code) result = await supabase.auth.exchangeCodeForSession(code)
    if (!result || result.error) return NextResponse.redirect(new URL(failTo, url))
  } catch {
    return NextResponse.redirect(new URL(failTo, url))
  }
  return NextResponse.redirect(new URL(next, url))
}
