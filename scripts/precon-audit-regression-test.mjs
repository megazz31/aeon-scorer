import assert from 'node:assert/strict'
import { featureDeck } from '../src/engine/cardFeatures.js'
import { detectPackages } from '../src/engine/packageGraph.js'
import { analyzePower } from '../src/engine/powerModel.js'

const card=(name,type,oracle,cmc=2,extra={})=>({name,type,oracle,cmc,manaCost:'',colors:[],colorIdentity:[],producedMana:[],legalities:{commander:'legal'},...extra})

const genericSpells=Array.from({length:10},(_,i)=>card(`Audit Spell ${i+1}`,i%2?'Sorcery':'Instant','Draw a card.',2))
const copyAdept=card('Copy Adept','Creature — Wizard','When Copy Adept enters the battlefield, copy target instant or sorcery spell. You may choose new targets for the copy.',3)
const oneShotCopy=card('One-Shot Reflection','Instant','Copy target instant or sorcery spell. You may choose new targets for the copy.',2)
const spellPackages=detectPackages(featureDeck([...genericSpells,copyAdept,oneShotCopy]))
assert.equal(spellPackages.some(p=>p.id==='spells'),false,'one-shot instants/sorceries must not satisfy the Spellslinger payoff threshold')

const blinkA=card('Audit Flicker A','Instant','Exile target creature you control, then return it to the battlefield under its owner’s control.',1)
const blinkB=card('Audit Flicker B','Instant','Exile another target creature you control, then return it to the battlefield under its owner’s control.',2)
const etbA=card('Audit Visionary A','Creature — Elf','When Audit Visionary A enters the battlefield, draw a card.',2)
const etbB=card('Audit Visionary B','Creature — Human','When Audit Visionary B enters the battlefield, create a 1/1 white Soldier creature token.',3)
const bounceA=card('Audit Chancery A','Land','Audit Chancery A enters the battlefield tapped. When Audit Chancery A enters the battlefield, return a land you control to its owner’s hand.',0)
const bounceB=card('Audit Chancery B','Land','Audit Chancery B enters the battlefield tapped. When Audit Chancery B enters the battlefield, return a land you control to its owner’s hand.',0)
const blinkPackage=detectPackages(featureDeck([blinkA,blinkB,etbA,etbB,bounceA,bounceB])).find(p=>p.id==='blink-etb')
assert.ok(blinkPackage,'real nonland ETB payoffs should still form a Blink / ETB package')
assert.deepEqual(blinkPackage.payoffs.sort(),['Audit Visionary A','Audit Visionary B'],'lands must never be counted as blink ETB payoffs')

const commander=card('Audit Commander','Legendary Creature — Human','Whenever you cast a noncreature spell, draw a card.',4,{manaCost:'{2}{U}{R}',colors:['U','R'],colorIdentity:['U','R']})
const orderDeck=[...genericSpells,copyAdept,oneShotCopy,blinkA,blinkB,etbA,etbB,bounceA,bounceB,
  ...Array.from({length:12},(_,i)=>card(`Audit Land ${i+1}`,'Basic Land — Island','{T}: Add {U}.',0,{producedMana:['U']})),
  ...Array.from({length:12},(_,i)=>card(`Audit Rock ${i+1}`,'Artifact',`{T}: Add {U}.`,2,{producedMana:['U']})),
]
const forward=analyzePower(orderDeck,commander,new Map(),700)
const reversed=analyzePower([...orderDeck].reverse(),commander,new Map(),700)
assert.deepEqual(reversed.profile,forward.profile,'profile must be invariant to decklist order')
assert.deepEqual(reversed.dimensions,forward.dimensions,'dimensions must be invariant to decklist order')
assert.deepEqual(reversed.packages,forward.packages,'packages must be invariant to decklist order')
assert.deepEqual(reversed.simulation.turnProfile,forward.simulation.turnProfile,'turn simulation must be invariant to decklist order')

console.log('PRECON AUDIT REGRESSION OK — package precision and deck-order invariance')
