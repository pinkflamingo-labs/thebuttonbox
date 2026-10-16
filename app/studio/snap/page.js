// Snap a label: photograph a ball band, bolt end, notion pack or pattern envelope and check what was read.
import Link from 'next/link'
import PageHead from '@/components/PageHead'
import SnapCapture from '@/components/import/SnapCapture'
import { requireMaker } from '@/lib/access'
import { aiConfigured } from '@/lib/ai'
import '@/styles/import.css'

export const metadata = { title: 'Snap a label' }

export default async function SnapPage() {
  const { access } = await requireMaker()
  return (
    <>
      <PageHead
        kicker="Snap a label"
        title="Snap a label"
        lede="Photograph a ball band, a bolt end, a notion packet or a pattern envelope. The details are read for you to check before anything is saved."
        family="pink"
      >
        <Link className="btn soft" href="/studio/stash"><svg aria-hidden="true"><use href="#i-stash" /></svg>Open your stash</Link>
        <Link className="btn ghost" href="/studio/import"><svg aria-hidden="true"><use href="#i-upload" /></svg>Import patterns</Link>
      </PageHead>
      <SnapCapture aiOn={aiConfigured()} canAdd={access.ok} />
    </>
  )
}
