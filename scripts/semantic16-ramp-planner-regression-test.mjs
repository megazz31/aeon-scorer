import assert from 'node:assert/strict'
import fs from 'node:fs'
import { analyzePower } from '../src/engine/powerModel.js'
import { immediateLandRampNetSources } from '../src/engine/sequenceSimulator.js'

const rampCard=(name,oracle,cmc)=>({name,oracle,cmc,type:'Sorcery',manaCost:'',tags:['sorcery','land-ramp'],isLand:false,sourceColors:[],manaReq:{generic:cmc,colored:[],total:cmc}})
assert.equal(immediateLandRampNetSources(rampCard('Cultivate','Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.',3)),1,'Cultivate creates one net battlefield mana source')
assert.equal(immediateLandRampNetSources(rampCard('Migration Path','Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.',4)),2,'Migration Path creates two net battlefield mana sources')
assert.equal(immediateLandRampNetSources(rampCard('Encroaching Dragonstorm','When this enchantment enters, search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.',4)),2,'Encroaching Dragonstorm creates two net battlefield mana sources')
assert.equal(immediateLandRampNetSources(rampCard('Harrow','As an additional cost to cast this spell, sacrifice a land. Search your library for up to two basic land cards, put them onto the battlefield, then shuffle.',3)),1,'Harrow is +1 net source after sacrificing a land')
assert.equal(immediateLandRampNetSources(rampCard('Crop Rotation','As an additional cost to cast this spell, sacrifice a land. Search your library for a land card, put that card onto the battlefield, then shuffle.',1)),0,'Crop Rotation fixes land quality but is not mana acceleration')

function expandMainDeck(data){
  const index=new Map(data.oracleCards.map(c=>[String(c.name||'').toLowerCase(),c])),out=[]
  for(const raw of String(data.decklist||'').split(/\r?\n/)){
    const m=raw.trim().match(/^(\d+)\s+(.+)$/);if(!m)continue
    const qty=Number(m[1])||0,name=m[2].trim(),source=index.get(name.toLowerCase())
    assert.ok(source,`Oracle evidence missing: ${name}`)
    for(let i=0;i<qty;i++)out.push({...source,isCommander:false})
  }
  return out
}

const dance=JSON.parse(fs.readFileSync('public/precons/dance-of-the-elements-ecc.json','utf8'))
const ashling=dance.oracleCards.find(c=>c.name==='Ashling, the Limitless')
assert.ok(ashling,'Dance of the Elements must expose Ashling Oracle evidence')
const danceCards=expandMainDeck(dance).filter(c=>c.name!=='Ashling, the Limitless')
const danceResult=analyzePower(danceCards,{...ashling,isCommander:true},null,600,{firstAccess:false,emitProduct:false,record:false})
assert.ok(danceResult.packages.some(p=>p.id==='lands'),'Correct plural land-ramp semantics must retain the real Lands / Landfall subpackage')
assert.ok(danceResult.simulation.commanderMedianTurn<=3,`Castable MV3 commander must not be delayed behind Cultivate/Kodama setup (got T${danceResult.simulation.commanderMedianTurn})`)
const danceT3=danceResult.simulation.turnProfile.find(x=>x.turn===3)?.commander||0
assert.ok(danceT3>=48,`Commander-priority planner should keep Ashling online in at least about half of sequences by T3 (got ${danceT3}%)`)

const temur=JSON.parse(fs.readFileSync('public/precons/temur-roar-tdc.json','utf8'))
const migration=temur.oracleCards.find(c=>c.name==='Migration Path')
const encroaching=temur.oracleCards.find(c=>c.name==='Encroaching Dragonstorm')
assert.ok(migration&&encroaching,'Temur Roar must retain real two-land ramp evidence')
const featuredMigration={...migration,tags:[...new Set([...(migration.tags||[]),'land-ramp'])]}
const featuredEncroaching={...encroaching,tags:[...new Set([...(encroaching.tags||[]),'land-ramp'])]}
assert.equal(immediateLandRampNetSources(featuredMigration),2,'Migration Path remains two-source ramp in the real precon corpus')
assert.equal(immediateLandRampNetSources(featuredEncroaching),2,'Encroaching Dragonstorm remains two-source ramp in the real precon corpus')

console.log('SEMANTIC16 RAMP PLANNER REGRESSION OK — net ramp counts, mulligan quality and commander-first sequencing stay coherent')
