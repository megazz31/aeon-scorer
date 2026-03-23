const cache=new Map();const DELAY=120;let lastReq=0;
async function throttle(){const w=DELAY-(Date.now()-lastReq);if(w>0)await new Promise(r=>setTimeout(r,w));lastReq=Date.now();}
function parseCard(d){return{name:d.name,oracle:d.oracle_text||(d.card_faces?d.card_faces.map(f=>f.oracle_text).join("\n"):""),cmc:d.cmc||0,type:d.type_line||"",colors:d.colors||[],colorIdentity:d.color_identity||[],img:d.image_uris?.normal||d.card_faces?.[0]?.image_uris?.normal||null,imgSmall:d.image_uris?.small||d.card_faces?.[0]?.image_uris?.small||null,set:d.set_name||"",legalities:d.legalities||{},power:d.power||null,toughness:d.toughness||null,keywords:d.keywords||[],prices:{eur:d.prices?.eur,usd:d.prices?.usd},edhrecRank:d.edhrec_rank||99999};}

export async function searchCards(q){if(q.length<2)return[];const k=`ac:${q}`;if(cache.has(k))return cache.get(k);try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`);if(!r.ok)return[];const d=await r.json();cache.set(k,d.data||[]);return d.data||[];}catch{return[];}}
export async function fetchCard(name){const k=`c:${name.toLowerCase()}`;if(cache.has(k))return cache.get(k);try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);if(!r.ok)return null;const d=await r.json();const card=parseCard(d);cache.set(k,card);return card;}catch{return null;}}
export async function fetchCardList(names,onProgress){const results=[];for(let i=0;i<names.length;i+=75){const batch=names.slice(i,i+75);try{await throttle();const r=await fetch("https://api.scryfall.com/cards/collection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifiers:batch.map(n=>({name:n}))})});if(r.ok){const d=await r.json();for(const c of(d.data||[])){const card=parseCard(c);cache.set(`c:${c.name.toLowerCase()}`,card);results.push(card);}}if(onProgress)onProgress(Math.min(i+75,names.length),names.length);}catch{}}return results;}
async function doSearch(query,maxPages){const k=`s:${query}`;if(cache.has(k))return cache.get(k);const all=[];let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;for(let p=0;p<(maxPages||2)&&url;p++){try{await throttle();const r=await fetch(url);if(!r.ok)break;const d=await r.json();for(const c of(d.data||[]))all.push(parseCard(c));url=d.has_more?d.next_page:null;}catch{break;}}cache.set(k,all);return all;}
export async function scryfallSearch(q,mp){return doSearch(q,mp);}
export async function searchAlternatives(card,format,colors,isCommander){const idF=isCommander&&colors.length?`id<=${colors.join("")}`:colors.length?`c<=${colors.join("")}`:"";const fF=format?`f:${format}`:"";const tQ=/creature/i.test(card.type||"")?"t:creature":/instant/i.test(card.type||"")?"t:instant":/sorcery/i.test(card.type||"")?"t:sorcery":/enchantment/i.test(card.type||"")?"t:enchantment":/artifact/i.test(card.type||"")&&!/creature/i.test(card.type||"")?"t:artifact":"";if(!tQ)return[];return doSearch(`${tQ} ${fF} ${idF} cmc<=${Math.max((card.cmc||0)+1,3)} -!"${card.name}"`,1);}
export function parseDecklistText(text){const lines=text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("#"));const mb=[],sb=[];let inSB=false;for(const line of lines){if(/^sideboard:?$/i.test(line)){inSB=true;continue;}if(line===""){inSB=true;continue;}const m=line.match(/^(?:SB:\s*)?(\d+)x?\s+(.+?)(?:\s+\(.*\))?(?:\s+\d+)?$/i);if(m)(inSB?sb:mb).push({qty:parseInt(m[1]),name:m[2].trim()});}return{mainboard:mb,sideboard:sb};}

// ====== V14: FORMAT-AWARE DECK GENERATOR ======
// Key principles:
// 1. Commander themes get picked, but limited to MAX 2 primary themes
// 2. Format constraints enforce interaction minimums, curve limits, CMC caps
// 3. Critical mass: don't add a sub-theme card unless the theme has enough cards
// 4. Each slot has a STRICT quota that cannot overflow

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
  return t.slice(0,2); // MAX 2 primary themes — avoid dilution
}

// Build focused queries for each theme
function themeQueries(theme,idQ,fQ){
  switch(theme){
    case"counters":return[
      {q:`t:creature ${fQ} ${idQ} o:"+1/+1 counter"`,role:"synergy"},
      {q:`(t:instant OR t:sorcery) ${fQ} ${idQ} o:"+1/+1 counter"`,role:"synergy"},
      {q:`t:enchantment ${fQ} ${idQ} o:"+1/+1 counter"`,role:"synergy"},
    ];
    case"equipment":return[
      {q:`t:equipment ${fQ} ${idQ}`,role:"synergy"},
      {q:`t:creature ${fQ} ${idQ} o:equip`,role:"synergy"},
    ];
    case"auras":return[
      {q:`t:aura ${fQ} ${idQ} -o:"enchant land"`,role:"synergy"},
    ];
    case"tokens":return[
      {q:`${fQ} ${idQ} o:"create" o:"token" -t:land`,role:"synergy"},
    ];
    case"sacrifice":return[
      {q:`${fQ} ${idQ} o:"sacrifice" t:creature`,role:"synergy"},
      {q:`t:creature ${fQ} ${idQ} o:"when" o:"dies"`,role:"synergy"},
    ];
    case"combat":return[
      {q:`t:creature ${fQ} ${idQ} (o:trample OR o:haste OR o:"double strike")`,role:"synergy"},
    ];
    case"lands":return[
      {q:`${fQ} ${idQ} (o:landfall OR o:"whenever a land enters")`,role:"synergy"},
    ];
    case"artifacts":return[
      {q:`t:artifact ${fQ} ${idQ} (o:"artifact you control" OR o:"artifacts")`,role:"synergy"},
    ];
    case"spells":return[
      {q:`${fQ} ${idQ} (o:"whenever you cast" OR o:"instant or sorcery")`,role:"synergy"},
    ];
    default:return[
      {q:`t:creature ${fQ} ${idQ} cmc<=4`,role:"synergy"},
    ];
  }
}

// FORMAT CONSTRAINTS
const FORMAT_RULES={
  commander:{lands:37,interaction:7,draw:6,ramp:8,protection:3,synergySlots:38,maxCmc:null,copies:1},
  modern:{lands:22,interaction:6,draw:3,ramp:2,protection:2,synergySlots:25,maxCmc:5,copies:4},
  standard:{lands:24,interaction:6,draw:4,ramp:2,protection:1,synergySlots:23,maxCmc:6,copies:4},
  pioneer:{lands:23,interaction:6,draw:4,ramp:2,protection:1,synergySlots:24,maxCmc:5,copies:4},
  legacy:{lands:20,interaction:8,draw:4,ramp:2,protection:2,synergySlots:24,maxCmc:4,copies:4},
  "default":{lands:23,interaction:5,draw:3,ramp:2,protection:1,synergySlots:26,maxCmc:6,copies:4},
};

export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress,bracket){
  const rules=FORMAT_RULES[format]||FORMAT_RULES[isCommander?"commander":"default"];
  const idOp=isCommander?"id":"c";
  const idQ=colors.length>0?`${idOp}<=${colors.join("")}`:"";
  const fQ=format?`f:${format}`:"";
  const deckSize=isCommander?99:60;
  const maxCopies=rules.copies;
  const themes=detectThemes(pivotCard?.oracle||"");

  // Build all queries
  const steps=[];
  // 1. SYNERGY SLOTS (the deck's game plan)
  const synTarget=rules.synergySlots;
  let synPerQuery=Math.ceil(synTarget/Math.max(1,themes.flatMap(t=>themeQueries(t,idQ,fQ)).length));
  for(const theme of themes){
    for(const tq of themeQueries(theme,idQ,fQ)){
      steps.push({name:`${theme}: ${tq.role}`,q:tq.q,target:synPerQuery,role:"synergy"});
    }
  }
  // 2. INTERACTION (mandatory — format enforced)
  steps.push({name:"Removal",q:`(o:"destroy target" OR o:"exile target" OR o:fight) (t:instant OR t:sorcery) ${fQ} ${idQ}`,target:rules.interaction,role:"interaction"});
  // 3. CARD DRAW
  steps.push({name:"Pioche",q:`(o:"draw a card" OR o:"draw cards") ${fQ} ${idQ} -t:land`,target:rules.draw,role:"draw"});
  // 4. RAMP
  steps.push({name:"Ramp",q:`(o:"add" o:"mana" OR o:"search" o:"basic land") ${fQ} ${idQ} cmc<=3`,target:rules.ramp,role:"ramp"});
  // 5. PROTECTION
  steps.push({name:"Protection",q:`(o:"hexproof" OR o:"indestructible" OR o:protection) (t:instant OR t:enchantment OR t:equipment) ${fQ} ${idQ}`,target:rules.protection,role:"protection"});

  const totalSteps=steps.length+1;
  let completed=0;
  const deck=[];
  const used=new Set();
  const roleCounts={synergy:0,interaction:0,draw:0,ramp:0,protection:0};

  // Add pivot in 60-card
  if(pivotCard&&!isCommander){
    for(let i=0;i<Math.min(maxCopies,4);i++)deck.push({...pivotCard,qty:1});
    used.add(pivotCard.name.toLowerCase());
    roleCounts.synergy+=maxCopies;
  }

  const nonLandTarget=deckSize-rules.lands;

  for(const step of steps){
    if(onProgress)onProgress(completed,totalSteps,`${step.name}...`);
    let results=[];try{results=await doSearch(step.q,1);}catch{}
    let added=0;
    const currentNonLands=deck.filter(c=>!/land/i.test(c.type||"")).length;
    
    for(const card of results){
      if(added>=step.target)break;
      if(currentNonLands+added>=nonLandTarget)break;
      const key=card.name.toLowerCase();
      if(used.has(key))continue;
      if(/basic land/i.test(card.type||""))continue;
      // FORMAT CONSTRAINT: CMC cap for 60-card formats
      if(rules.maxCmc&&(card.cmc||0)>rules.maxCmc)continue;
      // Budget/bracket filter could go here
      const copies=isCommander?1:Math.min(maxCopies,4);
      for(let i=0;i<copies;i++)deck.push({...card,qty:1});
      used.add(key);
      added++;
      roleCounts[step.role]=(roleCounts[step.role]||0)+copies;
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
  for(const col of colors){for(let i=0;i<perCol&&la<landsNeeded;i++){deck.push({name:landNames[col]||"Wastes",oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]||"Wastes"}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}}
  while(la<landsNeeded&&colors.length>0){const col=colors[la%colors.length];deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}
  completed++;
  if(onProgress)onProgress(completed,totalSteps,"Terminé !");
  return deck;
}
