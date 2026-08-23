import assert from 'node:assert/strict'
import { cardFeatures, featureDeck } from '../src/engine/cardFeatures.js'
import { commanderSynergy, detectPackages } from '../src/engine/packageGraph.js'
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
const opponentEtb=card('Audit Stagnation','Creature — Eldrazi','Whenever a land an opponent controls enters, that player exiles the top two cards of their library and you draw two cards.',6)
const bounceA=card('Audit Chancery A','Land','Audit Chancery A enters the battlefield tapped. When Audit Chancery A enters the battlefield, return a land you control to its owner’s hand.',0)
const bounceB=card('Audit Chancery B','Land','Audit Chancery B enters the battlefield tapped. When Audit Chancery B enters the battlefield, return a land you control to its owner’s hand.',0)
const blinkPool=featureDeck([blinkA,blinkB,etbA,etbB,opponentEtb,bounceA,bounceB])
const blinkPackage=detectPackages(blinkPool).find(p=>p.id==='blink-etb')
assert.ok(blinkPackage,'real nonland ETB payoffs should still form a Blink / ETB package')
assert.deepEqual(blinkPackage.payoffs.sort(),['Audit Visionary A','Audit Visionary B'],'lands and opponent-only entry triggers must never be counted as blink ETB payoffs')

const landfallCommander=cardFeatures(card('Audit Landfall Commander','Legendary Creature — Serpent','Whenever a land enters the battlefield under your control, draw a card.',6))
const landfallSynergy=commanderSynergy(blinkPool,landfallCommander)
assert.equal(landfallSynergy.tags.includes('blink'),false,'mentioning another permanent entering must not turn a commander into a blink engine')
const selfEtbCommander=cardFeatures(card('Audit ETB Commander','Legendary Creature — Human','When Audit ETB Commander enters the battlefield, draw a card.',4))
const selfEtbSynergy=commanderSynergy(blinkPool,selfEtbCommander)
assert.equal(selfEtbSynergy.tags.includes('blink'),true,'a commander with its own ETB may connect to actual blink sources')
assert.equal(selfEtbSynergy.connected.includes('Audit Visionary A'),false,'a self-ETB commander must not automatically connect to unrelated ETB creatures')
assert.equal(selfEtbSynergy.connected.includes('Audit Flicker A'),true,'a self-ETB commander should connect to real blink sources')

// Counter packages must connect compatible counter kinds and compatible targets, not merely the word "counter".
const plusProducers=Array.from({length:3},(_,i)=>card(`Plus Producer ${i+1}`,'Creature — Human',`{T}: Put a +1/+1 counter on target creature you control.`,2))
const chargePayoffs=Array.from({length:2},(_,i)=>card(`Charge Payoff ${i+1}`,'Artifact',`{T}: Add {C} for each charge counter on Charge Payoff ${i+1}.`,2))
const mixedCounters=detectPackages(featureDeck([...plusProducers,...chargePayoffs]))
assert.equal(mixedCounters.some(p=>p.id==='counters'),false,'+1/+1 producers must not connect to charge-counter payoffs')
const plusPayoffs=Array.from({length:2},(_,i)=>card(`Plus Payoff ${i+1}`,'Enchantment',`Creatures you control get +1/+1 for each +1/+1 counter on Plus Payoff ${i+1}.`,2))
const plusCounters=detectPackages(featureDeck([...plusProducers,...plusPayoffs])).find(p=>p.id==='counters')
assert.ok(plusCounters,'matching +1/+1 producers and payoffs must still form a counter package')
const proliferators=Array.from({length:3},(_,i)=>card(`Proliferator ${i+1}`,'Creature — Vedalken',`When Proliferator ${i+1} enters, proliferate.`,2))
const proliferateCharge=detectPackages(featureDeck([...proliferators,...chargePayoffs])).find(p=>p.id==='counters')
assert.ok(proliferateCharge,'proliferate must remain a wildcard compatible with existing counter types')
const aetherSnap=cardFeatures(card('Aether Snap','Sorcery','Remove all counters from all permanents and exile all tokens.',5))
assert.equal(aetherSnap.tags.includes('counter-payoff'),false,'global counter removal must not be treated as a counter payoff')
const minusOwn=Array.from({length:3},(_,i)=>card(`Own Minus Producer ${i+1}`,'Creature — Shaman','{T}: Put a -1/-1 counter on target creature you control.',2))
const archfiendLike=card('Opponent Minus Producer','Creature — Demon','Whenever you discard a card, put a -1/-1 counter on each creature your opponents control.',5)
const minusPayoffs=Array.from({length:2},(_,i)=>card(`Minus Payoff ${i+1}`,'Creature — Horror',`When Minus Payoff ${i+1} dies, draw a card for each -1/-1 counter on it.`,3))
const scopedCounters=detectPackages(featureDeck([...minusOwn,archfiendLike,...minusPayoffs])).find(p=>p.id==='counters')
assert.ok(scopedCounters,'valid own -1/-1 producers and payoffs should still form a package')
assert.equal(scopedCounters.producers.includes('Opponent Minus Producer'),false,'opponent-only counter placement must not feed internal counter payoffs')

// Conditional or delayed ramp is not immediate commander acceleration merely because it has a land-ramp tag.
const fourCmcCommander=cardFeatures(card('Audit Four Commander','Legendary Creature — Human','',4,{manaCost:'{3}{W}',colors:['W'],colorIdentity:['W']}))
const rocks=featureDeck(Array.from({length:3},(_,i)=>card(`Audit Rock ${i+1}`,'Artifact','{T}: Add {W}.',2,{producedMana:['W']})))
const sword=cardFeatures(card('Sword of the Animist','Artifact — Equipment','Equipped creature gets +1/+1. Whenever equipped creature attacks, you may search your library for a basic land card, put it onto the battlefield tapped, then shuffle. Equip {2}',2))
assert.equal(detectPackages([...rocks,sword],fourCmcCommander).some(p=>p.id==='early-commander'),false,'attack-triggered ramp must not satisfy immediate commander acceleration')
const lore=cardFeatures(card("Nature's Lore",'Sorcery','Search your library for a Forest card, put that card onto the battlefield, then shuffle.',2))
assert.equal(detectPackages([...rocks,lore],fourCmcCommander).some(p=>p.id==='early-commander'),true,'immediate land ramp should still count toward commander acceleration')

// Incidental lifelink is not a commander life-engine by itself.
const atraxaLike=cardFeatures(card('Audit Lifelink Commander','Legendary Creature — Phyrexian Angel','Flying, vigilance, deathtouch, lifelink. At the beginning of your end step, proliferate.',4))
const lifePool=featureDeck([
  card('Soul Warden','Creature — Human Cleric','Whenever another creature enters, you gain 1 life.',1),
  card('Ajani Pridemate','Creature — Cat Soldier','Whenever you gain life, put a +1/+1 counter on this creature.',2),
])
const incidentalLife=commanderSynergy(lifePool,atraxaLike)
assert.equal(incidentalLife.tags.includes('lifegain'),false,'lifelink alone must not seed commander lifegain synergy')
assert.equal(incidentalLife.tags.includes('life-payoff'),false,'lifelink alone must not pull in life payoffs')
const oloroLike=cardFeatures(card('Audit Life Commander','Legendary Creature — Giant Soldier','At the beginning of your upkeep, you gain 2 life.',6))
const explicitLife=commanderSynergy(lifePool,oloroLike)
assert.equal(explicitLife.tags.includes('lifegain'),true,'explicit repeated life gain should seed commander lifegain synergy')
assert.equal(explicitLife.tags.includes('life-payoff'),true,'explicit life gain should connect to actual life-gain payoffs')

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

console.log('PRECON AUDIT REGRESSION OK — package precision, scoped counters/ramp, commander directionality and deck-order invariance')
