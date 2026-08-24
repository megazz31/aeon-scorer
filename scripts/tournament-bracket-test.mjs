import assert from 'node:assert/strict'
import { bracketCapacity,roundMatchCounts,initialGroups,dependentMatchIndex } from '../src/engine/tournamentBracket.js'
assert.equal(bracketCapacity(5,2),8)
assert.equal(bracketCapacity(8,2),8)
assert.equal(bracketCapacity(5,4),16)
assert.equal(bracketCapacity(16,4),16)
assert.deepEqual(roundMatchCounts(8,2),[4,2,1])
assert.deepEqual(roundMatchCounts(16,4),[4,1])
assert.equal(initialGroups(['a','b','c'],2).flat().length,4)
assert.equal(initialGroups(['a','b','c','d','e'],4).flat().length,16)
assert.equal(dependentMatchIndex(3,2),1)
assert.equal(dependentMatchIndex(7,4),1)
console.log('TOURNAMENT BRACKET CONTRACT OK')
