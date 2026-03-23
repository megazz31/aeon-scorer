const cache=new Map();const DELAY=120;let lastReq=0;
async function throttle(){const w=DELAY-(Date.now()-lastReq);if(w>0)await new Promise(r=>setTimeout(r,w));lastReq=Date.now();}

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

// Search for deck building — uses Scryfall full search syntax
export async function scryfallSearch(query,maxPages=2,onProgress){
  const k=`s:${query}`;if(cache.has(k))return cache.get(k);
  const all=[];let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;
  for(let page=0;page<maxPages&&url;page++){
    try{await throttle();const r=await fetch(url);if(!r.ok)break;const d=await r.json();
    for(const c of(d.data||[]))all.push(parseCard(c));
    url=d.has_more?d.next_page:null;
    if(onProgress)onProgress(all.length,d.total_cards||all.length);}catch{break;}
  }
  cache.set(k,all);return all;
}

// Search alternatives for a card
export async function searchAlternatives(card,format,colors,isCommander){
  const idFilter=isCommander?`id<=${colors.join("")}`:`c<=${colors.join("")}`;
  const fmtFilter=format?`f:${format}`:"";
  const typeQ=/creature/i.test(card.type||"")?"t:creature":/instant/i.test(card.type||"")?"t:instant":/sorcery/i.test(card.type||"")?"t:sorcery":/enchantment/i.test(card.type||"")?"t:enchantment":/artifact/i.test(card.type||"")&&!/creature/i.test(card.type||"")?"t:artifact":"";
  if(!typeQ)return[];
  const cmcQ=card.cmc!==undefined?`cmc<=${Math.max((card.cmc||0)+1,3)}`:"";
  const query=`${typeQ} ${fmtFilter} ${idFilter} ${cmcQ} -!"${card.name}"`;
  return scryfallSearch(query,1);
}

function parseCard(d){return{
  name:d.name,oracle:d.oracle_text||(d.card_faces?d.card_faces.map(f=>f.oracle_text).join("\n"):""),
  cmc:d.cmc||0,type:d.type_line||"",colors:d.colors||[],colorIdentity:d.color_identity||[],
  img:d.image_uris?.normal||d.card_faces?.[0]?.image_uris?.normal||null,
  imgSmall:d.image_uris?.small||d.card_faces?.[0]?.image_uris?.small||null,
  set:d.set_name||"",legalities:d.legalities||{},power:d.power||null,toughness:d.toughness||null,
  keywords:d.keywords||[],prices:{eur:d.prices?.eur,usd:d.prices?.usd},edhrecRank:d.edhrec_rank||99999,
};}

export function parseDecklistText(text){
  const lines=text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("#"));
  const mb=[],sb=[];let inSB=false;
  for(const line of lines){
    if(/^sideboard:?$/i.test(line)||/^SB:?$/i.test(line)){inSB=true;continue;}
    if(line===""){inSB=true;continue;}
    const m=line.match(/^(?:SB:\s*)?(\d+)x?\s+(.+?)(?:\s+\(.*\))?(?:\s+\d+)?$/i);
    if(m)(inSB?sb:mb).push({qty:parseInt(m[1]),name:m[2].trim()});
  }
  return{mainboard:mb,sideboard:sb};
}

// DECK GENERATOR — build a full deck from scratch
export async function generateDeck(format,colors,pivotCard,isCommander,onProgress){
  const idOp=isCommander?"id":"c";
  const colorQ=colors.length>0?`${idOp}<=${colors.join("")}`:"";
  const fmtQ=format?`f:${format}`:"";
  const deckSize=isCommander?99:60; // 99 + commander = 100
  const maxCopies=isCommander?1:4;

  const steps=[
    {name:"Créatures",q:`t:creature ${fmtQ} ${colorQ}`,target:isCommander?28:22,pages:2},
    {name:"Removal",q:`(otag:removal OR o:"destroy target" OR o:"exile target") ${fmtQ} ${colorQ} -t:land`,target:isCommander?8:6,pages:1},
    {name:"Pioche",q:`(otag:card-advantage OR o:"draw a card") ${fmtQ} ${colorQ} -t:land -t:creature`,target:isCommander?7:4,pages:1},
    {name:"Ramp",q:`(otag:ramp OR (t:artifact o:add o:mana)) ${fmtQ} ${colorQ}`,target:isCommander?8:3,pages:1},
    {name:"Utilitaires",q:`(t:enchantment OR t:planeswalker) ${fmtQ} ${colorQ}`,target:isCommander?6:3,pages:1},
  ];

  const totalSteps=steps.length+1;
  let completed=0;
  const deck=[];
  const usedNames=new Set();

  // Add pivot card first
  if(pivotCard){
    if(isCommander){/* commander is separate */}else{
      for(let i=0;i<Math.min(maxCopies,4);i++){deck.push({...pivotCard,qty:1});}
      usedNames.add(pivotCard.name.toLowerCase());
    }
  }

  for(const step of steps){
    if(onProgress)onProgress(completed,totalSteps,`Recherche: ${step.name}...`);
    const results=await scryfallSearch(step.q,step.pages);
    // Score and pick the best ones
    let added=0;
    for(const card of results){
      if(added>=step.target)break;
      const key=card.name.toLowerCase();
      if(usedNames.has(key))continue;
      if(/basic land/i.test(card.type||""))continue;
      const copies=isCommander?1:Math.min(maxCopies,4);
      for(let i=0;i<copies&&deck.length<(deckSize-(isCommander?36:22));i++){
        deck.push({...card,qty:1});
      }
      usedNames.add(key);
      added++;
    }
    completed++;
  }

  // Fill with lands
  if(onProgress)onProgress(completed,totalSteps,"Calcul des terrains...");
  const nonLands=deck.length;
  const landCount=deckSize-nonLands;
  // Calculate color ratio from mana pips
  const pipCount={};
  for(const c of deck){
    const o=c.oracle||"";
    for(const col of colors){
      const regex=new RegExp(`\\{[^}]*${col}[^}]*\\}`,"gi");
      const matches=o.match(regex);
      pipCount[col]=(pipCount[col]||0)+(matches?matches.length:0);
    }
  }
  const totalPips=Object.values(pipCount).reduce((s,v)=>s+v,1);
  // Add basic lands proportionally
  const landNames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  let landsAdded=0;
  for(const col of colors){
    const ratio=Math.max(0.15,(pipCount[col]||0)/totalPips);
    const count=Math.round(landCount*ratio);
    const landName=landNames[col]||"Wastes";
    for(let i=0;i<count&&landsAdded<landCount;i++){
      deck.push({name:landName,oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landName}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});
      landsAdded++;
    }
  }
  // Fill remaining with first color's basic
  while(landsAdded<landCount&&colors.length>0){
    const col=colors[0];const ln=landNames[col]||"Wastes";
    deck.push({name:ln,oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${ln}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});
    landsAdded++;
  }
  completed++;
  if(onProgress)onProgress(completed,totalSteps,"Terminé !");
  return deck;
}
