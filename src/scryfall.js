const API='https://api.scryfall.com'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))

function cleanCardName(name){
  let s=String(name||'').trim()
  for(let i=0;i<2;i++){
    s=s.replace(/\s+\*[^*]+\*\s*$/,'').trim()
    s=s.replace(/\s+\([A-Z0-9]{2,8}\)\s*[A-Za-z0-9-]*\s*$/i,'').trim()
    s=s.replace(/\s+\[[A-Z0-9]{2,8}\]\s*$/i,'').trim()
  }
  return s
}

export function parseDecklist(text){
  const rows=[]
  let include=true
  for(const raw of String(text||'').split(/\r?\n/)){
    const line=raw.trim()
    if(!line||line.startsWith('//')||line.startsWith('#'))continue
    const section=line.match(/^(commander|commanders|deck|mainboard|sideboard|maybeboard|considering)\s*:?$/i)?.[1]?.toLowerCase()
    if(section){include=!['sideboard','maybeboard','considering'].includes(section);continue}
    if(!include)continue
    let qty,name
    const leading=line.match(/^(\d+)\s*x?\s+(.+)$/i)
    const trailing=line.match(/^(.+?)\s+[x×](\d+)$/i)
    if(leading){qty=Number(leading[1]);name=cleanCardName(leading[2])}
    else if(trailing){qty=Number(trailing[2]);name=cleanCardName(trailing[1])}
    else continue
    if(!Number.isInteger(qty)||qty<1||qty>999||!name)continue
    rows.push({qty,name})
  }
  return rows
}

function uniq(xs){return [...new Set(xs)]}
function normalizeCard(c){
  const faces=c.card_faces||[]
  const oracle=c.oracle_text||faces.map(f=>f.oracle_text||'').join('\n')
  const producedMana=c.produced_mana||uniq(faces.flatMap(f=>f.produced_mana||[]))
  return {
    id:c.id,name:c.name,aliases:faces.map(f=>f.name).filter(Boolean),manaCost:c.mana_cost||faces.map(f=>f.mana_cost||'').join(' // '),cmc:Number(c.cmc||0),
    type:c.type_line||'',oracle,colors:c.colors||[],colorIdentity:c.color_identity||[],keywords:c.keywords||[],
    producedMana:producedMana||[],power:c.power??faces[0]?.power??null,toughness:c.toughness??faces[0]?.toughness??null,
    legalities:c.legalities||{},edhrecRank:c.edhrec_rank??null,image:c.image_uris?.normal||faces[0]?.image_uris?.normal||null,
  }
}

async function request(url,options={},attempts=6){
  let last
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url,options)
      if(r.ok)return r
      if(r.status===429||r.status>=500){
        const retry=Number(r.headers.get('retry-after')||0)
        await sleep(Math.max(retry*1000,300*(i+1)));last=new Error(`Scryfall HTTP ${r.status}`);continue
      }
      const e=new Error(`Scryfall HTTP ${r.status}`);e.status=r.status;throw e
    }catch(e){last=e;if(i<attempts-1&&(!e.status||e.status===429||e.status>=500))await sleep(300*(i+1));else if(e.status&&e.status<500)break}
  }
  throw last
}
async function named(name,mode='exact'){
  const r=await request(`${API}/cards/named?${mode}=${encodeURIComponent(name.trim())}`)
  return normalizeCard(await r.json())
}
function canonical(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim()}
function acceptableFuzzy(requested,card){
  const q=canonical(requested),names=[card.name,...(card.aliases||[])].map(canonical)
  if(names.includes(q))return true
  return names.some(n=>n.startsWith(q)||q.startsWith(n))&&Math.abs(n.length-q.length)<=3
}
export async function fetchCard(name){
  if(!name?.trim())return null
  const q=cleanCardName(name)
  try{return await named(q,'exact')}catch(e){
    if(e?.status&&e.status!==404)return null
    try{const c=await named(q,'fuzzy');return acceptableFuzzy(q,c)?c:null}catch{return null}
  }
}
export async function fetchCards(entries,onProgress){
  const expanded=[]
  for(let i=0;i<entries.length;i+=75){
    const batch=entries.slice(i,i+75)
    const r=await request(`${API}/cards/collection`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifiers:batch.map(x=>({name:cleanCardName(x.name)}))})})
    const data=await r.json(),byName=new Map()
    for(const c of (data.data||[])){
      const n=normalizeCard(c);byName.set(c.name.toLowerCase(),n)
      for(const f of (c.card_faces||[]))if(f.name)byName.set(f.name.toLowerCase(),n)
    }
    for(const e of batch){
      const requested=cleanCardName(e.name)
      let card=byName.get(requested.toLowerCase())
      if(!card)card=await fetchCard(requested)
      if(!card)continue
      for(let n=0;n<e.qty;n++)expanded.push({...card,__requestedName:requested})
      await sleep(45)
    }
    onProgress?.(Math.min(i+batch.length,entries.length),entries.length);await sleep(100)
  }
  return expanded
}
