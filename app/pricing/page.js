// Pricing: plans and amounts straight from Stripe, the joining fee when there is one, the trial from the admin
// settings, and plain answers. When billing is off it says so: everything is open while in preview.
import Link from 'next/link'
import Seam from '@/components/Seam'
import SiteFooter from '@/components/landing/SiteFooter'
import { PlanButton, PortalButton } from '@/components/account/BillingButtons'
import { perInterval, pricesForDisplay, stripeTestMode } from '@/components/account/prices'
import { isLive, planName, renewalWords, statusWords } from '@/components/account/words'
import { getMaker } from '@/lib/access'
import { stripeConfigured } from '@/lib/billing'
import { money } from '@/lib/format'
import { supabaseConfigured } from '@/lib/supabase/env'
import '@/styles/public.css'

export const metadata = {
  title: 'Pricing',
  description: 'One studio for every craft, paid monthly or yearly. Cancel any time; your things stay yours.',
}

const INCLUDED = [
  'All four rooms and every craft in them',
  'Pattern library, with your size worked out',
  'Stash, What can I make? and the planner',
  'Shopping lists and the makes journal',
  'Toolbox converters, calculators and charts',
  'Imports from your computer, cloud drives and Ravelry',
  'Two-step sign-in and private photos',
]

const PLAN_LOOK = {
  monthly: { name: 'Monthly', family: 'pink', icon: 'i-spool', blurb: 'Pay as you go, a month at a time.' },
  yearly: { name: 'Yearly', family: 'pur', icon: 'i-tin', blurb: 'One payment a year for the whole tin.' },
}

async function loadMaker() {
  if (!supabaseConfigured()) return { signedIn: false, settings: null, profile: null, subscription: null }
  try {
    const maker = await getMaker()
    let settings = maker.settings
    if (!settings) {
      const { data } = await maker.supabase.from('app_settings').select('billing_enabled, require_mfa, trial_days').eq('id', 1).maybeSingle()
      settings = data || null
    }
    return { signedIn: Boolean(maker.user), settings, profile: maker.profile, subscription: maker.subscription }
  } catch {
    return { signedIn: false, settings: null, profile: null, subscription: null }
  }
}

function faqFor({ billingOn, trialDays }) {
  const list = [
    {
      q: 'Can I cancel any time?',
      a: 'Yes. Choose Manage billing on your account page to open the billing portal, run by Stripe, and cancel there. Your plan then stops at the end of the time you have paid for.',
    },
    {
      q: 'Are my things still mine?',
      a: 'Always. Your patterns, notes, measurements and photos belong to you. Download everything as a file from your account page whenever you like, with a plan or without one.',
    },
    {
      q: 'What happens when a plan ends?',
      a: 'Your studio becomes read-only. Everything stays exactly where it is, so you can still open it, look things up and export it all. Nothing is deleted. Choose a plan again and you can carry on adding straight away.',
    },
    {
      q: 'Is paying safe?',
      a: 'Payments are handled by Stripe on its own secure pages. The Button Box never sees or keeps your card number.',
    },
  ]
  if (!billingOn) {
    list.unshift({ q: 'Do I need to pay anything now?', a: 'No. Billing is not switched on yet, so everything is open while The Button Box is in preview.' })
  } else if (trialDays > 0) {
    list.unshift({
      q: 'Do I need a card to start?',
      a: `No. A new studio starts with a free trial of ${trialDays} ${trialDays === 1 ? 'day' : 'days'}, and no card is needed. Choose a plan whenever you are ready.`,
    })
  }
  return list
}

export default async function PricingPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const { signedIn, settings, profile, subscription } = await loadMaker()
  const billingOn = settings?.billing_enabled === true
  const stripeOn = stripeConfigured()
  const prices = billingOn && stripeOn ? await pricesForDisplay() : null
  const hasPlans = Boolean(prices?.monthly || prices?.yearly)
  const mode = !billingOn ? 'preview' : !stripeOn ? 'soon' : hasPlans ? 'plans' : 'unavailable'
  const trialDays = Number(settings?.trial_days) || 0
  const live = isLive(subscription)
  const joinFee = prices?.joining && !profile?.join_fee_paid_at ? prices.joining : null
  const test = stripeTestMode()
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0
  const trialLeftMs = trialEnds - Date.now()
  const trialDaysLeft = trialLeftMs > 0 ? Math.ceil(trialLeftMs / 86400000) : 0
  const carriesOver = trialLeftMs > 48 * 3600 * 1000
  const billingNote = sp.billing === 'cancelled'

  const monthly = prices?.monthly
  const yearly = prices?.yearly
  const sameCurrency = monthly && yearly && monthly.currency === yearly.currency
  const yearlySaving = sameCurrency && monthly.interval === 'month' && yearly.interval === 'year' && yearly.amount < monthly.amount * 12
    ? Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100)
    : 0

  function actionFor(key) {
    if (!signedIn) {
      return (
        <Link className="btn" href="/sign-up">
          <svg aria-hidden="true" style={{ '--btn': '#F2B8CF' }}><use href="#i-button" /></svg>
          {trialDays > 0 ? 'Start your free trial' : 'Create your account'}
        </Link>
      )
    }
    if (live) {
      return subscription.plan === key
        ? <p className="small">This is your plan. Use Manage billing above to change your card or cancel.</p>
        : <p className="small">To switch to this plan, use Manage billing above.</p>
    }
    return <PlanButton plan={key} label={key === 'monthly' ? 'Choose monthly' : 'Choose yearly'} />
  }

  return (
    <div className="pub">
      <div className="wrap price">
        <header className="price-head rise">
          <p className="kicker">Pricing</p>
          <h1 className="display h1">One studio for every craft</h1>
          <p className="lede">
            One plan with everything inside, paid monthly or yearly. Cancel any time, and your things always stay yours.
          </p>
          {test ? (
            <p className="price-test chip"><svg aria-hidden="true"><use href="#i-spark" /></svg>Test mode: no real payments are taken</p>
          ) : null}
        </header>

        {billingNote ? (
          <p className="notice warn price-note" role="status">
            Checkout was closed before paying, so nothing was charged. Choose a plan whenever you are ready.
          </p>
        ) : null}

        {mode === 'preview' ? (
          <div className="backlit fam-grn rise" style={{ '--d': '.1s' }}>
            <section className="price-preview glass panel spot-grn fam-grn" aria-labelledby="preview-title">
              <span className="jewel" aria-hidden="true"><svg><use href="#i-heart" /></svg></span>
              <div className="stack">
                <h2 id="preview-title" className="display h2">Billing is not switched on yet</h2>
                <p>
                  Everything is open while The Button Box is in preview, so there is nothing to pay. When plans start,
                  their prices will be shown on this page.
                </p>
                <div className="row">
                  {signedIn
                    ? <Link className="btn" href="/studio">Open your studio</Link>
                    : <Link className="btn" href="/sign-up">Start free</Link>}
                  {live ? <PortalButton label="Manage billing" className="btn soft" /> : null}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {mode === 'soon' || mode === 'unavailable' ? (
          <section className="price-preview glass panel spot-blu fam-blu rise" aria-labelledby="soon-title">
            <span className="jewel" aria-hidden="true"><svg><use href="#i-spool" /></svg></span>
            <div className="stack">
              <h2 id="soon-title" className="display h2">
                {mode === 'soon' ? 'Billing is not switched on yet' : 'The plans did not load just now'}
              </h2>
              <p>
                {mode === 'soon'
                  ? 'Plans will appear here as soon as payments are set up.'
                  : 'Stripe did not answer in time. Please refresh the page in a minute.'}
                {trialDays > 0 ? ` New studios start with a free trial of ${trialDays} ${trialDays === 1 ? 'day' : 'days'}.` : ''}
              </p>
              {!signedIn ? <div className="row"><Link className="btn" href="/sign-up">Start free</Link></div> : null}
            </div>
          </section>
        ) : null}

        {mode === 'plans' ? (
          <>
            {live ? (
              <section className="price-current glass panel pad-lg fam-pur rise" aria-labelledby="current-title">
                <span className="jewel" aria-hidden="true"><svg><use href="#i-check" /></svg></span>
                <div className="stack" style={{ '--gap': '10px' }}>
                  <p className="kicker">Your plan</p>
                  <h2 id="current-title" className="h3">{planName(subscription.plan)}: {statusWords(subscription.status)}</h2>
                  {renewalWords(subscription) ? <p>{renewalWords(subscription)}</p> : null}
                  <PortalButton label="Manage billing" />
                </div>
              </section>
            ) : null}

            <div className="price-plans">
              {['monthly', 'yearly'].map((key, i) => {
                const p = prices[key]
                if (!p) return null
                const look = PLAN_LOOK[key]
                const current = live && subscription.plan === key
                return (
                  <div key={key} className={`backlit fam-${look.family} rise`} style={{ '--d': `${0.12 + i * 0.1}s` }}>
                    <article className={`price-card glass panel lift sheen${current ? ' is-current' : ''}`} aria-labelledby={`plan-${key}`}>
                      <div className="spread">
                        <span className="jewel" aria-hidden="true"><svg><use href={`#${look.icon}`} /></svg></span>
                        {current ? <span className="tag">Your current plan</span> : null}
                        {!current && key === 'yearly' && yearlySaving >= 1 ? <span className="tag">About {yearlySaving}% less than monthly</span> : null}
                      </div>
                      <h2 id={`plan-${key}`} className="kicker">{look.name}</h2>
                      <p className="price-amount">
                        <span className="num">{money(p.amount, p.currency)}</span>
                        <span className="per">{perInterval(p.interval)}</span>
                      </p>
                      <p className="small price-sub">
                        {key === 'yearly' && p.interval === 'year'
                          ? `Works out at ${money(Math.round(p.amount / 12), p.currency)} a month.`
                          : look.blurb}
                        {' '}Prices in {String(p.currency).toUpperCase()}.
                      </p>
                      <ul className="price-list">
                        {INCLUDED.map((item) => (
                          <li key={item}><svg aria-hidden="true"><use href="#i-check" /></svg>{item}</li>
                        ))}
                      </ul>
                      <div className="price-cta">{actionFor(key)}</div>
                    </article>
                  </div>
                )
              })}
            </div>

            <div className="price-notes rise" style={{ '--d': '.32s' }}>
              {joinFee ? (
                <p className="price-note-line">
                  <svg aria-hidden="true" viewBox="0 0 32 32" style={{ '--btn': '#B5DCC5' }}><use href="#i-button" /></svg>
                  <span>A one-off joining fee of <b>{money(joinFee.amount, joinFee.currency)}</b> is added once, when you first choose a plan.</span>
                </p>
              ) : null}
              {!signedIn && trialDays > 0 ? (
                <p className="price-note-line">
                  <svg aria-hidden="true"><use href="#i-heart" /></svg>
                  <span>Every new studio starts with a free trial of {trialDays} {trialDays === 1 ? 'day' : 'days'}. No card needed.</span>
                </p>
              ) : null}
              {signedIn && !live && trialDaysLeft > 0 ? (
                <p className="price-note-line">
                  <svg aria-hidden="true"><use href="#i-heart" /></svg>
                  <span>
                    Your free trial has {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left.
                    {carriesOver ? ' Choose a plan now and those days carry over: the first payment for your plan waits until your trial ends.' : ''}
                  </span>
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        <Seam />

        <section className="price-faq" aria-labelledby="faq-title">
          <div className="price-faq-head">
            <p className="kicker fam-blu">Good to know</p>
            <h2 id="faq-title" className="display h2">Questions people ask</h2>
          </div>
          <div className="price-faq-list">
            {faqFor({ billingOn, trialDays }).map((item) => (
              <details key={item.q} className="price-q glass">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  )
}
