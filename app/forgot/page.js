import AuthShell, { NotSetUp } from '@/components/auth/AuthShell'
import ForgotForm from '@/components/auth/ForgotForm'
import { supabaseConfigured } from '@/lib/supabase/env'
import '@/styles/public.css'

export const metadata = { title: 'Forgotten password' }

export default async function ForgotPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const errorKey = Array.isArray(sp.error) ? sp.error[0] : sp.error
  const notice = errorKey === 'link' ? 'That link has expired or was already used. Ask for a new one below.' : ''
  return (
    <AuthShell kicker="Forgotten password" title="Let us send you a link" family="blu"
      lede="Type the email you use for The Button Box. We will send a link to choose a new password.">
      {supabaseConfigured() ? <ForgotForm notice={notice} /> : <NotSetUp />}
    </AuthShell>
  )
}
