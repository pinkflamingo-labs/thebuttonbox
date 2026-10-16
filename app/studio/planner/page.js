// Planner and shopping list: every project by stage, with what each planned pattern needs worked out in the
// maker's own size (the "Me" measurements) for the shopping list.
import '@/styles/studio.css'
import { requireMaker } from '@/lib/access'
import { signPaths } from '@/lib/photos'
import { friendlyError } from '@/lib/errors'
import { latestMeasurements } from '@/lib/sizing'
import PlannerBoard from '@/components/studio/PlannerBoard'
import { firstParam } from '@/components/studio/util'

export const metadata = { title: 'Planner' }

const STASH_COLS = 'id, name, kind, room, quantity, unit, width_cm, stretch_pct, yarn_weight, metres_per_unit, dye_lot, material, fibre, colour_hex, reserved_project_id'

async function loadMe(supabase) {
  const { data: me, error } = await supabase.from('measurement_profiles').select('id').eq('is_me', true)
    .order('created_at').limit(1).maybeSingle()
  if (error || !me) return { data: null, error }
  const { data, error: rowsError } = await supabase.from('measurements')
    .select('id, profile_id, taken_on, bust, high_bust, waist, hips, height, inseam').eq('profile_id', me.id)
  return { data: latestMeasurements(data || []), error: rowsError }
}

export default async function PlannerPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const { supabase, profile } = await requireMaker()

  const results = await Promise.all([
    supabase.from('projects').select('*').order('sort', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('patterns').select('id, name, craft, size_chart, supplies, cover_path, cover_url, material, stretch_pct').order('name'),
    supabase.from('requirements').select('id, pattern_id, variation, size_from, size_to, material, amount, unit, width_cm, sort').order('sort'),
    supabase.from('stash_items').select(STASH_COLS),
    supabase.from('shopping_items').select('*').order('created_at', { ascending: true }),
    loadMe(supabase),
  ])
  const [projectsRes, patternsRes, reqRes, stashRes, shopRes, meRes] = results
  const failed = results.find((r) => r.error)?.error
  const patterns = patternsRes.data || []
  const signed = await signPaths(supabase, patterns.map((p) => p.cover_path))

  return (
    <PlannerBoard
      projects={projectsRes.data || []}
      patterns={patterns}
      requirements={reqRes.data || []}
      stash={stashRes.data || []}
      shopping={shopRes.data || []}
      measurements={meRes.data || null}
      signed={signed}
      units={profile?.units || 'metric'}
      openNew={firstParam(sp.new) === '1'}
      openPattern={firstParam(sp.pattern) || null}
      loadError={failed ? friendlyError(failed, 'Part of your planner did not load. Refresh the page to try again.') : ''}
    />
  )
}
