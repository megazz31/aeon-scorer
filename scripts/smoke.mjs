import { analyzePower } from '../src/engine/powerModel.js'
import { parseAeonShiftCsv } from '../src/data/aeonshift.js'

const land = () => ({name:'Forest',type:'Basic Land — Forest',oracle:'',cmc:0,manaCost:'',id:crypto.randomUUID()})
const card = (name,oracle,cmc,type='Instant') => ({name,oracle,cmc,type,manaCost:'',id:crypto.randomUUID()})
const deck=[
  ...Array.from({length:36},land),
  card('Dark Ritual','Add {B}{B}{B}.',1),
  card('Lotus Petal','Sacrifice Lotus Petal: Add one mana of any color.',0,'Artifact'),
  card('Elvish Spirit Guide','Exile Elvish Spirit Guide from your hand: Add {G}.',3,'Creature'),
  card('Simian Spirit Guide','Exile Simian Spirit Guide from your hand: Add {R}.',3,'Creature'),
  ...Array.from({length:10},(_,i)=>card(`Draw ${i}`,'Draw two cards.',2,'Sorcery')),
  ...Array.from({length:10},(_,i)=>card(`Removal ${i}`,'Destroy target creature.',2)),
  ...Array.from({length:39},(_,i)=>card(`Body ${i}`,'When this creature enters, create a 1/1 token.',3,'Creature')),
]
const cmd=card('Test Commander','Whenever another creature enters, draw a card.',5,'Legendary Creature')
const csv='Name,Base Singleton,Duel Commander\nDark Ritual,5,5\nLotus Petal,16,16\n'
const map=parseAeonShiftCsv(csv)
const r=analyzePower(deck,cmd,map,300)
if(!Number.isFinite(r.profile.median)||!r.packages.some(p=>p.id==='early-commander')) throw new Error('Smoke test failed')
console.log('Smoke OK', r.profile, r.packages.map(p=>p.name))
