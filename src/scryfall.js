const cache=new Map();const DELAY=120;let lastReq=0;
async function throttle(){const w=DELAY-(Date.now()-lastReq);if(w>0)await new Promise(r=>setTimeout(r,w));lastReq=Date.now();}
function parseCard(d){return{name:d.name,oracle:d.oracle_text||(d.card_faces?d.card_faces.map(f=>f.oracle_text).join("\n"):""),cmc:d.cmc||0,type:d.type_line||"",colors:d.colors||[],colorIdentity:d.color_identity||[],img:d.image_uris?.normal||d.card_faces?.[0]?.image_uris?.normal||null,imgSmall:d.image_uris?.small||d.card_faces?.[0]?.image_uris?.small||null,set:d.set_name||"",legalities:d.legalities||{},power:d.power||null,toughness:d.toughness||null,keywords:d.keywords||[],prices:{eur:d.prices?.eur,usd:d.prices?.usd},edhrecRank:d.edhrec_rank||99999};}
export async function searchCards(q){if(q.length<2)return[];const k=`ac:${q}`;if(cache.has(k))return cache.get(k);try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`);if(!r.ok)return[];const d=await r.json();cache.set(k,d.data||[]);return d.data||[];}catch{return[];}}
export async function fetchCard(name){const k=`c:${name.toLowerCase()}`;if(cache.has(k))return cache.get(k);try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);if(!r.ok)return null;const d=await r.json();const card=parseCard(d);cache.set(k,card);return card;}catch{return null;}}
export async function fetchCardList(names,onProgress){const results=[];for(let i=0;i<names.length;i+=75){const batch=names.slice(i,i+75);try{await throttle();const r=await fetch("https://api.scryfall.com/cards/collection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifiers:batch.map(n=>({name:n}))})});if(r.ok){const d=await r.json();for(const c of(d.data||[])){const card=parseCard(c);cache.set(`c:${c.name.toLowerCase()}`,card);results.push(card);}}if(onProgress)onProgress(Math.min(i+75,names.length),names.length);}catch{}}return results;}
async function doSearch(query,maxPages){const k=`s:${query}`;if(cache.has(k))return cache.get(k);const all=[];let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;for(let p=0;p<(maxPages||2)&&url;p++){try{await throttle();const r=await fetch(url);if(!r.ok)break;const d=await r.json();for(const c of(d.data||[]))all.push(parseCard(c));url=d.has_more?d.next_page:null;}catch{break;}}cache.set(k,all);return all;}
export async function scryfallSearch(q,mp){return doSearch(q,mp);}
export async function searchAlternatives(card,format,colors,isCommander){
  const idF=isCommander&&colors.length?`id<=${colors.join("")}`:colors.length?`c<=${colors.join("")}`:"";
  const fF=format?`f:${format}`:"";
  // TYPE-AWARE: search for same card type
  const t=(card.type||"").toLowerCase();
  let tQ="";
  if(t.includes("creature"))tQ="t:creature";
  else if(t.includes("instant"))tQ="t:instant";
  else if(t.includes("sorcery"))tQ="t:sorcery";
  else if(t.includes("enchantment")&&!t.includes("creature"))tQ="t:enchantment";
  else if(t.includes("artifact")&&!t.includes("creature"))tQ="t:artifact";
  else if(t.includes("equipment"))tQ="t:equipment";
  else tQ="";
  if(!tQ)return[];
  return doSearch(`${tQ} ${fF} ${idF} cmc<=${Math.max((card.cmc||0)+1,3)} -!"${card.name}"`,1);
}
export function parseDecklistText(text){const lines=text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("#"));const mb=[],sb=[];let inSB=false;for(const line of lines){if(/^sideboard:?$/i.test(line)){inSB=true;continue;}if(line===""){inSB=true;continue;}const m=line.match(/^(?:SB:\s*)?(\d+)x?\s+(.+?)(?:\s+\(.*\))?(?:\s+\d+)?$/i);if(m)(inSB?sb:mb).push({qty:parseInt(m[1]),name:m[2].trim()});}return{mainboard:mb,sideboard:sb};}
export function extractSkeleton(refLists){if(!refLists||!refLists.length)return null;const freq={};const total=refLists.length;for(const list of refLists){const seen=new Set();for(const entry of list){const key=entry.name.toLowerCase();if(!seen.has(key)){freq[key]=(freq[key]||0)+1;seen.add(key);}}}const sorted=Object.entries(freq).map(([name,count])=>({name,freq:count/total})).sort((a,b)=>b.freq-a.freq);return{core:sorted.filter(c=>c.freq>=0.5),flex:sorted.filter(c=>c.freq>=0.2&&c.freq<0.5)};}

// ====== V17: TEMPLATE-BASED GENERATION ======

function detectThemes(oracle){
  const o=(oracle||"").toLowerCase();const t=[];
  if(/\+1\/\+1 counter|modified|counter on|enters with.*counter/i.test(o))t.push("counters");
  if(/equip|equipment/i.test(o))t.push("equipment");
  if(/aura|enchant creature/i.test(o))t.push("auras");
  if(/token|create.*creature/i.test(o))t.push("tokens");
  if(/sacrifice|dies|graveyard/i.test(o))t.push("sacrifice");
  if(/combat damage|attack|whenever.*deals/i.test(o))t.push("combat");
  if(/landfall|whenever a land/i.test(o))t.push("lands");
  if(t.length===0)t.push("goodstuff");
  return t.slice(0,2);
}

function isParasitic(card,themes){
  const o=(card.oracle||"").toLowerCase();const n=(card.name||"").toLowerCase();
  if(/(elf|elves|goblin|merfolk|zombie|vampire) you control/i.test(o)&&!themes.includes("tribal"))return true;
  if(/(storm|aetherflux|thousand-year|grapeshot)/i.test(n))return true;
  if(/for each.*spell.*cast this turn/i.test(o)&&!themes.includes("spells"))return true;
  if(/whenever you gain life|you gained life/i.test(o)&&!themes.includes("lifegain"))return true;
  if(/mill \d|into.*graveyard.*from.*library/i.test(o)&&!themes.includes("mill"))return true;
  return false;
}

function priceOk(card,brk){
  const eur=parseFloat(card.prices?.eur)||0;
  if(!eur)return true; // no price data = allow
  if(brk<=1&&eur>5)return false;
  if(brk<=2&&eur>15)return false;
  if(brk<=3&&eur>30)return false;
  return true;
}

// Build the synergy query based on theme
function synQ(theme,idQ,fQ){
  switch(theme){
    case"counters":return`o:"+1/+1 counter" ${fQ} ${idQ}`;
    case"equipment":return`t:equipment ${fQ} ${idQ} cmc<=3`;
    case"auras":return`t:aura ${fQ} ${idQ} -o:"enchant land" cmc<=3`;
    case"tokens":return`o:"create" o:"token" ${fQ} ${idQ} -t:land`;
    case"sacrifice":return`o:"sacrifice" ${fQ} ${idQ}`;
    case"combat":return`(o:trample OR o:"double strike" OR o:"combat damage") ${fQ} ${idQ}`;
    case"lands":return`(o:landfall OR o:"whenever a land enters") ${fQ} ${idQ}`;
    default:return`t:creature ${fQ} ${idQ} cmc<=4`;
  }
}

// Helper: pick N cards from results that pass all filters
async function pickCards(query,target,deck,used,themes,brk,maxCmc,copies,typeFilter){
  let results=[];try{results=await doSearch(query,1);}catch{}
  const picked=[];
  for(const card of results){
    if(picked.length>=target)break;
    const key=card.name.toLowerCase();
    if(used.has(key))continue;
    if(/basic land/i.test(card.type||""))continue;
    if((card.cmc||0)>maxCmc)continue;
    if(isParasitic(card,themes))continue;
    if(!priceOk(card,brk))continue;
    if(typeFilter&&!typeFilter(card))continue;
    picked.push(card);
    used.add(key);
  }
  return picked;
}

export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress,bracket,refLists){
  const idOp=isCommander?"id":"c";
  const idQ=colors.length?`${idOp}<=${colors.join("")}`:"";
  const fQ=format?`f:${format}`:"";
  const brk=bracket||3;
  const themes=detectThemes(pivotCard?.oracle||"");
  const deck=[];const used=new Set();
  const copies=isCommander?1:4;
  const maxCmc=isCommander?99:5;

  // Use ref skeleton if available
  const skeleton=refLists?.length?extractSkeleton(refLists):null;
  let step=0;const total=10;
  const prog=(msg)=>{if(onProgress)onProgress(step++,total,msg);};
  const add=(cards,qty)=>{for(const c of cards){const q=qty||copies;for(let i=0;i<q;i++)deck.push({...c,qty:1});}};

  if(skeleton&&skeleton.core.length>=3){
    prog("Squelette de référence...");
    const coreCards=await fetchCardList(skeleton.core.map(c=>c.name));
    for(const card of coreCards){
      if(used.has(card.name.toLowerCase()))continue;
      if(!priceOk(card,brk))continue;
      if(/basic land/i.test(card.type||""))continue;
      add([card],isCommander?1:copies);
      used.add(card.name.toLowerCase());
    }
  }

  // ===== TEMPLATE: STRICT QUOTAS =====
  if(isCommander){
    // Commander template: 99 cards = 36 lands + 63 non-lands
    const SLOTS=[
      {name:"Créatures synergy",q:`t:creature ${synQ(themes[0],idQ,fQ)}`,target:20,filter:c=>/creature/i.test(c.type)},
      {name:"Créatures utility",q:`t:creature ${fQ} ${idQ} cmc<=3 (o:"add" OR o:"draw" OR o:"search")`,target:6,filter:c=>/creature/i.test(c.type)},
      {name:"Card draw",q:`(o:"draw a card" OR o:"draw cards") ${fQ} ${idQ} -t:land`,target:8,filter:null},
      {name:"Removal ciblé",q:`(o:"destroy target" OR o:"exile target") (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof -o:"you control"`,target:6,filter:null},
      {name:"Board wipes",q:`(o:"destroy all" OR o:"exile all" OR o:"all creatures get -") ${fQ} ${idQ}`,target:2,filter:null},
      {name:"Ramp",q:`(o:"search your library" o:"land" OR (t:creature o:"add" cmc<=2)) ${fQ} ${idQ}`,target:8,filter:null},
      {name:"Protection",q:`(o:hexproof OR o:indestructible) t:instant ${fQ} ${idQ} cmc<=2`,target:3,filter:null},
      {name:"Auras/Equipment",q:`(t:aura OR t:equipment) ${fQ} ${idQ} cmc<=3`,target:5,filter:null},
      {name:"Finishers",q:`t:creature ${fQ} ${idQ} cmc>=5 (o:trample OR o:"all creatures" OR pow>=6)`,target:3,filter:c=>/creature/i.test(c.type)},
    ];
    for(const slot of SLOTS){
      prog(slot.name+"...");
      const existing=deck.filter(c=>!/land/i.test(c.type||"")).length;
      if(existing>=63)break;
      const needed=Math.max(0,slot.target-0); // always try to fill
      const picked=await pickCards(slot.q,needed,deck,used,themes,brk,maxCmc,1,slot.filter);
      add(picked,1);
    }
  } else {
    // 60-card template: 22 lands + 38 non-lands = ~9-10 unique cards × 4
    const SLOTS=[
      {name:"Créatures core",q:`t:creature ${synQ(themes[0],idQ,fQ)} cmc<=3`,target:5,filter:c=>/creature/i.test(c.type)},
      {name:"Créatures mid",q:`t:creature ${fQ} ${idQ} cmc>=3 cmc<=5`,target:2,filter:c=>/creature/i.test(c.type)},
      {name:"Removal",q:`(o:"destroy target" OR o:"exile target") (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof -o:"you control"`,target:2,filter:null},
      {name:"Support",q:`(t:enchantment OR t:instant) ${fQ} ${idQ} ${synQ(themes[0],idQ,fQ)} cmc<=3`,target:1,filter:null},
    ];
    // Add pivot first
    if(pivotCard){add([pivotCard],copies);used.add(pivotCard.name.toLowerCase());}
    for(const slot of SLOTS){
      prog(slot.name+"...");
      const existing=deck.filter(c=>!/land/i.test(c.type||"")).length;
      if(existing>=38)break;
      const picked=await pickCards(slot.q,slot.target,deck,used,themes,brk,maxCmc,copies,slot.filter);
      add(picked,copies);
    }
  }

  // Fill any remaining non-land slots
  const nonLandTarget=isCommander?63:38;
  const currentNL=deck.filter(c=>!/land/i.test(c.type||"")).length;
  if(currentNL<nonLandTarget){
    prog("Remplissage...");
    const fillPicked=await pickCards(`t:creature ${fQ} ${idQ} cmc<=4`,nonLandTarget-currentNL,deck,used,themes,brk,maxCmc,copies,c=>/creature/i.test(c.type));
    add(fillPicked,isCommander?1:copies);
  }

  // LANDS — subtract existing
  prog("Terrains...");
  const landTarget=isCommander?36:22;
  const existingLands=deck.filter(c=>/land/i.test(c.type||"")).length;
  const basicsNeeded=Math.max(0,landTarget-existingLands);
  const landNames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  let la=0;
  if(colors.length>0&&basicsNeeded>0){
    const perCol=Math.max(1,Math.floor(basicsNeeded/colors.length));
    for(const col of colors){for(let i=0;i<perCol&&la<basicsNeeded;i++){deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}}
    while(la<basicsNeeded){const col=colors[la%colors.length];deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}
  }

  prog("Terminé !");
  return deck;
}
