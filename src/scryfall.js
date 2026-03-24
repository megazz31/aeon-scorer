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

// TYPE-AWARE alternatives
export async function searchAlternatives(card,format,colors,isCommander){
  const idF=isCommander&&colors.length?`id<=${colors.join("")}`:colors.length?`c<=${colors.join("")}`:"";
  const fF=format?`f:${format}`:"";
  const t=(card.type||"").toLowerCase();
  let tQ=t.includes("creature")?"t:creature":t.includes("instant")?"t:instant":t.includes("sorcery")?"t:sorcery":t.includes("enchantment")?"t:enchantment":t.includes("artifact")?"t:artifact":"";
  if(!tQ)return[];
  return doSearch(`${tQ} ${fF} ${idF} cmc<=${Math.max((card.cmc||0)+1,3)} -!"${card.name}"`,1);
}

// ====== V19: EDHREC-BASED SCORING ======
export function edhrecScore(card){
  const rank=card.edhrecRank||99999;
  if(rank<=100)return 18;
  if(rank<=500)return 15;
  if(rank<=1000)return 13;
  if(rank<=2000)return 11;
  if(rank<=5000)return 9;
  if(rank<=10000)return 7;
  if(rank<=20000)return 5;
  if(rank<=50000)return 3;
  return 1;
}

// ====== V19: ARCHETYPE DETECTION ======
export function detectArchetypes(oracle){
  const o=(oracle||"").toLowerCase();
  const archetypes=[];
  if(/\+1\/\+1 counter|modified|enters with.*counter/i.test(o)){
    archetypes.push({id:"counters_aggro",name:"Aggro +1/+1 Counters",desc:"Créatures rapides avec counters, attaques agressives"});
    archetypes.push({id:"counters_midrange",name:"Midrange Counters/Value",desc:"Value à long terme, créatures qui grossissent"});
  }
  if(/equip|equipment/i.test(o)){
    archetypes.push({id:"voltron",name:"Voltron Equipment",desc:"Un seul attaquant surpuissant avec equipment"});
  }
  if(/token|create.*creature/i.test(o)){
    archetypes.push({id:"tokens_go_wide",name:"Go-Wide Tokens",desc:"Submerger avec beaucoup de tokens"});
  }
  if(/sacrifice|dies|graveyard/i.test(o)){
    archetypes.push({id:"aristocrats",name:"Aristocrats/Sacrifice",desc:"Sacrifier pour de la value"});
  }
  if(/combat damage|attack|trample/i.test(o)){
    archetypes.push({id:"combat_aggro",name:"Combat Aggro",desc:"Attaques rapides et puissantes"});
  }
  if(/landfall|whenever a land/i.test(o)){
    archetypes.push({id:"landfall",name:"Landfall Value",desc:"Tirer profit des terrains qui arrivent"});
  }
  if(/draw|card advantage/i.test(o)){
    archetypes.push({id:"card_advantage",name:"Card Advantage Engine",desc:"Moteur de pioche et value"});
  }
  if(/spell|instant|sorcery|magecraft/i.test(o)){
    archetypes.push({id:"spellslinger",name:"Spellslinger",desc:"Instants et sorceries en masse"});
  }
  if(archetypes.length===0){
    archetypes.push({id:"goodstuff",name:"Goodstuff",desc:"Les meilleures cartes disponibles"});
  }
  return archetypes.slice(0,4);
}

// ====== V19: ARCHETYPE-SPECIFIC TEMPLATES ======
function getTemplate(archId,isCmd,cmdHasRamp){
  // cmdHasRamp = le commandant fait de la ramp (Kodama)
  const rampSlots=cmdHasRamp?4:8;
  const extraSyn=cmdHasRamp?4:0; // réallouer les slots ramp en synergy
  
  if(isCmd){
    const base={
      counters_aggro:{creatures_syn:22+extraSyn,creatures_util:5,enchant_syn:6,removal:5,wipes:2,draw:8,ramp:rampSlots,protection:3,finishers:3,lands:36},
      counters_midrange:{creatures_syn:18+extraSyn,creatures_util:6,enchant_syn:7,removal:6,wipes:2,draw:9,ramp:rampSlots,protection:3,finishers:4,lands:36},
      voltron:{creatures_syn:12,creatures_util:4,enchant_syn:12,removal:6,wipes:2,draw:8,ramp:8,protection:5,finishers:2,lands:36},
      tokens_go_wide:{creatures_syn:20,creatures_util:5,enchant_syn:6,removal:5,wipes:2,draw:8,ramp:8,protection:3,finishers:4,lands:36},
      aristocrats:{creatures_syn:22,creatures_util:6,enchant_syn:5,removal:5,wipes:2,draw:8,ramp:8,protection:2,finishers:3,lands:36},
      combat_aggro:{creatures_syn:24+extraSyn,creatures_util:4,enchant_syn:5,removal:5,wipes:1,draw:7,ramp:rampSlots,protection:3,finishers:3,lands:36},
      landfall:{creatures_syn:18,creatures_util:5,enchant_syn:5,removal:5,wipes:2,draw:8,ramp:10,protection:3,finishers:3,lands:38},
      spellslinger:{creatures_syn:10,creatures_util:4,enchant_syn:8,removal:8,wipes:3,draw:10,ramp:8,protection:4,finishers:4,lands:36},
      goodstuff:{creatures_syn:18+extraSyn,creatures_util:6,enchant_syn:5,removal:6,wipes:2,draw:8,ramp:rampSlots,protection:3,finishers:3,lands:36},
    };
    return base[archId]||base.goodstuff;
  } else {
    // 60-card: quotas are UNIQUE card count (each × 4 copies)
    const base={
      counters_aggro:{creatures_core:6,creatures_mid:1,removal:2,support:1,lands:22},
      counters_midrange:{creatures_core:4,creatures_mid:2,removal:2,support:2,lands:23},
      voltron:{creatures_core:3,creatures_mid:1,removal:2,support:4,lands:22},
      combat_aggro:{creatures_core:6,creatures_mid:2,removal:1,support:1,lands:20},
      goodstuff:{creatures_core:5,creatures_mid:2,removal:2,support:1,lands:23},
    };
    return base[archId]||base.goodstuff;
  }
}

// ====== V19: WHITELIST-BASED SYNERGY CHECK ======
// Instead of blacklisting parasites, we WHITELIST what's on-theme
function themeKeywords(archId){
  const kw={
    counters_aggro:["+1/+1","counter","modified","proliferate","adapt","evolve","riot","renown","mentor","hydra","scale","hardened"],
    counters_midrange:["+1/+1","counter","modified","proliferate","adapt","evolve","riot","value","draw","ramp"],
    voltron:["equip","equipment","aura","enchant","attach","sword","protection","hexproof","indestructible","double strike"],
    tokens_go_wide:["token","create","populate","convoke","anthem","overrun","stampede"],
    aristocrats:["sacrifice","dies","death","graveyard","blood artist","drain","aristocrat"],
    combat_aggro:["trample","haste","double strike","combat","attack","power","fight","modified","+1/+1"],
    landfall:["landfall","land","forest","search","ramp","land enters"],
    spellslinger:["instant","sorcery","cast","spell","copy","storm","magecraft"],
    goodstuff:[], // no filtering for goodstuff
  };
  return kw[archId]||[];
}

function hasThemeSynergy(card,archId,themes){
  const kws=themeKeywords(archId);
  if(kws.length===0)return true; // goodstuff = everything passes
  const o=(card.oracle||"").toLowerCase();
  const t=(card.type||"").toLowerCase();
  const n=(card.name||"").toLowerCase();
  const all=o+" "+t+" "+n;
  // Card must match at least 1 theme keyword
  for(const kw of kws){if(all.includes(kw))return true;}
  // Also allow: basic staples that any deck wants
  if(/draw a card|draw cards|destroy target|exile target|search your library.*land|add \{/i.test(o))return true;
  if(/hexproof|indestructible|protection from/i.test(o)&&t.includes("instant"))return true;
  return false;
}

function priceOk(card,brk){
  const eur=parseFloat(card.prices?.eur)||0;
  if(!eur)return true;
  if(brk<=1&&eur>5)return false;
  if(brk<=2&&eur>15)return false;
  if(brk<=3&&eur>30)return false;
  return true;
}

// Pick cards from search results with all filters
async function pick(query,target,used,archId,themes,brk,maxCmc,typeFilter){
  let res=[];try{res=await doSearch(query,1);}catch{}
  const out=[];
  for(const card of res){
    if(out.length>=target)break;
    const key=card.name.toLowerCase();
    if(used.has(key))continue;
    if(/basic land/i.test(card.type||""))continue;
    if((card.cmc||0)>maxCmc)continue;
    if(!hasThemeSynergy(card,archId,themes))continue;
    if(!priceOk(card,brk))continue;
    if(typeFilter&&!typeFilter(card))continue;
    out.push(card);used.add(key);
  }
  return out;
}

// Synergy query builder per archetype
function archSynQ(archId,idQ,fQ){
  const q={
    counters_aggro:`t:creature ${fQ} ${idQ} (o:"+1/+1 counter" OR o:modified OR o:adapt OR o:evolve)`,
    counters_midrange:`t:creature ${fQ} ${idQ} (o:"+1/+1 counter" OR o:proliferate OR o:evolve)`,
    voltron:`(t:equipment OR t:aura) ${fQ} ${idQ} cmc<=3`,
    tokens_go_wide:`${fQ} ${idQ} o:create o:token`,
    aristocrats:`t:creature ${fQ} ${idQ} (o:sacrifice OR o:dies)`,
    combat_aggro:`t:creature ${fQ} ${idQ} (o:trample OR o:haste OR o:"double strike" OR o:modified)`,
    landfall:`${fQ} ${idQ} (o:landfall OR o:"whenever a land enters")`,
    spellslinger:`${fQ} ${idQ} (o:"whenever you cast" OR o:magecraft)`,
    goodstuff:`t:creature ${fQ} ${idQ} cmc<=4`,
  };
  return q[archId]||q.goodstuff;
}

function archEnchQ(archId,idQ,fQ){
  const q={
    counters_aggro:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:"+1/+1" OR o:counter OR o:modified OR o:trample)`,
    counters_midrange:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:"+1/+1" OR o:counter OR o:draw)`,
    voltron:`(t:equipment OR t:aura) ${fQ} ${idQ}`,
    tokens_go_wide:`t:enchantment ${fQ} ${idQ} (o:token OR o:create OR o:"creatures you control")`,
    aristocrats:`t:enchantment ${fQ} ${idQ} (o:sacrifice OR o:dies OR o:graveyard)`,
    combat_aggro:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:trample OR o:haste OR o:"+1/+1" OR o:counter)`,
    landfall:`t:enchantment ${fQ} ${idQ} (o:land OR o:ramp)`,
    goodstuff:`t:enchantment ${fQ} ${idQ}`,
  };
  return q[archId]||q.goodstuff;
}

// ====== MAIN GENERATOR V19 ======
export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress,bracket,refLists,archetype){
  const idOp=isCommander?"id":"c";
  const idQ=colors.length?`${idOp}<=${colors.join("")}`:"";
  const fQ=format?`f:${format}`:"";
  const brk=bracket||3;
  const themes=detectArchetypes(pivotCard?.oracle||"").map(a=>a.id);
  const archId=archetype||themes[0]||"goodstuff";
  // Does the commander provide ramp?
  const cmdRamp=/search.*land.*put.*battlefield|land.*onto the battlefield/i.test(pivotCard?.oracle||"");
  const tmpl=getTemplate(archId,isCommander,cmdRamp);
  const deck=[];const used=new Set();
  const copies=isCommander?1:4;
  const maxCmc=isCommander?99:5;
  let step=0;const total=12;
  const prog=m=>{if(onProgress)onProgress(step++,total,m);};
  const add=(cards,qty)=>{for(const c of cards){for(let i=0;i<(qty||copies);i++)deck.push({...c,qty:1});}};

  // Ref skeleton if available
  const skeleton=refLists?.length?extractSkeleton(refLists):null;
  if(skeleton&&skeleton.core.length>=3){
    prog("Squelette référence...");
    const cc=await fetchCardList(skeleton.core.map(c=>c.name));
    for(const card of cc){if(used.has(card.name.toLowerCase())||!priceOk(card,brk)||/basic land/i.test(card.type||""))continue;add([card],isCommander?1:copies);used.add(card.name.toLowerCase());}
  }

  if(isCommander){
    // === COMMANDER GENERATION ===
    // Pivot card (commander is separate in Commander)
    
    // 1. Synergy creatures
    prog("Créatures synergy...");
    const synCr=await pick(archSynQ(archId,idQ,fQ),tmpl.creatures_syn,used,archId,themes,brk,maxCmc,c=>/creature/i.test(c.type));
    add(synCr,1);
    
    // 2. Utility creatures (dorks, draw, value)
    prog("Créatures utility...");
    const utilCr=await pick(`t:creature ${fQ} ${idQ} cmc<=3 (o:"add" OR o:"draw" OR o:"search your library")`,tmpl.creatures_util,used,archId,themes,brk,maxCmc,c=>/creature/i.test(c.type));
    add(utilCr,1);
    
    // 3. Enchantments/Auras/Equipment synergy
    prog("Enchantements/Auras...");
    const enchSyn=await pick(archEnchQ(archId,idQ,fQ),tmpl.enchant_syn,used,archId,themes,brk,maxCmc,null);
    add(enchSyn,1);
    
    // 4. Card draw
    prog("Pioche...");
    const draw=await pick(`(o:"draw a card" OR o:"draw cards") ${fQ} ${idQ} -t:land`,tmpl.draw,used,archId,themes,brk,maxCmc,null);
    add(draw,1);
    
    // 5. Removal (REAL removal, not protection)
    prog("Removal...");
    const rem=await pick(`(o:"destroy target" OR o:"exile target" OR o:fight) (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof -o:"you control get"`,tmpl.removal,used,"goodstuff",themes,brk,maxCmc,null);
    add(rem,1);
    
    // 6. Board wipes
    prog("Board wipes...");
    const wipes=await pick(`(o:"destroy all" OR o:"all creatures get -") ${fQ} ${idQ}`,tmpl.wipes,used,"goodstuff",themes,brk,maxCmc,null);
    add(wipes,1);
    
    // 7. Ramp
    prog("Ramp...");
    const ramp=await pick(`(o:"search your library" o:"land" OR (t:creature o:"add" cmc<=2)) ${fQ} ${idQ}`,tmpl.ramp,used,"goodstuff",themes,brk,maxCmc,null);
    add(ramp,1);
    
    // 8. Protection
    prog("Protection...");
    const prot=await pick(`(o:hexproof OR o:indestructible) t:instant ${fQ} ${idQ} cmc<=2`,tmpl.protection,used,"goodstuff",themes,brk,maxCmc,null);
    add(prot,1);
    
    // 9. Finishers
    prog("Finishers...");
    const fin=await pick(`t:creature ${fQ} ${idQ} cmc>=5 (o:trample OR pow>=6)`,tmpl.finishers,used,archId,themes,brk,maxCmc,c=>/creature/i.test(c.type));
    add(fin,1);

  } else {
    // === 60-CARD GENERATION ===
    if(pivotCard){add([pivotCard],copies);used.add(pivotCard.name.toLowerCase());}
    
    prog("Créatures core...");
    const core=await pick(archSynQ(archId,idQ,fQ)+` cmc<=3`,tmpl.creatures_core||5,used,archId,themes,brk,maxCmc,c=>/creature/i.test(c.type));
    add(core,copies);
    
    prog("Créatures mid...");
    const mid=await pick(`t:creature ${fQ} ${idQ} cmc>=3 cmc<=5`,tmpl.creatures_mid||2,used,archId,themes,brk,maxCmc,c=>/creature/i.test(c.type));
    add(mid,copies);
    
    prog("Removal...");
    const rem=await pick(`(o:"destroy target" OR o:"exile target") (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof`,tmpl.removal||2,used,"goodstuff",themes,brk,maxCmc,null);
    add(rem,copies);
    
    prog("Support...");
    const sup=await pick(archEnchQ(archId,idQ,fQ)+` cmc<=3`,tmpl.support||1,used,archId,themes,brk,maxCmc,null);
    add(sup,copies);
  }

  // Fill remaining
  const targetNL=isCommander?(99-tmpl.lands):(60-(tmpl.lands||22));
  const currentNL=deck.filter(c=>!/land/i.test(c.type||"")).length;
  if(currentNL<targetNL){
    prog("Remplissage...");
    const fill=await pick(`t:creature ${fQ} ${idQ} cmc<=4`,Math.ceil((targetNL-currentNL)/(isCommander?1:copies)),used,archId,themes,brk,maxCmc,c=>/creature/i.test(c.type));
    add(fill,isCommander?1:copies);
  }

  // LANDS
  prog("Terrains...");
  const existingLands=deck.filter(c=>/land/i.test(c.type||"")).length;
  const basicsNeeded=Math.max(0,(tmpl.lands||36)-existingLands);
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
