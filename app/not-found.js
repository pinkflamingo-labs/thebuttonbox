// When a page cannot be found: a dropped button, a loose thread and a way back.
import Link from 'next/link'
import '@/styles/public.css'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <div className="oops">
      <div className="backlit fam-pink rise">
        <section className="oops-card glass panel spot-pink" aria-labelledby="oops-title">
          <div className="oops-art" aria-hidden="true">
            <svg className="oops-thread" viewBox="0 0 320 60" preserveAspectRatio="none">
              <path d="M4 40 C60 8 110 56 160 30 S260 6 316 34" />
            </svg>
            <svg className="oops-button" viewBox="0 0 32 32" style={{ '--btn': '#F2B8CF' }}><use href="#i-button" /></svg>
            <svg className="oops-needle" viewBox="0 0 64 20"><use href="#i-needle" /></svg>
          </div>
          <p className="kicker fam-pink">Page not found</p>
          <h1 id="oops-title" className="display h1">This page has come unstitched</h1>
          <p className="lede">
            We looked in every drawer and could not find it. The link may be old, or there may be a small typo in the address.
          </p>
          <div className="row oops-actions">
            <Link className="btn" href="/"><svg aria-hidden="true"><use href="#i-home" /></svg>Go to the front page</Link>
            <Link className="btn soft" href="/studio">Open your studio</Link>
          </div>
          <p className="hand">Every maker drops a stitch now and then.</p>
        </section>
      </div>
    </div>
  )
}
