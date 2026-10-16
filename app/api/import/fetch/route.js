// Reads a PDF the maker chose in Dropbox so their own browser can take its text and cover picture.
// Only https Dropbox links are followed, every redirect is checked, nothing is kept, and files over 60 MB
// are refused. The bytes stream straight back to the maker.
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_BYTES = 60 * 1024 * 1024
const START_HOSTS = new Set(['www.dropbox.com', 'dl.dropboxusercontent.com'])

// Dropbox hands downloads to per-file hosts such as uc123.dl.dropboxusercontent.com
function allowedHost(host) {
  return START_HOSTS.has(host) || host.endsWith('.dl.dropboxusercontent.com')
}

function reply(status, error) {
  return Response.json({ error }, { status })
}

function join(a, b) {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

function looksLikePdf(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024))
  return head.includes('%PDF-')
}

export async function POST(request) {
  const g = await requireApiMaker({ needAccess: true })
  if (g.error) return g.error
  if (!sameOrigin(request)) return reply(403, 'Not allowed')

  let body
  try {
    body = await request.json()
  } catch {
    return reply(400, 'That request could not be read. Please try again.')
  }
  let url
  try {
    url = new URL(String(body?.url || ''))
  } catch {
    return reply(400, 'That is not a Dropbox link.')
  }
  if (url.protocol !== 'https:' || !START_HOSTS.has(url.hostname) || url.username || url.password) {
    return reply(400, 'Only Dropbox links can be read here.')
  }
  if (url.hostname === 'www.dropbox.com') {
    url.searchParams.delete('raw')
    url.searchParams.set('dl', '1')
  }

  let res = null
  try {
    for (let hop = 0; hop < 8; hop++) {
      res = await fetch(url, { redirect: 'manual', headers: { Accept: 'application/pdf, */*' }, cache: 'no-store' })
      if (res.status < 300 || res.status >= 400) break
      const location = res.headers.get('location')
      await res.body?.cancel().catch(() => {})
      if (!location) return reply(502, 'Dropbox did not say where the file is. Please try again later.')
      const next = new URL(location, url)
      if (next.protocol !== 'https:' || !allowedHost(next.hostname) || next.username || next.password) {
        return reply(400, 'That Dropbox link pointed somewhere other than Dropbox, so it was not followed.')
      }
      url = next
      res = null
    }
  } catch {
    return reply(502, 'Dropbox could not be reached. Please try again in a minute.')
  }
  if (!res) return reply(502, 'Dropbox kept sending the file somewhere else. Please try again later.')
  if (!res.ok) {
    await res.body?.cancel().catch(() => {})
    if (res.status === 404 || res.status === 410) return reply(404, 'That Dropbox file is no longer shared or has moved.')
    if (res.status === 429) return reply(429, 'Dropbox is busy just now. Please try again in a few minutes.')
    return reply(502, 'Dropbox did not send the file. Please try again later.')
  }
  const length = Number(res.headers.get('content-length') || 0)
  if (length > MAX_BYTES) {
    await res.body?.cancel().catch(() => {})
    return reply(413, 'That file is over 60 MB, so it was not opened.')
  }
  if (!res.body) return reply(502, 'Dropbox sent an empty file.')

  // Check the start really is a PDF, then pass the rest through with a running size check
  const reader = res.body.getReader()
  let first = new Uint8Array(0)
  try {
    while (first.length < 1024) {
      const { done, value } = await reader.read()
      if (done) break
      first = join(first, value)
    }
  } catch {
    return reply(502, 'The file stopped part way through. Please try again.')
  }
  if (!looksLikePdf(first)) {
    reader.cancel().catch(() => {})
    return reply(415, 'That Dropbox file is not a PDF.')
  }
  let seen = first.length
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(first)
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) { controller.close(); return }
        seen += value.byteLength
        if (seen > MAX_BYTES) {
          controller.error(new Error('That file is over 60 MB.'))
          reader.cancel().catch(() => {})
          return
        }
        controller.enqueue(value)
      } catch (err) {
        controller.error(err)
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
