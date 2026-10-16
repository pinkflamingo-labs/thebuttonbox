// Units, numbers and dates, written the Australian way.

export const M_PER_YD = 0.9144
export const CM_PER_IN = 2.54

export function round(n, dp = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return null
  const f = 10 ** dp
  return Math.round(Number(n) * f) / f
}

export function num(n, dp = 1) {
  const r = round(n, dp)
  return r === null ? '' : String(r)
}

// Convert a length to metres (null when the unit is not a length)
export function toMetres(amount, unit) {
  if (amount === null || amount === undefined || amount === '') return null
  const a = Number(amount)
  if (unit === 'm') return a
  if (unit === 'yd') return a * M_PER_YD
  if (unit === 'cm') return a / 100
  return null
}

export function metresToYards(m) {
  return m === null || m === undefined ? null : m / M_PER_YD
}

// "1.2 m (1.3 yd)" or "1.3 yd (1.2 m)" depending on the maker's units
export function lengthLabel(amount, unit, units = 'metric') {
  const m = toMetres(amount, unit)
  if (m === null) return amount === null || amount === undefined ? '' : `${num(amount, 2)} ${unit}`
  const yd = metresToYards(m)
  return units === 'imperial' ? `${num(yd, 2)} yd (${num(m, 2)} m)` : `${num(m, 2)} m (${num(yd, 2)} yd)`
}

export function amountLabel(amount, unit, units = 'metric') {
  if (amount === null || amount === undefined || amount === '') return ''
  if (['m', 'yd', 'cm'].includes(unit)) return lengthLabel(amount, unit, units)
  const plural = { balls: 'balls', skeins: 'skeins', sheets: 'sheets', each: '', g: 'g', ml: 'ml' }
  const u = plural[unit] ?? unit
  return u ? `${num(amount, 2)} ${u}` : num(amount, 2)
}

export function cmLabel(cm, units = 'metric') {
  if (cm === null || cm === undefined || cm === '') return ''
  return units === 'imperial' ? `${num(cm / CM_PER_IN, 1)} in` : `${num(cm, 1)} cm`
}

const DATE = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const DAY = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

export function dateLabel(d) {
  if (!d) return ''
  const date = typeof d === 'string' && d.length === 10 ? new Date(`${d}T00:00:00`) : new Date(d)
  return Number.isNaN(date.getTime()) ? '' : DATE.format(date)
}

export function dayLabel(d) {
  if (!d) return ''
  const date = typeof d === 'string' && d.length === 10 ? new Date(`${d}T00:00:00`) : new Date(d)
  return Number.isNaN(date.getTime()) ? '' : DAY.format(date)
}

export function daysUntil(d) {
  if (!d) return null
  const date = typeof d === 'string' && d.length === 10 ? new Date(`${d}T00:00:00`) : new Date(d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((date - today) / 86400000)
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many || `${one}s`}`
}

export function money(amountCents, currency = 'aud') {
  if (amountCents === null || amountCents === undefined) return ''
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: currency.toUpperCase() }).format(amountCents / 100)
}
