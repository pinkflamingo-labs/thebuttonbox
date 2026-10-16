import Link from 'next/link'
import LegalPage, { Fill } from '@/components/landing/LegalPage'
import { LIMITS } from '@/lib/usage'
import '@/styles/public.css'

export const metadata = {
  title: 'Terms of use',
  description: 'The terms for using The Button Box: your account, your things, plans and payments, and fair use.',
}

const SECTIONS = [
  {
    id: 'about', title: 'About these terms', family: 'pur',
    body: (
      <p>
        These terms are an agreement between you and <Fill>[Business name]</Fill> (ABN <Fill>[ABN]</Fill>), who runs
        The Button Box. By creating an account you agree to them. Please read them with
        the <Link href="/privacy">privacy notice</Link>.
      </p>
    ),
  },
  {
    id: 'preview', title: 'A preview service', family: 'pink',
    body: (
      <p>
        The Button Box is in preview. It works and we look after it carefully, but features may change and there may be
        short breaks while it is improved. Keep a copy of anything important: you can download everything from your
        account page at any time.
      </p>
    ),
  },
  {
    id: 'account', title: 'Your account', family: 'blu',
    body: (
      <ul className="legal-list">
        <li>One person per account. Keep your password and authenticator app to yourself.</li>
        <li>You are responsible for what happens in your account, so tell us at <Fill>[Contact email]</Fill> straight away if you think someone else has got in.</li>
        <li>You need to be old enough to agree to these terms where you live.</li>
      </ul>
    ),
  },
  {
    id: 'yours', title: 'Your things stay yours', family: 'grn',
    body: (
      <p>
        You own everything you add: pattern details, notes, measurements and photos. You give us permission to store it
        and show it to you, only so the studio can work. We do not sell it or use it for advertising.
      </p>
    ),
  },
  {
    id: 'copyright', title: 'Patterns and copyright', family: 'pink',
    body: (
      <p>
        Designers own their patterns. The Button Box keeps links to your files and the details you need, for your own
        making. Only add patterns and photos you have the right to use, and do not use the studio to share someone
        else&apos;s work.
      </p>
    ),
  },
  {
    id: 'plans', title: 'Plans and payments', family: 'pur',
    body: (
      <ul className="legal-list">
        <li>Prices are shown on the <Link href="/pricing">pricing page</Link> and come straight from our payment provider, Stripe. <Fill>[Say whether prices include GST]</Fill></li>
        <li>When there is a free trial, its length is shown when you sign up, and no card is needed for it.</li>
        <li>Plans renew automatically, monthly or yearly, until you cancel. Cancel any time with Manage billing on your account page. Your plan then runs to the end of the time you have paid for.</li>
        <li>If there is a one-off joining fee, it is shown on the pricing page before you pay.</li>
        <li>Refunds: <Fill>[Refund policy]</Fill>. Nothing in these terms limits your rights under the Australian Consumer Law.</li>
      </ul>
    ),
  },
  {
    id: 'ends', title: 'When a plan ends', family: 'blu',
    body: (
      <p>
        Your studio becomes read-only. You can still open it, look things up and download everything. Nothing is deleted.
        Choose a plan again to carry on adding.
      </p>
    ),
  },
  {
    id: 'fair', title: 'Fair use', family: 'grn',
    body: (
      <>
        <p>
          The reading features have hourly limits so they stay quick for everyone: up to {LIMITS.ai.perHour} readings
          with AI, {LIMITS.snap.perHour} label snaps and {LIMITS.ravelry.perHour} Ravelry imports in any hour.
        </p>
        <p>Please do not try to get around the limits, overload the site, or reach anyone else&apos;s information.</p>
      </>
    ),
  },
  {
    id: 'guides', title: 'Sizes and sums are guides', family: 'pink',
    body: (
      <p>
        Worked-out sizes, amounts and the toolbox calculators are guides, based on the details you and your patterns
        provide. Check them against the pattern before you cut or buy.
      </p>
    ),
  },
  {
    id: 'wrong', title: 'If something goes wrong', family: 'pur',
    body: (
      <p>
        We take care to keep The Button Box running and your things safe. As a preview service it is provided as it is,
        and as far as the law allows, <Fill>[Business name]</Fill> is not responsible for indirect losses. Nothing in
        these terms limits your rights under the Australian Consumer Law.
      </p>
    ),
  },
  {
    id: 'ending', title: 'Ending your account', family: 'blu',
    body: (
      <p>
        You can delete your account at any time from your account page. We may pause or close an account that breaks
        these terms. Where we can, we will tell you first and give you time to download your things.
      </p>
    ),
  },
  {
    id: 'changes', title: 'Changes and contact', family: 'grn',
    body: (
      <>
        <p>If these terms change, we will update the date at the top, and email you before important changes apply.</p>
        <p>These terms are governed by the laws of <Fill>[State or territory]</Fill>, Australia. Questions: <Fill>[Contact email]</Fill>.</p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Terms of use" title="The fine print, in plain words" family="pur" sections={SECTIONS}
      lede="What you can expect from The Button Box, and what we ask of you in return."
    />
  )
}
