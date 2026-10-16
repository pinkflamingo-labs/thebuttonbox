// Add a pattern by hand: for paper patterns, magazines and anything without a PDF to read.
import Link from 'next/link'
import { requireMaker } from '@/lib/access'
import PageHead from '@/components/PageHead'
import PatternForm from '@/components/library/PatternForm'
import { CRAFT } from '@/lib/crafts'
import '@/styles/library.css'

export const metadata = { title: 'Add a pattern' }

export default async function NewPatternPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const { profile } = await requireMaker()
  const craft = typeof sp.craft === 'string' && CRAFT[sp.craft] ? sp.craft : ''
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/studio/library"><svg aria-hidden="true"><use href="#i-back" /></svg>Library</Link>
      </nav>
      <PageHead kicker="Add a pattern" family="pink" title="Add a pattern by hand"
        lede="For paper patterns, magazines and books. Fill in as much or as little as you like: the size chart and what it needs are what make the envelope work out your size." />
      <div className="glass panel pad-lg spot-pink rise" style={{ '--d': '.06s' }}>
        <PatternForm units={profile?.units || 'metric'} initial={craft ? { craft } : undefined} />
      </div>
    </>
  )
}
