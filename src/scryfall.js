const cache=new Map();const DELAY=120;let lastReq=0;
async function throttle(){const w=DELAY-(Date.now()-lastReq);if(w>0)await new Promise(r=>setTimeout(r,w));lastReq=Date.now();}
function parseCard(d){return{name:d.name,oracle:d.oracle_text||(d.card_faces?d.card_faces.map(f=>f.oracle_text).join("\n"):""),cmc:d.cmc||0,type:d.type_line||"",colors:d.colors||[],colorIdentity:d.color_identity||[],img:d.image_uris?.normal||d.card_faces?.[0]?.image_uris?.normal||null,imgSmall:d.image_uris?.small||d.card_faces?.[0]?.image_uris?.small||null,set:d.set_name||"",legalities:d.legalities||{},power:d.power||null,toughness:d.toughness||null,keywords:d.keywords||[],prices:{eur:d.prices?.eur,usd:d.prices?.usd},edhrecRank:d.edhrec_rank||99999};}
export async function searchCards(q){if(q.length<2)return[];const k=`ac:${q}`;if(cache.has(k))return cache.get(k);try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`);if(!r.ok)return[];const d=await r.json();cache.set(k,d.data||[]);return d.data||[];}catch{return[];}}
export async function fetchCard(name){const k=`c:${name.toLowerCase()}`;if(cache.has(k))return cache.get(k);try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);if(!r.ok)return null;const d=await r.json();const card=parseCard(d);cache.set(k,card);return card;}catch{return null;}}
export async function fetchCardList(names,onProgress){const results=[];for(let i=0;i<names.length;i+=75){const batch=names.slice(i,i+75);try{await throttle();const r=await fetch("https://api.scryfall.com/cards/collection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifiers:batch.map(n=>({name:n}))})});if(r.ok){const d=await r.json();for(const c of(d.data||[])){const card=parseCard(c);cache.set(`c:${c.name.toLowerCase()}`,card);results.push(card);}}if(onProgress)onProgress(Math.min(i+75,names.length),names.length);}catch{}}return results;}
async function doSearch(query,maxPages){const k=`s:${query}`;if(cache.has(k))return cache.get(k);const all=[];let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;for(let p=0;p<(maxPages||2)&&url;p++){try{await throttle();const r=await fetch(url);if(!r.ok)break;const d=await r.json();for(const c of(d.data||[]))all.push(parseCard(c));url=d.has_more?d.next_page:null;}catch{break;}}cache.set(k,all);return all;}
export async function scryfallSearch(q,mp){return doSearch(q,mp);}
export function parseDecklistText(text){const lines=text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("#"));const mb=[],sb=[];let inSB=false;for(const line of lines){if(/^sideboard:?$/i.test(line)){inSB=true;continue;}if(line===""){inSB=true;continue;}const m=line.match(/^(?:SB:\s*)?(\d+)x?\s+(.+?)(?:\s+\(.*\))?(?:\s+\d+)?$/i);if(m)(inSB?sb:mb).push({qty:parseInt(m[1]),name:m[2].trim()});}return{mainboard:mb,sideboard:sb};}
export function extractSkeleton(refLists){if(!refLists||!refLists.length)return null;const freq={};const total=refLists.length;for(const list of refLists){const seen=new Set();for(const entry of list){const key=entry.name.toLowerCase();if(!seen.has(key)){freq[key]=(freq[key]||0)+1;seen.add(key);}}}const sorted=Object.entries(freq).map(([name,count])=>({name,freq:count/total})).sort((a,b)=>b.freq-a.freq);return{core:sorted.filter(c=>c.freq>=0.5),flex:sorted.filter(c=>c.freq>=0.2&&c.freq<0.5)};}
export async function searchAlternatives(card,format,colors,isCommander){
  const idF=isCommander&&colors.length?`id<=${colors.join("")}`:colors.length?`c<=${colors.join("")}`:"";
  const fF=format?`f:${format}`:"";const t=(card.type||"").toLowerCase();
  let tQ=t.includes("creature")?"t:creature":t.includes("instant")?"t:instant":t.includes("sorcery")?"t:sorcery":t.includes("enchantment")?"t:enchantment":t.includes("artifact")?"t:artifact":"";
  if(!tQ)return[];
  return doSearch(`${tQ} ${fF} ${idF} cmc<=${Math.max((card.cmc||0)+1,3)} -!"${card.name}"`,1);
}

// === V20: SCORING ===
export function edhrecScore(card){
  const rank=card.edhrecRank||99999;
  if(rank<=100)return 18;if(rank<=500)return 15;if(rank<=1000)return 13;
  if(rank<=2000)return 11;if(rank<=5000)return 9;if(rank<=10000)return 7;
  if(rank<=20000)return 5;if(rank<=50000)return 3;return 1;
}

// === V20: ARCHETYPE DETECTION ===
export function detectArchetypes(oracle){
  const o=(oracle||"").toLowerCase();const a=[];
  if(/\+1\/\+1 counter|modified|enters with.*counter/i.test(o)){
    a.push({id:"counters_aggro",name:"Aggro +1/+1",desc:"Créatures rapides avec counters"});
    a.push({id:"counters_midrange",name:"Midrange Counters",desc:"Value long terme, créatures qui grossissent"});
  }
  if(/equip|equipment/i.test(o))a.push({id:"voltron",name:"Voltron",desc:"Un attaquant surpuissant"});
  if(/token|create.*creature/i.test(o))a.push({id:"tokens_go_wide",name:"Go-Wide Tokens",desc:"Submerger de tokens"});
  if(/sacrifice|dies|graveyard/i.test(o))a.push({id:"aristocrats",name:"Aristocrats",desc:"Sacrifice pour la value"});
  if(/combat damage|attack|trample/i.test(o))a.push({id:"combat_aggro",name:"Combat Aggro",desc:"Attaques puissantes"});
  if(/landfall|whenever a land/i.test(o))a.push({id:"landfall",name:"Landfall",desc:"Profiter des terrains"});
  if(a.length===0)a.push({id:"goodstuff",name:"Goodstuff",desc:"Les meilleures cartes"});
  return a.slice(0,4);
}

// === V20: TEMPLATES PAR ARCHÉTYPE ===
function getTemplate(archId,isCmd,cmdRamp){
  const ramp=cmdRamp?4:8;const extraSyn=cmdRamp?4:0;
  if(isCmd){
    const t={
      counters_aggro:{cr_syn:22+extraSyn,cr_util:4,ench_syn:7,removal:5,wipes:2,draw:8,ramp,prot:3,finish:3,lands:36},
      counters_midrange:{cr_syn:18+extraSyn,cr_util:5,ench_syn:8,removal:5,wipes:2,draw:9,ramp,prot:3,finish:3,lands:36},
      voltron:{cr_syn:10,cr_util:4,ench_syn:14,removal:6,wipes:2,draw:8,ramp:8,prot:5,finish:2,lands:36},
      tokens_go_wide:{cr_syn:20,cr_util:5,ench_syn:6,removal:5,wipes:2,draw:8,ramp:8,prot:3,finish:4,lands:36},
      aristocrats:{cr_syn:22,cr_util:6,ench_syn:5,removal:5,wipes:2,draw:8,ramp:8,prot:2,finish:3,lands:36},
      combat_aggro:{cr_syn:24+extraSyn,cr_util:3,ench_syn:5,removal:4,wipes:1,draw:7,ramp,prot:3,finish:3,lands:36},
      landfall:{cr_syn:18,cr_util:5,ench_syn:5,removal:5,wipes:2,draw:8,ramp:10,prot:3,finish:3,lands:38},
      goodstuff:{cr_syn:18+extraSyn,cr_util:5,ench_syn:6,removal:6,wipes:2,draw:8,ramp,prot:3,finish:3,lands:36},
    };
    return t[archId]||t.goodstuff;
  } else {
    // BUG 8 FIX: More unique cards for 60-card (13-15 uniques)
    const t={
      counters_aggro:{cr_core:6,cr_mid:2,ench_syn:2,removal:2,prot:1,lands:22},
      counters_midrange:{cr_core:5,cr_mid:2,ench_syn:2,removal:2,prot:1,draw:1,lands:23},
      voltron:{cr_core:3,cr_mid:1,ench_syn:4,removal:2,prot:2,lands:22},
      combat_aggro:{cr_core:7,cr_mid:1,ench_syn:1,removal:2,prot:1,lands:20},
      goodstuff:{cr_core:5,cr_mid:2,ench_syn:1,removal:2,prot:1,draw:1,lands:23},
    };
    return t[archId]||t.goodstuff;
  }
}

// === V20: WHITELIST — tighter, with negative patterns ===
function themeKW(archId){
  const kw={
    counters_aggro:["+1/+1","counter","modified","proliferate","adapt","evolve","riot","hydra","hardened","scale","trample","haste"],
    counters_midrange:["+1/+1","counter","modified","proliferate","adapt","evolve","value","draw"],
    voltron:["equip","equipment","aura","enchant","attach","sword","hexproof","indestructible","double strike"],
    tokens_go_wide:["token","create","populate","convoke","anthem","overrun"],
    aristocrats:["sacrifice","dies","death","graveyard","drain"],
    combat_aggro:["trample","haste","double strike","combat","attack","modified","+1/+1","counter"],
    landfall:["landfall","land","forest","search","ramp"],
    goodstuff:[],
  };
  return kw[archId]||[];
}

// BUG 2,3,9,10 FIX: Negative patterns — cards that LOOK synergistic but aren't
function isDisguisedParasite(card,archId,colors){
  const o=(card.oracle||"").toLowerCase();const n=(card.name||"").toLowerCase();const t=(card.type||"").toLowerCase();
  // Steel Overseer: only puts counters on artifact creatures
  if(/artifact creatures you control/i.test(o)&&archId!=="artifacts")return true;
  // Metallic Mimic / cards that say "choose a creature type" = tribal
  if(/choose a creature type/i.test(o))return true;
  // Solemn Simulacrum in aggro = too slow
  if(/solemn simulacrum/i.test(n)&&/aggro/i.test(archId))return true;
  // BUG 4: Farseek in mono-color that isn't in its search (Plains,Island,Swamp,Mountain)
  if(/farseek/i.test(n)&&colors.length===1)return true;
  // Nevinyrral's Disk in a deck with auras/equipment = kills your own stuff  
  if(/nevinyrral/i.test(n)&&(archId==="voltron"||archId.includes("counter")))return true;
  // BUG 9: Universes Beyond / crossover cards (Final Fantasy, LotR names)
  if(/summon:|chocobo|fenrir|sazh|noctis|lightning \(/i.test(n))return true;
  // Cards that only work with specific other colors
  if(/plains|island|swamp|mountain/i.test(o)&&/search your library/i.test(o)){
    const mentions=[];
    if(/plains/i.test(o))mentions.push("W");if(/island/i.test(o))mentions.push("U");
    if(/swamp/i.test(o))mentions.push("B");if(/mountain/i.test(o))mentions.push("R");
    // If none of the mentioned land types match our colors, reject
    if(mentions.length>0&&!mentions.some(m=>colors.includes(m))&&!/forest/i.test(o))return true;
  }
  return false;
}

function hasSynergy(card,archId){
  const kws=themeKW(archId);
  if(kws.length===0)return true;
  const o=(card.oracle||"").toLowerCase();const t=(card.type||"").toLowerCase();const n=(card.name||"").toLowerCase();
  const all=o+" "+t+" "+n;
  for(const kw of kws){if(all.includes(kw))return true;}
  // Universal staples (but tighter — only low CMC)
  if(card.cmc<=3&&/draw a card|destroy target|exile target|search your library.*land|add \{/i.test(o))return true;
  if(/hexproof|indestructible/i.test(o)&&t.includes("instant")&&card.cmc<=2)return true;
  // Fight spells count as removal for green
  if(/fight|bite/i.test(o)&&(t.includes("instant")||t.includes("sorcery")))return true;
  return false;
}

function priceOk(card,brk){
  const eur=parseFloat(card.prices?.eur)||0;
  if(!eur)return true;
  if(brk<=1&&eur>5)return false;if(brk<=2&&eur>15)return false;if(brk<=3&&eur>30)return false;
  return true;
}

// BUG 1 FIX: Score-based filter — reject cards with very low EDHREC rank
function scoreOk(card){
  return(card.edhrecRank||99999)<80000;
}

// === PICK HELPER ===
async function pick(query,target,used,archId,brk,maxCmc,colors,typeFilter){
  let res=[];try{res=await doSearch(query,1);}catch{}
  const out=[];
  for(const card of res){
    if(out.length>=target)break;
    const key=card.name.toLowerCase();
    if(used.has(key))continue;
    if(/basic land/i.test(card.type||""))continue;
    if((card.cmc||0)>maxCmc)continue;
    if(!hasSynergy(card,archId))continue;
    if(isDisguisedParasite(card,archId,colors))continue;
    if(!priceOk(card,brk))continue;
    if(!scoreOk(card))continue;
    if(typeFilter&&!typeFilter(card))continue;
    out.push(card);used.add(key);
  }
  return out;
}

// Synergy queries
function synQ(archId,idQ,fQ){
  const q={
    counters_aggro:`t:creature ${fQ} ${idQ} (o:"+1/+1 counter" OR o:modified OR o:adapt OR o:evolve) cmc<=4`,
    counters_midrange:`t:creature ${fQ} ${idQ} (o:"+1/+1 counter" OR o:proliferate OR o:evolve)`,
    voltron:`(t:equipment OR t:aura) ${fQ} ${idQ} cmc<=3`,
    tokens_go_wide:`${fQ} ${idQ} o:create o:token`,
    aristocrats:`t:creature ${fQ} ${idQ} (o:sacrifice OR o:dies)`,
    combat_aggro:`t:creature ${fQ} ${idQ} (o:trample OR o:haste OR o:"double strike" OR o:modified) cmc<=4`,
    landfall:`${fQ} ${idQ} (o:landfall OR o:"whenever a land enters")`,
    goodstuff:`t:creature ${fQ} ${idQ} cmc<=4`,
  };
  return q[archId]||q.goodstuff;
}

// BUG 11 FIX: Enchantment synergy queries — BEFORE removal
function enchQ(archId,idQ,fQ){
  const q={
    counters_aggro:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:"+1/+1" OR o:counter OR o:modified OR o:trample)`,
    counters_midrange:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:"+1/+1" OR o:counter OR o:draw)`,
    voltron:`(t:equipment OR t:aura) ${fQ} ${idQ}`,
    tokens_go_wide:`t:enchantment ${fQ} ${idQ} (o:token OR o:create OR o:"creatures you control")`,
    aristocrats:`t:enchantment ${fQ} ${idQ} (o:sacrifice OR o:dies)`,
    combat_aggro:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:trample OR o:"+1/+1" OR o:haste)`,
    goodstuff:`t:enchantment ${fQ} ${idQ}`,
  };
  return q[archId]||q.goodstuff;
}

// === MAIN GENERATOR V20 ===
export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress,bracket,refLists,archetype){
  const idOp=isCommander?"id":"c";
  const idQ=colors.length?`${idOp}<=${colors.join("")}`:"";
  const fQ=format?`f:${format}`:"";
  const brk=bracket||3;
  const archId=archetype||"goodstuff";
  const cmdRamp=/search.*land.*put.*battlefield|land.*onto the battlefield/i.test(pivotCard?.oracle||"");
  const tmpl=getTemplate(archId,isCommander,cmdRamp);
  const deckSize=isCommander?99:60; // BUG 6 FIX: hard cap
  const maxCmc=isCommander?99:5;
  const deck=[];const used=new Set();
  let step=0;const total=12;
  const prog=m=>{if(onProgress)onProgress(step++,total,m);};

  // BUG 6 FIX: Safe add that respects deck size
  const safeAdd=(cards,qty)=>{
    for(const c of cards){
      const q=qty||1;
      for(let i=0;i<q&&deck.length<deckSize;i++)deck.push({...c,qty:1});
    }
  };

  // BUG 7 FIX: Copies for 60-card — legendary = 2-3, normal = 4
  const getCopies=(card)=>{
    if(isCommander)return 1;
    if(/legendary/i.test(card.type||""))return 3;
    return 4;
  };

  // Ref skeleton
  const skeleton=refLists?.length?extractSkeleton(refLists):null;
  if(skeleton&&skeleton.core.length>=3){
    prog("Squelette...");
    const cc=await fetchCardList(skeleton.core.map(c=>c.name));
    for(const card of cc){
      if(used.has(card.name.toLowerCase())||!priceOk(card,brk)||/basic land/i.test(card.type||""))continue;
      if(isDisguisedParasite(card,archId,colors))continue;
      safeAdd([card],getCopies(card));used.add(card.name.toLowerCase());
    }
  }

  const nonLandTarget=deckSize-(tmpl.lands||36);
  const nlCount=()=>deck.filter(c=>!/land/i.test(c.type||"")).length;
  const isCr=c=>/creature/i.test(c.type);

  if(isCommander){
    // === COMMANDER ===
    prog("Créatures synergy...");
    safeAdd(await pick(synQ(archId,idQ,fQ),tmpl.cr_syn,used,archId,brk,maxCmc,colors,isCr),1);
    
    prog("Créatures utility...");
    safeAdd(await pick(`t:creature ${fQ} ${idQ} cmc<=3 (o:"add" OR o:"draw" OR o:"search your library")`,tmpl.cr_util,used,archId,brk,maxCmc,colors,isCr),1);
    
    // BUG 11 FIX: Enchantments BEFORE removal
    prog("Enchantements synergy...");
    safeAdd(await pick(enchQ(archId,idQ,fQ),tmpl.ench_syn,used,archId,brk,maxCmc,colors,null),1);
    
    prog("Pioche...");
    safeAdd(await pick(`(o:"draw a card" OR o:"draw cards") ${fQ} ${idQ} -t:land cmc<=4`,tmpl.draw,used,archId,brk,maxCmc,colors,null),1);
    
    // BUG 12 FIX: Include fight/bite in removal for green
    prog("Removal...");
    safeAdd(await pick(`(o:"destroy target" OR o:"exile target" OR o:fight OR o:"deals damage" o:"target creature") (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof -o:"you control get"`,tmpl.removal,used,"goodstuff",brk,maxCmc,colors,null),1);
    
    prog("Board wipes...");
    safeAdd(await pick(`(o:"destroy all" OR o:"all creatures get -") (t:sorcery OR t:instant) ${fQ} ${idQ}`,tmpl.wipes,used,"goodstuff",brk,maxCmc,colors,null),1);
    
    prog("Ramp...");
    safeAdd(await pick(`(o:"search your library" o:"basic land" OR (t:creature o:"add" cmc<=2)) ${fQ} ${idQ}`,tmpl.ramp,used,"goodstuff",brk,maxCmc,colors,null),1);
    
    prog("Protection...");
    safeAdd(await pick(`(o:hexproof OR o:indestructible) t:instant ${fQ} ${idQ} cmc<=2`,tmpl.prot,used,"goodstuff",brk,maxCmc,colors,null),1);
    
    prog("Finishers...");
    safeAdd(await pick(`t:creature ${fQ} ${idQ} cmc>=5 (o:trample OR pow>=6)`,tmpl.finish,used,archId,brk,maxCmc,colors,isCr),1);

  } else {
    // === 60-CARD ===
    // BUG 7: Pivot with legendary copies
    if(pivotCard){safeAdd([pivotCard],getCopies(pivotCard));used.add(pivotCard.name.toLowerCase());}
    
    // BUG 11: Enchantment synergy FIRST (Hardened Scales!)
    prog("Enchantements synergy...");
    const enchCards=await pick(enchQ(archId,idQ,fQ)+` cmc<=3`,tmpl.ench_syn||2,used,archId,brk,maxCmc,colors,null);
    for(const c of enchCards)safeAdd([c],getCopies(c));
    
    prog("Créatures core...");
    const coreCards=await pick(synQ(archId,idQ,fQ),tmpl.cr_core||5,used,archId,brk,maxCmc,colors,isCr);
    for(const c of coreCards)safeAdd([c],getCopies(c));
    
    prog("Créatures mid...");
    const midCards=await pick(`t:creature ${fQ} ${idQ} cmc>=3 cmc<=5`,tmpl.cr_mid||2,used,archId,brk,maxCmc,colors,isCr);
    for(const c of midCards)safeAdd([c],getCopies(c));
    
    // BUG 12: Fight spells for green removal
    prog("Removal...");
    const remCards=await pick(`(o:"destroy target" OR o:"exile target" OR o:fight) (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof`,tmpl.removal||2,used,"goodstuff",brk,maxCmc,colors,null);
    for(const c of remCards)safeAdd([c],getCopies(c));
    
    if(tmpl.prot){
      prog("Protection...");
      const protCards=await pick(`(o:hexproof OR o:indestructible) t:instant ${fQ} ${idQ} cmc<=2`,tmpl.prot,used,"goodstuff",brk,maxCmc,colors,null);
      for(const c of protCards)safeAdd([c],getCopies(c));
    }
    
    if(tmpl.draw){
      prog("Pioche...");
      const drawCards=await pick(`(o:"draw a card") ${fQ} ${idQ} -t:land cmc<=3`,tmpl.draw,used,archId,brk,maxCmc,colors,null);
      for(const c of drawCards)safeAdd([c],getCopies(c));
    }
  }

  // Fill remaining with on-theme creatures
  if(nlCount()<nonLandTarget){
    prog("Remplissage...");
    const needed=isCommander?(nonLandTarget-nlCount()):Math.ceil((nonLandTarget-nlCount())/4);
    const fill=await pick(`t:creature ${fQ} ${idQ} cmc<=4`,needed,used,archId,brk,maxCmc,colors,isCr);
    if(isCommander){safeAdd(fill,1);}else{for(const c of fill)safeAdd([c],getCopies(c));}
  }

  // LANDS
  prog("Terrains...");
  const existingLands=deck.filter(c=>/land/i.test(c.type||"")).length;
  const basicsNeeded=Math.max(0,deckSize-deck.length);
  const landNames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  let la=0;
  if(colors.length>0&&basicsNeeded>0){
    const perCol=Math.max(1,Math.floor(basicsNeeded/colors.length));
    for(const col of colors){for(let i=0;i<perCol&&la<basicsNeeded;i++){deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}}
    while(la<basicsNeeded&&deck.length<deckSize){const col=colors[la%colors.length];deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}
  }

  prog("Terminé !");
  return deck;
}
