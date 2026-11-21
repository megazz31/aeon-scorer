import assert from 'node:assert/strict'
import { buildScoringReliability } from '../src/engine/scoringReliability.js'

const base=()=>({
  profile:{coverage:96,dataCoverage:96},
  commanderNames:['Test Commander'],
  commanderSynergy:{score:70},
  roles:{lands:36,unknownManaLands:0},
  packages:[],combos:[],methodology:{limitations:[]}
})

const clean=buildScoringReliability(base())
assert.equal(clean.modelVersion,'scoring-reliability-v1')
assert.equal(clean.score,93)
assert.equal(clean.level,'high')
assert.equal(clean.modelCoverage,92)
assert.equal(clean.methodology.probability,false)
assert.equal(clean.reasons.length,0)

const lowData=buildScoringReliability({...base(),profile:{coverage:60,dataCoverage:60}})
assert.ok(lowData.score<clean.score)
assert.equal(lowData.level,'moderate')

const donationInput=base()
donationInput.methodology.limitations=['donation-goad-opponent-behavior-not-sequence-simulated']
const donation=buildScoringReliability(donationInput)
assert.ok(donation.score<clean.score)
assert.equal(donation.level,'moderate')
assert.equal(donation.direction,'uncertain')
assert.equal(donation.reasons[0].code,'donation-goad-opponent-behavior-not-sequence-simulated')

const doubleInput=base()
doubleInput.methodology.limitations=[
  'go-wide-combat-damage-not-sequence-simulated',
  'activated-ability-mana-and-exhaust-compression-not-sequence-simulated'
]
const double=buildScoringReliability(doubleInput)
assert.ok(double.score<donation.score)
assert.equal(double.direction,'underestimate')

const comboInput=base()
comboInput.combos=[{name:'Loop',family:'loop',sequenceEligible:false}]
const combo=buildScoringReliability(comboInput)
assert.ok(combo.score<clean.score)
assert.ok(combo.reasons.some(r=>r.code==='known-combo-execution-partial'))

const manaInput=base()
manaInput.roles={lands:35,unknownManaLands:9}
const mana=buildScoringReliability(manaInput)
assert.ok(mana.score<clean.score)
assert.ok(mana.reasons.some(r=>r.code==='unknown-mana-production'))

const noCommander=base()
noCommander.commanderNames=[]
const missing=buildScoringReliability(noCommander)
assert.ok(missing.score<clean.score)
assert.ok(missing.reasons.some(r=>r.code==='commander-missing'))

console.log('scoring-reliability-v1-test: OK')
