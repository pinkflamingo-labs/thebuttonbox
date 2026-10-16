// Makes journal: everything finished, newest first, with signed photo links.
import '@/styles/studio.css'
import { requireMaker } from '@/lib/access'
import { signPaths } from '@/lib/photos'
import { friendlyError } from '@/lib/errors'
import MakesJournal from '@/components/studio/MakesJournal'
import { firstParam } from '@/components/studio/util'

export const metadata = { title: 'Makes journal' }

export default async function MakesPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const { supabase } = await requireMaker()

  const results = await Promise.all([
    supabase.from('makes').select('*')
      .order('finished_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    supabase.from('patterns').select('id, name, craft').order('name'),
    supabase.from('stash_items').select('id, name, kind, room').order('name'),
  ])
  const [makesRes, patternsRes, stashRes] = results
  const failed = results.find((r) => r.error)?.error
  const makes = makesRes.data || []
  const signed = await signPaths(supabase, makes.map((m) => m.photo_path))

  return (
    <MakesJournal
      makes={makes}
      patterns={patternsRes.data || []}
      stash={stashRes.data || []}
      signed={signed}
      year={new Date().getFullYear()}
      openNew={firstParam(sp.new) === '1'}
      newPattern={firstParam(sp.pattern) || null}
      newTitle={String(firstParam(sp.title) || '').slice(0, 200)}
      loadError={failed ? friendlyError(failed, 'Part of your journal did not load. Refresh the page to try again.') : ''}
    />
  )
}
