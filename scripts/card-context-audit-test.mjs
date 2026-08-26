import assert from 'node:assert/strict'
import { cardContextFlags,cardContextSeverity } from '../src/engine/cardContext.js'

const card=(name,oracle,tags=[])=>({name,oracle,tags})
const flags=c=>new Set(cardContextFlags(c))

const pact=card('Demonic Pact','At the beginning of your upkeep, choose one that hasn\'t been chosen —\n• Draw two cards.\n• You lose the game.',['enchantment','draw','lifegain'])
assert(flags(pact).has('lose-game'))
assert.equal(cardContextSeverity(pact),'critical')

const greed=card("Greed's Gambit",'When this enchantment enters, you draw three cards, gain 6 life, and create three 2/1 black Bat creature tokens with flying.\nAt the beginning of your end step, you discard a card, lose 2 life, and sacrifice a creature.\nWhen this enchantment leaves the battlefield, you discard three cards, lose 6 life, and sacrifice three creatures.',['enchantment','draw','tokens','sacrifice','etb'])
const gf=flags(greed)
assert(gf.has('harmful-leave'))
assert(gf.has('recurring-sacrifice'))
assert(gf.has('recurring-discard'))
assert(!gf.has('draw-discard'),'independent ETB draw and later recurring discard are different contexts')

const nine=card('Nine Lives','Hexproof\nWhen this enchantment leaves the battlefield, you lose the game.',['enchantment','protection'])
assert(flags(nine).has('lose-game'))
assert(flags(nine).has('harmful-leave'))

const annex=card('Unholy Annex // Ritual Chamber','At the beginning of your end step, draw a card. If you control a Demon, each opponent loses 2 life and you gain 2 life. Otherwise, you lose 2 life.',['enchantment','draw','lifegain'])
assert(flags(annex).has('conditional-lifegain'))

const bmc=card('Black Market Connections','At the beginning of your first main phase, choose one or more —\n• Create a Treasure token. You lose 1 life.\n• Draw a card. You lose 2 life.',['enchantment','draw','mana','tokens'])
assert(flags(bmc).has('recurring-life-loss'))

const bigScore=card('Big Score','As an additional cost to cast this spell, discard a card.\nDraw two cards and create two Treasure tokens.',['instant','draw','mana','tokens'])
assert(flags(bigScore).has('draw-discard'))

const over=card('Overlord of the Floodpits','Impending 4—{1}{U}{U}\nWhenever this permanent enters or attacks, draw two cards, then discard a card.',['creature','enchantment','draw','etb'])
const of=flags(over)
assert(of.has('alternate-timing'))
assert(of.has('draw-discard'))

const connive=card('Change of Plans','Each of X target creatures you control connive. You may have any number of them phase out. (To have a creature connive, draw a card, then discard a card.)',['instant','draw','protection','counter-producer'])
assert(flags(connive).has('draw-discard'),'connive is intrinsically draw-then-discard even when reminder text is stripped')

const cryptbreaker=card('Cryptbreaker','{1}{B}, {T}, Discard a card: Create a 2/2 black Zombie creature token.\nTap three untapped Zombies you control: You draw a card and you lose 1 life.',['creature','draw','graveyard-setup','tokens'])
assert(!flags(cryptbreaker).has('draw-discard'),'discard-for-token and tap-Zombies-for-draw are independent abilities')

const alliance=card('Chivalric Alliance','Whenever you attack with two or more creatures, draw a card.\n{2}, Discard a card: Create a 2/2 white and blue Knight creature token with vigilance.',['enchantment','draw','graveyard-setup','tokens'])
assert(!flags(alliance).has('draw-discard'),'an unrelated token activation must not downgrade independent attack draw')

const monument=card('Monument to Endurance','Whenever you discard a card, choose one that hasn\'t been chosen this turn —\n• Draw a card.\n• Create a Treasure token.\n• Each opponent loses 3 life.',['artifact','draw','mana','graveyard-setup','tokens'])
assert(!flags(monument).has('draw-discard'),'rewarding an external discard is not a draw cost imposed by this card')

const aura=card('Sheltered by Ghosts','Enchant creature you control\nWhen this Aura enters, exile target nonland permanent an opponent controls until this Aura leaves the battlefield.\nEnchanted creature gets +1/+0 and has lifelink and ward {2}.',['enchantment','removal','protection','etb'])
assert(flags(aura).has('temporary-removal'))

const yojimbo=card('Summon: Yojimbo','II, III — Until your next turn, creatures can\'t attack you unless their controller pays {2} for each of those creatures.',['enchantment','stax'])
assert(flags(yojimbo).has('defensive-tax'))

const taskmaster=card('Demonic Taskmaster','At the beginning of your upkeep, sacrifice a creature other than this creature.',['creature','sacrifice'])
assert(flags(taskmaster).has('recurring-sacrifice'))

const gwenom=card('Gwenom, Remorseless','Whenever Gwenom attacks, until end of turn, you may play cards from the top of your library. If you cast a spell this way, pay life equal to its mana value rather than pay its mana cost.',['creature','lifegain','free'])
assert(flags(gwenom).has('life-payment'),'alternate costs paid with controller life must remain visible')

const warRoom=card('War Room','{T}: Add {C}.\n{3}, {T}, Pay life equal to the number of colors in your commanders\' color identity: Draw a card.',['land','draw','mana'])
assert(flags(warRoom).has('life-payment'),'activated life payments by the controller must be recognized')

const zul=card('Zul Ashur, Lich Lord','Ward—Pay 2 life.\n{T}: You may cast target Zombie creature card from your graveyard this turn.',['creature','protection','recursion'])
assert(!flags(zul).has('life-payment'),'Ward life is an opponent cost, not a downside paid by the controller')

const squelcher=card('Hexing Squelcher','This spell can\'t be countered.\nWard—Pay 2 life.\nSpells you control can\'t be countered.\nOther creatures you control have "Ward—Pay 2 life."',['creature','protection'])
assert(!flags(squelcher).has('life-payment'),'granted Ward costs must not be presented as controller life payments')

const treasureReminder=card('Goldvein Pick','Whenever equipped creature deals combat damage to a player, create a Treasure token. (It\'s an artifact with “{T}, Sacrifice this token: Add one mana of any color.”)',['artifact','mana','tokens'])
assert(!flags(treasureReminder).has('recurring-sacrifice'),'reminder-text Treasure sacrifice must not become a downside')

console.log('CARD CONTEXT AUDIT OK — causal filtering, lose-game, harmful LTB, recurring costs, timing, temporary restrictions and controller-only life payments are explicit without changing score')
