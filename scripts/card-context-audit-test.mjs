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

const aura=card('Sheltered by Ghosts','Enchant creature you control\nWhen this Aura enters, exile target nonland permanent an opponent controls until this Aura leaves the battlefield.\nEnchanted creature gets +1/+0 and has lifelink and ward {2}.',['enchantment','removal','protection','etb'])
assert(flags(aura).has('temporary-removal'))

const yojimbo=card('Summon: Yojimbo','II, III — Until your next turn, creatures can\'t attack you unless their controller pays {2} for each of those creatures.',['enchantment','stax'])
assert(flags(yojimbo).has('defensive-tax'))

const taskmaster=card('Demonic Taskmaster','At the beginning of your upkeep, sacrifice a creature other than this creature.',['creature','sacrifice'])
assert(flags(taskmaster).has('recurring-sacrifice'))

const treasureReminder=card('Goldvein Pick','Whenever equipped creature deals combat damage to a player, create a Treasure token. (It\'s an artifact with “{T}, Sacrifice this token: Add one mana of any color.”)',['artifact','mana','tokens'])
assert(!flags(treasureReminder).has('recurring-sacrifice'),'reminder-text Treasure sacrifice must not become a downside')

console.log('CARD CONTEXT AUDIT OK — lose-game, harmful LTB, recurring costs, filtering, timing and temporary restrictions are explicit without changing score')
