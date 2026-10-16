// Copies the PDF reader (pdf.js) into public/pdfjs so the browser can load it from this site.
// Runs automatically after `npm install` (locally and on Vercel).
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'pdfjs-dist', 'build')
const dest = join(root, 'public', 'pdfjs')
const files = ['pdf.min.mjs', 'pdf.worker.min.mjs']

if (!existsSync(src)) {
  console.warn('[copy-pdfjs] pdfjs-dist is not installed yet; skipping.')
} else {
  mkdirSync(dest, { recursive: true })
  for (const f of files) cpSync(join(src, f), join(dest, f))
  console.log('[copy-pdfjs] PDF reader copied to public/pdfjs')
}
