import assert from 'node:assert/strict'
import { deckDiff,gameChangersIn,pairFit,podSummary,resultDelta } from '../src/productData.js'

assert.deepEqual(gameChangersIn(["Serra's Sanctum",'Farewell','Sol Ring']),["Serra's Sanctum",'Farewell'].sort((a,b)=>a.localeCompare(b)))
assert.deepEqual(gameChangersIn(['Serra’s Sanctum']),["Serra's Sanctum"])

const diff=deckDiff('1 Sol Ring\n2 Island\n1 Forest','1 Sol Ring\n1 Island\n2 Forest\n1 Arcane Signet')
assert.deepEqual(diff.added,[{name:'Arcane Signet',qty:1},{name:'Forest',qty:1}])
assert.deepEqual(diff.removed,[{name:'Island',qty:1}])
assert.equal(diff.changes,3)

const closeA={deckName:'A',commanderNames:['A'],median:55,p20:48,p80:63,peak:72}
const closeB={deckName:'B',commanderNames:['B'],median:57,p20:50,p80:65,peak:74}
const far={deckName:'C',commanderNames:['C'],median:70,p20:64,p80:77,peak:92}
assert.equal(pairFit(closeA,closeB).label,'close')
assert.equal(pairFit(closeA,far).label,'mismatch')
assert.equal(podSummary([closeA,closeB]).fit,'close')
assert.equal(podSummary([closeA,closeB,far]).fit,'mismatch')

const delta=resultDelta({profile:{median:50,floor:42,ceiling:58,peak:70},simulation:{commanderMedianTurn:5}},{profile:{median:54,floor:46,ceiling:61,peak:76},simulation:{commanderMedianTurn:4}})
assert.deepEqual(delta,{median:4,floor:4,ceiling:3,peak:6,commanderTurn:-1})

console.log('PRODUCT DATA OK — Game Changers, deck diff, Pod Match, what-if deltas')
