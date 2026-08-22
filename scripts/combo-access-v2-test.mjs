import assert from 'node:assert/strict'
import { buildComboAccessibility as buildComboAccessibilityV2,_comboAccessMath } from '../src/engine/comboAccessibility.js'
import { buildComboAccessibility as buildComboAccessibilityV1 } from '../src/engine/gameQuality.js'
import { buildDeckIntelligence,buildShareableIntelligence } from '../src/engine/roadmapEngine.js'

const filler=Array.from({length:97},(_,i)=>({name:`Filler ${i}`,type:'Sorcery',oracle:'Scry 1.',cmc:1,manaReq:{generic:1,colored:[],total:1},tags:[],interaction:0,isLand:false}))
const pieceA={name:'PRIVATE PIECE A',type:'Artifact',oracle:'PRIVATE ORACLE A',cmc:2,manaReq:{generic:2,colored:[],total:2},tags:[],interaction:0,isLand:false}
const pieceB={name:'PRIVATE PIECE B',type:'Creature',oracle:'PRIVATE ORACLE B',cmc:2,manaReq:{generic:2,colored:[],total:2},tags:[],interaction:0,isLand:false}
const commander={name:'PRIVATE COMMANDER PIECE',type:'Legendary Creature',oracle:'PRIVATE COMMANDER ORACLE',cmc:3,manaReq:{generic:3,colored:[],total:3},tags:[],interaction:0,isLand:false}
const horizon={modelVersion:'goldfish-horizon-v2',curves:{burst:{semantics:'cumulative-first-access',points:[1,2,3,4,5,6,7].map(turn=>({turn,value:turn*5}))},engine:{semantics:'cumulative-first-access',points:[]},interaction:{semantics:'cumulative-first-access',points:[]},resource:{semantics:'cumulative-first-access',points:[]},commander:{semantics:'cumulative-first-access',points:[]}}}
function result(overrides={}){return {
  profile:{median:50,floor:40,ceiling:60,peak:75,commanderDelta:0,coverage:94},
  dimensions:{speed:50,consistency:55,explosiveness:45,synergy:50,interaction:45,resilience:50},
  roles:{lands:0,nonlands:99,tutors:2,repeatableTutors:1,draw:8,fastMana:1,protection:0,recursion:0,avgCmc:1.2},
  packages:[],commanderNames:[],commanderSynergy:{score:0},experience:{modelVersion:'experience-v1',dimensions:{}},friction:{modelVersion:'friction-v1',signals:{}},horizon,methodology:{maxTurn:7,iterations:3200},
  combos:[{name:'PRIVATE TWO PIECE LINE',cards:[pieceA.name,pieceB.name],severity:.8}],...overrides,
}}

// Structural V1 fields are preserved exactly.
const base=result(),cards=[...filler,pieceA,pieceB]
assert.equal(cards.length,99)
const legacy=buildComboAccessibilityV1(base,cards),v2=buildComboAccessibilityV2(base,cards)
assert.equal(v2.modelVersion,'combo-access-v2')
assert.equal(v2.lines.length,1)
for(const field of ['score','level','commanderPieces','method'])assert.equal(v2.lines[0][field],legacy.lines[0][field],`structural ${field} must remain V1-compatible`)
assert.equal(v2.confidence.structuralScore,'v1-unchanged')

// Two singleton library pieces: exact raw-draw probability rises monotonically T5 -> T7 -> T9.
const timing=v2.lines[0].timing,values=timing.windows.map(x=>x.piecePresence)
assert.equal(timing.status,'piece-presence-supported')
assert.equal(timing.executionStatus,'not-modeled')
assert.equal(timing.librarySize,99)
assert.equal(timing.libraryPieces,2)
assert.equal(timing.commandZonePieces,0)
assert.deepEqual(timing.windows.map(x=>x.turn),[5,7,9])
assert.ok(values[0]>0&&values[0]<values[1]&&values[1]<values[2])
const expectedT5=_comboAccessMath.atLeastOneEachProbability(99,12,[1,1])*100
assert.ok(Math.abs(values[0]-Math.round(expectedT5*10)/10)<1e-9)
assert.ok(timing.assumptions.includes('tutors-not-modeled'))
assert.ok(timing.assumptions.includes('mulligans-not-modeled'))

// Tutor count may change the historical structural score but must not inflate raw-draw timing.
const noTutors=buildComboAccessibilityV2(result({roles:{...base.roles,tutors:0,repeatableTutors:0}}),cards)
const manyTutors=buildComboAccessibilityV2(result({roles:{...base.roles,tutors:8,repeatableTutors:2}}),cards)
assert.ok(manyTutors.lines[0].score>noTutors.lines[0].score)
assert.deepEqual(manyTutors.lines[0].timing.windows,noTutors.lines[0].timing.windows)

// A command-zone combo piece is counted separately: only the library piece contributes to piece-presence timing.
const commanderResult=result({commanderNames:[commander.name],combos:[{name:'PRIVATE COMMAND LINE',cards:[commander.name,pieceA.name],severity:.8}],roles:{...base.roles,nonlands:98}})
const commanderCards=[...filler.slice(0,97),pieceA,commander]
assert.equal(commanderCards.length,99)
const cmdTiming=buildComboAccessibilityV2(commanderResult,commanderCards).lines[0].timing
assert.equal(cmdTiming.commandZonePieces,1)
assert.equal(cmdTiming.libraryPieces,1)
assert.equal(cmdTiming.librarySize,98)
assert.equal(cmdTiming.windows[0].piecePresence,Math.round((12/98)*1000)/10)
assert.equal(cmdTiming.executionStatus,'not-modeled')

// Missing piece data is unsupported and must never become a zero/false precision probability.
const missing=buildComboAccessibilityV2(result({combos:[{name:'PRIVATE MISSING LINE',cards:[pieceA.name,'ABSENT SECRET PIECE'],severity:.8}]}),cards).lines[0].timing
assert.equal(missing.status,'unsupported')
assert.equal(missing.missingPieces,1)
assert.ok(missing.unsupportedReasons.includes('missing-piece-data'))
assert.ok(missing.windows.every(x=>x.piecePresence===null))

// Product intelligence versioning + public privacy: timing aggregates are useful, combo/card names remain absent.
const deck=buildDeckIntelligence(base,cards)
assert.equal(deck.modelVersion,'deck-intelligence-v4')
assert.equal(deck.comboAccessibility.modelVersion,'combo-access-v2')
const shared=buildShareableIntelligence(base,cards),text=JSON.stringify(shared)
assert.equal(shared.modelVersion,'share-intelligence-v4')
assert.equal(shared.privacy.comboPieceNames,false)
assert.equal(shared.comboAccessibility.lines[0].timing.status,'piece-presence-supported')
assert.equal(shared.comboAccessibility.lines[0].timing.windows.length,3)
for(const secret of ['PRIVATE PIECE A','PRIVATE PIECE B','PRIVATE TWO PIECE LINE','PRIVATE ORACLE A','PRIVATE ORACLE B'])assert.equal(text.includes(secret),false,`public share leaked ${secret}`)
assert.equal(/"cards"\s*:/.test(text),false,'public combo payload must not expose combo card arrays')

console.log('COMBO ACCESS V2 OK — V1 structural scores preserved, T5/T7/T9 raw-draw piece presence is exact/monotone, tutors stay unmodeled and public payloads remain sanitized')
