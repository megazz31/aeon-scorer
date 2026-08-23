import assert from 'node:assert/strict'
import { tuneVariantToPod } from '../src/engine/deckDoctor.js'

const analysis=(median,peak=median+15)=>({
  profile:{median,floor:median-8,ceiling:median+8,peak,commanderDelta:2,coverage:90},
  dimensions:{speed:50,consistency:55,explosiveness:45,synergy:50,interaction:45,resilience:45},
  roles:{tutors:0,repeatableTutors:0,draw:6,fastMana:0,protection:1,recursion:1},packages:[],combos:[],commanderNames:[],commanderSynergy:{score:0},
  experience:{dimensions:{volatility:{score:30},turnComplexity:{score:25}}},friction:{signals:{}},horizon:{curves:{interaction:{points:[]},burst:{points:[]},engine:{points:[]}}},methodology:{maxTurn:7}
})
const base=analysis(70,90),fit=analysis(51,68),stillHigh=analysis(66,84),peers=[analysis(49,66),analysis(50,67),analysis(52,69)]
const tuned=tuneVariantToPod(base,[{id:'fit',analysis:fit},{id:'high',analysis:stillHigh}],peers,{minMedian:48})
assert.equal(tuned.modelVersion,'targeted-pod-tuning-v1')
assert.equal(tuned.best.id,'fit')
assert.ok(tuned.best.podMismatch<tuned.baseline.podMismatch)
assert.ok(tuned.best.improvement>0)
assert.equal(tuned.confidence.candidateGeneration,'external')
assert.match(tuned.notes.join(' '),/Pod Repair/)
console.log('DECK DOCTOR POD TUNING OK — supplied variants are ranked against the actual pod')
