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

// ====== V16: REFERENCE-DRIVEN DECK BUILDING ======

// Extract a skeleton from multiple reference decklists
// Returns: {core: [{name,freq}], flex: [{name,freq}], avgLands, avgCreatures, avgCmc}
export function extractSkeleton(refLists){
  if(!refLists||!refLists.length)return null;
  const freq={};const total=refLists.length;
  let totalLands=0,totalCreatures=0,totalCmc=0,totalCards=0;
  for(const list of refLists){
    const seen=new Set();
    for(const entry of list){
      const key=entry.name.toLowerCase();
      if(!seen.has(key)){freq[key]=(freq[key]||0)+1;seen.add(key);}
      if(/land/i.test(entry.type||""))totalLands+=entry.qty;
      if(/creature/i.test(entry.type||""))totalCreatures+=entry.qty;
      if(entry.cmc)totalCmc+=entry.cmc*entry.qty;
      totalCards+=entry.qty;
    }
  }
  const sorted=Object.entries(freq).map(([name,count])=>({name,freq:count/total})).sort((a,b)=>b.freq-a.freq);
  const core=sorted.filter(c=>c.freq>=0.5); // in 50%+ of lists
  const flex=sorted.filter(c=>c.freq>=0.2&&c.freq<0.5);
  return{core,flex,avgLands:Math.round(totalLands/total),avgCreatures:Math.round(totalCreatures/total),avgCmc:Math.round(totalCmc/totalCards*10)/10};
}

// Detect themes from oracle text
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

function themeQueries(theme,idQ,fQ){
  switch(theme){
    case"counters":return[
      {q:`t:creature ${fQ} ${idQ} o:"+1/+1 counter"`,label:"Créatures +1/+1"},
      {q:`(t:instant OR t:sorcery OR t:enchantment) ${fQ} ${idQ} o:"+1/+1 counter"`,label:"Support +1/+1"},
    ];
    case"equipment":return[{q:`t:equipment ${fQ} ${idQ} cmc<=3`,label:"Equipment"}];
    case"auras":return[{q:`t:aura ${fQ} ${idQ} -o:"enchant land" cmc<=3`,label:"Auras"}];
    case"tokens":return[{q:`${fQ} ${idQ} o:"create" o:"token" -t:land`,label:"Tokens"}];
    case"sacrifice":return[
      {q:`t:creature ${fQ} ${idQ} o:"sacrifice"`,label:"Sacrifice"},
      {q:`t:creature ${fQ} ${idQ} o:"when" o:"dies"`,label:"Death triggers"},
    ];
    case"combat":return[{q:`t:creature ${fQ} ${idQ} (o:trample OR o:"double strike" OR o:"combat damage")`,label:"Combat"}];
    case"lands":return[{q:`${fQ} ${idQ} (o:landfall OR o:"whenever a land enters")`,label:"Landfall"}];
    default:return[{q:`t:creature ${fQ} ${idQ} cmc<=4`,label:"Creatures"}];
  }
}

// Reject cards with parasitic synergies that don't match our themes
function isParasitic(card,themes){
  const o=(card.oracle||"").toLowerCase();const n=(card.name||"").toLowerCase();
  // Tribal lords without matching tribal theme
  if(/elf|elves|goblin|merfolk|zombie|vampire|human|angel|dragon|dinosaur/.test(n)&&
    /you control get|you control have/.test(o)&&!themes.includes("tribal"))return true;
  // Storm/spell count without spellslinger
  if(/(storm|aetherflux|thousand-year|grapeshot)/i.test(n))return true;
  if(/cast.*this turn|for each.*spell.*cast/i.test(o)&&!themes.includes("spells"))return true;
  // Pure lifegain payoff
  if(/whenever you gain life|you gained life this turn/i.test(o)&&!themes.includes("lifegain"))return true;
  // Mill
  if(/mill|into.*graveyard.*from.*library/i.test(o)&&!themes.includes("mill"))return true;
  // Discard
  if(/madness|whenever you discard/i.test(o)&&!themes.includes("discard"))return true;
  return false;
}

// Price filter based on bracket
function priceOk(card,bracket){
  const eur=parseFloat(card.prices?.eur)||0;
  if(bracket<=1&&eur>5)return false;
  if(bracket<=2&&eur>15)return false;
  if(bracket<=3&&eur>30)return false;
  return true;
}

const FMT_RULES={
  commander:{lands:37,removal:7,protection:3,draw:6,ramp:6,creatures_min:22,copies:1,maxCmc:99},
  modern:{lands:22,removal:4,protection:2,draw:2,ramp:2,creatures_min:12,copies:4,maxCmc:5},
  standard:{lands:24,removal:4,protection:2,draw:3,ramp:2,creatures_min:14,copies:4,maxCmc:6},
  pioneer:{lands:23,removal:4,protection:2,draw:3,ramp:2,creatures_min:12,copies:4,maxCmc:5},
  legacy:{lands:20,removal:6,protection:2,draw:3,ramp:2,creatures_min:10,copies:4,maxCmc:4},
  "default":{lands:23,removal:4,protection:2,draw:3,ramp:2,creatures_min:14,copies:4,maxCmc:6},
};

// ====== MAIN GENERATOR V16 ======
export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress,bracket,refLists){
  const rules=FMT_RULES[format]||FMT_RULES[isCommander?"commander":"default"];
  const idOp=isCommander?"id":"c";
  const idQ=colors.length?`${idOp}<=${colors.join("")}`:"";
  const fQ=format?`f:${format}`:"";
  const deckSize=isCommander?99:60;
  const copies=rules.copies;
  const themes=detectThemes(pivotCard?.oracle||"");
  const brk=bracket||3;

  // STEP 1: Try to use reference skeleton
  const skeleton=refLists?.length?extractSkeleton(refLists):null;
  const deck=[];
  const used=new Set();
  let totalSteps=10;let completed=0;

  if(skeleton&&skeleton.core.length>=5){
    // REFERENCE-DRIVEN: Start from skeleton core
    if(onProgress)onProgress(0,totalSteps,"Chargement du squelette...");
    const coreNames=skeleton.core.map(c=>c.name);
    const coreCards=await fetchCardList(coreNames,(c,t)=>{if(onProgress)onProgress(0,totalSteps,`Core: ${c}/${t}`);});
    for(const card of coreCards){
      if(used.has(card.name.toLowerCase()))continue;
      if(!priceOk(card,brk))continue;
      const qty=isCommander?1:Math.min(copies,4);
      for(let i=0;i<qty;i++)deck.push({...card,qty:1});
      used.add(card.name.toLowerCase());
    }
    completed=2;
    // Add flex cards that pass filters
    if(skeleton.flex.length>0){
      if(onProgress)onProgress(completed,totalSteps,"Flex slots...");
      const flexNames=skeleton.flex.map(c=>c.name);
      const flexCards=await fetchCardList(flexNames);
      for(const card of flexCards){
        if(deck.filter(c=>!/land/i.test(c.type||"")).length>=deckSize-rules.lands)break;
        if(used.has(card.name.toLowerCase()))continue;
        if(!priceOk(card,brk))continue;
        if(isParasitic(card,themes))continue;
        const qty=isCommander?1:Math.min(copies,4);
        if(deck.filter(c=>!/land/i.test(c.type||"")).length+qty>deckSize-rules.lands)continue;
        for(let i=0;i<qty;i++)deck.push({...card,qty:1});
        used.add(card.name.toLowerCase());
      }
    }
    completed=4;
  }

  // STEP 2: Fill remaining slots with Scryfall search (theme-based)
  const nonLandTarget=deckSize-rules.lands;
  const currentNL=()=>deck.filter(c=>!/land/i.test(c.type||"")).length;

  if(currentNL()<nonLandTarget){
    // Synergy slots
    const tQueries=themes.flatMap(t=>themeQueries(t,idQ,fQ));
    const synergyNeeded=Math.max(0,nonLandTarget-currentNL()-(rules.removal+rules.protection+rules.draw+rules.ramp));
    const perQ=Math.ceil(synergyNeeded/(Math.max(1,tQueries.length)*(isCommander?1:copies)));
    
    for(const tq of tQueries){
      if(currentNL()>=nonLandTarget)break;
      if(onProgress)onProgress(completed++,totalSteps,`${tq.label}...`);
      let results=[];try{results=await doSearch(tq.q,1);}catch{}
      let added=0;
      for(const card of results){
        if(added>=perQ||currentNL()>=nonLandTarget)break;
        const key=card.name.toLowerCase();
        if(used.has(key))continue;
        if(/basic land/i.test(card.type||""))continue;
        if((card.cmc||0)>rules.maxCmc)continue;
        if(isParasitic(card,themes))continue;
        if(!priceOk(card,brk))continue;
        const qty=isCommander?1:copies;
        if(currentNL()+qty>nonLandTarget)continue;
        for(let i=0;i<qty;i++)deck.push({...card,qty:1});
        used.add(key);added++;
      }
    }
  }

  // STEP 3: Mandatory slots — REMOVAL (not protection!)
  if(currentNL()<nonLandTarget){
    if(onProgress)onProgress(completed++,totalSteps,"Removal...");
    const removalQ=`(o:"destroy target" OR o:"exile target") (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof -o:indestructible -o:"you control get" -o:"you control have"`;
    let res=[];try{res=await doSearch(removalQ,1);}catch{}
    let added=0;const target=isCommander?rules.removal:Math.ceil(rules.removal/copies);
    for(const card of res){
      if(added>=target||currentNL()>=nonLandTarget)break;
      const key=card.name.toLowerCase();if(used.has(key))continue;
      if((card.cmc||0)>rules.maxCmc)continue;if(!priceOk(card,brk))continue;
      const qty=isCommander?1:copies;if(currentNL()+qty>nonLandTarget)continue;
      for(let i=0;i<qty;i++)deck.push({...card,qty:1});used.add(key);added++;
    }
  }

  // STEP 4: Protection
  if(currentNL()<nonLandTarget){
    if(onProgress)onProgress(completed++,totalSteps,"Protection...");
    const protQ=`(o:hexproof OR o:indestructible) t:instant ${fQ} ${idQ} cmc<=2`;
    let res=[];try{res=await doSearch(protQ,1);}catch{}
    let added=0;const target=isCommander?rules.protection:Math.ceil(rules.protection/copies);
    for(const card of res){
      if(added>=target||currentNL()>=nonLandTarget)break;
      const key=card.name.toLowerCase();if(used.has(key))continue;
      if(!priceOk(card,brk))continue;
      const qty=isCommander?1:copies;if(currentNL()+qty>nonLandTarget)continue;
      for(let i=0;i<qty;i++)deck.push({...card,qty:1});used.add(key);added++;
    }
  }

  // STEP 5: Draw
  if(currentNL()<nonLandTarget){
    if(onProgress)onProgress(completed++,totalSteps,"Pioche...");
    const drawQ=`(o:"draw a card") ${fQ} ${idQ} -t:land (t:instant OR t:sorcery OR t:enchantment) cmc<=4`;
    let res=[];try{res=await doSearch(drawQ,1);}catch{}
    let added=0;const target=isCommander?rules.draw:Math.ceil(rules.draw/copies);
    for(const card of res){
      if(added>=target||currentNL()>=nonLandTarget)break;
      const key=card.name.toLowerCase();if(used.has(key))continue;
      if(isParasitic(card,themes))continue;if(!priceOk(card,brk))continue;
      const qty=isCommander?1:copies;if(currentNL()+qty>nonLandTarget)continue;
      for(let i=0;i<qty;i++)deck.push({...card,qty:1});used.add(key);added++;
    }
  }

  // STEP 6: Ramp
  if(currentNL()<nonLandTarget){
    if(onProgress)onProgress(completed++,totalSteps,"Ramp...");
    const rampQ=`(o:"add" o:"mana" OR o:"search" o:"basic land") ${fQ} ${idQ} cmc<=3 -t:land`;
    let res=[];try{res=await doSearch(rampQ,1);}catch{}
    let added=0;const target=isCommander?rules.ramp:Math.ceil(rules.ramp/copies);
    for(const card of res){
      if(added>=target||currentNL()>=nonLandTarget)break;
      const key=card.name.toLowerCase();if(used.has(key))continue;
      if(isParasitic(card,themes))continue;if(!priceOk(card,brk))continue;
      const qty=isCommander?1:copies;if(currentNL()+qty>nonLandTarget)continue;
      for(let i=0;i<qty;i++)deck.push({...card,qty:1});used.add(key);added++;
    }
  }

  // STEP 7: Fill remaining with on-theme creatures (ensure creature minimum)
  const creatureCount=deck.filter(c=>/creature/i.test(c.type||"")).length;
  if(creatureCount<rules.creatures_min&&currentNL()<nonLandTarget){
    if(onProgress)onProgress(completed++,totalSteps,"Créatures...");
    const crQ=`t:creature ${fQ} ${idQ} cmc<=4`;
    let res=[];try{res=await doSearch(crQ,1);}catch{}
    for(const card of res){
      if(deck.filter(c=>/creature/i.test(c.type||"")).length>=rules.creatures_min)break;
      if(currentNL()>=nonLandTarget)break;
      const key=card.name.toLowerCase();if(used.has(key))continue;
      if(/basic land/i.test(card.type||""))continue;
      if(isParasitic(card,themes))continue;if(!priceOk(card,brk))continue;
      if((card.cmc||0)>rules.maxCmc)continue;
      const qty=isCommander?1:copies;if(currentNL()+qty>nonLandTarget)continue;
      for(let i=0;i<qty;i++)deck.push({...card,qty:1});used.add(key);
    }
  }

  // STEP 8: LANDS — count ALL existing lands first
  if(onProgress)onProgress(completed++,totalSteps,"Terrains...");
  const existingLands=deck.filter(c=>/land/i.test(c.type||"")).length;
  const basicsNeeded=Math.max(0,rules.lands-existingLands);
  const landNames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  let la=0;
  if(colors.length>0&&basicsNeeded>0){
    const perCol=Math.max(1,Math.floor(basicsNeeded/colors.length));
    for(const col of colors){for(let i=0;i<perCol&&la<basicsNeeded;i++){deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}}
    while(la<basicsNeeded){const col=colors[la%colors.length];deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}
  }

  if(onProgress)onProgress(totalSteps,totalSteps,"Terminé !");
  return deck;
}
