import assert from 'node:assert/strict'
import { cardFeatures } from '../src/engine/cardFeatures.js'

const card=(name,oracle,cmc=2,type='Enchantment',manaCost='{1}{W}')=>cardFeatures({name,oracle,cmc,type,manaCost})
const has=(c,t)=>c.tags.includes(t)

const sanctum=card('Sanctum of All','At the beginning of your upkeep, you may search your library and/or your graveyard for a Shrine card and put it onto the battlefield.',5,'Legendary Enchantment','{W}{U}{B}{R}{G}')
assert(has(sanctum,'tutor'))
assert(has(sanctum,'repeatable-tutor'),'Sanctum of All is a recurring upkeep tutor')

const grove=card('Sterling Grove','Other enchantments you control have shroud. {1}, Sacrifice Sterling Grove: Search your library for an enchantment card, reveal it, then shuffle and put that card on top.',2,'Enchantment','{G}{W}')
assert(has(grove,'tutor'))
assert(!has(grove,'repeatable-tutor'),'A self-sacrificing tutor is one-shot, not repeatable')

const sisay=card('Sisay, Weatherlight Captain','{W}{U}{B}{R}{G}: Search your library for a legendary permanent card with mana value less than Sisay’s power, put that card onto the battlefield, then shuffle.',3,'Legendary Creature — Human Soldier','{2}{W}')
assert(has(sisay,'tutor'))
assert(has(sisay,'repeatable-tutor'),'A reusable activated search ability remains repeatable')

console.log('TUTOR SEMANTIC OK — one-shot and repeatable tutor roles are separated')
