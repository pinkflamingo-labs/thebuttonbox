// Open the Stripe billing portal: change plan, update the card, see invoices or cancel.
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'
import { getStripe, siteUrl } from '@/lib/billing'

export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Not allowed' }, { status: 403 })
  const g = await requireApiMaker()
  if (g.error) return g.error

  const stripe = getStripe()
  if (!stripe) return Response.json({ error: 'Billing is not switched on yet, so there is nothing to manage.' }, { status: 409 })

  const { data: row } = await g.supabase
    .from('billing_customers').select('stripe_customer_id').eq('user_id', g.user.id).maybeSingle()
  if (!row?.stripe_customer_id) {
    return Response.json({ error: 'There is no billing account yet. Choose a plan on the pricing page first.' }, { status: 404 })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${siteUrl(request)}/account`,
    })
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Billing portal did not open:', err?.message)
    return Response.json({ error: 'The billing page did not open just now. Please try again in a minute.' }, { status: 502 })
  }
}
