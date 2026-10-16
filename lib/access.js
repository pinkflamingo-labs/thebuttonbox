// Who is signed in, their profile, and whether they can add and change things (billing, trial or admin).
import { redirect } from 'next/navigation'
import { supabaseServer } from './supabase/server'

export function computeAccess({ profile, settings, subscription }) {
  const now = Date.now()
  const billingOn = settings?.billing_enabled === true
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0
  const trialDaysLeft = trialEnds > now ? Math.ceil((trialEnds - now) / 86400000) : 0
  const live = subscription && ['active', 'trialing', 'past_due'].includes(subscription.status)
    && (!subscription.current_period_end || new Date(subscription.current_period_end).getTime() > now - 3 * 86400000)

  if (!billingOn) return { ok: true, reason: 'billing_off', trialDaysLeft, billingOn }
  if (profile?.is_admin) return { ok: true, reason: 'admin', trialDaysLeft, billingOn }
  if (live) return { ok: true, reason: subscription.status === 'past_due' ? 'past_due' : 'subscribed', trialDaysLeft, billingOn }
  if (trialDaysLeft > 0) return { ok: true, reason: 'trial', trialDaysLeft, billingOn }
  return { ok: false, reason: 'lapsed', trialDaysLeft: 0, billingOn }
}

export async function getMaker() {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null, settings: null, subscription: null, access: { ok: false, reason: 'signed_out' } }
  const [{ data: profile }, { data: settings }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('app_settings').select('billing_enabled, require_mfa, trial_days').eq('id', 1).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  return { supabase, user, profile, settings, subscription, access: computeAccess({ profile, settings, subscription }) }
}

// For studio pages: signed in (the proxy has already checked the second step)
export async function requireMaker() {
  const maker = await getMaker()
  if (!maker.user) redirect('/sign-in')
  return maker
}
