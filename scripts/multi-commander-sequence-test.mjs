import assert from 'node:assert/strict'
import { planCommanderCasts } from '../src/engine/sequenceSimulatorMulti.js'

const generic=(name,cmc=3)=>({name,cmc,manaReq:{generic:cmc,colored:[],total:cmc}})
const mana=n=>Array.from({length:n},(_,i)=>({options:['C'],origin:`mana-${i}`}))
const A=generic('Alpha'),B=generic('Beta')

const onlyThree=planCommanderCasts([A,B],[null,null],[0,0],mana(3))
assert.deepEqual(onlyThree.names,['Alpha'],'three mana must not cast two three-mana commanders')
assert.equal(onlyThree.remaining.length,0)

const reversed=planCommanderCasts([B,A],[null,null],[0,0],mana(3))
assert.deepEqual(reversed.names,['Alpha'],'two-commandant access must not depend on input order when only one can be cast')

const six=planCommanderCasts([A,B],[null,null],[0,0],mana(6))
assert.deepEqual(new Set(six.names),new Set(['Alpha','Beta']))
assert.equal(six.remaining.length,0,'casting both commanders must consume all six mana')

const separateTax=planCommanderCasts([A,B],[null,null],[1,0],mana(4))
assert.deepEqual(separateTax.names,['Beta'],'Alpha commander tax must not increase Beta cost')
assert.equal(separateTax.remaining.length,1)

const alphaAlreadyOnline=planCommanderCasts([A,B],[2,null],[1,0],mana(3))
assert.deepEqual(alphaAlreadyOnline.names,['Beta'],'an online commander must not consume mana again while checking its partner')

console.log('MULTI COMMANDER SEQUENCE OK — no mana double-spend, canonical order and independent tax')
