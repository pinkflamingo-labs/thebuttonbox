// Stash: every piece of fabric, yarn, paper and supplies the maker has, with signed photo links.
import '@/styles/studio.css'
import { requireMaker } from '@/lib/access'
import { signPaths } from '@/lib/photos'
import { friendlyError } from '@/lib/errors'
import { ROOM, STASH_KIND } from '@/lib/crafts'
import StashBoard from '@/components/studio/StashBoard'
import { firstParam } from '@/components/studio/util'

export const metadata = { title: 'Stash' }

export default async function StashPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const { supabase, profile } = await requireMaker()

  const [stashRes, projectsRes] = await Promise.all([
    supabase.from('stash_items').select('*').order('created_at', { ascending: false }),
    supabase.from('projects').select('id, title').order('created_at', { ascending: false }),
  ])
  const failed = stashRes.error || projectsRes.error
  const items = stashRes.data || []
  const photos = await signPaths(supabase, items.map((i) => i.photo_path))

  const askedRoom = firstParam(sp.room)
  const askedKind = firstParam(sp.kind)
  const room = ROOM[askedRoom] ? askedRoom : STASH_KIND[askedKind]?.room || null
  const kind = STASH_KIND[askedKind] && (!room || STASH_KIND[askedKind].room === room) ? askedKind : null

  return (
    <StashBoard
      items={items}
      projects={projectsRes.data || []}
      photos={photos}
      units={profile?.units || 'metric'}
      favouriteRoom={ROOM[profile?.favourite_room] ? profile.favourite_room : null}
      initialRoom={room}
      initialKind={kind}
      openAdd={firstParam(sp.add) === '1'}
      loadError={failed ? friendlyError(failed, 'Your stash did not load. Refresh the page to try again.') : ''}
    />
  )
}
