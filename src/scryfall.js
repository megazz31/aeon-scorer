const API = 'https://api.scryfall.com'
const sleep = ms => new Promise(r => setTimeout(r, ms))

export function parseDecklist(text) {
  const rows = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('//') || line.startsWith('#')) continue
    if (/^(commander|sideboard|maybeboard|considering)\s*:?$/i.test(line)) continue
    const m = line.match(/^(\d+)x?\s+(.+?)(?:\s+\([A-Z0-9]+\)\s*\d*)?$/i)
    if (!m) continue
    rows.push({ qty: Number(m[1]), name: m[2].trim() })
  }
  return rows
}

function normalizeCard(c) {
  const faces = c.card_faces || []
  const oracle = c.oracle_text || faces.map(f => f.oracle_text || '').join('\n')
  return {
    id: c.id,
    name: c.name,
    manaCost: c.mana_cost || faces.map(f => f.mana_cost || '').join(' // '),
    cmc: Number(c.cmc || 0),
    type: c.type_line || '',
    oracle,
    colors: c.colors || [],
    colorIdentity: c.color_identity || [],
    keywords: c.keywords || [],
    power: c.power ?? faces[0]?.power ?? null,
    toughness: c.toughness ?? faces[0]?.toughness ?? null,
    legalities: c.legalities || {},
    edhrecRank: c.edhrec_rank ?? null,
    image: c.image_uris?.normal || faces[0]?.image_uris?.normal || null,
  }
}

async function request(url, options={}, attempts=6) {
  let last
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url,options)
      if(r.ok)return r
      if(r.status===429||r.status>=500){
        const retry=Number(r.headers.get('retry-after')||0)
        await sleep(Math.max(retry*1000,300*(i+1)))
        last=new Error(`Scryfall HTTP ${r.status}`)
        continue
      }
      throw new Error(`Scryfall HTTP ${r.status}`)
    }catch(e){last=e;if(i<attempts-1)await sleep(300*(i+1))}
  }
  throw last
}

export async function fetchCards(entries, onProgress) {
  const expanded = []
  for (let i = 0; i < entries.length; i += 75) {
    const batch = entries.slice(i, i + 75)
    const r = await request(`${API}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch.map(x => ({ name: x.name })) }),
    })
    const data = await r.json()
    const byName = new Map()
    for(const c of (data.data||[])){
      const n=normalizeCard(c);byName.set(c.name.toLowerCase(),n)
    }
    for (const e of batch) {
      let card = byName.get(e.name.toLowerCase())
      if(!card){
        try{card=await fetchCard(e.name)}catch{}
      }
      if (!card) continue
      for (let n = 0; n < e.qty; n++) expanded.push({ ...card })
      await sleep(45)
    }
    onProgress?.(Math.min(i + batch.length, entries.length), entries.length)
    await sleep(100)
  }
  return expanded
}

export async function fetchCard(name) {
  if (!name?.trim()) return null
  try{
    const r = await request(`${API}/cards/named?fuzzy=${encodeURIComponent(name.trim())}`)
    return normalizeCard(await r.json())
  }catch{return null}
}
