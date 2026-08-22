import assert from 'node:assert/strict'
import { buildDeckIntelligence,buildPodIntelligence,buildShareableIntelligence } from '../src/engine/roadmapEngine.js'
import { buildAdvancedPodMatch } from '../src/engine/podIntelligence.js'
import { formPods,repairPod } from '../src/engine/matchmaking.js'
import { explainVariantDelta,selectConstrainedVariant } from '../src/engine/deckDoctor.js'
import { validateGameObservation,summarizeRealityObservations,evaluateRealityCalibration,calibrationReadiness } from '../src/engine/realityModel.js'
import { roadmapResultFromShare } from '../src/productData.js'

function result(overrides={}){
  const r={
    profile:{median:50,floor:40,ceiling:60,peak:75,commanderDelta:4,coverage:92},
    dimensions:{speed:50,consistency:60,explosiveness:45,synergy:55,interaction:45,resilience:50},
    roles:{tutors:2,repeatableTutors:0,draw:8,fastMana:2,protection:2,recursion:3},
    packages:[{id:'artifacts',strength:70},{id:'graveyard',strength:35}],
    combos:[{name:'Test Combo',cards:['Piece A','Piece B'],severity:.8}],
    commanderNames:['Commander A'],commanderSynergy:{score:45},
    experience:{modelVersion:'experience-v1',dimensions:{volatility:{score:45,level:'moderate',evidence:['private evidence']},turnComplexity:{score:35,level:'moderate',evidence:['private evidence']}},confidence:{productCalibration:'experimental'}},
    friction:{modelVersion:'friction-v1',signals:{resourceDenial:{score:10,level:'low',evidence:['private evidence']},massLandDenial:{score:0,level:'low'},extraTurns:{score:0,level:'low'}}},
    horizon:{modelVersion:'goldfish-horizon-v1',curves:{
      commander:{semantics:'online-by-turn',points:[1,2,3,4,5,6,7].map(turn=>({turn,value:Math.min(100,turn*15)}))},
      engine:{semantics:'available-on-turn',points:[1,2,3,4,5,6,7].map(turn=>({turn,value:Math.min(90,turn*10)}))},
      interaction:{semantics:'available-on-turn',points:[1,2,3,4,5,6,7].map(turn=>({turn,value:Math.min(80,turn*9)}))},
      burst:{semantics:'available-on-turn',points:[1,2,3,4,5,6,7].map(turn=>({turn,value:Math.min(85,turn*8)}))},
    }},methodology:{maxTurn:7}
  }
  for(const [k,v] of Object.entries(overrides)){if(v&&typeof v==='object'&&!Array.isArray(v)&&r[k]&&typeof r[k]==='object'&&!Array.isArray(r[k]))r[k]={...r[k],...v};else r[k]=v}
  return r
}
const cards=[
  {name:'Artifact Engine',type:'Artifact',oracle:'SECRET ORACLE: Artifacts you control have ward {1}.',tags:['artifact-payoff']},
  {name:'Grave Loop',type:'Creature',oracle:'Return target card from your graveyard to your hand.',tags:['recursion']},
  {name:'Hidden Counter',type:'Instant',oracle:'Counter target spell.',tags:['counterspell'],interaction:4},
  {name:'Piece A',type:'Artifact',oracle:'',tags:[]},{name:'Piece B',type:'Creature',oracle:'',tags:[]},
]

const low=result({profile:{median:48,floor:40,ceiling:57,peak:68,commanderDelta:2},dimensions:{speed:44,explosiveness:35,interaction:50}})
const high=result({profile:{median:72,floor:62,ceiling:82,peak:96,commanderDelta:14},dimensions:{speed:78,explosiveness:88,interaction:20},friction:{modelVersion:'friction-v1',signals:{resourceDenial:{score:75,level:'high'},massLandDenial:{score:60,level:'moderate'},extraTurns:{score:55,level:'moderate'}}}})
const lowIntel=buildDeckIntelligence(low,cards),highIntel=buildDeckIntelligence(high,cards)
assert.equal(lowIntel.modelVersion,'deck-intelligence-v1')
assert.ok(highIntel.spof.dependencies.commander.score>lowIntel.spof.dependencies.commander.score)
assert.ok(lowIntel.spof.dependencies.artifact.score>0)
assert.equal(lowIntel.comboAccessibility.lines.length,1)
assert.ok(lowIntel.vulnerability.classes.commanderRemoval.score>=0)
assert.equal(lowIntel.answerProfile.classes.stack.count,1)
assert.ok(lowIntel.threatProfile.threats.length>0)

const shareable=buildShareableIntelligence(low,cards),shareText=JSON.stringify(shareable)
assert.equal(shareable.privacy.decklist,false)
assert.equal(shareable.privacy.oracle,false)
assert.equal(shareable.privacy.evidenceCards,false)
assert.equal(shareText.includes('SECRET ORACLE'),false)
assert.equal(shareText.includes('Artifact Engine'),false)
assert.equal(shareText.includes('Hidden Counter'),false)
assert.equal(shareText.includes('private evidence'),false)
assert.equal(shareable.answerProfile.classes.stack.count,1)
const shareRow={share_code:'abc123def456',deck_name:'Safe deck',commander_names:['Commander A'],median:48,p20:40,p80:57,peak:68,coverage:92,dimensions:low.dimensions,packages:low.packages,combo_summary:low.combos,product_intelligence:shareable,engine_version:'3.2.0',semantic_version:'test',iterations:3200}
const roundtrip=roadmapResultFromShare(shareRow)
assert.equal(roundtrip.spof.dependencies.commander.score,shareable.spof.dependencies.commander.score)
assert.equal(roundtrip.horizon.curves.interaction.points.length,7)
assert.equal(roundtrip.answerProfile.classes.stack.count,1)
assert.ok(roundtrip.threatProfile.threats.length>0)

const compatible=buildPodIntelligence([{result:low,cards},{result:result({profile:{median:49,floor:41,ceiling:58,peak:70}}),cards},{result:result({profile:{median:51,floor:42,ceiling:60,peak:72}}),cards},{result:result({profile:{median:50,floor:40,ceiling:59,peak:71}}),cards}])
const mismatched=buildPodIntelligence([{result:high,cards},{result:low,cards},{result:low,cards},{result:low,cards}])
assert.equal(compatible.threatAnswer.modelVersion,'threat-answer-v2')
assert.ok(mismatched.podMatch.mismatch>compatible.podMatch.mismatch)
assert.ok(mismatched.gameQuality.risk.score>=compatible.gameQuality.risk.score)
assert.ok(mismatched.adaptiveRule0.questions.length<=3)
assert.equal(mismatched.threatAnswer.decks.length,4)
assert.ok(mismatched.threatAnswer.decks.some(d=>d.turns.some(x=>Array.isArray(x.answerClasses)&&x.answerClasses.length)))

const players=[1,2,3,4,5,6,7,8].map((id,i)=>({id:`p${id}`,analysis:i<4?result({profile:{median:45+i,floor:36,ceiling:55,peak:66}}):result({profile:{median:70+(i-4),floor:60,ceiling:80,peak:92}})}))
const matched=formPods(players)
assert.equal(matched.pods.length,2)
assert.equal(matched.unassigned.length,0)
assert.equal(matched.algorithm,'exact-partition-small-n')
assert.equal(matched.optimality,'exact-for-current-objective')
assert.deepEqual(matched.pods.flatMap(p=>p.players.map(x=>x.id)).sort(),players.map(x=>x.id).sort())
function choose4WithFirst(xs){const first=xs[0],rest=xs.slice(1),out=[];for(let a=0;a<rest.length;a++)for(let b=a+1;b<rest.length;b++)for(let c=b+1;c<rest.length;c++)out.push([first,rest[a],rest[b],rest[c]]);return out}
let bruteBest=Infinity
for(const pod of choose4WithFirst(players)){const chosen=new Set(pod),other=players.filter(p=>!chosen.has(p)),score=buildAdvancedPodMatch(pod.map(p=>p.analysis)).mismatch+buildAdvancedPodMatch(other.map(p=>p.analysis)).mismatch;bruteBest=Math.min(bruteBest,score)}
assert.equal(matched.totalMismatch,bruteBest)
const badPod=[players[0],players[1],players[2],players[7]],alts=[players[3],players[4],players[5],players[6]]
const repair=repairPod(badPod,alts)
assert.ok(repair.repairs.length>0)
assert.ok(repair.repairs[0].after<repair.repairs[0].before)

const players64=Array.from({length:64},(_,i)=>({id:`large-${String(i).padStart(2,'0')}`,analysis:result({profile:{median:35+(i%30),floor:28+(i%28),ceiling:48+(i%30),peak:60+(i%35)},dimensions:{speed:30+(i*7)%55,explosiveness:25+(i*11)%65,interaction:20+(i*13)%65}})}))
const largeA=formPods(players64),largeB=formPods(players64)
assert.equal(largeA.pods.length,16)
assert.equal(largeA.algorithm,'deterministic-greedy-local-swap')
assert.equal(largeA.optimality,'heuristic')
assert.deepEqual(largeA.pods.map(p=>p.players.map(x=>x.id)),largeB.pods.map(p=>p.players.map(x=>x.id)))
assert.equal(largeA.totalMismatch,largeB.totalMismatch)

const base=result({profile:{median:50,floor:40,ceiling:60,peak:85}}),variantA=result({profile:{median:50,floor:40,ceiling:59,peak:72}}),variantB=result({profile:{median:43,floor:35,ceiling:52,peak:60}})
const explanation=explainVariantDelta(base,variantA)
assert.equal(explanation.changes.peak,-13)
const doctor=selectConstrainedVariant(base,[{id:'A',analysis:variantA},{id:'B',analysis:variantB}],{type:'reduce-peak-preserve-median'},{minMedian:47})
assert.equal(doctor.best.id,'A')

const predictionFields={predictedRiskScore:20,predictedRiskLevel:'low',predictedPodMismatch:18,predictedThreatGap:12}
const valid=validateGameObservation({turnBand:'5-7',winType:'combat',balance:'balanced',dominantEvent:'normal-game',podModelVersion:'pod-intelligence-v1',podFingerprint:'1'.padStart(64,'0'),...predictionFields})
assert.equal(valid.ok,true)
assert.equal(validateGameObservation({turnBand:'bad',winType:'combat',balance:'balanced',dominantEvent:'normal-game',podModelVersion:'x',...predictionFields}).ok,false)
assert.equal(validateGameObservation({turnBand:'5-7',winType:'combat',balance:'balanced',dominantEvent:'normal-game',podModelVersion:'x'}).ok,false)

const observations=Array.from({length:12},(_,i)=>{
  const severe=i%4===0,pod=String((i%3)+1).padStart(64,'0')
  return {turnBand:'5-7',winType:severe?'combo':'combat',balance:severe?'unbalanced':'balanced',dominantEvent:severe?'unanswered-combo':'normal-game',podModelVersion:'pod-intelligence-v1',podFingerprint:pod,predictedRiskScore:severe?82:18,predictedRiskLevel:severe?'high':'low',predictedPodMismatch:severe?76:20,predictedThreatGap:severe?72:14}
})
const realitySummary=summarizeRealityObservations(observations),calibration=evaluateRealityCalibration(observations)
assert.equal(realitySummary.count,12)
assert.equal(realitySummary.distinctPods,3)
assert.equal(calibration.count,12)
assert.equal(calibration.auc,1)
assert.ok(calibration.brier<calibration.baselineBrier)
assert.ok(calibration.brierImprovement>0)
assert.ok(calibration.calibrationMae>=0&&calibration.calibrationMae<=1)
assert.equal(calibration.bands.find(x=>x.band==='high').count,3)
assert.equal(calibrationReadiness(observations,{minGames:20,minDistinctPods:3}).ready,false)
const ready=calibrationReadiness(observations,{minGames:10,minDistinctPods:3})
assert.equal(ready.ready,true)
assert.equal(ready.requirements.holdoutRequired,true)
assert.equal(ready.requirements.baselineComparisonRequired,true)
assert.equal(ready.requirements.calibrationCurveRequired,true)

console.log('P2-P7 ROADMAP MODELS OK — intelligence, share privacy, class Threat-Answer V2, exact/large matchmaking, deck doctor and reality calibration contracts')
