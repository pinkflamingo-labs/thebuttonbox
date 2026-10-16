import AuthShell, { NotSetUp } from '@/components/auth/AuthShell'
import ResetForm from '@/components/auth/ResetForm'
import { supabaseConfigured } from '@/lib/supabase/env'
import '@/styles/public.css'

export const metadata = { title: 'Choose a new password' }

export default function ResetPage() {
  return (
    <AuthShell kicker="New password" title="Choose a new password" family="blu"
      lede="Make it at least 10 characters. A short sentence you will remember works well.">
      {supabaseConfigured() ? <ResetForm /> : <NotSetUp />}
    </AuthShell>
  )
}
