import assert from 'node:assert/strict'
import { tagsFor, sourceColors } from '../src/engine/cardFeatures.js'

const card=(name,type,oracle,extra={})=>({name,type,oracle,cmc:2,manaCost:'',colors:[],colorIdentity:[],producedMana:[],legalities:{commander:'legal'},...extra})
const has=(c,t)=>tagsFor(c).includes(t)

// Draw source vs draw payoff.
assert.equal(has(card('Underworld Dreams','Enchantment','Whenever an opponent draws a card, Underworld Dreams deals 1 damage to that player.'),'draw'),false)
assert.equal(has(card('Psychosis Crawler','Artifact Creature — Horror','Whenever you draw a card, each opponent loses 1 life.'),'draw'),false)
assert.equal(has(card('Mulldrifter','Creature — Elemental','When Mulldrifter enters the battlefield, draw two cards.'),'draw'),true)
assert.equal(has(card('Rhystic Study','Enchantment','Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.'),'draw'),true)

// Spellslinger must care about your spell flow, not an opponent's spell flow.
assert.equal(has(card('Arasta of the Endless Web','Legendary Enchantment Creature — Spider','Whenever an opponent casts an instant or sorcery spell, create a 1/2 green Spider creature token with reach.'),'spellslinger'),false)
assert.equal(has(card('Talrand, Sky Summoner','Legendary Creature — Merfolk Wizard','Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.'),'spellslinger'),true)
assert.equal(has(card('Kess, Dissident Mage','Legendary Creature — Human Wizard','During each of your turns, you may cast an instant or sorcery spell from your graveyard. If a card cast this way would be put into your graveyard, exile it instead.'),'spellslinger'),true)

// Exile-play engines commonly span multiple sentences.
assert.equal(has(card('Light Up the Stage','Sorcery','Exile the top two cards of your library. Until the end of your next turn, you may play those cards.'),'exile-cast'),true)
assert.equal(has(card('Share the Spoils','Enchantment',"When this enchantment enters, exile the top card of each player's library. During each player's turn, that player may play a land or cast a spell from among cards exiled with this enchantment."),'exile-cast'),true)
assert.equal(has(card('Wild-Magic Sorcerer','Creature — Orc Shaman','The first spell you cast from exile each turn has cascade.'),'exile-payoff'),true)
assert.equal(has(card('Prosper, Tome-Bound','Legendary Creature — Tiefling Warlock','At the beginning of your end step, exile the top card of your library. Until the end of your next turn, you may play that card. Whenever you play a card from exile, create a Treasure token.'),'exile-cast'),true)
assert.equal(has(card('Prosper, Tome-Bound','Legendary Creature — Tiefling Warlock','At the beginning of your end step, exile the top card of your library. Until the end of your next turn, you may play that card. Whenever you play a card from exile, create a Treasure token.'),'exile-payoff'),true)

// Text that merely mentions colors or finds a land to hand is not a mana source.
assert.deepEqual(sourceColors(card('Mycosynth Wellspring','Artifact','When Mycosynth Wellspring enters the battlefield or is put into a graveyard from the battlefield, you may search your library for a basic land card, reveal it, put it into your hand, then shuffle.')),[])
assert.deepEqual(sourceColors(card('Share the Spoils','Enchantment',"During each player's turn, that player may spend mana as though it were mana of any color to cast a spell.")),[])
assert.deepEqual(sourceColors(card('Arcane Signet','Artifact','{T}: Add one mana of any color in your commander’s color identity.')),['W','U','B','R','G'])
assert.deepEqual(sourceColors(card('Fertile Ground','Enchantment — Aura','Whenever enchanted land is tapped for mana, its controller adds an additional one mana of any color.',{producedMana:['W','U','B','R','G']})),['W','U','B','R','G'])

console.log('SEMANTIC DIRECTION REGRESSION OK — draw/spells/exile/mana source precision')
