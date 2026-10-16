// The four rooms: large painted cards with each room's crafts and what the maker keeps there.
import Link from 'next/link'
import '@/styles/rooms-tools.css'
import PageHead from '@/components/PageHead'
import Seam from '@/components/Seam'
import { requireMaker } from '@/lib/access'
import { ROOMS } from '@/lib/crafts'
import { roomTotals } from '@/components/rooms/data'
import RoomCard from '@/components/rooms/RoomCard'
import SharedChips from '@/components/rooms/SharedChips'

export const metadata = { title: 'Rooms' }

export default async function RoomsPage() {
  const { supabase, profile } = await requireMaker()
  const totals = await Promise.all(ROOMS.map((r) => roomTotals(supabase, r.key)))
  const failed = totals.some((t) => t.failed)

  return (
    <>
      <PageHead
        kicker="Rooms"
        title="Four rooms, one studio"
        lede="Every craft has a room, with its own tools and its own corner of your stash. Step into one to see what lives there."
        family="pur"
      >
        <Link className="btn soft" href="/studio/toolbox">
          <svg aria-hidden="true"><use href="#i-toolbox" /></svg>Open the toolbox
        </Link>
      </PageHead>

      {failed ? (
        <p className="notice error rt-gap" role="alert">Some of the counts did not load. Refresh the page to try again.</p>
      ) : null}

      <div className="g2 rt-rooms">
        {ROOMS.map((room, i) => (
          <RoomCard
            key={room.key}
            room={room}
            counts={totals[i]}
            favourite={profile?.favourite_room === room.key}
            delay={`${(0.06 + i * 0.08).toFixed(2)}s`}
            eager={i < 2}
          />
        ))}
      </div>

      <Seam />

      <section className="glass panel spot-grn pad-lg fam-grn rt-shared rise" style={{ '--d': '.1s' }} aria-labelledby="shared-title">
        <div className="rt-shared-text">
          <p className="kicker">Every room</p>
          <h2 id="shared-title" className="display h2">Shared by all four</h2>
          <p className="lede">Your library, journal, stash, planner, shopping list and toolbox work the same in every room.</p>
        </div>
        <SharedChips />
      </section>
    </>
  )
}
