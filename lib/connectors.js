// Which ways in are switched on for this site, worked out from environment variables.
// Server side only (pages and routes): it reads process.env and passes plain values on to the browser.
import { aiConfigured } from './ai'

export function ravelryConfigured() {
  return Boolean(process.env.RAVELRY_CLIENT_ID && process.env.RAVELRY_CLIENT_SECRET && process.env.TOKEN_ENCRYPTION_KEY)
}

export function importSources() {
  return {
    computer: true,
    onedrive: Boolean(process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID),
    google: Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY),
    dropbox: Boolean(process.env.NEXT_PUBLIC_DROPBOX_APP_KEY),
    ravelry: ravelryConfigured(),
    ai: aiConfigured(),
  }
}

// Public keys only: these are meant to be seen by the browser
export function publicConnectorConfig() {
  return {
    onedriveClientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '',
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
    googleAppId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '',
    dropboxAppKey: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '',
  }
}
