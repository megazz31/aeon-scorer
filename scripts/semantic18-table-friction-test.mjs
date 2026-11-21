import assert from 'node:assert/strict'
import { featureDeck } from '../src/engine/cardFeatures.js'
import { buildTableFriction } from '../src/engine/frictionModel.js'

const C = (name, type, cmc, oracle) => ({ name, type, cmc, manaCost: '', oracle, colorIdentity: [] })
const cards = featureDeck([
  C('Unsummon', 'Instant', 1, "Return target creature to its owner's hand."),
  C('Into the Roil', 'Instant', 2, "Kicker {1}{U}\nReturn target nonland permanent to its owner's hand. If this spell was kicked, draw a card."),
  C('Cyclonic Rift', 'Instant', 2, "Return target nonland permanent you don't control to its owner's hand.\nOverload {6}{U}"),
  C('Time Warp', 'Sorcery', 5, 'Target player takes an extra turn after this one.'),
  C('Summon: Valefor', 'Enchantment Creature — Saga Drake', 5, "(As this Saga enters and after your draw step, add a lore counter. Sacrifice after IV.)\nI — Sonic Wings — Each opponent chooses a creature with the greatest mana value among creatures they control. Return those creatures to their owners' hands.\nII, III, IV — Tap up to one target creature and put a stun counter on it.\nFlying"),
  C('Ephemerate', 'Instant', 1, 'Exile target creature you control, then return it to the battlefield under its owner\'s control.\nRebound'),
  C('Blood Moon', 'Enchantment', 3, 'Nonbasic lands are Mountains.'),
  C('Back to Basics', 'Enchantment', 3, "Nonbasic lands don't untap during their controllers' untap steps."),
  C('Armageddon', 'Sorcery', 4, 'Destroy all lands.'),
  C('Expropriate', 'Sorcery', 9, "Council's dilemma — Starting with you, each player votes for time or money. For each time vote, take an extra turn after this one. For each money vote, choose a permanent owned by the voter and gain control of it. Exile Expropriate."),
  C('Raise the Alarm', 'Instant', 2, 'Create two 1/1 white Soldier creature tokens.'),
])
const by = Object.fromEntries(cards.map(c => [c.name, c]))
const tags = name => by[name].tags

// Bounce wording "to its owner's hand" is interaction (it was 0 before semantic-18).
for (const name of ['Unsummon', 'Into the Roil', 'Cyclonic Rift']) assert.ok(tags(name).includes('removal'), `${name} must be removal`)
assert.ok(tags('Cyclonic Rift').includes('wipe'), 'Overload bounce is a one-sided mass bounce')
// "takes an extra turn" (Time Warp) is an extra turn, like "take an extra turn".
assert.ok(tags('Time Warp').includes('extra-turn'))
// Non-targeted opponent bounce + stun chapters.
assert.ok(tags('Summon: Valefor').includes('tempo-denial'))
assert.ok(by['Summon: Valefor'].interaction > 0, 'Valefor must count as interaction')
assert.ok(!tags('Raise the Alarm').includes('tempo-denial'))

const friction = buildTableFriction({}, cards).signals
const names = id => friction[id].evidence.map(e => e.name)
assert.ok(names('tempoDenial').includes('Summon: Valefor'))
assert.ok(friction.tempoDenial.evidence.find(e => e.name === 'Summon: Valefor').recurring, 'Valefor is recurring when the deck can blink it')
assert.ok(names('tempoDenial').includes('Cyclonic Rift'))
assert.ok(names('landLock').includes('Blood Moon'))
assert.ok(names('landLock').includes('Back to Basics'))
assert.ok(!names('massLandDenial').includes('Back to Basics'), 'Back to Basics is a land lock, not mass land destruction')
assert.ok(names('massLandDenial').includes('Armageddon'))
assert.ok(names('theft').includes('Expropriate'))
assert.ok(names('extraTurns').includes('Time Warp'))

// Without a way to reset it, Valefor is still tempo denial but not flagged as recurring.
const noLoop = buildTableFriction({}, cards.filter(c => c.name !== 'Ephemerate')).signals
assert.equal(noLoop.tempoDenial.evidence.find(e => e.name === 'Summon: Valefor').recurring, false)

console.log('SEMANTIC-18 TABLE FRICTION OK — bounce, extra turns, tempo denial, land locks, theft')
