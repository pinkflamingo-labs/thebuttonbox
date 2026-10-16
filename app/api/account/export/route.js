// "Download everything": every row the maker has added, as one JSON file to keep, plus links to their photos.
import { requireApiMaker } from '@/lib/api-guard'

const TABLES = [
  'patterns', 'pattern_files', 'requirements', 'projects', 'shopping_items', 'stash_items',
  'makes', 'measurement_profiles', 'measurements', 'subscriptions',
]
const PAGE = 1000
const LINK_SECONDS = 7 * 24 * 3600

async function readAll(supabase, table) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

async function photoLinks(supabase, paths) {
  const unique = [...new Set(paths.filter((p) => typeof p === 'string' && p))]
  const out = []
  for (let i = 0; i < unique.length; i += 100) {
    const { data } = await supabase.storage.from('maker-photos').createSignedUrls(unique.slice(i, i + 100), LINK_SECONDS)
    for (const d of data || []) if (d.signedUrl) out.push({ path: d.path, link: d.signedUrl })
  }
  return out
}

export async function GET() {
  const g = await requireApiMaker()
  if (g.error) return g.error
  const { supabase, user } = g

  try {
    const [{ data: profile, error: profileError }, { data: connections }, ...lists] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.rpc('my_connections'),
      ...TABLES.map((t) => readAll(supabase, t)),
    ])
    if (profileError) throw profileError
    const tables = Object.fromEntries(TABLES.map((t, i) => [t, lists[i]]))
    const photos = await photoLinks(supabase, [
      ...tables.patterns.map((r) => r.cover_path),
      ...tables.makes.map((r) => r.photo_path),
      ...tables.stash_items.map((r) => r.photo_path),
    ])
    const now = new Date()
    const payload = {
      about: 'Everything in your Button Box studio. Pattern files were never copied here, so only their links are listed. Photo links work for 7 days from the export.',
      exported_at: now.toISOString(),
      account: { email: user.email, created_at: user.created_at },
      profile: profile || null,
      ...tables,
      connections: connections || [],
      photos,
    }
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="button-box-export-${now.toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Export failed:', err?.message)
    return Response.json({ error: 'Your export did not finish. Please try again in a minute.' }, { status: 500 })
  }
}
