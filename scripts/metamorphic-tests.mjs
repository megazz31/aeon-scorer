import assert from 'node:assert/strict'
import { analyzePower } from '../src/engine/powerModel.js'

let id=0
const mk=(name,oracle='',cmc=2,type='Instant',manaCost='',producedMana=[])=>({name:`${name}${name==='Forest'||name==='Plains'?'':' '+(++id)}`,oracle,cmc,type,manaCost,producedMana,id:String(id)})
const forest=()=>mk('Forest','{T}: Add {G}.',0,'Basic Land — Forest','',['G'])
const plains=()=>mk('Plains','{T}: Add {W}.',0,'Basic Land — Plains','',['W'])
const blank=(i=0)=>mk(`Blank${i}`,'',3,'Creature — Bear','{2}{G}')
const draw=()=>mk('Draw','Draw two cards.',2,'Sorcery','{1}{G}')
const remove=()=>mk('Removal','Destroy target creature an opponent controls.',2,'Instant','{1}{G}')
const tutor=()=>mk('Tutor','Search your library for a card, put it into your hand, then shuffle.',2,'Sorcery','{1}{G}')
const blink=()=>mk('Blink','Exile target creature you control, then return it to the battlefield.',1,'Instant','{W}')
const etb=()=>mk('ETB','When this creature enters the battlefield, draw a card.',2,'Creature','{1}{W}')
const cmd={name:'Test Commander',oracle:'Whenever another permanent enters under your control, draw a card.',cmc:4,type:'Legendary Creature',manaCost:'{2}{G}{G}',producedMana:[],id:'cmd'}

function baseDeck(){return [...Array.from({length:36},forest),...Array.from({length:63},(_,i)=>blank(i))]}
function replace(deck,n,cards){return [...deck.slice(0,deck.length-n),...cards]}
function profile(deck,commander=cmd){return analyzePower(deck,commander,null,900)}

const inert=baseDeck()
const focused=replace(inert,20,[...Array.from({length:6},draw),...Array.from({length:5},remove),...Array.from({length:4},blink),...Array.from({length:5},etb)])
const fast=replace(focused,4,[
  {name:'Lotus Petal',oracle:'{T}, Sacrifice Lotus Petal: Add one mana of any color.',cmc:0,type:'Artifact',manaCost:'{0}',producedMana:['W','U','B','R','G']},
  {name:'Elvish Spirit Guide',oracle:'Exile Elvish Spirit Guide from your hand: Add {G}.',cmc:3,type:'Creature',manaCost:'{2}{G}',producedMana:['G']},
  {name:'Mana Crypt',oracle:'{T}: Add {C}{C}.',cmc:0,type:'Artifact',manaCost:'{0}',producedMana:['C']},
  {name:'Mana Vault',oracle:'{T}: Add {C}{C}{C}.',cmc:1,type:'Artifact',manaCost:'{1}',producedMana:['C']},
])
const tutored=replace(focused,5,Array.from({length:5},tutor))

const a=profile(inert),b=profile(focused),c=profile(fast),d=profile(tutored)
assert(b.dimensions.synergy>a.dimensions.synergy,'Adding a coherent Blink/ETB package must raise synergy')
assert(c.dimensions.speed>b.dimensions.speed,'Fast mana must raise speed')
assert(c.dimensions.explosiveness>b.dimensions.explosiveness,'Fast mana must raise explosiveness')
assert(d.profile.consistency>=b.profile.consistency,'Tutors must not reduce consistency in a controlled replacement')
assert(b.profile.median>a.profile.median,'Functional focused cards should outperform inert filler')

const r1=profile(focused),r2=profile(focused)
assert.deepEqual(r1.profile,r2.profile,'Seeded scoring must be deterministic')
assert.deepEqual(r1.simulation.turnProfile,r2.simulation.turnProfile,'Sequence curve must be deterministic')

const greenCmd={name:'Five Color',oracle:'',cmc:5,type:'Legendary Creature',manaCost:'{W}{U}{B}{R}{G}',id:'five'}
const monoGreen=[...Array.from({length:45},forest),...Array.from({length:54},(_,i)=>blank(i))]
const mixed=[...Array.from({length:9},plains),...Array.from({length:9},forest),...Array.from({length:9},()=>mk('Island','{T}: Add {U}.',0,'Basic Land — Island','',['U'])),...Array.from({length:9},()=>mk('Swamp','{T}: Add {B}.',0,'Basic Land — Swamp','',['B'])),...Array.from({length:9},()=>mk('Mountain','{T}: Add {R}.',0,'Basic Land — Mountain','',['R'])),...Array.from({length:54},(_,i)=>blank(i))]
const mg=profile(monoGreen,greenCmd),mx=profile(mixed,greenCmd)
assert(mx.simulation.turnProfile[6].commander>mg.simulation.turnProfile[6].commander,'Color-correct mana must improve five-color commander access')
assert.equal(mg.simulation.turnProfile[6].commander,0,'Five-color commander cannot be cast from Forest-only mana')

for(const r of [a,b,c,d,mg,mx]){
  for(const v of [r.profile.median,r.profile.floor,r.profile.ceiling,r.profile.peak,r.profile.dispersion,...Object.values(r.dimensions)])assert(Number.isFinite(v)&&v>=0&&v<=100,'All public scores must be finite and bounded')
  assert(r.profile.floor<=r.profile.median,'P20 must not exceed median')
  assert(r.profile.median<=r.profile.ceiling,'Median must not exceed P80')
  assert(r.profile.ceiling<=r.profile.peak,'P80 must not exceed peak P80')
}

console.log('METAMORPHIC OK — directionality, determinism, color access and score invariants')
