import assert from 'node:assert/strict'
import { buildExperienceFingerprint,EXPERIENCE_MODEL_VERSION } from '../src/engine/experienceModel.js'

const base={
  profile:{median:50,floor:40,ceiling:60,peak:75,dispersion:20,commanderDelta:5,coverage:95},
  dimensions:{speed:40,consistency:60,explosiveness:30,synergy:60,interaction:25,resilience:50},
  packages:[{id:'graveyard',cohesion:80},{id:'sacrifice',cohesion:60}],
  combos:[],commanderSynergy:{score:50},methodology:{iterations:3200},
}
const simpleCards=Array.from({length:40},(_,i)=>({name:`Card ${i}`,type:'Creature',oracle:'Vanilla creature.',tags:['creature'],recurring:0}))
const complexCards=Array.from({length:40},(_,i)=>i<20?({name:`Engine ${i}`,type:'Creature',oracle:'Whenever another creature enters, draw a card. {1}: Create a token.',tags:['creature','token-payoff'],recurring:1}):simpleCards[i])

const fp=buildExperienceFingerprint(base,simpleCards)
assert.equal(fp.modelVersion,EXPERIENCE_MODEL_VERSION)
for(const [name,d] of Object.entries(fp.dimensions)){
  assert.ok(d.score>=0&&d.score<=100,`${name} must be bounded`)
  assert.ok(['low','moderate','high','very-high'].includes(d.level),`${name} must expose a level`)
  assert.ok(Array.isArray(d.evidence)&&d.evidence.length>0,`${name} must expose evidence`)
}
assert.equal(fp.confidence.productCalibration,'experimental')
assert.equal(fp.confidence.evidenceCoverage,'full')

const faster=structuredClone(base);faster.dimensions.speed=80
const fpFast=buildExperienceFingerprint(faster,simpleCards)
assert.ok(fpFast.dimensions.tempo.score>fp.dimensions.tempo.score,'speed must raise tempo')
for(const key of Object.keys(fp.dimensions).filter(k=>k!=='tempo'))assert.equal(fpFast.dimensions[key].score,fp.dimensions[key].score,`speed-only change must not move ${key}`)

const peakier=structuredClone(base);peakier.profile.peak=95
assert.ok(buildExperienceFingerprint(peakier,simpleCards).dimensions.volatility.score>fp.dimensions.volatility.score,'higher peak tail must raise volatility')

const dependent=structuredClone(base);dependent.profile.commanderDelta=15
assert.ok(buildExperienceFingerprint(dependent,simpleCards).dimensions.dependency.score>fp.dimensions.dependency.score,'commander delta must raise dependency')

const inevitable=structuredClone(base);inevitable.dimensions.synergy=85;inevitable.dimensions.consistency=85;inevitable.dimensions.resilience=80
assert.ok(buildExperienceFingerprint(inevitable,simpleCards).dimensions.inevitability.score>fp.dimensions.inevitability.score,'synergy/consistency/resilience must raise inevitability')

assert.ok(buildExperienceFingerprint(base,complexCards).dimensions.turnComplexity.score>fp.dimensions.turnComplexity.score,'recurring chained actions must raise complexity')

const medianOnly=structuredClone(base);medianOnly.profile.median=75
const fpMedian=buildExperienceFingerprint(medianOnly,simpleCards)
for(const key of Object.keys(fp.dimensions))assert.equal(fpMedian.dimensions[key].score,fp.dimensions[key].score,`raw median must not secretly drive ${key}`)

console.log('EXPERIENCE MODEL OK — bounded, evidence-bearing and independent from the raw Aeon median')
