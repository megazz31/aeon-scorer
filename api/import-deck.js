const MOXFIELD_BASES=[
  'https://api2.moxfield.com/v3/decks/all/',
  'https://api2.moxfield.com/v2/decks/all/',
  'https://api.moxfield.com/v2/decks/all/',
]
const USER_AGENT='AeonScorer/3.3 deck-import (+https://aeon-scorer.vercel.app)'
const clean=v=>String(v??'').trim()
const qty=v=>{const n=Number(v??1);return Number.isFinite(n)&&n>0?Math.floor(n):0}
const key=name=>clean(name).toLowerCase()
const ARCHIDEKT_SIDE_ZONES=new Set(['sideboard','maybeboard','considering','companion'])
const RETRYABLE=new Set([408,425,429,500,502,503,504])

export function parseDeckSource(input){
  let url
  try{url=new URL(clean(input))}catch{throw new Error('Invalid deck URL.')}
  if(url.protocol!=='https:')throw new Error('Deck URL must use HTTPS.')
  if(/(^|\.)moxfield\.com$/i.test(url.hostname)){
    const id=url.pathname.match(/\/decks\/([A-Za-z0-9_-]+)/i)?.[1]
    if(!id)throw new Error('Invalid Moxfield deck URL.')
    return {source:'moxfield',id,url:url.toString()}
  }
  if(/(^|\.)archidekt\.com$/i.test(url.hostname)){
    const id=url.pathname.match(/\/decks\/(\d+)/i)?.[1]
    if(!id)throw new Error('Invalid Archidekt deck URL.')
    return {source:'archidekt',id,url:url.toString()}
  }
  throw new Error('Only Moxfield and Archidekt deck URLs are supported.')
}

function mergeCards(cards){const out=new Map();for(const raw of cards){const name=clean(raw?.name),quantity=qty(raw?.quantity);if(!name||!quantity)continue;const k=key(name),prev=out.get(k);if(prev)prev.quantity+=quantity;else out.set(k,{name,quantity})}return [...out.values()]}
function boardEntries(board){if(!board)return [];if(Array.isArray(board))return board.map(entry=>({name:clean(entry?.card?.name||entry?.card?.cardName||entry?.name),quantity:qty(entry?.quantity??entry?.qty)}));return Object.entries(board).map(([fallback,entry])=>({name:clean(entry?.card?.name||entry?.card?.cardName||entry?.name||fallback),quantity:qty(entry?.quantity??entry?.qty)}))}
function withoutCommanders(cards,commanderNames){const names=new Set(commanderNames.map(key));return mergeCards(cards.filter(c=>!names.has(key(c.name))))}
function formatDecklist(cards){return cards.map(c=>`${c.quantity} ${c.name}`).join('\n')}
function finishImport(source,deckName,commanders,mainboard,sourceUrl){
  const cmd=mergeCards(commanders)
  if(cmd.length<1||cmd.length>2||cmd.some(x=>x.quantity!==1))throw new Error('Aeon supports one commander or a two-card command zone. Imported commander slots must contain one copy each.')
  const commanderNames=cmd.map(x=>x.name),cards=withoutCommanders(mainboard,commanderNames),cardCount=cards.reduce((sum,c)=>sum+c.quantity,0)
  if(!cards.length)throw new Error('No main-deck cards were found in this deck.')
  return {source,deckName:clean(deckName)||null,commanderName:commanderNames[0],commanderNames,decklist:formatDecklist(cards),cardCount,sourceUrl}
}

export function normalizeMoxfield(payload,sourceUrl=''){
  const legacyCommanders=boardEntries(payload?.commanders),legacyMain=boardEntries(payload?.mainboard)
  const commanders=legacyCommanders.length?legacyCommanders:boardEntries(payload?.boards?.commanders?.cards)
  const mainboard=legacyMain.length?legacyMain:boardEntries(payload?.boards?.mainboard?.cards)
  return finishImport('moxfield',payload?.name,commanders,mainboard,sourceUrl)
}
function archCardName(entry){return clean(entry?.card?.oracleCard?.name||entry?.card?.oracle_card?.name||entry?.card?.displayName||entry?.card?.name||entry?.name)}
function archCategoryIndex(categories){const byId=new Map(),included=new Map();for(const c of categories||[]){const name=clean(c?.name);if(!name)continue;included.set(name.toLowerCase(),c?.includedInDeck!==false);if(c?.id!=null)byId.set(String(c.id),name)}return {byId,included}}
function archCategoryNames(entry,index){const raw=[];if(Array.isArray(entry?.categories))raw.push(...entry.categories);if(entry?.category!=null)raw.push(entry.category);return raw.map(c=>typeof c==='object'?clean(c?.name):index.byId.get(String(c))||clean(c)).filter(Boolean)}
export function normalizeArchidekt(payload,sourceUrl=''){
  const index=archCategoryIndex(payload?.categories),commanders=[],mainboard=[]
  for(const entry of payload?.cards||[]){
    const name=archCardName(entry),quantity=qty(entry?.quantity??entry?.qty);if(!name||!quantity)continue
    const cats=archCategoryNames(entry,index),lower=cats.map(x=>x.toLowerCase()),isCommander=lower.some(x=>x==='commander'||x.startsWith('commander '))
    if(isCommander){commanders.push({name,quantity});continue}
    const sideZone=entry?.companion===true||lower.some(x=>ARCHIDEKT_SIDE_ZONES.has(x));if(sideZone)continue
    const included=!cats.length||cats.some(c=>index.included.get(c.toLowerCase())!==false);if(included)mainboard.push({name,quantity})
  }
  return finishImport('archidekt',payload?.name,commanders,mainboard,sourceUrl)
}

const wait=(ms,signal)=>new Promise((resolve,reject)=>{const timer=setTimeout(resolve,ms);if(signal)signal.addEventListener('abort',()=>{clearTimeout(timer);const e=new Error('Aborted');e.name='AbortError';reject(e)},{once:true})})
async function fetchJson(url,signal,{attempts=3,label='upstream'}={}){
  let last=null
  for(let attempt=1;attempt<=attempts;attempt++){
    const started=Date.now()
    try{
      const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':USER_AGENT},signal})
      const durationMs=Date.now()-started
      if(response.ok){if(attempt>1)console.info('[deck-import] upstream recovered',{label,attempt,status:response.status,durationMs});return response.json()}
      const error=new Error(`Upstream returned HTTP ${response.status}.`);error.status=response.status;error.durationMs=durationMs;last=error
      console.warn('[deck-import] upstream response',{label,attempt,status:response.status,durationMs,retry:attempt<attempts&&RETRYABLE.has(response.status)})
      if(attempt>=attempts||!RETRYABLE.has(response.status))throw error
    }catch(error){
      if(error?.name==='AbortError')throw error
      last=error
      const retryable=!error?.status||RETRYABLE.has(error.status)
      console.warn('[deck-import] upstream request failed',{label,attempt,status:error?.status||null,durationMs:Date.now()-started,retry:attempt<attempts&&retryable,error:error?.name||'Error'})
      if(attempt>=attempts||!retryable)throw error
    }
    await wait(Math.min(1800,250*2**(attempt-1)),signal)
  }
  throw last||new Error('Upstream request failed.')
}
async function fetchMoxfield(source,signal){
  let last=null
  for(const base of MOXFIELD_BASES){try{return {...normalizeMoxfield(await fetchJson(`${base}${encodeURIComponent(source.id)}`,signal,{attempts:2,label:`moxfield:${source.id}`}),source.url),sourceId:source.id}}catch(error){last=error;if(error?.name==='AbortError')throw error}}
  if(last?.status===401||last?.status===403||last?.status===404)throw new Error('This Moxfield deck is private, unavailable, or cannot be read without a Moxfield session.')
  if(last?.status===429)throw new Error('Moxfield is rate-limiting imports. The link is valid; try again shortly.')
  if(last?.status>=500)throw new Error('Moxfield is temporarily unavailable. The deck link may still be valid; try again shortly.')
  throw new Error('Moxfield could not be reached right now. Try again shortly.')
}
async function fetchArchidekt(source,signal){
  try{return {...normalizeArchidekt(await fetchJson(`https://archidekt.com/api/decks/${encodeURIComponent(source.id)}/`,signal,{attempts:4,label:`archidekt:${source.id}`}),source.url),sourceId:source.id}}
  catch(error){
    if(error?.name==='AbortError')throw error
    if(error?.status===401||error?.status===403||error?.status===404)throw new Error('This Archidekt deck is private, unavailable, or cannot be read anonymously.')
    if(error?.status===429)throw new Error('Archidekt is rate-limiting imports. The deck link is valid; try again in a moment.')
    if(error?.status>=500)throw new Error('Archidekt is temporarily unavailable. The deck link can still be valid; Aeon retried the request but Archidekt did not recover yet.')
    throw new Error('Archidekt could not be reached right now. The deck link may still be valid; try again shortly.')
  }
}
export async function importDeck(input,signal){const source=parseDeckSource(input);return source.source==='moxfield'?fetchMoxfield(source,signal):fetchArchidekt(source,signal)}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'})}
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch{body={}}}
  const url=clean(body?.url);if(!url)return res.status(400).json({error:'Missing deck URL.'})
  let parsed=null;try{parsed=parseDeckSource(url)}catch(error){return res.status(400).json({error:error.message})}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000),started=Date.now()
  try{const out=await importDeck(url,controller.signal);console.info('[deck-import] success',{source:parsed.source,sourceId:parsed.id,durationMs:Date.now()-started,cardCount:out.cardCount,commanders:out.commanderNames?.length||1});return res.status(200).json(out)}
  catch(error){const timeout=error?.name==='AbortError',message=timeout?'Deck import timed out after several upstream attempts. The deck link may still be valid; try again shortly.':error instanceof Error?error.message:'Unable to import this deck.';console.warn('[deck-import] failed',{source:parsed.source,sourceId:parsed.id,durationMs:Date.now()-started,timeout,status:error?.status||null,error:error?.name||'Error'});return res.status(502).json({error:message,code:timeout?'UPSTREAM_TIMEOUT':'UPSTREAM_IMPORT_FAILED'})}
  finally{clearTimeout(timer)}
}
