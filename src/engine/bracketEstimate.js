// Official Commander Brackets estimate (WotC beta, updates of 2025-10-21 and 2026-02-09).
// Every bracket floor is computed independently with its evidence; the estimate is the highest floor (decision trace, no black box).
export const BRACKET_ESTIMATE_VERSION = 'bracket-estimate-v1'
export const BRACKET_NAMES = { 1: 'Exhibition', 2: 'Core', 3: 'Upgraded', 4: 'Optimized', 5: 'cEDH' }
// "You should expect to be able to play at least N turns before you win or lose."
export const BRACKET_MIN_TURNS = { 1: 9, 2: 8, 3: 6, 4: 4, 5: 0 }
// Share of goldfish games where the deck eliminates a player at or before the bracket's minimum turn.
// WotC: breaking the expectation once does not move a deck; a habit does. Goldfish is a speed ceiling, hence the tolerance.
export const SPEED_TOLERANCE = { ok: 15, limit: 35 }

const names = xs => [...new Set((xs || []).map(x => x?.name || x).filter(Boolean))]
const pct = n => Math.round(Number(n || 0) * 10) / 10

function speedStatus(clock, bracket) {
  const turn = BRACKET_MIN_TURNS[bracket]
  if (!turn) return { status: 'ok', share: 0, turn }
  const share = Number(clock?.firstKillBefore?.[turn] ?? 0)
  return { status: share <= SPEED_TOLERANCE.ok ? 'ok' : share <= SPEED_TOLERANCE.limit ? 'limit' : 'exceeds', share: pct(share), turn }
}

export function deckFacts(result = {}, cards = [], { gameChangers = [], spellbook = null } = {}) {
  const friction = result?.friction?.signals || {}
  const ev = id => names(friction[id]?.evidence)
  const featured = cards.filter(c => c && Array.isArray(c.tags))
  const tagged = tag => names(featured.filter(c => c.tags.includes(tag)))
  const clockCombos = result?.clock?.combos || []
  const twoCard = (spellbook?.included || []).filter(c => (c.cards || []).length === 2 && /win the game|lose the game|infinite/i.test(c.result || ''))
  return {
    gameChangers: names(gameChangers),
    fastMana: tagged('fast-mana'),
    tutors: tagged('tutor'),
    extraTurns: names([...ev('extraTurns'), ...tagged('extra-turn')]),
    massLandDenial: ev('massLandDenial'),
    landLock: ev('landLock'),
    stax: names([...ev('resourceDenial'), ...ev('commanderLockout')]),
    lockPotential: Number(friction.lockPotential?.score || 0),
    tempoDenial: ev('tempoDenial'),
    tempoDenialRecurring: names((friction.tempoDenial?.evidence || []).filter(e => e.recurring)),
    theft: ev('theft'),
    combos: clockCombos.map(c => ({ name: c.name, pieces: c.pieces, winBefore: c.winBefore || {}, tutoredShare: c.tutoredShare || 0, source: c.source })),
    twoCardCombos: twoCard.map(c => c.cards.join(' + ')),
    clock: result?.clock || null,
  }
}

export function estimateBracket(facts) {
  const floors = []
  const add = (id, floor, status, detail, evidence = []) => floors.push({ id, floor, status, detail, evidence })
  const gc = facts.gameChangers.length
  add('game-changers', gc === 0 ? 1 : gc <= 3 ? 3 : 4, gc <= 3 ? 'ok' : 'exceeds', { count: gc }, facts.gameChangers)
  add('mass-land-denial', facts.massLandDenial.length ? 4 : 1, facts.massLandDenial.length ? 'exceeds' : 'ok', { count: facts.massLandDenial.length }, facts.massLandDenial)
  const xt = facts.extraTurns.length
  add('extra-turns', xt === 0 ? 1 : xt === 1 ? 2 : xt === 2 ? 3 : 4, xt <= 1 ? 'ok' : xt === 2 ? 'limit' : 'exceeds', { count: xt, chainable: xt >= 2 }, facts.extraTurns)
  const combos = facts.combos, early = Math.max(0, ...combos.map(c => Number(c.winBefore?.[6] || 0)))
  const hasGameEndingCombo = combos.length > 0 || facts.twoCardCombos.length > 0
  add('combos', !hasGameEndingCombo ? 1 : early >= 10 ? 4 : 3, early >= 10 ? 'exceeds' : early >= 5 ? 'limit' : 'ok', { lines: combos.length + facts.twoCardCombos.length, winByTurn6: pct(early) }, [...combos.map(c => c.name), ...facts.twoCardCombos])
  // Speed: the lowest bracket whose turn expectation the deck respects.
  let speedFloor = 5, speedDetail = null
  for (const b of [1, 2, 3, 4]) { const s = speedStatus(facts.clock, b); if (s.status !== 'exceeds') { speedFloor = b; speedDetail = s; break } }
  if (!facts.clock) add('speed', 1, 'unknown', { reason: 'clock-unavailable' })
  else add('speed', speedFloor, speedDetail?.status === 'limit' ? 'limit' : speedFloor >= 4 ? 'exceeds' : 'ok', { ...(speedDetail || speedStatus(facts.clock, 4)), firstKillMedian: facts.clock.firstKill?.median, firstKillP20: facts.clock.firstKill?.p20 }, (facts.clock.drivers || []).slice(0, 4).map(d => d.name))

  // Bracket 1 (Exhibition) is an intent like bracket 5: cards alone never prove it, so the estimate starts at 2 and only says
  // whether the deck stays inside every bracket-1 limit.
  const top = Math.max(...floors.map(f => f.floor)), bracket = Math.max(2, top)
  // A floor sitting on the edge of its bracket (status "limit") makes the next bracket plausible.
  const upper = floors.some(f => f.floor === bracket && f.status === 'limit') && bracket < 5 ? bracket + 1 : bracket
  const binding = top >= 2 ? floors.filter(f => f.floor === bracket).map(f => f.id) : ['baseline']
  return {
    modelVersion: BRACKET_ESTIMATE_VERSION, bracket, range: [bracket, upper], name: BRACKET_NAMES[bracket], binding, floors,
    b1Compatible: top <= 1 && floors.every(f => f.status === 'ok' || f.status === 'unknown'),
    cedhSpeed: bracket >= 4 && Number(facts.clock?.firstKillBefore?.[4] || 0) > SPEED_TOLERANCE.limit,
    notes: ['Brackets 1 and 5 are intents (theme first / competitive metagame): Aeon reports whether the deck fits bracket 1 limits and flags cEDH-level speed.', 'Rule 0 always applies: the estimate describes the deck, the table decides.'],
  }
}
