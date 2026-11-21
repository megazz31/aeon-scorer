// Table Charter v1 — Rule 0 made explicit. A table picks an official bracket preset, then adjusts the points players argue
// about (Sol Ring / fast mana, combos and their turn, tutors, extra turns, land destruction and locks, stax, repeated bounce,
// theft, Game Changers, minimum game length). Aeon never decides what is allowed: it measures each deck against the charter.
import { BRACKET_MIN_TURNS } from './bracketEstimate.js'

export const TABLE_CHARTER_VERSION = 'table-charter-v1'
const ANY = 99

export const CHARTER_PRESETS = {
  1: { preset: 1, maxGameChangers: 0, fastMana: 'any', combos: 'none', comboMinTurn: 0, comboMinPieces: 2, maxTutors: ANY, extraTurns: 'none', mld: 'forbidden', landLock: 'announce', stax: 'announce', tempoDenial: 'announce', theft: 'allowed', minTurns: BRACKET_MIN_TURNS[1] },
  2: { preset: 2, maxGameChangers: 0, fastMana: 'any', combos: 'none', comboMinTurn: 0, comboMinPieces: 2, maxTutors: ANY, extraTurns: 'single', mld: 'forbidden', landLock: 'announce', stax: 'announce', tempoDenial: 'announce', theft: 'allowed', minTurns: BRACKET_MIN_TURNS[2] },
  3: { preset: 3, maxGameChangers: 3, fastMana: 'any', combos: 'late', comboMinTurn: 7, comboMinPieces: 2, maxTutors: ANY, extraTurns: 'single', mld: 'forbidden', landLock: 'announce', stax: 'allowed', tempoDenial: 'allowed', theft: 'allowed', minTurns: BRACKET_MIN_TURNS[3] },
  4: { preset: 4, maxGameChangers: ANY, fastMana: 'any', combos: 'any', comboMinTurn: 0, comboMinPieces: 2, maxTutors: ANY, extraTurns: 'any', mld: 'allowed', landLock: 'allowed', stax: 'allowed', tempoDenial: 'allowed', theft: 'allowed', minTurns: BRACKET_MIN_TURNS[4] },
  5: { preset: 5, maxGameChangers: ANY, fastMana: 'any', combos: 'any', comboMinTurn: 0, comboMinPieces: 2, maxTutors: ANY, extraTurns: 'any', mld: 'allowed', landLock: 'allowed', stax: 'allowed', tempoDenial: 'allowed', theft: 'allowed', minTurns: 0 },
}
export const CHARTER_OPTIONS = {
  fastMana: ['any', 'sol-ring-only', 'none'],
  combos: ['none', 'late', 'any'],
  extraTurns: ['none', 'single', 'any'],
  mld: ['forbidden', 'allowed'],
  landLock: ['forbidden', 'announce', 'allowed'],
  stax: ['forbidden', 'announce', 'allowed'],
  tempoDenial: ['forbidden', 'announce', 'allowed'],
  theft: ['forbidden', 'announce', 'allowed'],
}
// Combo / speed checks are probabilities: at most `ok` % of games breaking the rule is fine, up to `limit` % is worth a talk.
export const CHARTER_TOLERANCE = { ok: 10, limit: 25 }
const STATUS_RANK = { ok: 0, announce: 1, discuss: 2, out: 3 }

export function normalizeCharter(input = {}) {
  const base = CHARTER_PRESETS[Number(input.preset)] || CHARTER_PRESETS[3], out = { ...base }
  for (const [k, v] of Object.entries(input || {})) {
    if (k in CHARTER_OPTIONS) { if (CHARTER_OPTIONS[k].includes(v)) out[k] = v }
    else if (['maxGameChangers', 'comboMinTurn', 'comboMinPieces', 'maxTutors', 'minTurns'].includes(k)) { const n = Number(v); if (Number.isFinite(n)) out[k] = Math.max(0, Math.min(ANY, Math.round(n))) }
  }
  out.preset = base.preset
  return out
}
const DIFF_KEYS = Object.keys(CHARTER_PRESETS[3]).filter(k => k !== 'preset')
// Compact, URL-safe: only the preset and the fields that differ from it.
export function encodeCharter(charter) {
  const c = normalizeCharter(charter), base = CHARTER_PRESETS[c.preset], diff = Object.fromEntries(DIFF_KEYS.filter(k => c[k] !== base[k]).map(k => [k, c[k]]))
  const json = JSON.stringify({ p: c.preset, ...diff })
  return (typeof btoa === 'function' ? btoa(json) : Buffer.from(json).toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function decodeCharter(code) {
  try {
    const b64 = String(code || '').replace(/-/g, '+').replace(/_/g, '/'), json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
    const { p, ...rest } = JSON.parse(json)
    return normalizeCharter({ preset: p, ...rest })
  } catch { return null }
}

const policyStatus = (policy, present) => !present ? 'ok' : policy === 'forbidden' ? 'out' : policy === 'announce' ? 'announce' : 'ok'
const probabilityStatus = share => share <= CHARTER_TOLERANCE.ok ? 'ok' : share <= CHARTER_TOLERANCE.limit ? 'discuss' : 'out'

// facts: output of deckFacts() (bracketEstimate.js).
export function evaluateCharter(charterInput, facts) {
  const charter = normalizeCharter(charterInput), checks = []
  const add = (id, status, detail, cards = []) => checks.push({ id, status, detail, cards })

  const gc = facts.gameChangers.length
  add('game-changers', gc <= charter.maxGameChangers ? 'ok' : 'out', { count: gc, max: charter.maxGameChangers }, facts.gameChangers)

  const solRing = facts.fastMana.filter(n => /^sol ring$/i.test(n)), otherFast = facts.fastMana.filter(n => !/^sol ring$/i.test(n))
  const fastBanned = charter.fastMana === 'none' ? facts.fastMana : charter.fastMana === 'sol-ring-only' ? otherFast : []
  add('fast-mana', fastBanned.length ? 'out' : 'ok', { policy: charter.fastMana, turn1Share: facts.clock?.fastManaTurn1?.share ?? null, solRing: solRing.length > 0 }, fastBanned.length ? fastBanned : facts.fastMana)

  const tooFewPieces = facts.combos.filter(c => c.pieces < charter.comboMinPieces).map(c => c.name)
  const lines = [...facts.combos.map(c => c.name), ...facts.twoCardCombos]
  if (charter.combos === 'none') add('combos', lines.length ? 'out' : 'ok', { policy: 'none', lines: lines.length }, lines)
  else if (charter.combos === 'late') {
    const t = Math.min(10, Math.max(4, charter.comboMinTurn - 1)), early = Math.max(0, ...facts.combos.map(c => Number(c.winBefore?.[t] ?? 0)))
    const status = tooFewPieces.length ? 'out' : probabilityStatus(early)
    add('combos', lines.length ? status : 'ok', { policy: 'late', beforeTurn: charter.comboMinTurn, earlyShare: early, minPieces: charter.comboMinPieces, tutoredShare: Math.max(0, ...facts.combos.map(c => c.tutoredShare || 0)) }, tooFewPieces.length ? tooFewPieces : lines)
  } else add('combos', tooFewPieces.length ? 'out' : 'ok', { policy: 'any', lines: lines.length, minPieces: charter.comboMinPieces }, tooFewPieces.length ? tooFewPieces : lines)

  add('tutors', facts.tutors.length <= charter.maxTutors ? 'ok' : 'out', { count: facts.tutors.length, max: charter.maxTutors }, facts.tutors)
  const xt = facts.extraTurns.length
  add('extra-turns', charter.extraTurns === 'none' ? (xt ? 'out' : 'ok') : charter.extraTurns === 'single' ? (xt > 1 ? 'out' : 'ok') : 'ok', { policy: charter.extraTurns, count: xt }, facts.extraTurns)
  add('mass-land-denial', policyStatus(charter.mld, facts.massLandDenial.length > 0), { policy: charter.mld }, facts.massLandDenial)
  add('land-lock', policyStatus(charter.landLock, facts.landLock.length > 0), { policy: charter.landLock }, facts.landLock)
  add('stax', policyStatus(charter.stax, facts.stax.length > 0), { policy: charter.stax, lockPotential: facts.lockPotential }, facts.stax)
  add('tempo-denial', policyStatus(charter.tempoDenial, facts.tempoDenial.length > 0), { policy: charter.tempoDenial, recurring: facts.tempoDenialRecurring }, facts.tempoDenial)
  add('theft', policyStatus(charter.theft, facts.theft.length > 0), { policy: charter.theft }, facts.theft)

  if (charter.minTurns > 0 && facts.clock) {
    const t = Math.min(10, Math.max(4, charter.minTurns)), share = Number(facts.clock.firstKillBefore?.[t] ?? 0)
    add('min-turns', probabilityStatus(share), { minTurns: charter.minTurns, measuredTurn: t, share, firstKillMedian: facts.clock.firstKill?.median }, (facts.clock.drivers || []).slice(0, 4).map(d => d.name))
  }
  const worst = checks.reduce((w, c) => STATUS_RANK[c.status] > STATUS_RANK[w] ? c.status : w, 'ok')
  return { modelVersion: TABLE_CHARTER_VERSION, charter, verdict: worst, checks, culprits: [...new Set(checks.filter(c => c.status === 'out' || c.status === 'discuss').flatMap(c => c.cards))].slice(0, 12) }
}
