// Win Clock v1 — "on which turn can this deck end someone's game?"
// Two tables are simulated from the same draws: a goldfish table (no blockers: speed ceiling) and a contested table where
// ground damage is partly blocked (headline). Opponents at 40 life. The output is in turns, the unit of the official
// Commander Brackets expectations (B1 ≥9 turns, B2 ≥8, B3 ≥6, B4 ≥4).
import { simulatorKit as K, landManaSources, canPay, permanentRampSupport } from './sequenceSimulator.js'
import { KNOWN_COMBOS } from './knownCombos.js'

export const WIN_CLOCK_VERSION = 'win-clock-v1'
export const WIN_CLOCK_MAX_TURN = 12
const LIFE = 40, OPPONENTS = 3, POISON = 10, COMMANDER_DAMAGE = 21

// Catalog lines that end the game on their own (infinite-mana-only lines such as Dramatic Scepter need an outlet: excluded).
const CATALOG_WIN_LINES = new Set(['Thoracle + Consultation', 'Thoracle + Pact', 'Heliod Ballista', 'Exquisite Bond', 'Exquisite Vito', 'Painter Stone', 'Breach Freeze'])
// Catalog engines: they end the game only with a finisher already in the deck (see finishers below).
const CATALOG_ENGINES = { 'Dramatic Scepter': 'mana', Worldgorger: 'mana' }
const WIN_RESULT = /win the game|lose the game|loses the game|infinite (?:colorless |colored |generic )?(?:damage|life ?loss|lifeloss|combat|turns|mill|drain|power)|infinite [^,.;·]{0,40}damage|infinite creature tokens with haste|cast all spells in your library/i
// Engine results need a finisher already in the deck: infinite mana → X spell, infinite draw / self-mill → empty-library
// win card, infinite storm → storm finisher.
const MANA_ENGINE = /(?:near-)?infinite [^;,.·]{0,30}\bmana\b|near-infinite treasure/i
const DRAW_ENGINE = /infinite (?:card draw|draw triggers)\b|exile your library|infinite self-mill/i
const STORM_ENGINE = /infinite storm count/i
const manaFinisher = c => /walking ballista|aetherflux reservoir/i.test(c?.name || '') || /\{x\}/i.test(c?.manaCost || c?.mana_cost || '') && /\b(?:deals? x damage|loses x life|x damage to each)/i.test(c?.oracle || '')
const drawFinisher = c => /\bwin the game\b/i.test(c?.oracle || '') && /\blibrary\b/i.test(c?.oracle || '') && /\b(?:no cards|fewer cards|cards in your library)\b/i.test(c?.oracle || '')
const stormFinisher = c => /aetherflux reservoir/i.test(c?.name || '') || /^storm\b/im.test(c?.oracle || '') && /\b(?:damage|loses? \d+ life|mills?)\b/i.test(c?.oracle || '')
// Mana value of a Spellbook "mana needed" string ({4}{B}{B} = 6).
const manaValue = s => (String(s || '').match(/\{[^}]+\}/g) || []).reduce((n, sym) => n + (/^\{\d+\}$/.test(sym) ? Number(sym.slice(1, -1)) : /^\{[xyz]\}$/i.test(sym) ? 0 : 1), 0)
const WORD = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, x: 2 }
const count = s => { const k = String(s || '').toLowerCase(); return WORD[k] ?? (Number.isFinite(Number(k)) ? Number(k) : 1) }
const text = c => String(c?.oracle || '').toLowerCase().replace(/\([^)]*\)/g, ' ')
const key = name => String(name || '').toLowerCase()
const isCreature = c => /\bcreature\b/i.test(c?.type || '')

function ownKeywords(c) {
  const out = new Set((c.keywords || []).map(k => String(k).toLowerCase()))
  for (const line of String(c.oracle || '').split('\n')) {
    const l = line.trim().toLowerCase()
    if (l.length < 80 && /^[a-z ,]+$/.test(l)) for (const k of l.split(',')) out.add(k.trim())
  }
  return out
}

function recurringBefore(o, index) { return /\b(?:at the beginning of|whenever)\b[^.]*$/.test(o.slice(Math.max(0, index - 160), index)) }

// Static clock-relevant facts for one card; null when it does nothing for the clock.
export function clockProfile(c) {
  const o = text(c), kw = ownKeywords(c), creature = isCreature(c)
  const p = {
    creature, power: 0, powerEstimated: false, haste: kw.has('haste'), double: kw.has('double strike'), infect: kw.has('infect'),
    toxic: Number((o.match(/\btoxic (\d+)/) || [])[1] || 0),
    evasion: ['flying', 'shadow', 'horsemanship', 'fear', 'intimidate', 'skulk'].some(k => kw.has(k)) || /\bcan't be blocked\b/.test(o) ? 'evasive' : ['trample', 'menace'].some(k => kw.has(k)) ? 'partial' : 'ground',
    canAttack: !kw.has('defender') && !/\bcan't attack\b/.test(o),
    tokens: [], recurringTokens: [], burnTable: 0, burnOne: 0, drainPerTurn: 0, anthem: 0, pump: 0, extraCombat: (c.tags || []).includes('extra-combat'),
  }
  if (creature) {
    const n = Number.parseInt(c.power, 10)
    if (Number.isFinite(n)) p.power = Math.max(0, n)
    else if (c.power != null && c.power !== '') p.power = 2 // "*" powers: conservative
    else { p.power = Math.max(1, Math.round(Number(c.cmc || 2) * 0.8)); p.powerEstimated = true }
    const etbCounters = o.match(/\benters(?: the battlefield)? with (a|an|one|two|three|four|five|x|\d+) (?:additional )?\+1\/\+1 counters?/)
    if (etbCounters) p.power += count(etbCounters[1])
  }
  for (const m of o.matchAll(/\bcreate (a|an|one|two|three|four|five|x|\d+) (?:tapped )?(?:[a-z]+ )?(\d+)\/(\d+)[^.]*?\btokens?\b/g)) {
    const t = { count: count(m[1]), power: Number(m[2]), evasion: /\bwith (?:flying|menace|trample)\b/.test(o.slice(m.index, m.index + 160)) ? 'evasive' : 'ground' }
    if (t.power <= 0) continue
    ;(recurringBefore(o, m.index) ? p.recurringTokens : p.tokens).push(t)
  }
  for (const m of o.matchAll(/\b(?:deals? (\d+|x) damage to each opponent|each opponent loses (\d+|x) life)/g)) {
    const v = count(m[1] || m[2])
    if (recurringBefore(o, m.index)) p.drainPerTurn += v; else p.burnTable += v
  }
  for (const m of o.matchAll(/\bdeals? (\d+|x) damage to (?:any target|target player|target opponent|target player or planeswalker)/g)) if (!recurringBefore(o, m.index)) p.burnOne += count(m[1])
  const anthem = o.match(/\bcreatures you control get \+(\d+)\/\+\d+(?! until end of turn)/)
  if (anthem && !/until end of turn/.test(o.slice(anthem.index, anthem.index + 60))) p.anthem = Number(anthem[1])
  const pump = o.match(/\bcreatures you control get \+(\d+|x)\/\+(?:\d+|x)[^.]{0,40}until end of turn/)
  if (pump) p.pump = pump[1] === 'x' ? 3 : Number(pump[1])
  const useful = p.power > 0 || p.tokens.length || p.recurringTokens.length || p.burnTable || p.burnOne || p.drainPerTurn || p.anthem || p.pump || p.extraCombat
  return useful ? p : null
}

function percentileOf(xs, q) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]
}

function tutorRule(c) {
  const o = text(c), m = o.match(/search your library for (?:a|an|up to one)\s*([^.]*?)\s*cards?\b/)
  if (!m || !(c.tags || []).includes('tutor')) return null
  const want = m[1], types = ['creature', 'artifact', 'enchantment', 'instant', 'sorcery', 'planeswalker', 'land'].filter(t => new RegExp(`\\b${t}\\b`).test(want))
  const mv = want.match(/mana value (\d+) or less/) || o.match(/with mana value (\d+) or less/)
  const destination = /onto the battlefield/.test(o) ? 'battlefield' : /on top of your library|on top\b/.test(o) && !/into your hand/.test(o) ? 'top' : 'hand'
  return { types, maxMv: mv ? Number(mv[1]) : null, destination }
}
const tutorFinds = (rule, piece) => (!rule.types.length || rule.types.some(t => new RegExp(`\\b${t}\\b`, 'i').test(piece.type || ''))) && (rule.maxMv == null || Number(piece.cmc || 0) <= rule.maxMv)

export function winComboLines(cards = [], commanders = [], externalCombos = []) {
  const all = [...cards, ...commanders], names = new Set(all.map(c => key(c.name))), lines = [], engines = [], same = (a, b) => a.length === b.length && a.every(x => b.includes(x))
  for (const co of KNOWN_COMBOS) {
    if (!co.cards.every(n => names.has(key(n)))) continue
    if (CATALOG_WIN_LINES.has(co.name)) lines.push({ name: co.name, pieces: co.cards.map(key), source: 'aeon-catalog', manaNeeded: 0 })
    else if (CATALOG_ENGINES[co.name]) engines.push({ name: co.name, pieces: co.cards.map(key), source: 'aeon-catalog', manaNeeded: 0, kind: CATALOG_ENGINES[co.name] })
  }
  for (const co of externalCombos || []) {
    const pieces = (co.cards || []).map(key), result = co.result || ''
    if (!pieces.length || pieces.length > 5 || !pieces.every(x => names.has(x)) || lines.some(l => same(l.pieces, pieces))) continue
    const line = { name: co.cards.join(' + '), pieces, source: 'commander-spellbook', manaNeeded: manaValue(co.manaNeeded) }
    if (WIN_RESULT.test(result)) lines.push(line)
    else if (MANA_ENGINE.test(result) && !/only be spent/i.test(result)) engines.push({ ...line, kind: 'mana' })
    else if (DRAW_ENGINE.test(result)) engines.push({ ...line, kind: 'draw' })
    else if (STORM_ENGINE.test(result)) engines.push({ ...line, kind: 'storm' })
  }
  // Engine + finisher = a win line with one more piece (at most 3 finishers per engine, cheapest first).
  const finishers = { mana: all.filter(manaFinisher), draw: all.filter(drawFinisher), storm: all.filter(stormFinisher) }
  for (const e of engines) {
    for (const f of finishers[e.kind].sort((a, b) => Number(a.cmc || 0) - Number(b.cmc || 0)).slice(0, 3)) {
      const pieces = [...new Set([...e.pieces, key(f.name)])]
      if (!lines.some(l => same(l.pieces, pieces))) lines.push({ name: `${e.name} → ${f.name}`, pieces, source: `${e.source}+finisher`, manaNeeded: e.manaNeeded })
    }
  }
  return lines
}

// Contested table: blockers and chump attacks cut ground damage; evasion keeps most of it. Burn, drain and combos are not blocked.
export const CONTESTED_RESISTANCE = { evasive: 0.85, partial: 0.7, ground: 0.5 }

export function simulateWinClock({ cards = [], commanders = [], externalCombos = [], iterations = 1000, rng = Math.random, maxTurn = WIN_CLOCK_MAX_TURN } = {}) {
  const commanderList = commanders.filter(Boolean), commander = commanderList[0] || null
  const libBase = cards.filter(c => !commanderList.some(k => key(k.name) === key(c.name)) || c.__keepIn99)
  const allCards = [...libBase, ...commanderList]
  const profiles = new Map(allCards.map(c => [c, clockProfile(c)]))
  const tutors = new Map(libBase.map(c => [c, tutorRule(c)]).filter(([, r]) => r))
  const lines = winComboLines(libBase, commanderList, externalCombos)
  const cmcOf = name => Number(allCards.find(c => key(c.name) === name)?.cmc || 0)
  const out = { goldfish: { win: [], firstKill: [] }, contested: { win: [], firstKill: [] } }
  const sources = { combat: 0, commander: 0, poison: 0, drain: 0, combo: 0 }
  const lineStats = lines.map(l => ({ name: l.name, source: l.source, pieces: l.pieces.length, wins: [], tutored: 0 }))
  const driverCounts = new Map(), fastManaT1 = new Map()
  let fastManaT1Games = 0, estimatedPower = 0, contestedWins = 0
  for (const p of profiles.values()) if (p?.powerEstimated) estimatedPower++

  for (let it = 0; it < iterations; it++) {
    let { lib, hand } = K.openingHand(libBase, commander, rng)
    const used = new Set(), battlefield = [], activeSources = [], board = [], tokens = [], damageBy = new Map(), cast = new Set()
    const tables = [{ id: 'goldfish', factor: () => 1 }, { id: 'contested', factor: ev => (ev ? CONTESTED_RESISTANCE[ev] ?? 1 : 1) }]
      .map(t => ({ ...t, opps: Array.from({ length: OPPONENTS }, () => ({ life: LIFE, poison: 0, cmd: 0, dead: false })), firstKill: null, win: null, source: null }))
    let pendingSources = [], tutoredCombo = false, comboLine = null, fastMana = false
    const credit = (name, v) => damageBy.set(name, (damageBy.get(name) || 0) + v)
    const alive = tb => tb.opps.filter(o => !o.dead)
    const done = () => tables.every(tb => tb.win != null)
    const settle = (turn, source) => {
      for (const tb of tables) {
        for (const o of tb.opps) if (!o.dead && (o.life <= 0 || o.poison >= POISON || o.cmd >= COMMANDER_DAMAGE)) o.dead = true
        if (tb.firstKill == null && tb.opps.some(o => o.dead)) tb.firstKill = turn
        if (tb.win == null && tb.opps.every(o => o.dead)) { tb.win = turn; tb.source = source }
      }
    }
    const hit = (amount, { poison = 0, commander: isCmd = false, infect = false, evasion = null } = {}) => {
      for (const tb of tables) {
        const target = alive(tb)[0]; if (!target) continue
        const f = tb.factor(evasion), v = amount * f
        if (infect) target.poison += v; else target.life -= v
        target.poison += poison * f
        if (isCmd) target.cmd += v
      }
    }
    const eachOpponent = amount => { for (const tb of tables) for (const o of alive(tb)) o.life -= amount }

    for (let turn = 1; turn <= maxTurn && !done(); turn++) {
      activeSources.push(...pendingSources); pendingSources = []
      K.refreshConditionalLandSources(battlefield, activeSources)
      if (lib.length) hand.push(lib.shift())
      for (const c of battlefield) for (const t of profiles.get(c)?.recurringTokens || []) tokens.push({ ...t, entered: turn, from: c.name })

      const land = K.chooseLand(hand, used, commander, battlefield)
      if (land) {
        used.add(land); battlefield.push(land)
        const landCount = battlefield.filter(c => c.isLand).length, src = landManaSources(land, battlefield), fetch = K.fetchLandInfo(land)
        const delayed = !!fetch && fetch.delayed && !(fetch.fabled && landCount >= 4)
        if (K.alwaysTappedLand(land) || delayed) pendingSources.push(...src); else activeSources.push(...src)
        K.refreshConditionalLandSources(battlefield, activeSources)
      }
      let turnSources = [...activeSources]
      const pay = c => { const rest = K.payAndRemain(c, turnSources); if (!rest) return false; turnSources = rest; used.add(c); return true }

      for (let n = 0; n < 8; n++) { // ramp first, same policy as the access simulator
        if (commander && !cast.has(commander) && canPay(commander, K.potentialSources(turnSources, hand, used, true, battlefield))) break
        const choice = K.castableCards(hand, used, turnSources, K.isPermanentRamp).map(card => ({ card, support: permanentRampSupport(card, hand, used, battlefield, commander) })).filter(x => x.support).sort((a, b) => K.rampValue(b.card) - K.rampValue(a.card) || a.card.name.localeCompare(b.card.name))[0]
        if (!choice) break
        const remaining = K.payAndRemain(choice.card, turnSources); if (!remaining) break
        const produced = K.permanentRampSources(choice.card, commander, choice.support)
        used.add(choice.card); for (const x of choice.support.consume || []) used.add(x)
        if (K.isPermanentCard(choice.card)) battlefield.push(choice.card)
        if (K.isArtifact(choice.card)) { activeSources.push(...produced); turnSources = [...remaining, ...produced] } else { turnSources = [...remaining]; pendingSources.push(...produced) }
        if (turn === 1 && (choice.card.tags || []).includes('fast-mana')) { fastMana = true; fastManaT1.set(choice.card.name, (fastManaT1.get(choice.card.name) || 0) + 1) }
      }

      // Tutors fetch a missing piece of the closest win line (restricted by type / mana value / destination), then the line fires if affordable.
      if (lines.length) {
        const zoneOf = name => battlefield.some(c => key(c.name) === name) ? 'battlefield' : hand.some(c => !used.has(c) && key(c.name) === name) ? 'hand' : commanderList.some(c => key(c.name) === name) ? 'command' : lib.some(c => key(c.name) === name) ? 'library' : 'gone'
        for (const [tutor, rule] of tutors) {
          if (used.has(tutor) || !hand.includes(tutor) || !canPay(tutor, turnSources)) continue
          // Closest line first; a restricted tutor (instant, creature, mana value…) falls back to the next line it can help.
          const plan = lines.map(l => ({ l, missing: l.pieces.filter(x => zoneOf(x) === 'library') })).filter(x => x.missing.length && x.l.pieces.every(p => zoneOf(p) !== 'gone')).sort((a, b) => a.missing.length - b.missing.length)
          let piece = null
          for (const x of plan) if ((piece = lib.find(c => x.missing.includes(key(c.name)) && tutorFinds(rule, c)))) break
          if (!piece || !pay(tutor)) continue
          lib.splice(lib.indexOf(piece), 1)
          if (rule.destination === 'battlefield') battlefield.push(piece); else if (rule.destination === 'top') lib.unshift(piece); else hand.push(piece)
          tutoredCombo = true
        }
        // Rituals in hand only matter on the combo turn: about +2 net mana each (Dark Ritual, Cabal Ritual, Rite of Flame…).
        const rituals = hand.filter(c => !used.has(c) && (c.tags || []).includes('fast-mana') && /\b(?:instant|sorcery)\b/i.test(c.type || '')).length
        const mana = K.maxManaCount(turnSources) + rituals * 2
        for (const [i, l] of lines.entries()) {
          const zones = l.pieces.map(zoneOf)
          if (zones.some(z => z === 'library' || z === 'gone')) continue
          // ponytail: Spellbook "mana needed" may or may not include casting the pieces; take the larger of the two totals.
          const cost = Math.max(l.pieces.reduce((s, name, j) => s + (zones[j] === 'battlefield' ? 0 : cmcOf(name)), 0), l.manaNeeded)
          if (cost <= mana) { comboLine = i; break }
        }
        if (comboLine != null) {
          for (const tb of tables) { if (tb.firstKill == null) tb.firstKill = turn; if (tb.win == null) { tb.win = turn; tb.source = 'combo' } }
          lineStats[comboLine].wins.push(turn); if (tutoredCombo) lineStats[comboLine].tutored++
          for (const p of lines[comboLine].pieces) credit(p, 1000)
          break
        }
      }

      for (const k of commanderList) if (!cast.has(k) && canPay(k, turnSources)) { const rest = K.payAndRemain(k, turnSources); if (rest) { turnSources = rest; cast.add(k); battlefield.push(k); if (profiles.get(k)?.power) board.push({ card: k, p: profiles.get(k), entered: turn, commander: true }) } }

      // Deploy clock-relevant spells, best expected damage first; spells that do nothing for the clock are not cast.
      const anthem = () => battlefield.reduce((s, c) => s + (profiles.get(c)?.anthem || 0), 0)
      const attackers = () => board.filter(b => b.p.canAttack).length + tokens.reduce((s, t) => s + t.count, 0)
      let pumpThisTurn = 0, extraCombat = battlefield.some(c => profiles.get(c)?.extraCombat && K.isPermanentCard(c))
      for (let guard = 0; guard < 12; guard++) {
        const a = anthem(), n = Math.max(1, alive(tables[1]).length)
        const value = c => { const p = profiles.get(c); if (!p) return 0; return (p.creature && p.canAttack ? (p.power + a) * (p.double ? 2 : 1) * (p.haste ? 2 : 1) : 0) + p.tokens.reduce((s, t) => s + t.count * (t.power + a), 0) + p.recurringTokens.reduce((s, t) => s + t.count * t.power * 2, 0) + (p.burnTable + p.drainPerTurn * 2) * n + p.burnOne + (p.anthem + p.pump) * attackers() + (p.extraCombat ? attackers() * 2 : 0) }
        const next = hand.filter(c => !used.has(c) && !c.isLand && value(c) > 0 && canPay(c, turnSources)).sort((x, y) => value(y) - value(x) || Number(x.cmc || 0) - Number(y.cmc || 0))[0]
        if (!next || !pay(next)) break
        const p = profiles.get(next)
        if (K.isPermanentCard(next)) battlefield.push(next)
        if (p.creature) board.push({ card: next, p, entered: turn })
        for (const t of p.tokens) tokens.push({ ...t, entered: turn, from: next.name })
        if (p.burnTable) { eachOpponent(p.burnTable); credit(next.name, p.burnTable * n) }
        if (p.burnOne) { hit(p.burnOne); credit(next.name, p.burnOne) }
        if (p.pump) pumpThisTurn += p.pump
        if (p.extraCombat && !K.isPermanentCard(next)) extraCombat = true
      }
      settle(turn, 'drain')

      // Combat: everything that can attack does, focus-firing one opponent at a time.
      for (let combat = 0; combat < (extraCombat ? 2 : 1) && !done(); combat++) {
        const a = anthem() + pumpThisTurn
        for (const b of board) {
          if (!b.p.canAttack || (b.entered >= turn && !b.p.haste)) continue
          const dmg = (b.p.power + a) * (b.p.double ? 2 : 1)
          if (dmg <= 0) continue
          hit(dmg, { poison: b.p.toxic, commander: !!b.commander, infect: b.p.infect, evasion: b.p.evasion }); credit(b.card.name, dmg)
          settle(turn, b.p.infect || b.p.toxic ? 'poison' : b.commander ? 'commander' : 'combat')
        }
        for (const t of tokens) {
          if (t.entered >= turn) continue
          const dmg = t.count * (t.power + a)
          hit(dmg, { evasion: t.evasion }); credit(t.from, dmg)
          settle(turn, 'combat')
        }
      }
      const drain = battlefield.reduce((s, c) => s + (profiles.get(c)?.drainPerTurn || 0), 0)
      if (drain) { eachOpponent(drain); for (const c of battlefield) if (profiles.get(c)?.drainPerTurn) credit(c.name, profiles.get(c).drainPerTurn) }
      settle(turn, 'drain')
    }

    if (fastMana) fastManaT1Games++
    for (const tb of tables) { out[tb.id].firstKill.push(tb.firstKill ?? maxTurn + 1); out[tb.id].win.push(tb.win ?? maxTurn + 1) }
    const contested = tables[1]
    if (contested.firstKill != null) {
      contestedWins++
      sources[contested.source || (comboLine != null ? 'combo' : 'combat')]++
      const total = [...damageBy.values()].reduce((s, v) => s + v, 0) || 1
      for (const [name, v] of damageBy) if (v / total >= 0.12) { const row = driverCounts.get(name) || { kills: 0, turns: [] }; row.kills++; row.turns.push(contested.firstKill); driverCounts.set(name, row) }
    }
  }

  const share = (xs, t) => Math.round(xs.filter(x => x <= t).length / Math.max(1, xs.length) * 1000) / 10
  const dist = xs => ({ p20: percentileOf(xs, 0.2), median: percentileOf(xs, 0.5), p80: percentileOf(xs, 0.8), byTurn: Array.from({ length: maxTurn }, (_, i) => ({ turn: i + 1, cumulative: share(xs, i + 1) })), neverByMax: Math.round(xs.filter(t => t > maxTurn).length / Math.max(1, xs.length) * 1000) / 10 })
  const before = xs => Object.fromEntries([4, 5, 6, 7, 8, 9, 10].map(t => [t, share(xs, t)]))
  const C = out.contested, G = out.goldfish, fastTurn = percentileOf(C.firstKill, 0.2)
  const drivers = [...driverCounts.entries()].map(([name, row]) => ({ name, share: Math.round(row.kills / Math.max(1, contestedWins) * 1000) / 10, fastShare: Math.round(row.turns.filter(t => t <= fastTurn).length / Math.max(1, C.firstKill.filter(t => t <= fastTurn).length) * 1000) / 10 })).sort((a, b) => b.share - a.share).slice(0, 8)
  return {
    modelVersion: WIN_CLOCK_VERSION, iterations, maxTurn,
    // Headline: contested table (realistic). Goldfish: speed ceiling with no blockers.
    firstKill: dist(C.firstKill), win: dist(C.win), firstKillBefore: before(C.firstKill), winBefore: before(C.win),
    goldfish: { firstKill: dist(G.firstKill), win: dist(G.win), firstKillBefore: before(G.firstKill), winBefore: before(G.win) },
    sources: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, Math.round(v / Math.max(1, contestedWins) * 1000) / 10])),
    combos: lineStats.map(l => ({ name: l.name, source: l.source, pieces: l.pieces, winBefore: Object.fromEntries([4, 5, 6, 7, 8, 9, 10].map(t => [t, Math.round(l.wins.filter(x => x <= t).length / Math.max(1, iterations) * 1000) / 10])), firstWin: percentileOf(l.wins, 0.5), tutoredShare: Math.round(l.tutored / Math.max(1, l.wins.length) * 1000) / 10 })),
    fastManaTurn1: { share: Math.round(fastManaT1Games / Math.max(1, iterations) * 1000) / 10, byCard: Object.fromEntries([...fastManaT1].map(([n, v]) => [n, Math.round(v / Math.max(1, iterations) * 1000) / 10])) },
    drivers,
    // A tutor-heavy deck with no detected win line is almost surely faster than this clock says: say it instead of hiding it.
    coverage: { combos: lines.length, catalogCombos: lines.filter(l => l.source === 'aeon-catalog').length, externalCombos: lines.filter(l => l.source !== 'aeon-catalog').length, estimatedPowerCards: estimatedPower, tutors: tutors.size, warning: tutors.size >= 4 && !lines.length ? 'tutors-without-detected-win-line' : null },
    assumptions: ['contested: ground damage x0.5, trample/menace x0.7, evasive x0.85; burn, drain and combos unblocked', 'goldfish: no blockers, no interaction', 'opponents-40-life-x3, focus-fire-one-opponent', 'combo fires when all pieces and total mana are available', 'tutors only fetch win-line pieces', 'spells that do not advance the clock are not cast'],
  }
}
