// Ravelry sends the maker back here after they say yes (or no). The code is swapped for tokens, which are
// locked with lib/crypto.js before they are saved, and the maker goes back to the import page.
import { cookies } from 'next/headers'
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { encrypt, safeEqual } from '@/lib/crypto'
import {
  STATE_COOKIE, backToImport, callbackUrl, currentUser, exchangeCode, ravelryConfigured, reasonForGuard,
} from '@/lib/ravelry'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const g = await requireApiMaker({ needAccess: true })
  if (g.error) return backToImport(request, 'error', reasonForGuard(g.error.status))
  if (!sameOrigin(request)) return backToImport(request, 'error', 'state')
  if (!ravelryConfigured()) return backToImport(request, 'error', 'off')

  const url = new URL(request.url)
  if (url.searchParams.get('error')) return backToImport(request, 'error', 'denied')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const jar = await cookies()
  const [expected, userId] = String(jar.get(STATE_COOKIE)?.value || '').split('.')
  if (!code || !state || !expected || userId !== g.user.id || !safeEqual(state, expected)) {
    return backToImport(request, 'error', 'state')
  }

  try {
    const tokens = await exchangeCode(code, callbackUrl(request))
    const who = await currentUser(tokens.access_token)
    const { error } = await supabaseAdmin().from('connections').upsert({
      user_id: g.user.id,
      provider: 'ravelry',
      account_name: who.username.slice(0, 120),
      token_enc: encrypt(tokens.access_token),
      refresh_enc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      expires_at: tokens.expires_at,
    }, { onConflict: 'user_id,provider' })
    if (error) return backToImport(request, 'error', 'save')
    return backToImport(request, 'connected')
  } catch {
    return backToImport(request, 'error', 'token')
  }
}
