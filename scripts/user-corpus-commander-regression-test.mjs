import assert from 'node:assert/strict'
import { cardFeatures, featureDeck } from '../src/engine/cardFeatures.js'
import { commanderSynergy } from '../src/engine/packageGraph.js'
import { analyzePower } from '../src/engine/powerModel.js'

const raw=(name,type,oracle,cmc=2,manaCost='')=>({name,type,oracle,cmc,manaCost,colors:[],colorIdentity:[],producedMana:[],legalities:{commander:'legal'}})
const f=x=>cardFeatures(x)

// Zur-style enchantment animation / lord text should connect the enchantment shell instead of returning zero.
const zur=f(raw('Schemer','Legendary Creature — Human Wizard','Flying\nEnchantment creatures you control have deathtouch, lifelink, and hexproof.\n{1}{W}: Target non-Aura enchantment you control becomes a creature in addition to its other types and has base power and base toughness each equal to its mana value.',3,'{W}{U}{B}'))
const enchantments=featureDeck(Array.from({length:18},(_,i)=>raw(`Enchant ${i}`,'Enchantment',i%3===0?'When this enchantment enters, draw a card.':'',2,'{1}{W}')))
const zurSyn=commanderSynergy(enchantments,zur)
assert.ok(zurSyn.score>=90,'Zur-style animation must recognize a dense enchantment shell')
assert.ok(zurSyn.tags.includes('enchantment-animation'))
assert.ok(zurSyn.limitations?.includes('commander-enchantment-animation-combat-not-sequence-simulated'))

// Adriana-style global melee scales with a creature/go-wide shell.
const adriana=f(raw('Melee Captain','Legendary Creature — Human Knight','Melee\nOther creatures you control have melee.',5,'{3}{R}{W}'))
const army=featureDeck([
  ...Array.from({length:22},(_,i)=>raw(`Soldier ${i}`,'Creature — Human Soldier',i<6?'Whenever this creature attacks, create a 1/1 Soldier creature token.':'',2,'{1}{W}')),
  ...Array.from({length:6},(_,i)=>raw(`Token Maker ${i}`,'Sorcery','Create two 1/1 white Soldier creature tokens.',3,'{2}{W}')),
])
const adrianaSyn=commanderSynergy(army,adriana)
assert.ok(adrianaSyn.score>=70,'global melee must connect a real go-wide combat shell')
assert.ok(adrianaSyn.tags.includes('go-wide-combat'))

// Jon Irenicus-style donation should connect transfer effects and drawback creatures.
const jon=f(raw('Donation Wizard','Legendary Creature — Elf Wizard',"At the beginning of your end step, target opponent gains control of up to one target creature you control. Put two +1/+1 counters on it and tap it. It's goaded for the rest of the game.\nWhenever a creature you own but don't control attacks, you draw a card.",4,'{2}{U}{B}'))
const donation=featureDeck([
  raw('Steel Golem','Artifact Creature — Golem',"You can't cast creature spells.",3,'{3}'),
  raw('Dross Demon','Creature — Demon','At the beginning of your upkeep, sacrifice another creature. If you can’t, Dross Demon deals 6 damage to you.',4,'{2}{B}{B}'),
  raw('Donate','Sorcery','Target player gains control of target permanent you control.',3,'{2}{U}'),
  raw('Exchange','Instant','Exchange control of two target creatures.',4,'{3}{U}'),
  ...Array.from({length:8},(_,i)=>raw(`Bad Gift ${i}`,'Creature — Horror',"This creature can't block.",2,'{1}{B}')),
])
const jonSyn=commanderSynergy(donation,jon)
assert.ok(jonSyn.score>=60,'donation commander must not remain at zero with a dedicated drawback shell')
assert.ok(jonSyn.tags.includes('donation-goad'))

// Zedruu-style generic donation should use the same transferable/drawback evidence without pretending it is goad.
const zedruu=f(raw('Gift Goat','Legendary Creature — Minotaur Monk',"At the beginning of your upkeep, you gain X life and draw X cards, where X is the number of permanents you own that your opponents control.\n{U}{R}{W}: Target opponent gains control of target permanent you control.",4,'{1}{U}{R}{W}'))
const zedruuShell=featureDeck([
  raw('Plotter','Creature — Wizard','When this creature enters, exchange control of target land you control and target land an opponent controls.',3,'{2}{U}'),
  raw('Cadets','Creature — Goblin','Whenever this creature blocks or becomes blocked, target opponent gains control of it.',2,'{1}{R}'),
  raw('Bad Defender','Creature — Wall',"Defender\nThis creature can't attack.",2,'{1}{U}'),
  raw('Upkeep Burden','Creature — Giant','At the beginning of your upkeep, sacrifice another creature.',4,'{3}{R}'),
  ...Array.from({length:12},(_,i)=>raw(`Neutral ${i}`,'Instant','Scry 1.',2,'{1}{U}')),
])
const zedruuSyn=commanderSynergy(zedruuShell,zedruu)
assert.ok(zedruuSyn.score>=35,'generic donation commander must connect actual transfer/drawback candidates')
assert.ok(zedruuSyn.tags.includes('donation-engine'))
assert.ok(!zedruuSyn.tags.includes('donation-goad'))
assert.ok(zedruuSyn.limitations?.includes('donation-value-not-sequence-simulated'))

// Galea-style restricted top-library casting should recognize Aura/Equipment virtual depth.
const galea=f(raw('Top Gear Knight','Legendary Creature — Elf Knight','Vigilance\nYou may look at the top card of your library any time.\nYou may cast Aura and Equipment spells from the top of your library. When you cast an Equipment spell this way, it gains "When this Equipment enters, attach it to target creature you control."',4,'{1}{G}{W}{U}'))
const galeaShell=featureDeck([
  ...Array.from({length:6},(_,i)=>raw(`Aura ${i}`,'Enchantment — Aura','Enchant creature',2,'{1}{W}')),
  ...Array.from({length:6},(_,i)=>raw(`Equipment ${i}`,'Artifact — Equipment','Equipped creature gets +1/+1.\nEquip {1}',2,'{2}')),
  ...Array.from({length:18},(_,i)=>raw(`Filler ${i}`,'Instant','Scry 1.',2,'{1}{U}')),
])
const galeaSyn=commanderSynergy(galeaShell,galea)
assert.ok(galeaSyn.score>=60,'restricted top-library cast commander must connect Aura/Equipment density')
assert.ok(galeaSyn.tags.includes('top-library-aura-equipment'))
assert.ok(galeaSyn.limitations?.includes('top-library-restricted-cast-not-sequence-simulated'))

// Ob Nixilis-style exact-one-life engines need a semantic connection to pingers.
const ob=f(raw('Exact One King','Legendary Creature — Demon','Whenever one or more opponents each lose exactly 1 life, put a +1/+1 counter on this creature. Exile the top card of your library. Until your next end step, you may play that card.',4,'{2}{B}{R}'))
const pingers=featureDeck([
  ...Array.from({length:10},(_,i)=>raw(`Pinger ${i}`,'Creature — Wizard','Whenever you cast a noncreature spell, this creature deals 1 damage to each opponent.',2,'{1}{R}')),
  ...Array.from({length:5},(_,i)=>raw(`Pain ${i}`,'Enchantment','Whenever an opponent draws a card, that player loses 1 life.',3,'{2}{B}')),
])
const obSyn=commanderSynergy(pingers,ob)
assert.ok(obSyn.score>=80,'exact-one-life commander must recognize repeated one-point loss sources')
assert.ok(obSyn.tags.includes('exact-one-life-loss'))

// Redshift-style ability-only mana + Exhaust remains explicitly conservative until sequence simulation models it.
const redshift=f(raw('Ability Chief','Legendary Creature — Goblin Pilot','{T}: Add X mana of any one color, where X is this creature’s power. Spend this mana only to activate abilities.\nExhaust — {10}{R}{G}: Put any number of permanent cards from your hand onto the battlefield.',2,'{R}{G}'))
const redDeck=featureDeck([
  ...Array.from({length:36},(_,i)=>raw(`Forest ${i}`,'Basic Land — Forest','{T}: Add {G}.',0,'')),
  ...Array.from({length:20},(_,i)=>raw(`Permanent ${i}`,'Creature — Beast','',6,'{5}{G}')),
  ...Array.from({length:43},(_,i)=>raw(`Support ${i}`,'Artifact','',2,'{2}')),
])
const redResult=analyzePower(redDeck,redshift,null,180,{emitProduct:false,record:false,firstAccess:false})
assert.ok(redResult.methodology.limitations.includes('activated-ability-mana-and-exhaust-compression-not-sequence-simulated'))

console.log('USER CORPUS COMMANDER REGRESSION OK')
