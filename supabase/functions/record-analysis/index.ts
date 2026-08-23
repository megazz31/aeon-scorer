import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const ENGINE_VERSION='3.2.0'
const SEMANTIC_VERSION='3.2.0-semantic-11'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const clean=(v:unknown,n=200)=>String(v??'').trim().slice(0,n)
const hashHex=async(s:string)=>{const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const normalizedDeckKey=(decklist:string,commander:string)=>`${commander.trim().toLowerCase()}\n${decklist.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b)).join('\n')}`
function commanderDeckCount(text:string){let include=true,total=0;for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('//')||line.startsWith('#'))continue;const section=line.match(/^(commander|commanders|deck|mainboard|sideboard|maybeboard|considering)\s*:?$/i)?.[1]?.toLowerCase();if(section){include=!['sideboard','maybeboard','considering'].includes(section);continue}if(!include)continue;const leading=line.match(/^(\d+)\s*x?\s+(.+)$/i),trailing=line.match(/^(.+?)\s+[x×](\d+)$/i),qty=leading?Number(leading[1]):trailing?Number(trailing[2]):0;if(Number.isInteger(qty)&&qty>0&&qty<=999)total+=qty}return total}
function canonicalCards(value:unknown){if(!Array.isArray(value))return [];const out:any[]=[];const seen=new Set<string>();for(const raw of value.slice(0,120)){if(!raw||typeof raw!=='object')continue;const c:any=raw,oracleId=clean(c.oracleId||c.oracle_id||c.id,100).toLowerCase(),name=clean(c.name,240);if(!oracleId&&!name)continue;const key=oracleId||name.toLowerCase();if(seen.has(key))continue;seen.add(key);out.push({oracle_id:oracleId||null,scryfall_id:clean(c.scryfallId||c.scryfall_id,100)||null,name,oracle_text:clean(c.oracle||c.oracle_text,10000),type_line:clean(c.type||c.type_line,500),engine_tags:Array.isArray(c.tags)?[...new Set(c.tags.map((x:unknown)=>clean(x,80)).filter(Boolean))].slice(0,80):[]})}return out}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'method_not_allowed'},405)
  try{
    const body=await req.json(),decklist=clean(body.decklist,50000),commanderName=clean(body.commanderName,240),deckHash=clean(body.deckHash,128).toLowerCase(),engineVersion=clean(body.engineVersion,80),semanticVersion=clean(body.semanticVersion,80),iterations=Number(body.iterations),cards=canonicalCards(body.cards),result=body.result&&typeof body.result==='object'?body.result:null
    if(!decklist||!commanderName||!deckHash||!result)return json({error:'invalid_payload'},400)
    if(engineVersion!==ENGINE_VERSION||semanticVersion!==SEMANTIC_VERSION)return json({error:'version_mismatch',expected:{engineVersion:ENGINE_VERSION,semanticVersion:SEMANTIC_VERSION}},409)
    if(!/^[a-f0-9]{64}$/.test(deckHash))return json({error:'invalid_deck_hash'},400)
    if(!Number.isFinite(iterations)||iterations<100||iterations>20000)return json({error:'invalid_iterations'},400)
    const deckCount=commanderDeckCount(decklist);if(deckCount!==99&&deckCount!==100)return json({error:'invalid_commander_deck_size',count:deckCount},400)
    if(cards.length<1||cards.length>120)return json({error:'invalid_cards'},400)
    const computedDeckHash=await hashHex(normalizedDeckKey(decklist,commanderName));if(computedDeckHash!==deckHash)return json({error:'deck_hash_mismatch'},400)
    const oracleSnapshotHash=await hashHex(cards.map(c=>`${c.oracle_id||c.name.toLowerCase()}|${c.type_line}|${c.oracle_text}`).sort().join('\n'))

    const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}})
    let userId:string|null=null;const auth=req.headers.get('authorization')||''
    if(auth.toLowerCase().startsWith('bearer ')){const {data}=await admin.auth.getUser(auth.slice(7));userId=data.user?.id??null}

    const ip=(req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'unknown').split(',')[0].trim(),ua=clean(req.headers.get('user-agent'),220),bucketKey=await hashHex(`${userId?`user:${userId}`:`anon:${ip}:${ua}`}|${serviceKey.slice(-32)}`),limit=userId?120:40
    const {data:allowed,error:budgetError}=await admin.rpc('aeon_consume_ingest_budget',{p_key:bucketKey,p_limit:limit});if(budgetError)throw budgetError;if(!allowed)return json({error:'rate_limited'},429)

    const deckId:string|null=body.deckId?clean(body.deckId,80):null
    if(deckId){if(!userId)return json({error:'deck_requires_auth'},401);const {data:deck,error}=await admin.from('decks').select('id,user_id').eq('id',deckId).maybeSingle();if(error||!deck||deck.user_id!==userId)return json({error:'deck_not_owned'},403)}

    const since=new Date(Date.now()-10*60*1000).toISOString();let dupe=admin.from('analysis_runs').select('id,created_at').eq('deck_hash',deckHash).eq('engine_version',ENGINE_VERSION).eq('semantic_version',SEMANTIC_VERSION).eq('iterations',iterations).gte('created_at',since).order('created_at',{ascending:false}).limit(1);dupe=userId?dupe.eq('user_id',userId):dupe.is('user_id',null);const {data:recent,error:dupeError}=await dupe;if(dupeError)throw dupeError;if(recent?.length)return json({ok:true,duplicate:true,analysis:recent[0]})

    const profile=(result as any)?.profile||{},payload={user_id:userId,deck_id:deckId,deck_hash:deckHash,deck_name:clean(body.deckName,140)||null,commander_name:commanderName,decklist,cards,result,engine_version:ENGINE_VERSION,semantic_version:SEMANTIC_VERSION,oracle_snapshot_hash:oracleSnapshotHash,source:'web',iterations,median:Number.isFinite(Number(profile.median))?Number(profile.median):null,p20:Number.isFinite(Number(profile.floor))?Number(profile.floor):null,p80:Number.isFinite(Number(profile.ceiling))?Number(profile.ceiling):null,peak:Number.isFinite(Number(profile.peak))?Number(profile.peak):null,coverage:Number.isFinite(Number(profile.coverage))?Number(profile.coverage):null}
    const {data,error}=await admin.from('analysis_runs').insert(payload).select('id,created_at,oracle_snapshot_hash').single();if(error)throw error
    return json({ok:true,duplicate:false,analysis:data})
  }catch(e){console.error('record-analysis',e);return json({error:'record_failed',detail:e instanceof Error?e.message:String(e)},500)}
})
