// Fair-use limits for the AI reading features, counted per maker.
export const LIMITS = { ai: { perHour: 60 }, snap: { perHour: 40 }, ravelry: { perHour: 6 } }

export async function allowUse(supabase, kind) {
  const limit = LIMITS[kind]?.perHour ?? 30
  const { data: count, error } = await supabase.rpc('count_recent_usage', { p_kind: kind, p_minutes: 60 })
  if (error) return { ok: false, message: 'Could not check your usage. Please try again.' }
  if ((count ?? 0) >= limit) return { ok: false, message: `That is ${limit} in the last hour. Please try again a little later.` }
  await supabase.from('usage_events').insert({ kind })
  return { ok: true }
}
