// The maker's account: details, plan and billing, sign-in and security, connections and their data.
// Outside the studio layout, so it wraps itself; the proxy has already checked both sign-in steps.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import PageHead from '@/components/PageHead'
import DetailsForm from '@/components/account/DetailsForm'
import SecurityPanel from '@/components/account/SecurityPanel'
import ConnectionsPanel from '@/components/account/ConnectionsPanel'
import DataPanel from '@/components/account/DataPanel'
import { PortalButton } from '@/components/account/BillingButtons'
import { stripeTestMode } from '@/components/account/prices'
import { accessWords, isLive, planName, renewalWords, statusWords } from '@/components/account/words'
import { requireMaker } from '@/lib/access'
import { stripeConfigured } from '@/lib/billing'
import { supabaseConfigured } from '@/lib/supabase/env'
import '@/styles/public.css'

export const metadata = { title: 'Your account' }
export const dynamic = 'force-dynamic'

const JUMPS = [
  { id: 'details', label: 'Your details' },
  { id: 'billing', label: 'Plan and billing' },
  { id: 'connections', label: 'Connections' },
  { id: 'security', label: 'Sign-in and security' },
  { id: 'data', label: 'Your data' },
]

function SectionHead({ id, icon, kicker, title, children }) {
  return (
    <header className="acct-head">
      <span className="jewel" aria-hidden="true"><svg><use href={`#${icon}`} /></svg></span>
      <div>
        <p className="kicker">{kicker}</p>
        <h2 id={id} className="acct-title">{title}</h2>
        {children ? <p className="small">{children}</p> : null}
      </div>
    </header>
  )
}

export default async function AccountPage({ searchParams }) {
  if (!supabaseConfigured()) redirect('/sign-in')
  const sp = (await searchParams) || {}
  const { supabase, user, profile, settings, subscription, access } = await requireMaker()

  const [{ data: connections }, { data: factorData }, { data: customer }] = await Promise.all([
    supabase.rpc('my_connections'),
    supabase.auth.mfa.listFactors(),
    supabase.from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle(),
  ])
  const factors = (factorData?.totp || []).map((f) => ({ id: f.id, name: f.friendly_name || 'Authenticator app', created: f.created_at }))
  const stripeOn = stripeConfigured()
  const billingOn = settings?.billing_enabled === true
  const canManage = stripeOn && Boolean(customer?.stripe_customer_id)
  const live = isLive(subscription)
  const test = stripeTestMode()
  const paid = sp.billing === 'success'

  return (
    <div className="wrap acct">
      <PageHead kicker="Account" title="Your account" family="pur"
        lede={`Signed in as ${user.email}. Your details, plan, security and data, all in one place.`}>
        <Link className="btn soft" href="/studio"><svg aria-hidden="true"><use href="#i-home" /></svg>Back to your studio</Link>
      </PageHead>

      {paid ? (
        <p className="notice acct-paid" role="status">
          {live
            ? 'Thank you. Your plan is all set and your studio is open.'
            : 'Thank you, your payment went through. Your plan can take a moment to appear here, so refresh the page if it does not.'}
        </p>
      ) : null}

      <nav className="acct-jump pills" aria-label="On this page">
        {JUMPS.map((j) => <a key={j.id} className="pill" href={`#${j.id}-sec`}>{j.label}</a>)}
      </nav>

      <div className="acct-cols">
        <div className="acct-col">
          <section id="details-sec" className="acct-sec glass panel spot-pink fam-pink rise" aria-labelledby="details">
            <SectionHead id="details" icon="i-person" kicker="Your details" title="How your studio knows you">
              Your name, how you like to measure and the room you love most.
            </SectionHead>
            <DetailsForm userId={user.id} initial={{
              display_name: profile?.display_name || '',
              units: profile?.units || 'metric',
              favourite_room: profile?.favourite_room || '',
            }} />
          </section>

          <section id="billing-sec" className="acct-sec glass panel spot-blu fam-pur rise" style={{ '--d': '.08s' }} aria-labelledby="billing">
            <SectionHead id="billing" icon="i-tin" kicker="Plan and billing" title="Your plan" />
            {test ? <p className="chip acct-test"><svg aria-hidden="true"><use href="#i-spark" /></svg>Test mode: no real payments are taken</p> : null}
            <p className="acct-access">{accessWords(access)}</p>
            {subscription ? (
              <div className="acct-plan">
                <div className="row" style={{ '--gap': '10px' }}>
                  <p className="acct-plan-name">{planName(subscription.plan)}</p>
                  <span className="tag">{statusWords(subscription.status)}</span>
                </div>
                {renewalWords(subscription) ? <p>{renewalWords(subscription)}</p> : null}
              </div>
            ) : null}
            <div className="row" style={{ '--gap': '10px' }}>
              {billingOn && !live ? (
                <Link className="btn" href="/pricing">
                  <svg aria-hidden="true" style={{ '--btn': '#F2B8CF' }}><use href="#i-button" /></svg>Choose a plan
                </Link>
              ) : null}
              {canManage ? <PortalButton label="Manage billing" className={live ? 'btn' : 'btn soft'} /> : null}
            </div>
            {canManage ? (
              <p className="small">Manage billing opens Stripe&apos;s secure page, where you can change your card, see receipts or cancel.</p>
            ) : null}
          </section>

          <section id="connections-sec" className="acct-sec glass panel spot-grn fam-grn rise" style={{ '--d': '.16s' }} aria-labelledby="connections">
            <SectionHead id="connections" icon="i-link" kicker="Connections" title="Connected accounts">
              Used only to import your patterns when you ask.
            </SectionHead>
            <ConnectionsPanel connections={connections || []} />
          </section>
        </div>

        <div className="acct-col">
          <section id="security-sec" className="acct-sec glass panel spot-blu fam-blu rise" style={{ '--d': '.1s' }} aria-labelledby="security">
            <SectionHead id="security" icon="i-shield" kicker="Sign-in and security" title="Keeping your studio yours">
              {settings?.require_mfa === false
                ? 'Two-step sign-in is optional on this site at the moment. We strongly suggest it.'
                : 'Two-step sign-in is required: your password, then a code from your authenticator app.'}
            </SectionHead>
            <SecurityPanel factors={factors} requireMfa={settings?.require_mfa !== false} />
          </section>

          <section id="data-sec" className="acct-sec glass panel spot-pink fam-pink rise" style={{ '--d': '.18s' }} aria-labelledby="data">
            <SectionHead id="data" icon="i-file" kicker="Your data" title="Take it with you, or take it away">
              Everything you add is yours. Take a copy any time, or delete it all.
            </SectionHead>
            <DataPanel />
          </section>
        </div>
      </div>
    </div>
  )
}
