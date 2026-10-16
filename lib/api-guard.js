// For API routes: the signed-in maker, with the second sign-in step done, and (optionally) access to add things.
// Returns { supabase, user, profile, settings, access } or { error: Response } to return straight away.
import { supabaseServer } from './supabase/server'
import { computeAccess } from './access'
import { READ_ONLY_MESSAGE } from './errors'

function fail(status, message) {
  return { error: Response.json({ error: message }, { status }) }
}

export async function requireApiMaker({ needAccess = false } = {}) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail(401, 'Please sign in again.')

  const [{ data: aal }, { data: profile }, { data: settings }, { data: subscription }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('app_settings').select('billing_enabled, require_mfa, trial_days').eq('id', 1).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') return fail(403, 'Please finish the second sign-in step first.')
  if (settings?.require_mfa !== false && aal?.currentLevel !== 'aal2') return fail(403, 'Please set up your authenticator app first.')

  const access = computeAccess({ profile, settings, subscription })
  if (needAccess && !access.ok) return fail(402, READ_ONLY_MESSAGE)
  return { supabase, user, profile, settings, subscription, access }
}

// Only accept JSON from our own pages
export function sameOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}
