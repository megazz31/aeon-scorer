import { strict as assert } from 'node:assert'
import { normalizeScryfallCard } from '../src/scryfallNormalize.js'
import { tagsFor } from '../src/engine/cardFeatures.js'

const reversibleSolRing=normalizeScryfallCard({
  id:'print-sol-ring',oracle_id:'oracle-sol-ring',name:'Sol Ring // Sol Ring',cmc:1,color_identity:[],
  card_faces:[
    {name:'Sol Ring',type_line:'Artifact',oracle_text:'{T}: Add {C}{C}.',mana_cost:'{1}',produced_mana:['C'],colors:[]},
    {name:'Sol Ring',type_line:'Artifact',oracle_text:'{T}: Add {C}{C}.',mana_cost:'{1}',produced_mana:['C'],colors:[]},
  ],
})
assert.equal(reversibleSolRing.name,'Sol Ring')
assert.equal(reversibleSolRing.type,'Artifact')
assert.equal(reversibleSolRing.oracle,'{T}: Add {C}{C}.')
assert.equal(reversibleSolRing.manaCost,'{1}')
assert.deepEqual(reversibleSolRing.producedMana,['C'])
assert(tagsFor(reversibleSolRing).includes('artifact'),'reversible Sol Ring must stay an artifact')
assert(tagsFor(reversibleSolRing).includes('fast-mana'),'reversible Sol Ring must retain fast-mana semantics')

const genuineTwoFace=normalizeScryfallCard({
  id:'two-face',oracle_id:'two-face-oracle',name:'Alpha // Beta',cmc:3,color_identity:['U','R'],
  card_faces:[
    {name:'Alpha',type_line:'Creature — Wizard',oracle_text:'Alpha text.',mana_cost:'{2}{U}',colors:['U']},
    {name:'Beta',type_line:'Sorcery',oracle_text:'Beta text.',mana_cost:'{1}{R}',colors:['R']},
  ],
})
assert.equal(genuineTwoFace.name,'Alpha // Beta')
assert.equal(genuineTwoFace.type,'Creature — Wizard // Sorcery')
assert.equal(genuineTwoFace.oracle,'Alpha text.\nBeta text.')
assert.equal(genuineTwoFace.manaCost,'{2}{U} // {1}{R}')

console.log('Scryfall normalization regression OK.')
