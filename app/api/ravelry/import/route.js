// Brings a maker's Ravelry notebook into the studio: library volumes as patterns they own, favourites and queue
// on the wishlist, finished projects as makes, works in progress in the planner and yarn in the stash.
// Rows are written with the maker's own sign-in so row-level security applies; only the saved tokens and the
// last-import time use the server key. Anything brought across before (same source_ref) is skipped.
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allowUse } from '@/lib/usage'
import { decrypt, encrypt } from '@/lib/crypto'
import { friendlyError, isReadOnlyError, READ_ONLY_MESSAGE } from '@/lib/errors'
import {
  RavelryError, currentUser, mapFavourites, mapLibrary, mapProjects, mapQueue, mapStash, ravelryConfigured,
  readNotebook, refreshTokens,
} from '@/lib/ravelry'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CHUNK = 100

async function existingRefs(supabase, table, refs) {
  const found = new Map()
  const unique = [...new Set(refs.filter(Boolean))]
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data, error } = await supabase.from(table).select('id, source_ref').in('source_ref', unique.slice(i, i + CHUNK))
    if (error) throw error
    for (const r of data || []) found.set(r.source_ref, r.id)
  }
  return found
}

// Inserts in batches; when a batch fails, row by row so one odd row does not stop the rest
async function insertRows(supabase, table, rows, select = 'id, source_ref') {
  const saved = []
  let failed = 0
  let duplicates = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { data, error } = await supabase.from(table).insert(chunk, { defaultToNull: false }).select(select)
    if (!error) {
      saved.push(...(data || []))
      continue
    }
    if (isReadOnlyError(error)) throw error
    for (const row of chunk) {
      const { data: one, error: oneError } = await supabase.from(table).insert(row).select(select).single()
      if (!oneError) { saved.push(one); continue }
      if (isReadOnlyError(oneError)) throw oneError
      if (oneError.code === '23505') duplicates++
      else failed++
    }
  }
  return { saved, failed, duplicates }
}

function reply(status, error, extra = {}) {
  return Response.json({ error, ...extra }, { status })
}

export async function POST(request) {
  const g = await requireApiMaker({ needAccess: true })
  if (g.error) return g.error
  if (!sameOrigin(request)) return Response.json({ error: 'Not allowed' }, { status: 403 })
  if (!ravelryConfigured()) return reply(503, 'Ravelry is not connected on this site yet.')

  const admin = supabaseAdmin()
  const { data: conn, error: connError } = await admin.from('connections')
    .select('id, account_name, token_enc, refresh_enc, expires_at')
    .eq('user_id', g.user.id).eq('provider', 'ravelry').maybeSingle()
  if (connError) return reply(500, 'Your Ravelry connection could not be read just now. Please try again.')
  if (!conn) return reply(404, 'Ravelry is not connected yet. Choose Connect Ravelry first.', { reconnect: true })

  const use = await allowUse(g.supabase, 'ravelry')
  if (!use.ok) return reply(429, use.message)

  let token
  let refresh
  try {
    token = decrypt(conn.token_enc)
    refresh = decrypt(conn.refresh_enc)
  } catch {
    return reply(409, 'Your saved Ravelry sign-in could not be read. Please disconnect Ravelry and connect it again.', { reconnect: true })
  }

  async function renew() {
    if (!refresh) throw new RavelryError('Your Ravelry sign-in has run out. Please disconnect Ravelry and connect it again.', 401)
    const fresh = await refreshTokens(refresh)
    token = fresh.access_token
    refresh = fresh.refresh_token || refresh
    await admin.from('connections')
      .update({ token_enc: encrypt(token), refresh_enc: encrypt(refresh), expires_at: fresh.expires_at })
      .eq('id', conn.id)
  }

  let username = conn.account_name
  let notebook
  try {
    const expires = conn.expires_at ? new Date(conn.expires_at).getTime() : 0
    if (!token || (expires && expires < Date.now() + 60000)) await renew()
    if (!username) username = (await currentUser(token)).username
    try {
      notebook = await readNotebook(username, token)
    } catch (err) {
      if (err?.status !== 401) throw err
      await renew()
      notebook = await readNotebook(username, token)
    }
  } catch (err) {
    if (err instanceof RavelryError && err.status === 401) {
      return reply(409, 'Ravelry asked for a fresh sign-in. Please disconnect Ravelry and connect it again.', { reconnect: true })
    }
    if (err instanceof RavelryError) return reply(err.status === 429 ? 429 : 502, err.message)
    return reply(502, 'Ravelry did not answer as expected. Please try again later.')
  }

  // One row per Ravelry pattern: the library (owned) wins over favourites and the queue (wishlist)
  const patterns = new Map()
  for (const p of [...mapLibrary(notebook.library, username), ...mapFavourites(notebook.favourites), ...mapQueue(notebook.queue)]) {
    if (!patterns.has(p.row.source_ref)) patterns.set(p.row.source_ref, p)
  }
  const { makes, planned } = mapProjects(notebook.projects)
  const stash = mapStash(notebook.stash)
  const counts = { owned: 0, wishlist: 0, makes: 0, projects: 0, stash: 0, skipped: 0, failed: 0 }

  try {
    const linked = [...makes, ...planned].map((x) => x.patternRef)
    const havePatterns = await existingRefs(g.supabase, 'patterns', [...patterns.keys(), ...linked])
    const newPatterns = [...patterns.values()].filter((p) => !havePatterns.has(p.row.source_ref))
    counts.skipped += patterns.size - newPatterns.length
    const savedPatterns = await insertRows(g.supabase, 'patterns', newPatterns.map((p) => p.row))
    counts.failed += savedPatterns.failed
    counts.skipped += savedPatterns.duplicates
    const patternIds = new Map(havePatterns)
    const links = []
    for (const r of savedPatterns.saved) {
      patternIds.set(r.source_ref, r.id)
      const p = patterns.get(r.source_ref)
      if (p?.row.status === 'owned') counts.owned++
      else counts.wishlist++
      if (p?.link?.url) links.push({ pattern_id: r.id, name: p.link.name, kind: 'other', provider: 'ravelry', url: p.link.url, provider_id: p.link.provider_id })
    }
    if (links.length) await insertRows(g.supabase, 'pattern_files', links, 'id')

    const haveMakes = await existingRefs(g.supabase, 'makes', makes.map((m) => m.row.source_ref))
    const newMakes = makes.filter((m) => !haveMakes.has(m.row.source_ref))
    counts.skipped += makes.length - newMakes.length
    const savedMakes = await insertRows(g.supabase, 'makes', newMakes.map((m) => ({ ...m.row, pattern_id: patternIds.get(m.patternRef) || null })))
    counts.makes = savedMakes.saved.length
    counts.failed += savedMakes.failed
    counts.skipped += savedMakes.duplicates

    const haveProjects = await existingRefs(g.supabase, 'projects', planned.map((p) => p.row.source_ref))
    const newProjects = planned.filter((p) => !haveProjects.has(p.row.source_ref))
    counts.skipped += planned.length - newProjects.length
    const savedProjects = await insertRows(g.supabase, 'projects', newProjects.map((p) => ({ ...p.row, pattern_id: patternIds.get(p.patternRef) || null })))
    counts.projects = savedProjects.saved.length
    counts.failed += savedProjects.failed
    counts.skipped += savedProjects.duplicates

    const haveStash = await existingRefs(g.supabase, 'stash_items', stash.map((s) => s.source_ref))
    const newStash = stash.filter((s) => !haveStash.has(s.source_ref))
    counts.skipped += stash.length - newStash.length
    const savedStash = await insertRows(g.supabase, 'stash_items', newStash)
    counts.stash = savedStash.saved.length
    counts.failed += savedStash.failed
    counts.skipped += savedStash.duplicates
  } catch (err) {
    if (isReadOnlyError(err)) return reply(402, READ_ONLY_MESSAGE)
    return reply(500, friendlyError(err, 'Some of your Ravelry notebook did not save. Please try again; anything already brought across will be skipped.'), { counts })
  }

  await admin.from('connections').update({ last_import_at: new Date().toISOString(), account_name: username }).eq('id', conn.id)
  return Response.json({ ok: true, account: username, counts, notes: notebook.problems || [] })
}
