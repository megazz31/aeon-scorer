import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const clean=(v:unknown,n=200)=>String(v??'').trim().slice(0,n)
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'method_not_allowed'},405)
  try{
    const body=await req.json(),decklist=clean(body.decklist,50000),commanderName=clean(body.commanderName,240),deckHash=clean(body.deckHash,128),engineVersion=clean(body.engineVersion,80),semanticVersion=clean(body.semanticVersion,80),iterations=Number(body.iterations||0),cards=Array.isArray(body.cards)?body.cards.slice(0,120):[],result=body.result&&typeof body.result==='object'?body.result:null
    if(!decklist||!commanderName||!deckHash||!engineVersion||!semanticVersion||!result)return json({error:'invalid_payload'},400)
    if(cards.length<1||cards.length>120)return json({error:'invalid_cards'},400)
    if(iterations&&(!Number.isFinite(iterations)||iterations<100||iterations>20000))return json({error:'invalid_iterations'},400)
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
    let userId:string|null=null;const auth=req.headers.get('authorization')||''
    if(auth.toLowerCase().startsWith('bearer ')){const {data}=await admin.auth.getUser(auth.slice(7));userId=data.user?.id??null}
    const deckId:string|null=body.deckId?clean(body.deckId,80):null
    if(deckId){if(!userId)return json({error:'deck_requires_auth'},401);const {data:deck,error}=await admin.from('decks').select('id,user_id').eq('id',deckId).maybeSingle();if(error||!deck||deck.user_id!==userId)return json({error:'deck_not_owned'},403)}
    const profile=(result as any)?.profile||{},payload={user_id:userId,deck_id:deckId,deck_hash:deckHash,deck_name:clean(body.deckName,140)||null,commander_name:commanderName,decklist,cards,result,engine_version:engineVersion,semantic_version:semanticVersion,source:'web',iterations:iterations||null,median:Number.isFinite(Number(profile.median))?Number(profile.median):null,p20:Number.isFinite(Number(profile.floor))?Number(profile.floor):null,p80:Number.isFinite(Number(profile.ceiling))?Number(profile.ceiling):null,peak:Number.isFinite(Number(profile.peak))?Number(profile.peak):null,coverage:Number.isFinite(Number(profile.coverage))?Number(profile.coverage):null}
    const {data,error}=await admin.from('analysis_runs').insert(payload).select('id,created_at').single();if(error)throw error
    return json({ok:true,analysis:data})
  }catch(e){console.error('record-analysis',e);return json({error:'record_failed',detail:e instanceof Error?e.message:String(e)},500)}
})
