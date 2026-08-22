import assert from 'node:assert/strict'
import { buildThreatObjects,THREAT_OBJECT_MODEL_VERSION } from '../src/engine/threatObjects.js'
import { buildThreatProfile } from '../src/engine/threatAnswerProfile.js'
import { buildShareableIntelligence } from '../src/engine/roadmapEngine.js'

const curve=(values,semantics='cumulative-first-access')=>({semantics,points:values.map((value,i)=>({turn:i+1,value}))})
const result={
  profile:{median:55,floor:44,ceiling:66,peak:82,commanderDelta:8,coverage:94},dimensions:{speed:58,consistency:60,explosiveness:68,synergy:72,interaction:50,resilience:48},
  roles:{lands:36,nonlands:63,tutors:2,repeatableTutors:0,draw:9,fastMana:2,protection:2,recursion:3,avgCmc:3},
  packages:[{id:'artifacts',strength:68},{id:'graveyard',strength:52},{id:'tokens',strength:44}],
  combos:[{name:'PRIVATE COMBO NAME',cards:['SECRET PIECE A','SECRET PIECE B']}],commanderNames:['Commander A'],
  comboAccessibility:{modelVersion:'combo-access-v1',highest:{score:76},lines:[{score:76,commanderPieces:1},{score:61,commanderPieces:0}]},
  spof:{dependencies:{commander:{score:50},graveyard:{score:58},artifact:{score:62},enchantment:{score:18},creatureBoard:{score:47}}},
  friction:{signals:{extraTurns:{score:46}}},experience:{dimensions:{volatility:{score:35},turnComplexity:{score:45}}},
  horizon:{modelVersion:'goldfish-horizon-v2',curves:{engine:curve([8,22,41,61,76,86,92]),burst:curve([3,12,28,49,67,79,88]),interaction:curve([12,30,51,69,82,90,95]),commander:curve([0,12,38,66,82,91,96])}},methodology:{maxTurn:7}
}

const built=buildThreatObjects(result)
assert.equal(built.modelVersion,THREAT_OBJECT_MODEL_VERSION)
assert.deepEqual(built.objects.map(x=>x.id),['combo','artifact-engine','graveyard-engine','creature-board','extra-turn-loop','enchantment-engine'])
for(const threat of built.objects){
  assert.equal(threat.modelVersion,THREAT_OBJECT_MODEL_VERSION)
  assert.ok(threat.family)
  assert.ok(threat.strength>=12&&threat.strength<=100)
  assert.ok(threat.answers.length>0)
  assert.equal(threat.temporalSemantics,'cumulative-first-access')
  assert.equal(threat.timingStatus,'first-access-weighted')
  assert.equal(threat.turns.length,7)
  assert.ok(Array.isArray(threat.sourceEvidence)&&threat.sourceEvidence.length>0)
  assert.ok(Array.isArray(threat.prerequisites.known))
  assert.ok(Array.isArray(threat.prerequisites.unknown)&&threat.prerequisites.unknown.length>0)
  assert.ok(threat.criticalWindow.startTurn!=null)
}
const combo=built.objects.find(x=>x.id==='combo')
assert.equal(combo.strength,76)
assert.equal(combo.milestones.at50,5)
assert.equal(combo.criticalWindow.startTurn,5)
assert.ok(combo.prerequisites.unknown.includes('tutor-eligibility'))
assert.equal(combo.sourceEvidence.find(x=>x.id==='detected-lines').score,2)
const artifact=built.objects.find(x=>x.id==='artifact-engine')
assert.equal(artifact.strength,68)
assert.ok(artifact.sourceEvidence.some(x=>x.kind==='package'&&x.id==='artifacts'))
assert.deepEqual(artifact.turns,result.horizon.curves.engine.points.map(p=>({turn:p.turn,value:Math.round(p.value*.68)})))

// Threat Profile V3 is an additive representation change: legacy consumer fields remain identical in shape/meaning.
const profile=buildThreatProfile(result,[])
assert.equal(profile.modelVersion,'threat-profile-v3')
assert.equal(profile.threatObjectModel,THREAT_OBJECT_MODEL_VERSION)
assert.strictEqual(profile.objects,profile.threats)
for(const threat of profile.threats){for(const field of ['id','strength','level','answers','turns'])assert.ok(field in threat)}

// Fallback timing remains explicit when the source Horizon is historical availability.
const fallback=buildThreatObjects({...result,horizon:{...result.horizon,curves:{...result.horizon.curves,engine:curve([8,22,41,35,50,44,60],'available-on-turn'),burst:curve([3,12,28,20,33,29,40],'available-on-turn')}}})
assert.ok(fallback.objects.every(x=>x.timingStatus==='availability-weighted-fallback'))

// Determinism: aggregate evidence/order must not depend on package input ordering.
const reversed=buildThreatObjects({...result,packages:[...result.packages].reverse()})
assert.deepEqual(reversed,built)

// Public serialization keeps useful aggregate threat evidence but strips private combo/card evidence.
const cards=[{name:'SECRET ANSWER CARD',type:'Instant',oracle:'SECRET ORACLE TEXT. Counter target spell.',tags:['counterspell'],interaction:4,cmc:2}]
const shared=buildShareableIntelligence(result,cards),text=JSON.stringify(shared)
assert.equal(shared.modelVersion,'share-intelligence-v4')
assert.equal(shared.threatProfile.modelVersion,'threat-profile-v3')
assert.equal(shared.threatProfile.threatObjectModel,THREAT_OBJECT_MODEL_VERSION)
assert.ok(shared.threatProfile.threats.some(x=>x.id==='combo'&&x.prerequisites.unknown.includes('tutor-eligibility')))
assert.equal(text.includes('PRIVATE COMBO NAME'),false)
assert.equal(text.includes('SECRET PIECE A'),false)
assert.equal(text.includes('SECRET PIECE B'),false)
assert.equal(text.includes('SECRET ANSWER CARD'),false)
assert.equal(text.includes('SECRET ORACLE TEXT'),false)

console.log('THREAT OBJECTS V1 OK — deterministic explicit evidence/prerequisites/timing with legacy threat compatibility and sanitized sharing')
