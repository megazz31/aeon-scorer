import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildPodIntelligence } from '../src/engine/roadmapEngine.js'
import { buildAdvancedPodMatch } from '../src/engine/podIntelligence.js'
import { rule0AnswerKey } from '../src/engine/rule0Intent.js'
import { formPods } from '../src/engine/matchmaking.js'
import { buildCrossTableRepairs } from '../src/engine/matchRepair.js'

function result(median=50,extra={}){
  const base={
    profile:{median,floor:median-10,ceiling:median+10,peak:Math.min(100,median+22),commanderDelta:4,coverage:92},
    dimensions:{speed:50,consistency:60,explosiveness:45,synergy:55,interaction:45,resilience:50},
    roles:{tutors:2,repeatableTutors:0,draw:8,fastMana:2,protection:2,recursion:2},
    packages:[{id:'artifacts',strength:45}],
    combos:[{name:'Test Combo',cards:['Piece A','Piece B']}],
    commanderNames:['Commander A'],commanderSynergy:{score:35},
    experience:{modelVersion:'experience-v1',dimensions:{volatility:{score:35,level:'moderate'},turnComplexity:{score:30,level:'moderate'}}},
    friction:{modelVersion:'friction-v1',signals:{resourceDenial:{score:0,level:'none'},massLandDenial:{score:0,level:'none'},extraTurns:{score:0,level:'none'}}},
    horizon:{modelVersion:'goldfish-horizon-v1',curves:{
      commander:{points:[1,2,3,4,5,6,7].map(turn=>({turn,value:turn*10}))},
      engine:{points:[1,2,3,4,5,6,7].map(turn=>({turn,value:turn*8}))},
      interaction:{points:[1,2,3,4,5,6,7].map(turn=>({turn,value:turn*7}))},
      burst:{points:[1,2,3,4,5,6,7].map(turn=>({turn,value:turn*9}))},
    }},
    methodology:{maxTurn:7},
  }
  return {...base,...extra,profile:{...base.profile,...(extra.profile||{})},dimensions:{...base.dimensions,...(extra.dimensions||{})},friction:extra.friction||base.friction}
}

// Adaptive Rule 0: declared intent changes product compatibility, never capability.
const a=result(50),b=result(50)
const baseline=buildPodIntelligence([a,b])
const answers={
  [rule0AnswerKey(0,'combo-intent')]:'primary',
  [rule0AnswerKey(1,'combo-intent')]:'backup',
}
const adapted=buildPodIntelligence([a,b],{rule0Answers:answers})
assert.equal(adapted.modelVersion,'pod-intelligence-v3')
assert.equal(adapted.adaptiveRule0.modelVersion,'adaptive-rule0-v2')
assert.equal(adapted.adaptiveRule0.intentOverlay.answersApplied,2)
assert.ok(adapted.podMatch.mismatch>baseline.podMatch.mismatch)
assert.equal(adapted.podMatch.modelVersion,'advanced-pod-match-v3')
assert.deepEqual(adapted.decks[0].combos,baseline.decks[0].combos)
assert.deepEqual(adapted.decks[0].profile,baseline.decks[0].profile)
assert.equal(adapted.adaptiveRule0.intentOverlay.notes.some(x=>/never rewrite card semantics/i.test(x)),true)

// A rejected experience characteristic creates an explicit declared-intent conflict.
const denial=result(50,{friction:{modelVersion:'friction-v1',signals:{resourceDenial:{score:70,level:'high'},massLandDenial:{score:70,level:'high'},extraTurns:{score:0,level:'none'}}}})
const calm=result(50,{combos:[]})
const denialBase=buildPodIntelligence([denial,calm])
const denialQuestion=denialBase.adaptiveRule0.questions.find(q=>q.id==='land-denial-acceptance')
assert.ok(denialQuestion)
const rejected=buildPodIntelligence([denial,calm],{rule0Answers:{[rule0AnswerKey(denialQuestion.deckIndex,denialQuestion.id)]:'rejected'}})
assert.ok(rejected.podMatch.mismatch>denialBase.podMatch.mismatch)
assert.ok(rejected.podMatch.pairs.some(p=>p.reasons.declaredIntentConflict===100))

// Pod Repair V2: a deliberately bad manual layout has a real improving 1↔1 swap.
const lows=Array.from({length:4},(_,i)=>({id:`low-${i}`,name:`Low ${i}`,analysis:result(35,{combos:[]})}))
const highs=Array.from({length:4},(_,i)=>({id:`high-${i}`,name:`High ${i}`,analysis:result(80,{combos:[]})}))
const badPods=[
  {table:1,players:[lows[0],lows[1],lows[2],highs[0]]},
  {table:2,players:[highs[1],highs[2],highs[3],lows[3]]},
].map(p=>({...p,assessment:buildAdvancedPodMatch(p.players.map(x=>x.analysis))}))
const badMatch={pods:badPods,totalMismatch:badPods.reduce((s,p)=>s+p.assessment.mismatch,0)}
const repair=buildCrossTableRepairs(badMatch)
assert.equal(repair.modelVersion,'pod-repair-v2')
assert.equal(repair.evaluatedSwaps,16)
assert.equal(repair.locallyOptimal,false)
assert.ok(repair.repairs.length>0)
assert.ok(repair.repairs[0].improvement>0)
assert.ok(repair.repairs[0].after.total<repair.repairs[0].before.total)
assert.notEqual(repair.repairs[0].swap.aId,repair.repairs[0].swap.bId)

// Exact small-N matching should already be locally optimal for the current objective.
const exact=formPods([...lows,...highs])
assert.equal(exact.optimality,'exact-for-current-objective')
const exactAudit=buildCrossTableRepairs(exact)
assert.equal(exactAudit.evaluatedSwaps,16)
assert.equal(exactAudit.locallyOptimal,true)
assert.equal(exactAudit.repairs.length,0)

// Product wiring contracts: Match exposes repair audit + exact pre-game Reality prediction.
const matchPage=fs.readFileSync(new URL('../src/AeonMatchPage.jsx',import.meta.url),'utf8')
const podPage=fs.readFileSync(new URL('../src/ProductPages.jsx',import.meta.url),'utf8')
assert.ok(matchPage.includes('buildCrossTableRepairs'))
assert.ok(matchPage.includes('GameObservationForm'))
assert.ok(matchPage.includes('prediction={prediction}'))
assert.ok(matchPage.includes('buildPodIntelligence'))
assert.ok(podPage.includes('rule0Answers'))
assert.ok(podPage.includes('rule0AnswerKey'))
assert.ok(podPage.includes('prediction={observationPrediction}'))

console.log('P2-P7 V2 OK — adaptive Rule 0 overlay, cross-table repair audit and Match Reality wiring')
