// Studio home: a greeting over the painted studio, what is on the table and coming up, the last note you left
// yourself, favourite and newest patterns, the latest makes and the four rooms. First run shows three small steps.
import Link from 'next/link'
import '@/styles/studio.css'
import { requireMaker } from '@/lib/access'
import { signPaths } from '@/lib/photos'
import { friendlyError } from '@/lib/errors'
import { ROOMS, craftsInRoom, familyOf, stageLabel } from '@/lib/crafts'
import { dateLabel, plural } from '@/lib/format'
import HeroStage from '@/components/HeroStage'
import PageHead from '@/components/PageHead'
import Seam from '@/components/Seam'
import TapeMeasure from '@/components/TapeMeasure'
import Stars from '@/components/Stars'
import PatternCard from '@/components/studio/PatternCard'
import DueChip from '@/components/studio/DueChip'
import { coverFor, craftIcon, delay, signedFor } from '@/components/studio/util'

export const metadata = { title: 'Your studio' }

const PATTERN_COLS = 'id, name, designer, craft, cover_path, cover_url, pinned, rating, status'
const OPEN_STAGES = ['daydream', 'planned', 'cut', 'making']

const HERO_ALT = 'Painted sunlit sewing studio: a tin of pastel buttons, spools of thread and a tape measure on a timber table, '
  + 'a pink dress on a dress form beside shelves of folded fabric, and a flowering tree outside the window'

const FLOATIES = [
  { left: '58%', top: '9%', size: '46px', colour: '#F2B8CF', t: '9s' },
  { left: '88%', top: '16%', size: '34px', colour: '#BDCDF3', t: '11s', blur: true },
  { left: '76%', top: '66%', size: '30px', colour: '#B5DCC5', t: '8s' },
  { left: '50%', top: '72%', size: '54px', colour: '#CDB8EE', t: '12s', spool: true },
]

function joinAnd(bits) {
  if (bits.length < 2) return bits.join('')
  return `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`
}

function SectionHead({ id, kicker, title, lede, family = 'pur', action = null }) {
  return (
    <div className={`st-section-head fam-${family}`}>
      <div>
        <p className="kicker">{kicker}</p>
        <h2 id={id} className="display h2">{title}</h2>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {action}
    </div>
  )
}

function Hint({ icon, family = 'pur', children, action = null }) {
  return (
    <div className={`glass pad st-hint fam-${family}`}>
      <span className="jewel"><svg aria-hidden="true"><use href={`#${icon}`} /></svg></span>
      <p>{children}</p>
      {action}
    </div>
  )
}

export default async function StudioHome() {
  const { supabase, profile } = await requireMaker()

  const results = await Promise.all([
    supabase.from('patterns').select('id', { count: 'exact', head: true }),
    supabase.from('patterns').select(PATTERN_COLS).eq('pinned', true).order('updated_at', { ascending: false }).limit(12),
    supabase.from('patterns').select(PATTERN_COLS).order('created_at', { ascending: false }).limit(6),
    supabase.from('stash_items').select('id', { count: 'exact', head: true }),
    supabase.from('makes').select('id, title, craft, finished_on, photo_path, rating', { count: 'exact' })
      .order('finished_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(4),
    supabase.from('projects').select('id, title, craft, stage, due_on, for_whom, pattern_id, pattern:patterns(name)')
      .in('stage', OPEN_STAGES).order('updated_at', { ascending: false }),
    supabase.from('makes').select('id, title, next_time, finished_on, pattern_id, pattern:patterns(id, name)')
      .not('next_time', 'is', null).neq('next_time', '')
      .order('finished_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(5),
    supabase.from('measurement_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('measurements').select('id', { count: 'exact', head: true }),
  ])
  const [patternCountRes, pinnedRes, recentRes, stashCountRes, makesRes, projectsRes, nextRes, profileCountRes, measureCountRes] = results
  const failed = results.find((r) => r.error)?.error
  const loadError = failed ? friendlyError(failed, 'Part of your studio did not load. Refresh the page to try again.') : ''

  const patternCount = patternCountRes.count || 0
  const stashCount = stashCountRes.count || 0
  const makesCount = makesRes.count || 0
  const profileCount = profileCountRes.count || 0
  const measureCount = measureCountRes.count || 0
  const pinned = pinnedRes.data || []
  const recent = recentRes.data || []
  const makes = makesRes.data || []
  const open = projectsRes.data || []
  const onTable = open.filter((p) => p.stage === 'cut' || p.stage === 'making')
  const comingUp = open.filter((p) => p.due_on).sort((a, b) => String(a.due_on).localeCompare(String(b.due_on))).slice(0, 6)
  const lastTime = (nextRes.data || []).find((m) => String(m.next_time || '').trim()) || null

  const signed = await signPaths(supabase, [
    ...pinned.map((p) => p.cover_path), ...recent.map((p) => p.cover_path), ...makes.map((m) => m.photo_path),
  ])

  const firstRun = patternCount === 0 && stashCount === 0
  const name = String(profile?.display_name || '').trim()
  const greeting = firstRun ? `Welcome, ${name || 'maker'}` : name ? `Welcome back, ${name}` : 'Welcome back'

  const bits = []
  if (onTable.length) bits.push(`${plural(onTable.length, 'project')} on the table`)
  if (comingUp.length) bits.push(`${plural(comingUp.length, 'date')} coming up`)
  if (!bits.length && patternCount) bits.push(`${plural(patternCount, 'pattern')} in your library`)
  if (stashCount) bits.push(`${plural(stashCount, 'piece')} in your stash`)
  const lede = firstRun
    ? 'This is your studio. Start with the three small steps below, in any order.'
    : bits.length ? `${joinAnd(bits)}.` : 'Your patterns, stash, plans and makes, together in one tidy box.'

  const stats = [
    { n: patternCount, label: patternCount === 1 ? 'Pattern' : 'Patterns', icon: 'i-library', fam: 'pur', href: '/studio/library' },
    { n: stashCount, label: stashCount === 1 ? 'Stash piece' : 'Stash pieces', icon: 'i-stash', fam: 'pink', href: '/studio/stash' },
    { n: makesCount, label: makesCount === 1 ? 'Make' : 'Makes', icon: 'i-journal', fam: 'grn', href: '/studio/makes' },
    { n: open.length, label: 'On the go', icon: 'i-planner', fam: 'blu', href: '/studio/planner' },
  ]
  const hasSide = comingUp.length > 0 || Boolean(lastTime)
  const showToday = !firstRun || open.length > 0

  return (
    <>
      <section className="st-home-top" aria-label="Welcome">
        <HeroStage src="/art/studio-hero.webp" alt={HERO_ALT} floaties={FLOATIES} className="st-home-hero rise" />
        <div className="st-hero-overlay">
          <div className="backlit fam-pink st-hero-light">
            <div className="st-hero-card glass panel spot-pink pad-lg">
              <PageHead kicker="Your studio today" title={greeting} lede={lede} family="pink">
                <nav className="st-quick" aria-label="Quick actions">
                  <Link href="/studio/import" className="fam-pur"><span className="jewel"><svg aria-hidden="true"><use href="#i-upload" /></svg></span>Add patterns</Link>
                  <Link href="/studio/snap" className="fam-pink"><span className="jewel"><svg aria-hidden="true"><use href="#i-camera" /></svg></span>Snap a label</Link>
                  <Link href="/studio/make" className="fam-grn"><span className="jewel"><svg aria-hidden="true"><use href="#i-spark" /></svg></span>What can I make?</Link>
                  <Link href="/studio/planner?new=1" className="fam-blu"><span className="jewel"><svg aria-hidden="true"><use href="#i-plus" /></svg></span>New project</Link>
                </nav>
              </PageHead>
            </div>
          </div>
        </div>
      </section>

      {loadError ? <p className="notice error" role="alert" style={{ marginTop: 24 }}>{loadError}</p> : null}

      {firstRun ? (
        <>
          <Seam />
          <section className="glass panel spot-pink pad-lg st-onboard fam-pink rise" style={delay(2)} aria-labelledby="first-steps">
            <figure className="painting st-onboard-art st-art">
              <img src="/art/sample-bronte.webp" alt="Painting of a pink ribbed top with a draped neckline and pearl buttons on a dress form, framed by lilac flowers" width="760" height="1140" loading="lazy" />
            </figure>
            <div>
              <p className="kicker">Getting started</p>
              <h2 id="first-steps" className="display h2">Three small steps to fill your box</h2>
              <p className="lede" style={{ marginTop: 10 }}>Each one makes the studio more useful: matching patterns to your stash, sizes to your measurements and plans to a shopping list.</p>
              <ol className="st-steps">
                <li className="rise" style={delay(3)}>
                  <div className="glass lift st-step fam-pur">
                    <div className="st-step-top"><span className="jewel"><svg aria-hidden="true"><use href="#i-library" /></svg></span><span className="st-step-n" aria-hidden="true">1</span></div>
                    <h3>Bring in your patterns</h3>
                    <p>Add your pattern files and paper patterns, or bring them in from where you keep them now.</p>
                    <div className="row" style={{ '--gap': '8px' }}>
                      <Link className="btn small" href="/studio/import"><svg aria-hidden="true"><use href="#i-upload" /></svg>Add patterns</Link>
                      <Link className="btn soft small" href="/studio/library/new">Add one by hand</Link>
                    </div>
                  </div>
                </li>
                <li className="rise" style={delay(4)}>
                  <div className="glass lift st-step fam-pink">
                    <div className="st-step-top"><span className="jewel"><svg aria-hidden="true"><use href="#i-stash" /></svg></span><span className="st-step-n" aria-hidden="true">2</span></div>
                    <h3>Add what is in your stash</h3>
                    <p>Fabric, yarn, paper, beads and wax: note how much you have and where it lives.</p>
                    <div className="row" style={{ '--gap': '8px' }}>
                      <Link className="btn small" href="/studio/stash?add=1"><svg aria-hidden="true"><use href="#i-plus" /></svg>Add to your stash</Link>
                      <Link className="btn soft small" href="/studio/snap"><svg aria-hidden="true"><use href="#i-camera" /></svg>Snap a label</Link>
                    </div>
                  </div>
                </li>
                <li className="rise" style={delay(5)}>
                  <div className="glass lift st-step fam-grn">
                    <div className="st-step-top">
                      <span className="jewel"><svg aria-hidden="true"><use href="#i-measure" /></svg></span>
                      {measureCount ? <span className="tag"><svg aria-hidden="true" className="st-tag-icon"><use href="#i-check" /></svg>Done</span> : <span className="st-step-n" aria-hidden="true">3</span>}
                    </div>
                    <h3>Add your measurements</h3>
                    <p>
                      {measureCount
                        ? 'Saved. Patterns with a size chart can now suggest which size to make.'
                        : profileCount > 1
                          ? `Your ${profileCount} measurement profiles are ready for them. A few numbers, and patterns with a size chart can suggest a size.`
                          : 'A few numbers, and patterns with a size chart can suggest which size to make.'}
                    </p>
                    <div className="row" style={{ '--gap': '8px' }}>
                      <Link className={`btn small${measureCount ? ' soft' : ''}`} href="/studio/measurements"><svg aria-hidden="true"><use href="#i-measure" /></svg>{measureCount ? 'Check your measurements' : 'Add your measurements'}</Link>
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          </section>
        </>
      ) : (
        <div className="st-stats">
          {stats.map((s, i) => (
            <div key={s.href} className="rise" style={delay(i + 1, 0.06)}>
              <Link href={s.href} className={`glass stat lift sheen fam-${s.fam} st-stat`}>
                <span className="jewel"><svg aria-hidden="true"><use href={`#${s.icon}`} /></svg></span>
                <span><span className="n num">{s.n}</span><span className="l">{s.label}</span></span>
              </Link>
            </div>
          ))}
        </div>
      )}

      {showToday ? (
        <>
          <Seam />
          <div className="st-home-grid" style={hasSide ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <section className="glass panel spot-pink pad-lg st-section rise" style={delay(1)} aria-labelledby="on-table">
              <SectionHead id="on-table" kicker="On the table" title="What you are making" family="pink"
                action={<Link className="btn soft small" href="/studio/planner"><svg aria-hidden="true"><use href="#i-planner" /></svg>Open the planner</Link>} />
              {onTable.length ? (
                <div className="st-grid" style={{ '--min': '270px', '--gap': '18px' }}>
                  {onTable.map((p, i) => (
                    <div key={p.id} className="rise" style={delay(i + 2)}>
                      <Link href="/studio/planner" className={`glass pad lift sheen rib fam-${familyOf(p.craft)} st-table-card`}>
                        <span className="st-head-row">
                          <span className="jewel"><svg aria-hidden="true"><use href={`#${craftIcon(p.craft)}`} /></svg></span>
                          <span className="st-grow">
                            <span className="st-card-title" style={{ display: 'block' }}>{p.title}</span>
                            {p.pattern?.name ? <span className="small" style={{ display: 'block' }}>{p.pattern.name}</span> : null}
                          </span>
                        </span>
                        <TapeMeasure stage={p.stage} craft={p.craft} compact />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <Hint icon="i-needle" family="pink"
                  action={<Link className="btn small" href="/studio/planner?new=1"><svg aria-hidden="true"><use href="#i-plus" /></svg>Start a project</Link>}>
                  Nothing is cut or on the needles right now. When you start a project, move it along in the planner and it shows up here.
                </Hint>
              )}
            </section>

            {hasSide ? (
              <div className="stack" style={{ '--gap': '30px' }}>
                {comingUp.length ? (
                  <section className="glass panel spot-blu pad-lg st-section rise" style={delay(2)} aria-labelledby="coming-up">
                    <SectionHead id="coming-up" kicker="Coming up" title="Dates to keep" family="blu" />
                    <ul className="rows st-list">
                      {comingUp.map((p) => (
                        <li key={p.id}>
                          <Link href="/studio/planner" className={`row-item glass lift fam-${familyOf(p.craft)} st-due-row`}>
                            <span className="jewel"><svg aria-hidden="true"><use href={`#${craftIcon(p.craft)}`} /></svg></span>
                            <span className="st-grow">
                              <strong>{p.title}</strong>
                              <span className="small">{stageLabel(p.stage, p.craft)}{p.for_whom ? `, for ${p.for_whom}` : ''}</span>
                            </span>
                            <DueChip due={p.due_on} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {lastTime ? (
                  <section className="glass panel spot-grn pad-lg st-section fam-grn rise" style={delay(3)} aria-labelledby="last-time">
                    <p className="kicker" id="last-time">Last time you said</p>
                    <Link className="st-note-link" href={lastTime.pattern ? `/studio/library/${lastTime.pattern.id}` : '/studio/makes'}>
                      <span className="st-note-pin" aria-hidden="true"><svg><use href="#i-pin" /></svg></span>
                      <span className="note-paper">
                        <span className="hand st-prose">{String(lastTime.next_time).trim()}</span>
                        <span className="small">
                          {lastTime.pattern ? `About ${lastTime.pattern.name}` : `About ${lastTime.title}`}
                          {lastTime.finished_on ? `, ${dateLabel(lastTime.finished_on)}` : ''}
                          {lastTime.pattern ? '. Open the pattern' : '. Open your journal'}
                        </span>
                      </span>
                    </Link>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {!firstRun ? (
        <>
          <Seam />
          <div className="stack" style={{ '--gap': '30px' }}>
            <section className="glass panel spot-grn pad-lg st-section rise" aria-labelledby="pinned">
              <SectionHead id="pinned" kicker="Pinned patterns" title="Your favourites" family="pink"
                action={<Link className="btn soft small" href="/studio/library"><svg aria-hidden="true"><use href="#i-library" /></svg>Open the library</Link>} />
              {pinned.length ? (
                <div className="st-grid st-pgrid">
                  {pinned.map((p, i) => (
                    <div key={p.id} className="rise" style={delay(i + 1, 0.04)}><PatternCard pattern={p} cover={coverFor(p, signed)} /></div>
                  ))}
                </div>
              ) : (
                <Hint icon="i-pin" family="pink">Pin the patterns you reach for most in your library and they wait for you here.</Hint>
              )}
            </section>

            <section className="glass panel spot-blu pad-lg st-section rise" aria-labelledby="recent">
              <SectionHead id="recent" kicker="Recently added" title="New in the library" family="blu"
                action={<Link className="btn soft small" href="/studio/import"><svg aria-hidden="true"><use href="#i-upload" /></svg>Add patterns</Link>} />
              {recent.length ? (
                <div className="st-grid st-pgrid">
                  {recent.map((p, i) => (
                    <div key={p.id} className="rise" style={delay(i + 1, 0.04)}><PatternCard pattern={p} cover={coverFor(p, signed)} /></div>
                  ))}
                </div>
              ) : (
                <Hint icon="i-library" family="blu"
                  action={<Link className="btn small" href="/studio/import"><svg aria-hidden="true"><use href="#i-upload" /></svg>Bring in your patterns</Link>}>
                  Your library is empty so far. Bring in your patterns and the studio can match them to your stash.
                </Hint>
              )}
            </section>
          </div>
        </>
      ) : null}

      {makes.length ? (
        <>
          <Seam />
          <section className="glass panel spot-pink pad-lg st-section rise" aria-labelledby="lately">
            <SectionHead id="lately" kicker="Lately finished" title="Off the needles and out of the hoop" family="grn"
              action={<Link className="btn soft small" href="/studio/makes"><svg aria-hidden="true"><use href="#i-journal" /></svg>Open your journal</Link>} />
            <div className="st-hoops">
              {makes.map((m, i) => {
                const photo = signedFor(signed, m.photo_path)
                return (
                  <div key={m.id} className="rise" style={delay(i + 1)}>
                    <Link href="/studio/makes" className={`glass lift sheen st-hoop-link fam-${familyOf(m.craft)}`}>
                      <span className="hoop">
                        {photo ? <img src={photo} alt={`Photo of ${m.title}`} loading="lazy" /> : <span className="ph"><svg aria-hidden="true"><use href={`#${craftIcon(m.craft)}`} /></svg></span>}
                      </span>
                      <span className="st-hoop-title">{m.title}</span>
                      {m.finished_on ? <span className="small">{dateLabel(m.finished_on)}</span> : null}
                      {m.rating ? <Stars value={m.rating} label="Your rating" /> : null}
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      ) : null}

      <Seam />
      <section className="glass panel spot-blu pad-lg st-section rise" aria-labelledby="rooms">
        <SectionHead id="rooms" kicker="Your rooms" title="Four rooms, sixteen crafts" family="pur"
          lede="Each room keeps its own crafts, stash and tools. Wander in." />
        <div className="g4">
          {ROOMS.map((r, i) => (
            <div key={r.key} className="rise" style={delay(i + 1, 0.07)}>
              <Link href={`/studio/rooms/${r.key}`} className={`room-card glass lift sheen fam-${r.family} st-room`}>
                <div className="pic"><img src={r.art} alt={r.alt} width="1280" height="853" loading="lazy" /></div>
                <div className="body">
                  <h3>{r.name}</h3>
                  <p className="small">{r.blurb}</p>
                  <div className="mini-crafts">
                    {craftsInRoom(r.key).map((c) => (
                      <span key={c.slug}><svg aria-hidden="true"><use href={`#${c.icon}`} /></svg>{c.short}</span>
                    ))}
                  </div>
                  <span className="go">Go to the room<svg aria-hidden="true"><use href="#i-chev" /></svg></span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
