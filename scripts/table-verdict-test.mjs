import assert from 'node:assert/strict'
import { featureDeck } from '../src/engine/cardFeatures.js'
import { simulateWinClock, winComboLines } from '../src/engine/winClock.js'
import { deckFacts, estimateBracket } from '../src/engine/bracketEstimate.js'
import { normalizeCharter, encodeCharter, decodeCharter, evaluateCharter } from '../src/engine/tableCharter.js'

const C = (name, type, cmc, manaCost, oracle, extra = {}) => ({ name, type, cmc, manaCost, oracle, colorIdentity: [], ...extra })
const seeded = (s = 7) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
const many = (n, f) => Array.from({ length: n }, (_, i) => f(i))
const island = () => C('Island', 'Basic Land — Island', 0, '', '({T}: Add {U}.)')
const swamp = () => C('Swamp', 'Basic Land — Swamp', 0, '', '({T}: Add {B}.)')
const bear = i => C(`Bear ${i}`, 'Creature — Bear', 2, '{1}{B}', '', { power: '2', toughness: '2' })
const commander = C('Test Commander', 'Legendary Creature — Human', 4, '{2}{U}{B}', '', { power: '3', toughness: '3' })

// --- Win clock: contested table never kills faster than the goldfish table, and first kill comes before the table win.
const beatdown = featureDeck([...many(19, island), ...many(19, swamp), ...many(61, bear)])
const k = simulateWinClock({ cards: beatdown, commanders: featureDeck([commander]), iterations: 300, rng: seeded() })
assert.ok(k.firstKill.median >= k.goldfish.firstKill.median, 'contested first kill cannot be faster than goldfish')
assert.ok(k.firstKill.median <= k.win.median, 'first kill comes before the table win')
assert.ok(k.firstKillBefore[10] >= k.firstKillBefore[6], 'cumulative shares are monotonic')
assert.equal(k.coverage.combos, 0)

// --- Combo lines: tutors make a two-card win line fire earlier.
const oracle = C("Thassa's Oracle", 'Creature — Merfolk Wizard', 2, '{U}{U}', "When Thassa's Oracle enters the battlefield, look at the top X cards of your library, where X is your devotion to blue. If X is greater than or equal to the number of cards in your library, you win the game.", { power: '1', toughness: '3' })
const consult = C('Demonic Consultation', 'Instant', 1, '{B}', 'Choose a card name. Exile the top six cards of your library, then reveal cards from the top of your library until you reveal a card with the chosen name.')
const tutor = i => C(`Demonic Tutor ${i}`, 'Sorcery', 2, '{1}{B}', 'Search your library for a card, put that card into your hand, then shuffle.')
const comboDeck = withTutors => featureDeck([...many(19, island), ...many(19, swamp), oracle, consult, ...many(withTutors ? 8 : 0, tutor), ...many(withTutors ? 51 : 59, bear)])
const fast = simulateWinClock({ cards: comboDeck(true), commanders: featureDeck([commander]), iterations: 400, rng: seeded(3) })
const slow = simulateWinClock({ cards: comboDeck(false), commanders: featureDeck([commander]), iterations: 400, rng: seeded(3) })
assert.equal(fast.coverage.combos, 1)
assert.ok(fast.combos[0].winBefore[6] > slow.combos[0].winBefore[6], `tutors must speed the combo up (${fast.combos[0].winBefore[6]} vs ${slow.combos[0].winBefore[6]})`)
assert.ok(fast.combos[0].tutoredShare > 0)

// --- Engines need a finisher: infinite mana + X spell is a win line, infinite mana alone is not.
const basalt = C('Basalt Monolith', 'Artifact', 3, '{3}', "Basalt Monolith doesn't untap during your untap step.\n{T}: Add {C}{C}{C}.\n{3}: Untap Basalt Monolith.")
const power = C('Power Artifact', 'Enchantment — Aura', 2, '{U}{U}', "Enchant artifact\nEnchanted artifact's activated abilities cost {2} less to activate.")
const ballista = C('Walking Ballista', 'Artifact Creature — Construct', 0, '{X}{X}', 'Walking Ballista enters the battlefield with X +1/+1 counters on it.\nRemove a +1/+1 counter from Walking Ballista: It deals 1 damage to any target.', { power: '0', toughness: '0' })
const engine = [{ cards: ['Basalt Monolith', 'Power Artifact'], result: 'Infinite colorless mana', manaNeeded: '' }]
assert.deepEqual(winComboLines([basalt, power], [commander], engine), [])
const withFinisher = winComboLines([basalt, power, ballista], [commander], engine)
assert.equal(withFinisher.length, 1)
assert.deepEqual(withFinisher[0].pieces.sort(), ['basalt monolith', 'power artifact', 'walking ballista'])
// Spellbook "mana needed" counts generic mana by value: {4}{B}{B}{B} is 7, not 4 symbols.
const peer = winComboLines([C('Peer into the Abyss', 'Sorcery', 7, '{4}{B}{B}{B}', ''), C('Sheoldred, the Apocalypse', 'Legendary Creature', 4, '{2}{B}{B}', '')], [commander], [{ cards: ['Sheoldred, the Apocalypse', 'Peer into the Abyss'], result: 'Near-infinite damage', manaNeeded: '{4}{B}{B}{B}' }])
assert.equal(peer[0].manaNeeded, 7)

// --- Bracket estimate: highest floor wins, brackets 1 and 5 stay intents.
const slowClock = { firstKillBefore: { 4: 0, 5: 0, 6: 0, 7: 1, 8: 3, 9: 8, 10: 20 }, firstKill: { median: 11, p20: 10 }, drivers: [] }
const facts = (over = {}) => ({ gameChangers: [], fastMana: [], tutors: [], extraTurns: [], massLandDenial: [], landLock: [], stax: [], lockPotential: 0, tempoDenial: [], tempoDenialRecurring: [], theft: [], combos: [], twoCardCombos: [], clock: slowClock, ...over })
const casual = estimateBracket(facts())
assert.equal(casual.bracket, 2)
assert.equal(casual.b1Compatible, true)
assert.deepEqual(casual.binding, ['baseline'])
assert.equal(estimateBracket(facts({ gameChangers: ['Rhystic Study'] })).bracket, 3)
assert.deepEqual(estimateBracket(facts({ gameChangers: ['Rhystic Study'] })).range, [3, 3], 'one Game Changer is a plain bracket 3')
assert.equal(estimateBracket(facts({ gameChangers: ['A', 'B', 'C', 'D'] })).bracket, 4)
assert.equal(estimateBracket(facts({ massLandDenial: ['Armageddon'] })).bracket, 4)
assert.equal(estimateBracket(facts({ extraTurns: ['Time Warp'] })).bracket, 2, 'a single extra turn stays bracket 2')
const lateCombo = estimateBracket(facts({ combos: [{ name: 'X', pieces: 3, winBefore: { 6: 2 } }] }))
assert.equal(lateCombo.bracket, 3)
assert.equal(estimateBracket(facts({ combos: [{ name: 'X', pieces: 2, winBefore: { 6: 25 } }] })).bracket, 4)
const turbo = estimateBracket(facts({ gameChangers: many(10, i => `GC${i}`), clock: { firstKillBefore: { 4: 55, 5: 70, 6: 80, 7: 90, 8: 95, 9: 97, 10: 99 }, firstKill: { median: 4, p20: 3 }, drivers: [] } }))
assert.equal(turbo.bracket, 5)
assert.equal(turbo.cedhSpeed, true)
assert.equal(estimateBracket(facts({ clock: null })).floors.find(f => f.id === 'speed').status, 'unknown')

// deckFacts reads friction evidence and tags.
const tagged = featureDeck([C('Sol Ring', 'Artifact', 1, '{1}', '{T}: Add {C}{C}.'), C('Time Warp', 'Sorcery', 5, '{3}{U}{U}', 'Target player takes an extra turn after this one.')])
const f = deckFacts({ friction: { signals: { landLock: { evidence: [{ name: 'Blood Moon' }] }, tempoDenial: { evidence: [{ name: 'Summon: Valefor', recurring: true }] } } }, clock: null }, tagged, { gameChangers: ['Rhystic Study'] })
assert.deepEqual(f.landLock, ['Blood Moon'])
assert.deepEqual(f.tempoDenialRecurring, ['Summon: Valefor'])
assert.ok(f.fastMana.includes('Sol Ring'))
assert.ok(f.extraTurns.includes('Time Warp'))

// --- Table charter: share code round trip, invalid values ignored, every check explains itself.
const charter = normalizeCharter({ preset: 3, fastMana: 'sol-ring-only', comboMinTurn: 8, stax: 'nonsense', maxTutors: -4 })
assert.equal(charter.fastMana, 'sol-ring-only')
assert.equal(charter.stax, 'allowed', 'invalid option keeps the preset value')
assert.equal(charter.maxTutors, 0)
assert.deepEqual(decodeCharter(encodeCharter(charter)), charter)
assert.equal(decodeCharter('%%%'), null)
const deck = facts({ fastMana: ['Sol Ring', 'Mana Crypt'], tempoDenial: ['Summon: Valefor'], combos: [{ name: 'Thoracle + Consultation', pieces: 2, winBefore: { 4: 5, 5: 12, 6: 20, 7: 30 } }] })
const verdict = evaluateCharter({ preset: 3, fastMana: 'sol-ring-only', tempoDenial: 'announce' }, deck)
const check = id => verdict.checks.find(c => c.id === id)
assert.equal(check('fast-mana').status, 'out')
assert.deepEqual(check('fast-mana').cards, ['Mana Crypt'])
assert.equal(check('combos').status, 'discuss', '20% of games combo before turn 7: worth a talk')
assert.equal(check('tempo-denial').status, 'announce')
assert.equal(verdict.verdict, 'out')
assert.ok(verdict.culprits.includes('Mana Crypt') && !verdict.culprits.includes('Sol Ring'))
assert.equal(evaluateCharter({ preset: 4 }, deck).verdict, 'ok')
assert.equal(evaluateCharter({ preset: 2 }, deck).checks.find(c => c.id === 'combos').status, 'out', 'bracket 2 preset: no game-ending combos')

console.log('TABLE VERDICT OK — win clock, engines + finishers, bracket floors, table charter')
