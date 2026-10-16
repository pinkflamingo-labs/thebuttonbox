// "Delete my account": cancel any plan in Stripe, remove the maker's photos, note it in the audit log, then delete
// the sign-in (every table that belongs to the maker is removed with it) and sign out. Nothing is deleted
// unless the plan could be cancelled first, so no one keeps paying for a studio that is gone.
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'
import { getStripe } from '@/lib/billing'
import { supabaseAdmin } from '@/lib/supabase/admin'

const BUCKET = 'maker-photos'
const ENDED = ['canceled', 'incomplete_expired']

async function listAll(bucket, prefix) {
  const items = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefix, { limit: 1000, offset })
    if (error) throw error
    items.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return items
}

// Every file under "<user id>/": patterns, makes, stash, snaps and any other folder found
async function collectFiles(bucket, prefix, depth = 0, out = []) {
  for (const item of await listAll(bucket, prefix)) {
    const path = `${prefix}/${item.name}`
    if (item.id === null || item.id === undefined) {
      if (depth < 6) await collectFiles(bucket, path, depth + 1, out)
    } else {
      out.push(path)
    }
  }
  return out
}

async function cancelPlans(admin, userId) {
  const { data: row } = await admin.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle()
  if (!row?.stripe_customer_id) return 0
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe is not set up')
  let cancelled = 0
  for await (const sub of stripe.subscriptions.list({ customer: row.stripe_customer_id, status: 'all', limit: 100 })) {
    if (!ENDED.includes(sub.status)) {
      await stripe.subscriptions.cancel(sub.id)
      cancelled += 1
    }
  }
  return cancelled
}

export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Not allowed' }, { status: 403 })
  const g = await requireApiMaker()
  if (g.error) return g.error
  const { user, supabase } = g

  const body = await request.json().catch(() => ({}))
  if (body?.confirm !== 'DELETE') {
    return Response.json({ error: 'Type DELETE in capital letters to confirm.' }, { status: 400 })
  }

  let admin
  try {
    admin = supabaseAdmin()
  } catch {
    return Response.json({ error: 'Deleting accounts is not set up on this site yet, so nothing was deleted. Please contact the site owner.' }, { status: 503 })
  }

  let cancelled = 0
  try {
    cancelled = await cancelPlans(admin, user.id)
  } catch (err) {
    console.error('Account delete: plan not cancelled:', err?.message)
    return Response.json({ error: 'Your plan could not be cancelled with Stripe just now, so nothing was deleted. Please try again in a minute.' }, { status: 502 })
  }

  let removed = 0
  try {
    const bucket = admin.storage.from(BUCKET)
    const files = await collectFiles(bucket, user.id)
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await bucket.remove(files.slice(i, i + 100))
      if (error) throw error
    }
    removed = files.length
  } catch (err) {
    console.error('Account delete: photos not removed:', err?.message)
    return Response.json({ error: 'Your photos could not be removed just now, so your account was not deleted. Please try again in a minute.' }, { status: 502 })
  }

  await admin.from('audit_log').insert({
    user_id: user.id,
    action: 'account_deleted',
    detail: { photos_removed: removed, plans_cancelled: cancelled },
  })

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('Account delete: user not deleted:', deleteError.message)
    return Response.json({ error: 'Your account could not be deleted just now. Any plan has been cancelled and your photos removed. Please try again in a minute.' }, { status: 500 })
  }

  try {
    await supabase.auth.signOut()
  } catch {
    // The sign-in no longer exists, so there is nothing left to sign out of.
  }
  return Response.json({ ok: true })
}
