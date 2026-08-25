import assert from 'node:assert/strict'
import { cardFeatures, featureDeck, tagsFor } from '../src/engine/cardFeatures.js'
import { detectPackages } from '../src/engine/packageGraph.js'
import { simulateSequences, canPay } from '../src/engine/sequenceSimulator.js'
import { targetCostReductionProfile, targetGenericReduction, topLibraryCheatProfile, topLibraryCheatDeckStats } from '../src/engine/commanderMechanics.js'

const card=(name,type,oracle,cmc=2,manaCost='')=>({name,type,oracle,cmc,manaCost,colors:[],colorIdentity:[],producedMana:[],legalities:{commander:'legal'}})
const featured=c=>cardFeatures(c)
const has=(c,t)=>tagsFor(c).includes(t)

// Generic targeting reducers: detect mechanics, preserve colored requirements, and never reduce X itself.
const hinata=featured(card('Target Reducer','Legendary Creature — Kirin Spirit','Flying\nSpells you cast cost {1} less to cast for each target.',4,'{1}{R}{W}{U}'))
const triple=featured(card('Triple Tap','Instant','Tap up to three target creatures.',4,'{3}{U}'))
assert.deepEqual(targetCostReductionProfile(hinata),{kind:'per-target',scope:'any',amount:1})
assert.equal(targetGenericReduction(triple,hinata),3)
assert.equal(canPay(triple,[{options:['U'],origin:'Island'}],0,3),true,'generic target reduction must preserve the blue pip')
assert.equal(canPay(triple,[{options:['R'],origin:'Mountain'}],0,3),false,'generic target reduction must not erase colored pips')

const killian=featured(card('Creature Target Reducer','Legendary Creature — Human Warlock','Spells you cast that target a creature cost {2} less to cast.',2,'{W}{B}'))
const creatureSpell=featured(card('Protect Creature','Instant','Target creature you control gains indestructible until end of turn.',3,'{2}{W}'))
const artifactSpell=featured(card('Break Relic','Instant','Destroy target artifact.',3,'{2}{W}'))
assert.equal(targetGenericReduction(creatureSpell,killian),2)
assert.equal(targetGenericReduction(artifactSpell,killian),0)
const xSpell=featured(card('X Blast','Sorcery','X target creatures get -1/-1 until end of turn.',1,'{X}{B}'))
assert.equal(targetGenericReduction(xSpell,hinata),0,'unknown X must remain conservative rather than becoming free')

// The reducer must matter in actual turn access after the commander is online.
const island=i=>card(`Island ${i}`,'Basic Land — Island','{T}: Add {U}.',0,'')
const cheap=i=>card(`Setup ${i}`,'Instant','Draw a card.',1,'{U}')
const targeted=i=>card(`Targeted ${i}`,'Instant','Tap up to three target creatures. Draw a card.',4,'{3}{U}')
const filler=i=>card(`Filler ${i}`,'Creature — Fish','',5,'{4}{U}')
const seqCards=featureDeck([
  ...Array.from({length:40},(_,i)=>island(i)),
  ...Array.from({length:10},(_,i)=>cheap(i)),
  ...Array.from({length:20},(_,i)=>targeted(i)),
  ...Array.from({length:29},(_,i)=>filler(i)),
])
const seqCommander=featured(card('Sequence Reducer','Legendary Creature — Wizard','Spells you cast cost {1} less to cast for each target.',2,'{1}{U}'))
const seq=simulateSequences(seqCards,seqCommander,[],[],450,7,()=>0.3141592653)
assert.ok(seq.commanderMechanics?.targetCostReduction?.eligibleSpells>0,'target reducer must expose eligible spells')
assert.ok(seq.commanderMechanics?.targetCostReduction?.unlockRate>0,'target reducer must unlock otherwise unavailable casts in sequence simulation')
assert.ok(seq.turnProfile.some(t=>t.targetReduction>0),'turn profile must expose target-reduction access')

// Generic top-library creature cheat: actual shuffled-library hits and mana compression are simulated.
const cheatCommander=featured(card('Sky Caller','Legendary Creature — Dragon','When this creature enters and whenever it attacks, look at the top eight cards of your library. You may put a Dragon creature card from among them onto the battlefield. Put the rest on the bottom of your library in a random order.',4,'{3}{G}'))
const forest=i=>card(`Forest ${i}`,'Basic Land — Forest','{T}: Add {G}.',0,'')
const dragon=i=>card(`Dragon ${i}`,'Creature — Dragon','Flying',7,'{5}{G}{G}')
const early=i=>card(`Early ${i}`,'Creature — Elf','',1,'{G}')
const other=i=>card(`Other ${i}`,'Creature — Beast','',4,'{3}{G}')
const cheatCards=featureDeck([
  ...Array.from({length:40},(_,i)=>forest(i)),
  ...Array.from({length:24},(_,i)=>dragon(i)),
  ...Array.from({length:12},(_,i)=>early(i)),
  ...Array.from({length:23},(_,i)=>other(i)),
])
const cheatProfile=topLibraryCheatProfile(cheatCommander)
assert.ok(cheatProfile&&cheatProfile.look===8&&cheatProfile.subtype==='dragon'&&cheatProfile.onEnter&&cheatProfile.onAttack)
const cheatDeckStats=topLibraryCheatDeckStats(cheatCards,cheatCommander)
assert.ok(cheatDeckStats.hitProbability>.75,'dragon-dense top-eight deck should have a high structural hit probability')
const cheatSim=simulateSequences(cheatCards,cheatCommander,[],[],500,7,()=>0.2718281828)
assert.ok(cheatSim.commanderMechanics?.topLibraryCheat?.triggers>0,'top-library cheat triggers must be simulated')
assert.ok(cheatSim.commanderMechanics?.topLibraryCheat?.hits>0,'top-library cheat must resolve actual hits')
assert.ok(cheatSim.commanderMechanics?.topLibraryCheat?.averageManaCompressed>=6,'free high-MV deployment must record mana compression')
assert.ok(cheatSim.turnProfile.some(t=>t.commanderCheat>0),'turn profile must expose commander cheat windows')

// Audit-driven semantic corrections.
const desert=card('Desert Warfare','Enchantment','Whenever you sacrifice a Desert and whenever a Desert card is put into your graveyard from your hand or library, put that card onto the battlefield under your control at the beginning of your next end step.',4,'{3}{G}')
const lannery=card('Captain Lannery Storm','Legendary Creature — Human Pirate','Whenever Captain Lannery Storm attacks, create a Treasure token. Whenever you sacrifice a Treasure, Captain Lannery Storm gets +1/+0 until end of turn.',3,'{2}{R}')
const rose=card('Rose, Cutthroat Raider','Legendary Artifact Creature — Robot','At end of combat on your turn, if you attacked this turn, create a Junk token. Whenever you sacrifice a Junk, add {R}.',3,'{2}{R}')
assert.equal(has(desert,'death-payoff'),false,'Desert sacrifice is not creature death')
assert.equal(has(lannery,'death-payoff'),false,'Treasure sacrifice is not creature death')
assert.equal(has(rose,'death-payoff'),false,'Junk sacrifice is not creature death')

const sower=card('Oblivion Sower','Creature — Eldrazi','When you cast this spell, target opponent exiles the top four cards of their library, then you may put any number of land cards that player owns from exile onto the battlefield under your control.',6,'{6}')
assert.equal(has(sower,'exile-cast'),false,'moving opponent lands from exile to battlefield is not casting from exile')

const mastery=card("Mizzix's Mastery",'Sorcery',"Exile target card that's an instant or sorcery from your graveyard. For each card exiled this way, copy it, and you may cast the copy without paying its mana cost. Exile Mizzix's Mastery.",4,'{3}{R}')
const adversary=card('Bloodthirsty Adversary','Creature — Vampire','When this creature enters, you may pay {2}{R}. When you pay this cost, exile target instant or sorcery card with mana value 3 or less from your graveyard and copy it. You may cast the copy without paying its mana cost.',2,'{1}{R}')
assert.equal(has(mastery,'recursion'),true,'graveyard spell replay via copy/cast is recursion')
assert.equal(has(mastery,'exile-cast'),false,'copy replay is not an exile-cast engine')
assert.equal(has(adversary,'recursion'),true)
assert.equal(has(adversary,'exile-cast'),false)

const experiment=card('Epic Experiment','Sorcery',"Exile the top X cards of your library. You may cast instant and sorcery spells with mana value X or less from among them without paying their mana costs. Then put all cards exiled this way that weren't cast into your graveyard.",2,'{X}{U}{R}')
assert.equal(has(experiment,'graveyard-setup'),true,'uncast Epic Experiment cards explicitly stock the graveyard')

const selfShield=card('Self Shield','Creature — Spirit','Flying\nSelf Shield has indestructible as long as you control three other enchantments.',3,'{2}{W}')
const teamShield=card('Team Shield','Instant','Permanents you control gain hexproof and indestructible until end of turn.',2,'{1}{W}')
assert.equal(has(selfShield,'protection'),false,'self-only durability must not inflate deck-wide protection')
assert.equal(has(selfShield,'self-protection'),true)
assert.equal(has(teamShield,'protection'),true)

// Harmful leave-the-battlefield downside must exclude a card from Blink/ETB payoff evidence.
const blink1=card('Blink One','Instant','Exile target creature you control, then return it to the battlefield under its owner’s control.',1,'{W}')
const blink2=card('Blink Two','Instant','Exile another target creature you control, then return it to the battlefield under its owner’s control.',2,'{1}{W}')
const greed=card("Greed's Gambit",'Enchantment',"When Greed's Gambit enters, draw three cards, gain 6 life, and create three 2/1 black Bat creature tokens with flying. At the beginning of your end step, discard a card, lose 2 life, and sacrifice a creature. When Greed's Gambit leaves the battlefield, discard three cards, lose 6 life, and sacrifice three creatures.",4,'{3}{B}')
const wall=card('Wall of Omens','Creature — Wall','When Wall of Omens enters, draw a card.',2,'{1}{W}')
const oracle=card('Sea Oracle','Creature — Wizard','When Sea Oracle enters, draw a card.',3,'{2}{U}')
const blinkPkg=detectPackages(featureDeck([blink1,blink2,greed,wall,oracle]),null).find(p=>p.id==='blink-etb')
assert.ok(blinkPkg,'control ETB cards must still form a blink package')
assert.equal(blinkPkg.payoffs.includes("Greed's Gambit"),false,'harmful LTB card must not be advertised as a positive blink payoff')

console.log('SEMANTIC-15 SEQUENCE REGRESSION OK — target reducers, top-library cheat, graveyard replay, death/exile precision, protection scope and harmful LTB semantics')
