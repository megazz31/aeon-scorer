import assert from 'node:assert/strict'
import { cardFeatures } from '../src/engine/cardFeatures.js'
import { detectPackages } from '../src/engine/packageGraph.js'

const card=(name,oracle='',cmc=2,type='Creature — Human',manaCost='{2}')=>cardFeatures({name,oracle,cmc,type,manaCost,producedMana:[]})
const equipment=(name,cmc=2)=>card(name,'Equipped creature gets +1/+1.\nEquip {2}',cmc,'Artifact — Equipment',`{${cmc}}`)

const equips=Array.from({length:6},(_,i)=>equipment(`Equipment ${i}`,i<2?1:2))
const brass=card('Brass Squire','{T}: Attach target Equipment you control to target creature you control.',3,'Artifact Creature — Myr','{3}')
const relic=card('Relic Seeker','Renown 1\nWhen this creature becomes renowned, you may search your library for an Equipment card, reveal it, put it into your hand, then shuffle.',2,'Creature — Human Soldier','{1}{W}')
const slayer=card('Ironclad Slayer','When this creature enters, you may return target Aura or Equipment card from your graveyard to your hand.',3,'Creature — Human Warrior','{2}{W}')

const supportOnly=detectPackages([...equips,brass,relic,slayer],null)
assert(!supportOnly.some(p=>p.id==='equipment'),'Equipment tutors/attach/recursion are support, not enough to fake an operational payoff package')

const wyleth=card('Wyleth, Soul of Steel','Trample\nWhenever Wyleth, Soul of Steel attacks, draw a card for each Aura and Equipment attached to it.',3,'Legendary Creature — Human Warrior','{1}{R}{W}')
const wylethPkg=detectPackages([...equips,brass,relic,slayer],wyleth).find(p=>p.id==='equipment')
assert(wylethPkg,'a real Equipment-payoff commander must complete the Equipment package')
assert.deepEqual(new Set(wylethPkg.supportCards.map(x=>x.name)),new Set(['Brass Squire','Relic Seeker','Ironclad Slayer']))
assert.deepEqual(wylethPkg.payoffCards.map(x=>x.name),['Wyleth, Soul of Steel'])

const sram=card('Sram, Senior Edificer','Whenever you cast an Aura, Equipment, or Vehicle spell, draw a card.',2,'Legendary Creature — Dwarf Advisor','{1}{W}')
const sramPkg=detectPackages([...equips,sram],null).find(p=>p.id==='equipment')
assert(sramPkg,'cast-trigger card advantage from Equipment is a real payoff')
assert(sramPkg.payoffCards.some(x=>x.name==='Sram, Senior Edificer'))

const shikari=card('Leonin Shikari','You may activate equip abilities any time you could cast an instant.',2,'Creature — Cat Soldier','{1}{W}')
const shikariOnly=detectPackages([...equips,shikari],null)
assert(!shikariOnly.some(p=>p.id==='equipment'),'equip timing flexibility is support, not a payoff by itself')

console.log('EQUIPMENT PACKAGE PRECISION OK — tutors/attach/recursion are support, real conversion effects are payoffs')
