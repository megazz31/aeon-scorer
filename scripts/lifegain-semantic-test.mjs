import assert from 'node:assert/strict'
import { cardFeatures, tagsFor } from '../src/engine/cardFeatures.js'
import { detectPackages } from '../src/engine/packageGraph.js'

const card=(name,type,oracle)=>({name,type,oracle,cmc:2,manaCost:'{1}{W}',colors:['W'],colorIdentity:['W'],producedMana:[],legalities:{commander:'legal'}})
const has=(c,t)=>tagsFor(c).includes(t)

const soulWarden=card('Soul Warden','Creature — Human Cleric','Whenever another creature enters, you gain 1 life.')
const healerHawk=card("Healer's Hawk",'Creature — Bird','Flying, lifelink')
const revitalize=card('Revitalize','Instant','You gain 3 life. Draw a card.')
const ajani=card("Ajani's Pridemate",'Creature — Cat Soldier','Whenever you gain life, put a +1/+1 counter on this creature.')
const dina=card('Dina, Soul Steeper','Legendary Creature — Dryad Druid','Whenever you gain life, each opponent loses 1 life.')
const boon=card('Boon Reflection','Enchantment','If you would gain life, you gain twice that much life instead.')

assert.equal(has(soulWarden,'lifegain'),true)
assert.equal(has(healerHawk,'lifegain'),true)
assert.equal(has(revitalize,'lifegain'),true)
assert.equal(has(ajani,'life-payoff'),true)
assert.equal(has(ajani,'lifegain'),false)
assert.equal(has(dina,'life-payoff'),true)
assert.equal(has(dina,'lifegain'),false)
assert.equal(has(boon,'life-payoff'),true,'life-gain replacement effects are payoffs')
assert.equal(has(boon,'lifegain'),false,'replacement effects must not invent independent life production')

assert.equal(has(card('Opponent Gift','Sorcery','Target opponent gains 5 life.'),'lifegain'),false,'opponent-only gain is not your source')
assert.equal(has(card('Open Gift','Sorcery','Target player gains 5 life.'),'lifegain'),true,'a target-player effect can produce life for you')
assert.equal(has(card('False Cure','Instant','Until end of turn, whenever a player gains life, that player loses 2 life for each 1 life they gained.'),'life-payoff'),false,'generic player life observation is not your lifegain payoff')
assert.equal(has(card('Rain of Gore','Enchantment','If a spell or ability would cause its controller to gain life, that player loses that much life instead.'),'lifegain'),false)

const pool=[soulWarden,healerHawk,revitalize,ajani,dina].map(cardFeatures)
const pkg=detectPackages(pool).find(p=>p.id==='lifegain')
assert.ok(pkg,'three real sources plus two payoffs must form a lifegain package')
assert.equal(pkg.producerCards.length,3)
assert.equal(pkg.payoffCards.length,2)

const tooThin=[soulWarden,healerHawk,ajani,dina].map(cardFeatures)
assert.equal(detectPackages(tooThin).some(p=>p.id==='lifegain'),false,'two incidental sources are below the lifegain package threshold')

console.log('LIFEGAIN SEMANTICS OK — sources, observers, replacement effects and package threshold are directional')