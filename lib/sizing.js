// Working out a pattern for a maker's own size: which size to cut, where to grade, how much to buy and the ease.
//
// size_chart (stored on each pattern, all in cm):
//   { sizes: ["6","8",...], bust: [79,84,...], waist: [...], hips: [...], finished_bust: [...] }
// requirements: rows of { variation, size_from, size_to, material, amount, unit, width_cm }

const PARTS = ['bust', 'waist', 'hips']
const PART_LABEL = { bust: 'bust', waist: 'waist', hips: 'hips' }

export function hasChart(chart) {
  return Boolean(chart && Array.isArray(chart.sizes) && chart.sizes.length && PARTS.some((p) => Array.isArray(chart[p])))
}

// The first size whose body measurement covers the maker's, so nothing is cut too small
export function sizeIndexFor(chart, part, value) {
  const arr = chart?.[part]
  if (!Array.isArray(arr) || value === null || value === undefined || value === '') return null
  const v = Number(value)
  for (let i = 0; i < arr.length; i++) {
    const c = Number(arr[i])
    if (!Number.isNaN(c) && v <= c) return { index: i, exact: v === c, over: false }
  }
  return { index: arr.length - 1, exact: false, over: true }
}

// Returns null when there is no chart or no measurements to work from
export function workOutSize(chart, m) {
  if (!hasChart(chart) || !m) return null
  const found = {}
  for (const p of PARTS) {
    const r = sizeIndexFor(chart, p, m[p])
    if (r) found[p] = { ...r, size: chart.sizes[r.index], value: Number(m[p]) }
  }
  const lead = found.bust || found.hips || found.waist
  if (!lead) return null
  const base = lead.index
  const grades = PARTS.filter((p) => found[p] && found[p].index !== base).map((p) => `${found[p].size} at the ${PART_LABEL[p]}`)
  const leadPart = found.bust ? 'bust' : found.hips ? 'hips' : 'waist'
  let note = grades.length
    ? `Cut ${chart.sizes[base]} at the ${leadPart}, grade to ${grades.join(' and ')}.`
    : `Cut size ${chart.sizes[base]} throughout.`
  const between = PARTS.some((p) => found[p] && !found[p].exact)
  if (between) note += ' Between sizes, so the larger one is shown.'
  const over = PARTS.some((p) => found[p]?.over)
  if (over) note += ' Some measurements are past the largest size on the chart.'

  const largest = Math.max(...PARTS.filter((p) => found[p]).map((p) => found[p].index))
  let ease = null
  if (found.bust && Array.isArray(chart.finished_bust) && chart.finished_bust[base] !== undefined) {
    const fin = Number(chart.finished_bust[base])
    ease = { finished: fin, body: found.bust.value, difference: Math.round((fin - found.bust.value) * 10) / 10 }
  }
  return { base, baseSize: chart.sizes[base], largest, largestSize: chart.sizes[largest], parts: found, note, graded: grades.length > 0, between, ease }
}

export function easeNote(ease) {
  if (!ease) return ''
  if (ease.difference < 0) {
    return `Finished bust ${ease.finished} cm on a ${ease.body} cm bust: ${Math.abs(ease.difference)} cm of negative ease, so it fits close.`
  }
  if (ease.difference === 0) return `Finished bust ${ease.finished} cm: no ease, a body-hugging fit.`
  return `Finished bust ${ease.finished} cm on a ${ease.body} cm bust: ${ease.difference} cm of ease.`
}

function indexOfSize(chart, label) {
  if (!label) return -1
  return chart?.sizes?.findIndex((s) => String(s).trim().toLowerCase() === String(label).trim().toLowerCase()) ?? -1
}

// Rows that apply to the maker's largest size. Without a chart, every row applies.
export function requirementsFor(chart, rows, sizeResult) {
  if (!Array.isArray(rows)) return []
  if (!hasChart(chart) || !sizeResult) return rows
  const i = sizeResult.largest
  return rows.filter((r) => {
    const from = indexOfSize(chart, r.size_from)
    const to = indexOfSize(chart, r.size_to)
    if (from < 0 && to < 0) return true
    const lo = from < 0 ? to : from
    const hi = to < 0 ? from : to
    return i >= Math.min(lo, hi) && i <= Math.max(lo, hi)
  })
}

// Latest measurements for a profile, as { bust, waist, hips, ... }
export function latestMeasurements(rows) {
  if (!Array.isArray(rows) || !rows.length) return null
  const sorted = [...rows].sort((a, b) => String(b.taken_on).localeCompare(String(a.taken_on)))
  return sorted[0]
}
