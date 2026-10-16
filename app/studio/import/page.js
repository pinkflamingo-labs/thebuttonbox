// Import and connections: bring patterns in from the maker's computer, OneDrive, Google Drive, Dropbox and
// Ravelry, snap a label, or add one by hand. Pattern files are never copied: only links, details and a cover.
import Link from 'next/link'
import PageHead from '@/components/PageHead'
import Seam from '@/components/Seam'
import ImportStudio from '@/components/import/ImportStudio'
import { requireMaker } from '@/lib/access'
import { importSources, publicConnectorConfig } from '@/lib/connectors'
import { READ_ONLY_MESSAGE } from '@/lib/errors'
import '@/styles/import.css'

export const metadata = { title: 'Import and connections' }

const RAVELRY_ERRORS = {
  denied: 'Ravelry was not connected, because the request was turned down on Ravelry. You can try again any time.',
  state: 'That Ravelry sign-in took too long or came from another window, so it was not used. Please try again.',
  signin: 'Please sign in to The Button Box again, then connect Ravelry.',
  'second-step': 'Please finish your second sign-in step, then connect Ravelry.',
  access: READ_ONLY_MESSAGE,
  off: 'Ravelry is not connected on this site yet.',
  token: 'Ravelry did not finish the sign-in. Please try again in a minute.',
  save: 'Your Ravelry connection could not be saved. Please try again in a minute.',
}

export default async function ImportPage({ searchParams }) {
  const sp = (await searchParams) || {}
  const { supabase, access } = await requireMaker()
  const sources = importSources()

  let ravelry = null
  if (sources.ravelry) {
    const { data } = await supabase.rpc('my_connections')
    const row = Array.isArray(data) ? data.find((c) => c.provider === 'ravelry') : null
    if (row) ravelry = { account: row.account_name || '', lastImport: row.last_import_at || null, since: row.created_at || null }
  }

  const flag = sp.ravelry === 'connected' ? 'connected' : sp.ravelry === 'error' ? 'error' : null
  const reason = typeof sp.reason === 'string' ? sp.reason : ''

  return (
    <>
      <PageHead
        kicker="Import and connections"
        title="Bring your patterns in"
        lede="From your computer, your cloud drives or Ravelry, or snap a label. Everything found is shown for you to check before it is saved."
        family="pur"
      >
        <Link className="btn soft" href="/studio/library"><svg aria-hidden="true"><use href="#i-library" /></svg>Open your library</Link>
        <Link className="btn ghost" href="/studio/snap"><svg aria-hidden="true"><use href="#i-camera" /></svg>Snap a label</Link>
      </PageHead>

      <div className="stack" style={{ '--gap': '14px' }}>
        {flag === 'connected' ? (
          <p className="notice rise" role="status">Ravelry is connected{ravelry?.account ? ` as ${ravelry.account}` : ''}. Choose Import from Ravelry to bring your notebook across.</p>
        ) : null}
        {flag === 'error' ? (
          <p className="notice error rise" role="alert">{RAVELRY_ERRORS[reason] || 'Ravelry did not connect. Please try again in a minute.'}</p>
        ) : null}
        {!access.ok ? (
          <p className="notice warn rise">{READ_ONLY_MESSAGE} <Link href="/pricing">See the plans</Link></p>
        ) : null}

        <section className="glass panel pad-lg imp-promise fam-blu spot-blu rise" style={{ '--d': '.06s' }} aria-label="What is kept">
          <span className="jewel" aria-hidden="true"><svg><use href="#i-link" /></svg></span>
          <div>
            <p>Your pattern files stay where they are. The Button Box keeps a link, the details and a small cover picture.</p>
            <p className="small">
              PDFs are opened in your own browser to read their first pages{sources.ai ? ', and only that text is sent on to be read' : ''}. Nothing else is kept.
            </p>
          </div>
        </section>
      </div>

      <Seam />

      <ImportStudio sources={sources} config={publicConnectorConfig()} ravelry={ravelry} canAdd={access.ok} />
    </>
  )
}
