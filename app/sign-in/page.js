import { redirect } from 'next/navigation'
import AuthShell, { NotSetUp } from '@/components/auth/AuthShell'
import SignInForm from '@/components/auth/SignInForm'
import { safeNext } from '@/components/auth/safeNext'
import { supabaseConfigured } from '@/lib/supabase/env'
import { supabaseServer } from '@/lib/supabase/server'
import '@/styles/public.css'

export const metadata = { title: 'Sign in' }

const NOTICES = {
  link: 'That sign-in link has expired or was already used. Please sign in below.',
  confirm: 'That confirmation link has expired or was opened in a different browser. Your email may already be confirmed, so try signing in. If it says your email is not confirmed, you can send a new link from here.',
  google: 'Google sign-in did not finish. Please try again, or use your email and password.',
}

export default async function SignInPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const wanted = safeNext(sp.next)
  const next = /^\/(sign-in|sign-up|forgot)/.test(wanted) ? '/studio' : wanted
  const configured = supabaseConfigured()
  if (configured) {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect(next)
  }
  const errorKey = Array.isArray(sp.error) ? sp.error[0] : sp.error
  return (
    <AuthShell kicker="Welcome back" title="Sign in to your studio" family="pur"
      lede="Your patterns, stash, plans and makes are just where you left them.">
      {configured ? (
        <SignInForm next={next} google={process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'on'} notice={NOTICES[errorKey] || ''} />
      ) : <NotSetUp />}
    </AuthShell>
  )
}
