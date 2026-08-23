import assert from 'node:assert/strict'
import { combinedColorIdentity,commanderPairKind,isDoctor,validateCommanderPair } from '../src/engine/commanderPair.js'

const tenth={name:'The Tenth Doctor',type:'Legendary Creature — Time Lord Doctor',oracle:'Allons-y!',colorIdentity:['U','R']}
const rose={name:'Rose Tyler',type:'Legendary Creature — Human',oracle:"Doctor's companion",colorIdentity:['W']}
const fakeDoctor={name:'Fake Doctor',type:'Legendary Creature — Time Lord Doctor Human',oracle:'',colorIdentity:['U']}
const timeLordScientist={name:'Romana II',type:'Legendary Creature — Time Lord Scientist',oracle:'',colorIdentity:['W','U']}
assert.equal(isDoctor(tenth),true)
assert.equal(isDoctor(fakeDoctor),false)
assert.equal(isDoctor(timeLordScientist),false)
assert.equal(commanderPairKind(tenth,rose),'doctors-companion')
assert.deepEqual(validateCommanderPair(tenth,rose),{ok:true,kind:'doctors-companion',colorIdentity:['R','U','W']})
assert.equal(commanderPairKind(fakeDoctor,rose),null)

const partnerA={name:'A',type:'Legendary Creature — Human',oracle:'Partner',colorIdentity:['U']}
const partnerB={name:'B',type:'Legendary Creature — Elf',oracle:'Partner',colorIdentity:['G']}
assert.equal(commanderPairKind(partnerA,partnerB),'partner')
assert.deepEqual(combinedColorIdentity([partnerA,partnerB]),['G','U'])

const chooseBg={name:'Commander',type:'Legendary Creature — Human',oracle:'Choose a Background',colorIdentity:['B']}
const background={name:'Background',type:'Legendary Enchantment — Background',oracle:'',colorIdentity:['R']}
assert.equal(commanderPairKind(chooseBg,background),'background')

const friendsA={name:'Eleven',type:'Legendary Creature — Human',oracle:'Friends forever',colorIdentity:['U']}
const friendsB={name:'Mike',type:'Legendary Creature — Human',oracle:'Friends forever',colorIdentity:['R']}
assert.equal(commanderPairKind(friendsA,friendsB),'friends-forever')

console.log('COMMANDER PAIR OK — Partner, Background, Friends forever and Doctor\'s companion')
