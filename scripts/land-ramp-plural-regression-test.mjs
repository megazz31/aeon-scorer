import assert from 'node:assert/strict'
import { cardFeatures } from '../src/engine/cardFeatures.js'
import { augmentFeatureDeck, isOracleLandRamp } from '../src/engine/semanticAugment.js'
import { analyzePower } from '../src/engine/powerModel.js'

const raw=(name,oracle,cmc=3,type='Sorcery',manaCost='{2}{G}')=>({name,oracle,cmc,type,manaCost,colors:['G'],colorIdentity:['G'],producedMana:[]})
const ramp=[
  raw("Kodama's Reach",'Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.'),
  raw('Cultivate','Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.'),
  raw('Migration Path','Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.\nCycling {2}',4,'Sorcery','{3}{G}'),
  raw('Encroaching Dragonstorm','When this enchantment enters, search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.\nWhen a Dragon you control enters, return this enchantment to its owner’s hand.',4,'Enchantment','{3}{G}'),
]
for(const c of ramp)assert.equal(isOracleLandRamp(c),true,`${c.name} must be recognized as explicit land ramp`)
const augmented=augmentFeatureDeck(ramp.map(cardFeatures))
for(const c of augmented)assert.ok(c.tags.includes('land-ramp'),`${c.name} must receive the land-ramp functional tag before analysis`)

const toHand=raw('Land Tutor Only','Search your library for up to two basic land cards, reveal them, put them into your hand, then shuffle.')
assert.equal(isOracleLandRamp(toHand),false,'land tutors that never deploy a land must not become ramp')

// Regression at analysis level: a high-MV commander must see these as real setup,
// not only as text labels, so they can enter early-commander/package evidence.
const commander=raw('Seven Mana Commander','Flying, trample',7,'Legendary Creature — Dragon','{4}{G}{G}{G}')
const forests=Array.from({length:38},(_,i)=>raw(`Forest ${i}`,'{T}: Add {G}.',0,'Basic Land — Forest',''))
const rocks=Array.from({length:4},(_,i)=>raw(`Rock ${i}`,'{T}: Add {G}.',2,'Artifact','{2}'))
const filler=Array.from({length:53},(_,i)=>raw(`Dragon ${i}`,'Flying',5,'Creature — Dragon','{4}{G}'))
const result=analyzePower([...forests,...rocks,...ramp,...filler],commander,null,250,{emitProduct:false,record:false,firstAccess:false})
const early=result.packages.find(p=>p.id==='early-commander')
assert.ok(early,'high-MV commander shell should expose early-commander setup')
for(const name of ["Kodama's Reach",'Cultivate'])assert.ok(early.members.includes(name),`${name} must participate in commander acceleration evidence`)

console.log('LAND RAMP PLURAL REGRESSION OK — Cultivate/Kodama/Migration/Dragonstorm are functional ramp without promoting hand-only tutors')
