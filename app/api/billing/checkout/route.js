// Start a Stripe Checkout for the monthly or yearly plan, with the one-off joining fee the first time.
// A maker part-way through a free trial keeps the days they have left.
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'
import { PRICE_IDS, getOrCreateCustomer, getStripe, siteUrl } from '@/lib/billing'
import { supabaseAdmin } from '@/lib/supabase/admin'

const LIVE = ['active', 'trialing', 'past_due']
const TWO_DAYS_MS = 48 * 3600 * 1000

export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Not allowed' }, { status: 403 })
  const g = await requireApiMaker()
  if (g.error) return g.error
  const { user, profile, settings, subscription } = g

  const body = await request.json().catch(() => ({}))
  const plan = body?.plan
  if (plan !== 'monthly' && plan !== 'yearly') {
    return Response.json({ error: 'Choose the monthly or the yearly plan.' }, { status: 400 })
  }

  const stripe = getStripe()
  const priceId = PRICE_IDS[plan]
  if (!stripe || !priceId || settings?.billing_enabled !== true) {
    return Response.json({ error: 'Billing is not switched on yet, so there is nothing to pay. Everything is open while The Button Box is in preview.' }, { status: 409 })
  }
  if (subscription && LIVE.includes(subscription.status)) {
    return Response.json({ error: 'You already have a plan. Use Manage billing on your account page to change it.' }, { status: 409 })
  }

  let admin
  try {
    admin = supabaseAdmin()
  } catch {
    return Response.json({ error: 'Payments are not fully set up on this site yet. Please try again later.' }, { status: 503 })
  }

  try {
    const customer = await getOrCreateCustomer({ admin, user })
    const chargeJoiningFee = Boolean(PRICE_IDS.joining && !profile?.join_fee_paid_at)
    const lineItems = [{ price: priceId, quantity: 1 }]
    if (chargeJoiningFee) lineItems.push({ price: PRICE_IDS.joining, quantity: 1 })

    const metadata = { user_id: user.id, plan }
    if (chargeJoiningFee) metadata.join_fee = 'yes'
    const subscriptionData = { metadata: { ...metadata } }
    const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0
    if (trialEnds - Date.now() > TWO_DAYS_MS) subscriptionData.trial_end = Math.floor(trialEnds / 1000)

    const base = siteUrl(request)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: lineItems,
      metadata,
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
      success_url: `${base}/account?billing=success`,
      cancel_url: `${base}/pricing?billing=cancelled`,
    })
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Checkout did not start:', err?.message)
    return Response.json({ error: 'Stripe did not open checkout just now. Please try again in a minute.' }, { status: 502 })
  }
}
