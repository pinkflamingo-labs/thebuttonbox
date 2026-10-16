import Link from 'next/link'
import LegalPage, { Fill } from '@/components/landing/LegalPage'
import '@/styles/public.css'

export const metadata = {
  title: 'Privacy',
  description: 'What The Button Box keeps, who helps run it, cookies, and how to download or delete everything.',
}

const SECTIONS = [
  {
    id: 'who', title: 'Who we are', family: 'pur',
    body: (
      <>
        <p>
          The Button Box is a makers&apos; studio on the web, run by <Fill>[Business name]</Fill> (ABN <Fill>[ABN]</Fill>).
          If you have a question about your information, email <Fill>[Contact email]</Fill>.
        </p>
        <p>
          The Button Box is a preview service. It works, and we look after your information carefully, but features may
          change as it grows.
        </p>
      </>
    ),
  },
  {
    id: 'what', title: 'What we keep', family: 'pink',
    body: (
      <ul className="legal-list">
        <li><b>Your account.</b> Your email address, the name you choose and your sign-in details. Passwords are stored by our sign-in provider scrambled one way, so they cannot be read back, and no one at The Button Box can see yours. The secret that links your authenticator app is held by the same provider.</li>
        <li><b>The details you add.</b> Patterns and their details, what each pattern needs, your stash, projects and shopping lists, your makes journal, your measurements, and settings such as metric or imperial.</li>
        <li><b>Pictures.</b> Small cover pictures for patterns, and the photos you add of makes, stash and snapped labels. They are kept in a private folder for your account and shown through links that stop working after a short time.</li>
        <li><b>Links to your pattern files, never the files.</b> When you add a pattern from your computer, OneDrive, Google Drive, Dropbox or Ravelry, we keep its name, a link where there is one, and the details read from it. The files themselves stay where they are.</li>
        <li><b>Ravelry sign-in tokens.</b> If you connect Ravelry, the tokens that let us import on your behalf are encrypted before they are saved and are never sent to your browser. Disconnect any time from your account page.</li>
        <li><b>Billing.</b> If you choose a plan, Stripe handles your payment. We keep your Stripe customer number and your plan&apos;s name, status and dates. We never see or keep your card number.</li>
        <li><b>A few records to keep things fair and safe.</b> When you use the reading features, so fair-use limits work, and a short log of important events such as settings changes and account deletions.</li>
      </ul>
    ),
  },
  {
    id: 'helpers', title: 'Who helps run it', family: 'blu',
    body: (
      <>
        <ul className="legal-list">
          <li><b>Supabase</b> runs our database, sign-in and photo storage. Your information is stored in <Fill>[Supabase region]</Fill>.</li>
          <li><b>Vercel</b> hosts the website and runs the code behind it.</li>
          <li><b>Stripe</b> takes payments and looks after plans. Stripe has its own privacy policy for the payment details you give it.</li>
          <li><b>An AI reading service</b>, <Fill>[AI service name]</Fill>, only when reading is switched on, and only for the pattern pages or label photos you choose to read. The text or picture goes in and the details come back for you to check. The Button Box does not keep the text or picture it sent; the service handles it under its own data terms: <Fill>[how long the AI service keeps requests, if at all]</Fill>.</li>
          <li><b>Google, Microsoft (OneDrive), Dropbox and Ravelry</b>, only if you choose to import from them. You sign in with them directly, and The Button Box receives the names, links and details of the files you pick.</li>
        </ul>
        <p>We do not sell your information, and we do not use it for advertising.</p>
      </>
    ),
  },
  {
    id: 'cookies', title: 'Cookies', family: 'grn',
    body: (
      <>
        <p>We use cookies only to keep you signed in. There are no advertising or tracking cookies.</p>
        <p>
          Calm mode, and whether you have already seen the welcome, are remembered in your browser&apos;s own storage on
          this device. They are not cookies and are never sent to us.
        </p>
      </>
    ),
  },
  {
    id: 'safe', title: 'How we keep it safe', family: 'pur',
    body: (
      <ul className="legal-list">
        <li><b>Two-step sign-in</b> with an authenticator app, as well as your password.</li>
        <li><b>Row-level security.</b> The database itself only ever returns your own things to you, so other makers cannot see them.</li>
        <li><b>Private photos</b>, shown only through links that expire.</li>
        <li><b>Encrypted connections</b> everywhere, and Ravelry tokens encrypted before they are saved.</li>
      </ul>
    ),
  },
  {
    id: 'choices', title: 'Your choices', family: 'pink',
    body: (
      <ul className="legal-list">
        <li><b>Change anything.</b> Everything you add can be changed or removed in your studio.</li>
        <li><b>Take a copy.</b> On your <Link href="/account">account page</Link>, Download everything gives you one file with all of it.</li>
        <li><b>Delete your account.</b> On your account page, Delete my account removes your account, everything you added and your photos, and cancels any plan. A note that an account was deleted stays in our log, without your details. Records of past payments stay with Stripe under its own privacy policy.</li>
        <li><b>When a plan ends, nothing is deleted.</b> Your studio becomes read-only until you choose a plan again or delete it.</li>
        <li><b>Ask us.</b> Email <Fill>[Contact email]</Fill> to ask what we hold about you, or to correct it.</li>
      </ul>
    ),
  },
  {
    id: 'contact', title: 'Questions, complaints and changes', family: 'blu',
    body: (
      <>
        <p>Email <Fill>[Contact email]</Fill> with any question or complaint about your information.</p>
        <p>
          If you are in Australia and not happy with our answer, you can contact the Office of the Australian Information
          Commissioner at <a href="https://www.oaic.gov.au" rel="noopener noreferrer" target="_blank">oaic.gov.au</a> (opens in a new tab).
        </p>
        <p>If this notice changes, we will update the date at the top. For important changes, we will email you before they apply.</p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Privacy notice" title="Your information, in plain words" family="grn" sections={SECTIONS}
      lede="What The Button Box keeps, who helps run it, and how you can take everything with you or delete it."
    />
  )
}
