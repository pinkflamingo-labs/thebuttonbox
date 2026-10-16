// One room: its painting, its crafts, its tools, what its stash holds, and the latest patterns and makes.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import '@/styles/rooms-tools.css'
import PageHead from '@/components/PageHead'
import HeroStage from '@/components/HeroStage'
import Seam from '@/components/Seam'
import Empty from '@/components/Empty'
import { requireMaker } from '@/lib/access'
import { CRAFT, ROOM, ROOMS, STASH_KINDS, TOOLS, craftsInRoom } from '@/lib/crafts'
import { dateLabel, plural } from '@/lib/format'
import { signPaths } from '@/lib/photos'
import { inRoom, patternsPerCraft, roomTotals, stashPerKind } from '@/components/rooms/data'
import RoomCounts from '@/components/rooms/RoomCounts'
import SectionHead from '@/components/rooms/SectionHead'
import SharedChips from '@/components/rooms/SharedChips'
import { toolIcon, whereHref, whereText } from '@/components/toolbox/meta'

const SWATCH = { pink: '#F2B8CF', pur: '#CDB8EE', blu: '#BDCDF3', grn: '#B5DCC5' }

function floatiesFor(family) {
  const main = SWATCH[family] || SWATCH.pur
  return [
    { left: '85%', top: '9%', size: '54px', t: '11s', colour: main },
    { left: '90%', top: '60%', size: '40px', t: '13s', colour: SWATCH.pur, blur: true },
    { left: '30%', top: '5%', size: '44px', t: '12s', colour: main, spool: true },
    { left: '68%', top: '80%', size: '34px', t: '9s', colour: SWATCH.grn },
  ]
}

const d = (i, base = 0.04, step = 0.05) => `${Math.min(base + i * step, 0.45).toFixed(2)}s`

export async function generateMetadata({ params }) {
  const { room } = await params
  return { title: ROOM[room]?.name || 'Rooms' }
}

export default async function RoomPage({ params }) {
  const { room: key } = await params
  const room = ROOM[key]
  if (!room) notFound()

  const { supabase } = await requireMaker()
  const fam = room.family
  const crafts = craftsInRoom(key)
  const kinds = STASH_KINDS[key] || []
  const tools = TOOLS[key] || []

  const [totals, perCraft, perKind, patternsRes, makesRes] = await Promise.all([
    roomTotals(supabase, key),
    patternsPerCraft(supabase, key),
    stashPerKind(supabase, key, kinds),
    inRoom(supabase.from('patterns').select('id, name, designer, craft, cover_path, cover_url, status, created_at'), key)
      .order('created_at', { ascending: false })
      .limit(6),
    inRoom(supabase.from('makes').select('id, title, craft, finished_on, photo_path, created_at'), key)
      .order('finished_on', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const patterns = patternsRes.data || []
  const makes = makesRes.data || []
  const urls = await signPaths(supabase, [...patterns.map((p) => p.cover_path), ...makes.map((m) => m.photo_path)])
  const failed = totals.failed || perCraft.failed || perKind.failed || patternsRes.error || makesRes.error
  const others = ROOMS.filter((r) => r.key !== key)

  return (
    <>
      <section className="rt-room-hero" aria-label={`${room.name} room`}>
        <div className={`rt-hero-card glass panel pad-lg fam-${fam} rise`}>
          <PageHead kicker={`A room in ${room.tone.toLowerCase()}`} title={room.name} lede={room.blurb} family={fam}>
            <Link className="btn fam" href={`/studio/library?room=${key}`}>
              <svg aria-hidden="true"><use href="#i-library" /></svg>See this room&apos;s patterns
            </Link>
            <Link className="btn soft" href={`/studio/stash?room=${key}`}>
              <svg aria-hidden="true"><use href="#i-stash" /></svg>Open its stash
            </Link>
          </PageHead>
          <RoomCounts counts={totals} />
        </div>
        <HeroStage src={room.art} alt={room.alt} floaties={floatiesFor(fam)} className={`fam-${fam}`} />
      </section>

      {failed ? (
        <p className="notice error rt-gap" role="alert">Some of this room did not load. Refresh the page to try again.</p>
      ) : null}

      <div className={`fam-${fam}`}>
        <section className="section" aria-labelledby="crafts-title">
          <SectionHead id="crafts-title" kicker="Crafts in this room" title={`${plural(crafts.length, 'craft')} live here`} icon="i-rooms" />
          <ul className="cards rt-craft-grid">
            {crafts.map((c, i) => (
              <li key={c.slug} className="rise" style={{ '--d': d(i) }}>
                <Link href={`/studio/library?craft=${c.slug}`} className="craft-tile glass lift sheen rt-craft">
                  <span className="jewel">
                    <svg aria-hidden="true"><use href={`#${c.icon}`} /></svg>
                  </span>
                  <span className="nm">{c.name}</span>
                  <span className="fm">{plural(perCraft.counts[c.slug] ?? 0, 'pattern')}</span>
                  <span className="small">Open {c.short} in the library</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Seam />

        <section className="section" aria-labelledby="tools-title">
          <SectionHead id="tools-title" kicker="Tools in this room" title="Sums, sizes and helpers" icon="i-toolbox">
            <Link className="btn soft small" href={`/studio/toolbox#room-${key}`}>Open the toolbox</Link>
          </SectionHead>
          <ul className="cards rt-tool-grid">
            {tools.map((t, i) => {
              const inner = (
                <>
                  <span className="jewel" style={{ '--js': '46px' }}>
                    <svg aria-hidden="true"><use href={`#${toolIcon(t.key)}`} /></svg>
                  </span>
                  <span className="rt-mini-text">
                    <b>{t.name}</b>
                    {!t.ready ? (
                      <>
                        <span className="tag rt-later-tag">Coming later</span>
                        {t.note ? <span className="small">{t.note}.</span> : null}
                      </>
                    ) : t.where ? (
                      <span className="small">Lives in {whereText(t.where)}</span>
                    ) : (
                      <span className="small">Ready in the toolbox</span>
                    )}
                  </span>
                </>
              )
              return (
                <li key={t.key} className="rise" style={{ '--d': d(i, 0.04, 0.03) }}>
                  {!t.ready ? (
                    <div className="glass rib rt-mini-tool is-later">{inner}</div>
                  ) : (
                    <Link href={t.where ? whereHref(t.where) : `/studio/toolbox#${t.key}`} className="glass lift sheen rib rt-mini-tool">
                      {inner}
                      <svg className="rt-go" aria-hidden="true"><use href="#i-chev" /></svg>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <Seam />

        <section className="section" aria-labelledby="stash-title">
          <SectionHead id="stash-title" kicker="Stash" title="What this room's stash holds" icon="i-stash">
            <Link className="btn soft small" href={`/studio/stash?room=${key}&add=1`}>
              <svg aria-hidden="true"><use href="#i-plus" /></svg>Add to the stash
            </Link>
          </SectionHead>
          <div className="backlit rt-halo-in">
            <ul className="cards rt-kind-grid">
              {kinds.map((k, i) => {
                const n = perKind.counts[k.key] ?? 0
                return (
                  <li key={k.key} className="rise" style={{ '--d': d(i) }}>
                    <Link href={`/studio/stash?room=${key}&kind=${k.key}`} className="glass lift sheen rib rt-kind">
                      <span className="rt-kind-n num">{n}</span>
                      <span className="rt-kind-l">{k.label}</span>
                      <span className="small">{n ? `${n === 1 ? 'Piece' : 'Pieces'} in your stash` : 'Nothing here yet'}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <Seam />

        <section className="section" aria-labelledby="patterns-title">
          <SectionHead id="patterns-title" kicker="Library" title="Recent patterns" icon="i-library">
            <Link className="btn soft small" href={`/studio/library?room=${key}`}>See them all</Link>
          </SectionHead>
          {patterns.length ? (
            <ul className="cards rt-pattern-grid">
              {patterns.map((p, i) => {
                const craft = CRAFT[p.craft]
                const src = (p.cover_path && urls[p.cover_path]) || p.cover_url || null
                return (
                  <li key={p.id} className="rise" style={{ '--d': d(i) }}>
                    <Link href={`/studio/library/${p.id}`} className="pcard glass lift sheen">
                      <div className="cover">
                        {src ? (
                          <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="ph"><svg aria-hidden="true"><use href={`#${craft?.icon || 'i-general'}`} /></svg></div>
                        )}
                        {p.status === 'wishlist' ? (
                          <div className="flags"><span className="tag">Wishlist</span></div>
                        ) : null}
                      </div>
                      <div className="meta">
                        {p.designer ? <span className="designer">{p.designer}</span> : null}
                        <span className="name">{p.name}</span>
                        <span className="small">{craft ? craft.short : 'No craft chosen'}</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty
              icon="i-library"
              family={fam}
              title="No patterns in this room yet"
              action={<Link className="btn" href="/studio/library/new"><svg aria-hidden="true"><use href="#i-plus" /></svg>Add a pattern</Link>}
            >
              Add a pattern for one of this room&apos;s crafts and it will appear here.
            </Empty>
          )}
        </section>

        <Seam />

        <section className="section" aria-labelledby="makes-title">
          <SectionHead id="makes-title" kicker="Makes journal" title="Recent makes" icon="i-journal">
            <Link className="btn soft small" href="/studio/makes">Open the journal</Link>
          </SectionHead>
          {makes.length ? (
            <ul className="rt-hoops">
              {makes.map((m, i) => {
                const src = m.photo_path ? urls[m.photo_path] : null
                return (
                  <li key={m.id} className="rise" style={{ '--d': d(i, 0.06, 0.08) }}>
                    <figure className="rt-hoop-fig">
                      <div className="hoop" style={{ '--hs': 'clamp(128px, 15vw, 172px)' }}>
                        {src ? (
                          <img src={src} alt={`Photo of ${m.title}`} loading="lazy" />
                        ) : (
                          <div className="ph"><svg aria-hidden="true"><use href={`#${CRAFT[m.craft]?.icon || 'i-general'}`} /></svg></div>
                        )}
                      </div>
                      <figcaption>
                        <b>{m.title}</b>
                        <span className="small">{m.finished_on ? `Finished ${dateLabel(m.finished_on)}` : 'No finish date yet'}</span>
                      </figcaption>
                    </figure>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="glass panel pad-lg rt-quiet">
              <p className="muted">Nothing from this room in your journal yet. When you finish something, add it to the journal and it will hang here in a hoop.</p>
            </div>
          )}
        </section>

        <Seam />

        <section className="glass panel spot-blu pad-lg rt-shared rise" aria-labelledby="shared-title">
          <div className="rt-shared-text">
            <p className="kicker">Every room</p>
            <h2 id="shared-title" className="display h2">Shared by all four rooms</h2>
            <p className="lede">The same library, journal, stash, planner, shopping list and toolbox, wherever you are working.</p>
          </div>
          <SharedChips room={key} />
        </section>

        <nav className="rt-other-rooms" aria-label="Other rooms">
          <p className="label">Other rooms</p>
          <ul className="pills">
            {others.map((r) => (
              <li key={r.key}>
                <Link className={`pill rt-room-pill fam-${r.family}`} href={`/studio/rooms/${r.key}`}>
                  <span className="dot" aria-hidden="true" />{r.name}
                </Link>
              </li>
            ))}
            <li>
              <Link className="pill" href="/studio/rooms">All rooms</Link>
            </li>
          </ul>
        </nav>
      </div>
    </>
  )
}
