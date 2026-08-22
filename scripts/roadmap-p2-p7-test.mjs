import assert from 'node:assert/strict'
import { buildDeckIntelligence,buildPodIntelligence } from '../src/engine/roadmapEngine.js'
import { formPods,repairPod } from '../src/engine/matchmaking.js'
import { explainVariantDelta,selectConstrainedVariant } from '../src/engine/deckDoctor.js'
import { validateGameObservation,summarizeRealityObservations,calibrationReadiness } from '../src/engine/realityModel.js'

function result(overrides={}){
  const r={
    profile:{median:50,floor:40,ceiling:60,peak:75,commanderDelta:4,coverage:92},
    dimensions:{speed:50,consistency:60,explosiveness:45,synergy:55,interaction:45,resilience:50},
    roles:{tutors:2,repeatableTutors:0,draw:8,fastMana:2,protection:2,recursion:3},
    packages:[{id:'artifacts',strength:70},{id:'graveyard',strength:35}],
    combos:[{name:'Test Combo',cards:['Piece A','Piece B'],severity:.8}],
    commanderNames:['Commander A'],commanderSynergy:{score:45},
    experience:{dimensions:{volatility:{score:45},turnComplexity:{score:35}}},
    friction:{signals:{resourceDenial:{score:10},massLandDenial:{score:0},extraTurns:{score:0}}},
    horizon:{curves:{
      commander:{points:[1,2,3,4,5,6,7].map(turn=>({turn,value:Math.min(100,turn*15)}))},
      engine:{points:[1,2,3,4,5,6,7].map(turn=>({turn,value:Math.min(90,turn*10)}))},
      interaction:{points:[1,2,3,4,5,6,7].map(turn=>({turn,value:Math.min(80,turn*9)}))},
      burst:{points:[1,2,3,4,5,6,7].map(turn=>({turn,value:Math.min(85,turn*8)}))},
    }},methodology:{maxTurn:7}
  }
  for(const [k,v] of Object.entries(overrides)){if(v&&typeof v==='object'&&!Array.isArray(v)&&r[k]&&typeof r[k]==='object'&&!Array.isArray(r[k]))r[k]={...r[k],...v};else r[k]=v}
  return r
}
const cards=[
  {name:'Artifact Engine',type:'Artifact',oracle:'Artifacts you control have ward {1}.',tags:['artifact-payoff']},
  {name:'Grave Loop',type:'Creature',oracle:'Return target card from your graveyard to your hand.',tags:['recursion']},
  {name:'Piece A',type:'Artifact',oracle:'',tags:[]},{name:'Piece B',type:'Creature',oracle:'',tags:[]},
]

const low=result({profile:{median:48,floor:40,ceiling:57,peak:68,commanderDelta:2},dimensions:{speed:44,explosiveness:35,interaction:50}})
const high=result({profile:{median:72,floor:62,ceiling:82,peak:96,commanderDelta:14},dimensions:{speed:78,explosiveness:88,interaction:20},friction:{signals:{resourceDenial:{score:75},massLandDenial:{score:60},extraTurns:{score:55}}}})
const lowIntel=buildDeckIntelligence(low,cards),highIntel=buildDeckIntelligence(high,cards)
assert.equal(lowIntel.modelVersion,'deck-intelligence-v1')
assert.ok(highIntel.spof.dependencies.commander.score>lowIntel.spof.dependencies.commander.score)
assert.ok(lowIntel.spof.dependencies.artifact.score>0)
assert.equal(lowIntel.comboAccessibility.lines.length,1)
assert.ok(lowIntel.vulnerability.classes.commanderRemoval.score>=0)

const compatible=buildPodIntelligence([{result:low,cards},{result:result({profile:{median:49,floor:41,ceiling:58,peak:70}}),cards},{result:result({profile:{median:51,floor:42,ceiling:60,peak:72}}),cards},{result:result({profile:{median:50,floor:40,ceiling:59,peak:71}}),cards}])
const mismatched=buildPodIntelligence([{result:high,cards},{result:low,cards},{result:low,cards},{result:low,cards}])
assert.ok(mismatched.podMatch.mismatch>compatible.podMatch.mismatch)
assert.ok(mismatched.gameQuality.risk.score>=compatible.gameQuality.risk.score)
assert.ok(mismatched.adaptiveRule0.questions.length<=3)
assert.equal(mismatched.threatAnswer.decks.length,4)

const players=[1,2,3,4,5,6,7,8].map((id,i)=>({id:`p${id}`,analysis:i<4?result({profile:{median:45+i,floor:36,ceiling:55,peak:66}}):result({profile:{median:70+(i-4),floor:60,ceiling:80,peak:92}})}))
const matched=formPods(players)
assert.equal(matched.pods.length,2)
assert.equal(matched.unassigned.length,0)
assert.deepEqual(matched.pods.flatMap(p=>p.players.map(x=>x.id)).sort(),players.map(x=>x.id).sort())
const badPod=[players[0],players[1],players[2],players[7]],alts=[players[3],players[4],players[5],players[6]]
const repair=repairPod(badPod,alts)
assert.ok(repair.repairs.length>0)
assert.ok(repair.repairs[0].after<repair.repairs[0].before)

const base=result({profile:{median:50,floor:40,ceiling:60,peak:85}}),variantA=result({profile:{median:50,floor:40,ceiling:59,peak:72}}),variantB=result({profile:{median:43,floor:35,ceiling:52,peak:60}})
const explanation=explainVariantDelta(base,variantA)
assert.equal(explanation.changes.peak,-13)
const doctor=selectConstrainedVariant(base,[{id:'A',analysis:variantA},{id:'B',analysis:variantB}],{type:'reduce-peak-preserve-median'},{minMedian:47})
assert.equal(doctor.best.id,'A')

const valid=validateGameObservation({turnBand:'5-7',winType:'combat',balance:'balanced',dominantEvent:'normal-game',podModelVersion:'pod-intelligence-v1',playgroupKey:'g1'})
assert.equal(valid.ok,true)
assert.equal(validateGameObservation({turnBand:'bad',winType:'combat',balance:'balanced',podModelVersion:'x'}).ok,false)
const observations=Array.from({length:12},(_,i)=>({turnBand:'5-7',winType:'combat',balance:i%4?'balanced':'unbalanced',dominantEvent:i%4?'normal-game':'runaway-start',podModelVersion:'pod-intelligence-v1',playgroupKey:`g${i%3}`}))
assert.equal(summarizeRealityObservations(observations).count,12)
assert.equal(calibrationReadiness(observations,{minGames:20,minPlaygroups:4}).ready,false)
assert.equal(calibrationReadiness(observations,{minGames:10,minPlaygroups:3}).ready,true)

console.log('P2-P7 ROADMAP MODELS OK — SPOF, pod intelligence, game quality, matchmaking, deck doctor and reality contracts')
