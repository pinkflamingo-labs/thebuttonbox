// What can I make? Loads every pattern with what it needs, the whole stash and everyone's latest measurements,
// then the matching happens in the browser so switching person or room is instant.
import '@/styles/studio.css'
import { requireMaker } from '@/lib/access'
import { signPaths } from '@/lib/photos'
import { friendlyError } from '@/lib/errors'
import { latestMeasurements } from '@/lib/sizing'
import MakeFinder from '@/components/studio/MakeFinder'
import { firstParam } from '@/components/studio/util'

export const metadata = { title: 'What can I make?' }

const PATTERN_COLS = 'id, name, designer, craft, cover_path, cover_url, pinned, rating, status, size_chart, supplies, material, stretch_pct'

export default async function MakePage({ searchParams }) {
  const sp = (await searchParams) || {}
  const { supabase, profile } = await requireMaker()

  const results = await Promise.all([
    supabase.from('patterns').select(PATTERN_COLS).order('name'),
    supabase.from('requirements').select('id, pattern_id, variation, size_from, size_to, material, amount, unit, width_cm, notes, sort').order('sort'),
    supabase.from('stash_items').select('*').order('created_at', { ascending: false }),
    supabase.from('measurement_profiles').select('id, name, is_me, created_at').order('created_at'),
    supabase.from('measurements').select('id, profile_id, taken_on, bust, high_bust, waist, hips, height, inseam'),
    supabase.from('projects').select('id, title'),
  ])
  const [patternsRes, reqRes, stashRes, profilesRes, measRes, projectsRes] = results
  const failed = results.find((r) => r.error)?.error

  const patterns = patternsRes.data || []
  const stash = stashRes.data || []
  const profiles = (profilesRes.data || []).sort((a, b) => Number(b.is_me) - Number(a.is_me))

  const byProfile = {}
  for (const m of measRes.data || []) (byProfile[m.profile_id] ||= []).push(m)
  const latest = Object.fromEntries(Object.entries(byProfile).map(([id, rows]) => [id, latestMeasurements(rows)]))

  const signed = await signPaths(supabase, [...patterns.map((p) => p.cover_path), ...stash.map((s) => s.photo_path)])

  return (
    <MakeFinder
      patterns={patterns}
      requirements={reqRes.data || []}
      stash={stash}
      profiles={profiles}
      latest={latest}
      signed={signed}
      projects={projectsRes.data || []}
      focusId={firstParam(sp.stash) || null}
      units={profile?.units || 'metric'}
      loadError={failed ? friendlyError(failed, 'Part of your studio did not load. Refresh the page to try again.') : ''}
    />
  )
}
