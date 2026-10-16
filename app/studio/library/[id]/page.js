// One pattern: the envelope card, its details, files, makes and plans.
import { notFound } from 'next/navigation'
import { requireMaker } from '@/lib/access'
import { signPaths } from '@/lib/photos'
import PatternView from '@/components/library/PatternView'
import '@/styles/library.css'

export async function generateMetadata({ params }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: 'Pattern' }
  const { supabase } = await requireMaker()
  const { data } = await supabase.from('patterns').select('name').eq('id', id).maybeSingle()
  return { title: data?.name || 'Pattern' }
}

export default async function PatternPage({ params }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { supabase, profile } = await requireMaker()

  const [
    { data: pattern }, { data: files }, { data: requirements }, { data: makes }, { data: projects },
    { data: profiles }, { data: measurements }, { data: stash }, { data: shopping },
  ] = await Promise.all([
    supabase.from('patterns').select('*').eq('id', id).maybeSingle(),
    supabase.from('pattern_files').select('*').eq('pattern_id', id).order('created_at'),
    supabase.from('requirements').select('*').eq('pattern_id', id).order('sort'),
    supabase.from('makes').select('id, title, craft, finished_on, size_made, changes, thoughts, next_time, would_make_again, rating, photo_path')
      .eq('pattern_id', id).order('finished_on', { ascending: false, nullsFirst: false }),
    supabase.from('projects').select('id, title, craft, stage, due_on, for_whom, size_plan, variation').eq('pattern_id', id).order('updated_at', { ascending: false }),
    supabase.from('measurement_profiles').select('id, name, is_me').order('created_at'),
    supabase.from('measurements').select('*').order('taken_on', { ascending: false }),
    supabase.from('stash_items').select('id, name, kind, room, material, fibre, width_cm, quantity, unit, stretch_pct, weight_gsm, yarn_weight, metres_per_unit, reserved_project_id'),
    supabase.from('shopping_items').select('id, name, project_id, done'),
  ])
  if (!pattern) notFound()

  const signed = await signPaths(supabase, [pattern.cover_path, ...(makes || []).map((m) => m.photo_path)])
  const latest = {}
  for (const m of measurements || []) if (!latest[m.profile_id]) latest[m.profile_id] = m
  const people = (profiles || [])
    .map((p) => ({ ...p, latest: latest[p.id] || null }))
    .sort((a, b) => (b.is_me === true) - (a.is_me === true))

  return (
    <PatternView
      pattern={pattern}
      coverUrl={(pattern.cover_path && signed[pattern.cover_path]) || pattern.cover_url || null}
      files={files || []}
      requirements={requirements || []}
      makes={(makes || []).map((m) => ({ ...m, photo: m.photo_path ? signed[m.photo_path] || null : null }))}
      projects={projects || []}
      people={people}
      stash={stash || []}
      shopping={shopping || []}
      units={profile?.units || 'metric'}
    />
  )
}
