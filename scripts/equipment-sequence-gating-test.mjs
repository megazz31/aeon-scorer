import assert from 'node:assert/strict'
import { analyzePower } from '../src/engine/powerModel.js'

const raw=(name,type,oracle,cmc=2,manaCost='{2}',producedMana=[])=>({name,type,oracle,cmc,manaCost,colors:[],colorIdentity:[],producedMana,legalities:{commander:'legal'}})
const plains=i=>raw(`Plains ${i}`,'Basic Land — Plains','{T}: Add {W}.',0,'',['W'])
const mountain=i=>raw(`Mountain ${i}`,'Basic Land — Mountain','{T}: Add {R}.',0,'',['R'])
const equipment=(i)=>raw(`Equipment ${i}`,'Artifact — Equipment','Equipped creature gets +1/+1.\nEquip {2}',1,'{1}')
const filler=i=>raw(`Filler ${i}`,'Creature — Soldier','',2,'{1}{W}')

const wyleth=raw('Wyleth, Soul of Steel','Legendary Creature — Human Warrior','Trample\nWhenever Wyleth, Soul of Steel attacks, draw a card for each Aura and Equipment attached to it.',3,'{1}{R}{W}')
const helper=raw('Helper Partner','Legendary Creature — Human','Partner',2,'{1}{W}')
const attachmentOnlyDeck=[
  ...Array.from({length:19},(_,i)=>plains(i)),
  ...Array.from({length:19},(_,i)=>mountain(i)),
  ...Array.from({length:10},(_,i)=>equipment(i)),
  ...Array.from({length:51},(_,i)=>filler(i)),
]
const wylethResult=analyzePower(attachmentOnlyDeck,wyleth,null,500,{emitProduct:false,record:false,firstAccess:false})
assert(wylethResult.packages.some(p=>p.id==='equipment'),'Wyleth must still create a real structural Equipment package')
assert(wylethResult.commanderSynergy.tags.includes('equipment-payoff'),'Wyleth must still receive Equipment commander synergy')
assert(wylethResult.methodology.limitations.includes('equipment-attachment-activation-combat-not-sequence-simulated'))
assert(wylethResult.simulation.turnProfile.every(x=>x.engine===0),'attack/attached-only Equipment payoff must not become an operational sequence engine without attachment/combat modeling')

const multiResult=analyzePower(attachmentOnlyDeck,[wyleth,helper],null,500,{emitProduct:false,record:false,firstAccess:false})
assert(multiResult.packages.some(p=>p.id==='equipment'),'multi-commander mode must retain the same structural Equipment package')
assert(multiResult.methodology.limitations.includes('equipment-attachment-activation-combat-not-sequence-simulated'))
assert(multiResult.simulation.turnProfile.every(x=>x.engine===0),'multi-commander simulation must not restore attachment/combat-only Equipment timing inflation')

const castPayoffs=Array.from({length:6},(_,i)=>raw(`Cast Payoff ${i}`,'Creature — Advisor','Whenever you cast an Equipment spell, draw a card.',2,'{1}{W}'))
const castDeck=[
  ...Array.from({length:38},(_,i)=>plains(i)),
  ...Array.from({length:10},(_,i)=>equipment(i)),
  ...castPayoffs,
  ...Array.from({length:45},(_,i)=>filler(i)),
]
const castResult=analyzePower(castDeck,null,null,500,{emitProduct:false,record:false,firstAccess:false})
assert(castResult.packages.some(p=>p.id==='equipment'),'cast-trigger payoffs must retain the Equipment package')
assert(castResult.simulation.turnProfile.some(x=>x.engine>0),'immediately active Equipment cast payoffs must remain sequence-operational')

console.log('EQUIPMENT SEQUENCE GATING OK — single/multi attachment-combat payoffs are structural only, cast payoffs remain operational')
