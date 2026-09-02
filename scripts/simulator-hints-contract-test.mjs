import assert from 'node:assert/strict'
import {
  buildSimulatorHints,
  SIMULATOR_HINT_SAFETY,
  SIMULATOR_HINT_SCHEMA_VERSION
} from '../src/interop/simulatorHints.js'

const hintIds = card => buildSimulatorHints(card).hints.map(hint => hint.id)

const tokenCounterCard = {
  oracleId: 'token-counter-card',
  name: 'Test Engine',
  type_line: 'Creature — Test',
  oracle_text: 'When this creature enters, create a 1/1 green Saproling creature token, then put a +1/+1 counter on target creature you control.'
}
const tokenCounter = buildSimulatorHints(tokenCounterCard)
assert.equal(tokenCounter.schemaVersion, SIMULATOR_HINT_SCHEMA_VERSION)
assert.equal(tokenCounter.safety, SIMULATOR_HINT_SAFETY)
assert.ok(tokenCounter.source.engineVersion)
assert.ok(tokenCounter.source.semanticVersion)
assert.ok(hintIds(tokenCounterCard).includes('associated-tokens'))
assert.ok(hintIds(tokenCounterCard).includes('counters'))

assert.ok(hintIds({
  name: 'Sacrifice Test',
  type_line: 'Artifact',
  oracle_text: 'Sacrifice another creature: Draw a card.'
}).includes('sacrifice'))

assert.ok(hintIds({
  name: 'Aura Test',
  type_line: 'Enchantment — Aura',
  oracle_text: 'Enchant creature\nEnchanted creature gets +1/+1.'
}).includes('aura-attachment'))

assert.ok(hintIds({
  name: 'Equipment Test',
  type_line: 'Artifact — Equipment',
  oracle_text: 'Equipped creature gets +2/+0.'
}).includes('equipment-attachment'))

const noisyOpponentCard = buildSimulatorHints({
  name: 'Opponent Gift',
  type_line: 'Sorcery',
  oracle_text: 'Target opponent creates two Treasure tokens and draws two cards.'
})
assert.equal(
  noisyOpponentCard.hints.some(hint => hint.id === 'associated-tokens'),
  false,
  'Existing Aeon directionality must prevent opponent-only token production from becoming a simulator hint'
)

const serialized = JSON.stringify(tokenCounter)
for (const forbidden of [
  '"amount"',
  '"quantity"',
  '"target"',
  '"targets"',
  '"execute"',
  '"action"',
  '"trigger"',
  '"automatic"'
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    `Interop payload must never expose executable field ${forbidden}`
  )
}

assert.deepEqual(
  Object.keys(tokenCounter).sort(),
  ['cardKey', 'hints', 'safety', 'schemaVersion', 'source'].sort(),
  'Interop contract stays intentionally small and non-executable'
)

console.log('SIMULATOR HINT CONTRACT OK — semantic output is suggestion-only and non-executable')
