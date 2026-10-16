import { Fraunces, DM_Sans, Caveat } from 'next/font/google'
import './globals.css'
import { IconSprite } from '@/components/Icons'
import Ambient from '@/components/Ambient'
import TopBar from '@/components/TopBar'
import { CALM_BOOT } from '@/components/CalmSwitch'
import { supabaseConfigured } from '@/lib/supabase/env'
import { supabaseServer } from '@/lib/supabase/server'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', axes: ['opsz', 'SOFT'] })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dmsans', display: 'swap' })
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' })

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'The Button Box', template: '%s · The Button Box' },
  description: 'A makers\u2019 studio for every craft: your patterns, makes, stash and plans in one place.',
  openGraph: { title: 'The Button Box', description: 'A makers\u2019 studio for every craft.', images: ['/art/studio-hero.webp'] },
}

export const viewport = { themeColor: '#FFF9F6', colorScheme: 'light' }

async function whoIsHere() {
  if (!supabaseConfigured()) return { signedIn: false }
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { signedIn: false }
    const { data: profile } = await supabase.from('profiles').select('display_name, is_admin').eq('id', user.id).maybeSingle()
    return { signedIn: true, name: profile?.display_name || user.email, isAdmin: Boolean(profile?.is_admin) }
  } catch {
    return { signedIn: false }
  }
}

export default async function RootLayout({ children }) {
  const who = await whoIsHere()
  return (
    <html lang="en-AU" className={`${fraunces.variable} ${dmSans.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CALM_BOOT }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to the page</a>
        <IconSprite />
        <Ambient />
        <TopBar signedIn={who.signedIn} name={who.name} isAdmin={who.isAdmin} />
        <main id="main">{children}</main>
      </body>
    </html>
  )
}
