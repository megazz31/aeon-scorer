import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5'

const REPO='megazz31/aeon-scorer'
const AUD='aeon-scorer-auditor'
const SEMANTIC_VERSION='3.2.0-semantic-1'
const MODEL='github-models/openai/gpt-4.1'
const MAX_CARDS=200
const ALLOWED=new Set(['draw','tutor','repeatable-tutor','fast-mana','burst-mana','land-ramp','mana','removal','tempo-interaction','counterspell','wipe','protection','recursion','graveyard-setup','tokens','token-payoff','token-doubler','sac-outlet','sac-enabler','death-payoff','etb','blink','constellation','artifact-payoff','landfall','counter-producer','counter-payoff','counter-doubler','lifegain','life-payoff','spellslinger','exile-cast','exile-payoff','cheat','free','stax','extra-turn','extra-combat','win','trigger-doubler'])
const jwks=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'}
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers})
const clean=(v:unknown,n=1000)=>String(v??'').trim().slice(0,n)
const norm=(v:unknown)=>clean(v,180).toLowerCase()
const tags=(v:unknown)=>Array.isArray(v)?[...new Set(v.map(norm).filter(x=>ALLOWED.has(x)))].sort():[]
const same=(a:string[],b:string[])=>a.length===b.length&&a.every((x,i)=>x===b[i])
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms))
async function hash(s:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function verify(req:Request){const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))throw new Error('missing_oidc');const {payload}=await jwtVerify(auth.slice(7),jwks,{issuer:'https://token.actions.githubusercontent.com',audience:AUD});if(payload.repository!==REPO)throw new Error('wrong_repository');if(payload.ref!=='refs/heads/main')throw new Error('wrong_ref');return payload}
function normalizeScryfall(c:any){const faces=c.card_faces||[],oracle=c.oracle_text||faces.map((f:any)=>f.oracle_text||'').join('\n'),produced=c.produced_mana||[...new Set(faces.flatMap((f:any)=>f.produced_mana||[]))];return {oracle_id:norm(c.oracle_id||c.id),scryfall_id:clean(c.id,80),name:clean(c.name,180),oracle_text:clean(oracle,5000),type_line:clean(c.type_line,400),cmc:Number(c.cmc||0),mana_cost:clean(c.mana_cost||faces.map((f:any)=>f.mana_cost||'').join(' // '),300),produced_mana:produced||[],colors:c.colors||[]}}
async function officialCards(analyses:any[]){
  const requested=new Map<string,any>()
  for(const a of analyses)for(const c of Array.isArray(a.cards)?a.cards:[]){const sf=clean(c.scryfallId||c.scryfall_id||'',80),name=clean(c.name,180);if(!sf&&!name)continue;const key=sf?`id:${sf}`:`name:${name.toLowerCase()}`;if(!requested.has(key))requested.set(key,sf?{id:sf}:{name})}
  const official:any[]=[];const identifiers=[...requested.values()]
  for(let i=0;i<identifiers.length;i+=75){const group=identifiers.slice(i,i+75),r=await fetch('https://api.scryfall.com/cards/collection',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'AeonScorer/3.2 semantic-auditor'},body:JSON.stringify({identifiers:group})});if(!r.ok)throw new Error(`Scryfall collection ${r.status}`);const body=await r.json();official.push(...(body.data||[]).map(normalizeScryfall));if(i+75<identifiers.length)await wait(120)}
  const byPrint=new Map(official.map(c=>[c.scryfall_id,c])),byName=new Map(official.map(c=>[c.name.toLowerCase(),c])),all=new Map<string,any>(),counts=new Map<string,number>(),per=new Map<string,string[]>()
  for(const a of analyses){const ids:string[]=[];for(const raw of Array.isArray(a.cards)?a.cards:[]){const sf=clean(raw.scryfallId||raw.scryfall_id||'',80),name=clean(raw.name,180).toLowerCase(),c=(sf&&byPrint.get(sf))||byName.get(name);if(!c)continue;ids.push(c.oracle_id);counts.set(c.oracle_id,(counts.get(c.oracle_id)||0)+1);if(!all.has(c.oracle_id))all.set(c.oracle_id,c)}per.set(a.id,[...new Set(ids)])}
  return {all,counts,per}
}
async function existing(admin:any,ids:string[]){const out:any[]=[];for(let i=0;i<ids.length;i+=80){const part=ids.slice(i,i+80);if(!part.length)continue;const {data,error}=await admin.from('card_semantics').select('*').in('oracle_id',part);if(error)throw error;out.push(...(data||[]))}return out}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers})
  if(req.method!=='POST')return json({error:'method_not_allowed'},405)
  try{
    await verify(req)
    const body=await req.json().catch(()=>({})),action=clean(body.action,20),admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
    if(action==='claim'){
      await admin.rpc('aeon_reset_stale_audits')
      const {data:claimed,error}=await admin.rpc('aeon_claim_audit_batch',{batch_size:6});if(error)throw error
      const analyses=claimed||[];if(!analyses.length)return json({ok:true,empty:true,model:MODEL,semantic_version:SEMANTIC_VERSION})
      const {all,counts,per}=await officialCards(analyses),ids=[...all.keys()],old=await existing(admin,ids),by=new Map(old.map((x:any)=>[x.oracle_id,x]))
      const occurrence=old.map((x:any)=>({oracle_id:x.oracle_id,count:counts.get(x.oracle_id)||1}));if(occurrence.length)await admin.rpc('aeon_increment_card_occurrences',{p_counts:occurrence})
      const candidates:any[]=[];for(const [id,c] of all){const h=await hash(`${c.type_line}\n${c.oracle_text}`),prev=by.get(id);c.oracle_hash=h;if(!prev||prev.oracle_hash!==h||prev.semantic_version!==SEMANTIC_VERSION)candidates.push(c)}
      const chosen=candidates.slice(0,MAX_CARDS),analysisIds=analyses.map((a:any)=>a.id),{data:run,error:runErr}=await admin.from('audit_runs').insert({status:'running',model:MODEL,analysis_ids:analysisIds,candidate_count:chosen.length,cards_considered:all.size}).select('id').single();if(runErr)throw runErr
      return json({ok:true,run_id:run.id,model:MODEL,semantic_version:SEMANTIC_VERSION,cards:chosen,analysis_ids:analysisIds,deferred:Math.max(0,candidates.length-chosen.length),analysis_card_ids:Object.fromEntries([...per])})
    }
    const runId=clean(body.run_id,80);if(!runId)return json({error:'missing_run_id'},400)
    const {data:run,error:runErr}=await admin.from('audit_runs').select('*').eq('id',runId).maybeSingle();if(runErr||!run)return json({error:'run_not_found'},404)
    const analysisIds=run.analysis_ids||[],{data:analyses,error:aErr}=await admin.from('analysis_runs').select('id,cards,engine_version,semantic_version').in('id',analysisIds);if(aErr)throw aErr
    if(action==='fail'){const reason=clean(body.error,1800)||'worker failed';for(const a of analyses||[])await admin.rpc('aeon_finish_audit_item',{p_analysis_id:a.id,p_ok:false,p_error:reason});await admin.from('audit_runs').update({status:'failed',notes:reason,finished_at:new Date().toISOString()}).eq('id',runId);return json({ok:true})}
    if(action!=='submit')return json({error:'unknown_action'},400)
    const {all,per}=await officialCards(analyses||[]),reported=Array.isArray(body.cards)?body.cards:[],upserts:any[]=[]
    for(const item of reported){const id=norm(item.oracle_id),base=all.get(id);if(!base)continue;const auditor=tags(item.semantic_tags),engine=tags(item.engine_tags),confidence=Math.max(0,Math.min(1,Number(item.confidence)||0));upserts.push({oracle_id:id,oracle_hash:await hash(`${base.type_line}\n${base.oracle_text}`),card_name:base.name,oracle_text:base.oracle_text,type_line:base.type_line,engine_tags:engine,auditor_tags:auditor,auditor_confidence:confidence,disagreement:!same(engine,auditor),rationale:clean(item.rationale,1200),semantic_version:SEMANTIC_VERSION,occurrences:1,last_seen_at:new Date().toISOString(),audited_at:new Date().toISOString()})}
    if(upserts.length){const {error}=await admin.from('card_semantics').upsert(upserts,{onConflict:'oracle_id'});if(error)throw error}
    let findings=0
    for(const f of Array.isArray(body.findings)?body.findings:[]){const affected=(Array.isArray(f.affected_oracle_ids)?f.affected_oracle_ids:[]).map(norm).filter((id:string)=>all.has(id));if(!affected.length)continue;const kind=clean(f.finding_type,100)||'semantic_mismatch',rule=clean(f.suspected_rule,180)||'unknown_rule',fingerprint=await hash(`${kind}|${rule}`),severity=['low','medium','high','critical'].includes(norm(f.severity))?norm(f.severity):'medium',confidence=Math.max(0,Math.min(1,Number(f.confidence)||0)),{error}=await admin.rpc('aeon_upsert_finding',{p_fingerprint:fingerprint,p_finding_type:kind,p_suspected_rule:rule,p_summary:clean(f.summary,1200),p_affected_cards:affected.map((id:string)=>({oracle_id:id,name:all.get(id)?.name})),p_evidence:{analysis_ids:analysisIds,semantic_version:SEMANTIC_VERSION,model:MODEL},p_severity:severity,p_confidence:confidence});if(error)throw error;findings++}
    const allIds=[...all.keys()],nowSem=await existing(admin,allIds),semBy=new Map(nowSem.map((x:any)=>[x.oracle_id,x]));let completed=0,requeued=0
    for(const a of analyses||[]){let ready=true;for(const id of per.get(a.id)||[]){const c=all.get(id),s=semBy.get(id);if(!s||s.semantic_version!==SEMANTIC_VERSION||s.oracle_hash!==await hash(`${c.type_line}\n${c.oracle_text}`)){ready=false;break}}if(ready){await admin.rpc('aeon_finish_audit_item',{p_analysis_id:a.id,p_ok:true,p_error:null});completed++}else{await admin.rpc('aeon_requeue_audit_item',{p_analysis_id:a.id,p_reason:'semantic backlog remaining'});requeued++}}
    await admin.from('audit_runs').update({status:'success',analyses_processed:completed,cards_audited:upserts.length,findings_created:findings,notes:requeued?`${requeued} analysis(es) requeued for remaining cards`:null,finished_at:new Date().toISOString()}).eq('id',runId)
    return json({ok:true,completed,requeued,cards_audited:upserts.length,findings})
  }catch(e){console.error('github-audit-gateway',e);return json({error:'gateway_failed',detail:clean(e instanceof Error?e.message:String(e),1200)},401)}
})
