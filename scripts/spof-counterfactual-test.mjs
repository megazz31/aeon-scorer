import assert from 'node:assert/strict'
import { cardFeatures,featureDeck } from '../src/engine/cardFeatures.js'
import { buildCommanderTaxCounterfactual } from '../src/engine/spofModel.js'

const commander=cardFeatures({name:'Tax Test Commander',type:'Legendary Creature — Test',oracle:'',cmc:3,manaCost:'{2}{G}',producedMana:[]})
const rawDeck=[]
for(let i=0;i<40;i++)rawDeck.push({name:`Forest ${i}`,type:'Basic Land — Forest',oracle:'{T}: Add {G}.',cmc:0,manaCost:'',producedMana:['G']})
for(let i=0;i<59;i++)rawDeck.push({name:`One Drop ${i}`,type:'Creature — Test',oracle:'',cmc:1,manaCost:'{G}',producedMana:[]})
const deck=featureDeck(rawDeck)
const result={commanderNames:[commander.name],packages:[],combos:[],methodology:{iterations:1600,maxTurn:7},profile:{commanderDelta:0}}
const cf=buildCommanderTaxCounterfactual(result,[...deck,commander])
assert.ok(cf)
assert.equal(cf.modelVersion,'commander-tax-counterfactual-v1')
assert.equal(cf.scope,'commander-tax')
assert.equal(cf.iterations,400)
assert.ok(cf.delta.tax2Median>=0)
assert.ok(cf.delta.tax4Median>=cf.delta.tax2Median)
assert.ok(cf.delta.unavailableMedian>=0)
for(let i=0;i<cf.baseline.commanderAccessByTurn.length;i++){
  const base=cf.baseline.commanderAccessByTurn[i].value,t2=cf.tax2.commanderAccessByTurn[i].value,t4=cf.tax4.commanderAccessByTurn[i].value
  assert.ok(base>=t2,`T${i+1}: +2 tax cannot improve commander access`)
  assert.ok(t2>=t4,`T${i+1}: +4 tax cannot improve commander access over +2`)
}
assert.equal(cf.confidence.comparison,'paired-fixed-seed')
console.log('SPOF COUNTERFACTUAL OK — paired baseline/+2/+4/unavailable commander stress is monotonic')
