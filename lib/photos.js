// Server helpers for private photos: signed links that expire, so photos are never public.
export const PHOTO_BUCKET = 'maker-photos'

export async function signPaths(supabase, paths, seconds = 3600) {
  const unique = [...new Set((paths || []).filter(Boolean))]
  if (!unique.length) return {}
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, seconds)
  if (error || !data) return {}
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
}
