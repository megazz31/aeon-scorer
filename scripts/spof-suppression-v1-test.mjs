import assert from 'node:assert/strict'
import { cardFeatures,featureDeck } from '../src/engine/cardFeatures.js'
import { buildDependencySuppressionCounterfactual,buildSpofProfile } from '../src/engine/spofModel.js'

const commander=cardFeatures({name:'Suppression Test Commander',type:'Legendary Creature — Test',oracle:'',cmc:3,manaCost:'{2}{G}',producedMana:[]})
const raw=[]
for(let i=0;i<40;i++)raw.push({name:`Forest ${i}`,type:'Basic Land — Forest',oracle:'{T}: Add {G}.',cmc:0,manaCost:'',producedMana:['G']})
for(let i=0;i<12;i++)raw.push({name:`Grave Piece ${i}`,type:'Sorcery',oracle:i<6?'Return target card from your graveyard to your hand.':'You may cast target card from your graveyard this turn.',cmc:1,manaCost:'{G}',producedMana:[]})
for(let i=0;i<47;i++)raw.push({name:`Filler ${i}`,type:'Sorcery',oracle:'Scry 1.',cmc:1,manaCost:'{G}',producedMana:[]})
const deck=featureDeck(raw),producerNames=Array.from({length:6},(_,i)=>`Grave Piece ${i}`),payoffNames=Array.from({length:6},(_,i)=>`Grave Piece ${i+6}`)
const packages=[{id:'graveyard',strength:80,producerCards:producerNames.map(name=>({name})),payoffCards:payoffNames.map(name=>({name})),members:[...producerNames,...payoffNames]}]
const combos=[{name:'Private Grave Combo',cards:['Grave Piece 0','Grave Piece 6'],severity:.8}]
const result={commanderNames:[commander.name],packages,combos,methodology:{iterations:1600,maxTurn:7},profile:{commanderDelta:0},commanderSynergy:{score:0},roles:{lands:40,nonlands:59,draw:0,tutors:0,repeatableTutors:0,fastMana:0,protection:0,recursion:12,avgCmc:1},dimensions:{speed:40,explosiveness:30},experience:{dimensions:{}},friction:{signals:{}},horizon:{curves:{burst:{points:[]},engine:{points:[]},interaction:{points:[]}}}}
const cards=[...deck,commander]

const cf=buildDependencySuppressionCounterfactual(result,cards)
assert.ok(cf)
assert.equal(cf.modelVersion,'dependency-suppression-counterfactual-v1')
assert.equal(cf.iterations,267)
assert.equal(cf.confidence.comparison,'paired-fixed-seed')
assert.equal(cf.confidence.deckCardinality,'preserved')
assert.equal(cf.scenarios.graveyard.status,'paired')
assert.equal(cf.scenarios.graveyard.suppressedCards,12)
assert.equal(cf.scenarios.artifact.status,'not-applicable')
assert.equal(cf.scenarios.enchantment.status,'not-applicable')
assert.equal(cf.scenarios['creature-board'].status,'not-applicable')
assert.ok(cf.baseline)
assert.ok(cf.scenarios.graveyard.counterfactual)
assert.ok(cf.scenarios.graveyard.delta.engineT4>=0)
assert.ok(cf.scenarios.graveyard.delta.engineT5>=0)
assert.ok(cf.scenarios.graveyard.delta.median>=0)
assert.deepEqual(buildDependencySuppressionCounterfactual(result,cards),cf,'same result object must reproduce/cache the same paired counterfactual')

// The semantic dependency score remains the pre-existing formula: 12 hits / 60 nonlands incl. commander + package strength 80.
const expectedSemanticScore=Math.round((12/60)*105+80*.35)
const spof=buildSpofProfile(result,cards)
assert.equal(spof.modelVersion,'spof-v2')
assert.equal(spof.dependencies.graveyard.score,expectedSemanticScore)
assert.equal(spof.dependencies.graveyard.method,'semantic-proxy+paired-suppression-evidence')
assert.equal(spof.dependencies.graveyard.counterfactual.status,'paired')
assert.equal(spof.dependencies.graveyard.counterfactual.suppressedCards,12)
assert.equal(spof.dependencies.artifact.method,'semantic-proxy')
assert.equal(spof.confidence.scorePromotion,'semantic-score-unchanged-v1')
assert.equal(spof.dependencySuppression.modelVersion,'dependency-suppression-counterfactual-v1')

// Signed deltas are evidence, not silently promoted into the score.
const beforeScore=expectedSemanticScore,afterScore=spof.dependencies.graveyard.score
assert.equal(afterScore,beforeScore)
assert.ok(Number.isFinite(spof.dependencies.graveyard.counterfactual.delta.median))
assert.ok(Number.isFinite(spof.dependencies.graveyard.counterfactual.delta.peak))

console.log('SPOF SUPPRESSION V1 OK — paired dependency dead-draw stress preserves deck size and semantic SPOF scores')
