import { redirect } from 'next/navigation'
import AuthShell, { NotSetUp } from '@/components/auth/AuthShell'
import SignUpForm from '@/components/auth/SignUpForm'
import { supabaseConfigured } from '@/lib/supabase/env'
import { supabaseServer } from '@/lib/supabase/server'
import '@/styles/public.css'

export const metadata = { title: 'Start free' }

export default async function SignUpPage() {
  const configured = supabaseConfigured()
  let trialDays = null
  if (configured) {
    const supabase = await supabaseServer()
    const [{ data: { user } }, { data: settings }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('app_settings').select('billing_enabled, trial_days').eq('id', 1).maybeSingle(),
    ])
    if (user) redirect('/studio')
    if (settings?.billing_enabled && settings.trial_days > 0) trialDays = settings.trial_days
  }
  return (
    <AuthShell kicker="Start free" title="Open your own studio" family="pink"
      lede="Every craft, one studio. It takes a minute, then you set up a second sign-in step to keep it safe.">
      {configured ? <SignUpForm google={process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'on'} trialDays={trialDays} /> : <NotSetUp />}
    </AuthShell>
  )
}
