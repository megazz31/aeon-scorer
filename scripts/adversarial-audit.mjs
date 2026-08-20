import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { cardFeatures } from '../src/engine/cardFeatures.js'
import { parseDecklist, acceptableFuzzyName } from '../src/scryfall.js'

const card=(name,oracle,type='Instant',cmc=2,manaCost='{1}{W}')=>cardFeatures({name,oracle,type,cmc,manaCost})
const has=(c,t)=>c.tags.includes(t)

for(const [name,text] of [
  ['Cloudshift','Exile target creature you control, then return that card to the battlefield under your control.'],
  ['Ghostly Flicker','Exile two target artifacts, creatures, and/or lands you control, then return those cards to the battlefield under your control.'],
  ['Eerie Interlude','Exile any number of target creatures you control. Return those cards to the battlefield under their owner’s control at the beginning of the next end step.'],
]){
  const c=card(name,text)
  assert(has(c,'blink'),`${name}: protective blink must be recognized`)
  assert(!has(c,'removal'),`${name}: own-target blink must never become removal`)
}
const temporary=card('Temporary Dog','Exile up to one other target nonland permanent. At the beginning of the next end step, return that card to the battlefield under its owner’s control.','Creature',2,'{1}{W}')
assert(has(temporary,'tempo-interaction'))
assert(!has(temporary,'removal'))
for(const name of ['Lotus Petal','Burnt Offering Rock','Self Sac Stone']){
  const c=card(name,`Sacrifice ${name}: Add three mana of any one color.`,'Artifact',0,'{0}')
  assert(!has(c,'sac-outlet'),`${name}: self-sacrifice is not a package sac outlet`)
}
const cleric=card('Tutor Cleric','When Tutor Cleric enters, search your library for an enchantment card and put it into your hand.','Creature',3,'{2}{W}')
assert(has(cleric,'tutor'));assert(!has(cleric,'enchantment'))
const disenchant=card('Disenchant','Destroy target artifact or enchantment.','Instant',2,'{1}{W}')
assert(has(disenchant,'removal'));assert(!has(disenchant,'artifact')&&!has(disenchant,'enchantment'))
const graveHate=card('Grave Hate','Exile target card from a graveyard.','Instant',1,'{W}')
assert(!has(graveHate,'graveyard-setup')&&!has(graveHate,'recursion'))

assert(acceptableFuzzyName('Lightning Bolt',{name:'Lightning Bolt',aliases:[]}))
assert(acceptableFuzzyName('Lightning Bol',{name:'Lightning Bolt',aliases:[]}))
assert(!acceptableFuzzyName('Lightning',{name:'Lightning Bolt',aliases:[]}),'Fuzzy fallback must not accept large prefix gaps')

const list=parseDecklist('Commander\n1 Test Commander\nMainboard\n1 Sol Ring\nArcane Signet x1\n1x Command Tower\n1 Forest [M21]\n1 Island (M21) 265 *F*\nSideboard\n1 Demonic Tutor\n1 Vampiric Tutor\nMaybeboard\n1 Mana Crypt')
assert.deepEqual(list,[{qty:1,name:'Test Commander'},{qty:1,name:'Sol Ring'},{qty:1,name:'Arcane Signet'},{qty:1,name:'Command Tower'},{qty:1,name:'Forest'},{qty:1,name:'Island'}],'Sideboard/maybeboard cards must never enter scoring input')

const app=await fs.readFile('src/App.jsx','utf8')
const features=await fs.readFile('src/engine/cardFeatures.js','utf8')
const packages=await fs.readFile('src/engine/packageGraph.js','utf8')
const workflow=await fs.readFile('.github/workflows/calibration.yml','utf8')
assert(!/Confiance modèle/i.test(app))
assert(!/>Rebuild</i.test(app))
assert(/Package opérationnel/.test(app))
assert(/counter-producer/.test(packages)&&/counter-payoff/.test(packages))
assert(!/payoffs:\['counter-payoff','doubling'\]/.test(packages))
assert(/COMMANDER_ENGINE_TAGS/.test(packages),'Commander synergy needs a functional-tag allowlist')
assert(!/COMMANDER_ENGINE_TAGS=new Set\([^\n]*'enchantment'/.test(packages),'Raw permanent types must not seed commander synergy')
assert(!/\['enchantment',\s*\/enchantment\//.test(features))
assert(/semantic/.test(workflow)&&/metamorphic/.test(workflow)&&/audit/.test(workflow)&&/3200/.test(workflow),'CI must execute micro, adversarial and cross-iteration verification')

console.log('ADVERSARIAL AUDIT OK — false positives, imports, name resolution, UI semantics, commander synergy and CI wiring')
