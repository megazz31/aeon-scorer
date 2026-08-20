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
]){const c=card(name,text);assert(has(c,'blink'),`${name}: protective blink must be recognized`);assert(!has(c,'removal'),`${name}: own-target blink must never become removal`)}
const temporary=card('Temporary Dog','Exile up to one other target nonland permanent. At the beginning of the next end step, return that card to the battlefield under its owner’s control.','Creature',2,'{1}{W}')
assert(has(temporary,'tempo-interaction'));assert(!has(temporary,'removal'))
for(const name of ['Lotus Petal','Burnt Offering Rock','Self Sac Stone']){const c=card(name,`Sacrifice ${name}: Add three mana of any one color.`,'Artifact',0,'{0}');assert(!has(c,'sac-outlet'),`${name}: self-sacrifice is not a package sac outlet`)}
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
const sequence=await fs.readFile('src/engine/sequenceSimulator.js','utf8')
const benchmark=await fs.readFile('scripts/benchmark.mjs','utf8')
const validator=await fs.readFile('scripts/validate-report.mjs','utf8')
const workflow=await fs.readFile('.github/workflows/calibration.yml','utf8')
const readme=await fs.readFile('README.md','utf8')
const notes=await fs.readFile('MODEL_NOTES.md','utf8')

assert(!/Confiance modèle/i.test(app))
assert(!/>Rebuild</i.test(app))
assert(/Package opérationnel/.test(app))
assert(/options de reprise accessibles/i.test(app)&&!/récupération après disruption T4→T5/i.test(app),'Recovery UI must describe access options, not claim a simulated rebuild')
assert(/Partner \/ Background/i.test(app),'Unsupported dual-command configurations must be disclosed')
assert(/Identité couleur incompatible/i.test(app),'UI must reject cards outside the chosen commander color identity')
assert(/non exhaustive/i.test(app),'Combo UI must disclose incomplete combo coverage')

assert(/counter-producer/.test(packages)&&/counter-payoff/.test(packages))
assert(!/payoffs:\['counter-payoff','doubling'\]/.test(packages))
assert(/COMMANDER_ENGINE_TAGS/.test(packages),'Commander synergy needs a functional-tag allowlist')
assert(!/COMMANDER_ENGINE_TAGS=new Set\([^\n]*'enchantment'/.test(packages),'Raw permanent types must not seed commander synergy')
assert(!/\['enchantment',\s*\/enchantment\//.test(features))
assert(/withoutReminderText/.test(features)&&/spellslinger=o=>[^\n]*withoutReminderText/.test(features),'Reminder text must not create spellslinger roles')

assert(/lion's eye diamond[^\n]*forCommander\?/.test(sequence),'LED must not be generic hand-casting mana')
for(const name of ['chrome mox','mox diamond','mox opal','mox amber'])assert(sequence.includes(`n.includes('${name}')`),`${name} condition must be modeled explicitly`)
assert(/if\(isPermanentCard\(ramp\)\)battlefield\.push\(ramp\)/.test(sequence),'Sorcery ramp must not remain as a battlefield permanent')
assert(/applyCommanderLondonBottom/.test(sequence)&&/Math\.max\(0,mulligans-1\)/.test(sequence),'Commander multiplayer mulligans must model one free mulligan then London bottoming')

assert(/precon-temporal-coverage/.test(benchmark)&&/cedh-commander-diversity/.test(benchmark),'Macro anchors must be temporally and strategically diversified')
assert(/sepAll\.preconMedian<=55/.test(benchmark)&&/sepAll\.cedhMedian>=72/.test(benchmark),'Base benchmark must preserve the strict presentation-scale gate')
assert(/strictScale\.precon<=55/.test(validator)&&/strictScale\.cedh>=72/.test(validator),'Extended validation must preserve strict scale gates instead of relaxing them')
assert(/semantic/.test(workflow)&&/metamorphic/.test(workflow)&&/audit/.test(workflow)&&/3200/.test(workflow),'CI must execute micro, adversarial and cross-iteration verification')

assert(!/Dernier run\s*:\s*\*\*12\/12/i.test(readme),'README must not claim the old 12/12 as current v3.1 validation')
assert(/v3\.1 est en validation/i.test(readme),'README must state pre-validation status before final CI')
assert(/pioche.*ne lance pas ensuite réellement/is.test(notes)&&/tuteurs.*ne sont pas exécutées dynamiquement/is.test(notes),'Known sequence-model limits must remain documented')

console.log('ADVERSARIAL AUDIT OK — semantics, imports, name resolution, UI claims, mana edge cases, Commander mulligans, strict benchmark policy, disclosures and CI wiring')
