// Ravelry: signing in with OAuth 2, reading a maker's notebook and turning it into Button Box rows.
// Server only. Ravelry's answers are read defensively: any field may be missing.
import { ravelryConfigured } from './connectors'
import { siteUrl } from './billing'
import { cleanYarnWeight } from './pattern-reader'
import { round, M_PER_YD } from './format'

export { ravelryConfigured }

export const RAVELRY_AUTH = 'https://www.ravelry.com/oauth2/auth'
export const RAVELRY_TOKEN = 'https://www.ravelry.com/oauth2/token'
export const RAVELRY_API = 'https://api.ravelry.com'
export const STATE_COOKIE = 'bb_ravelry_state'
const COOKIE_PATH = '/api/ravelry'

export class RavelryError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}

// ---------------------------------------------------------------- sign-in
export function callbackUrl(request) {
  return `${siteUrl(request)}/api/ravelry/callback`
}

export function authUrl({ state, redirectUri }) {
  const u = new URL(RAVELRY_AUTH)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', process.env.RAVELRY_CLIENT_ID)
  u.searchParams.set('redirect_uri', redirectUri)
  u.searchParams.set('state', state)
  u.searchParams.set('scope', process.env.RAVELRY_SCOPES || 'offline')
  return u.toString()
}

export function stateCookie(value) {
  return `${STATE_COOKIE}=${value}; Path=${COOKIE_PATH}; Max-Age=600; HttpOnly; Secure; SameSite=Lax`
}

export function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}

// A 303 back to the import page with ?ravelry=connected or ?ravelry=error&reason=...
export function backToImport(request, outcome, reason = '') {
  const u = new URL(`${siteUrl(request)}/studio/import`)
  u.searchParams.set('ravelry', outcome)
  if (reason) u.searchParams.set('reason', reason)
  const headers = new Headers({ Location: u.toString(), 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', clearStateCookie())
  return new Response(null, { status: 303, headers })
}

export function reasonForGuard(status) {
  if (status === 401) return 'signin'
  if (status === 402) return 'access'
  return 'second-step'
}

function basicAuth() {
  return `Basic ${Buffer.from(`${process.env.RAVELRY_CLIENT_ID}:${process.env.RAVELRY_CLIENT_SECRET}`).toString('base64')}`
}

async function tokenRequest(params) {
  let res
  try {
    res = await fetch(RAVELRY_TOKEN, {
      method: 'POST',
      headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(params).toString(),
      cache: 'no-store',
    })
  } catch {
    throw new RavelryError('Ravelry could not be reached. Please try again in a minute.', 502)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.access_token) {
    if (res.status === 400 || res.status === 401) throw new RavelryError('Ravelry did not accept the sign-in. Please connect Ravelry again.', 401)
    if (res.status === 429) throw new RavelryError('Ravelry is busy just now. Please try again in a few minutes.', 429)
    throw new RavelryError('Ravelry did not finish the sign-in. Please try again later.', 502)
  }
  const seconds = Number(data.expires_in) > 0 ? Number(data.expires_in) : 3600
  return {
    access_token: String(data.access_token),
    refresh_token: data.refresh_token ? String(data.refresh_token) : null,
    expires_at: new Date(Date.now() + seconds * 1000).toISOString(),
  }
}

export function exchangeCode(code, redirectUri) {
  return tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
}

export function refreshTokens(refreshToken) {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken })
}

// ---------------------------------------------------------------- reading
function messageFor(status) {
  if (status === 401) return 'Ravelry asked for a fresh sign-in. Please connect Ravelry again.'
  if (status === 403) return 'Ravelry did not share that part of your notebook.'
  if (status === 404) return 'Ravelry could not find that part of your notebook.'
  if (status === 429) return 'Ravelry is busy just now. Please try again in a few minutes.'
  if (status >= 500) return 'Ravelry is not answering at the moment. Please try again later.'
  return 'Ravelry did not answer as expected. Please try again later.'
}

export async function ravelryGet(path, token) {
  let res
  try {
    res = await fetch(`${RAVELRY_API}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
  } catch {
    throw new RavelryError('Ravelry could not be reached. Please try again in a minute.', 502)
  }
  if (!res.ok) throw new RavelryError(messageFor(res.status), res.status)
  try {
    return await res.json()
  } catch {
    throw new RavelryError('Ravelry sent back something that could not be read. Please try again later.', 502)
  }
}

export async function currentUser(token) {
  const data = await ravelryGet('/current_user.json', token)
  const username = data?.user?.username
  if (!username) throw new RavelryError('Ravelry did not say which account this is. Please try connecting again.', 502)
  return { username: String(username), id: data?.user?.id ?? null }
}

async function readPages(path, field, token, extra = {}, maxPages = 5, pageSize = 50) {
  const all = []
  for (let page = 1; page <= maxPages; page++) {
    const q = new URLSearchParams({ ...extra, page: String(page), page_size: String(pageSize) })
    const data = await ravelryGet(`${path}?${q}`, token)
    const list = Array.isArray(data?.[field]) ? data[field] : []
    all.push(...list)
    const pg = data?.paginator
    const last = Number(pg?.page_count ?? pg?.last_page ?? 0)
    if (!list.length || !pg || !last || page >= last) break
  }
  return all
}

const PARTS = {
  library: ['library', 'your library'],
  favourites: ['favourites', 'your favourites'],
  queue: ['queue', 'your queue'],
  projects: ['projects', 'your projects'],
  stash: ['stash', 'your stash'],
}

// Up to five pages of each list. A 401 stops everything (sign in again); other problems skip that list.
export async function readNotebook(username, token) {
  const u = encodeURIComponent(username)
  const lists = {
    library: [`/people/${u}/library/search.json`, 'volumes', {}],
    favourites: [`/people/${u}/favorites/list.json`, 'favorites', { types: 'pattern' }],
    queue: [`/people/${u}/queue/list.json`, 'queued_projects', {}],
    projects: [`/projects/${u}/list.json`, 'projects', {}],
    stash: [`/people/${u}/stash/list.json`, 'stash', {}],
  }
  const out = { problems: [] }
  await Promise.all(Object.entries(lists).map(async ([key, [path, field, extra]]) => {
    try {
      out[key] = await readPages(path, field, token, extra)
    } catch (err) {
      if (err?.status === 401) throw err
      out[key] = []
      out.problems.push(`Ravelry did not share ${PARTS[key][1]}, so it was skipped. ${err?.status === 429 ? 'Ravelry was busy; try again later.' : ''}`.trim())
    }
  }))
  return out
}

// ---------------------------------------------------------------- turning Ravelry into Button Box rows
function text(value, max = 200) {
  if (value === null || value === undefined) return null
  const s = String(value).replace(/[\u2013\u2014]/g, ', ').replace(/\s+/g, ' ').trim()
  return s ? s.slice(0, max) : null
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function day(value) {
  const m = String(value || '').match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null
}

function https(url) {
  const s = typeof url === 'string' ? url.trim() : ''
  return /^https:\/\//i.test(s) ? s.slice(0, 1000) : null
}

function photoOf(...candidates) {
  for (const c of candidates) {
    const url = https(c?.medium2_url) || https(c?.medium_url) || https(c?.small2_url) || https(c?.small_url) || https(c?.square_url) || https(c)
    if (url) return url
  }
  return null
}

// Knitting, crochet and weaving have their own rooms; anything else Ravelry tracks (spinning, dyeing) is general
export function ravelryCraft(name) {
  const n = String(name || '').toLowerCase()
  if (!n) return null
  if (n.includes('crochet')) return 'crochet'
  if (n.includes('knit')) return 'knitting'
  if (n.includes('weav')) return 'weaving'
  return 'general'
}

function patternLink(permalink) {
  return permalink ? `https://www.ravelry.com/patterns/library/${encodeURIComponent(String(permalink))}` : null
}

function patternRow({ name, designer, craft, status, cover, ref }) {
  return { name, designer, craft, status, cover_url: cover, source: 'ravelry', source_ref: ref }
}

// Library volumes are patterns the maker owns
export function mapLibrary(volumes, username) {
  const libraryUrl = `https://www.ravelry.com/people/${encodeURIComponent(username)}/library`
  return (volumes || []).map((v) => {
    const pid = v?.pattern_id ?? v?.pattern?.id ?? null
    const ref = pid ? `ravelry:pattern:${pid}` : v?.id ? `ravelry:volume:${v.id}` : null
    const name = text(v?.title ?? v?.name ?? v?.pattern?.name, 200)
    if (!ref || !name) return null
    return {
      row: patternRow({
        name,
        designer: text(v?.author_name ?? v?.pattern?.designer?.name ?? v?.pattern?.pattern_author?.name, 120),
        craft: ravelryCraft(v?.craft?.name ?? v?.pattern?.craft?.name ?? v?.craft_name),
        status: 'owned',
        cover: photoOf(v?.cover_image_url, v?.small_image_url, v?.square_image_url, v?.first_photo, v?.pattern?.first_photo),
        ref,
      }),
      link: {
        name: 'In your Ravelry library',
        url: patternLink(v?.pattern?.permalink ?? v?.permalink) || libraryUrl,
        provider_id: v?.id ? `volume:${v.id}` : `pattern:${pid}`,
      },
    }
  }).filter(Boolean)
}

// Favourited patterns go on the wishlist
export function mapFavourites(favourites) {
  return (favourites || []).map((f) => {
    if (f?.type && f.type !== 'pattern') return null
    const p = f?.favorited ?? f?.pattern ?? null
    const pid = p?.id ?? f?.favorited_id ?? null
    const name = text(p?.name ?? f?.name, 200)
    if (!pid || !name) return null
    return {
      row: patternRow({
        name,
        designer: text(p?.designer?.name ?? p?.pattern_author?.name ?? p?.designer_name, 120),
        craft: ravelryCraft(p?.craft?.name ?? p?.craft_name),
        status: 'wishlist',
        cover: photoOf(p?.first_photo, p?.photos?.[0]),
        ref: `ravelry:pattern:${pid}`,
      }),
      link: patternLink(p?.permalink) ? { name: 'On Ravelry', url: patternLink(p.permalink), provider_id: `pattern:${pid}` } : null,
    }
  }).filter(Boolean)
}

// Queued patterns also go on the wishlist
export function mapQueue(queue) {
  return (queue || []).map((q) => {
    const pid = q?.pattern_id ?? q?.pattern?.id ?? null
    const name = text(q?.pattern_name ?? q?.short_pattern_name ?? q?.pattern?.name ?? q?.name, 200)
    if (!pid || !name) return null
    return {
      row: patternRow({
        name,
        designer: text(q?.pattern_author_name ?? q?.pattern?.designer?.name ?? q?.pattern?.pattern_author?.name, 120),
        craft: ravelryCraft(q?.craft_name ?? q?.pattern?.craft?.name),
        status: 'wishlist',
        cover: photoOf(q?.best_photo, q?.photo, q?.pattern?.first_photo),
        ref: `ravelry:pattern:${pid}`,
      }),
      link: patternLink(q?.pattern?.permalink) ? { name: 'On Ravelry', url: patternLink(q.pattern.permalink), provider_id: `pattern:${pid}` } : null,
    }
  }).filter(Boolean)
}

// Finished projects become makes; in progress or hibernating projects go in the planner at "making"
export function mapProjects(projects) {
  const makes = []
  const planned = []
  for (const p of projects || []) {
    if (!p?.id) continue
    const status = String(p?.status_name ?? p?.project_status?.name ?? '').toLowerCase()
    const title = text(p?.name || p?.pattern_name || 'Ravelry project', 200)
    const craft = ravelryCraft(p?.craft_name ?? p?.craft?.name)
    const patternRef = p?.pattern_id ? `ravelry:pattern:${p.pattern_id}` : null
    const ref = `ravelry:project:${p.id}`
    if (status.includes('finish')) {
      makes.push({ patternRef, row: { title, craft, finished_on: day(p?.completed), size_made: text(p?.size, 80), source_ref: ref } })
    } else if (status.includes('progress') || status.includes('hibernat')) {
      const progress = num(p?.progress)
      const note = status.includes('hibernat')
        ? 'Hibernating on Ravelry when it was brought across.'
        : progress ? `${Math.round(progress)}% done on Ravelry when it was brought across.` : null
      planned.push({
        patternRef,
        row: { title, craft, stage: 'making', for_whom: text(p?.made_for, 80), size_plan: text(p?.size, 80), notes: note, source_ref: ref },
      })
    }
  }
  return { makes, planned }
}

// Yarn in the stash: metres from yards when Ravelry gives them, counted in skeins
export function mapStash(stash) {
  return (stash || []).map((s) => {
    if (!s?.id) return null
    const yarn = s?.yarn ?? null
    const brand = yarn?.yarn_company_name ?? yarn?.yarn_company?.name ?? s?.yarn_company_name ?? null
    const yarnName = yarn?.name ?? s?.yarn_name ?? null
    const name = text([brand, yarnName].filter(Boolean).join(' ') || s?.name || 'Yarn from Ravelry', 200)
    const pack = Array.isArray(s?.packs) ? s.packs[0] : null
    const skeins = num(pack?.skeins ?? s?.skeins)
    const yardsEach = num(pack?.yards_per_skein ?? yarn?.yardage)
    const metresEach = num(pack?.meters_per_skein) ?? (yardsEach ? round(yardsEach * M_PER_YD, 1) : null)
    const totalYards = num(pack?.total_yards ?? s?.total_yards)
    const totalMetres = num(pack?.total_meters) ?? (totalYards ? round(totalYards * M_PER_YD, 1) : null)
    let quantity = null
    let unit = 'skeins'
    let perUnit = metresEach
    if (skeins) quantity = round(skeins, 2)
    else if (totalMetres) { quantity = totalMetres; unit = 'm'; perUnit = null }
    const weightName = yarn?.yarn_weight?.name ?? s?.yarn_weight?.name ?? pack?.yarn_weight?.name ?? null
    const fibres = Array.isArray(yarn?.yarn_fibers)
      ? yarn.yarn_fibers.map((f) => [f?.percentage ? `${f.percentage}%` : null, f?.fiber_type?.name ?? f?.name].filter(Boolean).join(' ')).filter(Boolean).join(', ')
      : null
    return {
      room: 'yarn',
      kind: 'yarn',
      name,
      colour: text(s?.colorway_name ?? s?.colorway ?? pack?.colorway, 80),
      fibre: text(fibres, 200),
      yarn_weight: cleanYarnWeight(weightName) || text(weightName, 40),
      quantity,
      unit,
      metres_per_unit: perUnit,
      dye_lot: text(s?.dye_lot ?? pack?.dye_lot, 60),
      location: text(s?.location, 120),
      notes: text(s?.notes, 1000),
      source_ref: `ravelry:stash:${s.id}`,
    }
  }).filter(Boolean)
}
