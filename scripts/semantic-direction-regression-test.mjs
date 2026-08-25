import assert from 'node:assert/strict'
import { tagsFor, sourceColors } from '../src/engine/cardFeatures.js'

const card=(name,type,oracle,extra={})=>({name,type,oracle,cmc:2,manaCost:'',colors:[],colorIdentity:[],producedMana:[],legalities:{commander:'legal'},...extra})
const has=(c,t)=>tagsFor(c).includes(t)

// Draw source vs draw payoff.
assert.equal(has(card('Underworld Dreams','Enchantment','Whenever an opponent draws a card, Underworld Dreams deals 1 damage to that player.'),'draw'),false)
assert.equal(has(card('Psychosis Crawler','Artifact Creature — Horror','Whenever you draw a card, each opponent loses 1 life.'),'draw'),false)
assert.equal(has(card('Mulldrifter','Creature — Elemental','When Mulldrifter enters the battlefield, draw two cards.'),'draw'),true)
assert.equal(has(card('Rhystic Study','Enchantment','Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.'),'draw'),true)
assert.equal(has(card('Arcanis the Omnipotent','Legendary Creature — Wizard','{T}: Draw three cards. {2}{U}{U}: Return Arcanis the Omnipotent to its owner\'s hand.'),'draw'),true)
assert.equal(has(card('Greater Good','Enchantment','Sacrifice a creature: Draw cards equal to the sacrificed creature\'s power, then discard three cards.'),'draw'),true)
assert.equal(has(card('Brokers Charm','Instant','Choose one —\n• Target creature you control gets +1/+0 until end of turn.\n• Destroy target enchantment.\n• Draw two cards.'),'draw'),true)
assert.equal(has(card('Treasure Cruise','Sorcery','Delve\nDraw three cards.'),'draw'),true)
assert.equal(has(card('Alms Collector','Creature — Cat Cleric','Flash\nIf an opponent would draw two or more cards, instead you and that player each draw a card.'),'draw'),true)
assert.equal(has(card('Windfall','Sorcery','Each player discards their hand, then draws cards equal to the greatest number of cards a player discarded this way.'),'draw'),true)
assert.equal(has(card('Sphinx\'s Revelation','Instant','You gain X life and draw X cards.'),'draw'),true)
assert.equal(has(card('Abundance','Enchantment','If you would draw a card, you may instead choose land or nonland and reveal cards from the top of your library until you reveal a card of the chosen kind.'),'draw'),false)

// Countermagic is interaction, not a physical counter package or automatic stax.
for(const c of [
  card('Negate','Instant','Counter target noncreature spell.'),
  card('Fierce Guardianship','Instant','If you control a commander, you may cast this spell without paying its mana cost. Counter target noncreature spell.'),
  card('Swan Song','Instant','Counter target enchantment, instant, or sorcery spell. Its controller creates a 2/2 blue Bird creature token with flying.'),
  card('Exclude','Instant','Counter target creature spell. Draw a card.'),
  card('Flusterstorm','Instant','Counter target instant or sorcery spell unless its controller pays {1}. Storm.')
]){
  assert.equal(has(c,'counterspell'),true,c.name)
  assert.equal(has(c,'counter-kind:generic'),false,`${c.name} must not become a counter package card`)
  assert.equal(has(c,'stax'),false,`${c.name} is one-shot countermagic, not stax`)
}
assert.equal(has(card('Mystic Confluence','Instant','Choose three.\n• Counter target spell unless its controller pays {3}.\n• Return target creature to its owner\'s hand.\n• Draw a card.'),'counterspell'),true)
assert.equal(has(card('Ghostly Prison','Enchantment','Creatures can\'t attack you unless their controller pays {2} for each creature they control that\'s attacking you.'),'stax'),true)
assert.equal(has(card('Damia, Sage of Stone','Legendary Creature — Gorgon Wizard','Deathtouch\nSkip your draw step.\nAt the beginning of your upkeep, if you have fewer than seven cards in hand, draw cards equal to the difference.'),'draw'),true)
assert.equal(has(card('Damia, Sage of Stone','Legendary Creature — Gorgon Wizard','Deathtouch\nSkip your draw step.\nAt the beginning of your upkeep, if you have fewer than seven cards in hand, draw cards equal to the difference.'),'stax'),false)

// Spellslinger must care specifically about your instant/sorcery/noncreature spell flow.
assert.equal(has(card('Arasta of the Endless Web','Legendary Enchantment Creature — Spider','Whenever an opponent casts an instant or sorcery spell, create a 1/2 green Spider creature token with reach.'),'spellslinger'),false)
assert.equal(has(card('Talrand, Sky Summoner','Legendary Creature — Merfolk Wizard','Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.'),'spellslinger'),true)
assert.equal(has(card('Kess, Dissident Mage','Legendary Creature — Human Wizard','During each of your turns, you may cast an instant or sorcery spell from your graveyard. If a card cast this way would be put into your graveyard, exile it instead.'),'spellslinger'),true)
assert.equal(has(card('Anhelo, the Painter','Legendary Creature — Vampire Assassin','The first instant or sorcery spell you cast each turn has casualty 2.'),'spellslinger'),true)
assert.equal(has(card('Wild-Magic Sorcerer','Creature — Orc Shaman','The first spell you cast from exile each turn has cascade.'),'spellslinger'),false)
assert.equal(has(card('Rain of Riches','Enchantment','The first spell you cast each turn that mana from a Treasure was spent to cast has cascade.'),'spellslinger'),false)
assert.equal(has(card('Maelstrom Nexus','Enchantment','The first spell you cast each turn has cascade.'),'spellslinger'),false)

// Exile-play engines commonly span multiple sentences.
assert.equal(has(card('Light Up the Stage','Sorcery','Exile the top two cards of your library. Until the end of your next turn, you may play those cards.'),'exile-cast'),true)
assert.equal(has(card('Share the Spoils','Enchantment',"When this enchantment enters, exile the top card of each player's library. During each player's turn, that player may play a land or cast a spell from among cards exiled with this enchantment."),'exile-cast'),true)
assert.equal(has(card('Wild-Magic Sorcerer','Creature — Orc Shaman','The first spell you cast from exile each turn has cascade.'),'exile-payoff'),true)
assert.equal(has(card('Prosper, Tome-Bound','Legendary Creature — Tiefling Warlock','At the beginning of your end step, exile the top card of your library. Until the end of your next turn, you may play that card. Whenever you play a card from exile, create a Treasure token.'),'exile-cast'),true)
assert.equal(has(card('Prosper, Tome-Bound','Legendary Creature — Tiefling Warlock','At the beginning of your end step, exile the top card of your library. Until the end of your next turn, you may play that card. Whenever you play a card from exile, create a Treasure token.'),'exile-payoff'),true)

// Nontoken text and text printed inside a freshly-created token must not become a deck-wide token payoff.
assert.equal(has(card('Guardian Project','Enchantment',"Whenever a nontoken creature you control enters, if it doesn't have the same name as another creature you control or a creature card in your graveyard, draw a card."),'token-payoff'),false)
assert.equal(has(card('Theoretical Duplication','Instant',"Whenever a nontoken creature an opponent controls enters this turn, create a token that's a copy of that creature."),'token-payoff'),false)
assert.equal(has(card('Angelic Sell-Sword','Creature — Angel Mercenary','Flying, vigilance. Whenever this creature or another nontoken creature you control enters, create a 1/1 red Mercenary creature token with "{T}: Target creature you control gets +1/+0 until end of turn. Activate only as a sorcery."'),'token-payoff'),false)
assert.equal(has(card('Angelic Sell-Sword','Creature — Angel Mercenary','Flying, vigilance. Whenever this creature or another nontoken creature you control enters, create a 1/1 red Mercenary creature token with "{T}: Target creature you control gets +1/+0 until end of turn. Activate only as a sorcery."'),'tokens'),true)
assert.equal(has(card('Mondrak, Glory Dominus','Legendary Creature — Phyrexian Horror','If one or more tokens would be created under your control, twice that many of those tokens are created instead.'),'token-payoff'),true)
assert.equal(has(card('Tireless Tracker','Creature — Human Scout','Landfall — Whenever a land enters the battlefield under your control, investigate.'),'tokens'),true)
assert.equal(has(card('Confirm Suspicions','Instant','Counter target spell. Investigate three times.'),'tokens'),true)
assert.equal(has(card('Declaration in Stone','Sorcery','Exile any number of target creatures controlled by the same player. For each creature exiled this way, its controller investigates.'),'tokens'),false)

// Treasure mana must belong to the analyzed player, not merely appear in Oracle text.
assert.equal(has(card("An Offer You Can't Refuse",'Instant','Counter target noncreature spell. Its controller creates two Treasure tokens. (They are artifacts with "{T}, Sacrifice this token: Add one mana of any color.")'),'mana'),false)
assert.equal(has(card('Excavation Technique','Sorcery','Destroy target nonland permanent. Its controller creates two Treasure tokens.'),'mana'),false)
assert.equal(has(card('Deadly Dispute','Instant','As an additional cost to cast this spell, sacrifice an artifact or creature. Draw two cards and create a Treasure token.'),'mana'),true)
assert.equal(has(card('Monologue Tax','Enchantment','Whenever an opponent casts their second spell each turn, you create a Treasure token.'),'mana'),true)

// Landfall is directional: opponent land entries are not payoffs for your own ramp package.
assert.equal(has(card('Shattered Angel','Creature — Angel','Flying. Whenever a land an opponent controls enters, you may gain 3 life.'),'landfall'),false)
assert.equal(has(card('Sire of Stagnation','Creature — Eldrazi','Whenever a land an opponent controls enters, that player exiles the top two cards of their library and you draw two cards.'),'landfall'),false)
assert.equal(has(card('Tireless Tracker','Creature — Human Scout','Landfall — Whenever a land enters the battlefield under your control, investigate.'),'landfall'),true)

// Zone-change removal must include library displacement while excluding recursion/own-card movement.
for(const c of [
  card('Condemn','Instant','Put target attacking creature on the bottom of its owner\'s library. Its controller gains life equal to its toughness.'),
  card('Banishing Stroke','Instant','Put target artifact, creature, or enchantment on the bottom of its owner\'s library.'),
  card('Unexpectedly Absent','Instant','Put target nonland permanent into its owner\'s library just beneath the top X cards of that library.'),
  card('Temporal Spring','Sorcery','Put target permanent on top of its owner\'s library.')
])assert.equal(has(c,'removal'),true,c.name)
assert.equal(has(card('Chaos Warp','Instant','The owner of target permanent shuffles it into their library, then reveals the top card of their library.'),'removal'),true)
assert.equal(has(card('Blink','Enchantment — Saga','I, III — Choose target creature. Its owner shuffles it into their library, then investigates.\nII, IV — Create a 2/2 black Alien Angel artifact creature token.'),'removal'),true)
assert.equal(has(card('Noxious Revival','Instant','Put target card from a graveyard on top of its owner\'s library.'),'removal'),false)
assert.equal(has(card('Academy Ruins','Legendary Land','{T}: Add {C}. {1}{U}, {T}: Put target artifact card from your graveyard on top of your library.'),'removal'),false)
assert.equal(has(card('Reality Scramble','Sorcery','Put target permanent you own on the bottom of your library. Reveal cards from the top of your library until you reveal a card that shares a card type with that permanent.'),'removal'),false)

// Temporary opponent-only exile is interaction, but not a self-blink package producer.
const maze=card('Mystifying Maze','Land','{T}: Add {C}.\n{4}, {T}: Exile target attacking creature an opponent controls. At the beginning of the next end step, return it to the battlefield tapped under its owner\'s control.')
assert.equal(has(maze,'tempo-interaction'),true)
assert.equal(has(maze,'blink'),false)

// Sacrifice package payoffs must react to your deaths (or any deaths), not exclusively/conditionally to opponent deaths.
assert.equal(has(card('Assault Intercessor','Creature — Astartes Warrior','Whenever a creature an opponent controls dies, that player loses 2 life.'),'death-payoff'),false)
assert.equal(has(card('Massacre Wurm','Creature — Phyrexian Wurm','Whenever a creature an opponent controls dies, that player loses 2 life.'),'death-payoff'),false)
assert.equal(has(card('Kamber, the Plunderer','Legendary Creature — Vampire Rogue','Whenever a creature an opponent controls dies, you gain 1 life and create a Blood token.'),'death-payoff'),false)
assert.equal(has(card("Dead Man's Chest",'Enchantment — Aura',"Enchant creature an opponent controls. When enchanted creature dies, exile cards equal to its power from the top of its owner's library. You may cast spells from among those cards for as long as they remain exiled, and mana of any type can be spent to cast them."),'death-payoff'),false)
assert.equal(has(card('Markov Enforcer','Creature — Vampire Soldier','Whenever this creature or another Vampire you control enters, this creature fights up to one target creature an opponent controls. Whenever a creature dealt damage by this creature this turn dies, create a Blood token.'),'death-payoff'),false)
assert.equal(has(card('Vampiric Dragon','Creature — Vampire Dragon','Flying. Whenever a creature dealt damage by this creature this turn dies, put a +1/+1 counter on this creature. {1}{R}: This creature deals 1 damage to target creature.'),'death-payoff'),false)
assert.equal(has(card("Nurgle's Rot",'Enchantment — Aura',"Enchant creature an opponent controls. When enchanted creature dies, return this card to its owner's hand and you create a 1/3 black Demon creature token named Plaguebearer of Nurgle."),'death-payoff'),false)
assert.equal(has(card('Mayhem Devil','Creature — Devil','Whenever a player sacrifices a permanent, Mayhem Devil deals 1 damage to any target.'),'death-payoff'),true)
assert.equal(has(card('Moonstone Eulogist','Creature — Vampire Cleric','Flying. Whenever a creature an opponent controls dies, you create a Blood token. Whenever you sacrifice an artifact, put a +1/+1 counter on this creature and you gain 1 life.'),'artifact-payoff'),true)
assert.equal(has(card('Moonstone Eulogist','Creature — Vampire Cleric','Flying. Whenever a creature an opponent controls dies, you create a Blood token. Whenever you sacrifice an artifact, put a +1/+1 counter on this creature and you gain 1 life.'),'death-payoff'),false)
assert.equal(has(card('Bastion of Remembrance','Enchantment','Whenever a creature you control dies, each opponent loses 1 life and you gain 1 life.'),'death-payoff'),true)
assert.equal(has(card('Poison-Tip Archer','Creature — Elf Archer','Whenever another creature dies, each opponent loses 1 life.'),'death-payoff'),true)
assert.equal(has(card('Death Tyrant','Creature — Beholder Skeleton','Whenever an attacking creature you control or a blocking creature an opponent controls dies, create a 2/2 black Zombie creature token.'),'death-payoff'),true)
assert.equal(has(card('Skullclamp','Artifact — Equipment','Equipped creature gets +1/-1. Whenever equipped creature dies, draw two cards.'),'death-payoff'),true)
assert.equal(has(card('Marchesa, the Black Rose','Legendary Creature — Human Wizard','Whenever a creature you control with a +1/+1 counter on it dies, return that card to the battlefield under your control at the beginning of the next end step.'),'death-payoff'),true)
assert.equal(has(card('Species Specialist','Creature — Human Warrior','As this creature enters, choose a creature type. Whenever a creature of the chosen type dies, you may draw a card.'),'death-payoff'),true)
assert.equal(has(card('Bishop of Wings','Creature — Human Cleric','Whenever an Angel enters under your control, you gain 4 life. Whenever an Angel you control dies, create a 1/1 white Spirit creature token with flying.'),'death-payoff'),true)

// Graveyard setup must be yours, not an opponent-only discard effect.
assert.equal(has(card('Nath of the Gilt-Leaf','Legendary Creature — Elf Warrior','At the beginning of your upkeep, you may have target opponent discard a card at random. Whenever an opponent discards a card, you may create a 1/1 green Elf Warrior creature token.'),'graveyard-setup'),false)
assert.equal(has(card('Anje Falkenrath','Legendary Creature — Vampire','Haste\n{T}, Discard a card: Draw a card.\nWhenever you discard a card, if it has madness, untap Anje Falkenrath.'),'graveyard-setup'),true)

// Life payoff means payoff for gaining life, not generic drain or incidental lifelink.
assert.equal(has(card('Corpse Knight','Creature — Zombie Knight','Whenever another creature you control enters, each opponent loses 1 life.'),'life-payoff'),false)
assert.equal(has(card('Wound Reflection','Enchantment','At the beginning of each end step, each opponent loses life equal to the life they lost this turn.'),'life-payoff'),false)
assert.equal(has(card('Dina, Soul Steeper','Legendary Creature — Dryad Druid','Whenever you gain life, each opponent loses 1 life.'),'life-payoff'),true)
assert.equal(has(card('Dina, Soul Steeper','Legendary Creature — Dryad Druid','Whenever you gain life, each opponent loses 1 life.'),'lifegain'),false)
assert.equal(has(card('Ajani Pridemate','Creature — Cat Soldier','Whenever you gain life, put a +1/+1 counter on this creature.'),'life-payoff'),true)
assert.equal(has(card('Ajani Pridemate','Creature — Cat Soldier','Whenever you gain life, put a +1/+1 counter on this creature.'),'lifegain'),false)
assert.equal(has(card('Soul Warden','Creature — Human Cleric','Whenever another creature enters, you gain 1 life.'),'lifegain'),true)
assert.equal(has(card('Atraxa, Praetors Voice','Legendary Creature — Phyrexian Angel Horror','Flying, vigilance, deathtouch, lifelink. At the beginning of your end step, proliferate.'),'lifegain'),true)
assert.equal(has(card('Atraxa, Praetors Voice','Legendary Creature — Phyrexian Angel Horror','Flying, vigilance, deathtouch, lifelink. At the beginning of your end step, proliferate.'),'life-payoff'),false)

// Text that merely mentions colors or finds a land to hand is not a mana source.
assert.deepEqual(sourceColors(card('Mycosynth Wellspring','Artifact','When Mycosynth Wellspring enters the battlefield or is put into a graveyard from the battlefield, you may search your library for a basic land card, reveal it, put it into your hand, then shuffle.')),[])
assert.deepEqual(sourceColors(card('Share the Spoils','Enchantment',"During each player's turn, that player may spend mana as though it were mana of any color to cast a spell.")),[])
assert.deepEqual(sourceColors(card('Arcane Signet','Artifact','{T}: Add one mana of any color in your commander’s color identity.')),['W','U','B','R','G'])
assert.deepEqual(sourceColors(card('Fertile Ground','Enchantment — Aura','Whenever enchanted land is tapped for mana, its controller adds an additional one mana of any color.',{producedMana:['W','U','B','R','G']})),['W','U','B','R','G'])

// Keyword counter producers and payoffs without explicit standard phrasing.
assert.equal(has(card('Fathom Mage','Creature — Human Wizard','Evolve\nWhenever a +1/+1 counter is put on this creature, you may draw a card.'),'counter-producer'),true)
assert.equal(has(card('Gyre Sage','Creature — Elf Druid','Evolve\n{T}: Add {G} for each +1/+1 counter on this creature.'),'counter-producer'),true)
assert.equal(has(card('Dreadhorde Invasion','Enchantment','At the beginning of your upkeep, you lose 1 life and amass Zombies 1.'),'counter-producer'),true)
assert.equal(has(card('Dreadhorde Invasion','Enchantment','At the beginning of your upkeep, you lose 1 life and amass Zombies 1.'),'tokens'),true)
assert.equal(has(card('Together Forever','Enchantment','When this enchantment enters, support 2.'),'counter-producer'),true)
assert.equal(has(card('Elite Scaleguard','Creature — Human Soldier','When this creature enters, bolster 2.'),'counter-producer'),true)
const akki=card('Akki Battle Squad','Creature — Goblin Samurai','Whenever one or more modified creatures you control attack, untap all modified creatures you control.')
assert.equal(has(akki,'modified-payoff'),true)
assert.equal(has(akki,'counter-payoff'),false)
assert.equal(has(card('Idol of Oblivion','Artifact','{T}: Draw a card. Activate only if you created a token this turn.'),'token-payoff'),true)
assert.equal(has(card('Thalisse, Reverent Medium','Legendary Creature — Human Wizard','At the beginning of each end step, create X 1/1 white Spirit creature tokens with flying, where X is the number of tokens you created this turn.'),'token-payoff'),true)

// Wipes include destroy all, exile all, mass -X/-X, and mass damage sweepers.
assert.equal(has(card('Wrath of God','Sorcery','Destroy all creatures. They can\'t be regenerated.'),'wipe'),true)
assert.equal(has(card('Blasphemous Act','Sorcery','This spell costs {1} less to cast for each creature on the battlefield. Blasphemous Act deals 13 damage to each creature.'),'wipe'),true)
assert.equal(has(card('Chain Reaction','Sorcery','Chain Reaction deals X damage to each creature, where X is the number of creatures on the battlefield.'),'wipe'),true)
assert.equal(has(card('Starstorm','Instant','Starstorm deals X damage to each creature.'),'wipe'),true)
assert.equal(has(card('Toxic Deluge','Sorcery','As an additional cost to cast this spell, pay X life. All creatures get -X/-X until end of turn.'),'wipe'),true)
assert.equal(has(card('Farewell','Sorcery','Choose one or more —\n• Exile all artifacts.\n• Exile all creatures.\n• Exile all enchantments.\n• Exile all graveyards.'),'wipe'),true)

// Recursion keywords include flashback, unearth, escape, retrace, jump-start, etc.
assert.equal(has(card('Faithless Looting','Sorcery','Draw two cards, then discard two cards.\nFlashback {2}{R}'),'recursion'),true)
assert.equal(has(card('Salvation Colossus','Creature — Artifact','Unearth—Pay eight {E}.'),'recursion'),true)
assert.equal(has(card('Kroxa, Titan of Death\'s Hunger','Legendary Creature — Elder Giant','Escape—{B}{B}{R}{R}, Exile five other cards from your graveyard.'),'recursion'),true)
assert.equal(has(card('Spitting Image','Sorcery','Create a token that\'s a copy of target creature.\nRetrace'),'recursion'),true)

// Protection is deck-facing only when the card protects another resource; self-only durability stays separate.
assert.equal(has(card('Lightning Greaves','Artifact — Equipment','Equipped creature has haste and shroud.\nEquip {0}'),'protection'),true)
assert.equal(has(card('Canopy Gargantuan','Creature — Beast','Flying, ward {2}'),'protection'),false)
assert.equal(has(card('Canopy Gargantuan','Creature — Beast','Flying, ward {2}'),'self-protection'),true)
assert.equal(has(card('Shielding Plax','Enchantment — Aura','Enchanted creature can\'t be the target of spells or abilities your opponents control.'),'protection'),true)

// Fight, bite, and targeted edict removal.
assert.equal(has(card('Domri, Anarch of Bolas','Legendary Planeswalker — Domri','−2: Target creature you control fights target creature you don\'t control.'),'removal'),true)
assert.equal(has(card('Windswift Slice','Instant','Target creature you control deals damage equal to its power to target creature you don\'t control.'),'removal'),true)
assert.equal(has(card('Archon of Cruelty','Creature — Archon','Whenever this creature enters or attacks, target opponent sacrifices a creature or planeswalker of their choice...'),'removal'),true)

// Draw includes cycling, connive, and multi-player draw.
assert.equal(has(card('Happily Ever After','Enchantment','When this enchantment enters, each player gains 5 life and draws a card.'),'draw'),true)
assert.equal(has(card('Lethal Scheme','Instant','Each creature that convoked this spell connives.'),'draw'),true)
assert.equal(has(card('Forgotten Cave','Land','Cycling {R}'),'draw'),true)

// Land ramp includes multi-land placement and library reveals.
assert.equal(has(card('Expand the Sphere','Sorcery','Look at the top six cards of your library. Put up to two land cards from among them onto the battlefield tapped...'),'land-ramp'),true)
assert.equal(has(card('Wrenn and Seven','Legendary Planeswalker — Wrenn','0: Put any number of land cards from your hand onto the battlefield tapped.'),'land-ramp'),true)

// Spellslinger includes Prowess and Magecraft.
assert.equal(has(card('Monastery Mentor','Creature — Human Monk','Prowess\nWhenever you cast a noncreature spell, create a 1/1 white Monk creature token with prowess.'),'spellslinger'),true)
assert.equal(has(card('Elsha of the Infinite','Legendary Creature — Djinn Monk','Prowess\nYou may cast noncreature spells from the top of your library.'),'spellslinger'),true)

// Mana sources include land auras, scaling dorks, and scaling lands.
assert.equal(has(card('Wild Growth','Enchantment — Aura','Enchant land\nWhenever enchanted land is tapped for mana, its controller adds {G}.'),'mana'),true)
assert.equal(has(card('Fertile Ground','Enchantment — Aura','Enchant land\nWhenever enchanted land is tapped for mana, its controller adds an additional one mana of any color.'),'mana'),true)
assert.equal(has(card('Marwyn, the Nurturer','Legendary Creature — Elf Druid','{T}: Add an amount of {G} equal to Marwyn\'s power.'),'mana'),true)
assert.deepEqual(sourceColors(card('Wild Growth','Enchantment — Aura','Enchant land\nWhenever enchanted land is tapped for mana, its controller adds {G}.')),['G'])
assert.deepEqual(sourceColors(card('Fertile Ground','Enchantment — Aura','Enchant land\nWhenever enchanted land is tapped for mana, its controller adds an additional one mana of any color.')),['W','U','B','R','G'])
assert.deepEqual(sourceColors(card('Marwyn, the Nurturer','Legendary Creature — Elf Druid','{T}: Add an amount of {G} equal to Marwyn\'s power.')),['G'])

// Non-creature sacrifice (artifacts/clues/treasures) must not become creature death payoffs.
assert.equal(has(card('Moonstone Eulogist','Creature — Vampire Cleric','Flying. Whenever a creature an opponent controls dies, you create a Blood token. Whenever you sacrifice an artifact, put a +1/+1 counter on this creature and you gain 1 life.'),'death-payoff'),false)
assert.equal(has(card('Tireless Tracker','Creature — Human Scout','Landfall — Whenever a land you control enters, investigate. Whenever you sacrifice a Clue, put a +1/+1 counter on this creature.'),'death-payoff'),false)

console.log('SEMANTIC DIRECTION REGRESSION OK — causal draw/counters/stax/mana/removal/blink/tokens/death/lands/life precision')