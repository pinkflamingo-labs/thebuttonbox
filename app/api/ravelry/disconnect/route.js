// Forgets the maker's Ravelry connection (the saved tokens). Things already brought across stay in the studio.
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const g = await requireApiMaker()
  if (g.error) return g.error
  if (!sameOrigin(request)) return Response.json({ error: 'Not allowed' }, { status: 403 })

  const { error } = await supabaseAdmin().from('connections').delete().eq('user_id', g.user.id).eq('provider', 'ravelry')
  if (error) return Response.json({ error: 'Ravelry could not be disconnected just now. Please try again.' }, { status: 500 })
  return Response.json({ ok: true })
}
