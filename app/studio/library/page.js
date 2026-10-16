// The pattern library: every pattern a maker owns or wants, across every craft.
import Link from 'next/link'
import { requireMaker } from '@/lib/access'
import { signPaths } from '@/lib/photos'
import PageHead from '@/components/PageHead'
import LibraryBoard from '@/components/library/LibraryBoard'
import { plural } from '@/lib/format'
import '@/styles/library.css'

export const metadata = { title: 'Library' }

function one(v) {
  const s = Array.isArray(v) ? v[0] : v
  return typeof s === 'string' ? s.slice(0, 120) : ''
}

export default async function LibraryPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const { supabase } = await requireMaker()
  const [{ data: patterns }, { data: makes }] = await Promise.all([
    supabase.from('patterns')
      .select('id, name, designer, craft, cover_path, cover_url, pinned, rating, status, sizes_label, material, tags, source, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('makes').select('pattern_id'),
  ])
  const signed = await signPaths(supabase, (patterns || []).map((p) => p.cover_path))
  const made = {}
  for (const m of makes || []) if (m.pattern_id) made[m.pattern_id] = (made[m.pattern_id] || 0) + 1
  const list = (patterns || []).map((p) => ({
    ...p,
    cover: (p.cover_path && signed[p.cover_path]) || p.cover_url || null,
    made: made[p.id] || 0,
  }))
  const owned = list.filter((p) => p.status !== 'wishlist').length

  return (
    <>
      <PageHead kicker="Library" family="pink" title="Your pattern library"
        lede={list.length
          ? `${plural(owned, 'pattern', 'patterns')} in the box${list.length > owned ? `, plus ${list.length - owned} on your wishlist` : ''}. Every craft on one shelf, with the cover, sizes and what each one needs.`
          : 'Every pattern you own or want, from every craft, with its cover, sizes and what it needs.'}>
        <Link className="btn" href="/studio/import"><svg aria-hidden="true"><use href="#i-upload" /></svg>Bring in patterns</Link>
        <Link className="btn soft" href="/studio/library/new"><svg aria-hidden="true"><use href="#i-plus" /></svg>Add one by hand</Link>
      </PageHead>
      <LibraryBoard patterns={list}
        initial={{ q: one(sp.q), room: one(sp.room), craft: one(sp.craft), status: one(sp.status), made: one(sp.made) }} />
    </>
  )
}
