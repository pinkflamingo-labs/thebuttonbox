import Link from 'next/link'
import { redirect } from 'next/navigation'
import AuthShell, { NotSetUp } from '@/components/auth/AuthShell'
import MfaVerify from '@/components/auth/MfaVerify'
import SignOutButton from '@/components/auth/SignOutButton'
import { nextAfterSecurity } from '@/components/auth/safeNext'
import { supabaseConfigured } from '@/lib/supabase/env'
import { supabaseServer } from '@/lib/supabase/server'
import '@/styles/public.css'

export const metadata = { title: 'Your second sign-in step' }

export default async function SecurityVerifyPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const next = nextAfterSecurity(sp.next)
  if (!supabaseConfigured()) {
    return <AuthShell kicker="Second step" title="Type your code"><NotSetUp /></AuthShell>
  }

  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/security/verify?next=${encodeURIComponent(next)}`)}`)

  const [{ data: factors }, { data: aal }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ])
  const verified = (factors?.totp || []).map((f, i) => ({
    id: f.id,
    name: f.friendly_name || (i ? `Authenticator app ${i + 1}` : 'Authenticator app'),
  }))
  if (!verified.length) redirect(`/security/setup?next=${encodeURIComponent(next)}`)
  if (aal?.currentLevel === 'aal2') redirect(next)

  return (
    <AuthShell
      kicker="Second step" title="Type your code" family="grn"
      lede="Open the authenticator app on your phone and type the six-digit code it shows right now."
      below={(
        <div className="auth-below glass pad">
          <details className="auth-help">
            <summary>Lost your phone, or the app was reset?</summary>
            <p>
              Please contact the person who runs this site, using the email address on the <Link href="/privacy">privacy page</Link>.
              Once they have checked it is you, they can remove the old app from your account, and you can set up a new one
              the next time you sign in.
            </p>
            <p className="small">If you set up a second app on another device, choose it above instead.</p>
          </details>
          <div className="spread">
            <p className="small">Signed in as <b>{user.email}</b>.</p>
            <SignOutButton label="Sign out" />
          </div>
        </div>
      )}
    >
      <MfaVerify factors={verified} next={next} />
    </AuthShell>
  )
}
