// Next.js 16 proxy (formerly middleware): keeps sessions fresh and the studio behind sign-in and MFA.
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request) {
  return updateSession(request)
}

export default proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|art/|pdfjs/|api/billing/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs|ico)$).*)',
  ],
}
