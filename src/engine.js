// ============================================================
// LAYER 1: INTRINSIC SCORING — 60+ regex patterns
// ============================================================
const PRIMS = [
  // Card Advantage
  {p:/draw (\w+) cards?/gi,cat:"Draw",sc:m=>pw(m[1])*4,l:m=>`Draw ${m[1]}`},
  {p:/\bdraw a card\b/gi,cat:"Draw",sc:()=>4,l:()=>"Draw 1"},
  {p:/\bdraw two additional/gi,cat:"Draw",sc:()=>8,l:()=>"Draw +2"},
  {p:/you may draw two cards/gi,cat:"Draw",sc:()=>6,l:()=>"May draw 2"},
  {p:/look at the top (\w+) cards.*put.*into your hand/gi,cat:"Draw",sc:m=>pw(m[1])*1.5,l:m=>`Filter top ${m[1]}`},
  {p:/reveal the top.*put.*into your hand/gi,cat:"Draw",sc:()=>3,l:()=>"Reveal→hand"},
  // Tutors
  {p:/search your library for a card,/gi,cat:"Tutor",sc:()=>7,l:()=>"Tutor (any)"},
  {p:/search your library for an? (\w+) card/gi,cat:"Tutor",sc:()=>5,l:m=>`Tutor (${m[1]})`},
  {p:/search your library for.*(basic land|land card)/gi,cat:"Ramp",sc:()=>3,l:()=>"Land tutor"},
  // Filter
  {p:/scry (\d+)/gi,cat:"Filter",sc:m=>parseInt(m[1])*.8,l:m=>`Scry ${m[1]}`},
  {p:/surveil (\d+)/gi,cat:"Filter",sc:m=>parseInt(m[1])*1.2,l:m=>`Surveil ${m[1]}`},
  // Board Wipes
  {p:/destroy all creatures/gi,cat:"Wipe",sc:()=>8,l:()=>"Board wipe"},
  {p:/exile all (creatures|permanents|nonland)/gi,cat:"Wipe",sc:()=>10,l:m=>`Mass exile ${m[1]}`},
  {p:/all creatures get -(\d+)\/-(\d+)/gi,cat:"Wipe",sc:m=>(parseInt(m[1])+parseInt(m[2]))*1.2,l:m=>`-${m[1]}/-${m[2]} all`},
  // Targeted Removal
  {p:/destroy target (creature|permanent|planeswalker|artifact|enchantment)/gi,cat:"Removal",sc:()=>4,l:m=>`Kill ${m[1]}`},
  {p:/exile target (creature|permanent|planeswalker)/gi,cat:"Removal",sc:()=>5,l:m=>`Exile ${m[1]}`},
  {p:/target creature gets -(\d+)\/-(\d+)/gi,cat:"Removal",sc:m=>Math.ceil((parseInt(m[1])+parseInt(m[2]))*.6),l:m=>`-${m[1]}/-${m[2]}`},
  {p:/return target.*to its owner's hand/gi,cat:"Removal",sc:()=>3,l:()=>"Bounce"},
  // Counterspells
  {p:/counter target spell/gi,cat:"Counter",sc:()=>5,l:()=>"Counter spell"},
  {p:/counter target noncreature/gi,cat:"Counter",sc:()=>4,l:()=>"Counter (nc)"},
  {p:/counter target creature/gi,cat:"Counter",sc:()=>3.5,l:()=>"Counter creature"},
  // Ramp / Mana
  {p:/create a Treasure token/gi,cat:"Ramp",sc:()=>2,l:()=>"Treasure"},
  {p:/create (\w+) Treasure tokens/gi,cat:"Ramp",sc:m=>pw(m[1])*2,l:m=>`${m[1]} Treasures`},
  {p:/\badd \{.\}\{.\}\{.\}/gi,cat:"Ramp",sc:()=>6,l:()=>"Add 3 mana"},
  {p:/\badd \{.\}\{.\}/gi,cat:"Ramp",sc:()=>4,l:()=>"Add 2 mana"},
  {p:/\badd \{.\}/gi,cat:"Ramp",sc:()=>2,l:()=>"Add 1 mana"},
  {p:/add one mana of any color/gi,cat:"Ramp",sc:()=>2.5,l:()=>"Any color"},
  {p:/add three mana of any/gi,cat:"Ramp",sc:()=>7,l:()=>"Add 3 any"},
  // Tokens
  {p:/create (\w+) .*creature tokens?/gi,cat:"Tokens",sc:m=>pw(m[1])*2.5,l:m=>`${m[1]} creature token(s)`},
  {p:/create a token that's a copy/gi,cat:"Tokens",sc:()=>6,l:()=>"Clone token"},
  // Drain / Life
  {p:/each opponent loses (\d+) life/gi,cat:"Drain",sc:m=>parseInt(m[1])*1.5,l:m=>`Opp -${m[1]} life`},
  {p:/target player loses (\d+) life and you gain/gi,cat:"Drain",sc:m=>parseInt(m[1])*2,l:m=>`Drain ${m[1]}`},
  {p:/whenever you gain life.*loses that much/gi,cat:"Drain",sc:()=>6,l:()=>"Lifegain→drain"},
  {p:/whenever an opponent loses life.*you gain/gi,cat:"Drain",sc:()=>5,l:()=>"Lifeloss→gain"},
  {p:/you gain (\d+) life/gi,cat:"Life",sc:m=>parseInt(m[1])*.5,l:m=>`+${m[1]} life`},
  // Damage
  {p:/deals? (\d+) damage to any target/gi,cat:"Damage",sc:m=>parseInt(m[1])*1.5,l:m=>`${m[1]} dmg any`},
  {p:/deals? (\d+) damage to target creature/gi,cat:"Damage",sc:m=>parseInt(m[1])*1,l:m=>`${m[1]} dmg creature`},
  // Protection
  {p:/\bindestructible\b/gi,cat:"Protect",sc:()=>3,l:()=>"Indestructible"},
  {p:/\bhexproof\b/gi,cat:"Protect",sc:()=>3,l:()=>"Hexproof"},
  {p:/\bshroud\b/gi,cat:"Protect",sc:()=>3,l:()=>"Shroud"},
  {p:/\bward\b/gi,cat:"Protect",sc:()=>2,l:()=>"Ward"},
  {p:/protection from everything/gi,cat:"Protect",sc:()=>8,l:()=>"Prot everything"},
  {p:/protection from/gi,cat:"Protect",sc:()=>2,l:()=>"Protection"},
  // Evasion
  {p:/\bflying\b/gi,cat:"Evasion",sc:()=>1.5,l:()=>"Flying"},
  {p:/\bmenace\b/gi,cat:"Evasion",sc:()=>1,l:()=>"Menace"},
  {p:/\btrample\b/gi,cat:"Evasion",sc:()=>1,l:()=>"Trample"},
  {p:/can't be blocked/gi,cat:"Evasion",sc:()=>3,l:()=>"Unblockable"},
  {p:/\bshadow\b/gi,cat:"Evasion",sc:()=>2,l:()=>"Shadow"},
  // Combat
  {p:/\bfirst strike\b/gi,cat:"Combat",sc:()=>1.5,l:()=>"First Strike"},
  {p:/\bdouble strike\b/gi,cat:"Combat",sc:()=>4,l:()=>"Double Strike"},
  {p:/\bdeathtouch\b/gi,cat:"Combat",sc:()=>2,l:()=>"Deathtouch"},
  {p:/\blifelink\b/gi,cat:"Combat",sc:()=>2,l:()=>"Lifelink"},
  {p:/\bvigilance\b/gi,cat:"Combat",sc:()=>1,l:()=>"Vigilance"},
  {p:/\bhaste\b/gi,cat:"Combat",sc:()=>1.5,l:()=>"Haste"},
  {p:/\bflash\b/gi,cat:"Combat",sc:()=>2,l:()=>"Flash"},
  {p:/\breach\b/gi,cat:"Combat",sc:()=>1,l:()=>"Reach"},
  // Free cast / Cost reduction
  {p:/without paying (its|their) mana cost/gi,cat:"Free",sc:()=>8,l:()=>"Free cast"},
  {p:/you may cast this spell without paying/gi,cat:"Free",sc:()=>6,l:()=>"Free (cond.)"},
  {p:/costs? \{?\d+\}? less to cast/gi,cat:"Reduce",sc:()=>3,l:()=>"Cost reduce"},
  {p:/\bdelve\b/gi,cat:"Reduce",sc:()=>4,l:()=>"Delve"},
  {p:/\bconvoke\b/gi,cat:"Reduce",sc:()=>2,l:()=>"Convoke"},
  // Broken mechanics
  {p:/\btake an extra turn\b/gi,cat:"Extra Turn",sc:()=>20,l:()=>"EXTRA TURN"},
  {p:/\badditional combat phase/gi,cat:"Extra Combat",sc:()=>6,l:()=>"Extra combat"},
  {p:/you win the game/gi,cat:"Win Con",sc:()=>15,l:()=>"WIN THE GAME"},
  {p:/\bstorm\b/gi,cat:"Storm",sc:()=>6,l:()=>"Storm"},
  {p:/\bcascade\b/gi,cat:"Cascade",sc:()=>5,l:()=>"Cascade"},
  // Lords / Anthems
  {p:/other (vampires?|creatures?|elves?|goblins?|zombies?|angels?|knights?).* you control get \+(\d+)\/\+(\d+)/gi,cat:"Lord",sc:m=>(parseInt(m[2])+parseInt(m[3]))*2,l:m=>`Lord +${m[2]}/+${m[3]}`},
  {p:/creatures you control get \+(\d+)\/\+(\d+)/gi,cat:"Anthem",sc:m=>(parseInt(m[1])+parseInt(m[2]))*2,l:m=>`Anthem +${m[1]}/+${m[2]}`},
  // +1/+1 Counters
  {p:/put a \+1\/\+1 counter on each/gi,cat:"+1/+1",sc:()=>4,l:()=>"+1/+1 on all"},
  {p:/put (\w+) \+1\/\+1 counter/gi,cat:"+1/+1",sc:m=>pw(m[1])*1.5,l:m=>`+1/+1 ×${m[1]}`},
  {p:/proliferate/gi,cat:"+1/+1",sc:()=>3,l:()=>"Proliferate"},
  // Recursion
  {p:/return.*from.*graveyard.*to the battlefield/gi,cat:"Recursion",sc:()=>5,l:()=>"Reanimate"},
  {p:/return.*from your graveyard to your hand/gi,cat:"Recursion",sc:()=>3,l:()=>"Graveyard→hand"},
  // Death / Sacrifice triggers
  {p:/whenever.*dies/gi,cat:"Death",sc:()=>2,l:()=>"Death trigger"},
  {p:/whenever you sacrifice/gi,cat:"Sacrifice",sc:()=>2,l:()=>"Sacrifice trigger"},
  {p:/sacrifice a creature/gi,cat:"Sacrifice",sc:()=>1,l:()=>"Sacrifice outlet"},
  // Tax / Stax
  {p:/whenever an opponent (draws|casts|plays)/gi,cat:"Tax",sc:()=>3,l:m=>`Tax on opp ${m[1]}`},
  {p:/opponents can't/gi,cat:"Stax",sc:()=>5,l:()=>"Opponents can't"},
  {p:/each player.*sacrifices/gi,cat:"Stax",sc:()=>4,l:()=>"Symmetric sacrifice"},
  // Discard
  {p:/target player discards/gi,cat:"Discard",sc:()=>3,l:()=>"Discard"},
  {p:/each opponent discards/gi,cat:"Discard",sc:()=>4,l:()=>"Mass discard"},
  // Downside
  {p:/cumulative upkeep/gi,cat:"Downside",sc:()=>-2,l:()=>"Cumul. upkeep"},
  {p:/you lose (\d+) life/gi,cat:"Downside",sc:m=>parseInt(m[1])*-.3,l:m=>`Lose ${m[1]} life`},
];

function pw(w) {
  const m = { a:1, an:1, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, x:3 };
  return parseInt(w) || m[w?.toLowerCase()] || 1;
}

export function scoreCardIntrinsic(oracle, cmc) {
  const dets = [];
  let raw = 0;
  for (const pr of PRIMS) {
    pr.p.lastIndex = 0;
    let m;
    while ((m = pr.p.exec(oracle)) !== null) {
      const s = pr.sc(m);
      dets.push({ cat: pr.cat, label: pr.l(m), score: Math.round(s * 10) / 10 });
      raw += s;
      if (!pr.p.global) break;
    }
    pr.p.lastIndex = 0;
  }
  const cmcM = cmc <= 0 ? 2.5 : cmc <= 1 ? 2.0 : cmc <= 2 ? 1.5 : cmc <= 3 ? 1.2 : cmc <= 4 ? 1.0 : cmc <= 5 ? 0.9 : cmc <= 6 ? 0.8 : 0.7;
  const pts = Math.max(0, Math.round(raw * cmcM / 3));
  return { dets, raw: Math.round(raw * 10) / 10, cmcM, pts };
}

// ============================================================
// LAYER 2: COMBOS DATABASE — 30+ known combos
// ============================================================
export const COMBOS = [
  {cards:["Thassa's Oracle","Demonic Consultation"],name:"Thoracle",mult:3.0,desc:"Win: exile library + Oracle trigger",tier:"S"},
  {cards:["Thassa's Oracle","Tainted Pact"],name:"Thoracle Pact",mult:3.0,desc:"Win: exile library + Oracle trigger",tier:"S"},
  {cards:["Isochron Scepter","Dramatic Reversal"],name:"Dramatic Scepter",mult:2.5,desc:"Infinite mana with 2+ rocks",tier:"S"},
  {cards:["Splinter Twin","Deceiver Exarch"],name:"Splinter Twin",mult:3.0,desc:"Infinite haste tokens",tier:"S"},
  {cards:["Kiki-Jiki, Mirror Breaker","Deceiver Exarch"],name:"Kiki Combo",mult:3.0,desc:"Infinite haste tokens",tier:"S"},
  {cards:["Exquisite Blood","Sanguine Bond"],name:"Exquisite Bond",mult:2.5,desc:"Infinite drain loop",tier:"A"},
  {cards:["Exquisite Blood","Vito, Thorn of the Dusk Rose"],name:"Exquisite Vito",mult:2.5,desc:"Infinite drain loop",tier:"A"},
  {cards:["Food Chain","Eternal Scourge"],name:"Food Chain",mult:2.8,desc:"Infinite creature mana",tier:"S"},
  {cards:["Underworld Breach","Brain Freeze"],name:"Breach Freeze",mult:2.8,desc:"Storm mill combo",tier:"S"},
  {cards:["Underworld Breach","Lion's Eye Diamond"],name:"Breach LED",mult:2.8,desc:"Infinite mana + recursion",tier:"S"},
  {cards:["Painter's Servant","Grindstone"],name:"Painter Stone",mult:3.0,desc:"Instant mill",tier:"S"},
  {cards:["Heliod, Sun-Crowned","Walking Ballista"],name:"Heliod Ballista",mult:3.0,desc:"Infinite damage",tier:"S"},
  {cards:["Phyrexian Obliterator","Pariah"],name:"Obliterator Lock",mult:2.0,desc:"Damage redirect = sac all",tier:"A"},
  {cards:["Blood Artist","Cordial Vampire"],name:"Aristocrats Engine",mult:1.3,desc:"Death = drain + buff",tier:"B"},
  {cards:["Elenda, the Dusk Rose","Blood Artist"],name:"Elenda Drain",mult:1.4,desc:"Elenda dies → tokens → drain",tier:"B"},
  {cards:["Dusk Legion Duelist","Cordial Vampire"],name:"Counter Draw",mult:1.3,desc:"+1/+1 → card draw",tier:"B"},
  {cards:["Sheoldred, the Apocalypse","The One Ring"],name:"Sheoldred Ring",mult:1.6,desc:"Growing draw + lifegain",tier:"A"},
  {cards:["Sheoldred, the Apocalypse","Consecrated Sphinx"],name:"Sheoldred Sphinx",mult:1.5,desc:"Massive draw + drain",tier:"A"},
  {cards:["Urborg, Tomb of Yawgmoth","Cabal Coffers"],name:"Urborg Coffers",mult:1.8,desc:"Massive black mana",tier:"A"},
  {cards:["Sorin, Imperious Bloodlord","Bloodline Keeper"],name:"Sorin → Keeper",mult:1.5,desc:"T3 free Keeper",tier:"B"},
  {cards:["Sorin, Imperious Bloodlord","Elenda, the Dusk Rose"],name:"Sorin → Elenda",mult:1.5,desc:"T3 free Elenda",tier:"B"},
  {cards:["Necropotence","Ad Nauseam"],name:"Double Draw",mult:1.8,desc:"CA domination",tier:"A"},
  {cards:["Gaea's Cradle","Craterhoof Behemoth"],name:"Cradle Hoof",mult:1.5,desc:"Massive mana → OTK",tier:"A"},
  {cards:["Mana Crypt","Sol Ring"],name:"Fast Mana",mult:1.2,desc:"Explosive T1",tier:"B"},
  {cards:["Thassa's Oracle","Paradigm Shift"],name:"Oracle Shift",mult:3.0,desc:"Win: empty library + Oracle",tier:"S"},
  {cards:["Worldgorger Dragon","Animate Dead"],name:"Worldgorger",mult:2.8,desc:"Infinite mana + ETB",tier:"S"},
  {cards:["Karmic Guide","Reveillark"],name:"Karmic Lark",mult:2.0,desc:"Infinite recursion loop",tier:"A"},
  {cards:["Murderous Redcap","Viscera Seer"],name:"Persist Combo",mult:1.8,desc:"Infinite damage with -1 removal",tier:"A"},
];

export function detectCombos(cardNames) {
  const lower = cardNames.map(n => n.toLowerCase());
  return COMBOS.filter(co =>
    co.cards.every(cn => lower.some(dn => dn === cn.toLowerCase()))
  );
}

// ============================================================
// LAYER 3: COMMANDER / STRATEGY SYNERGY
// ============================================================
const TAG_PATTERNS = {
  sacrifice: [/sacrifice/gi, /whenever.*dies/gi],
  tokens: [/create.*token/gi, /populate/gi],
  counters: [/\+1\/\+1 counter/gi, /proliferate/gi],
  lifegain: [/gain.*life/gi, /lifelink/gi],
  lifedrain: [/loses? life/gi, /drain/gi],
  graveyard: [/graveyard/gi, /return.*from/gi, /reanimate/gi],
  spellslinger: [/whenever.*cast.*(instant|sorcery)/gi, /copy.*spell/gi],
  tribal: [/vampire|elf|goblin|merfolk|zombie|angel|demon|dragon|knight|wizard|cleric|warrior/gi],
  aggro: [/haste/gi, /first strike|double strike/gi],
  control: [/counter target/gi, /destroy all/gi, /exile all/gi],
  equipment: [/equip/gi, /equipped creature/gi, /attach/gi],
  enchantress: [/enchant/gi, /constellation/gi],
};

export function getTags(oracle) {
  const tags = [];
  for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
    for (const p of patterns) {
      p.lastIndex = 0;
      if (p.test(oracle)) { tags.push(tag); break; }
      p.lastIndex = 0;
    }
  }
  return [...new Set(tags)];
}

export function commanderSynergy(cmdTags, cardTags) {
  const overlap = cmdTags.filter(t => cardTags.includes(t));
  return { mult: Math.round((1 + overlap.length * 0.15) * 100) / 100, tags: overlap };
}

// ============================================================
// FULL SCORING: Combine all 3 layers
// ============================================================
export function scoreFullDeck(deck, cmdOracle) {
  const cmdTags = getTags(cmdOracle);
  const names = deck.map(c => c.name);
  const combos = detectCombos(names);

  return deck.map(card => {
    const intrinsic = scoreCardIntrinsic(card.oracle || "", card.cmc || 0);
    const cardTags = getTags(card.oracle || "");
    const synergy = commanderSynergy(cmdTags, cardTags);
    const myCombo = combos.filter(co => co.cards.some(cn => cn.toLowerCase() === card.name.toLowerCase()));
    const coMult = myCombo.length > 0 ? Math.max(...myCombo.map(c => c.mult)) : 1;
    const final = Math.max(0, Math.round(intrinsic.pts * synergy.mult * coMult));
    return { ...card, intrinsic, cardTags, synergy, myCombo, coMult, final };
  });
}

// ============================================================
// DECK ANALYTICS
// ============================================================
export function analyzeDeck(scoredDeck) {
  const nonLands = scoredDeck.filter(c => !c.type?.toLowerCase().includes("land"));
  const creatures = scoredDeck.filter(c => c.type?.toLowerCase().includes("creature"));
  const instSorc = scoredDeck.filter(c => /instant|sorcery/i.test(c.type || ""));
  const lands = scoredDeck.filter(c => c.type?.toLowerCase().includes("land"));
  const totalCards = scoredDeck.length;

  // CMC curve
  const curve = {};
  nonLands.forEach(c => { const k = Math.min(c.cmc || 0, 7); curve[k] = (curve[k] || 0) + 1; });
  const avgCmc = nonLands.length > 0 ? nonLands.reduce((s, c) => s + (c.cmc || 0), 0) / nonLands.length : 0;

  // Card advantage sources
  const drawSources = scoredDeck.filter(c => {
    const o = (c.oracle || "").toLowerCase();
    return /draw a card|draw \w+ card|draw two|scry|you may draw/i.test(o);
  });

  // Removal count
  const removals = scoredDeck.filter(c => {
    const o = (c.oracle || "").toLowerCase();
    return /destroy target|exile target|counter target|deals? \d+ damage to (any|target)|gets? -\d+\/-\d+|return target.*to.*hand/i.test(o);
  });

  // Ramp
  const rampCards = scoredDeck.filter(c => {
    const o = (c.oracle || "").toLowerCase();
    return /add \{|mana of any|treasure token|search your library for.*land/i.test(o) && !c.type?.toLowerCase().includes("land");
  });

  // Color distribution
  const colorCount = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  scoredDeck.forEach(c => (c.colors || []).forEach(col => { if (colorCount[col] !== undefined) colorCount[col]++; }));

  // Mana sources by color (simplified)
  const manaProducers = lands.length + rampCards.length;

  // Metrics (0-100)
  const metrics = {
    curve: Math.max(0, Math.min(100, Math.round(100 - Math.abs(avgCmc - 2.5) * 30))),
    cardAdvantage: Math.min(100, Math.round((drawSources.length / Math.max(1, totalCards)) * 600)),
    interaction: Math.min(100, Math.round((removals.length / Math.max(1, totalCards)) * 500)),
    manabase: Math.min(100, Math.round((lands.length / Math.max(1, totalCards)) * 250)),
    ramp: Math.min(100, Math.round((rampCards.length / Math.max(1, totalCards)) * 700)),
  };

  // Resilience = CA + recursion + protection
  const recursion = scoredDeck.filter(c => /graveyard.*battlefield|reanimate|return.*from/i.test(c.oracle || ""));
  metrics.resilience = Math.min(100, Math.round((drawSources.length * 8 + recursion.length * 12)));

  // Global score
  metrics.global = Math.round((metrics.curve + metrics.cardAdvantage + metrics.interaction + metrics.manabase + metrics.resilience) / 5);

  return {
    totalCards, creatures: creatures.length, instSorc: instSorc.length, lands: lands.length,
    curve, avgCmc: Math.round(avgCmc * 100) / 100,
    drawSources: drawSources.length, removals: removals.length, rampCards: rampCards.length,
    colorCount, manaProducers, metrics, recursion: recursion.length,
  };
}

// ============================================================
// HAND SIMULATOR (Monte Carlo)
// ============================================================
export function simulateHands(deck, iterations = 1000) {
  const cards = [];
  deck.forEach(c => { for (let i = 0; i < (c.qty || 1); i++) cards.push(c); });
  if (cards.length < 7) return null;

  let landsOk = 0, oneDropT1 = 0, playableHands = 0, totalLandsDrawn = 0;

  for (let i = 0; i < iterations; i++) {
    // Fisher-Yates shuffle
    const shuffled = [...cards];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }
    const hand = shuffled.slice(0, 7);
    const landsInHand = hand.filter(c => c.type?.toLowerCase().includes("land")).length;
    totalLandsDrawn += landsInHand;

    if (landsInHand >= 2 && landsInHand <= 5) landsOk++;
    if (landsInHand >= 2 && landsInHand <= 5 && hand.some(c => !c.type?.toLowerCase().includes("land") && (c.cmc || 0) <= 3)) playableHands++;
    if (hand.some(c => !c.type?.toLowerCase().includes("land") && (c.cmc || 0) <= 1)) oneDropT1++;
  }

  return {
    iterations,
    landsOk: Math.round(landsOk / iterations * 100),
    oneDropT1: Math.round(oneDropT1 / iterations * 100),
    playableHands: Math.round(playableHands / iterations * 100),
    avgLandsInHand: Math.round(totalLandsDrawn / iterations * 10) / 10,
  };
}

// Category colors
export const CAT_COLORS = {"Draw":"#3b82f6","Tutor":"#8b5cf6","Ramp":"#22c55e","Filter":"#06b6d4","Wipe":"#dc2626","Removal":"#ef4444","Counter":"#6366f1","Tokens":"#f59e0b","Drain":"#a855f7","Life":"#ec4899","Damage":"#f97316","Protect":"#06b6d4","Evasion":"#8b5cf6","Combat":"#d97706","+1/+1":"#84cc16","Lord":"#eab308","Anthem":"#eab308","Recursion":"#6366f1","Free":"#7c3aed","Extra Turn":"#dc2626","Extra Combat":"#b91c1c","Win Con":"#dc2626","Storm":"#b91c1c","Cascade":"#7c3aed","Death":"#9333ea","Sacrifice":"#a21caf","Reduce":"#059669","Tax":"#f59e0b","Stax":"#991b1b","Discard":"#78350f","Downside":"#6b7280","Convoke":"#059669"};
export const TIER_COLORS = { S: "#dc2626", A: "#f59e0b", B: "#3b82f6" };
