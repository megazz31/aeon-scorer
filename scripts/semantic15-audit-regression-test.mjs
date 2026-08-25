import assert from 'node:assert/strict'
import { cardFeatures } from '../src/engine/cardFeatures.js'
import { commanderSynergy, detectPackages } from '../src/engine/packageGraph.js'

const card=(name,oracle='',cmc=2,type='Instant',manaCost='',producedMana=[])=>cardFeatures({name,oracle,cmc,type,manaCost,producedMana})
const filler=(name='Filler')=>card(name,'',2,'Creature — Human','{1}{W}')

// Audit corpus: Shalai and Hallar is a +1/+1-counter payoff even though semantic-14
// does not emit counter-payoff for the wording "one or more +1/+1 counters are put".
const shalai=card('Shalai and Hallar','Flying, vigilance\nWhenever one or more +1/+1 counters are put on a creature you control, Shalai and Hallar deals that much damage to target opponent.',4,'Legendary Creature — Angel Elf','{1}{R}{G}{W}')
const counterDeck=[
  ...Array.from({length:10},(_,i)=>card(`Counter maker ${i}`,'Put a +1/+1 counter on target creature you control.',2,'Creature — Elf','{1}{G}')),
  ...Array.from({length:20},(_,i)=>filler(`Counter filler ${i}`)),
]
const shalaiSynergy=commanderSynergy(counterDeck,shalai)
assert(shalaiSynergy.score>0,'Shalai and Hallar must connect to +1/+1 counter producers')
assert(shalaiSynergy.tags.includes('counter-payoff'))

// Hinata and Killian are the same semantic family: targeting-based spell cost compression.
const hinata=card('Hinata, Dawn-Crowned','Flying, trample\nSpells you cast cost {1} less to cast for each target.\nSpells your opponents cast cost {1} more to cast for each target.',4,'Legendary Creature — Kirin Spirit','{1}{U}{R}{W}')
const killian=card('Killian, Ink Duelist','Lifelink\nMenace\nSpells you cast that target a creature cost {2} less to cast.',2,'Legendary Creature — Human Warlock','{W}{B}')
const targetSpells=[
  ...Array.from({length:12},(_,i)=>card(`Creature target ${i}`,'Target creature gets +2/+2 until end of turn.',2,'Instant','{1}{W}')),
  ...Array.from({length:5},(_,i)=>card(`Player target ${i}`,'Target player draws a card.',2,'Instant','{1}{U}')),
]
const hinataSynergy=commanderSynergy(targetSpells,hinata)
assert(hinataSynergy.score>0&&hinataSynergy.tags.includes('target-cost-reduction'),'Hinata must structurally connect to targeted spells')
assert.equal(hinataSynergy.connected.length,17,'Hinata may reduce any targeted spell')
const killianSynergy=commanderSynergy(targetSpells,killian)
assert(killianSynergy.score>0&&killianSynergy.tags.includes('target-cost-reduction'),'Killian must use the same targeting-cost semantic family')
assert.equal(killianSynergy.connected.length,12,'Killian must connect only spells that can target creatures')

// Sythis is an enchantment-cast payoff, not merely a lifegain card.
const sythis=card("Sythis, Harvest's Hand",'Whenever you cast an enchantment spell, you gain 1 life and draw a card.',2,'Legendary Enchantment Creature — Nymph','{G}{W}')
const enchantments=Array.from({length:16},(_,i)=>card(`Enchantment ${i}`,'Creatures you control get +0/+1.',2,'Enchantment','{1}{W}'))
const sythisSynergy=commanderSynergy(enchantments,sythis)
assert(sythisSynergy.score>0&&sythisSynergy.tags.includes('enchantment-cast-payoff'),'Sythis must connect to enchantment spells')
assert.equal(sythisSynergy.connected.length,16)

// Bruenor and equipment decks need their own package/commander relationship.
const bruenor=card('Bruenor Battlehammer','Each creature you control gets +2/+0 for each Equipment attached to it.\nYou may pay {0} rather than pay the equip cost of the first equip ability you activate each turn.',4,'Legendary Creature — Dwarf Warrior','{2}{R}{W}')
const equipments=Array.from({length:8},(_,i)=>card(`Equipment ${i}`,'Equipped creature gets +1/+1.\nEquip {2}',2,'Artifact — Equipment','{2}'))
const equipmentPayoff=card('Equipment payoff','Whenever an equipped creature you control attacks, draw a card.',3,'Creature — Dwarf','{2}{W}')
const equipmentPool=[...equipments,equipmentPayoff,...Array.from({length:12},(_,i)=>filler(`Equip filler ${i}`))]
const bruenorSynergy=commanderSynergy(equipmentPool,bruenor)
assert(bruenorSynergy.score>0&&bruenorSynergy.tags.includes('equipment-payoff'),'Bruenor must connect to Equipment cards')
assert(detectPackages(equipmentPool,bruenor).some(p=>p.id==='equipment'),'A dense Equipment shell must produce an Equipment package')

// Type-aware commander links are allowed only when the commander text explicitly names a tribe.
const miirym=card('Miirym, Sentinel Wyrm','Flying, ward {2}\nWhenever another nontoken Dragon you control enters, create a token that is a copy of it.',6,'Legendary Creature — Dragon Spirit','{3}{G}{U}{R}')
const dragons=Array.from({length:10},(_,i)=>card(`Dragon ${i}`,'Flying.',5,'Creature — Dragon','{4}{R}'))
const miirymSynergy=commanderSynergy([...dragons,...Array.from({length:10},(_,i)=>filler(`Miirym filler ${i}`))],miirym)
assert(miirymSynergy.tags.includes('tribal:dragon')&&miirymSynergy.score>0,'Miirym must connect to the Dragon density explicitly referenced by its Oracle text')
const varina=card('Varina, Lich Queen','Whenever you attack with one or more Zombies, draw that many cards, then discard that many cards. You gain that much life.\n{2}, Exile two cards from your graveyard: Create a tapped 2/2 black Zombie creature token.',4,'Legendary Creature — Human Wizard','{1}{W}{U}{B}')
const zombies=Array.from({length:10},(_,i)=>card(`Zombie ${i}`,'',2,'Creature — Zombie','{1}{B}'))
const varinaSynergy=commanderSynergy([...zombies,...Array.from({length:10},(_,i)=>filler(`Varina filler ${i}`))],varina)
assert(varinaSynergy.tags.includes('tribal:zombie')&&varinaSynergy.score>0,'Varina must connect to Zombies even though Zombie is not a subtype of the commander itself')

// Early-commander package must reflect the real pre-commander timing window.
const cmd4=card('MV4 Commander','Flying.',4,'Legendary Creature — Angel','{2}{W}{W}')
const cmd5=card('MV5 Commander','Flying.',5,'Legendary Creature — Angel','{3}{W}{W}')
const rock=(name,cmc)=>card(name,'{T}: Add {W}.',cmc,'Artifact',`{${cmc}}`,['W'])
const cmc3Rocks=Array.from({length:5},(_,i)=>rock(`Three mana rock ${i}`,3))
const cmc2Rocks=Array.from({length:5},(_,i)=>rock(`Two mana rock ${i}`,2))
assert(!detectPackages(cmc3Rocks,cmd4).some(p=>p.id==='early-commander'),'CMC3 setup cannot accelerate an MV4 commander before its normal T4')
assert(detectPackages(cmc2Rocks,cmd4).some(p=>p.id==='early-commander'),'CMC2 persistent sources can accelerate an MV4 commander')
assert(detectPackages(cmc3Rocks,cmd5).some(p=>p.id==='early-commander'),'CMC3 persistent sources can accelerate an MV5 commander to T4')
const abilityOnly=Array.from({length:5},(_,i)=>card(`Ability mana ${i}`,'{T}: Add {W}. Spend this mana only to activate abilities.',1,'Artifact','{1}',['W']))
assert(!detectPackages(abilityOnly,cmd5).some(p=>p.id==='early-commander'),'Mana restricted to activated abilities cannot fund the commander')

console.log('SEMANTIC-15 AUDIT REGRESSION OK — commander engines, Equipment, tribal links and timing-correct early ramp')
