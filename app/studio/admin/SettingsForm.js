'use client'
// Admin settings: billing on or off, two-step sign-in required, and the free trial length for new makers.
// Saved through admin_update_settings, which checks the admin and the second sign-in step in the database.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

export default function SettingsForm({ initial, stripeReady }) {
  const router = useRouter()
  const [billing, setBilling] = useState(Boolean(initial?.billing_enabled))
  const [mfa, setMfa] = useState(initial?.require_mfa !== false)
  const [trial, setTrial] = useState(String(initial?.trial_days ?? 14))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function save(e) {
    e.preventDefault()
    if (busy) return
    setMsg(null)
    const days = Number(trial)
    if (!Number.isInteger(days) || days < 0 || days > 90) {
      return setMsg({ ok: false, text: 'Free trial days must be a whole number from 0 to 90.' })
    }
    setBusy(true)
    try {
      const { error } = await supabaseBrowser().rpc('admin_update_settings', { p_billing: billing, p_mfa: mfa, p_trial: days })
      if (error) {
        if (/second sign-in step/i.test(error.message || '')) {
          throw new Error('Please set up and use your authenticator app before changing settings. You can add one on your account page.')
        }
        if (/not allowed/i.test(error.message || '')) throw new Error('Only admins can change these settings.')
        throw new Error(friendlyError(error, 'The settings did not save. Please try again.'))
      }
      setMsg({ ok: true, text: 'Settings saved. They apply straight away.' })
      router.refresh()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack adm-form" style={{ '--gap': '16px' }} onSubmit={save} noValidate>
      <div className="adm-toggle">
        <label className="check">
          <input type="checkbox" checked={billing} onChange={(e) => setBilling(e.target.checked)} />
          <span>Billing is on</span>
        </label>
        <p className="small">
          When on, makers need a free trial or a plan to add and change things. Reading and exporting always work.
          When off, everything is open to everyone.
        </p>
        {billing && !stripeReady ? (
          <p className="notice warn">Stripe is not fully set up yet, so makers could not pay. Trials would still count down.</p>
        ) : null}
      </div>

      <div className="adm-toggle">
        <label className="check">
          <input type="checkbox" checked={mfa} onChange={(e) => setMfa(e.target.checked)} />
          <span>Two-step sign-in is required</span>
        </label>
        <p className="small">Every maker types a code from an authenticator app after their password. Strongly recommended.</p>
        {!mfa ? <p className="notice warn">Makers could then open their studio with a password alone.</p> : null}
      </div>

      <label className="field adm-trial">
        <span>Free trial for new makers (days, 0 to 90)</span>
        <input type="number" inputMode="numeric" min={0} max={90} step={1} value={trial} onChange={(e) => setTrial(e.target.value)} />
        <span className="hint">Applies to makers who join from now on. Trials already running keep their end date.</span>
      </label>

      {msg ? <p className={`notice${msg.ok ? '' : ' error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p> : null}
      {msg && !msg.ok && /authenticator/.test(msg.text) ? <p><Link href="/account#security-sec">Go to sign-in and security</Link></p> : null}

      <div className="form-actions">
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving the settings' : 'Save the settings'}</button>
      </div>
    </form>
  )
}
