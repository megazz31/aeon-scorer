import assert from 'node:assert/strict'
import { cardFeatures, featureDeck } from '../src/engine/cardFeatures.js'
import { simulateSequences } from '../src/engine/sequenceSimulator.js'
import { typeCostReductionProfile, typeGenericReduction, typeCostReducerMatches, commandZoneDeploymentProfile } from '../src/engine/commanderMechanics.js'

const raw=(name,type,oracle,cmc,manaCost,producedMana=[])=>({name,type,oracle,cmc,manaCost,producedMana,colors:[],colorIdentity:[],legalities:{commander:'legal'}})
const f=x=>cardFeatures(x)

const ureni=f(raw('Seven Mana Dragon','Legendary Creature — Spirit Dragon','Flying, trample\nWhenever Seven Mana Dragon enters or attacks, look at the top eight cards of your library. You may put a Dragon creature card from among them onto the battlefield. Put the rest on the bottom of your library in a random order.',7,'{4}{G}{U}{R}'))
const servant=f(raw("Dragonlord's Servant",'Creature — Goblin Shaman','Dragon spells you cast cost {1} less to cast.',2,'{1}{R}'))
const nogi=f(raw('Nogi, Draco-Zealot','Legendary Creature — Kobold Shaman','Dragon spells you cast cost {1} less to cast.',3,'{1}{R}{R}'))
const nonDragon=f(raw('Big Beast','Creature — Beast','Trample',7,'{6}{G}'))
assert.deepEqual(typeCostReductionProfile(servant),{subtype:'dragon',amount:1})
assert.equal(typeCostReducerMatches(servant,ureni),true)
assert.equal(typeGenericReduction(ureni,[servant,nogi]),2,'stacking Dragon reducers must reduce only generic commander mana')
assert.equal(typeGenericReduction(nonDragon,[servant,nogi]),0,'tribal reducer must not touch an unrelated spell')

const courser=f(raw('Commander Courser','Creature — Dragon','Flying\nWhen Commander Courser enters, you may put a commander you own from the command zone onto the battlefield. It gains haste. Return it to the command zone at the beginning of the next end step.',6,'{4}{R}{R}'))
assert.deepEqual(commandZoneDeploymentProfile(courser),{grantsHaste:true,temporary:true})

const land=i=>raw(`Land ${i}`,'Basic Land — Forest','{T}: Add {G}.',0,'',['G'])
const reducer=i=>raw(`Dragon Reducer ${i}`,'Creature — Goblin Shaman','Dragon spells you cast cost {1} less to cast.',2,'{1}{G}')
const deployer=i=>raw(`Courser ${i}`,'Creature — Dragon',`When Courser ${i} enters, you may put a commander you own from the command zone onto the battlefield. It gains haste. Return it to the command zone at the beginning of the next end step.`,6,'{5}{G}')
const dragon=i=>raw(`Dragon ${i}`,'Creature — Dragon','Flying',6,'{5}{G}')
const filler=i=>raw(`Setup ${i}`,'Creature — Elf','',1,'{G}')
const deck=featureDeck([
  ...Array.from({length:40},(_,i)=>land(i)),
  ...Array.from({length:12},(_,i)=>reducer(i)),
  ...Array.from({length:8},(_,i)=>deployer(i)),
  ...Array.from({length:20},(_,i)=>dragon(i)),
  ...Array.from({length:19},(_,i)=>filler(i)),
])
const sim=simulateSequences(deck,ureni,[],[],600,7,()=>0.38196601125)
assert.ok(sim.commanderMechanics?.typeCostReduction?.eligibleReducers?.length>=10,'matching low-MV tribal reducers must be exposed by sequence evidence')
assert.ok(sim.commanderMechanics?.typeCostReduction?.casts>0,'sequence simulator must actually cast tribal reducer setup')
assert.ok(sim.commanderMechanics?.commandZoneDeployment?.eligibleCards?.length>=8,'command-zone deployers must be detected generically')
assert.ok(sim.commanderMechanics?.commandZoneDeployment?.uses>0,'castable deployers must create temporary command-zone access')
assert.ok(sim.turnProfile.some(t=>t.typeReduction>0),'turn profile must expose reducer setup windows')
assert.ok(sim.turnProfile.some(t=>t.commandZoneDeployment>0),'turn profile must expose temporary commander deployment windows')
assert.ok(sim.commanderMechanics?.topLibraryCheat?.hits>0,'temporary commander access should still resolve its ETB/haste attack engine')

console.log('SEMANTIC16 COMMANDER COMPRESSION OK — tribal reducers stack on matching spells and command-zone deployment creates temporary commander access')
