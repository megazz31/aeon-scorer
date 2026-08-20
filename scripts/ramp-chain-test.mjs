import assert from 'node:assert/strict'
import { cardFeatures, featureDeck } from '../src/engine/cardFeatures.js'
import { simulateSequences } from '../src/engine/sequenceSimulator.js'

let id=0
const raw=(name,oracle='',cmc=0,type='Artifact',manaCost='{0}',producedMana=[])=>({name:`${name} ${++id}`,oracle,cmc,type,manaCost,producedMana})
const forest=()=>raw('Forest','{T}: Add {G}.',0,'Basic Land — Forest','',['G'])
const rock=()=>raw('Zero Rock','{T}: Add {G}.',0,'Artifact','{0}',['G'])
const filler=()=>raw('Filler','',3,'Creature — Bear','{2}{G}',[])
const commander=cardFeatures({name:'Chain Commander',oracle:'',cmc:4,type:'Legendary Creature',manaCost:'{3}{G}',producedMana:[]})
const cards=featureDeck([...Array.from({length:40},forest),...Array.from({length:20},rock),...Array.from({length:39},filler)])
let seed=0xA31C0DE
const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const sim=simulateSequences(cards,commander,[],[],1400,4,rng)
const t1=sim.turnProfile.find(x=>x.turn===1)
assert(t1.commander>0,`Expected chained zero-cost rocks to create some T1 commander access, got ${t1.commander}%`)
assert(sim.commanderMedianTurn!==null&&sim.commanderMedianTurn<=3,`Chained ramp should materially accelerate MV4 commander, got median T${sim.commanderMedianTurn}`)
console.log(`RAMP CHAIN OK — T1 commander ${t1.commander}%, median T${sim.commanderMedianTurn}`)
