import assert from 'node:assert/strict'
import { cardFeatures } from '../src/engine/cardFeatures.js'
import { detectPackages } from '../src/engine/packageGraph.js'

const card=(name,oracle='',cmc=2,type='Instant',manaCost='')=>cardFeatures({name,oracle,cmc,type,manaCost,producedMana:[],colors:[]})
const has=(c,t)=>c.tags.includes(t)

const dispute=card('Deadly Dispute','As an additional cost to cast this spell, sacrifice an artifact or creature. Draw two cards and create a Treasure token.',2,'Instant','{1}{B}')
assert(has(dispute,'draw'))
assert(has(dispute,'tokens'))
assert(has(dispute,'sac-enabler'),'Deadly Dispute is a one-shot sacrifice enabler')
assert(!has(dispute,'sac-outlet'),'Deadly Dispute must not be presented as a repeatable sacrifice outlet')
assert(!has(dispute,'artifact-payoff'),'Choosing an artifact for a one-shot cost is not an artifacts-matter payoff')

const conqueror=card('Charismatic Conqueror',"Whenever an artifact or creature enters the battlefield under an opponent's control, they may pay {1}. If they don't, you create a 1/1 white Vampire creature token with lifelink.",2,'Creature — Vampire Soldier','{1}{W}')
assert(has(conqueror,'tokens'))
assert(!has(conqueror,'artifact-payoff'),'Opponent-owned artifact triggers must not seed our artifact package')

const sergeant=card('Dusk Legion Sergeant','Menace. Whenever Dusk Legion Sergeant attacks, if you control another Vampire, it gets +1/+0 until end of turn. {1}{B}, Sacrifice Dusk Legion Sergeant: Other Vampires you control gain persist until end of turn. (When it dies, if it had no -1/-1 counters on it, return it to the battlefield under its owner’s control with a -1/-1 counter on it.)',2,'Creature — Vampire Soldier','{1}{B}')
assert(!has(sergeant,'death-payoff'),'Persist reminder text must not create a death-payoff tag')
assert(!has(sergeant,'sac-outlet'),'A self-sacrifice activation is not an outlet for other permanents')

const rocks=['Arcane Signet','Ashnod’s Altar','Mind Stone','Orzhov Signet','Skullclamp','Sol Ring','Talisman of Hierarchy'].map(n=>card(n,'',2,'Artifact','{2}'))
const fakeArtifactPool=[...rocks,conqueror,dispute]
assert(!detectPackages(fakeArtifactPool,null).some(p=>p.id==='artifacts'),'Clavileno must not get an artifact package from Charismatic Conqueror + Deadly Dispute false payoffs')

const bloodArtist=card('Blood Artist','Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.',2,'Creature','{1}{B}')
const cruel=card('Cruel Celebrant','Whenever a creature or planeswalker you control dies, each opponent loses 1 life and you gain 1 life.',2,'Creature','{W}{B}')
const outlet=card('Carrion Feeder','Sacrifice a creature: Put a +1/+1 counter on Carrion Feeder.',1,'Creature','{B}')
const sacPackage=detectPackages([outlet,dispute,bloodArtist,cruel],null).find(p=>p.id==='sacrifice')
assert(sacPackage,'A real sacrifice package may combine repeatable outlets and one-shot enablers')
assert(sacPackage.producers.includes('Deadly Dispute'))
assert(sacPackage.producers.includes('Carrion Feeder'))

console.log('CLAVILENO SEMANTIC OK — ownership, reminder text, artifact payoff and sacrifice roles')
