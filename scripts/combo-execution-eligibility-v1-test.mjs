import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildComboExecutionEligibility,COMBO_EXECUTION_ELIGIBILITY_MODEL_VERSION } from '../src/engine/comboExecutionEligibility.js'
import { buildComboAccessibility } from '../src/engine/comboAccessibility.js'
import { buildThreatObjects,THREAT_OBJECT_MODEL_VERSION } from '../src/engine/threatObjects.js'
import { buildThreatProfile } from '../src/engine/threatAnswerProfile.js'
import { buildDeckIntelligence,buildShareableIntelligence } from '../src/engine/roadmapEngine.js'

const supportedTiming={modelVersion:'combo-piece-timing-v1',status:'piece-presence-supported',missingPieces:0,libraryPieces:2,commandZonePieces:0,windows:[{turn:5,piecePresence:12.3},{turn:7,piecePresence:17.8},{turn:9,piecePresence:24.1}]}
const thoracle=buildComboExecutionEligibility('Thoracle + Consultation',supportedTiming)
assert.equal(thoracle.modelVersion,COMBO_EXECUTION_ELIGIBILITY_MODEL_VERSION)
assert.equal(thoracle.status,'blocked')
assert.equal(thoracle.exactExecutionTiming,'blocked')
assert.equal(thoracle.executionClaim,'not-emitted')
assert.ok(thoracle.blockers.includes('library-empty-condition'))
assert.ok(thoracle.blockers.includes('stack-sequencing'))
assert.equal(thoracle.blockers.includes('protection-window'),false,'protection context must not be a strict execution blocker')
assert.equal(thoracle.requirements.find(x=>x.id==='piece-data-resolved').state,'known')
assert.equal(thoracle.requirements.find(x=>x.id==='piece-presence-window').state,'known')
assert.equal(thoracle.requirements.find(x=>x.id==='protection-window').requiredForExecution,false)
assert.equal(thoracle.summary.requiredKnown,2)

const missing=buildComboExecutionEligibility('Thoracle + Consultation',{status:'unsupported',missingPieces:1})
assert.ok(missing.blockers.includes('piece-data-resolved'))
assert.ok(missing.blockers.includes('piece-presence-window'))
assert.equal(missing.requirements.find(x=>x.id==='piece-data-resolved').blockerReason,'missing-piece-data')
const generic=buildComboExecutionEligibility('PRIVATE UNKNOWN COMBO',supportedTiming)
assert.equal(generic.confidence.catalog,'generic-boundary')
assert.ok(generic.blockers.includes('execution-prerequisites-not-modeled'))
assert.deepEqual(buildComboExecutionEligibility('Thoracle + Consultation',supportedTiming),thoracle,'eligibility must be deterministic')

const filler=Array.from({length:97},(_,i)=>({name:`Filler ${i}`,type:'Sorcery',oracle:'Scry 1.',cmc:1,manaReq:{generic:1,colored:[],total:1},tags:[],interaction:0,isLand:false}))
const pieceA={name:"Thassa's Oracle",type:'Creature',oracle:'PRIVATE ORACLE A',cmc:2,manaReq:{generic:1,colored:[['U']],total:2},tags:[],interaction:0,isLand:false}
const pieceB={name:'Demonic Consultation',type:'Instant',oracle:'PRIVATE ORACLE B',cmc:1,manaReq:{generic:0,colored:[['B']],total:1},tags:[],interaction:0,isLand:false}
const cards=[...filler,pieceA,pieceB]
const curve=values=>({semantics:'cumulative-first-access',points:values.map((value,i)=>({turn:i+1,value}))})
const result={
  profile:{median:54,floor:44,ceiling:65,peak:82,commanderDelta:0,coverage:94},dimensions:{speed:58,consistency:62,explosiveness:70,synergy:60,interaction:48,resilience:46},
  roles:{lands:0,nonlands:99,tutors:2,repeatableTutors:0,draw:8,fastMana:1,protection:1,recursion:0,avgCmc:1.2},packages:[],commanderNames:[],commanderSynergy:{score:0},
  combos:[{name:'Thoracle + Consultation',cards:[pieceA.name,pieceB.name],severity:1}],
  experience:{modelVersion:'experience-v1',dimensions:{}},friction:{modelVersion:'friction-v1',signals:{}},spof:{dependencies:{}},
  horizon:{modelVersion:'goldfish-horizon-v2',curves:{burst:curve([3,10,22,38,55,69,80]),engine:curve([5,15,30,45,58,68,76]),interaction:curve([12,30,50,66,78,87,93]),resource:curve([8,18,32,47,60,70,79]),commander:curve([0,0,0,0,0,0,0])}},methodology:{maxTurn:7,iterations:3200},
}
const comboAccessibility=buildComboAccessibility(result,cards),line=comboAccessibility.lines[0]
assert.equal(comboAccessibility.modelVersion,'combo-access-v2')
assert.equal(line.executionEligibility.modelVersion,COMBO_EXECUTION_ELIGIBILITY_MODEL_VERSION)
assert.equal(line.executionEligibility.piecePresenceStatus,'piece-presence-supported')
assert.ok(line.executionEligibility.blockers.includes('library-empty-condition'))

const threatInput={...result,comboAccessibility}
const structured=buildThreatObjects(threatInput),legacyLike=buildThreatObjects({...threatInput,comboAccessibility:{...comboAccessibility,highest:{...comboAccessibility.highest,executionEligibility:null},lines:comboAccessibility.lines.map(x=>({...x,executionEligibility:null}))}})
assert.equal(structured.modelVersion,THREAT_OBJECT_MODEL_VERSION)
assert.equal(THREAT_OBJECT_MODEL_VERSION,'threat-object-v2')
const comboThreat=structured.objects.find(x=>x.id==='combo'),legacyCombo=legacyLike.objects.find(x=>x.id==='combo')
assert.ok(comboThreat.executionPrerequisites)
assert.equal(comboThreat.executionPrerequisites.modelVersion,COMBO_EXECUTION_ELIGIBILITY_MODEL_VERSION)
assert.ok(comboThreat.prerequisites.unknown.includes('library-empty-condition'))
assert.equal(comboThreat.prerequisites.unknown.includes('exact-piece-zones'),false)
for(const field of ['strength','answers','turns','milestones','criticalWindow'])assert.deepEqual(comboThreat[field],legacyCombo[field],`structured prerequisites must not change threat ${field}`)

const profile=buildThreatProfile(threatInput,cards)
assert.equal(profile.modelVersion,'threat-profile-v4')
assert.equal(profile.threatObjectModel,'threat-object-v2')
assert.equal(profile.confidence.prerequisites,'structured-execution-v1')

const deck=buildDeckIntelligence(result,cards)
assert.equal(deck.modelVersion,'deck-intelligence-v5')
assert.equal(deck.threatProfile.modelVersion,'threat-profile-v4')
const shared=buildShareableIntelligence(result,cards),text=JSON.stringify(shared)
assert.equal(shared.modelVersion,'share-intelligence-v5')
assert.equal(shared.comboAccessibility.lines[0].executionEligibility.modelVersion,COMBO_EXECUTION_ELIGIBILITY_MODEL_VERSION)
assert.equal(shared.threatProfile.threats.find(x=>x.id==='combo').executionPrerequisites.modelVersion,COMBO_EXECUTION_ELIGIBILITY_MODEL_VERSION)
assert.equal(shared.privacy.comboPieceNames,false)
for(const secret of [pieceA.name,pieceB.name,'Thoracle + Consultation','PRIVATE ORACLE A','PRIVATE ORACLE B'])assert.equal(text.includes(secret),false,`public execution-prerequisite payload leaked ${secret}`)
assert.equal(/"cards"\s*:/.test(text),false)

const workspace=fs.readFileSync(new URL('../src/ProductWorkspace.jsx',import.meta.url),'utf8')
assert.ok(workspace.includes('Execution eligibility'))
assert.ok(workspace.includes('strict blocker(s)'))
assert.ok(workspace.includes('do not claim those requirements are absent in the real game'))

console.log('COMBO EXECUTION ELIGIBILITY V1 OK — structured blockers are deterministic, protection is contextual, Threat Profile V4 preserves threat arithmetic, local diagnostics are explicit and public payloads stay sanitized')
