// The toolbox: every room's calculators in one place, grouped by room, each with an id so links land on it.
import Link from 'next/link'
import '@/styles/rooms-tools.css'
import PageHead from '@/components/PageHead'
import Seam from '@/components/Seam'
import { ROOMS, TOOLS } from '@/lib/crafts'
import { plural } from '@/lib/format'
import ToolCard from '@/components/toolbox/ToolCard'
import { ROOM_SPOT, toolIcon, whereHref, whereText } from '@/components/toolbox/meta'
import Convert from '@/components/toolbox/Convert'
import WidthSwap from '@/components/toolbox/WidthSwap'
import CircleSkirt from '@/components/toolbox/CircleSkirt'
import BiasBinding from '@/components/toolbox/BiasBinding'
import StretchTest from '@/components/toolbox/StretchTest'
import QuiltBacking from '@/components/toolbox/QuiltBacking'
import Counters from '@/components/toolbox/Counters'
import Gauge from '@/components/toolbox/Gauge'
import YarnSwap from '@/components/toolbox/YarnSwap'
import HookSizes from '@/components/toolbox/HookSizes'
import CrochetTerms from '@/components/toolbox/CrochetTerms'
import CordLength from '@/components/toolbox/CordLength'
import PaperSizes from '@/components/toolbox/PaperSizes'
import BeadCount from '@/components/toolbox/BeadCount'
import FragranceLoad from '@/components/toolbox/FragranceLoad'

export const metadata = { title: 'Toolbox' }

const CALCULATORS = {
  convert: Convert,
  width: WidthSwap,
  circle: CircleSkirt,
  bias: BiasBinding,
  stretch: StretchTest,
  quilt: QuiltBacking,
  counter: Counters,
  gauge: Gauge,
  swap: YarnSwap,
  hooks: HookSizes,
  terms: CrochetTerms,
  cord: CordLength,
  paper: PaperSizes,
  beads: BeadCount,
  fragrance: FragranceLoad,
}

const WIDE = new Set(['counter', 'hooks', 'terms', 'paper'])

const HEADLINES = {
  fabric: 'For cutting and sewing',
  yarn: 'For needles, hooks and cords',
  paper: 'For paper and card',
  studio: 'For beads and candles',
}

function sortTools(room) {
  const tools = TOOLS[room.key] || []
  return {
    here: tools.filter((t) => t.ready && !t.where && CALCULATORS[t.key]),
    later: tools.filter((t) => !t.ready),
    elsewhere: tools.filter((t) => t.ready && t.where),
  }
}

export default function ToolboxPage() {
  const rooms = ROOMS.map((room) => ({ room, ...sortTools(room) }))
  let n = 0
  const nextDelay = () => `${Math.min(0.05 + 0.05 * n++, 0.4).toFixed(2)}s`

  return (
    <>
      <PageHead
        kicker="Toolbox"
        title="The toolbox"
        lede="Quick sums for fabric, yarn, paper and the workbench. Nothing you type here is saved, apart from your counters, which stay on this device."
        family="grn"
      >
        <div className="painting rt-head-art">
          <img
            src="/art/studio-hero.webp"
            alt="Painted sunny workroom with a long table holding a tin of buttons, spools of thread and a tape measure, with a dress form and a sewing machine behind"
            width="1536"
            height="1024"
          />
        </div>
      </PageHead>

      <nav className="rt-jump glass pad rise" style={{ '--d': '.06s' }} aria-label="Jump to a room">
        <span className="label">Jump to a room</span>
        <ul className="rt-jump-list">
          {rooms.map(({ room, here }) => (
            <li key={room.key}>
              <a className={`rt-jump-link fam-${room.family}`} href={`#room-${room.key}`}>
                <span className="dot" aria-hidden="true" />
                {room.name}
                <span className="rt-jump-n">{plural(here.length, 'tool')}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {rooms.map(({ room, here, later, elsewhere }, i) => (
        <div key={room.key}>
          {i > 0 ? <Seam /> : null}
          <section id={`room-${room.key}`} className={`section rt-tool-room fam-${room.family}`} aria-labelledby={`room-${room.key}-title`}>
            <header className="rt-room-head rise" style={{ '--d': nextDelay() }}>
              <div className="painting rt-thumb">
                <img src={room.art} alt={room.alt} width="1280" height="853" loading="lazy" />
              </div>
              <div>
                <p className="kicker">{room.name}</p>
                <h2 id={`room-${room.key}-title`} className="display h2">{HEADLINES[room.key] || room.name}</h2>
                <p className="lede">
                  {plural(here.length, 'tool')} here
                  {elsewhere.length ? `, and ${elsewhere.length} that ${elsewhere.length === 1 ? 'lives' : 'live'} elsewhere in your studio` : ''}.
                </p>
              </div>
            </header>

            <div className="rt-tools">
              {here.map((tool) => {
                const Calc = CALCULATORS[tool.key]
                return (
                  <ToolCard
                    key={tool.key}
                    tool={tool}
                    roomName={room.name}
                    family={room.family}
                    spot={ROOM_SPOT[room.key]}
                    wide={WIDE.has(tool.key)}
                    full={here.length + later.length === 1}
                    delay={nextDelay()}
                  >
                    <Calc />
                  </ToolCard>
                )
              })}
              {later.map((tool) => (
                <ToolCard key={tool.key} tool={tool} roomName={room.name} family={room.family} spot={ROOM_SPOT[room.key]} delay={nextDelay()}>
                  <div className="rt-later">
                    <span className="tag">Coming later</span>
                    {tool.note ? <p className="muted">{tool.note}.</p> : null}
                  </div>
                </ToolCard>
              ))}
            </div>

            {elsewhere.length ? (
              <div className="rt-elsewhere">
                <p className="label">Also for this room, elsewhere in your studio</p>
                <ul className="rt-elsewhere-list">
                  {elsewhere.map((tool) => (
                    <li key={tool.key}>
                      <Link id={tool.key} href={whereHref(tool.where)} className={`glass lift sheen rib rt-mini-tool fam-${room.family}`}>
                        <span className="jewel" style={{ '--js': '42px' }}>
                          <svg aria-hidden="true"><use href={`#${toolIcon(tool.key)}`} /></svg>
                        </span>
                        <span className="rt-mini-text">
                          <b>{tool.name}</b>
                          <span className="small">Lives in {whereText(tool.where)}</span>
                        </span>
                        <svg className="rt-go" aria-hidden="true"><use href="#i-chev" /></svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      ))}
    </>
  )
}
