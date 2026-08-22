import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildClassThreatAnswerTimeline } from '../src/engine/threatAnswerTimeline.js'
import { buildAgencyTimeline,AGENCY_TIMELINE_MODEL_VERSION } from '../src/engine/agencyTimeline.js'
import { buildPodIntelligence } from '../src/engine/roadmapEngine.js'
import { buildGameQualityForecast } from '../src/engine/gameQuality.js'

const curve=values=>({semantics:'cumulative-first-access',points:values.map((value,i)=>({turn:i+1,value}))})
const classCurve=values=>({count:2,density:.3,availabilityScale:.5,meanManaValue:2,earliestManaTurn:2,timingMethod:'class-card-draw-mv-envelope',level:'moderate',turns:values.map((value,i)=>({turn:i+1,value}))})
const threat=(id,values,answers=['stack'],family='combo')=>({modelVersion:'threat-object-v1',id,family,strength:80,level:'high',answers,prerequisites:{known:[],unknown:['protection-window']},criticalWindow:{startTurn:3,matureTurn:4},timingStatus:'first-access-weighted',turns:values.map((value,i)=>({turn:i+1,value}))})
function deck({fast=false,threats=[]}={}){
  const dev=fast?[25,58,72,82,90,94,97]:[0,8,18,32,55,70,82],interaction=fast?[20,45,65,78,86,91,94]:[0,5,12,22,38,55,68]
  return {
    profile:{median:50,floor:40,ceiling:60,peak:75,commanderDelta:4,coverage:94},dimensions:{speed:50,consistency:60,explosiveness:50,synergy:55,interaction:45,resilience:50},roles:{lands:36,nonlands:63,tutors:1,repeatableTutors:0,draw:8,fastMana:1,protection:1,recursion:2,avgCmc:3},packages:[],combos:[],commanderNames:['Commander'],commanderSynergy:{score:40},
    experience:{modelVersion:'experience-v1',dimensions:{volatility:{score:30},turnComplexity:{score:30}}},friction:{modelVersion:'friction-v1',signals:{}},
    horizon:{modelVersion:'goldfish-horizon-v2',curves:{commander:curve(dev),engine:curve(dev),resource:curve(dev.map(x=>Math.max(0,x-8))),interaction:curve(interaction),burst:curve(dev.map(x=>Math.max(0,x-12)))}},
    answerProfile:{modelVersion:'answer-profile-v2',classes:{stack:classCurve(interaction),creature:classCurve(interaction),artifact:classCurve(interaction),enchantment:classCurve(interaction),graveyard:classCurve(interaction),wipe:classCurve(interaction)}},
    threatProfile:{modelVersion:'threat-profile-v3',threatObjectModel:'threat-object-v1',threats,objects:threats},
    spof:{dependencies:{}},comboAccessibility:{lines:[]},vulnerability:{classes:{}},methodology:{maxTurn:7}
  }
}

const slow=deck({fast:false,threats:[threat('artifact-engine',[0,5,15,30,50,68,78],['artifact'],'engine')]})
const fast=deck({fast:true,threats:[threat('combo',[20,45,65,80,90,95,98],['stack'],'combo'),threat('creature-board',[10,25,48,68,80,88,92],['creature','wipe'],'board')]})
const decks=[slow,fast]

// Threat–Answer V4 keeps every Threat Object window but preserves V3 worst-window arithmetic.
const v4=buildClassThreatAnswerTimeline(decks)
assert.equal(v4.modelVersion,'threat-answer-v4')
assert.equal(v4.decks[1].windows.length,2)
assert.equal(v4.decks[1].windows.find(x=>x.threatId==='combo').unknownPrerequisites[0],'protection-window')
const legacyThreatDecks=decks.map(d=>({...d,threatProfile:{modelVersion:'threat-profile-v2',threats:d.threatProfile.threats.map(x=>({id:x.id,strength:x.strength,level:x.level,answers:x.answers,turns:x.turns}))}}))
const v3=buildClassThreatAnswerTimeline(legacyThreatDecks)
assert.equal(v3.modelVersion,'threat-answer-v3')
assert.deepEqual(v4.decks.map(d=>d.turns),v3.decks.map(d=>d.turns),'V4 must preserve historical worst-window arithmetic exactly')

// Agency: slow seat faces material opponent pressure before its own plan/answers reach the 50 threshold.
const agency=buildAgencyTimeline(decks,v4)
assert.equal(agency.modelVersion,AGENCY_TIMELINE_MODEL_VERSION)
assert.equal(agency.seats.length,2)
assert.equal(agency.seats[0].firstMaterialPressureTurn,3)
assert.equal(agency.seats[0].firstMeaningfulAgencyTurn,5)
assert.equal(agency.seats[0].pressureBeforeAgency,true)
assert.ok(agency.seats[0].maxParticipationGap>agency.seats[1].maxParticipationGap)
assert.equal(agency.highestRisk.index,0)
assert.ok(agency.seats[0].timeline.some(x=>x.dominantThreat?.threatId==='combo'))
assert.deepEqual(buildAgencyTimeline(decks,v4),agency,'Agency Timeline must be deterministic')
assert.equal(buildAgencyTimeline(decks,v3),null,'Agency V1 requires Threat–Answer V4 evidence rather than silently degrading')

// Pod integration promotes the diagnostic model but does not alter Game Quality arithmetic.
const pod=buildPodIntelligence(decks.map(result=>({result,deckIntelligence:{modelVersion:'deck-intelligence-v3',spof:result.spof,comboAccessibility:result.comboAccessibility,vulnerability:result.vulnerability,answerProfile:result.answerProfile,threatProfile:result.threatProfile}})))
assert.equal(pod.modelVersion,'pod-intelligence-v5')
assert.equal(pod.threatAnswer.modelVersion,'threat-answer-v4')
assert.equal(pod.podMatch.modelVersion,'advanced-pod-match-v4')
assert.equal(pod.gameQuality.modelVersion,'game-quality-v3')
assert.equal(pod.agencyTimeline.modelVersion,AGENCY_TIMELINE_MODEL_VERSION)
assert.deepEqual(pod.gameQuality,buildGameQualityForecast(pod.decks,pod.podMatch,pod.threatAnswer),'Agency V1 must remain diagnostic and outside Game Quality arithmetic')
assert.equal(pod.gameQuality.notes.some(x=>/Agency Timeline V1 is diagnostic only/.test(x)),true)

// Product wiring: both Pod Match and Aeon Match expose Agency while Reality prediction stays unchanged.
const podPage=fs.readFileSync(new URL('../src/ProductPages.jsx',import.meta.url),'utf8'),matchPage=fs.readFileSync(new URL('../src/AeonMatchPage.jsx',import.meta.url),'utf8')
for(const source of [podPage,matchPage]){assert.ok(source.includes('agencyTimeline'));assert.ok(source.includes('Agency diagnostic'));assert.ok(source.includes('maxParticipationGap'));assert.ok(source.includes('firstMeaningfulAgencyTurn'));assert.ok(source.includes('firstMaterialPressureTurn'))}
assert.ok(matchPage.includes('const predictionFrom=intel=>'))
assert.equal(/predictionFrom=intel=>[^\n]*agency/i.test(matchPage),false,'Reality prediction must not absorb Agency in V1')
assert.ok(podPage.includes('Agency is a structural participation diagnostic and is not included in the Game Quality score.'))
assert.ok(matchPage.includes('Agency is a diagnostic only and does not alter the matching objective.'))

console.log('AGENCY TIMELINE V1 OK — Threat-Answer V4 preserves worst-window arithmetic, Agency is user-visible and remains outside Game Quality/Reality scoring')
