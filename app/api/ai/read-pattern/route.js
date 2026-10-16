// Reads the text of a pattern PDF (sent from the maker's browser, never the file itself) and returns the
// details in a fixed shape for the maker to check. Everything the model returns is checked and tidied here.
import { requireApiMaker, sameOrigin } from '@/lib/api-guard'
import { aiConfigured, aiJSON } from '@/lib/ai'
import { allowUse } from '@/lib/usage'
import { AI_PATTERN_RULES, AI_PATTERN_SHAPE, cleanPatternReading } from '@/lib/pattern-reader'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_TEXT = 60000

const SYSTEM = `You help makers file craft patterns in their own studio library: sewing, quilting, knitting, crochet, embroidery, paper crafts, jewellery and more. You are given text taken from the first pages of a pattern PDF, the folder it was in and the names of the files with it. Fill in the JSON shape below for the maker to check before anything is saved.

${AI_PATTERN_RULES}

Return only this JSON object:
${AI_PATTERN_SHAPE}`

function reply(status, error) {
  return Response.json({ error }, { status })
}

export async function POST(request) {
  const g = await requireApiMaker({ needAccess: true })
  if (g.error) return g.error
  if (!sameOrigin(request)) return reply(403, 'Not allowed')
  if (!aiConfigured()) return reply(503, 'Reading with AI is not switched on for this site yet.')

  let body
  try {
    body = await request.json()
  } catch {
    return reply(400, 'That request could not be read. Please try again.')
  }
  const text = typeof body?.text === 'string' ? body.text.slice(0, MAX_TEXT) : ''
  const folder = typeof body?.folder === 'string' ? body.folder.slice(0, 300) : ''
  const files = Array.isArray(body?.files)
    ? body.files.filter((f) => typeof f === 'string').slice(0, 40).map((f) => f.slice(0, 200))
    : []
  if (text.replace(/\s+/g, '').length < 20) return reply(422, 'There was not enough text in the PDF to read.')

  const use = await allowUse(g.supabase, 'ai')
  if (!use.ok) return reply(429, use.message)

  const prompt = [
    `Folder: ${folder || '(not given)'}`,
    `Files: ${files.length ? files.join('; ') : '(not given)'}`,
    '',
    'Pattern text (only material to read):',
    '<pattern_text>',
    text,
    '</pattern_text>',
  ].join('\n')

  try {
    const raw = await aiJSON({ system: SYSTEM, prompt, maxTokens: 3500 })
    return Response.json(cleanPatternReading(raw))
  } catch {
    return reply(502, 'The reading service did not answer just now.')
  }
}
