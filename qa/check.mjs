// Quick code check without installing anything: bundles every page, route and component with esbuild
// (packages left external) to catch syntax errors, missing files and missing exports. Also flags em and en dashes.
// Run from the project folder: node qa/check.mjs
import { createRequire } from 'node:module'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const require = createRequire(import.meta.url)
let esbuild
for (const p of ['esbuild', '/opt/appbuilder/templates/v1/node_modules/esbuild']) {
  try { esbuild = require(p); break } catch {}
}
if (!esbuild) { console.error('esbuild not found'); process.exit(2) }

const root = process.cwd()
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  if (f === 'node_modules' || f.startsWith('.')) return []
  return statSync(p).isDirectory() ? walk(p) : [p]
})
const files = ['app', 'components', 'lib'].flatMap((d) => walk(join(root, d))).filter((f) => /\.(js|jsx|mjs)$/.test(f))
files.push(join(root, 'proxy.js'))

const external = ['next', 'next/*', 'react', 'react/*', 'react-dom', 'react-dom/*', '@supabase/*', 'stripe', 'pdfjs-dist', 'pdfjs-dist/*', '@azure/*', 'node:*', 'server-only']
let failed = 0
try {
  const res = await esbuild.build({
    entryPoints: files, bundle: true, write: false, outdir: join(root, 'qa/out'), platform: 'neutral', format: 'esm',
    jsx: 'automatic', loader: { '.js': 'jsx', '.css': 'empty', '.png': 'empty', '.webp': 'empty' }, external,
    logLevel: 'silent', mainFields: ['module', 'main'], tsconfig: join(root, 'jsconfig.json'),
  })
  for (const w of res.warnings) console.log('warning:', w.text, w.location ? `${relative(root, w.location.file)}:${w.location.line}` : '')
} catch (e) {
  for (const err of e.errors || [e]) {
    failed++
    console.log('ERROR:', err.text || err.message, err.location ? `${relative(root, err.location.file)}:${err.location.line}:${err.location.column}` : '')
  }
}

// Plain-language checks on everything a maker reads
const dashes = []
for (const f of [...files, ...walk(join(root, 'supabase')), ...walk(join(root, 'docs')), ...walk(join(root, 'styles')), join(root, 'README.md'), join(root, 'app/globals.css')]) {
  let text = ''
  try { text = readFileSync(f, 'utf8') } catch { continue }
  text.split('\n').forEach((line, i) => { if (/[\u2013\u2014]/.test(line)) dashes.push(`${relative(root, f)}:${i + 1}`) })
}
if (dashes.length) { failed += dashes.length; console.log('ERROR: em or en dashes found at', dashes.join(', ')) }

// Next.js rules that only show up at build or run time
const SERVER_ONLY = [/lib\/access(\.js)?$/, /lib\/supabase\/server(\.js)?$/, /lib\/supabase\/admin(\.js)?$/, /lib\/billing(\.js)?$/,
  /lib\/ai(\.js)?$/, /lib\/usage(\.js)?$/, /lib\/api-guard(\.js)?$/, /lib\/crypto(\.js)?$/, /lib\/ravelry(\.js)?$/, /^next\/headers$/, /^stripe$/, /^node:/]
const importsOf = (text) => [...text.matchAll(/^\s*import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1])
const isClient = (text) => /^\s*(\/\/[^\n]*\n\s*)*['"]use client['"]/.test(text)
const resolveLocal = (from, spec) => {
  let base = null
  if (spec.startsWith('@/')) base = join(root, spec.slice(2))
  else if (spec.startsWith('.')) base = join(from, '..', spec)
  if (!base) return null
  for (const c of [base, `${base}.js`, join(base, 'index.js')]) { try { if (statSync(c).isFile()) return c } catch {} }
  return null
}
const rules = []
for (const f of files) {
  let text = ''
  try { text = readFileSync(f, 'utf8') } catch { continue }
  const rel = relative(root, f)
  const client = isClient(text)
  if (client) {
    // a client file must not reach server-only code, directly or through local imports
    const seen = new Set(); const stack = [f]
    while (stack.length) {
      const cur = stack.pop(); if (seen.has(cur)) continue; seen.add(cur)
      let t = ''; try { t = readFileSync(cur, 'utf8') } catch { continue }
      for (const spec of importsOf(t)) {
        const target = resolveLocal(cur, spec)
        const name = target ? relative(root, target) : spec
        if (SERVER_ONLY.some((re) => re.test(name.replace(/\\/g, '/')))) rules.push(`${rel}: client code reaches server-only ${name}${cur !== f ? ` (through ${relative(root, cur)})` : ''}`)
        else if (target && !isClient(readFileSync(target, 'utf8'))) stack.push(target)
      }
    }
    if (/export\s+(const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata|const\s+dynamic|const\s+revalidate)\b/.test(text)) rules.push(`${rel}: a client file cannot export metadata or route settings`)
    if (/export\s+default\s+async\s+function/.test(text)) rules.push(`${rel}: a client component cannot be async`)
  }
  if (client && /useSearchParams\s*\(/.test(text)) rules.push(`${rel}: uses useSearchParams; check its page is dynamic or wrapped in <Suspense> (review)`)
}
// Server components: every file reached from a page or layout without crossing a 'use client' boundary
const entries = files.filter((f) => /app\/(.*\/)?(page|layout|not-found|template|loading|default)\.js$/.test(f))
const serverSide = new Set()
const queue = entries.filter((f) => !isClient(readFileSync(f, 'utf8')))
while (queue.length) {
  const cur = queue.pop(); if (serverSide.has(cur)) continue; serverSide.add(cur)
  for (const spec of importsOf(readFileSync(cur, 'utf8'))) {
    const target = resolveLocal(cur, spec)
    if (target && /\.js$/.test(target) && !isClient(readFileSync(target, 'utf8'))) queue.push(target)
  }
}
for (const f of serverSide) {
  const rel = relative(root, f)
  const code = readFileSync(f, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const hook = code.match(/\buse(State|Effect|Ref|Router|Pathname|SearchParams|Memo|Callback|Toast|Transition|Reducer|Context)\s*\(/)
  if (hook) rules.push(`${rel}: server component calls ${hook[0].trim()} (add 'use client' or move it into a client component)`)
  const handler = code.match(/\son[A-Z][a-zA-Z]+=\{/)
  if (handler && /<[a-zA-Z]/.test(code)) rules.push(`${rel}: server component passes an event handler (${handler[0].trim()})`)
  if (/app\/(.*\/)?(page|layout)\.js$/.test(f) && /\b(params|searchParams)\.(?!then\b)[a-zA-Z_]+/.test(code) && !/await\s+(params|searchParams)/.test(code)) rules.push(`${rel}: params or searchParams used without await`)
}
if (rules.length) {
  const hard = rules.filter((r) => !r.includes('(review)'))
  failed += hard.length
  console.log(rules.map((r) => (r.includes('(review)') ? `review: ${r}` : `ERROR: ${r}`)).join('\n'))
}

console.log(failed ? `\n${failed} problem(s) found in ${files.length} files.` : `All ${files.length} files bundle cleanly; no em or en dashes.`)
process.exit(failed ? 1 : 0)
