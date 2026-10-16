'use client'
// Opening PDFs in the browser with pdf.js, which scripts/copy-pdfjs.mjs puts in /pdfjs at install time.
// It is loaded by a small inline module script so no bundler touches it. Nothing is uploaded: the text and a
// cover picture are read here, on the maker's own device.

const LIB_URL = '/pdfjs/pdf.min.mjs'
const WORKER_URL = '/pdfjs/pdf.worker.min.mjs'
let ready = null

function failed(message) {
  ready = null
  return new Error(message)
}

export function pdfReady() {
  if (typeof window === 'undefined') return Promise.reject(new Error('PDFs can only be opened in the browser.'))
  if (window.__bbPdf) {
    window.__bbPdf.GlobalWorkerOptions.workerSrc = WORKER_URL
    return Promise.resolve(window.__bbPdf)
  }
  if (ready) return ready
  ready = new Promise((resolve, reject) => {
    let timer = null
    const tidy = () => {
      clearTimeout(timer)
      window.removeEventListener('bb-pdf-ready', done)
      window.removeEventListener('error', onScriptError)
    }
    const stop = (message) => {
      tidy()
      reject(failed(message))
    }
    function done() {
      tidy()
      const lib = window.__bbPdf
      if (!lib) return reject(failed('The PDF reader did not load. Please refresh the page and try again.'))
      lib.GlobalWorkerOptions.workerSrc = WORKER_URL
      resolve(lib)
    }
    // An older browser can fail while running pdf.js itself, which only shows up as a page error
    function onScriptError(event) {
      if (String(event?.filename || '').includes('/pdfjs/')) stop('This browser could not open the PDF reader. Updating the browser should fix it.')
    }
    window.addEventListener('bb-pdf-ready', done)
    window.addEventListener('error', onScriptError)
    const script = document.createElement('script')
    script.type = 'module'
    script.textContent = `import * as lib from '${LIB_URL}'; window.__bbPdf = lib; window.dispatchEvent(new Event('bb-pdf-ready'))`
    script.addEventListener('error', () => stop('The PDF reader could not be loaded. Please refresh the page and try again.'), { once: true })
    timer = setTimeout(() => {
      if (!window.__bbPdf) stop('The PDF reader is taking too long to load. Please refresh the page and try again.')
    }, 20000)
    document.head.appendChild(script)
  })
  return ready
}

// Opens a PDF from its bytes. Call pdf.destroy() when finished with it.
export async function loadPdf(arrayBuffer) {
  const lib = await pdfReady()
  const data = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer)
  const task = lib.getDocument({ data, isEvalSupported: false, disableAutoFetch: true, stopAtErrors: false })
  try {
    return await task.promise
  } catch (err) {
    if (err?.name === 'PasswordException') throw new Error('it is locked with a password')
    if (err?.name === 'InvalidPDFException') throw new Error('it does not look like a PDF')
    throw new Error('it could not be read')
  }
}

// The text of the first pages, line by line, joined the way it reads on the page
export async function readText(pdf, maxPages = 10) {
  const pages = Math.min(pdf?.numPages || 0, maxPages)
  const out = []
  for (let n = 1; n <= pages; n++) {
    const page = await pdf.getPage(n)
    const content = await page.getTextContent()
    const lines = []
    let line = ''
    let lastX = null
    let lastY = null
    let lastW = 0
    for (const item of content.items || []) {
      if (typeof item.str !== 'string') continue
      const x = item.transform?.[4] ?? 0
      const y = item.transform?.[5] ?? 0
      const size = Math.hypot(item.transform?.[2] ?? 0, item.transform?.[3] ?? 0) || item.height || 10
      if (lastY !== null && Math.abs(y - lastY) > size * 0.6) {
        lines.push(line)
        line = ''
        lastX = null
      } else if (lastX !== null && x - (lastX + lastW) > size * 0.18 && !line.endsWith(' ') && !item.str.startsWith(' ')) {
        line += ' '
      }
      line += item.str
      lastX = x
      lastY = y
      lastW = item.width || 0
      if (item.hasEOL) {
        lines.push(line)
        line = ''
        lastX = null
        lastY = null
      }
    }
    if (line) lines.push(line)
    out.push(lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n'))
    page.cleanup?.()
  }
  return out.join('\n\n')
}

// Page 1 drawn as a small webp picture for the cover
export async function renderCover(pdf, width = 900) {
  const page = await pdf.getPage(1)
  const base = page.getViewport({ scale: 1 })
  let scale = Math.min(4, width / base.width)
  if (base.height * scale > 1600) scale = 1600 / base.height
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(viewport.width))
  canvas.height = Math.max(1, Math.round(viewport.height))
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  try {
    await page.render({ canvasContext: ctx, viewport }).promise
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  } finally {
    page.cleanup?.()
    canvas.width = 0
    canvas.height = 0
  }
}

// How many pages a PDF has, then closes it
export async function countPages(arrayBuffer) {
  const pdf = await loadPdf(arrayBuffer)
  try {
    return pdf.numPages || null
  } finally {
    pdf.destroy?.()
  }
}
