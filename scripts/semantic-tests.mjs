import assert from 'node:assert/strict'
import { cardFeatures, featureDeck } from '../src/engine/cardFeatures.js'
import { detectPackages, commanderSynergy } from '../src/engine/packageGraph.js'
import { canPay, simulateSequences } from '../src/engine/sequenceSimulator.js'
import { parseDecklist } from '../src/scryfall.js'
import { parseAeonShiftCsv } from '../src/data/aeonshift.js'

const card=(name,oracle='',cmc=2,type='Instant',manaCost='',producedMana=[])=>cardFeatures({name,oracle,cmc,type,manaCost,producedMana})
const has=(c,t)=>c.tags.includes(t),no=(c,t)=>!has(c,t)

const ephemerate=card('Ephemerate','Exile target creature you control, then return it to the battlefield under its owner’s control. Rebound.',1,'Instant','{W}')
assert(has(ephemerate,'blink'));assert(has(ephemerate,'protection'));assert(no(ephemerate,'removal'))
const sanctum=card('Sanctum of All','At the beginning of your upkeep, you may search your library and/or your graveyard for a Shrine card and put it onto the battlefield. If an ability of another Shrine you control triggers while you control six or more Shrines, that ability triggers an additional time.',5,'Legendary Enchantment','{W}{U}{B}{R}{G}')
assert(has(sanctum,'enchantment'));assert(has(sanctum,'tutor'));assert(has(sanctum,'recursion'));assert(has(sanctum,'trigger-doubler'));assert(no(sanctum,'graveyard-setup'))
const panharm=card('Panharmonicon','If an artifact or creature entering the battlefield causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.',4,'Artifact','{4}')
assert(has(panharm,'artifact'));assert(has(panharm,'trigger-doubler'));assert(no(panharm,'counter-payoff'));assert(no(panharm,'token-doubler'))
const procession=card('Anointed Procession','If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.',4,'Enchantment','{3}{W}')
assert(has(procession,'token-doubler'));assert(no(procession,'counter-doubler'));assert(no(procession,'trigger-doubler'))
const doubling=card('Doubling Season','If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead. If an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.',5,'Enchantment','{4}{G}')
assert(has(doubling,'token-doubler'));assert(has(doubling,'counter-doubler'))
const petal=card('Lotus Petal','{T}, Sacrifice Lotus Petal: Add one mana of any color.',0,'Artifact','{0}',['W','U','B','R','G'])
assert(has(petal,'fast-mana'));assert(no(petal,'sac-outlet'))
const phelia=card('Phelia, Exuberant Shepherd','Whenever Phelia attacks, exile up to one other target nonland permanent. At the beginning of the next end step, return that card to the battlefield under its owner’s control. If it entered under your control, put a +1/+1 counter on Phelia.',2,'Legendary Creature — Dog','{1}{W}')
assert(has(phelia,'blink'));assert(has(phelia,'tempo-interaction'));assert(has(phelia,'counter-producer'));assert(no(phelia,'counter-payoff'))
const soulherder=card('Soulherder','Whenever a creature is exiled from the battlefield, put a +1/+1 counter on Soulherder. At the beginning of your end step, you may exile another target creature you control, then return that card to the battlefield under its owner’s control.',3,'Creature — Spirit','{1}{W}{U}')
assert(has(soulherder,'blink'));assert(has(soulherder,'counter-producer'));assert(no(soulherder,'counter-payoff'))
const wizard=card('Wizard Class','You have no maximum hand size. When this Class becomes level 2, draw two cards. Whenever you draw a card, put a +1/+1 counter on target creature you control.',1,'Enchantment — Class','{U}')
assert(has(wizard,'draw'));assert(has(wizard,'counter-producer'));assert(no(wizard,'counter-payoff'))
const cleric=card('Moon-Blessed Cleric','When Moon-Blessed Cleric enters the battlefield, you may search your library for an enchantment card, reveal it, then shuffle and put that card on top.',3,'Creature — Human Cleric','{2}{W}')
assert(has(cleric,'tutor'));assert(no(cleric,'enchantment'))

// Type alone must never seed commander synergy.
const plainEnchantmentCommander=card('Plain Enchantment Commander','Flying.',4,'Legendary Enchantment Creature — Spirit','{2}{W}{W}')
const genericEnchantments=Array.from({length:12},(_,i)=>card(`Generic Enchantment ${i}`,'Creatures you control get +0/+1.',2,'Enchantment','{1}{W}'))
assert.equal(commanderSynergy(genericEnchantments,plainEnchantmentCommander).score,0,'Enchantment type alone must not connect the whole deck')
// Conditional treasure makers are not persistent ramp sources/package members.
const treasureMaker=()=>card(`Conditional Treasure ${crypto.randomUUID()}`,'Whenever this creature deals combat damage to a player, create a Treasure token.',1,'Creature','{R}')
const treasurePkg=detectPackages(Array.from({length:6},treasureMaker),card('MV4 Commander','Flying.',4,'Legendary Creature','{2}{R}{R}'))
assert(!treasurePkg.some(p=>p.id==='early-commander'),'Conditional Treasures must not count as persistent early-command ramp')

const heiBai=card('Hei Bai, Forest Guardian','When Hei Bai enters, exile another target permanent you control, then return it to the battlefield. Whenever an enchantment enters under your control, create a 1/1 Spirit token.',4,'Legendary Creature — Spirit Avatar','{1}{W}{U}{B}')
const ritual=card('Dark Ritual','Add {B}{B}{B}.',1,'Instant','{B}')
const esg=card('Elvish Spirit Guide','Exile Elvish Spirit Guide from your hand: Add {G}.',3,'Creature — Elf Spirit','{2}{G}',['G'])
const ssg=card('Simian Spirit Guide','Exile Simian Spirit Guide from your hand: Add {R}.',3,'Creature — Ape Spirit','{2}{R}',['R'])
const blink2=card('Cloudshift','Exile target creature you control, then return that card to the battlefield under your control.',1,'Instant','{W}')
const etb1=card('Flickerwisp','When Flickerwisp enters the battlefield, exile another target permanent. Return that card to the battlefield under its owner’s control at the beginning of the next end step.',3,'Creature','{1}{W}{W}')
const etb2=card('Eidolon of Blossoms','Constellation — Whenever Eidolon of Blossoms or another enchantment enters the battlefield under your control, draw a card.',4,'Enchantment Creature','{2}{G}{G}')
const setessan=card('Setessan Champion','Constellation — Whenever an enchantment enters the battlefield under your control, put a +1/+1 counter on Setessan Champion and draw a card.',3,'Creature','{2}{G}')
const skybind=card('Skybind','Constellation — Whenever Skybind or another enchantment enters the battlefield under your control, exile target nonenchantment permanent. Return that card at the beginning of the next end step.',5,'Enchantment','{3}{W}{W}')
const shrines=Array.from({length:8},(_,i)=>card(`Shrine ${i}`,'At the beginning of your upkeep, draw a card.',2,'Legendary Enchantment — Shrine','{1}{U}'))
const heiCards=featureDeck([ritual,petal,esg,ssg,ephemerate,blink2,etb1,etb2,setessan,skybind,phelia,soulherder,wizard,panharm,procession,...shrines].map(x=>({...x})))
const pkgs=detectPackages(heiCards,heiBai),ids=new Set(pkgs.map(p=>p.id))
assert(ids.has('early-commander'));assert(ids.has('blink-etb'));assert(ids.has('constellation'));assert(!ids.has('counters'));assert(!ids.has('graveyard'));assert(!ids.has('spells'))
for(const p of pkgs)assert.equal(new Set(p.members.map(x=>x.toLowerCase())).size,p.members.length,`Duplicate member in ${p.id}`)

const fiveGreen=Array.from({length:5},()=>({options:['G']})),fiveColors=['W','U','B','R','G'].map(x=>({options:[x]})),rainbowCmd=card('Rainbow Commander','',5,'Legendary Creature','{W}{U}{B}{R}{G}')
assert(!canPay(rainbowCmd,fiveGreen));assert(canPay(rainbowCmd,fiveColors))
const expensiveProducers=[card('E1','',3,'Enchantment','{2}{G}'),card('E2','',3,'Enchantment','{2}{G}'),card('E3','',3,'Enchantment','{2}{G}'),card('E4','',3,'Enchantment','{2}{G}')]
const expensivePayoffs=[card('C1','Constellation — Whenever an enchantment enters the battlefield under your control, draw a card.',3,'Creature','{2}{G}'),card('C2','Constellation — Whenever an enchantment enters the battlefield under your control, create a token.',3,'Creature','{2}{G}')]
const forest=()=>card(`Forest ${crypto.randomUUID()}`,'{T}: Add {G}.',0,'Basic Land — Forest','',['G']),filler=()=>card(`Filler ${crypto.randomUUID()}`,'',2,'Creature','{1}{G}')
const simDeck=[...Array.from({length:36},forest),...expensiveProducers,...expensivePayoffs,...Array.from({length:53},filler)],simPkgs=detectPackages(simDeck,null),sim=simulateSequences(simDeck,null,simPkgs,[],200,7,()=>0.42)
assert.equal(sim.turnProfile[0].engine,0);assert.equal(sim.turnProfile[0].interaction,0)

const parsed=parseDecklist('1 Sol Ring\n1x Arcane Signet\n2 Forest (M21) 274\n1 Island (M21) 265 *F*\nCard Name x3\n# comment')
assert.deepEqual(parsed,[{qty:1,name:'Sol Ring'},{qty:1,name:'Arcane Signet'},{qty:2,name:'Forest'},{qty:1,name:'Island'},{qty:3,name:'Card Name'}])
const csv='Name,Base Singleton,Duel Commander\n"Card, With Comma",12,9\nDark Ritual,5,5\n',aeon=parseAeonShiftCsv(csv)
assert.equal(aeon.get('card, with comma')?.base,12);assert.equal(aeon.get('dark ritual')?.duel,5)

console.log('SEMANTIC OK — card roles, package roles, commander synergy, mana access and import syntax')
