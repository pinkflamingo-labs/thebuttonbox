// Stripe tells us about payments and plan changes here. Checked by its signature (no sign-in), saved with the
// secret key, and answered quickly. The proxy skips this address on purpose.
import { getStripe, saveSubscription } from '@/lib/billing'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const CHECKOUT_DONE = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])
const SUBSCRIPTION_CHANGED = new Set(['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'])

// A plan for a maker who has since deleted their account has nowhere to go: skip it rather than retry forever.
function check(saved) {
  if (saved.ok) return
  if (!saved.error) return
  if (saved.error.code === '23503') return
  throw saved.error
}

export async function POST(request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return Response.json({ error: 'Billing is not set up' }, { status: 503 })

  const body = await request.text()
  let event
  try {
    event = stripe.webhooks.constructEvent(body, request.headers.get('stripe-signature') || '', secret)
  } catch {
    return Response.json({ error: 'Bad signature' }, { status: 400 })
  }

  try {
    if (CHECKOUT_DONE.has(event.type)) {
      const session = event.data.object
      if (session.mode === 'subscription' && session.subscription) {
        const admin = supabaseAdmin()
        const userId = session.metadata?.user_id || session.client_reference_id || null
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        const sub = await stripe.subscriptions.retrieve(subId)
        check(await saveSubscription(admin, sub, userId))
        const paid = ['paid', 'no_payment_required'].includes(session.payment_status)
        if (session.metadata?.join_fee === 'yes' && userId && paid) {
          const { error } = await admin.from('profiles')
            .update({ join_fee_paid_at: new Date().toISOString() })
            .eq('id', userId).is('join_fee_paid_at', null)
          if (error) throw error
        }
      }
    } else if (SUBSCRIPTION_CHANGED.has(event.type)) {
      check(await saveSubscription(supabaseAdmin(), event.data.object))
    }
  } catch (err) {
    console.error('Stripe event not saved:', event.type, err?.message)
    return Response.json({ error: 'Not saved yet; Stripe will send it again.' }, { status: 500 })
  }

  return Response.json({ received: true })
}
