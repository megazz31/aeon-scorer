import assert from 'node:assert/strict'
import { buildAnswerProfile } from '../src/engine/threatAnswerProfile.js'
import { buildClassThreatAnswerTimeline } from '../src/engine/threatAnswerTimeline.js'
import { buildPodIntelligence,buildShareableIntelligence } from '../src/engine/roadmapEngine.js'

const turns=[15,35,55,72,84,91,96].map((value,i)=>({turn:i+1,value}))
const temporalResult={
  profile:{median:50,floor:40,ceiling:60,peak:74,commanderDelta:3,coverage:94},
  dimensions:{speed:50,consistency:60,explosiveness:45,synergy:55,interaction:50,resilience:50},
  roles:{lands:36,nonlands:63,tutors:0,repeatableTutors:0,draw:8,fastMana:1,protection:1,recursion:2,avgCmc:3},
  packages:[{id:'artifacts',strength:70}],combos:[],commanderNames:['Commander A'],commanderSynergy:{score:35},
  experience:{modelVersion:'experience-v1',dimensions:{volatility:{score:30},turnComplexity:{score:30}}},friction:{modelVersion:'friction-v1',signals:{}},
  horizon:{modelVersion:'goldfish-horizon-v2',curves:{
    interaction:{semantics:'cumulative-first-access',points:turns},
    engine:{semantics:'cumulative-first-access',points:[8,20,38,55,68,78,86].map((value,i)=>({turn:i+1,value}))},
    burst:{semantics:'cumulative-first-access',points:[2,8,18,32,48,61,72].map((value,i)=>({turn:i+1,value}))},
    commander:{semantics:'cumulative-first-access',points:[0,10,35,62,78,88,94].map((value,i)=>({turn:i+1,value}))},
  }},methodology:{maxTurn:7}
}
const card=(name,{cmc=1,type='Instant',oracle='',tags=[],interaction=0}={})=>({name,cmc,type,oracle,tags,interaction,manaReq:{total:cmc,generic:cmc,colored:[]}})
const cards=[
  card('Cheap Counter',{cmc:2,oracle:'Counter target spell.',tags:['counterspell'],interaction:4}),
  card('Second Counter',{cmc:2,oracle:'Counter target spell.',tags:['counterspell'],interaction:4}),
  card('Cheap Removal',{cmc:1,oracle:'Destroy target creature.',tags:['removal'],interaction:4}),
  card('Graveyard Check',{cmc:1,oracle:'Exile all cards from target player graveyard.',interaction:3}),
  card('Five Mana Wipe',{cmc:5,type:'Sorcery',oracle:'Destroy all creatures.',tags:['wipe'],interaction:4}),
  card('Six Mana Wipe',{cmc:6,type:'Sorcery',oracle:'Exile all creatures.',tags:['wipe'],interaction:4}),
  card('Artifact Answer',{cmc:2,oracle:'Destroy target artifact.',tags:['removal'],interaction:4}),
  card('Enchantment Answer',{cmc:3,oracle:'Destroy target enchantment.',tags:['removal'],interaction:4}),
]

const profile=buildAnswerProfile(temporalResult,cards)
assert.equal(profile.modelVersion,'answer-profile-v2')
assert.equal(profile.confidence.timing,'card-specific-draw-mv-envelope')
for(const [key,value] of Object.entries(profile.classes)){
  assert.equal(value.timingMethod,'class-card-draw-mv-envelope',`${key} must use V2 timing`)
  let prior=-1
  for(const p of value.turns){assert.ok(p.value>=0&&p.value<=100,`${key} must stay bounded`);assert.ok(p.value>=prior,`${key} must stay monotone`);prior=p.value}
}
assert.equal(profile.classes.stack.earliestManaTurn,2)
assert.equal(profile.classes.stack.meanManaValue,2)
assert.equal(profile.classes.stack.turns[0].value,0)
assert.ok(profile.classes.stack.turns[1].value>0)
assert.equal(profile.classes.wipe.earliestManaTurn,5)
assert.equal(profile.classes.wipe.turns[3].value,0)
assert.ok(profile.classes.wipe.turns[4].value>0)
assert.equal(profile.classes.graveyard.earliestManaTurn,1)
assert.ok(profile.classes.graveyard.turns[0].value>0)
assert.ok(profile.classes.stack.turns[1].value>profile.classes.wipe.turns[1].value,'cheap stack answers must become reachable earlier than wipes')

// Historical analyses retain the exact density-scaled fallback behavior.
const legacyResult={...temporalResult,horizon:{modelVersion:'goldfish-horizon-v1',curves:{...temporalResult.horizon.curves,interaction:{semantics:'available-on-turn',points:[10,20,30,40,50,60,70].map((value,i)=>({turn:i+1,value}))}}}}
const legacy=buildAnswerProfile(legacyResult,cards),scale=legacy.classes.stack.availabilityScale
assert.equal(legacy.classes.stack.timingMethod,'scaled-general-interaction-fallback')
assert.deepEqual(legacy.classes.stack.turns.map(x=>x.value),[10,20,30,40,50,60,70].map(x=>Math.round(x*scale)))

// Threat–Answer version is promoted only when the actual V2 class timing is present.
const threat={modelVersion:'threat-profile-v2',threats:[{id:'test-stack-threat',strength:80,answers:['stack'],turns:[20,40,60,80,90,95,98].map((value,i)=>({turn:i+1,value}))}]}
const newTimeline=buildClassThreatAnswerTimeline([
  {...temporalResult,answerProfile:profile,threatProfile:threat},
  {...temporalResult,answerProfile:profile,threatProfile:threat},
])
assert.equal(newTimeline.modelVersion,'threat-answer-v3')
assert.equal(newTimeline.confidence.classSpecificTiming,'v2')
const legacyTimeline=buildClassThreatAnswerTimeline([
  {...legacyResult,answerProfile:legacy,threatProfile:threat},
  {...legacyResult,answerProfile:legacy,threatProfile:threat},
])
assert.equal(legacyTimeline.modelVersion,'threat-answer-v2')
assert.equal(legacyTimeline.confidence.classSpecificTiming,'legacy')

// Full pod propagation: V2 temporal evidence activates the V4/V3 product chain.
const pod=buildPodIntelligence([{result:temporalResult,cards},{result:temporalResult,cards}])
assert.equal(pod.modelVersion,'pod-intelligence-v4')
assert.equal(pod.threatAnswer.modelVersion,'threat-answer-v3')
assert.equal(pod.podMatch.modelVersion,'advanced-pod-match-v4')
assert.equal(pod.gameQuality.modelVersion,'game-quality-v3')
assert.equal(pod.confidence.answerTiming,'class-specific-v2')
const legacyPod=buildPodIntelligence([{result:legacyResult,cards},{result:legacyResult,cards}])
assert.equal(legacyPod.modelVersion,'pod-intelligence-v3')
assert.equal(legacyPod.threatAnswer.modelVersion,'threat-answer-v2')
assert.notEqual(legacyPod.podMatch.modelVersion,'advanced-pod-match-v4')
assert.equal(legacyPod.gameQuality.modelVersion,'game-quality-v2')

// Public share exposes aggregates only, never answer-card names or Oracle text.
const shared=buildShareableIntelligence(temporalResult,cards),text=JSON.stringify(shared)
assert.equal(shared.modelVersion,'share-intelligence-v3')
assert.equal(shared.answerProfile.classes.stack.meanManaValue,2)
assert.equal(shared.answerProfile.classes.stack.earliestManaTurn,2)
assert.equal(shared.answerProfile.classes.stack.timingMethod,'class-card-draw-mv-envelope')
for(const c of cards){assert.equal(text.includes(c.name),false);if(c.oracle)assert.equal(text.includes(c.oracle),false)}

console.log('ANSWER TIMING V2 OK — class-specific cumulative response timing, truthful fallback/versioning and sanitized aggregates')
