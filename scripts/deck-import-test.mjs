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
assert.deepEqual(moxLegacy.commanderNames,['Atraxa, Praetors Voice'])
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
    {id:4,name:'Sideboard',includedInDeck:true},
  ],
  cards:[
    {quantity:1,categories:['Commander'],card:{oracleCard:{name:'Muldrotha, the Gravetide'}}},
    {quantity:1,categories:['Mainboard'],card:{oracleCard:{name:'Sol Ring'}}},
    {quantity:98,categories:['Mainboard'],card:{oracleCard:{name:'Forest'}}},
    {quantity:1,categories:['Maybeboard'],card:{oracleCard:{name:'Black Lotus'}}},
    {quantity:1,categories:['Sideboard','Mainboard'],card:{oracleCard:{name:'Ancestral Recall'}}},
  ],
},'https://archidekt.com/decks/123')
assert.equal(arch.commanderName,'Muldrotha, the Gravetide')
assert.equal(arch.cardCount,99)
assert.doesNotMatch(arch.decklist,/Black Lotus/)
assert.doesNotMatch(arch.decklist,/Ancestral Recall/)

const partnerArch=normalizeArchidekt({categories:[{name:'Commander',includedInDeck:true},{name:'Mainboard',includedInDeck:true}],cards:[
  {quantity:1,categories:['Commander'],card:{oracleCard:{name:'Partner A'}}},
  {quantity:1,categories:['Commander'],card:{oracleCard:{name:'Partner B'}}},
  {quantity:98,categories:['Mainboard'],card:{oracleCard:{name:'Forest'}}},
]})
assert.deepEqual(partnerArch.commanderNames,['Partner A','Partner B'])
assert.equal(partnerArch.commanderName,'Partner A')
assert.equal(partnerArch.cardCount,98)
assert.equal(partnerArch.decklist,'98 Forest')

assert.throws(()=>normalizeArchidekt({categories:[{name:'Commander',includedInDeck:true},{name:'Mainboard',includedInDeck:true}],cards:[
  {quantity:1,categories:['Commander'],card:{oracleCard:{name:'A'}}},
  {quantity:1,categories:['Commander'],card:{oracleCard:{name:'B'}}},
  {quantity:1,categories:['Commander'],card:{oracleCard:{name:'C'}}},
  {quantity:97,categories:['Mainboard'],card:{oracleCard:{name:'Forest'}}},
]}),/one commander or a two-card command zone/)

console.log('DECK IMPORT CONTRACT OK — Moxfield + Archidekt public one- or two-commandant normalization')
