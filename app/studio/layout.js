// The studio: signed in, second step done (the proxy checks), and a gentle note about the trial or billing.
import Link from 'next/link'
import { requireMaker } from '@/lib/access'

export const dynamic = 'force-dynamic'

function AccessRibbon({ access }) {
  if (!access?.billingOn) return null
  if (access.reason === 'trial') {
    return (
      <div className="ribbon-bar">
        <span>Your free trial has {access.trialDaysLeft} {access.trialDaysLeft === 1 ? 'day' : 'days'} left.</span>
        <Link className="btn tiny" href="/pricing">Choose a plan</Link>
      </div>
    )
  }
  if (access.reason === 'past_due') {
    return (
      <div className="ribbon-bar">
        <span>Your last payment did not go through. Your studio stays open while you update your card.</span>
        <Link className="btn tiny" href="/account">Update payment</Link>
      </div>
    )
  }
  if (access.reason === 'lapsed') {
    return (
      <div className="ribbon-bar">
        <span>Your studio is read-only: everything is still here to view and export.</span>
        <Link className="btn tiny" href="/pricing">Reopen your studio</Link>
      </div>
    )
  }
  return null
}

export default async function StudioLayout({ children }) {
  const { access } = await requireMaker()
  return (
    <>
      <AccessRibbon access={access} />
      <div className="wrap" style={{ paddingBottom: 60 }}>{children}</div>
    </>
  )
}
