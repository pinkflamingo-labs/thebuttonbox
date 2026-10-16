// The front page: the tin welcome, the painted studio, the four rooms, what it does, how it keeps things safe,
// a word on pricing and the footer. Signed-in makers see the same page with "Open your studio" instead.
import Link from 'next/link'
import HeroStage from '@/components/HeroStage'
import Seam from '@/components/Seam'
import Stars from '@/components/Stars'
import TinWelcome from '@/components/landing/TinWelcome'
import EnvelopeDemo from '@/components/landing/EnvelopeDemo'
import PlannerDemo from '@/components/landing/PlannerDemo'
import SiteFooter from '@/components/landing/SiteFooter'
import { TIN_BOOT } from '@/components/landing/tinBoot'
import { getVisitor } from '@/components/landing/visitor'
import { CRAFTS, ROOMS, SHARED, SNAP_TYPES, TOOLS, craftsInRoom } from '@/lib/crafts'
import '@/styles/public.css'

export const metadata = {
  title: { absolute: 'The Button Box · Every craft, one studio' },
  description: 'A makers\u2019 studio for sewing, knitting, crochet, quilting, paper crafts and more: your patterns, stash, plans and makes in one place.',
}

const HERO_ALT = 'Painted maker\u2019s studio: a pale timber worktable with an open button tin, spools and a tape measure, a dress form in a blush pink dress, shelves of pastel fabric, a basket of yarn and a jacaranda outside the window'

const FLOATIES = [
  { left: '50%', top: '7%', size: '52px', colour: '#F2B8CF', t: '9s' },
  { left: '66%', top: '27%', size: '30px', colour: '#BDCDF3', t: '11s', blur: true },
  { left: '85%', top: '6%', size: '44px', colour: '#CDB8EE', t: '10s', spool: true },
  { left: '93%', top: '42%', size: '58px', colour: '#B5DCC5', t: '12s' },
  { left: '73%', top: '63%', size: '36px', colour: '#FBE3EC', t: '8.5s', blur: true },
  { left: '58%', top: '84%', size: '46px', colour: '#CDB8EE', t: '10.5s' },
  { left: '31%', top: '86%', size: '36px', colour: '#F2B8CF', t: '9.5s', spool: true },
  { left: '4%', top: '80%', size: '40px', colour: '#BDCDF3', t: '11.5s', blur: true },
]

const SWATCHES = [
  { name: 'Blush knit', kind: 'Fabric', colour: '#F2B8CF' },
  { name: 'Lilac yarn', kind: 'Yarn', colour: '#CDB8EE' },
  { name: 'Sage linen', kind: 'Fabric', colour: '#B5DCC5' },
]

const SOURCES = [
  { name: 'Your computer', icon: 'i-file' },
  { name: 'OneDrive', icon: 'i-cloud' },
  { name: 'Google Drive', icon: 'i-cloud' },
  { name: 'Dropbox', icon: 'i-cloud' },
  { name: 'Ravelry', icon: 'i-knitting' },
]

const TOOLBOX = Object.values(TOOLS).flat().filter((t) => t.ready && !t.where)

function securityItems(mfaRequired) {
  return [
    {
      icon: 'i-key', family: 'grn',
      title: mfaRequired ? 'Two-step sign-in, every time' : 'Two-step sign-in',
      text: mfaRequired
        ? 'After your password, you type a six-digit code from an authenticator app on your phone, such as Microsoft Authenticator or Google Authenticator. It is required for everyone.'
        : 'After your password, you type a six-digit code from an authenticator app on your phone. It is optional on this site at the moment, and strongly encouraged.',
    },
    {
      icon: 'i-link', family: 'blu', title: 'Your pattern files stay where they are',
      text: 'The studio keeps a link and the details. Your PDFs stay on your computer or in your own cloud drive, never copied here.',
    },
    {
      icon: 'i-lock', family: 'pur', title: 'Only you see your things',
      text: 'Row-level security in the database means every request only ever returns your own patterns, stash, plans and makes. Other makers cannot see them.',
    },
    {
      icon: 'i-camera', family: 'pink', title: 'Private photos',
      text: 'Photos live in a private folder for your account and open only through links that stop working after a short time.',
    },
    {
      icon: 'i-file', family: 'grn', title: 'Export or delete, any time',
      text: 'Download everything as a file whenever you like. Delete your account and everything in it goes too, photos included.',
    },
  ]
}

export default async function HomePage({ searchParams }) {
  const sp = (await searchParams) || {}
  const visitor = await getVisitor()
  const { signedIn, name, settings } = visitor
  const goodbye = Boolean(sp.goodbye)
  const billingOn = settings?.billing_enabled === true
  const trialDays = settings?.trial_days || 0
  const mfaRequired = settings?.require_mfa !== false
  const firstName = (name || '').trim().split(/\s+/)[0]

  return (
    <div className="pub">
      <script dangerouslySetInnerHTML={{ __html: TIN_BOOT }} />
      <TinWelcome />

      {goodbye ? (
        <div className="wrap">
          <p className="notice pub-goodbye" role="status">
            Your account and everything in it have been deleted, and any plan has been cancelled. Thank you for making with us.
          </p>
        </div>
      ) : null}

      <section className="wrap pub-hero" aria-labelledby="welcome-title">
        <HeroStage src="/art/studio-hero.webp" alt={HERO_ALT} floaties={FLOATIES}>
          <div className="pub-hero-spacer" aria-hidden="true" />
          <div className="pub-hero-panel glass panel spot-pink rise" style={{ '--d': '.15s' }}>
            <p className="kicker fam-pink">{signedIn && firstName ? `Welcome back, ${firstName}` : 'A makers\u2019 studio for every craft'}</p>
            <h1 id="welcome-title" tabIndex={-1} className="display pub-title">The Button Box</h1>
            <p className="pub-hero-line">Every craft, one studio.</p>
            <p className="pub-hero-lede">
              Your patterns, stash, plans and makes in one place. Sewing, knitting, crochet, quilting, paper crafts
              and more: {CRAFTS.length} crafts in {ROOMS.length} painted rooms.
            </p>
            <div className="pub-hero-actions">
              {signedIn ? (
                <>
                  <Link className="btn" href="/studio">
                    <svg aria-hidden="true" style={{ '--btn': '#F2B8CF' }}><use href="#i-button" /></svg>Open your studio
                  </Link>
                  <Link className="btn soft" href="/account">Your account</Link>
                </>
              ) : (
                <>
                  <Link className="btn" href="/sign-up">
                    <svg aria-hidden="true" style={{ '--btn': '#F2B8CF' }}><use href="#i-button" /></svg>Start free
                  </Link>
                  <Link className="btn soft" href="/sign-in">Sign in</Link>
                </>
              )}
            </div>
            <ul className="pub-facts" aria-label="At a glance">
              <li className="chip"><svg aria-hidden="true"><use href="#i-rooms" /></svg>{CRAFTS.length} crafts, {ROOMS.length} rooms</li>
              <li className="chip"><svg aria-hidden="true"><use href="#i-shield" /></svg>Two-step sign-in</li>
              <li className="chip"><svg aria-hidden="true"><use href="#i-link" /></svg>Your files stay put</li>
            </ul>
          </div>
        </HeroStage>
      </section>

      <Seam />

      <section id="rooms" className="wrap pub-sec" aria-labelledby="rooms-title">
        <header className="pub-sec-head pub-scroll">
          <p className="kicker">The rooms</p>
          <h2 id="rooms-title" className="display h1">Four painted rooms, one for every family of crafts</h2>
          <p className="lede">
            Each room has its own colour, its own stash and the tools only it needs. Your library, journal, planner and
            toolbox are shared by them all.
          </p>
        </header>
        <div className="g4 pub-rooms">
          {ROOMS.map((r, i) => (
            <div key={r.key} className={`backlit fam-${r.family} pub-scroll`} style={{ '--i': i }}>
              <article className="room-card glass lift sheen">
                <div className="pic"><img src={r.art} alt={r.alt} width="1280" height="853" loading="lazy" /></div>
                <div className="body">
                  <span className="tag">{r.tone}</span>
                  <h3 className="pub-room-name">{r.name}</h3>
                  <p className="small">{r.blurb}</p>
                  <div className="mini-crafts">
                    {craftsInRoom(r.key).map((c) => (
                      <span key={c.slug}><svg aria-hidden="true"><use href={`#${c.icon}`} /></svg>{c.name}</span>
                    ))}
                  </div>
                  {signedIn ? <Link className="btn fam small pub-room-go" href={`/studio/rooms/${r.key}`}>Open {r.name}</Link> : null}
                </div>
              </article>
            </div>
          ))}
        </div>
        <div className="pub-shared glass pad pub-scroll">
          <span className="label">Shared by every room</span>
          <ul className="pub-chips">
            {SHARED.map((s) => <li key={s} className="chip">{s}</li>)}
          </ul>
        </div>
      </section>

      <Seam />

      <section id="features" className="wrap pub-sec" aria-labelledby="features-title">
        <header className="pub-sec-head pub-scroll">
          <p className="kicker fam-pink">What it does</p>
          <h2 id="features-title" className="display h1">Everything you make, kept in one tin</h2>
          <p className="lede">From the pattern on the shelf to the last stitch in your makes journal. Here is what is inside.</p>
        </header>

        <div className="pub-bento">
          <article className="pub-feature pub-f-library glass panel spot-pink fam-pink pub-scroll">
            <div className="pub-f-copy">
              <span className="jewel" aria-hidden="true"><svg><use href="#i-library" /></svg></span>
              <p className="kicker">Pattern library</p>
              <h3 className="display h2">Every pattern on one shelf, worked out for you</h3>
              <p>
                Each pattern becomes an envelope you can turn over. The front shows the cover and the designer. The back
                shows what it needs in your size: which size to cut, where to grade between sizes, how much to buy and the ease.
              </p>
              <ul className="pub-ticks">
                <li>Find patterns by craft, room, owned or wishlist, and made or not yet</li>
                <li>Pin favourites so they stay at the top of the shelf</li>
                <li>Print-at-home, copyshop and projector files kept together</li>
                <li>Your measurements stay private to you</li>
              </ul>
              <div className="note-paper pub-hint">
                <p className="hand">Turn the envelope over to see what the back of every pattern shows.</p>
              </div>
            </div>
            <EnvelopeDemo />
          </article>

          <div className="backlit fam-grn pub-f-make pub-scroll">
            <article className="pub-feature glass panel spot-grn fam-grn lift">
              <span className="jewel" aria-hidden="true"><svg><use href="#i-spark" /></svg></span>
              <p className="kicker">What can I make?</p>
              <h3 className="display h2">Shop your stash first</h3>
              <p>
                Choose any fabric, yarn or supply in your stash and see which patterns it could become: ready to start,
                or nearly there, with what is short and ideas to stretch it.
              </p>
              <ul className="pub-swatches" aria-label="Example stash">
                {SWATCHES.map((s) => (
                  <li key={s.name} className="swatch-card glass">
                    <div className="swatch" style={{ '--sw': s.colour }}><span className="weave" /></div>
                    <div className="meta"><b>{s.name}</b><span className="small">{s.kind}</span></div>
                  </li>
                ))}
              </ul>
              <div className="pub-chips-row">
                <span className="tag"><svg aria-hidden="true"><use href="#i-check" /></svg>Ready to start</span>
                <span className="tag">Nearly there</span>
              </div>
            </article>
          </div>

          <article className="pub-feature pub-f-plan glass panel spot-blu fam-pur sheen pub-scroll">
            <span className="jewel" aria-hidden="true"><svg><use href="#i-planner" /></svg></span>
            <p className="kicker">Planner and shopping list</p>
            <h3 className="display h2">From daydream to worn and loved</h3>
            <p>
              Projects move along a tape measure, stage by stage. Each one keeps a shopping list of what it needs, less
              what your stash already holds. Have a go:
            </p>
            <PlannerDemo />
          </article>

          <article className="pub-feature pub-f-journal glass panel spot-pink fam-pink lift pub-scroll">
            <div className="pub-journal-art">
              <div className="hoop" style={{ '--hs': '172px' }}>
                <img src="/art/hoop-cardigan.webp" alt="A lilac cardigan framed in an embroidery hoop" width="360" height="360" loading="lazy" />
              </div>
              <div className="note-paper pub-journal-note">
                <p className="hand">Next time: contrast binding in lilac.</p>
                <Stars value={5} label="Example rating" />
              </div>
            </div>
            <p className="kicker">Makes journal</p>
            <h3 className="display h2">Every finished make, framed in a hoop</h3>
            <p>
              Keep a photo, the size you made, what you changed, how it turned out and what to try next time. Rate it,
              and note whether you would make it again.
            </p>
          </article>

          <article className="pub-feature pub-f-snap glass panel fam-blu lift pub-scroll">
            <span className="jewel" aria-hidden="true"><svg><use href="#i-camera" /></svg></span>
            <p className="kicker">Snap a label</p>
            <h3 className="pub-f-title">Snap it, check it, save it</h3>
            <p>Take a photo of a label and the details are filled in for you to check before anything is saved.</p>
            <ul className="pub-chips">
              {SNAP_TYPES.map((t) => <li key={t.key} className="chip">{t.label}</li>)}
            </ul>
            <p className="small">Reading labels uses an AI service, and only when it is switched on for this site.</p>
          </article>

          <article className="pub-feature pub-f-import glass panel fam-pur lift pub-scroll">
            <span className="jewel" aria-hidden="true"><svg><use href="#i-upload" /></svg></span>
            <p className="kicker">Imports</p>
            <h3 className="pub-f-title">Bring patterns in from wherever they live</h3>
            <p>Add patterns from your computer or your cloud drives, or bring your Ravelry library across. The studio keeps a link and the details.</p>
            <ul className="pub-sources">
              {SOURCES.map((s) => (
                <li key={s.name}><svg aria-hidden="true"><use href={`#${s.icon}`} /></svg>{s.name}</li>
              ))}
            </ul>
          </article>

          <article className="pub-feature pub-f-tools glass panel fam-grn lift pub-scroll">
            <span className="jewel" aria-hidden="true"><svg><use href="#i-toolbox" /></svg></span>
            <p className="kicker">Toolbox</p>
            <h3 className="pub-f-title">{TOOLBOX.length} tools for the fiddly sums</h3>
            <p>Converters, calculators and charts for every room, from circle skirts to fragrance loads.</p>
            <ul className="pub-chips">
              {TOOLBOX.slice(0, 8).map((t) => <li key={t.key} className="chip">{t.name}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <Seam />

      <section id="security" className="wrap pub-sec" aria-labelledby="security-title">
        <div className="backlit fam-grn pub-scroll">
        <div className="pub-secure glass panel spot-grn fam-grn">
          <div className="pub-secure-head">
            <span className="jewel pub-shield" aria-hidden="true"><svg><use href="#i-shield" /></svg></span>
            <div>
              <p className="kicker">Privacy and security</p>
              <h2 id="security-title" className="display h1">Your studio is yours alone</h2>
              <p className="lede">
                Patterns, notes and photos are personal. The Button Box is built so that only you can open your studio,
                and so you can take everything with you whenever you like.
              </p>
            </div>
          </div>
          <ul className="pub-secure-grid">
            {securityItems(mfaRequired).map((item, i) => (
              <li key={item.title} className={`pub-secure-item glass lift fam-${item.family} pub-scroll`} style={{ '--i': i }}>
                <span className="jewel" aria-hidden="true"><svg><use href={`#${item.icon}`} /></svg></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
          <p className="pub-secure-foot">
            <Link href="/privacy">Read the privacy notice</Link> for what is kept, who helps run the site and your choices.
          </p>
        </div>
        </div>
      </section>

      <Seam />

      <section className="wrap pub-sec" aria-labelledby="pricing-title">
        <div className="backlit fam-pur pub-scroll">
          <div className="pub-teaser glass panel spot-blu">
            <div className="pub-teaser-art" aria-hidden="true">
              <svg className="pub-teaser-tin"><use href="#i-tin" /></svg>
              <svg className="pub-teaser-b1" viewBox="0 0 32 32" style={{ '--btn': '#F2B8CF' }}><use href="#i-button" /></svg>
              <svg className="pub-teaser-b2" viewBox="0 0 32 32" style={{ '--btn': '#B5DCC5' }}><use href="#i-button" /></svg>
              <svg className="pub-teaser-b3" viewBox="0 0 32 32" style={{ '--btn': '#BDCDF3' }}><use href="#i-button" /></svg>
            </div>
            <div className="stack pub-teaser-copy">
              <p className="kicker">Pricing</p>
              <h2 id="pricing-title" className="display h2">
                {billingOn ? 'Monthly or yearly, whichever suits you' : 'Open to everyone while it is in preview'}
              </h2>
              <p>
                {billingOn
                  ? `${trialDays > 0 ? `Every new studio starts with a free trial of ${trialDays} ${trialDays === 1 ? 'day' : 'days'}, no card needed. ` : ''}Then choose a monthly or yearly plan, and cancel any time.`
                  : 'Billing is not switched on yet, so everything is open while The Button Box is in preview.'}
              </p>
              <div className="row">
                <Link className="btn" href="/pricing">See pricing</Link>
                {signedIn ? <Link className="btn soft" href="/studio">Open your studio</Link> : <Link className="btn soft" href="/sign-up">Start free</Link>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
