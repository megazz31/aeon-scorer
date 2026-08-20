import assert from 'node:assert/strict'
import { cardFeatures, featureDeck } from '../src/engine/cardFeatures.js'
import { detectPackages } from '../src/engine/packageGraph.js'

const c=(name,oracle,cmc,type,manaCost,producedMana=[])=>({name,oracle,cmc,type,manaCost,producedMana})
const blinks=[
  c('Cloudshift','Exile target creature you control, then return that card to the battlefield under your control.',1,'Instant','{W}'),
  c('Ephemerate','Exile target creature you control, then return it to the battlefield under its owner’s control. Rebound.',1,'Instant','{W}'),
  c('Flicker of Fate','Exile target creature or enchantment you control, then return it to the battlefield under its owner’s control.',2,'Instant','{1}{W}'),
]
const fakeEtbs=[
  c('Tapland A','Tapland A enters the battlefield tapped. {T}: Add {W}.',0,'Land','',['W']),
  c('Tapland B','Tapland B enters tapped unless you control a Plains. {T}: Add {W}.',0,'Land','',['W']),
  c('Shockland C','As Shockland C enters, you may pay 2 life. If you don’t, it enters tapped. {T}: Add {W}.',0,'Land','',['W']),
]
const fakePackages=detectPackages(featureDeck([...blinks,...fakeEtbs]),null)
assert(!fakePackages.some(p=>p.id==='blink-etb'),'Lands that merely enter tapped must not become Blink/ETB payoffs')

const realEtbs=[
  c('Wall of Omens','When Wall of Omens enters the battlefield, draw a card.',2,'Creature — Wall','{1}{W}'),
  c('Flickerwisp','When Flickerwisp enters the battlefield, exile another target permanent. Return that card to the battlefield under its owner’s control at the beginning of the next end step.',3,'Creature — Elemental','{1}{W}{W}'),
  c('Growing Rites','When Growing Rites enters the battlefield, look at the top four cards of your library. You may reveal a creature card from among them and put it into your hand.',3,'Legendary Enchantment','{2}{G}'),
]
const realPackages=detectPackages(featureDeck([...blinks,...realEtbs]),null)
const blinkPkg=realPackages.find(p=>p.id==='blink-etb')
assert(blinkPkg,'Real ETB triggers must still form a Blink/ETB package')
assert(blinkPkg.payoffs.includes('Wall of Omens')&&blinkPkg.payoffs.includes('Flickerwisp'),'Real ETB payoffs must be retained')
assert(!blinkPkg.payoffs.some(n=>/^Tapland|^Shockland/.test(n)),'False ETB lands must never leak into evidence')
console.log('ETB SEMANTIC OK — real triggers retained, enters-tapped text excluded')
