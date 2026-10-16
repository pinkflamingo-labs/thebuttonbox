import { redirect } from 'next/navigation'
import AuthShell, { NotSetUp } from '@/components/auth/AuthShell'
import MfaSetup from '@/components/auth/MfaSetup'
import SignOutButton from '@/components/auth/SignOutButton'
import { nextAfterSecurity } from '@/components/auth/safeNext'
import { supabaseConfigured } from '@/lib/supabase/env'
import { supabaseServer } from '@/lib/supabase/server'
import '@/styles/public.css'

export const metadata = { title: 'Set up your second sign-in step' }

export default async function SecuritySetupPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const next = nextAfterSecurity(sp.next)
  if (!supabaseConfigured()) {
    return <AuthShell kicker="Second step" title="Set up your authenticator app"><NotSetUp /></AuthShell>
  }

  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/security/setup?next=${encodeURIComponent(next)}`)}`)

  const [{ data: factors }, { data: settings }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.from('app_settings').select('require_mfa').eq('id', 1).maybeSingle(),
  ])
  if (factors?.totp?.length) redirect(next)
  const canSkip = settings?.require_mfa === false

  return (
    <AuthShell
      kicker="Second step" title="Set up your authenticator app" family="grn" wide
      lede="Each time you sign in, you will type your password and then a code from an app on your phone. Someone who learns your password still cannot get in."
      below={(
        <div className="auth-below glass pad">
          <p className="small">Signed in as <b>{user.email}</b>. Not you?</p>
          <SignOutButton label="Sign out" />
        </div>
      )}
    >
      <MfaSetup next={next} canSkip={canSkip} />
    </AuthShell>
  )
}
