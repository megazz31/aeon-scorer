import assert from 'node:assert/strict'
import fs from 'node:fs'
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
assert.equal(wylethPkg.sequencePayoffRatio,0,'attack/attachment payoff must not count as immediately active')
assert.equal(wylethPkg.scoringCohesion,Math.round(wylethPkg.cohesion*.35),'delayed-only Equipment package keeps structural cohesion but receives the conservative scoring floor')
assert(wylethPkg.scoringCohesion<wylethPkg.cohesion,'delayed-only Equipment package must not inject full structural cohesion into power scoring')

const sram=card('Sram, Senior Edificer','Whenever you cast an Aura, Equipment, or Vehicle spell, draw a card.',2,'Legendary Creature — Dwarf Advisor','{1}{W}')
const sramPkg=detectPackages([...equips,sram],null).find(p=>p.id==='equipment')
assert(sramPkg,'cast-trigger card advantage from Equipment is a real payoff')
assert(sramPkg.payoffCards.some(x=>x.name==='Sram, Senior Edificer'))
assert.equal(sramPkg.sequencePayoffRatio,1,'cast-trigger payoff is immediately active')
assert.equal(sramPkg.scoringCohesion,sramPkg.cohesion,'fully immediate Equipment package must keep full scoring cohesion')

const mixedPkg=detectPackages([...equips,sram],wyleth).find(p=>p.id==='equipment')
assert(mixedPkg,'mixed immediate/delayed Equipment package should still exist')
assert.equal(mixedPkg.sequencePayoffRatio,.5)
assert.deepEqual(mixedPkg.sequencePayoffs,['Sram, Senior Edificer'])
assert.equal(mixedPkg.scoringCohesion,Math.round(mixedPkg.cohesion*(.35+.5*.65)),'mixed package scoring cohesion should scale monotonically with immediately active payoff depth')

const powerSource=fs.readFileSync(new URL('../src/engine/powerModel.js',import.meta.url),'utf8')
assert(powerSource.includes('p.scoringCohesion??p.cohesion??p.strength??0'),'power scoring must consume scoringCohesion before structural cohesion')
assert(powerSource.includes('top=[...packages].sort((a,b)=>value(b)-value(a)).slice(0,3)'),'power scoring must rank packages by scoring cohesion, not structural display cohesion')

const shikari=card('Leonin Shikari','You may activate equip abilities any time you could cast an instant.',2,'Creature — Cat Soldier','{1}{W}')
const shikariOnly=detectPackages([...equips,shikari],null)
assert(!shikariOnly.some(p=>p.id==='equipment'),'equip timing flexibility is support, not a payoff by itself')

console.log('EQUIPMENT PACKAGE PRECISION OK — structural cohesion is preserved while scoring cohesion tracks immediately active payoff depth')
