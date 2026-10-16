// Subscriptions with Stripe: plans, prices for display, checkout, the customer portal and syncing from webhooks.
import Stripe from 'stripe'

let stripeClient = null

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_YEARLY))
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)
  return stripeClient
}

export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || null,
  yearly: process.env.STRIPE_PRICE_YEARLY || null,
  joining: process.env.STRIPE_PRICE_JOINING || null,
}

export function planForPrice(priceId) {
  if (!priceId) return null
  if (priceId === PRICE_IDS.monthly) return 'monthly'
  if (priceId === PRICE_IDS.yearly) return 'yearly'
  return 'other'
}

// { monthly: { amount, currency, interval }, yearly: {...}, joining: {...} } from Stripe, for the pricing page
export async function getPrices() {
  const stripe = getStripe()
  if (!stripe) return null
  const out = {}
  for (const [key, id] of Object.entries(PRICE_IDS)) {
    if (!id) continue
    try {
      const p = await stripe.prices.retrieve(id)
      out[key] = { id, amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval || null, active: p.active }
    } catch {
      out[key] = null
    }
  }
  return out
}

export async function getOrCreateCustomer({ admin, user }) {
  const stripe = getStripe()
  const { data: existing } = await admin.from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
  if (existing?.stripe_customer_id) return existing.stripe_customer_id
  const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })
  await admin.from('billing_customers').upsert({ user_id: user.id, stripe_customer_id: customer.id })
  return customer.id
}

function toIso(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : null
}

// Saves a Stripe subscription. Newer Stripe API versions keep the period end on the subscription item.
export async function saveSubscription(admin, sub, userIdHint = null) {
  let userId = sub.metadata?.user_id || userIdHint
  if (!userId && sub.customer) {
    const { data } = await admin.from('billing_customers').select('user_id').eq('stripe_customer_id', sub.customer).maybeSingle()
    userId = data?.user_id
  }
  if (!userId) return { ok: false, reason: 'no user for subscription' }
  const item = sub.items?.data?.[0]
  const priceId = item?.price?.id || null
  const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null
  const { error } = await admin.from('subscriptions').upsert({
    id: sub.id,
    user_id: userId,
    status: sub.status,
    price_id: priceId,
    plan: planForPrice(priceId),
    current_period_end: toIso(periodEnd),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    trial_end: toIso(sub.trial_end),
    updated_at: new Date().toISOString(),
  })
  return { ok: !error, error }
}

export function siteUrl(request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, '')
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}
