import { useState, useCallback, useMemo, useRef, useEffect } from "react";

// ============================================================
// SCRYFALL API INTEGRATION (works when deployed on real server)
// Falls back to local DB if API unavailable
// ============================================================
async function scryfallSearch(query) {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch { return []; }
}

async function scryfallGetCard(name) {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name,
      oracle: data.oracle_text || "",
      cmc: data.cmc || 0,
      type: data.type_line || "",
      img: data.image_uris?.small || data.card_faces?.[0]?.image_uris?.small || null,
      colors: data.colors || [],
      set: data.set_name || "",
    };
  } catch { return null; }
}

// ============================================================
// LOCAL DATABASE: 120+ staples as fallback
// ============================================================
const CARD_DB=[
{n:"Sol Ring",o:"{T}: Add {C}{C}.",c:1,t:"Artifact"},
{n:"Mana Crypt",o:"At the beginning of your upkeep, flip a coin. If you lose the flip, Mana Crypt deals 3 damage to you. {T}: Add {C}{C}.",c:0,t:"Artifact"},
{n:"Mana Vault",o:"{T}: Add {C}{C}{C}. Mana Vault doesn't untap during your untap step. At the beginning of your upkeep, you may pay {4}. If you do, untap Mana Vault.",c:1,t:"Artifact"},
{n:"Chrome Mox",o:"Imprint — When Chrome Mox enters the battlefield, you may exile a nonartifact, nonland card from your hand. {T}: Add one mana of any of the exiled card's colors.",c:0,t:"Artifact"},
{n:"Mox Diamond",o:"If Mox Diamond would enter the battlefield, you may discard a land card instead. If you do, put Mox Diamond onto the battlefield. {T}: Add one mana of any color.",c:0,t:"Artifact"},
{n:"Arcane Signet",o:"{T}: Add one mana of any color in your commander's color identity.",c:2,t:"Artifact"},
{n:"Dockside Extortionist",o:"When Dockside Extortionist enters the battlefield, create a Treasure token for each artifact and enchantment your opponents control.",c:2,t:"Creature — Goblin Pirate"},
{n:"Birds of Paradise",o:"Flying. {T}: Add one mana of any color.",c:1,t:"Creature — Bird"},
{n:"Noble Hierarch",o:"Exalted. {T}: Add {G}, {W}, or {U}.",c:1,t:"Creature — Human Druid"},
{n:"Smothering Tithe",o:"Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token.",c:4,t:"Enchantment"},
{n:"Dark Ritual",o:"Add {B}{B}{B}.",c:1,t:"Instant"},
{n:"Lotus Petal",o:"{T}, Sacrifice Lotus Petal: Add one mana of any color.",c:0,t:"Artifact"},
{n:"Jeweled Lotus",o:"{T}, Sacrifice Jeweled Lotus: Add three mana of any one color. Spend this mana only to cast your commander.",c:0,t:"Artifact"},
{n:"Rhystic Study",o:"Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.",c:3,t:"Enchantment"},
{n:"Mystic Remora",o:"Cumulative upkeep {1}. Whenever an opponent casts a noncreature spell, you may draw a card unless that player pays {4}.",c:1,t:"Enchantment"},
{n:"Necropotence",o:"Skip your draw step. Whenever you discard a card, exile that card from your graveyard. Pay 1 life: Exile the top card of your library face down. Put that card into your hand at the beginning of your next end step.",c:3,t:"Enchantment"},
{n:"Phyrexian Arena",o:"At the beginning of your upkeep, you draw a card and you lose 1 life.",c:3,t:"Enchantment"},
{n:"Sylvan Library",o:"At the beginning of your draw step, you may draw two additional cards. If you do, choose two cards in your hand drawn this turn. For each of those cards, pay 4 life or put the card on top of your library.",c:2,t:"Enchantment"},
{n:"Champion of Dusk",o:"When Champion of Dusk enters the battlefield, you draw X cards and you lose X life, where X is the number of Vampires you control.",c:5,t:"Creature — Vampire"},
{n:"Welcoming Vampire",o:"Flying. Whenever one or more other creatures with power 2 or less enter the battlefield under your control, draw a card. This ability triggers only once each turn.",c:3,t:"Creature — Vampire"},
{n:"Dusk Legion Duelist",o:"Vigilance. Whenever one or more +1/+1 counters are put on this creature, draw a card. This ability triggers only once each turn.",c:2,t:"Creature — Vampire Soldier"},
{n:"Twilight Prophet",o:"Flying. Ascend. At the beginning of your upkeep, if you have the city's blessing, reveal the top card of your library and put it into your hand. Each opponent loses life equal to that card's mana value.",c:4,t:"Creature — Vampire Cleric"},
{n:"Ad Nauseam",o:"Reveal the top card of your library and put that card into your hand. You lose life equal to its mana value. You may repeat this process any number of times.",c:5,t:"Instant"},
{n:"Brainstorm",o:"Draw three cards, then put two cards from your hand on top of your library in any order.",c:1,t:"Instant"},
{n:"Ponder",o:"Look at the top three cards of your library, then put them back in any order. You may shuffle. Draw a card.",c:1,t:"Sorcery"},
{n:"Preordain",o:"Scry 2, then draw a card.",c:1,t:"Sorcery"},
{n:"Treasure Cruise",o:"Delve. Draw three cards.",c:8,t:"Sorcery"},
{n:"Demonic Tutor",o:"Search your library for a card, put that card into your hand, then shuffle.",c:2,t:"Sorcery"},
{n:"Vampiric Tutor",o:"Search your library for a card, then shuffle and put that card on top of it. You lose 2 life.",c:1,t:"Instant"},
{n:"Imperial Seal",o:"Search your library for a card, then shuffle and put that card on top of it. You lose 2 life.",c:1,t:"Sorcery"},
{n:"Enlightened Tutor",o:"Search your library for an artifact or enchantment card, reveal it, then shuffle and put it on top.",c:1,t:"Instant"},
{n:"Mystical Tutor",o:"Search your library for an instant or sorcery card, reveal it, then shuffle and put it on top.",c:1,t:"Instant"},
{n:"Demonic Consultation",o:"Choose a card name. Exile the top six cards of your library, then reveal cards from the top of your library until you reveal the named card. Put that card into your hand and exile all other cards revealed this way.",c:1,t:"Instant"},
{n:"Tainted Pact",o:"Exile the top card of your library. You may put that card into your hand unless it has the same name as another card exiled this way. Repeat this process until you put a card into your hand or you exile two cards with the same name.",c:2,t:"Instant"},
{n:"Swords to Plowshares",o:"Exile target creature. Its controller gains life equal to its power.",c:1,t:"Instant"},
{n:"Path to Exile",o:"Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle.",c:1,t:"Instant"},
{n:"Fatal Push",o:"Destroy target creature if it has mana value 2 or less. Revolt — Destroy that creature if it has mana value 4 or less instead if a permanent you controlled left the battlefield this turn.",c:1,t:"Instant"},
{n:"Terminate",o:"Destroy target creature. It can't be regenerated.",c:2,t:"Instant"},
{n:"Cyclonic Rift",o:"Return target nonland permanent you don't control to its owner's hand. Overload {6}{U}.",c:2,t:"Instant"},
{n:"Toxic Deluge",o:"As an additional cost to cast this spell, pay X life. All creatures get -X/-X until end of turn.",c:3,t:"Sorcery"},
{n:"Wrath of God",o:"Destroy all creatures. They can't be regenerated.",c:4,t:"Sorcery"},
{n:"Force of Will",o:"You may pay 1 life and exile a blue card from your hand rather than pay this spell's mana cost. Counter target spell.",c:5,t:"Instant"},
{n:"Counterspell",o:"Counter target spell.",c:2,t:"Instant"},
{n:"Swan Song",o:"Counter target enchantment, instant, or sorcery spell. Its controller creates a 2/2 blue Bird creature token with flying.",c:1,t:"Instant"},
{n:"Fierce Guardianship",o:"If you control a commander, you may cast this spell without paying its mana cost. Counter target noncreature spell.",c:3,t:"Instant"},
{n:"Deadly Rollick",o:"If you control a commander, you may cast this spell without paying its mana cost. Exile target creature.",c:4,t:"Instant"},
{n:"Thassa's Oracle",o:"When Thassa's Oracle enters the battlefield, look at the top X cards of your library, where X is your devotion to blue. Put up to one of them on top of your library and the rest on the bottom in a random order. If X is greater than or equal to the number of cards in your library, you win the game.",c:2,t:"Creature — Merfolk Wizard"},
{n:"Isochron Scepter",o:"Imprint — When Isochron Scepter enters the battlefield, you may exile an instant card with mana value 2 or less from your hand. {2}, {T}: You may copy the exiled card. If you do, you may cast the copy without paying its mana cost.",c:2,t:"Artifact"},
{n:"Dramatic Reversal",o:"Untap all nonland permanents you control.",c:2,t:"Instant"},
{n:"Splinter Twin",o:"Enchant creature. Enchanted creature has '{T}: Create a token that's a copy of this creature, except it has haste. Exile that token at the beginning of the next end step.'",c:4,t:"Enchantment — Aura"},
{n:"Deceiver Exarch",o:"Flash. When Deceiver Exarch enters the battlefield, choose one — Untap target permanent you control. Tap target permanent an opponent controls.",c:3,t:"Creature — Cleric"},
{n:"Exquisite Blood",o:"Whenever an opponent loses life, you gain that much life.",c:5,t:"Enchantment"},
{n:"Sanguine Bond",o:"Whenever you gain life, target opponent loses that much life.",c:5,t:"Enchantment"},
{n:"Vito, Thorn of the Dusk Rose",o:"Whenever you gain life, target opponent loses that much life. {3}{B}{B}: Creatures you control gain lifelink until end of turn.",c:3,t:"Legendary Creature — Vampire Cleric"},
{n:"Food Chain",o:"Exile a creature you control: Add X mana of any one color, where X is 1 plus the exiled creature's mana value. Spend this mana only to cast creature spells.",c:3,t:"Enchantment"},
{n:"Eternal Scourge",o:"You may cast Eternal Scourge from exile.",c:3,t:"Creature — Eldrazi Horror"},
{n:"Underworld Breach",o:"Each nonland card in your graveyard has escape. The escape cost is equal to the card's mana cost plus exile three other cards from your graveyard.",c:2,t:"Enchantment"},
{n:"Brain Freeze",o:"Target player mills three cards. Storm.",c:2,t:"Instant"},
{n:"Lion's Eye Diamond",o:"Discard your hand, Sacrifice Lion's Eye Diamond: Add three mana of any one color.",c:0,t:"Artifact"},
{n:"Heliod, Sun-Crowned",o:"Lifelink. Whenever you gain life, put a +1/+1 counter on target creature or enchantment you control.",c:3,t:"Legendary Enchantment Creature — God"},
{n:"Walking Ballista",o:"Walking Ballista enters the battlefield with X +1/+1 counters on it. {4}: Put a +1/+1 counter on Walking Ballista. Remove a +1/+1 counter from Walking Ballista: It deals 1 damage to any target.",c:0,t:"Artifact Creature — Construct"},
{n:"Painter's Servant",o:"As Painter's Servant enters the battlefield, choose a color. All cards that aren't on the battlefield, spells, and permanents are the chosen color in addition to their other colors.",c:2,t:"Artifact Creature — Scarecrow"},
{n:"Grindstone",o:"{3}, {T}: Target player mills two cards. If two cards that share a color were milled this way, repeat this process.",c:1,t:"Artifact"},
{n:"Knight of the Ebon Legion",o:"{2}{B}: Knight of the Ebon Legion gets +3/+3 and gains deathtouch until end of turn. At the beginning of your end step, if a player lost 4 or more life this turn, put a +1/+1 counter on Knight of the Ebon Legion.",c:1,t:"Creature — Vampire Knight"},
{n:"Cordial Vampire",o:"Whenever Cordial Vampire or another creature dies, put a +1/+1 counter on each Vampire you control.",c:2,t:"Creature — Vampire"},
{n:"Legion Lieutenant",o:"Other Vampires you control get +1/+1.",c:2,t:"Creature — Vampire Knight"},
{n:"Blood Artist",o:"Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",c:2,t:"Creature — Vampire"},
{n:"Stromkirk Captain",o:"First strike. Other Vampire creatures you control get +1/+1 and have first strike.",c:3,t:"Creature — Vampire Soldier"},
{n:"Vampire Nighthawk",o:"Flying. Deathtouch. Lifelink.",c:3,t:"Creature — Vampire Shaman"},
{n:"Drana, Liberator of Malakir",o:"Flying, first strike. Whenever Drana deals combat damage to a player, put a +1/+1 counter on each attacking creature you control.",c:3,t:"Legendary Creature — Vampire Ally"},
{n:"Bloodline Keeper",o:"Flying. {T}: Create a 2/2 black Vampire creature token with flying. {B}: Transform Bloodline Keeper. Activate only if you control five or more Vampires.",c:4,t:"Creature — Vampire"},
{n:"Elenda, the Dusk Rose",o:"Lifelink. Whenever another creature dies, put a +1/+1 counter on Elenda. When Elenda dies, create X 1/1 white Vampire creature tokens with lifelink, where X is Elenda's power.",c:4,t:"Legendary Creature — Vampire Knight"},
{n:"Edgar, Charmed Groom",o:"Other Vampires you control get +1/+1. When Edgar dies, return it to the battlefield transformed.",c:4,t:"Legendary Creature — Vampire Noble"},
{n:"Sanctum Seeker",o:"Whenever a Vampire you control attacks, each opponent loses 1 life and you gain 1 life.",c:4,t:"Creature — Vampire Knight"},
{n:"Sorin, Imperious Bloodlord",o:"+1: Target creature you control gains deathtouch and lifelink until end of turn. If it's a Vampire, put a +1/+1 counter on it. +1: You may sacrifice a Vampire. When you do, Sorin deals 3 damage to any target and you gain 3 life. −3: You may put a Vampire creature card from your hand onto the battlefield.",c:3,t:"Legendary Planeswalker — Sorin"},
{n:"Olivia Voldaren",o:"Flying. {1}{R}: Olivia deals 1 damage to another target creature. That creature becomes a Vampire. Put a +1/+1 counter on Olivia. {3}{B}{B}: Gain control of target Vampire.",c:4,t:"Legendary Creature — Vampire"},
{n:"Sheoldred, the Apocalypse",o:"Deathtouch. Whenever you draw a card, you gain 2 life. Whenever an opponent draws a card, that player loses 2 life.",c:4,t:"Legendary Creature — Phyrexian Praetor"},
{n:"The One Ring",o:"Indestructible. When The One Ring enters the battlefield, if you cast it, you gain protection from everything until your next turn. At the beginning of your upkeep, you lose 1 life for each burden counter on The One Ring. {T}: Put a burden counter on The One Ring, then draw a card for each burden counter.",c:4,t:"Legendary Artifact"},
{n:"Ragavan, Nimble Pilferer",o:"Whenever Ragavan deals combat damage to a player, create a Treasure token and exile the top card of that player's library. Until end of turn, you may cast that card. Dash {1}{R}.",c:1,t:"Legendary Creature — Monkey Pirate"},
{n:"Orcish Bowmasters",o:"Flash. When Orcish Bowmasters enters the battlefield and whenever an opponent draws a card except the first one they draw in each of their draw steps, amass Orcs 1 and the Army deals 1 damage to any target.",c:2,t:"Creature — Orc Archer"},
{n:"Esper Sentinel",o:"Whenever an opponent casts their first noncreature spell each turn, draw a card unless that player pays {X}, where X is Esper Sentinel's power.",c:1,t:"Creature — Human Soldier"},
{n:"Lightning Bolt",o:"Lightning Bolt deals 3 damage to any target.",c:1,t:"Instant"},
{n:"Thoughtseize",o:"Target player reveals their hand. You choose a nonland card from it. That player discards that card. You lose 2 life.",c:1,t:"Sorcery"},
{n:"Time Walk",o:"Take an extra turn after this one.",c:2,t:"Sorcery"},
{n:"Ancestral Recall",o:"Target player draws three cards.",c:1,t:"Instant"},
{n:"Black Lotus",o:"{T}, Sacrifice Black Lotus: Add three mana of any one color.",c:0,t:"Artifact"},
{n:"Phyrexian Obliterator",o:"Trample. Whenever a source deals damage to Phyrexian Obliterator, that source's controller sacrifices that many permanents.",c:4,t:"Creature — Phyrexian Horror"},
{n:"Pariah",o:"Enchant creature. All damage that would be dealt to you is dealt to enchanted creature instead.",c:3,t:"Enchantment — Aura"},
{n:"Teferi's Protection",o:"Until your next turn, your life total can't change and you gain protection from everything. Exile all permanents you control.",c:3,t:"Instant"},
{n:"Ancient Tomb",o:"{T}: Add {C}{C}. Ancient Tomb deals 2 damage to you.",c:0,t:"Land"},
{n:"Gaea's Cradle",o:"{T}: Add {G} for each creature you control.",c:0,t:"Land"},
{n:"Castle Locthwain",o:"{T}: Add {B}. {1}{B}{B}, {T}: Draw a card, then you lose life equal to the number of cards in your hand.",c:0,t:"Land"},
{n:"Urborg, Tomb of Yawgmoth",o:"Each land is a Swamp in addition to its other land types.",c:0,t:"Land"},
{n:"Cabal Coffers",o:"{2}, {T}: Add {B} for each Swamp you control.",c:0,t:"Land"},
{n:"Mavren Fein, Dusk Apostle",o:"Whenever one or more nontoken Vampires you control attack, create a 1/1 white Vampire creature token with lifelink.",c:3,t:"Legendary Creature — Vampire Cleric"},
{n:"Gifted Aetherborn",o:"Deathtouch. Lifelink.",c:2,t:"Creature — Aetherborn Vampire"},
{n:"Vampire of the Dire Moon",o:"Deathtouch. Lifelink.",c:1,t:"Creature — Vampire"},
{n:"Elenda, Saint of Dusk",o:"Flying, menace, lifelink, hexproof from instants. Whenever you sacrifice another permanent, you gain 2 life. If it's the second time, each opponent loses 2 life. If it's the third time, create a 4/3 Vampire Demon token with flying.",c:4,t:"Legendary Creature — Vampire Demon"},
{n:"Vito, Fanatic of Aclazotz",o:"Flying. Whenever you sacrifice another permanent, you gain 2 life. If it's the second time, each opponent loses 2 life. If it's the third time, create a 4/3 Vampire Demon token with flying.",c:4,t:"Legendary Creature — Vampire Demon"},
{n:"Craterhoof Behemoth",o:"Haste. When Craterhoof Behemoth enters the battlefield, creatures you control get +X/+X and gain trample until end of turn, where X is the number of creatures you control.",c:8,t:"Creature — Beast"},
{n:"Consecrated Sphinx",o:"Flying. Whenever an opponent draws a card, you may draw two cards.",c:6,t:"Creature — Sphinx"},
{n:"Atraxa, Grand Unifier",o:"Flying, vigilance, deathtouch, lifelink. When Atraxa enters the battlefield, reveal the top ten cards of your library. For each card type, you may put a card of that type from among the revealed cards into your hand.",c:7,t:"Legendary Creature — Phyrexian Angel"},
].map(c=>({name:c.n,oracle:c.o,cmc:c.c,type:c.t}));

// ============================================================
// COMBOS DATABASE
// ============================================================
const COMBOS=[
{cards:["Thassa's Oracle","Demonic Consultation"],name:"Thoracle",mult:3.0,desc:"Win: exile biblio + Oracle",tier:"S"},
{cards:["Thassa's Oracle","Tainted Pact"],name:"Thoracle Pact",mult:3.0,desc:"Win: exile biblio + Oracle",tier:"S"},
{cards:["Isochron Scepter","Dramatic Reversal"],name:"Dramatic Scepter",mult:2.5,desc:"Mana infini avec rocks",tier:"S"},
{cards:["Splinter Twin","Deceiver Exarch"],name:"Splinter Twin",mult:3.0,desc:"Tokens infinis haste",tier:"S"},
{cards:["Exquisite Blood","Sanguine Bond"],name:"Exquisite Bond",mult:2.5,desc:"Drain infini",tier:"A"},
{cards:["Exquisite Blood","Vito, Thorn of the Dusk Rose"],name:"Exquisite Vito",mult:2.5,desc:"Drain infini",tier:"A"},
{cards:["Food Chain","Eternal Scourge"],name:"Food Chain",mult:2.8,desc:"Mana créature infini",tier:"S"},
{cards:["Underworld Breach","Brain Freeze"],name:"Breach Freeze",mult:2.8,desc:"Storm mill infini",tier:"S"},
{cards:["Underworld Breach","Lion's Eye Diamond"],name:"Breach LED",mult:2.8,desc:"Mana + recursion infinie",tier:"S"},
{cards:["Painter's Servant","Grindstone"],name:"Painter Stone",mult:3.0,desc:"Mill instantané",tier:"S"},
{cards:["Heliod, Sun-Crowned","Walking Ballista"],name:"Heliod Ballista",mult:3.0,desc:"Dégâts infinis",tier:"S"},
{cards:["Phyrexian Obliterator","Pariah"],name:"Obliterator Lock",mult:2.0,desc:"Dégâts → sacrifice tout",tier:"A"},
{cards:["Blood Artist","Cordial Vampire"],name:"Aristocrats Engine",mult:1.3,desc:"Mort = drain + buff",tier:"B"},
{cards:["Elenda, the Dusk Rose","Blood Artist"],name:"Elenda Drain",mult:1.4,desc:"Elenda meurt → tokens → drain",tier:"B"},
{cards:["Dusk Legion Duelist","Cordial Vampire"],name:"Counter Draw",mult:1.3,desc:"+1/+1 → pioche",tier:"B"},
{cards:["Dusk Legion Duelist","Drana, Liberator of Malakir"],name:"Drana Draw",mult:1.2,desc:"Attaque → +1/+1 → pioche",tier:"B"},
{cards:["Sheoldred, the Apocalypse","The One Ring"],name:"Sheoldred Ring",mult:1.6,desc:"Pioche + gain de vie",tier:"A"},
{cards:["Sheoldred, the Apocalypse","Consecrated Sphinx"],name:"Sheoldred Sphinx",mult:1.5,desc:"Pioche massive + drain",tier:"A"},
{cards:["Urborg, Tomb of Yawgmoth","Cabal Coffers"],name:"Urborg Coffers",mult:1.8,desc:"Mana noir massif",tier:"A"},
{cards:["Sorin, Imperious Bloodlord","Bloodline Keeper"],name:"Sorin Cheat Keeper",mult:1.5,desc:"T3 Keeper gratuit",tier:"B"},
{cards:["Sorin, Imperious Bloodlord","Elenda, the Dusk Rose"],name:"Sorin Cheat Elenda",mult:1.5,desc:"T3 Elenda gratuit",tier:"B"},
{cards:["Necropotence","Ad Nauseam"],name:"Double Draw Engine",mult:1.8,desc:"Domination par CA",tier:"A"},
{cards:["Gaea's Cradle","Craterhoof Behemoth"],name:"Cradle Hoof",mult:1.5,desc:"Mana massif → OTK",tier:"A"},
{cards:["Mana Crypt","Sol Ring"],name:"Fast Mana Duo",mult:1.2,desc:"Accélération explosive T1",tier:"B"},
];

// ============================================================
// SCORING ENGINE
// ============================================================
const PRIMS=[
{p:/draw (\w+) cards?/gi,cat:"Draw",sc:(m)=>parseW(m[1])*4,l:(m)=>`Draw ${m[1]}`},
{p:/\bdraw a card\b/gi,cat:"Draw",sc:()=>4,l:()=>"Draw 1"},
{p:/\bdraw two additional/gi,cat:"Draw",sc:()=>8,l:()=>"Draw +2"},
{p:/search your library for a card,/gi,cat:"Tutor",sc:()=>7,l:()=>"Tutor (any)"},
{p:/search your library for an? \w+ card/gi,cat:"Tutor",sc:()=>5,l:()=>"Tutor (typed)"},
{p:/search your library for.*(basic land|land card)/gi,cat:"Ramp",sc:()=>3,l:()=>"Land tutor"},
{p:/scry (\d+)/gi,cat:"Filter",sc:(m)=>parseInt(m[1])*0.8,l:(m)=>`Scry ${m[1]}`},
{p:/\bdestroy all creatures\b/gi,cat:"Wipe",sc:()=>8,l:()=>"Board wipe"},
{p:/\bexile all/gi,cat:"Wipe",sc:()=>10,l:()=>"Mass exile"},
{p:/\bdestroy target creature\b/gi,cat:"Removal",sc:()=>4,l:()=>"Kill creature"},
{p:/\bexile target creature\b/gi,cat:"Removal",sc:()=>5,l:()=>"Exile creature"},
{p:/\bcounter target spell\b/gi,cat:"Counter",sc:()=>5,l:()=>"Counterspell"},
{p:/\bcounter target noncreature\b/gi,cat:"Counter",sc:()=>4,l:()=>"Counter (nc)"},
{p:/create a Treasure token/gi,cat:"Ramp",sc:()=>2,l:()=>"Treasure"},
{p:/create (\w+) .*tokens?/gi,cat:"Tokens",sc:(m)=>parseW(m[1])*2,l:(m)=>`${m[1]} token(s)`},
{p:/\badd \{.\}\{.\}\{.\}/gi,cat:"Ramp",sc:()=>6,l:()=>"Add 3+ mana"},
{p:/\badd \{.\}\{.\}/gi,cat:"Ramp",sc:()=>4,l:()=>"Add 2 mana"},
{p:/\badd \{.\}/gi,cat:"Ramp",sc:()=>2,l:()=>"Add 1 mana"},
{p:/add one mana of any color/gi,cat:"Ramp",sc:()=>2.5,l:()=>"Any color"},
{p:/add (\w+) mana of any/gi,cat:"Ramp",sc:(m)=>parseW(m[1])*2.5,l:(m)=>`Add ${m[1]} any`},
{p:/each opponent loses (\d+) life/gi,cat:"Drain",sc:(m)=>parseInt(m[1])*1.5,l:(m)=>`Opp -${m[1]}`},
{p:/target player loses (\d+) life and you gain/gi,cat:"Drain",sc:(m)=>parseInt(m[1])*2,l:(m)=>`Drain ${m[1]}`},
{p:/you gain (\d+) life/gi,cat:"Life",sc:(m)=>parseInt(m[1])*0.5,l:(m)=>`+${m[1]} life`},
{p:/deals? (\d+) damage to any target/gi,cat:"Damage",sc:(m)=>parseInt(m[1])*1.5,l:(m)=>`${m[1]} dmg`},
{p:/\bindestructible\b/gi,cat:"Protect",sc:()=>3,l:()=>"Indestructible"},
{p:/\bhexproof\b/gi,cat:"Protect",sc:()=>3,l:()=>"Hexproof"},
{p:/protection from everything/gi,cat:"Protect",sc:()=>8,l:()=>"Prot everything"},
{p:/\bflying\b/gi,cat:"Evasion",sc:()=>1.5,l:()=>"Flying"},
{p:/\bmenace\b/gi,cat:"Evasion",sc:()=>1,l:()=>"Menace"},
{p:/\btrample\b/gi,cat:"Evasion",sc:()=>1,l:()=>"Trample"},
{p:/can't be blocked/gi,cat:"Evasion",sc:()=>3,l:()=>"Unblockable"},
{p:/\bfirst strike\b/gi,cat:"Combat",sc:()=>1.5,l:()=>"First Strike"},
{p:/\bdouble strike\b/gi,cat:"Combat",sc:()=>4,l:()=>"Double Strike"},
{p:/\bdeathtouch\b/gi,cat:"Combat",sc:()=>2,l:()=>"Deathtouch"},
{p:/\blifelink\b/gi,cat:"Combat",sc:()=>2,l:()=>"Lifelink"},
{p:/\bvigilance\b/gi,cat:"Combat",sc:()=>1,l:()=>"Vigilance"},
{p:/\bhaste\b/gi,cat:"Combat",sc:()=>1.5,l:()=>"Haste"},
{p:/\bflash\b/gi,cat:"Combat",sc:()=>2,l:()=>"Flash"},
{p:/without paying (its|their) mana cost/gi,cat:"Free",sc:()=>8,l:()=>"Free cast"},
{p:/you may cast this spell without paying/gi,cat:"Free",sc:()=>6,l:()=>"Free (cond.)"},
{p:/\btake an extra turn\b/gi,cat:"Extra",sc:()=>20,l:()=>"EXTRA TURN"},
{p:/put a \+1\/\+1 counter on each/gi,cat:"+1/+1",sc:()=>4,l:()=>"+1/+1 all"},
{p:/put (\w+) \+1\/\+1 counter/gi,cat:"+1/+1",sc:(m)=>parseW(m[1])*1.5,l:(m)=>`+1/+1 ×${m[1]}`},
{p:/other .* you control get \+(\d+)\/\+(\d+)/gi,cat:"Lord",sc:(m)=>(parseInt(m[1])+parseInt(m[2]))*2,l:(m)=>`Lord +${m[1]}/+${m[2]}`},
{p:/creatures you control get \+/gi,cat:"Anthem",sc:()=>4,l:()=>"Anthem"},
{p:/return.*from.*graveyard.*to the battlefield/gi,cat:"Recursion",sc:()=>5,l:()=>"Reanimate"},
{p:/whenever.*(dies|leaves the battlefield)/gi,cat:"Death",sc:()=>2,l:()=>"Death trigger"},
{p:/sacrifice/gi,cat:"Sacrifice",sc:()=>1,l:()=>"Sacrifice"},
{p:/you win the game/gi,cat:"Win",sc:()=>15,l:()=>"WIN THE GAME"},
{p:/\bdelve\b/gi,cat:"Reduce",sc:()=>4,l:()=>"Delve"},
{p:/\bstorm\b/gi,cat:"Storm",sc:()=>6,l:()=>"Storm"},
{p:/\bcascade\b/gi,cat:"Cascade",sc:()=>5,l:()=>"Cascade"},
{p:/whenever an opponent (draws|casts)/gi,cat:"Tax",sc:()=>3,l:()=>"Opponent tax"},
{p:/cumulative upkeep/gi,cat:"Downside",sc:()=>-2,l:()=>"Cumul. upkeep"},
];

function parseW(w){const m={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,ten:10,x:3};return parseInt(w)||m[w?.toLowerCase()]||1;}

function scoreCard(oracle,cmc){
  const dets=[];let raw=0;
  for(const pr of PRIMS){pr.p.lastIndex=0;let m;while((m=pr.p.exec(oracle))!==null){const s=pr.sc(m);dets.push({cat:pr.cat,label:pr.l(m),score:Math.round(s*10)/10});raw+=s;if(!pr.p.global)break;}pr.p.lastIndex=0;}
  const cmcM=cmc<=0?2.5:cmc<=1?2.0:cmc<=2?1.5:cmc<=3?1.2:cmc<=4?1.0:cmc<=5?0.9:cmc<=6?0.8:0.7;
  return{dets,raw:Math.round(raw*10)/10,cmcM,pts:Math.max(0,Math.round(raw*cmcM/3))};
}

function getTags(o){const tags=[];const m={sacrifice:[/sacrifice/gi],tokens:[/create.*token/gi],counters:[/\+1\/\+1/gi],lifegain:[/gain.*life|lifelink/gi],graveyard:[/graveyard/gi],spells:[/instant|sorcery|whenever.*cast/gi],tribal:[/vampire|elf|goblin|zombie|angel|demon|dragon/gi]};for(const[t,ps]of Object.entries(m)){for(const p of ps){p.lastIndex=0;if(p.test(o)){tags.push(t);break;}p.lastIndex=0;}}return[...new Set(tags)];}

function fuzzy(q,n){const ql=q.toLowerCase(),nl=n.toLowerCase();if(nl.includes(ql))return 2;let qi=0;for(let ni=0;ni<nl.length&&qi<ql.length;ni++)if(nl[ni]===ql[qi])qi++;return qi>=ql.length*.7?1:0;}

const CC={"Draw":"#3b82f6","Tutor":"#8b5cf6","Ramp":"#22c55e","Filter":"#06b6d4","Wipe":"#dc2626","Removal":"#ef4444","Counter":"#6366f1","Tokens":"#f59e0b","Drain":"#a855f7","Life":"#ec4899","Damage":"#f97316","Protect":"#06b6d4","Evasion":"#8b5cf6","Combat":"#d97706","+1/+1":"#84cc16","Lord":"#eab308","Anthem":"#eab308","Recursion":"#6366f1","Free":"#7c3aed","Extra":"#dc2626","Win":"#dc2626","Death":"#9333ea","Sacrifice":"#a21caf","Reduce":"#059669","Storm":"#b91c1c","Cascade":"#7c3aed","Tax":"#f59e0b","Downside":"#6b7280"};
const TC={"S":"#dc2626","A":"#f59e0b","B":"#3b82f6"};

export default function App(){
  const[deck,setDeck]=useState([]);
  const[cmdName,setCmdName]=useState("Vito, Fanatic of Aclazotz");
  const[cmdOracle,setCmdOracle]=useState("Flying. Whenever you sacrifice another permanent, you gain 2 life. If it's the second time, each opponent loses 2 life. If it's the third time, create a 4/3 Vampire Demon token with flying.");
  const[search,setSearch]=useState("");
  const[localResults,setLocalResults]=useState([]);
  const[apiResults,setApiResults]=useState([]);
  const[loading,setLoading]=useState(false);
  const[sel,setSel]=useState(null);
  const[tab,setTab]=useState("deck");
  const searchTimeout=useRef(null);

  const cmdTags=useMemo(()=>getTags(cmdOracle),[cmdOracle]);

  // Search: local first, then Scryfall API with debounce
  const doSearch=useCallback((q)=>{
    setSearch(q);
    if(q.length<2){setLocalResults([]);setApiResults([]);return;}
    // Local instant
    const loc=CARD_DB.filter(c=>fuzzy(q,c.name)).sort((a,b)=>fuzzy(q,b.name)-fuzzy(q,a.name)).slice(0,5);
    setLocalResults(loc);
    // API debounced
    clearTimeout(searchTimeout.current);
    searchTimeout.current=setTimeout(async()=>{
      setLoading(true);
      const names=await scryfallSearch(q);
      const filtered=names.filter(n=>!loc.some(l=>l.name.toLowerCase()===n.toLowerCase())).slice(0,5);
      setApiResults(filtered);
      setLoading(false);
    },300);
  },[]);

  const addFromApi=useCallback(async(name)=>{
    setLoading(true);
    const card=await scryfallGetCard(name);
    if(card){setDeck(prev=>[...prev,card]);}
    setSearch("");setLocalResults([]);setApiResults([]);setLoading(false);
  },[]);

  const addLocal=useCallback((card)=>{setDeck(prev=>[...prev,card]);setSearch("");setLocalResults([]);setApiResults([]);},[]);
  const removeCard=useCallback((i)=>{setDeck(prev=>prev.filter((_,j)=>j!==i));if(sel===i)setSel(null);},[sel]);

  const scored=useMemo(()=>{
    const names=deck.map(c=>c.name);
    const found=COMBOS.filter(co=>co.cards.every(cn=>names.some(dn=>dn.toLowerCase()===cn.toLowerCase())));
    return deck.map(card=>{
      const sc=scoreCard(card.oracle,card.cmc);
      const cTags=getTags(card.oracle);
      const overlap=cmdTags.filter(t=>cTags.includes(t));
      const synM=1+overlap.length*.15;
      const myC=found.filter(co=>co.cards.some(cn=>cn.toLowerCase()===card.name.toLowerCase()));
      const coM=myC.length>0?Math.max(...myC.map(c=>c.mult)):1;
      const final=Math.max(0,Math.round(sc.pts*synM*coM));
      return{...card,sc,cTags,overlap,synM:Math.round(synM*100)/100,myC,coM,final};
    });
  },[deck,cmdTags]);

  const allCombos=useMemo(()=>{const n=deck.map(c=>c.name.toLowerCase());return COMBOS.filter(co=>co.cards.every(cn=>n.includes(cn.toLowerCase())));},[deck]);
  const totalPts=scored.reduce((s,c)=>s+c.final,0);
  const budget=100;

  return(<div style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",background:"#080a0f",color:"#c0c8d8",minHeight:"100vh"}}>
    <div style={{background:"linear-gradient(135deg,#0c1018,#101828,#0c1018)",padding:"20px 16px",borderBottom:"1px solid #1a2538"}}>
      <div style={{display:"flex",alignItems:"baseline",gap:"4px"}}>
        <span style={{fontSize:"22px",fontWeight:"800",color:"#e0e8f0"}}>aeon</span>
        <span style={{fontSize:"22px",color:"#f59e0b"}}>_</span>
        <span style={{fontSize:"22px",fontWeight:"800",color:"#3b82f6"}}>scorer</span>
        <span style={{fontSize:"13px",color:"#22c55e",marginLeft:"4px"}}>v2.0</span>
      </div>
      <p style={{fontSize:"10px",color:"#3a4a5a",margin:"4px 0 0"}}>{CARD_DB.length} cartes locales • {COMBOS.length} combos • Scryfall API live • 3 couches</p>
    </div>

    <div style={{display:"flex",background:"#0a0d14",borderBottom:"1px solid #141c2a"}}>
      {[{id:"deck",l:`Deck (${deck.length})`},{id:"combos",l:`Combos (${allCombos.length})`},{id:"browse",l:"Explorer"},{id:"how",l:"Algo"}].map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 4px",border:"none",cursor:"pointer",background:tab===t.id?"#0e1420":"transparent",color:tab===t.id?"#3b82f6":"#3a4a5a",fontSize:"11px",fontWeight:tab===t.id?"700":"400",borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent",fontFamily:"inherit"}}>{t.l}</button>
      ))}
    </div>

    <div style={{padding:"14px 12px",maxWidth:"700px",margin:"0 auto"}}>
      {/* Commander */}
      <div style={{background:"#0c1018",border:"1px solid #1a2538",borderRadius:"6px",padding:"12px",marginBottom:"10px"}}>
        <div style={{fontSize:"9px",color:"#3b82f6",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"6px"}}>⚔️ Commandant</div>
        <input value={cmdName} onChange={e=>setCmdName(e.target.value)} style={{width:"100%",padding:"6px 8px",background:"#141c2a",border:"1px solid #1a2538",borderRadius:"4px",color:"#e0e8f0",fontSize:"12px",fontFamily:"inherit",boxSizing:"border-box",marginBottom:"4px"}}/>
        <textarea value={cmdOracle} onChange={e=>setCmdOracle(e.target.value)} rows={2} style={{width:"100%",padding:"6px 8px",background:"#141c2a",border:"1px solid #1a2538",borderRadius:"4px",color:"#8a9aaa",fontSize:"10px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:"3px",marginTop:"4px",flexWrap:"wrap"}}>
          {cmdTags.map(t=><span key={t} style={{fontSize:"8px",padding:"1px 5px",borderRadius:"2px",background:"#141c2a",color:"#3b82f6",border:"1px solid #1a2a44"}}>{t}</span>)}
        </div>
      </div>

      {/* Budget */}
      <div style={{background:"#0c1018",border:`1px solid ${totalPts>budget?"#5c1a1a":"#1a2538"}`,borderRadius:"6px",padding:"10px 12px",marginBottom:"10px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
          <span style={{fontSize:"10px",color:"#4a6a8a"}}>BUDGET</span>
          <span style={{fontSize:"18px",fontWeight:"700",color:totalPts>budget?"#ef4444":"#22c55e"}}>{totalPts}<span style={{fontSize:"11px",color:"#3a4a5a"}}>/{budget}</span></span>
        </div>
        <div style={{height:"5px",background:"#141c2a",borderRadius:"3px",overflow:"hidden"}}>
          <div style={{width:`${Math.min(100,totalPts/budget*100)}%`,height:"100%",background:totalPts>budget?"#ef4444":totalPts>80?"#f59e0b":"#22c55e",borderRadius:"3px",transition:"width 0.3s"}}/>
        </div>
      </div>

      {/* Search */}
      <div style={{position:"relative",marginBottom:"12px"}}>
        <input value={search} onChange={e=>doSearch(e.target.value)} placeholder={`🔍 Rechercher (base locale + Scryfall API)...`} style={{width:"100%",padding:"8px 10px",background:"#0c1018",border:"1px solid #1a2538",borderRadius:"6px",color:"#e0e8f0",fontSize:"12px",fontFamily:"inherit",boxSizing:"border-box"}}/>
        {(localResults.length>0||apiResults.length>0||loading)&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#0e1420",border:"1px solid #1a2538",borderRadius:"0 0 6px 6px",maxHeight:"240px",overflowY:"auto"}}>
          {localResults.map((r,i)=><div key={`l${i}`} onClick={()=>addLocal(r)} style={{padding:"6px 10px",cursor:"pointer",borderBottom:"1px solid #141c2a",fontSize:"12px",display:"flex",justifyContent:"space-between"}} onMouseOver={e=>e.currentTarget.style.background="#141c2a"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
            <span style={{color:"#e0e8f0"}}>{r.name}</span>
            <span style={{color:"#22c55e",fontSize:"9px"}}>LOCAL</span>
          </div>)}
          {apiResults.length>0&&<div style={{padding:"3px 10px",fontSize:"8px",color:"#3a4a5a",borderBottom:"1px solid #141c2a"}}>— Scryfall API —</div>}
          {apiResults.map((name,i)=><div key={`a${i}`} onClick={()=>addFromApi(name)} style={{padding:"6px 10px",cursor:"pointer",borderBottom:"1px solid #141c2a",fontSize:"12px",display:"flex",justifyContent:"space-between"}} onMouseOver={e=>e.currentTarget.style.background="#141c2a"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
            <span style={{color:"#c0c8d8"}}>{name}</span>
            <span style={{color:"#f59e0b",fontSize:"9px"}}>API</span>
          </div>)}
          {loading&&<div style={{padding:"8px 10px",fontSize:"10px",color:"#3a4a5a",textAlign:"center"}}>Chargement Scryfall...</div>}
        </div>}
      </div>

      {/* DECK TAB */}
      {tab==="deck"&&<div>
        {scored.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#2a3a4a",fontSize:"12px"}}>Recherche des cartes ci-dessus pour construire ton deck et voir le scoring en temps réel.</div>}
        {scored.sort((a,b)=>b.final-a.final).map((card,idx)=><div key={idx} style={{background:sel===idx?"#0e1420":"#0c1018",border:`1px solid ${sel===idx?"#253550":"#141c2a"}`,borderRadius:"6px",padding:"10px 12px",marginBottom:"4px",cursor:"pointer"}}>
          <div onClick={()=>setSel(sel===idx?null:idx)} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"5px",flexWrap:"wrap"}}>
                <span style={{fontSize:"12px",fontWeight:"600",color:"#e0e8f0"}}>{card.name}</span>
                <span style={{fontSize:"8px",color:"#3a4a5a",background:"#141c2a",padding:"1px 4px",borderRadius:"2px"}}>CMC {card.cmc}</span>
                {card.coM>1&&<span style={{fontSize:"8px",color:"#ef4444",background:"#1a0808",padding:"1px 4px",borderRadius:"2px",fontWeight:"700"}}>COMBO ×{card.coM}</span>}
                {card.synM>1&&<span style={{fontSize:"8px",color:"#3b82f6",background:"#080e1a",padding:"1px 4px",borderRadius:"2px"}}>CMD +{Math.round((card.synM-1)*100)}%</span>}
              </div>
              <div style={{fontSize:"9px",color:"#3a4a5a",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                raw:{card.sc.raw} × cmc:{card.sc.cmcM} = {card.sc.pts}pts {card.synM>1?`× cmd:${card.synM} `:""}{card.coM>1?`× combo:${card.coM}`:""} → <strong style={{color:card.final>=10?"#ef4444":card.final>=5?"#f59e0b":"#22c55e"}}>{card.final}</strong>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
              <span style={{fontSize:"20px",fontWeight:"700",color:card.final>=10?"#ef4444":card.final>=5?"#f59e0b":card.final>=2?"#3b82f6":"#22c55e"}}>{card.final}</span>
              <button onClick={e=>{e.stopPropagation();removeCard(idx);}} style={{background:"none",border:"none",color:"#2a2020",cursor:"pointer",fontSize:"12px"}}>✕</button>
            </div>
          </div>
          {sel===idx&&<div style={{marginTop:"8px",paddingTop:"8px",borderTop:"1px solid #141c2a"}}>
            <div style={{fontSize:"9px",color:"#4a5a6a",marginBottom:"6px",lineHeight:1.5}}>{card.oracle}</div>
            {card.sc.dets.map((d,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:"4px",padding:"1px 0"}}>
              <span style={{fontSize:"7px",padding:"1px 3px",borderRadius:"2px",background:(CC[d.cat]||"#666")+"18",color:CC[d.cat]||"#666",whiteSpace:"nowrap"}}>{d.cat}</span>
              <span style={{fontSize:"9px",color:"#6a7a8a",flex:1}}>{d.label}</span>
              <span style={{fontSize:"9px",color:"#f59e0b",fontWeight:"600"}}>+{d.score}</span>
            </div>)}
            {card.overlap?.length>0&&<div style={{fontSize:"9px",color:"#3b82f6",marginTop:"4px"}}>Synergie cmd: {card.overlap.join(", ")}</div>}
            {card.myC?.map((co,k)=><div key={k} style={{fontSize:"9px",color:"#ef4444",marginTop:"2px"}}>⚡ {co.name}: {co.desc} (×{co.mult})</div>)}
          </div>}
        </div>)}
      </div>}

      {/* COMBOS TAB */}
      {tab==="combos"&&<div>
        {allCombos.length===0&&<div style={{textAlign:"center",padding:"30px",color:"#2a3a4a",fontSize:"12px"}}>Aucun combo détecté dans le deck actuel.</div>}
        {allCombos.map((co,i)=><div key={i} style={{background:"#0c1018",border:"1px solid #1a2538",borderRadius:"6px",padding:"12px",marginBottom:"6px",borderLeft:`3px solid ${TC[co.tier]}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><div><span style={{fontSize:"13px",fontWeight:"600",color:"#e0e8f0"}}>{co.name}</span><span style={{fontSize:"9px",color:TC[co.tier],marginLeft:"6px",fontWeight:"700"}}>Tier {co.tier}</span></div><span style={{fontSize:"14px",fontWeight:"700",color:TC[co.tier]}}>×{co.mult}</span></div>
          <div style={{fontSize:"10px",color:"#6a7a8a",marginTop:"4px"}}>{co.cards.join(" + ")}</div>
          <div style={{fontSize:"10px",color:"#4a5a6a",marginTop:"2px"}}>{co.desc}</div>
        </div>)}
        <div style={{marginTop:"16px",fontSize:"9px",color:"#2a3a4a"}}>{COMBOS.length} combos en base totale</div>
      </div>}

      {/* BROWSE TAB */}
      {tab==="browse"&&<div>
        <div style={{fontSize:"10px",color:"#3a4a5a",marginBottom:"8px"}}>Base locale: {CARD_DB.length} cartes. Utilise la recherche pour accéder aux 25000+ cartes via Scryfall.</div>
        {["Artifact","Creature","Enchantment","Instant","Sorcery","Planeswalker","Land"].map(type=>{
          const cards=CARD_DB.filter(c=>c.type.includes(type));
          if(!cards.length)return null;
          return<div key={type} style={{marginBottom:"10px"}}>
            <div style={{fontSize:"9px",color:"#4a6a8a",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px",borderBottom:"1px solid #141c2a",paddingBottom:"3px"}}>{type} ({cards.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"3px"}}>{cards.map((c,i)=><button key={i} onClick={()=>addLocal(c)} title={c.oracle} style={{padding:"2px 6px",background:"#0e1420",border:"1px solid #141c2a",borderRadius:"3px",color:"#6a8aaa",fontSize:"9px",cursor:"pointer",fontFamily:"inherit"}}>{c.name}</button>)}</div>
          </div>;
        })}
      </div>}

      {/* HOW TAB */}
      {tab==="how"&&<div style={{fontSize:"11px",color:"#6a7a8a",lineHeight:1.7}}>
        <h3 style={{color:"#3b82f6",fontSize:"13px",margin:"0 0 6px"}}>Couche 1 — Intrinsèque ({PRIMS.length} patterns)</h3>
        <p style={{margin:"0 0 10px"}}>Regex parse le texte Oracle. Chaque primitive donne des points bruts. Multiplicateur CMC: 0=×2.5, 1=×2.0, 2=×1.5, 3=×1.2, 4=×1.0, 5+=×0.7-0.9. Division /3.</p>
        <h3 style={{color:"#ef4444",fontSize:"13px",margin:"0 0 6px"}}>Couche 2 — Combos ({COMBOS.length} en base)</h3>
        <p style={{margin:"0 0 10px"}}>Quand 2+ cartes d'un combo connu sont dans le deck → multiplicateur ×1.2 (synergie) à ×3.0 (win infini). Tiers S/A/B.</p>
        <h3 style={{color:"#22c55e",fontSize:"13px",margin:"0 0 6px"}}>Couche 3 — Commandant</h3>
        <p style={{margin:"0 0 10px"}}>Tags du commandant vs tags de chaque carte. +15% par tag partagé (sacrifice, tokens, counters, lifegain, tribal...).</p>
        <div style={{background:"#0e1420",borderRadius:"6px",padding:"10px",fontFamily:"monospace",fontSize:"11px",color:"#f59e0b",margin:"10px 0"}}>
          pts = floor( rawScore × cmcMult / 3 × cmdSynergy × comboMult )
        </div>
        <h3 style={{color:"#8b5cf6",fontSize:"13px",margin:"0 0 6px"}}>API Scryfall</h3>
        <p style={{margin:0}}>La recherche interroge d'abord la base locale ({CARD_DB.length} cartes), puis l'API Scryfall pour accéder aux 25000+ cartes de Magic. Le texte Oracle est récupéré automatiquement pour le scoring.</p>
      </div>}
    </div>
  </div>);
}
