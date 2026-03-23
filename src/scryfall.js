const cache=new Map();const DELAY=120;let lastReq=0;
async function throttle(){const w=DELAY-(Date.now()-lastReq);if(w>0)await new Promise(r=>setTimeout(r,w));lastReq=Date.now();}

function parseCard(d){return{
  name:d.name,oracle:d.oracle_text||(d.card_faces?d.card_faces.map(f=>f.oracle_text).join("\n"):""),
  cmc:d.cmc||0,type:d.type_line||"",colors:d.colors||[],colorIdentity:d.color_identity||[],
  img:d.image_uris?.normal||d.card_faces?.[0]?.image_uris?.normal||null,
  imgSmall:d.image_uris?.small||d.card_faces?.[0]?.image_uris?.small||null,
  set:d.set_name||"",legalities:d.legalities||{},power:d.power||null,toughness:d.toughness||null,
  keywords:d.keywords||[],prices:{eur:d.prices?.eur,usd:d.prices?.usd},edhrecRank:d.edhrec_rank||99999,
};}

export async function searchCards(q){
  if(q.length<2)return[];const k=`ac:${q}`;if(cache.has(k))return cache.get(k);
  try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`);if(!r.ok)return[];const d=await r.json();cache.set(k,d.data||[]);return d.data||[];}catch{return[];}
}

export async function fetchCard(name){
  const k=`c:${name.toLowerCase()}`;if(cache.has(k))return cache.get(k);
  try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);if(!r.ok)return null;const d=await r.json();const card=parseCard(d);cache.set(k,card);return card;}catch{return null;}
}

export async function fetchCardList(names,onProgress){
  const results=[];const total=names.length;
  for(let i=0;i<names.length;i+=75){
    const batch=names.slice(i,i+75);
    try{await throttle();const r=await fetch("https://api.scryfall.com/cards/collection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifiers:batch.map(n=>({name:n}))})});
    if(r.ok){const d=await r.json();for(const c of(d.data||[])){const card=parseCard(c);cache.set(`c:${c.name.toLowerCase()}`,card);results.push(card);}}
    if(onProgress)onProgress(Math.min(i+75,total),total);}catch{}
  }
  return results;
}

async function doSearch(query,maxPages){
  const k=`s:${query}`;if(cache.has(k))return cache.get(k);
  const all=[];let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;
  for(let p=0;p<(maxPages||2)&&url;p++){
    try{await throttle();const r=await fetch(url);if(!r.ok)break;const d=await r.json();
    for(const c of(d.data||[]))all.push(parseCard(c));
    url=d.has_more?d.next_page:null;}catch{break;}
  }
  cache.set(k,all);return all;
}

export async function scryfallSearch(q,mp,op){return doSearch(q,mp);}

export async function searchAlternatives(card,format,colors,isCommander){
  const idF=isCommander&&colors.length?`id<=${colors.join("")}`:colors.length?`c<=${colors.join("")}`:"";
  const fF=format?`f:${format}`:"";
  const tQ=/creature/i.test(card.type||"")?"t:creature":/instant/i.test(card.type||"")?"t:instant":/sorcery/i.test(card.type||"")?"t:sorcery":/enchantment/i.test(card.type||"")?"t:enchantment":/artifact/i.test(card.type||"")&&!/creature/i.test(card.type||"")?"t:artifact":"";
  if(!tQ)return[];
  const q=`${tQ} ${fF} ${idF} cmc<=${Math.max((card.cmc||0)+1,3)} -!"${card.name}"`;
  return doSearch(q,1);
}

export function parseDecklistText(text){
  const lines=text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("#"));
  const mb=[],sb=[];let inSB=false;
  for(const line of lines){
    if(/^sideboard:?$/i.test(line)){inSB=true;continue;}
    if(line===""){inSB=true;continue;}
    const m=line.match(/^(?:SB:\s*)?(\d+)x?\s+(.+?)(?:\s+\(.*\))?(?:\s+\d+)?$/i);
    if(m)(inSB?sb:mb).push({qty:parseInt(m[1]),name:m[2].trim()});
  }
  return{mainboard:mb,sideboard:sb};
}

// ====== V13: CONTEXTUAL DECK GENERATOR ======

// Analyze commander oracle text to determine what the deck needs
function analyzeCommander(pivotOracle){
  const o=(pivotOracle||"").toLowerCase();
  const themes=[];
  if(/\+1\/\+1 counter|modified|counter on/i.test(o))themes.push("counters");
  if(/equip|equipment/i.test(o))themes.push("equipment");
  if(/aura|enchant creature/i.test(o))themes.push("auras");
  if(/token|create.*creature/i.test(o))themes.push("tokens");
  if(/sacrifice|dies|graveyard/i.test(o))themes.push("sacrifice");
  if(/draw|card advantage/i.test(o))themes.push("draw");
  if(/combat damage|attack|trample/i.test(o))themes.push("combat");
  if(/mill|library/i.test(o))themes.push("mill");
  if(/life|drain|each opponent loses/i.test(o))themes.push("lifedrain");
  if(/spell|instant|sorcery|cast/i.test(o))themes.push("spellslinger");
  if(/land|landfall/i.test(o))themes.push("lands");
  if(/artifact/i.test(o))themes.push("artifacts");
  if(/enchantment/i.test(o))themes.push("enchantments");
  if(themes.length===0)themes.push("goodstuff");
  return themes;
}

// Build Scryfall queries BASED ON the commander's themes
function buildSynergyQueries(themes,idQ,fQ,isCmd){
  const synQ=[];
  for(const theme of themes){
    switch(theme){
      case"counters":
        synQ.push({name:"Créatures +1/+1",q:`t:creature ${fQ} ${idQ} (o:"+1/+1 counter" OR o:"enters with" o:counter)`,target:isCmd?12:8});
        synQ.push({name:"Support +1/+1",q:`(t:instant OR t:sorcery OR t:enchantment) ${fQ} ${idQ} o:"+1/+1 counter"`,target:isCmd?5:3});
        break;
      case"equipment":
        synQ.push({name:"Équipements",q:`t:equipment ${fQ} ${idQ}`,target:isCmd?6:3});
        synQ.push({name:"Créatures equipment",q:`t:creature ${fQ} ${idQ} (o:equip OR o:equipment OR o:attach)`,target:isCmd?4:2});
        break;
      case"auras":
        synQ.push({name:"Auras",q:`t:aura ${fQ} ${idQ}`,target:isCmd?6:3});
        break;
      case"tokens":
        synQ.push({name:"Token creators",q:`${fQ} ${idQ} o:"create" o:"token"`,target:isCmd?8:4});
        break;
      case"sacrifice":
        synQ.push({name:"Sacrifice outlets",q:`${fQ} ${idQ} o:"sacrifice" (t:creature OR t:enchantment OR t:artifact)`,target:isCmd?6:3});
        synQ.push({name:"Death triggers",q:`t:creature ${fQ} ${idQ} (o:"when" o:"dies" OR o:"leaves the battlefield")`,target:isCmd?5:3});
        break;
      case"combat":
        synQ.push({name:"Combat creatures",q:`t:creature ${fQ} ${idQ} (o:trample OR o:haste OR o:"double strike" OR o:"combat damage")`,target:isCmd?8:4});
        break;
      case"spellslinger":
        synQ.push({name:"Spell payoffs",q:`${fQ} ${idQ} (o:"whenever you cast" OR o:"instant or sorcery")`,target:isCmd?6:3});
        break;
      case"lands":
        synQ.push({name:"Landfall",q:`${fQ} ${idQ} (o:landfall OR o:"whenever a land")`,target:isCmd?5:3});
        break;
      case"artifacts":
        synQ.push({name:"Artifact synergy",q:`${fQ} ${idQ} (t:artifact OR o:"artifact you control")`,target:isCmd?8:4});
        break;
      case"goodstuff":
        synQ.push({name:"Créatures efficaces",q:`t:creature ${fQ} ${idQ} cmc<=4`,target:isCmd?12:8});
        break;
    }
  }
  return synQ;
}

export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress){
  const idOp=isCommander?"id":"c";
  const idQ=colors.length>0?`${idOp}<=${colors.join("")}`:"";
  const fQ=format?`f:${format}`:"";
  const deckSize=isCommander?99:60;
  const maxCopies=isCommander?1:4;

  // STEP 1: Analyze the commander/pivot
  const themes=analyzeCommander(pivotCard?.oracle||"");
  
  // STEP 2: Build contextual queries
  const synergySteps=buildSynergyQueries(themes,idQ,fQ,isCommander);
  
  // STEP 3: Standard slots (always needed regardless of theme)
  const baseSteps=isCommander?[
    {name:"Removal",q:`(o:"destroy target" OR o:"exile target" OR o:fight) (t:instant OR t:sorcery) ${fQ} ${idQ}`,target:7},
    {name:"Pioche",q:`(o:"draw a card" OR o:"draw cards") ${fQ} ${idQ} -t:land`,target:6},
    {name:"Ramp",q:`(t:creature o:"add" cmc<=2) ${fQ} ${idQ}`,target:5},
    {name:"Ramp sort",q:`(t:sorcery OR t:instant) (o:"search" o:"land" OR o:"add" o:"mana") ${fQ} ${idQ} cmc<=3`,target:4},
    {name:"Protection",q:`(o:"hexproof" OR o:"indestructible" OR o:"protection") (t:instant OR t:equipment) ${fQ} ${idQ}`,target:3},
  ]:[
    {name:"Removal",q:`(o:"destroy target" OR o:"exile target" OR o:"damage to") (t:instant OR t:sorcery) ${fQ} ${idQ}`,target:3},
    {name:"Pioche/Utility",q:`(o:"draw a card") ${fQ} ${idQ} -t:land -t:creature`,target:2},
    {name:"Finishers",q:`t:creature ${fQ} ${idQ} cmc>=4 (o:trample OR o:haste OR o:flying)`,target:2},
  ];
  
  const allSteps=[...synergySteps,...baseSteps];
  const totalSteps=allSteps.length+1;
  let completed=0;
  const deck=[];
  const used=new Set();
  
  // Add pivot in 60-card
  if(pivotCard&&!isCommander){
    for(let i=0;i<Math.min(maxCopies,4);i++)deck.push({...pivotCard,qty:1});
    used.add(pivotCard.name.toLowerCase());
  }

  // Target: how many non-land slots
  const landTarget=isCommander?37:22;
  const nonLandTarget=deckSize-landTarget;

  for(const step of allSteps){
    if(onProgress)onProgress(completed,totalSteps,`${step.name}...`);
    let results=[];
    try{results=await doSearch(step.q,1);}catch{}
    let added=0;
    const currentNonLands=deck.filter(c=>!/land/i.test(c.type||"")).length;
    for(const card of results){
      if(added>=step.target)break;
      if(currentNonLands+added*maxCopies>=nonLandTarget)break;
      const key=card.name.toLowerCase();
      if(used.has(key))continue;
      if(/basic land/i.test(card.type||""))continue;
      const copies=isCommander?1:Math.min(maxCopies,4);
      for(let i=0;i<copies;i++)deck.push({...card,qty:1});
      used.add(key);
      added++;
    }
    completed++;
  }

  // LANDS
  if(onProgress)onProgress(completed,totalSteps,"Terrains...");
  const actualNonLands=deck.filter(c=>!/land/i.test(c.type||"")).length;
  const landsNeeded=deckSize-actualNonLands;
  const landNames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  let la=0;
  const perCol=Math.max(1,Math.floor(landsNeeded/Math.max(1,colors.length)));
  for(const col of colors){
    for(let i=0;i<perCol&&la<landsNeeded;i++){
      deck.push({name:landNames[col]||"Wastes",oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]||"Wastes"}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});
      la++;
    }
  }
  while(la<landsNeeded&&colors.length>0){
    const col=colors[la%colors.length];
    deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});
    la++;
  }
  completed++;
  if(onProgress)onProgress(completed,totalSteps,"Terminé !");
  return deck;
}
