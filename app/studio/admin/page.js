// Admin: how the studio is doing, the settings, and a set-up checklist that only ever says yes or no.
// Only for admins; everyone else gets "not found".
import { notFound } from 'next/navigation'
import PageHead from '@/components/PageHead'
import SettingsForm from './SettingsForm'
import { stripeTestMode } from '@/components/account/prices'
import { requireMaker } from '@/lib/access'
import { dateLabel } from '@/lib/format'
import '@/styles/public.css'

export const metadata = { title: 'Admin' }

const TILES = [
  { key: 'makers', label: 'Makers', family: 'pur', icon: 'i-person' },
  { key: 'new_this_week', label: 'Joined this week', family: 'pink', icon: 'i-heart' },
  { key: 'on_trial', label: 'On a free trial', family: 'blu', icon: 'i-spark' },
  { key: 'subscribed', label: 'With a plan', family: 'grn', icon: 'i-check' },
  { key: 'monthly', label: 'Monthly plans', family: 'pink', icon: 'i-spool' },
  { key: 'yearly', label: 'Yearly plans', family: 'pur', icon: 'i-tin' },
  { key: 'past_due', label: 'Payment overdue', family: 'blu', icon: 'i-basket' },
  { key: 'cancelling', label: 'Cancelling', family: 'grn', icon: 'i-signout' },
  { key: 'patterns', label: 'Patterns', family: 'pink', icon: 'i-library' },
  { key: 'makes', label: 'Makes', family: 'pur', icon: 'i-journal' },
  { key: 'stash_items', label: 'Stash items', family: 'grn', icon: 'i-stash' },
]

function has(value) {
  return Boolean(value && String(value).trim())
}

// Yes or no only: no value is ever read out or sent to the browser
function checklist() {
  const env = process.env
  return [
    { label: 'Site address', ok: has(env.NEXT_PUBLIC_SITE_URL), hint: 'NEXT_PUBLIC_SITE_URL' },
    { label: 'Supabase secret key', ok: has(env.SUPABASE_SECRET_KEY) || has(env.SUPABASE_SERVICE_ROLE_KEY), hint: 'Needed for billing, account deletion and Ravelry' },
    { label: 'Stripe key', ok: has(env.STRIPE_SECRET_KEY), hint: 'STRIPE_SECRET_KEY' },
    { label: 'Monthly and yearly prices', ok: has(env.STRIPE_PRICE_MONTHLY) && has(env.STRIPE_PRICE_YEARLY), hint: 'STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY' },
    { label: 'Joining fee price', ok: has(env.STRIPE_PRICE_JOINING), hint: 'Optional: STRIPE_PRICE_JOINING', optional: true },
    { label: 'Stripe webhook secret', ok: has(env.STRIPE_WEBHOOK_SECRET), hint: 'STRIPE_WEBHOOK_SECRET' },
    { label: 'AI reading', ok: has(env.AI_API_KEY), hint: 'Optional: AI_API_KEY', optional: true },
    { label: 'OneDrive', ok: has(env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID), hint: 'Optional: NEXT_PUBLIC_ONEDRIVE_CLIENT_ID', optional: true },
    { label: 'Google Drive', ok: has(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) && has(env.NEXT_PUBLIC_GOOGLE_API_KEY), hint: 'Optional: NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY', optional: true },
    { label: 'Dropbox', ok: has(env.NEXT_PUBLIC_DROPBOX_APP_KEY), hint: 'Optional: NEXT_PUBLIC_DROPBOX_APP_KEY', optional: true },
    { label: 'Ravelry', ok: has(env.RAVELRY_CLIENT_ID) && has(env.RAVELRY_CLIENT_SECRET), hint: 'Optional: RAVELRY_CLIENT_ID and RAVELRY_CLIENT_SECRET', optional: true },
    { label: 'Token key for Ravelry sign-ins', ok: String(env.TOKEN_ENCRYPTION_KEY || '').length >= 32, hint: 'Needed with Ravelry: TOKEN_ENCRYPTION_KEY, 32 or more characters', optional: true },
    { label: 'Google sign-in button', ok: env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'on', hint: 'Optional: NEXT_PUBLIC_GOOGLE_SIGN_IN=on', optional: true },
  ]
}

export default async function AdminPage() {
  const { supabase, profile } = await requireMaker()
  if (!profile?.is_admin) notFound()

  const { data: overview, error } = await supabase.rpc('admin_overview')
  const settings = overview?.settings || null
  const checks = checklist()
  const stripeReady = checks[2].ok && checks[3].ok && checks[5].ok
  const test = stripeTestMode()
  const needed = checks.filter((c) => !c.optional)
  const neededDone = needed.filter((c) => c.ok).length

  return (
    <div className="adm">
      <PageHead kicker="Admin" title="Looking after the studio" family="grn"
        lede="How The Button Box is doing, the settings that shape it, and what is set up." />

      {error ? (
        <p className="notice error" role="alert">
          The numbers did not load. If you have only just been made an admin, sign out and back in, then try again.
        </p>
      ) : null}

      {overview ? (
        <section className="adm-sec" aria-labelledby="adm-numbers">
          <h2 id="adm-numbers" className="vh">The numbers</h2>
          <ul className="adm-tiles">
            {TILES.map((t, i) => (
              <li key={t.key} className={`stat glass lift fam-${t.family} rise`} style={{ '--d': `${0.03 * i}s` }}>
                <span className="jewel" style={{ '--js': '40px' }} aria-hidden="true"><svg><use href={`#${t.icon}`} /></svg></span>
                <span className="n num">{Number(overview[t.key] ?? 0).toLocaleString('en-AU')}</span>
                <span className="l">{t.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="adm-cols">
        <section className="glass panel pad-lg spot-pink fam-pink adm-sec rise" style={{ '--d': '.1s' }} aria-labelledby="adm-settings">
          <header className="acct-head">
            <span className="jewel" aria-hidden="true"><svg><use href="#i-key" /></svg></span>
            <div>
              <p className="kicker">Settings</p>
              <h2 id="adm-settings" className="acct-title">How the studio works</h2>
              {settings?.updated_at ? <p className="small">Last changed {dateLabel(settings.updated_at)}</p> : null}
            </div>
          </header>
          {settings ? <SettingsForm initial={settings} stripeReady={stripeReady} /> : <p className="small">The settings did not load.</p>}
        </section>

        <section className="glass panel pad-lg spot-grn fam-grn adm-sec rise" style={{ '--d': '.16s' }} aria-labelledby="adm-checklist">
          <header className="acct-head">
            <span className="jewel" aria-hidden="true"><svg><use href="#i-check" /></svg></span>
            <div>
              <p className="kicker">Set up checklist</p>
              <h2 id="adm-checklist" className="acct-title">{neededDone} of {needed.length} essentials ready</h2>
              <p className="small">Shows only yes or no. Values are never shown here.</p>
            </div>
          </header>
          {test ? <p className="chip"><svg aria-hidden="true"><use href="#i-spark" /></svg>Stripe is in test mode</p> : null}
          <ul className="adm-checks">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? 'is-yes' : c.optional ? 'is-optional' : 'is-no'}>
                <span className="adm-mark" aria-hidden="true">
                  <svg><use href={c.ok ? '#i-check' : '#i-close'} /></svg>
                </span>
                <span className="adm-check-text">
                  <b>{c.label}</b>
                  <span className="small">{c.hint}</span>
                </span>
                <span className="adm-yes">{c.ok ? 'Yes' : 'No'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
