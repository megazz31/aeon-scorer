import assert from 'node:assert/strict'
import { parseDeckSource,normalizeMoxfield,normalizeArchidekt } from '../api/import-deck.js'

assert.deepEqual(parseDeckSource('https://www.moxfield.com/decks/abc_DEF-12').source,'moxfield')
assert.deepEqual(parseDeckSource('https://archidekt.com/decks/123456/my-deck').source,'archidekt')
assert.throws(()=>parseDeckSource('https://example.com/decks/123'),/Only Moxfield and Archidekt/)
assert.throws(()=>parseDeckSource('http://archidekt.com/decks/123'),/HTTPS/)

const moxLegacy=normalizeMoxfield({
  name:'Legacy Test',
  commanders:{Atraxa:{quantity:1,card:{name:'Atraxa, Praetors Voice'}}},
  mainboard:{ring:{quantity:1,card:{name:'Sol Ring'}},island:{quantity:98,card:{name:'Island'}}},
},'https://www.moxfield.com/decks/test')
assert.equal(moxLegacy.commanderName,'Atraxa, Praetors Voice')
assert.equal(moxLegacy.cardCount,99)
assert.match(moxLegacy.decklist,/1 Sol Ring/)
assert.match(moxLegacy.decklist,/98 Island/)

const moxV3=normalizeMoxfield({
  name:'V3 Test',
  boards:{
    commanders:{cards:{cmd:{quantity:1,card:{name:'Talrand, Sky Summoner'}}}},
    mainboard:{cards:{cmdCopy:{quantity:1,card:{name:'Talrand, Sky Summoner'}},island:{quantity:99,card:{name:'Island'}}}},
  },
})
assert.equal(moxV3.commanderName,'Talrand, Sky Summoner')
assert.equal(moxV3.cardCount,99)
assert.equal(moxV3.decklist,'99 Island')

const arch=normalizeArchidekt({
  name:'Arch Test',
  categories:[
    {id:1,name:'Commander',includedInDeck:true},
    {id:2,name:'Mainboard',includedInDeck:true},
    {id:3,name:'Maybeboard',includedInDeck:false},
  ],
  cards:[
    {quantity:1,categories:[1],card:{oracleCard:{name:'Muldrotha, the Gravetide'}}},
    {quantity:1,categories:[2],card:{oracleCard:{name:'Sol Ring'}}},
    {quantity:98,categories:[2],card:{oracleCard:{name:'Forest'}}},
    {quantity:1,categories:[3],card:{oracleCard:{name:'Black Lotus'}}},
  ],
},'https://archidekt.com/decks/123')
assert.equal(arch.commanderName,'Muldrotha, the Gravetide')
assert.equal(arch.cardCount,99)
assert.doesNotMatch(arch.decklist,/Black Lotus/)

assert.throws(()=>normalizeArchidekt({categories:[{name:'Commander',includedInDeck:true}],cards:[
  {quantity:1,categories:['Commander'],card:{oracleCard:{name:'Partner A'}}},
  {quantity:1,categories:['Commander'],card:{oracleCard:{name:'Partner B'}}},
]}),/exactly one commander/)

console.log('DECK IMPORT CONTRACT OK — Moxfield + Archidekt public single-commander normalization')
