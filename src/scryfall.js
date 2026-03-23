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

export async function scryfallSearch(query,maxPages,onProgress){return doSearch(query,maxPages);}

export async function searchAlternatives(card,format,colors,isCommander){
  const idFilter=isCommander&&colors.length?`id<=${colors.join("")}`:colors.length?`c<=${colors.join("")}`:"";
  const fmtFilter=format?`f:${format}`:"";
  const typeQ=/creature/i.test(card.type||"")?"t:creature":/instant/i.test(card.type||"")?"t:instant":/sorcery/i.test(card.type||"")?"t:sorcery":/enchantment/i.test(card.type||"")?"t:enchantment":/artifact/i.test(card.type||"")&&!/creature/i.test(card.type||"")?"t:artifact":"";
  if(!typeQ)return[];
  const cmcQ=card.cmc!==undefined?`cmc<=${Math.max((card.cmc||0)+1,3)}`:"";
  const query=`${typeQ} ${fmtFilter} ${idFilter} ${cmcQ} -!"${card.name}"`;
  return doSearch(query,1);
}

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

export async function generateDeckV11(format,colors,pivotCard,isCommander,onProgress){
  const idOp=isCommander?"id":"c";
  const colorQ=colors.length>0?`${idOp}<=${colors.join("")}`:"";
  const fmtQ=format?`f:${format}`:"";
  const deckSize=isCommander?99:60;
  const maxCopies=isCommander?1:4;
  const steps=isCommander?[
    {name:"Créatures (menaces)",q:`t:creature ${fmtQ} ${colorQ} cmc>=3`,target:15,pages:2},
    {name:"Créatures (utilitaires)",q:`t:creature ${fmtQ} ${colorQ} cmc<=2`,target:10,pages:1},
    {name:"Removal",q:`(o:"destroy target" OR o:"exile target") ${fmtQ} ${colorQ} -t:land`,target:8,pages:1},
    {name:"Pioche",q:`(o:"draw a card" OR o:"draw cards") ${fmtQ} ${colorQ} -t:land`,target:7,pages:1},
    {name:"Ramp",q:`(t:artifact o:"add" cmc<=3) ${fmtQ} ${colorQ}`,target:8,pages:1},
    {name:"Enchantements",q:`t:enchantment ${fmtQ} ${colorQ}`,target:5,pages:1},
    {name:"Finishers",q:`t:creature ${fmtQ} ${colorQ} cmc>=5`,target:5,pages:1},
  ]:[
    {name:"Créatures aggro",q:`t:creature ${fmtQ} ${colorQ} cmc<=3`,target:12,pages:1},
    {name:"Créatures mid",q:`t:creature ${fmtQ} ${colorQ} cmc>=3 cmc<=5`,target:6,pages:1},
    {name:"Removal",q:`(o:"destroy target" OR o:"exile target" OR o:"damage to") (t:instant OR t:sorcery) ${fmtQ} ${colorQ}`,target:6,pages:1},
    {name:"Pioche",q:`(o:"draw a card") (t:instant OR t:sorcery OR t:enchantment) ${fmtQ} ${colorQ}`,target:4,pages:1},
    {name:"Finishers",q:`t:creature ${fmtQ} ${colorQ} cmc>=4`,target:4,pages:1},
  ];
  const totalSteps=steps.length+1;let completed=0;const deck=[];const used=new Set();
  if(pivotCard&&!isCommander){for(let i=0;i<Math.min(maxCopies,4);i++)deck.push({...pivotCard,qty:1});used.add(pivotCard.name.toLowerCase());}
  for(const step of steps){
    if(onProgress)onProgress(completed,totalSteps,`${step.name}...`);
    let results=[];try{results=await doSearch(step.q,step.pages);}catch{}
    let added=0;const nonLandTarget=deckSize-(isCommander?37:23);
    for(const card of results){
      if(added>=step.target)break;const key=card.name.toLowerCase();if(used.has(key))continue;
      if(/basic land/i.test(card.type||""))continue;
      const currentNonLands=deck.filter(c=>!/land/i.test(c.type||"")).length;
      if(currentNonLands>=nonLandTarget)break;
      const copies=isCommander?1:Math.min(maxCopies,4);
      for(let i=0;i<copies;i++)deck.push({...card,qty:1});
      used.add(key);added++;
    }
    completed++;
  }
  if(onProgress)onProgress(completed,totalSteps,"Terrains...");
  const landTarget=deckSize-deck.filter(c=>!/land/i.test(c.type||"")).length;
  const landNames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  let la=0;const perCol=Math.floor(Math.max(0,landTarget)/Math.max(1,colors.length));
  for(const col of colors){for(let i=0;i<perCol&&la<landTarget;i++){deck.push({name:landNames[col]||"Wastes",oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]||"Wastes"}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}}
  while(la<landTarget&&colors.length>0){const col=colors[la%colors.length];deck.push({name:landNames[col],oracle:`({T}: Add {${col}}.)`,cmc:0,type:`Basic Land — ${landNames[col]}`,colors:[],colorIdentity:[col],prices:{},keywords:[],qty:1});la++;}
  completed++;if(onProgress)onProgress(completed,totalSteps,"Terminé !");
  return deck;
}
