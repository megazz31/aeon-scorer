import assert from 'node:assert/strict'
import { cardFeatures, tagsFor } from '../src/engine/cardFeatures.js'
import { detectPackages } from '../src/engine/packageGraph.js'

const card=(name,oracle,type='Creature — Test')=>({name,type,oracle,cmc:2,manaCost:'{1}{G}',colors:['G'],colorIdentity:['G'],producedMana:[],legalities:{commander:'legal'}})
const tags=c=>tagsFor(c)
const has=(c,t)=>tags(c).includes(t)
const expectKind=(name,oracle,kind)=>{
  const c=card(name,oracle)
  assert.equal(has(c,'counter-producer'),true,`${name} must be a counter producer`)
  assert.equal(has(c,`counter-kind:${kind}`),true,`${name} must map to ${kind}`)
}

for(const [name,oracle] of [
  ['Evolve Test','Evolve'],
  ['Adapt Test','Adapt 2'],
  ['Amass Test','Amass Zombies 2'],
  ['Support Test','Support 2'],
  ['Bolster Test','Bolster 1'],
  ['Graft Test','Graft 3'],
  ['Modular Test','Modular 2'],
  ['Outlast Test','Outlast {1}{G}'],
  ['Renown Test','Renown 2'],
  ['Backup Test','Backup 1'],
  ['Monstrosity Test','{3}{G}: Monstrosity 2.'],
  ['Explore Test','When this creature enters, it explores.'],
  ['Connive Test','When this creature enters, it connives.'],
  ['Fabricate Test','Fabricate 2'],
  ['Riot Test','Riot'],
  ['Bloodthirst Test','Bloodthirst 2'],
  ['Undying Test','Undying'],
  ['Unleash Test','Unleash'],
  ['Scavenge Test','Scavenge {2}{G}'],
  ['Training Test','Training'],
  ['Mentor Test','Mentor'],
  ['Incubate Test','When this creature enters, incubate 2.'],
  ['Devour Test','Devour 2'],
])expectKind(name,oracle,'plus1')

expectKind('Blight Test','As an additional cost to cast this spell, blight 2.','minus1')
expectKind('Persist Test','Persist','minus1')
assert.equal(has(card('Blight Test','As an additional cost to cast this spell, blight 2.'),'counter-kind:plus1'),false,'blight must not map to +1/+1')
assert.equal(has(card('Persist Test','Persist'),'counter-kind:plus1'),false,'persist must not map to +1/+1')

assert.equal(has(card('Incubate Test','When this creature enters, incubate 2.'),'tokens'),true,'incubate creates a token')
assert.equal(has(card('Fabricate Test','Fabricate 2'),'tokens'),true,'fabricate can create Servo tokens')
assert.equal(has(card('Amass Test','Amass Zombies 2'),'tokens'),true,'amass can create an Army token')

const akki=card('Akki Battle Squad','Whenever one or more modified creatures you control attack, untap all modified creatures you control.','Creature — Goblin Samurai')
assert.equal(has(akki,'modified-payoff'),true,'modified is a dedicated payoff role')
assert.equal(has(akki,'counter-payoff'),false,'modified must not collapse into a counter-only payoff')

const opponentBlight=card('Opponent Blight','At the beginning of your end step, each opponent blights 1.','Enchantment')
assert.equal(has(opponentBlight,'counter-producer'),false,'opponent-only blight must not become your counter production')

const plusSources=[
  card('Training One','Training'),
  card('Mentor Two','Mentor'),
  card('Support Three','When this creature enters, support 1.'),
].map(cardFeatures)
const modifiedPayoffs=[
  card('Modified Reward A','Whenever a modified creature you control attacks, draw a card.'),
  card('Modified Reward B','Modified creatures you control have trample.'),
].map(cardFeatures)
const counterPackage=detectPackages([...plusSources,...modifiedPayoffs]).find(p=>p.id==='counters')
assert.ok(counterPackage,'creature counter producers must connect to modified payoffs')

const energySources=[1,2,3].map(i=>cardFeatures(card(`Energy ${i}`,'Put an energy counter on yourself.','Enchantment')))
assert.equal(detectPackages([...energySources,...modifiedPayoffs]).some(p=>p.id==='counters'),false,'player-only energy counters must not satisfy modified-creature payoffs')

console.log('KEYWORD COUNTER SEMANTICS OK — keyword kinds, modified payoffs and directionality are separated')