// Starts connecting Ravelry: the import page posts its form here and the maker is sent on to Ravelry to say yes.
// A random state goes in a short-lived cookie so the callback can tell the answer came from this request.
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'
import { randomToken } from '@/lib/crypto'
import { authUrl, backToImport, callbackUrl, ravelryConfigured, reasonForGuard, stateCookie } from '@/lib/ravelry'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const g = await requireApiMaker({ needAccess: true })
  if (g.error) return backToImport(request, 'error', reasonForGuard(g.error.status))
  if (!sameOrigin(request)) return Response.json({ error: 'Not allowed' }, { status: 403 })
  if (!ravelryConfigured()) return backToImport(request, 'error', 'off')

  const state = randomToken()
  const headers = new Headers({
    Location: authUrl({ state, redirectUri: callbackUrl(request) }),
    'Cache-Control': 'no-store',
  })
  headers.append('Set-Cookie', stateCookie(`${state}.${g.user.id}`))
  return new Response(null, { status: 303, headers })
}
