const cache=new Map();const DELAY=120;let lastReq=0;
async function throttle(){const w=DELAY-(Date.now()-lastReq);if(w>0)await new Promise(r=>setTimeout(r,w));lastReq=Date.now();}
function parseCard(d){return{name:d.name,oracle:d.oracle_text||(d.card_faces?d.card_faces.map(f=>f.oracle_text).join("\n"):""),cmc:d.cmc||0,type:d.type_line||"",colors:d.colors||[],colorIdentity:d.color_identity||[],img:d.image_uris?.normal||d.card_faces?.[0]?.image_uris?.normal||null,imgSmall:d.image_uris?.small||d.card_faces?.[0]?.image_uris?.small||null,set:d.set_name||"",legalities:d.legalities||{},power:d.power||null,toughness:d.toughness||null,keywords:d.keywords||[],prices:{eur:d.prices?.eur,usd:d.prices?.usd},edhrecRank:d.edhrec_rank||99999};}
export async function searchCards(q){if(q.length<2)return[];const k=`ac:${q}`;if(cache.has(k))return cache.get(k);try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`);if(!r.ok)return[];const d=await r.json();cache.set(k,d.data||[]);return d.data||[];}catch{return[];}}
export async function fetchCard(name){const k=`c:${name.toLowerCase()}`;if(cache.has(k))return cache.get(k);try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);if(!r.ok)return null;const d=await r.json();const card=parseCard(d);cache.set(k,card);return card;}catch{return null;}}
export async function fetchCardList(names,onProgress){const results=[];for(let i=0;i<names.length;i+=75){const batch=names.slice(i,i+75);try{await throttle();const r=await fetch("https://api.scryfall.com/cards/collection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifiers:batch.map(n=>({name:n}))})});if(r.ok){const d=await r.json();for(const c of(d.data||[])){const card=parseCard(c);cache.set(`c:${c.name.toLowerCase()}`,card);results.push(card);}}if(onProgress)onProgress(Math.min(i+75,names.length),names.length);}catch{}}return results;}
async function doSearch(query,maxPages){const k=`s:${query}`;if(cache.has(k))return cache.get(k);const all=[];let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;for(let p=0;p<(maxPages||2)&&url;p++){try{await throttle();const r=await fetch(url);if(!r.ok)break;const d=await r.json();for(const c of(d.data||[]))all.push(parseCard(c));url=d.has_more?d.next_page:null;}catch{break;}}cache.set(k,all);return all;}
export async function scryfallSearch(q,mp){return doSearch(q,mp);}
export async function searchAlternatives(card,format,colors,isCommander){const idF=isCommander&&colors.length?`id<=${colors.join("")}`:colors.length?`c<=${colors.join("")}`:"";const fF=format?`f:${format}`:"";const tQ=/creature/i.test(card.type||"")?"t:creature":/instant/i.test(card.type||"")?"t:instant":/sorcery/i.test(card.type||"")?"t:sorcery":/enchantment/i.test(card.type||"")?"t:enchantment":/artifact/i.test(card.type||"")?"t:artifact":"";if(!tQ)return[];return doSearch(`${tQ} ${fF} ${idF} cmc<=${Math.max((card.cmc||0)+1,3)} -!"${card.name}"`,1);}
export function parseDecklistText(text){const lines=text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("#"));const mb=[],sb=[];let inSB=false;for(const line of lines){if(/^sideboard:?$/i.test(line)){inSB=true;continue;}if(line===""){inSB=true;continue;}const m=line.match(/^(?:SB:\s*)?(\d+)x?\s+(.+?)(?:\s+\(.*\))?(?:\s+\d+)?$/i);if(m)(inSB?sb:mb).push({qty:parseInt(m[1]),name:m[2].trim()});}return{mainboard:mb,sideboard:sb};}

// ====== V15 DECK GENERATOR ======
// Fixes: playsets, removal vs protection, land math, tag filtering

function detectThemes(oracle){
  const o=(oracle||"").toLowerCase();const t=[];
  if(/\+1\/\+1 counter|modified|counter on|enters with.*counter/i.test(o))t.push("counters");
  if(/equip|equipment/i.test(o))t.push("equipment");
  if(/aura|enchant creature/i.test(o))t.push("auras");
  if(/token|create.*creature/i.test(o))t.push("tokens");
  if(/sacrifice|dies|graveyard/i.test(o))t.push("sacrifice");
  if(/combat damage|attack|whenever.*deals/i.test(o))t.push("combat");
  if(/landfall|whenever a land/i.test(o))t.push("lands");
  if(/artifact/i.test(o))t.push("artifacts");
  if(/spell|magecraft|instant or sorcery/i.test(o))t.push("spells");
  if(t.length===0)t.push("goodstuff");
  return t.slice(0,2);
}

// Theme-specific queries — focused, not broad
function themeQueries(theme,idQ,fQ){
  switch(theme){
    case"counters":return[
      {q:`t:creature ${fQ} ${idQ} o:"+1/+1 counter"`,role:"synergy",label:"Créatures +1/+1"},
      {q:`(t:instant OR t:sorcery OR t:enchantment) ${fQ} ${idQ} o:"+1/+1 counter"`,role:"synergy",label:"Support +1/+1"},
    ];
    case"equipment":return[{q:`t:equipment ${fQ} ${idQ} cmc<=3`,role:"synergy",label:"Equipment"}];
    case"auras":return[{q:`t:aura ${fQ} ${idQ} -o:"enchant land" cmc<=3`,role:"synergy",label:"Auras"}];
    case"tokens":return[{q:`${fQ} ${idQ} o:"create" o:"token" -t:land`,role:"synergy",label:"Tokens"}];
    case"sacrifice":return[
      {q:`t:creature ${fQ} ${idQ} o:"sacrifice"`,role:"synergy",label:"Sacrifice"},
      {q:`t:creature ${fQ} ${idQ} o:"when" o:"dies"`,role:"synergy",label:"Death triggers"},
    ];
    case"combat":return[{q:`t:creature ${fQ} ${idQ} (o:trample OR o:"double strike" OR o:"combat damage")`,role:"synergy",label:"Combat"}];
    case"lands":return[{q:`${fQ} ${idQ} (o:landfall OR o:"whenever a land enters")`,role:"synergy",label:"Landfall"}];
    case"artifacts":return[{q:`t:artifact ${fQ} ${idQ}`,role:"synergy",label:"Artifacts"}];
    case"spells":return[{q:`${fQ} ${idQ} o:"whenever you cast"`,role:"synergy",label:"Spellslinger"}];
    default:return[{q:`t:creature ${fQ} ${idQ} cmc<=4`,role:"synergy",label:"Creatures"}];
  }
}

// BUG 4 FIX: Check if card has a parasitic tag that doesn't match our themes
const PARASITIC_TAGS=[
  {regex:/\btribal\b|elf you control|elves you control|goblin you control|merfolk you control/i,theme:"tribal"},
  {regex:/storm|aetherflux|whenever you cast.*spell.*this turn/i,theme:"storm"},
  {regex:/you gain.*life.*equal|whenever you gain life/i,theme:"lifegain"},
  {regex:/mill|cards? into.*graveyard|top.*cards.*into/i,theme:"mill"},
];
function hasParasiticTag(card,themes){
  const o=(card.oracle||"").toLowerCase();
  for(const pt of PARASITIC_TAGS){
    if(pt.regex.test(o)&&!themes.includes(pt.theme))return true;
  }
  return false;
}

const FORMAT_RULES={
  commander:{lands:37,removal:7,protection:3,draw:6,ramp:8,copies:1},
  modern:{lands:22,removal:4,protection:2,draw:2,ramp:2,copies:4},
  standard:{lands:24,removal:4,protection:2,draw:3,ramp:2,copies:4},
  pioneer:{lands:23,removal:4,protection:2,draw:3,ramp:2,copies:4},
  legacy:{lands:20,removal:6,protection:2,draw:3,ramp:2,copies:4},
  "default":{lands:23,removal:4,protection:2,draw:3,ramp:2,copies:4},
};

export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress){
  const rules=FORMAT_RULES[format]||FORMAT_RULES[isCommander?"commander":"default"];
  const idOp=isCommander?"id":"c";
  const idQ=colors.length?`${idOp}<=${colors.join("")}`:"";
  const fQ=format?`f:${format}`:"";
  const deckSize=isCommander?99:60;
  const copies=rules.copies;
  const themes=detectThemes(pivotCard?.oracle||"");
  const maxCmc=isCommander?99:5; // 60-card: hard cap at CMC 5

  // Calculate how many NON-LAND card slots we have
  const nonLandSlots=deckSize-rules.lands;
  // In 60-card: we need UNIQUE cards (each added as playset)
  // So unique card count = nonLandSlots / copies
  const uniqueNonLandTarget=isCommander?nonLandSlots:Math.floor(nonLandSlots/copies);

  // FIX BUG 1: For 60-card, each synergy query should find fewer UNIQUE cards (they'll be 4×)
  const synergyUniqueTarget=isCommander?
    Math.max(5,Math.floor(uniqueNonLandTarget*0.6)):  // 60% of slots for synergy
    Math.max(3,Math.floor(uniqueNonLandTarget*0.55));
  
  const tQueries=themes.flatMap(t=>themeQueries(t,idQ,fQ));
  const perQuery=Math.ceil(synergyUniqueTarget/Math.max(1,tQueries.length));

  // Build ordered steps
  const steps=[];
  // 1. Synergy (the game plan)
  for(const tq of tQueries)steps.push({...tq,target:perQuery});
  // 2. REMOVAL — FIX BUG 2: explicitly exclude protection spells
  steps.push({q:`(o:"destroy target" OR o:"exile target" OR o:"deals damage" o:"target creature") (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof -o:indestructible -o:"you control"`,target:isCommander?rules.removal:Math.ceil(rules.removal/copies),role:"removal",label:"Removal"});
  // 3. PROTECTION — separate slot
  steps.push({q:`(o:hexproof OR o:indestructible OR o:"protection from") (t:instant OR t:equipment) ${fQ} ${idQ}`,target:isCommander?rules.protection:Math.ceil(rules.protection/copies),role:"protection",label:"Protection"});
  // 4. Draw
  steps.push({q:`(o:"draw a card" OR o:"draw cards") ${fQ} ${idQ} -t:land (t:instant OR t:sorcery OR t:enchantment)`,target:isCommander?rules.draw:Math.ceil(rules.draw/copies),role:"draw",label:"Pioche"});
  // 5. Ramp
  steps.push({q:`(o:"add" o:"mana" OR o:"search" o:"basic land") ${fQ} ${idQ} cmc<=3 -t:land`,target:isCommander?rules.ramp:Math.ceil(rules.ramp/copies),role:"ramp",label:"Ramp"});

  const totalSteps=steps.length+1;
  let completed=0;
  const deck=[];
  const used=new Set();

  // Add pivot in 60-card as playset
  if(pivotCard&&!isCommander){
    for(let i=0;i<copies;i++)deck.push({...pivotCard,qty:1});
    used.add(pivotCard.name.toLowerCase());
  }

  for(const step of steps){
    if(onProgress)onProgress(completed,totalSteps,`${step.label||step.name||"..."}...`);
    let results=[];try{results=await doSearch(step.q,1);}catch{}
    let added=0;
    for(const card of results){
      if(added>=step.target)break;
      // Check total deck size
      const currentTotal=deck.filter(c=>!/land/i.test(c.type||"")).length;
      if(currentTotal>=nonLandSlots)break;
      const key=card.name.toLowerCase();
      if(used.has(key))continue;
      if(/basic land/i.test(card.type||""))continue;
      if((card.cmc||0)>maxCmc)continue;
      // BUG 4 FIX: reject parasitic cards
      if(hasParasiticTag(card,themes))continue;
      // Add as playset (60-card) or singleton (commander)
      const qty=isCommander?1:copies;
      // Check we won't exceed
      if(deck.filter(c=>!/land/i.test(c.type||"")).length+qty>nonLandSlots)continue;
      for(let i=0;i<qty;i++)deck.push({...card,qty:1});
      used.add(key);
      added++;
    }
    completed++;
  }

  // BUG 3 FIX: Count ALL lands already in deck before adding basics
  if(onProgress)onProgress(completed,totalSteps,"Terrains...");
  const existingLands=deck.filter(c=>/land/i.test(c.type||"")).length;
  const basicsNeeded=Math.max(0,rules.lands-existingLands);
  const landNames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  let la=0;
  if(colors.length>0&&basicsNeeded>0){
    const perCol=Math.max(1,Math.floor(basicsNeeded/colors.length));
    for(const col of colors){for(let i=0;i<perCol&&la<basicsNeeded;i++){deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}}
    while(la<basicsNeeded){const col=colors[la%colors.length];deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}
  }
  
  // Fill any remaining slots with additional synergy creatures
  const remaining=deckSize-deck.length;
  if(remaining>0&&onProgress)onProgress(completed,totalSteps,`Remplissage (${remaining})...`);
  if(remaining>0){
    const fillQ=`t:creature ${fQ} ${idQ} cmc<=4`;
    let fillResults=[];try{fillResults=await doSearch(fillQ,1);}catch{}
    let fillAdded=0;
    for(const card of fillResults){
      if(deck.length>=deckSize)break;
      const key=card.name.toLowerCase();
      if(used.has(key))continue;
      if(/basic land/i.test(card.type||""))continue;
      if(hasParasiticTag(card,themes))continue;
      const qty=isCommander?1:Math.min(copies,deckSize-deck.length);
      for(let i=0;i<qty;i++)deck.push({...card,qty:1});
      used.add(key);fillAdded++;
    }
  }

  completed++;
  if(onProgress)onProgress(completed,totalSteps,"Terminé !");
  return deck;
}
