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
export async function searchAlternatives(card,format,colors,isCommander){const idF=isCommander&&colors.length?`id<=${colors.join("")}`:colors.length?`c<=${colors.join("")}`:"";const fF=format?`f:${format}`:"";const t=(card.type||"").toLowerCase();let tQ=t.includes("creature")?"t:creature":t.includes("instant")?"t:instant":t.includes("sorcery")?"t:sorcery":t.includes("enchantment")?"t:enchantment":t.includes("artifact")?"t:artifact":"";if(!tQ)return[];return doSearch(`${tQ} ${fF} ${idF} cmc<=${Math.max((card.cmc||0)+1,3)} -!"${card.name}"`,1);}
export function edhrecScore(card){const rank=card.edhrecRank||99999;if(rank<=100)return 18;if(rank<=500)return 15;if(rank<=1000)return 13;if(rank<=2000)return 11;if(rank<=5000)return 9;if(rank<=10000)return 7;if(rank<=20000)return 5;if(rank<=50000)return 3;return 1;}
export function detectArchetypes(oracle){const o=(oracle||"").toLowerCase();const a=[];if(/\+1\/\+1 counter|modified|enters with.*counter/i.test(o)){a.push({id:"counters_aggro",name:"Aggro +1/+1",desc:"Créatures rapides avec counters"});a.push({id:"counters_midrange",name:"Midrange Counters",desc:"Value, créatures qui grossissent"});}if(/equip|equipment/i.test(o))a.push({id:"voltron",name:"Voltron",desc:"Un attaquant surpuissant"});if(/token|create.*creature/i.test(o))a.push({id:"tokens_go_wide",name:"Go-Wide Tokens",desc:"Submerger de tokens"});if(/sacrifice|dies|graveyard/i.test(o))a.push({id:"aristocrats",name:"Aristocrats",desc:"Sacrifice value"});if(/combat damage|attack|trample/i.test(o))a.push({id:"combat_aggro",name:"Combat Aggro",desc:"Attaques puissantes"});if(/landfall|whenever a land/i.test(o))a.push({id:"landfall",name:"Landfall",desc:"Profiter des terrains"});if(a.length===0)a.push({id:"goodstuff",name:"Goodstuff",desc:"Les meilleures cartes"});return a.slice(0,4);}

// === V22: DETECT TRIBAL FROM PIVOT ===
function detectTribal(pivotCard){
  const o=(pivotCard?.oracle||"").toLowerCase();const t=(pivotCard?.type||"").toLowerCase();
  const tribes=["angel","vampire","elf","goblin","merfolk","zombie","human","dragon","dinosaur","spirit","wizard","warrior","knight","cleric","rogue","shaman","beast","elemental","artifact creature","wall","cat","dog","bird","faerie","soldier","pirate","demon","horror"];
  for(const tribe of tribes){
    if(o.includes(tribe+"s you control")||o.includes(tribe+" you control")||
       o.includes("other "+tribe)||o.includes("each "+tribe)||
       (t.includes(tribe)&&/lord|anthem|whenever.*another/i.test(o)))return tribe;
  }
  return null;
}

// === V22: SMART COPY COUNT ===
// 4× = core plan card, 3× = important support, 2× = situational/expensive, 1× = legendary tech
function smartCopies(card,isPivot,isCore){
  if(/legendary/i.test(card.type||"")){
    if(isPivot)return 4; // pivot always 4 even if legendary
    return 2; // other legendaries = 2×
  }
  if(isPivot)return 4;
  if(isCore)return 4;
  if((card.cmc||0)>=4)return 3; // expensive = 3×
  if((card.cmc||0)>=5)return 2; // very expensive = 2×
  return 4;
}

// === V22: FILTERS (from v21, improved) ===
function themeKW(archId,tribal){
  const base={counters_aggro:["+1/+1","counter","modified","proliferate","adapt","evolve","hydra","hardened","trample","haste"],counters_midrange:["+1/+1","counter","modified","proliferate","adapt","evolve","hardened","draw"],voltron:["equip","equipment","aura","enchant","attach","sword","hexproof","double strike"],tokens_go_wide:["token","create","populate","convoke","anthem","overrun"],aristocrats:["sacrifice","dies","death","graveyard","drain"],combat_aggro:["trample","haste","double strike","combat","attack","modified","+1/+1","counter"],landfall:["landfall","land","search","ramp"],goodstuff:[]};
  const kw=base[archId]||[];
  if(tribal)kw.push(tribal); // add tribal keyword
  return kw;
}

function isDisguised(card,archId,colors,hasEnch){
  const o=(card.oracle||"").toLowerCase();const n=(card.name||"").toLowerCase();
  if(/each artifact creature|artifact creatures? you control/i.test(o)&&archId!=="artifacts")return true;
  if(/choose a creature type/i.test(o))return true;
  if(/solemn simulacrum/i.test(n)&&/aggro/i.test(archId))return true;
  if(/burnished hart/i.test(n)&&/aggro/i.test(archId))return true;
  if(/palladium myr/i.test(n))return true;
  if(/farseek/i.test(n)&&colors.length===1)return true;
  if(/nevinyrral/i.test(n)&&hasEnch)return true;
  if(/destroy all artifact|destroy all enchantment|destroy all nonland/i.test(o)&&hasEnch)return true;
  if(/summon:|chocobo|fenrir|sazh|noctis/i.test(n))return true;
  if(/plains|island|swamp|mountain/i.test(o)&&/search your library/i.test(o)){
    const m=[];if(/plains/i.test(o))m.push("W");if(/island/i.test(o))m.push("U");if(/swamp/i.test(o))m.push("B");if(/mountain/i.test(o))m.push("R");
    if(m.length>0&&!m.some(x=>colors.includes(x))&&!/forest/i.test(o))return true;
  }
  return false;
}

function hasSynergy(card,archId,tribal){
  const kws=themeKW(archId,tribal);
  if(kws.length===0)return true;
  const o=(card.oracle||"").toLowerCase();const t=(card.type||"").toLowerCase();const n=(card.name||"").toLowerCase();
  const all=o+" "+t+" "+n;
  for(const kw of kws){if(all.includes(kw))return true;}
  if(card.cmc<=3&&/destroy target|exile target/i.test(o))return true;
  if(card.cmc<=2&&/hexproof|indestructible/i.test(o)&&t.includes("instant"))return true;
  if(card.cmc<=2&&/fight|bite/i.test(o))return true;
  if(card.cmc<=2&&t.includes("creature")&&/add \{/i.test(o))return true;
  if(/draw a card/i.test(o)&&card.cmc<=3)return true;
  return false;
}

function priceOk(card,brk){const eur=parseFloat(card.prices?.eur)||0;if(!eur)return true;if(brk<=1&&eur>5)return false;if(brk<=2&&eur>15)return false;if(brk<=3&&eur>30)return false;return true;}

async function pick(query,target,used,archId,brk,maxCmc,colors,typeFilter,hasEnch,tribal){
  let res=[];try{res=await doSearch(query,1);}catch{}
  const out=[];
  for(const card of res){
    if(out.length>=target)break;
    const key=card.name.toLowerCase();if(used.has(key))continue;
    if(/basic land/i.test(card.type||""))continue;
    if((card.cmc||0)>maxCmc)continue;
    if(!hasSynergy(card,archId,tribal))continue;
    if(isDisguised(card,archId,colors,hasEnch))continue;
    if(!priceOk(card,brk))continue;
    if(typeFilter&&!typeFilter(card))continue;
    out.push(card);used.add(key);
  }
  return out;
}

// === V22: QUERIES ===
function synQ(archId,idQ,fQ,tribal){
  if(tribal)return`t:creature ${fQ} ${idQ} t:${tribal}`;
  const q={counters_aggro:`t:creature ${fQ} ${idQ} (o:"+1/+1" OR o:counter OR o:modified OR o:adapt) cmc<=4`,counters_midrange:`t:creature ${fQ} ${idQ} (o:"+1/+1" OR o:counter OR o:proliferate)`,voltron:`(t:equipment OR t:aura) ${fQ} ${idQ} cmc<=3`,tokens_go_wide:`${fQ} ${idQ} o:create o:token`,aristocrats:`t:creature ${fQ} ${idQ} (o:sacrifice OR o:dies)`,combat_aggro:`t:creature ${fQ} ${idQ} (o:trample OR o:haste OR o:"double strike") cmc<=4`,landfall:`${fQ} ${idQ} (o:landfall OR o:"whenever a land enters")`,goodstuff:`t:creature ${fQ} ${idQ} cmc<=4`};
  return q[archId]||q.goodstuff;
}
function enchQ(archId,idQ,fQ){
  const q={counters_aggro:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:counter OR o:"+1" OR o:modified OR o:trample)`,counters_midrange:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:counter OR o:"+1" OR o:draw)`,voltron:`(t:equipment OR t:aura) ${fQ} ${idQ}`,tokens_go_wide:`t:enchantment ${fQ} ${idQ} (o:token OR o:create)`,aristocrats:`t:enchantment ${fQ} ${idQ} (o:sacrifice OR o:dies)`,combat_aggro:`(t:enchantment OR t:aura) ${fQ} ${idQ} (o:trample OR o:"+1" OR o:haste)`,goodstuff:`t:enchantment ${fQ} ${idQ}`};
  return q[archId]||q.goodstuff;
}

// === V22: TEMPLATES ===
function getTemplate(archId,isCmd,cmdRamp,compLevel){
  const ramp=cmdRamp?4:8;const extra=cmdRamp?4:0;
  // compLevel: 1=casual/fun, 2=mid, 3=focused, 4=optimized, 5=cedh
  const interactionMult=compLevel<=2?0.7:compLevel>=4?1.3:1.0;
  if(isCmd){
    const t={counters_aggro:{cr_syn:22+extra,cr_util:4,ench_syn:7,removal:Math.round(5*interactionMult),wipes:2,draw:8,ramp,prot:3,finish:3,lands:36,maxCmc:7},counters_midrange:{cr_syn:18+extra,cr_util:5,ench_syn:8,removal:Math.round(5*interactionMult),wipes:2,draw:9,ramp,prot:3,finish:3,lands:36,maxCmc:8},voltron:{cr_syn:10,cr_util:4,ench_syn:14,removal:Math.round(6*interactionMult),wipes:2,draw:8,ramp:8,prot:5,finish:2,lands:36,maxCmc:7},tokens_go_wide:{cr_syn:20,cr_util:5,ench_syn:6,removal:Math.round(5*interactionMult),wipes:2,draw:8,ramp:8,prot:3,finish:4,lands:36,maxCmc:8},aristocrats:{cr_syn:22,cr_util:6,ench_syn:5,removal:Math.round(5*interactionMult),wipes:2,draw:8,ramp:8,prot:2,finish:3,lands:36,maxCmc:8},combat_aggro:{cr_syn:24+extra,cr_util:3,ench_syn:5,removal:Math.round(4*interactionMult),wipes:1,draw:7,ramp,prot:3,finish:3,lands:36,maxCmc:7},landfall:{cr_syn:18,cr_util:5,ench_syn:5,removal:Math.round(5*interactionMult),wipes:2,draw:8,ramp:10,prot:3,finish:3,lands:38,maxCmc:8},goodstuff:{cr_syn:18+extra,cr_util:5,ench_syn:6,removal:Math.round(6*interactionMult),wipes:2,draw:8,ramp,prot:3,finish:3,lands:36,maxCmc:8}};
    return t[archId]||t.goodstuff;
  } else {
    // V22: 60-card — more uniques, variable copies
    // ~14-16 unique non-land cards, mix of 4/3/2 copies
    const t={
      counters_aggro:{slots:[{role:"ench_syn",q:"ench",n:2},{role:"cr_core",q:"syn",n:6},{role:"cr_mid",q:"mid",n:2},{role:"removal",q:"rem",n:1},{role:"prot",q:"prot",n:1}],lands:22,maxCmc:4},
      counters_midrange:{slots:[{role:"ench_syn",q:"ench",n:2},{role:"cr_core",q:"syn",n:5},{role:"cr_mid",q:"mid",n:2},{role:"removal",q:"rem",n:2},{role:"draw",q:"draw",n:1},{role:"prot",q:"prot",n:1}],lands:23,maxCmc:5},
      combat_aggro:{slots:[{role:"cr_core",q:"syn",n:7},{role:"cr_mid",q:"mid",n:1},{role:"ench_syn",q:"ench",n:1},{role:"removal",q:"rem",n:1},{role:"prot",q:"prot",n:1}],lands:20,maxCmc:4},
      tokens_go_wide:{slots:[{role:"cr_core",q:"syn",n:5},{role:"ench_syn",q:"ench",n:2},{role:"cr_mid",q:"mid",n:2},{role:"removal",q:"rem",n:2},{role:"prot",q:"prot",n:1}],lands:22,maxCmc:5},
      aristocrats:{slots:[{role:"cr_core",q:"syn",n:6},{role:"cr_mid",q:"mid",n:2},{role:"ench_syn",q:"ench",n:1},{role:"removal",q:"rem",n:2},{role:"draw",q:"draw",n:1}],lands:23,maxCmc:5},
      goodstuff:{slots:[{role:"cr_core",q:"syn",n:5},{role:"cr_mid",q:"mid",n:2},{role:"ench_syn",q:"ench",n:1},{role:"removal",q:"rem",n:2},{role:"prot",q:"prot",n:1},{role:"draw",q:"draw",n:1}],lands:23,maxCmc:5},
    };
    return t[archId]||t.goodstuff;
  }
}

// === V22: MAIN GENERATOR ===
export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress,bracket,refLists,archetype){
  const idOp=isCommander?"id":"c";
  const idQ=colors.length?`${idOp}<=${colors.join("")}`:"";
  const fQ=format?`f:${format}`:"";
  const brk=bracket||3;
  const archId=archetype||"goodstuff";
  const cmdRamp=/search.*land.*put.*battlefield|land.*onto the battlefield/i.test(pivotCard?.oracle||"");
  const tribal=detectTribal(pivotCard);
  const tmpl=getTemplate(archId,isCommander,cmdRamp,brk);
  const deckSize=isCommander?99:60;
  const maxCmc=tmpl.maxCmc||8;
  const landTarget=isCommander?(tmpl.lands||36):(tmpl.lands||22);
  const nonLandTarget=deckSize-landTarget;
  const deck=[];const used=new Set();
  let step=0;const total=14;
  const prog=m=>{if(onProgress)onProgress(step++,total,m);};
  const nlCount=()=>deck.filter(c=>!/land/i.test(c.type||"")).length;
  const canAdd=qty=>nlCount()+qty<=nonLandTarget;
  const safeAdd=(cards,qty)=>{for(const c of cards){const q=qty||1;for(let i=0;i<q;i++){if(!canAdd(1))return;deck.push({...c,qty:1});}}};
  const isCr=c=>/creature/i.test(c.type);

  // Ref skeleton
  const skeleton=refLists?.length?extractSkeleton(refLists):null;
  if(skeleton&&skeleton.core.length>=3){
    prog("Squelette...");
    const cc=await fetchCardList(skeleton.core.map(c=>c.name));
    for(const card of cc){if(used.has(card.name.toLowerCase())||!priceOk(card,brk)||/basic land/i.test(card.type||""))continue;const q=smartCopies(card,false,true);if(!canAdd(isCommander?1:q))break;safeAdd([card],isCommander?1:q);used.add(card.name.toLowerCase());}
  }

  if(isCommander){
    // === COMMANDER (same as v21 but with tribal) ===
    prog("Créatures synergy...");safeAdd(await pick(synQ(archId,idQ,fQ,tribal),tmpl.cr_syn,used,archId,brk,maxCmc,colors,isCr,true,tribal),1);
    prog("Créatures utility...");const rcmc=cmdRamp?2:3;safeAdd(await pick(`t:creature ${fQ} ${idQ} cmc<=${rcmc} o:"add"`,tmpl.cr_util,used,archId,brk,maxCmc,colors,isCr,true,tribal),1);
    prog("Enchantements...");safeAdd(await pick(enchQ(archId,idQ,fQ),tmpl.ench_syn,used,archId,brk,maxCmc,colors,null,true,tribal),1);
    prog("Pioche...");safeAdd(await pick(`(o:"draw a card" OR o:"draw cards") ${fQ} ${idQ} -t:land cmc<=4`,tmpl.draw,used,archId,brk,maxCmc,colors,null,true,tribal),1);
    prog("Removal...");safeAdd(await pick(`(o:"destroy target" OR o:"exile target" OR o:fight) (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof -o:"you control get"`,tmpl.removal,used,"goodstuff",brk,maxCmc,colors,null,true,null),1);
    prog("Board wipes...");safeAdd(await pick(`(o:"destroy all creature" OR o:"all creatures get -") (t:sorcery) ${fQ} ${idQ}`,tmpl.wipes,used,"goodstuff",brk,maxCmc,colors,null,true,null),1);
    prog("Ramp...");const rQ=cmdRamp?`t:creature ${fQ} ${idQ} o:"add" cmc<=2`:`(o:"search your library" o:"basic land" OR (t:creature o:"add" cmc<=2)) ${fQ} ${idQ}`;safeAdd(await pick(rQ,tmpl.ramp,used,"goodstuff",brk,maxCmc,colors,null,true,null),1);
    prog("Protection...");safeAdd(await pick(`(o:hexproof OR o:indestructible) t:instant ${fQ} ${idQ} cmc<=2`,tmpl.prot,used,"goodstuff",brk,maxCmc,colors,null,true,null),1);
    prog("Finishers...");safeAdd(await pick(`t:creature ${fQ} ${idQ} cmc>=5 cmc<=${maxCmc} (o:trample OR pow>=6)`,tmpl.finish,used,archId,brk,maxCmc,colors,isCr,true,tribal),1);
  } else {
    // === V22: 60-CARD WITH VARIABLE COPIES ===
    // Pivot card always 4×
    if(pivotCard){const pq=4;if(canAdd(pq)){safeAdd([pivotCard],pq);used.add(pivotCard.name.toLowerCase());}}

    const slots=tmpl.slots||[];
    for(const slot of slots){
      const qMap={
        "ench":enchQ(archId,idQ,fQ)+` cmc<=3`,
        "syn":synQ(archId,idQ,fQ,tribal),
        "mid":`t:creature ${fQ} ${idQ} cmc>=3 cmc<=${maxCmc}`,
        "rem":`(o:"destroy target" OR o:"exile target" OR o:fight) (t:instant OR t:sorcery) ${fQ} ${idQ} -o:hexproof`,
        "prot":`(o:hexproof OR o:indestructible) t:instant ${fQ} ${idQ} cmc<=2`,
        "draw":`(o:"draw a card") ${fQ} ${idQ} -t:land cmc<=3`,
      };
      const query=qMap[slot.q]||qMap["syn"];
      const filter=slot.q==="syn"||slot.q==="mid"?isCr:null;
      prog(`${slot.role}...`);
      const cards=await pick(query,slot.n,used,archId,brk,maxCmc,colors,filter,true,tribal);
      for(const card of cards){
        const copies=smartCopies(card,false,slot.q==="syn");
        if(canAdd(copies))safeAdd([card],copies);
      }
    }
  }

  // Fill remaining
  if(nlCount()<nonLandTarget){
    prog("Remplissage...");
    const needed=isCommander?(nonLandTarget-nlCount()):Math.ceil((nonLandTarget-nlCount())/3);
    const fillQ=tribal?`t:creature ${fQ} ${idQ} t:${tribal} cmc<=4`:synQ(archId,idQ,fQ,tribal);
    const fill=await pick(fillQ,needed,used,archId,brk,maxCmc,colors,isCr,true,tribal);
    if(isCommander){safeAdd(fill,1);}else{for(const c of fill){const q=smartCopies(c,false,false);if(canAdd(q))safeAdd([c],q);}}
  }

  // === V22: DUAL LANDS (for multi-color decks) ===
  if(colors.length>=2){
    prog("Dual lands...");
    const dualQ=`t:land ${fQ} (${colors.map(c=>`o:"{${c}}"`).join(" ")}) -t:basic`;
    const duals=await pick(dualQ,isCommander?6:4,used,"goodstuff",brk,99,colors,c=>/land/i.test(c.type),false,null);
    for(const d of duals){const q=isCommander?1:4;for(let i=0;i<q&&deck.length<deckSize;i++)deck.push({...d,qty:1});}
  }

  // BASIC LANDS — fill remaining
  prog("Terrains basiques...");
  const landsNeeded=deckSize-deck.length;
  const landNames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  let la=0;
  if(colors.length>0&&landsNeeded>0){
    const perCol=Math.max(1,Math.floor(landsNeeded/colors.length));
    for(const col of colors){for(let i=0;i<perCol&&la<landsNeeded;i++){deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}}
    while(la<landsNeeded&&deck.length<deckSize){const col=colors[la%colors.length];deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}
  }
  prog("Terminé !");
  return deck;
}
