import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { ENGINE_VERSION,SEMANTIC_VERSION } from '../src/version.js'

const WRITE=process.argv.includes('--write')
const SUPABASE_URL=process.env.SUPABASE_URL||'https://jrzzlcklctmqgemepucs.supabase.co'
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||''
const CATALOG=path.resolve('public/precons/catalog.json')
const SCRYFALL='https://api.scryfall.com'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const sha256=s=>crypto.createHash('sha256').update(String(s)).digest('hex')

function parseDecklist(text){const out=[];for(const raw of String(text||'').split(/\r?\n/)){const m=raw.trim().match(/^(\d+)\s+(.+)$/);if(!m)continue;const qty=Number(m[1]),name=m[2].trim();for(let i=0;i<qty;i++)out.push(name)}return out}
function normalizeCard(d){const faces=d.card_faces||[],faceNames=faces.map(f=>f.name).filter(Boolean),distinct=[...new Set(faceNames)],sameNameReversible=distinct.length===1&&String(d.name||'').includes(' // '),name=sameNameReversible?distinct[0]:d.name,oracle=d.oracle_text||faces.map(f=>f.oracle_text||'').filter(Boolean).join('\n'),producedMana=d.produced_mana||[...new Set(faces.flatMap(f=>f.produced_mana||[]))];return {id:d.id,oracleId:d.oracle_id||d.id,name,aliases:faceNames.filter(x=>x&&x!==name),manaCost:d.mana_cost||faces.map(f=>f.mana_cost||'').filter(Boolean).join(' // '),cmc:Number(d.cmc||0),type:d.type_line||'',oracle,colors:d.colors||[],colorIdentity:d.color_identity||[],keywords:d.keywords||[],producedMana,power:d.power??faces[0]?.power??null,toughness:d.toughness??faces[0]?.toughness??null,legalities:d.legalities||{},edhrecRank:d.edhrec_rank??null}}
function indexCard(map,c,requested=null){map.set(c.name.toLowerCase(),c);for(const a of c.aliases||[])map.set(String(a).toLowerCase(),c);if(requested)map.set(String(requested).toLowerCase(),c)}
async function request(url,options={},attempts=6){let last;for(let i=0;i<attempts;i++){try{const r=await fetch(url,{...options,headers:{'User-Agent':`AeonScorer-PublicPreconSync/${ENGINE_VERSION}`,'Accept':'application/json',...(options.headers||{})}});if(r.ok)return r;const e=new Error(`${r.status} ${r.statusText} ${url}`);e.status=r.status;if(r.status===429||r.status>=500){last=e;await sleep(300*(i+1));continue}throw e}catch(e){last=e;if(i<attempts-1&&!e.status){await sleep(300*(i+1));continue}throw e}}throw last}
async function resolveCards(names){const unique=[...new Set(names.filter(Boolean))],map=new Map();for(let i=0;i<unique.length;i+=75){const batch=unique.slice(i,i+75),r=await request(`${SCRYFALL}/cards/collection`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifiers:batch.map(name=>({name}))})}),j=await r.json();for(const d of j.data||[])indexCard(map,normalizeCard(d));for(const name of batch.filter(n=>!map.has(n.toLowerCase()))){let resolved=null;try{resolved=normalizeCard(await (await request(`${SCRYFALL}/cards/named?exact=${encodeURIComponent(name)}`)).json())}catch(e){if(e?.status!==404)throw e}if(!resolved&&name.includes(' // ')){const front=name.split(' // ')[0].trim();try{resolved=normalizeCard(await (await request(`${SCRYFALL}/cards/named?exact=${encodeURIComponent(front)}`)).json())}catch(e){if(e?.status!==404)throw e}}if(!resolved)throw new Error(`Scryfall unresolved ${name}`);indexCard(map,resolved,name);await sleep(55)}await sleep(100)}return map}
function snapshotHash(cards){const uniq=new Map();for(const c of cards){const k=c.oracleId||c.id||c.name.toLowerCase();if(!uniq.has(k))uniq.set(k,c)}return sha256([...uniq.values()].map(c=>`${c.oracleId||c.id||c.name.toLowerCase()}|${c.type||''}|${c.oracle||''}`).sort().join('\n'))}
function evidenceFromDetail(cards){const out=[],seen=new Set();for(const c of cards||[]){const oracleId=String(c.oracleId||c.oracle_id||c.scryfallId||c.name||'').toLowerCase(),name=String(c.name||'').trim();if(!oracleId&&!name)continue;const key=oracleId||name.toLowerCase();if(seen.has(key))continue;seen.add(key);out.push({oracle_id:oracleId||null,scryfall_id:c.scryfallId||c.scryfall_id||null,name,oracle_text:c.oracle||c.oracle_text||'',type_line:c.type||c.type_line||'',engine_tags:Array.isArray(c.tags)?[...new Set(c.tags)]:[]})}return out}
async function rest(resource,{method='GET',body,prefer}={}){const r=await fetch(`${SUPABASE_URL}/rest/v1/${resource}`,{method,headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();if(!r.ok)throw new Error(`Supabase ${r.status}: ${text}`);return text?JSON.parse(text):null}

async function main(){
  const catalog=JSON.parse(await fs.readFile(CATALOG,'utf8')),rows=catalog.data||[]
  if(catalog.meta?.engineVersion!==ENGINE_VERSION||catalog.meta?.semanticVersion!==SEMANTIC_VERSION)throw new Error(`Catalog version mismatch: ${catalog.meta?.engineVersion}/${catalog.meta?.semanticVersion}`)
  if(!WRITE){console.log(`DRY RUN: ${rows.length} public decks, ${rows.filter(x=>x.analysis).length} analyzed. Use --write with SUPABASE_SERVICE_ROLE_KEY to sync.`);return}
  if(!SERVICE_KEY)throw new Error('SUPABASE_SERVICE_ROLE_KEY is required with --write')

  const detailRows=[];for(const row of rows){const detail=JSON.parse(await fs.readFile(path.join('public/precons',`${row.slug}.json`),'utf8'));detailRows.push(detail)}
  const names=detailRows.filter(d=>d.supported&&d.analysis).flatMap(d=>[...parseDecklist(d.decklist),d.commanderName]),cardsByName=await resolveCards(names)
  let synced=0,createdRuns=0,skipped=0
  for(const d of detailRows){
    const deckRow={slug:d.slug,deck_hash:d.deckHash,name:d.name,commander_name:d.commanderName,commander_oracle_id:d.commanderOracleId||null,commander_image_url:d.commanderImageUrl||null,color_identity:d.colorIdentity||[],set_code:d.setCode||null,product_name:d.productName||d.name,release_date:d.releaseDate||null,original_decklist:d.decklist,card_count:d.cardCount,supported:!!d.supported,unsupported_reason:d.unsupportedReason||null,source_name:d.sourceName||'MTGJSON',source_url:d.sourceUrl||null,source_revision:d.sourceRevision||null,product_aliases:d.productAliases||[]}
    const up=await rest('public_decks?on_conflict=deck_hash',{method:'POST',body:deckRow,prefer:'resolution=merge-duplicates,return=representation'}),publicDeck=up?.[0]
    if(!publicDeck)throw new Error(`Failed to upsert public deck ${d.name}`)
    if(!d.supported||!d.analysis){synced++;continue}
    const a=d.analysis,identity=`public_deck_id=eq.${encodeURIComponent(publicDeck.id)}&engine_version=eq.${encodeURIComponent(a.engineVersion)}&semantic_version=eq.${encodeURIComponent(a.semanticVersion)}&oracle_snapshot_hash=eq.${encodeURIComponent(a.oracleSnapshotHash)}&iterations=eq.${a.iterations}&select=id&limit=1`,exists=await rest(`public_deck_analyses?${identity}`)
    if(exists?.length){skipped++;synced++;continue}
    const generatedEvidence=d.oracleCards||[]
    if(generatedEvidence.length<50||generatedEvidence.filter(c=>c.isCommander).length!==1)throw new Error(`Generated Oracle evidence incomplete for ${d.name}`)
    const generatedSnapshot=snapshotHash(generatedEvidence)
    if(generatedSnapshot!==a.oracleSnapshotHash)throw new Error(`Generated Oracle evidence hash mismatch for ${d.name}`)
    const deckCards=parseDecklist(d.decklist).map(name=>cardsByName.get(name.toLowerCase())),commander=cardsByName.get(String(d.commanderName).toLowerCase())
    if(deckCards.some(x=>!x)||!commander)throw new Error(`Fresh Scryfall resolution incomplete for ${d.name}`)
    const freshSnapshot=snapshotHash([...deckCards,commander])
    if(freshSnapshot!==a.oracleSnapshotHash)throw new Error(`Oracle snapshot changed for ${d.name}: regenerate catalog before syncing`)
    const cards=evidenceFromDetail(generatedEvidence),runPayload={user_id:null,deck_id:null,deck_hash:d.deckHash,deck_name:d.name,commander_name:d.commanderName,decklist:d.decklist,cards,result:d.result,engine_version:a.engineVersion,semantic_version:a.semanticVersion,oracle_snapshot_hash:a.oracleSnapshotHash,scryfall_oracle_date:a.scryfallOracleDate,source:'precon',iterations:a.iterations,median:a.median,p20:a.p20,p80:a.p80,peak:a.peak,coverage:a.coverage}
    const run=(await rest('analysis_runs',{method:'POST',body:runPayload,prefer:'return=representation'}))?.[0];if(!run)throw new Error(`Failed to create audit run for ${d.name}`);createdRuns++
    const pa={public_deck_id:publicDeck.id,analysis_run_id:run.id,deck_hash:d.deckHash,engine_version:a.engineVersion,semantic_version:a.semanticVersion,oracle_snapshot_hash:a.oracleSnapshotHash,scryfall_oracle_date:a.scryfallOracleDate,iterations:a.iterations,median:a.median,p20:a.p20,p80:a.p80,peak:a.peak,coverage:a.coverage,result:d.result}
    await rest('public_deck_analyses',{method:'POST',body:pa,prefer:'return=minimal'});await rest(`public_decks?id=eq.${encodeURIComponent(publicDeck.id)}`,{method:'PATCH',body:{latest_analysis_at:new Date().toISOString()},prefer:'return=minimal'});synced++
  }
  console.log(`Synced ${synced}/${detailRows.length} public decks. Created ${createdRuns} new versioned analysis_runs; skipped ${skipped} existing analysis snapshots.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
