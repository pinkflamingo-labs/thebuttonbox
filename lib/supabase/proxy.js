// Runs before every page: refreshes the sign-in session and keeps the studio behind sign-in and the second step.
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_KEY, supabaseConfigured } from './env'

const NEEDS_SIGN_IN = ['/studio', '/account', '/security']
const NEEDS_SECOND_STEP = ['/studio', '/account']

function startsWithAny(path, list) {
  return list.some((p) => path === p || path.startsWith(`${p}/`))
}

function redirectWithCookies(request, response, pathname, params = {}) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const r = NextResponse.redirect(url)
  response.cookies.getAll().forEach((c) => r.cookies.set(c))
  return r
}

export async function updateSession(request) {
  let response = NextResponse.next({ request })
  if (!supabaseConfigured()) return response

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Do not put code between createServerClient and getUser: the session refresh depends on it.
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && startsWithAny(path, NEEDS_SIGN_IN)) {
    return redirectWithCookies(request, response, '/sign-in', { next: path })
  }

  if (user && startsWithAny(path, NEEDS_SECOND_STEP)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
      return redirectWithCookies(request, response, '/security/verify', { next: path })
    }
    if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal1') {
      const { data: settings } = await supabase.from('app_settings').select('require_mfa').eq('id', 1).maybeSingle()
      if (settings?.require_mfa !== false) {
        return redirectWithCookies(request, response, '/security/setup', { next: path })
      }
    }
  }

  return response
}
