import assert from 'node:assert/strict'
import { tagsFor } from '../src/engine/cardFeatures.js'

const card=(name,oracle)=>({name,type:'Enchantment',oracle,cmc:2,manaCost:'{1}{R}',colors:['R'],colorIdentity:['R'],producedMana:[],legalities:{commander:'legal'}})
const tags=c=>tagsFor(c)

const lasting=card('Lasting Tarfire','At the beginning of each end step, if you put a counter on a creature this turn, this enchantment deals 2 damage to each opponent.')
assert.equal(tags(lasting).includes('counter-producer'),false,'Lasting Tarfire observes counter placement; it does not produce counters')
assert.equal(tags(lasting).includes('counter-payoff'),true,'Lasting Tarfire rewards your counter placement and must remain a payoff')

const realProducer=card('Test Counter Maker','When this enchantment enters, put a +1/+1 counter on target creature you control.')
assert.equal(tags(realProducer).includes('counter-producer'),true,'explicit put-counter instructions must remain producers')

const triggerProducer=card('Test Triggered Maker','Whenever you put a +1/+1 counter on a creature you control, put a +1/+1 counter on another target creature you control.')
assert.equal(tags(triggerProducer).includes('counter-producer'),true,'a counter observer with a separate counter-placement effect must remain a producer')
assert.equal(tags(triggerProducer).includes('counter-payoff'),true,'counter-triggered effects are also payoffs')

console.log('COUNTER OBSERVER REGRESSION OK — observations are payoffs, actual placement remains production')
