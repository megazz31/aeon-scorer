import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { analyzePower } from '../src/engine/powerModel.js'
import { tagsFor } from '../src/engine/cardFeatures.js'
import { ENGINE_VERSION, SEMANTIC_VERSION } from '../src/version.js'

const MTGJSON='https://mtgjson.com/api/v5'
const SCRYFALL='https://api.scryfall.com'
const OUT=path.resolve('public/precons')
const ITERATIONS=Math.max(100,Math.min(20000,Number(process.env.AEON_PRECON_ITERATIONS||3200)))
const sleep=ms=>new Promise(r=>setTimeout(r,ms))

async function fetchWithBackoff(url,options={},attempts=7){
  let last
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url,{...options,headers:{'User-Agent':`AeonScorer-PublicPrecons/${ENGINE_VERSION} (+https://github.com/megazz31/aeon-scorer)`,'Accept':'application/json',...(options.headers||{})}})
      if(r.ok)return r
      const e=new Error(`${r.status} ${r.statusText} ${url}`);e.status=r.status
      if(r.status===429||r.status>=500){last=e;const retry=Number(r.headers.get('retry-after')||0);await sleep(Math.max(retry*1000,350*(i+1)));continue}
      throw e
    }catch(e){last=e;if(i<attempts-1&&(!e.status||e.status===429||e.status>=500)){await sleep(350*(i+1));continue}throw e}
  }
  throw last
}
async function fetchJson(url,options){return (await fetchWithBackoff(url,options)).json()}
const sha256=s=>crypto.createHash('sha256').update(String(s)).digest('hex')
function slugify(s){return String(s||'deck').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'deck'}
function normalizedDeckKey(decklist,commander){
  const counts=new Map()
  for(const raw of String(decklist||'').split(/\r?\n/)){
    const m=raw.trim().match(/^(\d+)\s+(.+)$/);if(!m)continue
    const name=m[2].trim().toLowerCase(),qty=Number(m[1])||0
    counts.set(name,(counts.get(name)||0)+qty)
  }
  const rows=[...counts].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([name,qty])=>`${qty} ${name}`)
  return `${String(commander||'').trim().toLowerCase()}\n${rows.join('\n')}`
}
function countOf(c){return Math.max(0,Number(c?.count??c?.quantity??1)||0)}
function expandNames(rows){return (rows||[]).flatMap(c=>Array(countOf(c)).fill(c?.name).filter(Boolean))}
function decklistText(rows){return (rows||[]).filter(c=>c?.name&&countOf(c)>0).map(c=>`${countOf(c)} ${c.name}`).join('\n')}
function stableAlias(meta){return {name:meta.name||null,setCode:meta.code||null,releaseDate:meta.releaseDate||null,fileName:meta.fileName||null}}
function normalizeScryfall(d){
  const faces=d.card_faces||[],faceNames=faces.map(f=>f.name).filter(Boolean),distinctFaceNames=[...new Set(faceNames)],sameNameReversible=distinctFaceNames.length===1&&String(d.name||'').includes(' // '),name=sameNameReversible?distinctFaceNames[0]:d.name
  const oracle=d.oracle_text||faces.map(f=>f.oracle_text||'').filter(Boolean).join('\n'),producedMana=d.produced_mana||[...new Set(faces.flatMap(f=>f.produced_mana||[]))]
  return {
    id:d.id,oracleId:d.oracle_id||d.id,name,aliases:faceNames.filter(x=>x&&x!==name),manaCost:d.mana_cost||faces.map(f=>f.mana_cost||'').filter(Boolean).join(' // '),cmc:Number(d.cmc||0),
    type:d.type_line||'',oracle,colors:d.colors||[],colorIdentity:d.color_identity||[],keywords:d.keywords||[],producedMana:producedMana||[],
    power:d.power??faces[0]?.power??null,toughness:d.toughness??faces[0]?.toughness??null,legalities:d.legalities||{},edhrecRank:d.edhrec_rank??null,
    image:d.image_uris?.normal||faces[0]?.image_uris?.normal||null,
  }
}
function indexCard(map,c,requested=null){map.set(c.name.toLowerCase(),c);for(const a of c.aliases||[])map.set(String(a).toLowerCase(),c);if(requested)map.set(String(requested).toLowerCase(),c)}
async function resolveScryfall(names){
  const unique=[...new Set(names.filter(Boolean))],map=new Map(),missing=[]
  for(let i=0;i<unique.length;i+=75){
    const batch=unique.slice(i,i+75)
    const payload=await fetchJson(`${SCRYFALL}/cards/collection`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifiers:batch.map(name=>({name}))})})
    for(const raw of payload.data||[])indexCard(map,normalizeScryfall(raw))
    const unresolved=batch.filter(name=>!map.has(name.toLowerCase()))
    for(const name of unresolved){
      let resolved=null
      try{resolved=normalizeScryfall(await fetchJson(`${SCRYFALL}/cards/named?exact=${encodeURIComponent(name)}`))}
      catch(e){if(e?.status!==404)console.warn('Scryfall exact failed',name,e.message)}
      if(!resolved&&name.includes(' // ')){
        const front=name.split(' // ')[0].trim()
        try{resolved=normalizeScryfall(await fetchJson(`${SCRYFALL}/cards/named?exact=${encodeURIComponent(front)}`))}
        catch(e){if(e?.status!==404)console.warn('Scryfall front-face fallback failed',name,e.message)}
      }
      if(resolved)indexCard(map,resolved,name)
      await sleep(65)
    }
    await sleep(120)
    console.log(`Scryfall ${Math.min(i+batch.length,unique.length)}/${unique.length}`)
  }
  for(const name of unique)if(!map.has(name.toLowerCase()))missing.push(name)
  return {map,missing}
}
async function mapLimit(items,limit,fn){
  const out=new Array(items.length);let next=0
  async function worker(){while(true){const i=next++;if(i>=items.length)return;try{out[i]=await fn(items[i],i)}catch(e){console.warn('skip',items[i]?.name||items[i]?.fileName,e.message);out[i]=null}}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out
}

async function loadMtgjson(){
  const root=await fetchJson(`${MTGJSON}/DeckList.json`),revision=root?.meta?.date||root?.meta?.version||null
  const rows=(root.data||root||[]).filter(x=>/commander/i.test(String(x.type||''))).sort((a,b)=>String(a.releaseDate||'').localeCompare(String(b.releaseDate||''))||String(a.name||'').localeCompare(String(b.name||'')))
  console.log(`MTGJSON Commander candidates: ${rows.length}`)
  const raw=(await mapLimit(rows,6,async meta=>{
    const file=String(meta.fileName||meta.file_name||'').replace(/\.json$/i,'');if(!file)return null
    const rootDeck=await fetchJson(`${MTGJSON}/decks/${encodeURIComponent(file)}.json`),d=rootDeck.data||rootDeck
    const commanderRows=d.commander||[],mainRows=d.mainBoard||d.mainboard||[],commanderNames=expandNames(commanderRows),mainNames=expandNames(mainRows)
    if(!mainNames.length)return null
    const commanderLabel=commanderNames.join(' + ')||'Unknown Commander',decklist=decklistText(mainRows),deckHash=sha256(normalizedDeckKey(decklist,commanderLabel))
    let unsupportedReason=null
    if(commanderNames.length!==1)unsupportedReason=commanderNames.length>1?'multiple_commanders_not_supported':'commander_missing'
    else if(mainNames.length<95||mainNames.length>100)unsupportedReason=`unexpected_mainboard_count_${mainNames.length}`
    return {
      name:d.name||meta.name||file,productName:d.name||meta.name||file,setCode:d.code||meta.code||null,releaseDate:d.releaseDate||meta.releaseDate||null,type:d.type||meta.type||'Commander',fileName:file,
      commanderNames,commanderName:commanderNames[0]||'Unknown Commander',mainNames,decklist,deckHash,supported:!unsupportedReason,unsupportedReason,sourceUrl:`${MTGJSON}/decks/${encodeURIComponent(file)}.json`,sourceRevision:rootDeck?.meta?.date||rootDeck?.meta?.version||revision,aliases:[stableAlias(meta)]
    }
  })).filter(Boolean)

  const byHash=new Map()
  for(const deck of raw){
    const prior=byHash.get(deck.deckHash)
    if(!prior){byHash.set(deck.deckHash,deck);continue}
    prior.aliases.push(...deck.aliases)
    if(String(deck.releaseDate||'')<String(prior.releaseDate||'')){const aliases=prior.aliases;byHash.set(deck.deckHash,{...deck,aliases})}
  }
  return {decks:[...byHash.values()].sort((a,b)=>String(b.releaseDate||'').localeCompare(String(a.releaseDate||''))||a.name.localeCompare(b.name)),revision}
}

function metricSummary(result){return {median:result.profile.median,p20:result.profile.floor,p80:result.profile.ceiling,peak:result.profile.peak,coverage:result.profile.coverage}}
function oracleSnapshotHash(cards){
  const uniq=new Map();for(const c of cards){const k=c.oracleId||c.id||c.name.toLowerCase();if(!uniq.has(k))uniq.set(k,c)}
  return sha256([...uniq.values()].map(c=>`${c.oracleId||c.id||c.name.toLowerCase()}|${c.type||''}|${c.oracle||''}`).sort().join('\n'))
}
function compactOracleEvidence(cards,commanderName){
  const uniq=new Map(),cmd=String(commanderName||'').toLowerCase()
  for(const c of cards){
    const key=c.oracleId||c.id||c.name.toLowerCase();if(uniq.has(key))continue
    uniq.set(key,{oracleId:c.oracleId||c.id,scryfallId:c.id||null,name:c.name,type:c.type||'',oracle:c.oracle||'',manaCost:c.manaCost||'',cmc:Number(c.cmc||0),colorIdentity:c.colorIdentity||[],producedMana:c.producedMana||[],tags:tagsFor(c),isCommander:String(c.name||'').toLowerCase()===cmd})
  }
  return [...uniq.values()].sort((a,b)=>a.name.localeCompare(b.name))
}

async function main(){
  await fs.rm(OUT,{recursive:true,force:true});await fs.mkdir(OUT,{recursive:true})
  const generatedAt=new Date().toISOString(),oracleDate=generatedAt.slice(0,10),{decks,revision}=await loadMtgjson()
  const names=decks.flatMap(d=>[...d.mainNames,...d.commanderNames]),{map:cardsByName,missing}=await resolveScryfall(names)
  if(missing.length)console.warn(`Scryfall unresolved unique names: ${missing.length}`,missing.slice(0,30))

  const catalog=[];let analyzed=0,unsupported=0,incomplete=0
  for(let index=0;index<decks.length;index++){
    const d=decks[index],commander=cardsByName.get(d.commanderName.toLowerCase()),missingNames=[...new Set(d.mainNames.filter(n=>!cardsByName.has(n.toLowerCase())))]
    let supported=d.supported&&!!commander&&!missingNames.length
    let unsupportedReason=d.unsupportedReason
    if(d.supported&&!commander)unsupportedReason='commander_unresolved_by_scryfall'
    if(d.supported&&missingNames.length)unsupportedReason=`scryfall_unresolved_${missingNames.length}_cards`
    let result=null,analysis=null,oracleCards=[]
    if(supported){
      const cards=d.mainNames.map(n=>({...cardsByName.get(n.toLowerCase())}))
      result=analyzePower(cards,{...commander},new Map(),ITERATIONS)
      const all=[...cards,commander],snapshot=oracleSnapshotHash(all)
      oracleCards=compactOracleEvidence(all,d.commanderName)
      analysis={...metricSummary(result),engineVersion:ENGINE_VERSION,semanticVersion:SEMANTIC_VERSION,oracleSnapshotHash:snapshot,scryfallOracleDate:oracleDate,iterations:ITERATIONS,analyzedAt:generatedAt}
      analyzed++
    }else{unsupported++;if(!d.unsupportedReason)incomplete++}

    let slug=slugify(`${d.name}-${d.setCode||d.releaseDate||index}`);let suffix=2
    while(catalog.some(x=>x.slug===slug))slug=`${slugify(`${d.name}-${d.setCode||index}`)}-${suffix++}`
    const summary={slug,deckHash:d.deckHash,name:d.name,productName:d.productName,commanderName:d.commanderName,commanderImageUrl:commander?.image||null,commanderOracleId:commander?.oracleId||null,colorIdentity:commander?.colorIdentity||[],setCode:d.setCode,releaseDate:d.releaseDate,supported,unsupportedReason:unsupportedReason||null,sourceName:'MTGJSON',sourceUrl:d.sourceUrl,sourceRevision:d.sourceRevision||revision,productAliases:d.aliases,cardCount:d.mainNames.length,analysis}
    catalog.push(summary)
    const detail={...summary,decklist:d.decklist,oracleCards,result}
    await fs.writeFile(path.join(OUT,`${slug}.json`),JSON.stringify(detail,null,2)+'\n')
    console.log(`[${index+1}/${decks.length}] ${d.name}: ${analysis?`${analysis.median} [${analysis.p20}-${analysis.p80}] peak ${analysis.peak}`:`unsupported (${unsupportedReason})`}`)
  }

  const years=catalog.map(x=>Number(String(x.releaseDate||'').slice(0,4))).filter(Number.isFinite)
  const payload={meta:{generatedAt,engineVersion:ENGINE_VERSION,semanticVersion:SEMANTIC_VERSION,iterations:ITERATIONS,sourceName:'MTGJSON',sourceRevision:revision,total:catalog.length,analyzed,unsupported,incomplete,earliestYear:years.length?Math.min(...years):null,latestYear:years.length?Math.max(...years):null},data:catalog}
  await fs.writeFile(path.join(OUT,'catalog.json'),JSON.stringify(payload,null,2)+'\n')
  console.log(`Generated ${catalog.length} canonical Commander precons: ${analyzed} analyzed, ${unsupported} unsupported.`)
  if(!catalog.length||!analyzed)throw new Error('Public precon generation produced no analyzed decks')
}

main().catch(e=>{console.error(e);process.exitCode=1})
