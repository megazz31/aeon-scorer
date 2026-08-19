// AeonShift is used as a SOFT PRIOR only.
// Current public lists are primarily calibrated for AeonShift's own formats / Duel context,
// not as a universal Commander power score.

export const AEONSHIFT_META = {
  calculator: 'https://points.aeonshift.games/en/mtg/calculator',
  apiDocs: 'https://points.aeonshift.games/api/doc',
  note: 'Importer le CSV officiel le plus récent depuis la page Updates AeonShift.',
}

function splitCsvLine(line, delimiter) {
  const out = []
  let cur = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++ }
      else quoted = !quoted
    } else if (ch === delimiter && !quoted) {
      out.push(cur.trim()); cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

function toNumber(v) {
  if (v == null) return null
  const s = String(v).trim().replace(',', '.')
  if (!s || s === '-') return null
  const n = Number(s)
  if (Number.isFinite(n)) return n
  const m = s.match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

export function parseAeonShiftCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return new Map()
  const delimiter = lines[0].includes(';') ? ';' : ','
  const header = splitCsvLine(lines[0], delimiter).map(x => x.toLowerCase())
  const nameIx = header.findIndex(x => x.includes('name'))
  const baseCandidates = header.map((x, i) => ({ x, i })).filter(({ x }) => x.includes('base') || x.includes('singleton') || x.includes('raw'))
  const baseIx = baseCandidates[0]?.i ?? 1
  const dcIx = header.findIndex(x => x.includes('duel') || x === 'dc')

  const map = new Map()
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line, delimiter)
    const name = cols[nameIx >= 0 ? nameIx : 0]?.replace(/^"|"$/g, '').trim()
    if (!name) continue
    const base = toNumber(cols[baseIx])
    const duel = dcIx >= 0 ? toNumber(cols[dcIx]) : null
    map.set(name.toLowerCase(), { name, base, duel })
  }
  return map
}

export function aeonPriorFor(card, map) {
  if (!map?.size) return { points: null, normalized: 0, source: 'none' }
  const row = map.get(card.name.toLowerCase())
  const p = row?.base ?? row?.duel ?? null
  if (p == null) return { points: null, normalized: 0, source: 'unranked' }
  const normalized = Math.min(1, Math.log1p(Math.max(0, p)) / Math.log(101))
  return { points: p, normalized, source: 'aeonshift' }
}
