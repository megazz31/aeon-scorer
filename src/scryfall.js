// Scryfall API v9 — with search, collection fetch, deck builder queries, and caching
const cache=new Map();
const DELAY=110; // ms between requests (Scryfall asks 50-100ms)
let lastReq=0;

async function throttle(){const now=Date.now(),wait=DELAY-(now-lastReq);if(wait>0)await new Promise(r=>setTimeout(r,wait));lastReq=Date.now();}

export async function searchCards(query){
  if(query.length<2)return[];
  const k=`ac:${query}`;if(cache.has(k))return cache.get(k);
  try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);if(!r.ok)return[];const d=await r.json();const res=d.data||[];cache.set(k,res);return res;}catch{return[];}
}

export async function fetchCard(name){
  const k=`c:${name.toLowerCase()}`;if(cache.has(k))return cache.get(k);
  try{await throttle();const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);if(!r.ok)return null;const d=await r.json();const card=parseCard(d);cache.set(k,card);return card;}catch{return null;}
}

export async function fetchCardList(names){
  const results=[];
  for(let i=0;i<names.length;i+=75){
    const batch=names.slice(i,i+75);
    try{await throttle();const r=await fetch("https://api.scryfall.com/cards/collection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifiers:batch.map(n=>({name:n}))})});if(!r.ok)continue;const d=await r.json();for(const c of(d.data||[])){const card=parseCard(c);cache.set(`c:${c.name.toLowerCase()}`,card);results.push(card);}}catch{}
  }
  return results;
}

// DECK BUILDER: search cards by format+colors+type with Scryfall full search
export async function searchForDeckBuilder(query, onProgress){
  const k=`db:${query}`;if(cache.has(k))return cache.get(k);
  const allCards=[];let page=1,hasMore=true;
  try{
    while(hasMore&&page<=3){ // max 3 pages = ~525 cards
      await throttle();
      const url=page===1?`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`:``;
      const fetchUrl=page===1?url:nextUrl;
      var nextUrl="";
      const r=await fetch(fetchUrl);
      if(!r.ok)break;
      const d=await r.json();
      for(const c of(d.data||[]))allCards.push(parseCard(c));
      hasMore=d.has_more||false;
      nextUrl=d.next_page||"";
      if(onProgress)onProgress(allCards.length,d.total_cards||allCards.length);
      page++;
    }
  }catch{}
  cache.set(k,allCards);
  return allCards;
}

// Search for alternatives to a specific card
export async function searchAlternatives(card,format,colors){
  const colorFilter=colors.length>0?` c:${colors.join("")}`:"";
  const fmtFilter=format?` f:${format}`:"";
  const typeWord=/creature/i.test(card.type||"")?"t:creature":/instant/i.test(card.type||"")?"t:instant":/sorcery/i.test(card.type||"")?"t:sorcery":/enchantment/i.test(card.type||"")?"t:enchantment":/artifact/i.test(card.type||"")?"t:artifact":"";
  const cmcRange=card.cmc!==undefined?` cmc<=${Math.max(card.cmc+1,2)}`:"";
  const query=`${typeWord}${fmtFilter}${colorFilter}${cmcRange} -!"${card.name}"`;
  const k=`alt:${query}`;if(cache.has(k))return cache.get(k);
  try{
    await throttle();
    const r=await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`);
    if(!r.ok)return[];
    const d=await r.json();
    const res=(d.data||[]).slice(0,10).map(parseCard);
    cache.set(k,res);
    return res;
  }catch{return[];}
}

function parseCard(d){
  return{
    name:d.name,
    oracle:d.oracle_text||(d.card_faces?d.card_faces.map(f=>f.oracle_text).join("\n"):""),
    cmc:d.cmc||0,
    type:d.type_line||"",
    colors:d.colors||d.color_identity||[],
    img:d.image_uris?.normal||d.card_faces?.[0]?.image_uris?.normal||null,
    imgSmall:d.image_uris?.small||d.card_faces?.[0]?.image_uris?.small||null,
    set:d.set_name||"",
    legalities:d.legalities||{},
    power:d.power||null,
    toughness:d.toughness||null,
    keywords:d.keywords||[],
    prices:{eur:d.prices?.eur,usd:d.prices?.usd},
    edhrecRank:d.edhrec_rank||99999,
  };
}

export function parseDecklistText(text){
  const lines=text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("#"));
  const mainboard=[],sideboard=[];let inSB=false;
  for(const line of lines){
    if(/^sideboard:?$/i.test(line)||/^SB:?$/i.test(line)){inSB=true;continue;}
    if(line===""){inSB=true;continue;}
    const m=line.match(/^(?:SB:\s*)?(\d+)x?\s+(.+?)(?:\s+\(.*\))?(?:\s+\d+)?$/i);
    if(m){const qty=parseInt(m[1]),name=m[2].trim();(inSB?sideboard:mainboard).push({qty,name});}
  }
  return{mainboard,sideboard};
}
