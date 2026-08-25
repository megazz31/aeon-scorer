import fs from 'node:fs'
import assert from 'node:assert/strict'

const power=fs.readFileSync(new URL('../src/engine/powerModel.js',import.meta.url),'utf8')
const mechanics=fs.readFileSync(new URL('../src/engine/commanderMechanics.js',import.meta.url),'utf8')

assert.match(mechanics,/targetCostReductionProfile/,'target-based commander discounts must use a generalized detector')
assert.match(mechanics,/targetGenericReduction/,'target-based commander discounts must reduce generic mana in a reusable primitive')
assert.match(mechanics,/topLibraryCheatProfile/,'top-library creature cheat must have a reusable commander profile')
assert.match(mechanics,/topLibraryCheatDeckStats/,'top-library creature cheat must expose structural hit probability')
assert.match(power,/commanderMechanics/,'machine-readable methodology must expose simulated commander mechanics')
assert.doesNotMatch(power,/commander-target-cost-reduction-not-simulated/,'target-cost reduction is now sequence-aware and must not be advertised as unmodeled')
assert.doesNotMatch(power,/commander-top-library-cheat-not-simulated/,'top-library free deployment is now sequence-aware and must not be advertised as unmodeled')
assert.match(power,/target-cost-reduction-x-value-conservative/,'unknown X choices remain explicitly conservative')

console.log('TARGET-COST + TOP-LIBRARY COMMANDER MECHANICS CONTRACT OK')
