import assert from 'node:assert/strict'
import { cardFeatures } from '../src/engine/cardFeatures.js'
import { simulateSequences } from '../src/engine/sequenceSimulator.js'

const card=(name,type,oracle,cmc=0,manaCost='',extra={})=>cardFeatures({name,type,oracle,cmc,manaCost,colors:[],colorIdentity:[],producedMana:[],legalities:{commander:'legal'},...extra})
const copies=(n,fn)=>Array.from({length:n},(_,i)=>fn(i))
const fixed=()=>0.42

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

console.log('LAND SEMANTICS OK — fetch timing, Fabled Passage threshold and Temple of the False God condition')
