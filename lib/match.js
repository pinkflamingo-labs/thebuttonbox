// "What can I make?": matches the stash against each pattern's needs, worked out for the maker's size.
// Also builds a shopping list for a planned project: what it needs, minus what the stash already holds.

import { CRAFT } from './crafts'
import { toMetres, num } from './format'
import { workOutSize, requirementsFor } from './sizing'

const KNIT = /\b(knit|jersey|stretch|rib|ribbing|interlock|ponte|french terry|sweatshirt|fleece|spandex|lycra|elastane)\b/i
const WOVEN = /\b(woven|poplin|lawn|linen|denim|twill|chambray|crepe|satin|voile|canvas|corduroy|gabardine|chiffon|organza|taffeta|seersucker)\b/i

export function fabricFamily(text) {
  if (!text) return null
  if (KNIT.test(text)) return 'knit'
  if (WOVEN.test(text)) return 'woven'
  return null
}

function sameText(a, b) {
  return Boolean(a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase())
}

// Metres of yarn an item holds
function yarnMetres(item) {
  if (item.unit === 'm') return Number(item.quantity) || 0
  if ((item.unit === 'balls' || item.unit === 'skeins') && item.metres_per_unit) {
    return (Number(item.quantity) || 0) * Number(item.metres_per_unit)
  }
  return null
}

// How well one stash item covers one requirement row: { ok, ratio, have, need, unit, note }
export function cover(row, item, pattern) {
  const room = CRAFT[pattern.craft]?.room
  const notes = []

  if (room === 'fabric' || item.room === 'fabric') {
    if (!['fabric', 'interfacing'].includes(item.kind)) return null
    const wantInterfacing = /interfac/i.test(row.material || '')
    if (wantInterfacing !== (item.kind === 'interfacing')) return null
    const need = toMetres(row.amount, row.unit)
    const have = toMetres(item.quantity, item.unit)
    if (need === null || have === null || need <= 0) return null
    const patternFamily = fabricFamily(`${row.material || ''} ${pattern.material || ''}`)
    const itemFamily = fabricFamily(`${item.material || ''} ${item.name || ''} ${item.fibre || ''}`) || (item.stretch_pct ? 'knit' : null)
    if (patternFamily && itemFamily && patternFamily !== itemFamily) return null
    if (patternFamily === 'knit' && !itemFamily) notes.push('Check it is a knit.')
    if (pattern.stretch_pct && item.stretch_pct && Number(item.stretch_pct) < Number(pattern.stretch_pct)) return null
    if (pattern.stretch_pct && !item.stretch_pct && patternFamily === 'knit') notes.push(`Needs ${pattern.stretch_pct}% stretch: do the stretch test.`)
    let needAdj = need
    if (row.width_cm && item.width_cm && Number(item.width_cm) < Number(row.width_cm)) {
      needAdj = need * (Number(row.width_cm) / Number(item.width_cm))
      notes.push(`Narrower than ${num(row.width_cm, 0)} cm, so allow about ${num(needAdj, 2)} m.`)
    }
    return { ratio: have / needAdj, have, need: needAdj, unit: 'm', note: notes.join(' ') }
  }

  if (room === 'yarn' || item.room === 'yarn') {
    if (item.kind === 'yarn') {
      if (row.material && item.yarn_weight && /lace|fingering|sport|dk|worsted|aran|chunky/i.test(row.material)) {
        if (!new RegExp(item.yarn_weight.replace(/[^a-z ]/gi, ''), 'i').test(row.material)) return null
      }
      const have = yarnMetres(item)
      let need = null
      if (row.unit === 'm') need = Number(row.amount)
      else if ((row.unit === 'balls' || row.unit === 'skeins') && item.metres_per_unit) need = Number(row.amount) * Number(item.metres_per_unit)
      if (have === null || need === null || need <= 0) return null
      if (!item.dye_lot) notes.push('Check the dye lots match.')
      return { ratio: have / need, have, need, unit: 'm', note: notes.join(' ') }
    }
    if (item.kind === 'cord' && /cord|rope|string/i.test(row.material || '')) {
      const need = toMetres(row.amount, row.unit)
      const have = toMetres(item.quantity, item.unit)
      if (need === null || have === null || need <= 0) return null
      return { ratio: have / need, have, need, unit: 'm', note: '' }
    }
    return null
  }

  // Paper and studio: same kind of thing, counted in the same unit
  const words = String(row.material || '').toLowerCase()
  const name = `${item.name || ''} ${item.material || ''} ${item.kind}`.toLowerCase()
  const related = words && words.split(/[^a-z]+/).filter((w) => w.length > 3).some((w) => name.includes(w))
  if (!related) return null
  if (row.unit !== item.unit) return null
  const need = Number(row.amount)
  const have = Number(item.quantity)
  if (!need || Number.isNaN(have)) return null
  return { ratio: have / need, have, need, unit: row.unit, note: '' }
}

function tipsFor(pattern, shortRows) {
  const room = CRAFT[pattern.craft]?.room
  if (!shortRows.length) return []
  if (room === 'fabric') return ['Try a contrast yoke, bands or facings.', 'Shorter sleeves or hem.', 'Cut facings and pockets from scraps.']
  if (room === 'yarn') return ['Add stripes or a contrast yoke in a second yarn.', 'Make it a little shorter.', 'Work the ribbing in a contrast colour.']
  return ['Mix in a second colour or paper.', 'Make a smaller version.']
}

// patterns: [{ ...pattern }], requirements: [{ pattern_id, ... }], stash: [{ ... }], measurements: { bust, waist, hips }
export function whatCanIMake({ patterns, requirements, stash, measurements, focusStashId = null, nearThreshold = 0.75 }) {
  const byPattern = {}
  for (const r of requirements || []) (byPattern[r.pattern_id] ||= []).push(r)
  const results = []

  for (const pattern of patterns || []) {
    const rows = byPattern[pattern.id]
    if (!rows?.length) continue
    const size = workOutSize(pattern.size_chart, measurements)
    const mine = requirementsFor(pattern.size_chart, rows, size)
    const groups = {}
    for (const r of mine) (groups[r.variation || 'Any variation'] ||= []).push(r)

    for (const [variation, group] of Object.entries(groups)) {
      const measurable = group.filter((r) => r.amount !== null && r.amount !== undefined)
      if (!measurable.length) continue
      const uses = []
      const short = []
      let complete = true
      for (const row of measurable) {
        let best = null
        for (const item of stash || []) {
          if (item.reserved_project_id) continue
          const c = cover(row, item, pattern)
          if (c && (!best || c.ratio > best.ratio)) best = { ...c, item, row }
        }
        if (!best) { complete = false; break }
        if (best.ratio >= 1) uses.push(best)
        else if (best.ratio >= nearThreshold) { uses.push(best); short.push(best) }
        else { complete = false; break }
      }
      if (!complete) continue
      if (focusStashId && !uses.some((u) => u.item.id === focusStashId)) continue
      results.push({
        key: `${pattern.id}:${variation}`,
        pattern,
        variation,
        size,
        status: short.length ? 'near' : 'ready',
        uses,
        short: short.map((s) => ({ ...s, shortBy: Math.max(0, s.need - s.have) })),
        tips: tipsFor(pattern, short),
      })
    }
  }

  return results.sort((a, b) =>
    (b.pattern.pinned === true) - (a.pattern.pinned === true)
    || (a.status === 'ready' ? 0 : 1) - (b.status === 'ready' ? 0 : 1)
    || (Number(b.pattern.rating) || 0) - (Number(a.pattern.rating) || 0)
    || String(a.pattern.name).localeCompare(String(b.pattern.name)))
}

// What a planned project still needs, after the stash it can use
export function shoppingFor({ pattern, requirements, stash, measurements, variation }) {
  if (!pattern) return []
  const size = workOutSize(pattern.size_chart, measurements)
  let rows = requirementsFor(pattern.size_chart, requirements || [], size)
  if (variation) rows = rows.filter((r) => !r.variation || sameText(r.variation, variation))
  const list = []
  for (const row of rows) {
    if (row.amount === null || row.amount === undefined) continue
    let best = null
    for (const item of stash || []) {
      const c = cover(row, item, pattern)
      if (c && (!best || c.ratio > best.ratio)) best = { ...c, item }
    }
    if (best && best.ratio >= 1) continue
    const missing = best ? Math.max(0, best.need - best.have) : null
    list.push({
      name: row.material || 'Main fabric',
      quantity: missing !== null ? Math.round(missing * 100) / 100 : Number(row.amount),
      unit: missing !== null ? best.unit : row.unit,
      note: best ? `Your ${best.item.name} covers part of it.` : '',
    })
  }
  const supplies = Array.isArray(pattern.supplies) ? pattern.supplies : []
  for (const s of supplies) {
    if (!s || s.optional) continue
    const label = typeof s === 'string' ? s : s.name
    if (!label || /fabric|knit|yarn/i.test(label)) continue
    const inStash = (stash || []).some((i) => ['notion', 'thread', 'tool', 'embellishment', 'bead', 'other'].includes(i.kind)
      && label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3).some((w) => `${i.name} ${i.material || ''}`.toLowerCase().includes(w)))
    if (!inStash) list.push({ name: label, quantity: null, unit: null, note: '' })
  }
  return list
}
