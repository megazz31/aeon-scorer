import assert from 'node:assert/strict'
import { cardFeatures } from '../src/engine/cardFeatures.js'
import { isImmediateLandRamp } from '../src/engine/packageGraph.js'
import { canPay, landManaSources, simulateSequences } from '../src/engine/sequenceSimulator.js'

const card=(name,type,oracle,cmc=0,manaCost='',extra={})=>cardFeatures({name,type,oracle,cmc,manaCost,colors:[],colorIdentity:[],producedMana:[],legalities:{commander:'legal'},...extra})
const copies=(n,fn)=>Array.from({length:n},(_,i)=>fn(i))
const fixed=()=>0.42
const opts=sources=>sources.flatMap(s=>s.options||[]).sort()

const whiteCommander=card('Fetch Timing Commander','Legendary Creature — Human','',1,'{W}',{colors:['W'],colorIdentity:['W']})
const evolving=copies(99,()=>card('Evolving Wilds','Land','{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.'))
const evolvingSim=simulateSequences(evolving,whiteCommander,[],[],40,7,fixed)
assert.equal(evolvingSim.commanderMedianTurn,2,'Evolving Wilds must not provide fetched mana on the turn it is played')
assert.equal(evolvingSim.turnProfile[0].commander,0,'Evolving Wilds must never cast a one-mana commander on turn one by itself')

const fourManaCommander=card('Passage Timing Commander','Legendary Creature — Human','',4,'{3}{W}',{colors:['W'],colorIdentity:['W']})
const passages=copies(99,()=>card('Fabled Passage','Land','{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle. Then if you control four or more lands, untap that land.'))
const passageSim=simulateSequences(passages,fourManaCommander,[],[],40,7,fixed)
assert.equal(passageSim.commanderMedianTurn,4,'Fabled Passage played as the fourth land should unlock the fetched land immediately')

const twoManaCommander=card('Temple Timing Commander','Legendary Creature — Golem','',2,'{2}',{colorIdentity:[]})
const temples=copies(99,()=>card('Temple of the False God','Land','{T}: Add {C}{C}. Activate only if you control five or more lands.',0,'',{producedMana:['C']}))
const templeSim=simulateSequences(temples,twoManaCommander,[],[],40,7,fixed)
assert.equal(templeSim.commanderMedianTurn,5,'Temple of the False God must produce no mana before the fifth land')
assert.equal(templeSim.turnProfile[3].commander,0,'Temple of the False God must still be offline through turn four')
assert.equal(templeSim.turnProfile[4].commander,100,'Temple of the False God should provide two colorless once five lands are controlled')

// Conditional colored lands keep their real colorless fallback until their condition is met.
const swamp=card('Audit Swamp','Basic Land — Swamp','{T}: Add {B}.',0,'',{producedMana:['B']})
const island=card('Audit Island','Basic Land — Island','{T}: Add {U}.',0,'',{producedMana:['U']})
const plains=card('Audit Plains','Basic Land — Plains','{T}: Add {W}.',0,'',{producedMana:['W']})
const tainted=card('Tainted Field','Land','{T}: Add {C}.\n{T}: Add {W} or {B}. Activate only if you control a Swamp.',0,'',{producedMana:['C','W','B']})
assert.deepEqual(opts(landManaSources(tainted,[tainted])),['C'],'Tainted lands must be colorless without a Swamp')
assert.deepEqual(opts(landManaSources(tainted,[tainted,swamp])),['B','C','W'],'Tainted lands should unlock their colors with a Swamp')
const spire=card('Spire of Industry','Land','{T}: Add {C}.\n{T}, Pay 1 life: Add one mana of any color. Activate only if you control an artifact.',0,'',{producedMana:['C','W','U','B','R','G']})
const artifact=card('Audit Artifact','Artifact','',1)
assert.deepEqual(opts(landManaSources(spire,[spire])),['C'],'Spire of Industry must be colorless without an artifact')
assert.deepEqual(opts(landManaSources(spire,[spire,artifact])),['B','C','G','R','U','W'],'Spire of Industry should unlock colors with an artifact')
const maze=card('Nimbus Maze','Land','{T}: Add {C}.\n{T}: Add {W}. Activate only if you control an Island.\n{T}: Add {U}. Activate only if you control a Plains.',0,'',{producedMana:['C','W','U']})
assert.deepEqual(opts(landManaSources(maze,[maze])),['C'],'Nimbus Maze must start colorless without enabling basic types')
assert.deepEqual(opts(landManaSources(maze,[maze,island])),['C','W'],'Nimbus Maze should gain white from an Island')
assert.deepEqual(opts(landManaSources(maze,[maze,plains])),['C','U'],'Nimbus Maze should gain blue from a Plains')

// Filter lands are mana transformations, not free sources.
const sungrass=card('Sungrass Prairie','Land','{1}, {T}: Add {G}{W}.',0,'',{producedMana:['G','W']})
const gwCommander=card('Filter Commander','Legendary Creature — Human','',2,'{G}{W}',{colors:['G','W'],colorIdentity:['G','W']})
const ugCommander=card('Wrong Filter Commander','Legendary Creature — Human','',2,'{U}{G}',{colors:['U','G'],colorIdentity:['U','G']})
const sungrassSources=landManaSources(sungrass,[sungrass])
assert.equal(canPay(whiteCommander,sungrassSources),false,'a pure filter land must produce no mana by itself')
assert.equal(canPay(gwCommander,[...landManaSources(plains,[plains]),...sungrassSources]),true,'a 1-to-2 filter should convert another mana into its exact two outputs')
assert.equal(canPay(ugCommander,[...landManaSources(island,[island]),...sungrassSources]),false,'a filter must consume the input source rather than leave its original color available')
const opal=card('Opal Palace','Land','{T}: Add {C}.\n{1}, {T}: Add one mana of any color in your commander’s color identity.',0,'',{producedMana:['C','W','U','B','R','G']})
assert.equal(canPay(whiteCommander,landManaSources(opal,[opal])),false,'a one-for-one filter with colorless fallback must not be free colored mana alone')
assert.equal(canPay(whiteCommander,[...landManaSources(opal,[opal]),...landManaSources(plains,[plains])]),true,'a one-for-one filter may fix an existing mana source')

// Land-ramp tags are broader than immediate acceleration; the simulator/package must distinguish timing conditions.
const lore=card("Nature's Lore",'Sorcery','Search your library for a Forest card, put that card onto the battlefield, then shuffle.',2,'{1}{G}')
const woodElves=card('Wood Elves','Creature — Elf Scout','When this creature enters, search your library for a Forest card, put that card onto the battlefield, then shuffle.',3,'{2}{G}')
const knight=card('Knight of the White Orchid','Creature — Human Knight','When this creature enters, if an opponent controls more lands than you, you may search your library for a Plains card, put it onto the battlefield, then shuffle.',2,'{W}{W}')
const sword=card('Sword of the Animist','Artifact — Equipment','Equipped creature gets +1/+1. Whenever equipped creature attacks, you may search your library for a basic land card, put it onto the battlefield tapped, then shuffle. Equip {2}',2,'{2}')
const hawk=card("Cartographer's Hawk",'Creature — Bird','Flying. When this creature deals combat damage to a player who controls more lands than you, return it to its owner’s hand. If you do, you may search your library for a Plains card, put it onto the battlefield tapped, then shuffle.',2,'{1}{W}')
assert.equal(isImmediateLandRamp(lore),true,"Nature's Lore is immediate land acceleration")
assert.equal(isImmediateLandRamp(woodElves),true,'Wood Elves is immediate ETB land acceleration')
assert.equal(isImmediateLandRamp(knight),false,'catch-up ETB ramp must not be assumed to succeed')
assert.equal(isImmediateLandRamp(sword),false,'attack-triggered equipment ramp is delayed')
assert.equal(isImmediateLandRamp(hawk),false,'combat-damage catch-up ramp is delayed and conditional')

console.log('LAND SEMANTICS OK — fetch timing, conditional mana, exact filters, immediate ramp and Temple condition')
