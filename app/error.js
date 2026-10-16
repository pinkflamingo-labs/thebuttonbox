'use client'
// When something breaks while a page loads: say so plainly, offer to try again, and keep the way home open.
import Link from 'next/link'
import { useEffect } from 'react'
import '@/styles/public.css'

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="oops">
      <div className="backlit fam-blu rise">
        <section className="oops-card glass panel spot-blu" aria-labelledby="oops-title">
          <div className="oops-art" aria-hidden="true">
            <svg className="oops-thread" viewBox="0 0 320 60" preserveAspectRatio="none">
              <path d="M4 34 C70 60 120 4 170 30 S270 52 316 22" />
            </svg>
            <svg className="oops-button" viewBox="0 0 32 32" style={{ '--btn': '#BDCDF3' }}><use href="#i-button" /></svg>
            <svg className="oops-needle" viewBox="0 0 64 20"><use href="#i-needle" /></svg>
          </div>
          <p className="kicker fam-blu">Something went wrong</p>
          <h1 id="oops-title" className="display h1">We dropped a stitch</h1>
          <p className="lede" role="alert">
            Something went wrong on our side while this page was loading. Your things are safe. Try again, and if it keeps
            happening, come back in a few minutes.
          </p>
          <div className="row oops-actions">
            <button type="button" className="btn" onClick={() => reset()}>
              <svg aria-hidden="true"><use href="#i-flip" /></svg>Try again
            </button>
            <Link className="btn soft" href="/">Go to the front page</Link>
          </div>
          {error?.digest ? <p className="small">If you contact us about this, mention reference {error.digest}.</p> : null}
        </section>
      </div>
    </div>
  )
}
