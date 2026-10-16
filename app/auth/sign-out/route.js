// Sign out (a plain form post from any page), then back to the front page.
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sameOrigin } from '@/lib/api-guard'
import { supabaseServer } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'

async function clearSessionCookies() {
  const store = await cookies()
  for (const c of store.getAll()) {
    if (/^sb-.+-auth-token/.test(c.name)) store.delete(c.name)
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Not allowed' }, { status: 403 })
  if (supabaseConfigured()) {
    try {
      const supabase = await supabaseServer()
      const { error } = await supabase.auth.signOut()
      if (error) await clearSessionCookies()
    } catch {
      await clearSessionCookies()
    }
  }
  return NextResponse.redirect(new URL('/', request.url), 303)
}
