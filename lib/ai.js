// Reading patterns and photos with an AI model. Works with any OpenAI-compatible service, including Azure OpenAI.
// Nothing is stored by this helper: text and photos go in, structured details come back for the maker to check.

export function aiConfigured() {
  return Boolean(process.env.AI_API_KEY)
}

export async function aiJSON({ system, prompt, images = [], maxTokens = 2000 }) {
  if (!aiConfigured()) throw new Error('Reading with AI is not set up yet (AI_API_KEY).')
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const headers = { 'Content-Type': 'application/json' }
  if ((process.env.AI_PROVIDER || '').toLowerCase() === 'azure') headers['api-key'] = process.env.AI_API_KEY
  else headers.Authorization = `Bearer ${process.env.AI_API_KEY}`

  const content = images.length
    ? [{ type: 'text', text: prompt }, ...images.map((url) => ({ type: 'image_url', image_url: { url, detail: 'high' } }))]
    : prompt

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'gpt-4.1-mini',
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`The reading service said ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }
  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content || '{}'
  try {
    return JSON.parse(raw)
  } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : {}
  }
}
