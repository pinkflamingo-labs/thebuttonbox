/** @type {import('next').NextConfig} */

// Content Security Policy: only the services The Button Box actually talks to.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://apis.google.com https://accounts.google.com https://www.dropbox.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    'https://*.supabase.co wss://*.supabase.co',
    'https://www.googleapis.com https://accounts.google.com https://content.googleapis.com',
    'https://login.microsoftonline.com https://login.live.com https://graph.microsoft.com',
    'https://*.sharepoint.com https://*.1drv.com https://*.livefilestore.com https://onedrive.live.com https://*.microsoftpersonalcontent.com',
    'https://api.dropboxapi.com https://content.dropboxapi.com https://*.dropboxusercontent.com',
  ].join(' '),
  'frame-src https://docs.google.com https://drive.google.com https://accounts.google.com https://www.dropbox.com https://login.microsoftonline.com https://login.live.com',
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com https://www.ravelry.com",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The Microsoft sign-in window returns to the import page, which hands the answer back to the studio
      // (MSAL Browser 5 redirect bridge). It must not carry an opener policy and must never be cached.
      {
        source: '/studio/import',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
