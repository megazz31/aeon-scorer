import assert from 'node:assert/strict'
import { buildTableFriction,FRICTION_MODEL_VERSION } from '../src/engine/frictionModel.js'

const card=(name,type,oracle,tags=[],recurring=0)=>({name,type,oracle,tags,recurring,isLand:false})
const fill=xs=>[...xs,...Array.from({length:30-xs.length},(_,i)=>card(`Vanilla ${i}`,'Creature','Vanilla creature.'))]

const empty=buildTableFriction({experience:{dimensions:{turnComplexity:{score:0}}}},fill([]))
assert.equal(empty.modelVersion,FRICTION_MODEL_VERSION)
assert.deepEqual(empty.notable,[])

const oneTax=buildTableFriction({},fill([card('Sphere','Artifact','Spells your opponents cast cost {1} more to cast.',['stax'])]))
const recurringTaxes=buildTableFriction({},fill([
  card('Sphere A','Artifact','Spells your opponents cast cost {1} more to cast.',['stax']),
  card('Sphere B','Enchantment','Players can’t cast more than one spell each turn.',['stax']),
]))
assert.ok(recurringTaxes.signals.resourceDenial.score>oneTax.signals.resourceDenial.score,'redundant persistent restrictions must weigh more than one effect')
assert.ok(recurringTaxes.signals.lockPotential.score>oneTax.signals.lockPotential.score,'stacked restrictions must raise lock potential')

const armageddon=buildTableFriction({},fill([card('Armageddon','Sorcery','Destroy all lands.')]))
assert.ok(armageddon.signals.massLandDenial.score>0,'mass land destruction must be surfaced')
assert.equal(armageddon.signals.massLandDenial.evidence[0].recurring,false,'one-shot MLD must remain one-shot evidence')

const theft=buildTableFriction({},fill([card('Control Magic','Enchantment — Aura','Enchant creature. You control enchanted creature.')]))
assert.ok(theft.signals.theft.score>0,'theft must be surfaced')

const observer=buildTableFriction({},fill([card('Observer','Creature','Whenever an opponent discards a card, draw a card.')]))
assert.equal(observer.signals.forcedDiscardSacrifice.score,0,'observer-only discard text must not count as forced discard')

const extra=buildTableFriction({},fill([card('Time Warp','Sorcery','Target player takes an extra turn after this one.',['extra-turn'])]))
assert.ok(extra.signals.extraTurns.score>0,'extra-turn effect must be surfaced')

const complex=buildTableFriction({experience:{dimensions:{turnComplexity:{score:78}}}},fill([]))
assert.equal(complex.signals.longSequencing.score,78)
assert.equal(complex.signals.longSequencing.level,'high')

const serialized=JSON.stringify(recurringTaxes).toLowerCase()
for(const moral of ['toxic','salty','bad deck','good deck'])assert.equal(serialized.includes(moral),false,`friction output must not moralize with ${moral}`)

console.log('FRICTION MODEL OK — neutral, evidence-bearing and recurrence-sensitive')
