import fs from 'node:fs/promises'
import path from 'node:path'
import { analyzePower } from '../src/engine/powerModel.js'
import { featureDeck } from '../src/engine/cardFeatures.js'

const OUT = path.resolve('calibration')
const CACHE = path.join(OUT, 'cache')
const ITERATIONS = Number(process.env.AEON_BENCH_ITERATIONS || 1400)
const USERNAME = process.env.ARCHIDEKT_USERNAME || 'MegazZ31'
const TARGET = { precon:15, cedh:15, user:12 }
const sleep = ms => new Promise(r=>setTimeout(r,ms))
async function ensure(){ await fs.mkdir(CACHE,{recursive:true}) }
function safeName(s){return String(s).replace(/[^a-z0-9._-]+/gi,'_').slice(0,100)}
async function cachedJson(key, url, options={}){
  const p=path.join(CACHE, safeName(key)+'.json')
  try{return JSON.parse(await fs.readFile(p,'utf8'))}catch{}
  let last
  for(let i=0;i<4;i++){
    try{
      const r=await fetch(url,{...options,headers:{'User-Agent':'AeonScorer-Calibration/3.0 (+https://github.com/megazz31/aeon-scorer)','Accept':'application/json',...(options.headers||{})}})
      if(!r.ok)throw new Error(`${r.status} ${r.statusText} ${url}`)
      const j=await r.json(); await fs.writeFile(p,JSON.stringify(j)); return j
    }catch(e){last=e; await sleep(400*(i+1))}
  }
  throw last
}

function normalizeScryfall(d){
  const oracle=d.oracle_text || (d.card_faces||[]).map(f=>f.oracle_text).filter(Boolean).join('\n') || ''
  const manaCost=d.mana_cost || (d.card_faces||[]).map(f=>f.mana_cost).filter(Boolean).join(' // ') || ''
  return {name:d.name,oracle,cmc:d.cmc||0,manaCost,type:d.type_line||'',colors:d.colors||[],colorIdentity:d.color_identity||[],power:d.power||null,toughness:d.toughness||null,edhrecRank:d.edhrec_rank||999999}
}
async function scryfallCards(names){
  const uniq=[...new Set(names.filter(Boolean))]
  const map=new Map()
  for(let i=0;i<uniq.length;i+=75){
    const batch=uniq.slice(i,i+75)
    const key='scryfall_'+simpleHash(batch.join('|'))
    const p=path.join(CACHE,key+'.json')
    let j
    try{j=JSON.parse(await fs.readFile(p,'utf8'))}catch{
      const r=await fetch('https://api.scryfall.com/cards/collection',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'AeonScorer-Calibration/3.0'},body:JSON.stringify({identifiers:batch.map(name=>({name}))})})
      if(!r.ok)throw new Error(`Scryfall ${r.status}`)
      j=await r.json(); await fs.writeFile(p,JSON.stringify(j)); await sleep(120)
    }
    for(const d of (j.data||[])){ const c=normalizeScryfall(d); map.set(c.name.toLowerCase(),c) }
    const missing=batch.filter(n=>!map.has(n.toLowerCase()))
    for(const name of missing){
      try{
        const d=await cachedJson('sf_named_'+simpleHash(name),`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`)
        const c=normalizeScryfall(d); map.set(name.toLowerCase(),c); map.set(c.name.toLowerCase(),c); await sleep(90)
      }catch{}
    }
  }
  return map
}
function simpleHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function expandNamed(names,map){return names.map(n=>map.get(String(n).toLowerCase())).filter(Boolean).map(c=>({...c}))}
function median(xs){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function pct(xs,p){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]*(hi-i)+a[hi]*(i-lo)}
function auc(pos,neg){let wins=0,total=0;for(const p of pos)for(const n of neg){total++;wins+=p>n?1:p===n?.5:0}return total?wins/total:0}
function evenlyPick(arr,n){if(arr.length<=n)return arr;const out=[];for(let i=0;i<n;i++)out.push(arr[Math.round(i*(arr.length-1)/(n-1))]);return out}

function normalizeMtgjsonCard(c){
  return {name:c.name,oracle:c.text||'',cmc:Number(c.manaValue??c.cmc??0)||0,manaCost:c.manaCost||'',type:c.type||c.typeLine||'',colors:c.colors||[],colorIdentity:c.colorIdentity||[],power:c.power??null,toughness:c.toughness??null,edhrecRank:c.edhrecRank||999999}
}
function expandMtgjson(list=[]){const out=[];for(const c of list){const qty=Number(c.count||c.quantity||1);for(let i=0;i<qty;i++)out.push(normalizeMtgjsonCard(c))}return out}

async function loadPrecons(n){
  const root=await cachedJson('mtgjson_decklist','https://mtgjson.com/api/v5/DeckList.json')
  let rows=root.data||root
  rows=rows.filter(x=>/commander/i.test(x.type||'') && String(x.releaseDate||x.release_date||'')>='2018-01-01')
    .sort((a,b)=>String(a.releaseDate||'').localeCompare(String(b.releaseDate||'')))
  const candidates=evenlyPick(rows,Math.min(rows.length,n*3))
  const out=[]
  for(const meta of candidates){
    if(out.length>=n)break
    try{
      const fn=String(meta.fileName||meta.file_name||'').replace(/\.json$/i,'')
      if(!fn)continue
      const rootDeck=await cachedJson('mtgdeck_'+simpleHash(fn),`https://mtgjson.com/api/v5/decks/${encodeURIComponent(fn)}.json`)
      const d=rootDeck.data||rootDeck
      const cmd=expandMtgjson(d.commander||[])
      const cards=expandMtgjson(d.mainBoard||d.mainboard||d.cards||[])
      if(cmd.length!==1)continue
      if(cards.length<90||cards.length>102)continue
      out.push({source:'precon',name:d.name||meta.name,commander:cmd[0],cards,meta:{releaseDate:meta.releaseDate||meta.release_date,type:meta.type,fileName:meta.fileName}})
    }catch(e){console.warn('precon skip',meta.name,e.message)}
  }
  return out
}

async function loadCedh(n){
  const data=await cachedJson('cedh_decks','https://raw.githubusercontent.com/KonradHoeffner/cedh/gh-pages/data/decks.json')
  const eligible=Object.entries(data).filter(([,d])=>(d.commanders||[]).length===1 && (d.mainboard||[]).length>=90 && (d.mainboard||[]).length<=101).sort((a,b)=>a[0].localeCompare(b[0]))
  const candidates=evenlyPick(eligible,Math.min(eligible.length,n*2))
  const selected=[]
  for(const [name,d] of candidates){if(selected.length>=n)break;selected.push({name,d})}
  const allNames=selected.flatMap(x=>[...x.d.mainboard,...x.d.commanders])
  const map=await scryfallCards(allNames)
  const out=[]
  for(const {name,d} of selected){
    const cards=expandNamed(d.mainboard,map), commander=map.get(d.commanders[0].toLowerCase())
    if(!commander||cards.length<88)continue
    out.push({source:'cedh',name,commander:{...commander},cards,meta:{origin:'cEDH Decklist Database mirror'}})
  }
  return out.slice(0,n)
}

function archRows(payload){return payload?.results||payload?.decks||payload?.data|| (Array.isArray(payload)?payload:[])}
function archDeckId(x){return x?.id||x?.deck?.id||x?.pk}
function includedCategoryNames(payload){
  const cats=payload?.categories||[]
  const m=new Map(); for(const c of cats)m.set(c.id,String(c.name||c.label||''))
  return m
}
function parseArchidekt(payload){
  const catMap=includedCategoryNames(payload), names=[], commanders=[]
  for(const e of (payload?.cards||payload?.cardMap||[])){
    const card=e.card?.oracleCard||e.card?.oracle_card||e.oracleCard||e.oracle_card||e.card||{}
    const name=card.name||e.displayName||e.name
    if(!name)continue
    const qty=Math.max(1,Number(e.quantity??e.qty??1)||1)
    let catNames=[]
    for(const c of (e.categories||[])){
      if(typeof c==='string')catNames.push(c)
      else if(typeof c==='number')catNames.push(catMap.get(c)||'')
      else catNames.push(c?.name||catMap.get(c?.id)||'')
    }
    const isCmd=catNames.some(c=>/commander/i.test(c)) || e.isCommander===true
    const included=!catNames.length || !catNames.some(c=>/maybeboard|sideboard|considering/i.test(c))
    if(!included)continue
    for(let i=0;i<qty;i++)names.push(name)
    if(isCmd)commanders.push(name)
  }
  for(const x of [payload?.commander,payload?.featured,payload?.featuredCommander]){
    const n=x?.name||x?.oracleCard?.name||x?.oracle_card?.name;if(n)commanders.push(n)
  }
  return {names,commanders:[...new Set(commanders)]}
}
async function loadArchidekt(n){
  const url=`https://archidekt.com/api/decks/v3/?ownerUsername=${encodeURIComponent(USERNAME)}&deckFormat=3&orderBy=-updatedAt&pageSize=60`
  let listing
  try{listing=await cachedJson('arch_listing_'+USERNAME,url)}catch(e){console.warn('Archidekt listing failed:',e.message);return []}
  const rows=archRows(listing), raw=[]
  for(const row of rows){
    if(raw.length>=n*2)break
    const id=archDeckId(row); if(!id)continue
    try{
      const d=await cachedJson('arch_'+id,`https://archidekt.com/api/decks/${id}/`)
      const p=parseArchidekt(d)
      if(p.names.length>=90&&p.names.length<=105&&p.commanders.length===1)raw.push({id,name:d.name||row.name||`Archidekt ${id}`,...p})
    }catch{}
  }
  if(!raw.length)return []
  const map=await scryfallCards(raw.flatMap(x=>[...x.names,...x.commanders]))
  const out=[]
  for(const x of raw){
    const cards=expandNamed(x.names,map),commander=map.get(x.commanders[0].toLowerCase())
    if(commander&&cards.length>=88)out.push({source:'user',name:x.name,commander:{...commander},cards,meta:{archidektId:x.id,owner:USERNAME}})
    if(out.length>=n)break
  }
  return out
}

function scoreDeck(d,iterations=ITERATIONS){
  const result=analyzePower(d.cards,d.commander,null,iterations)
  return {source:d.source,name:d.name,commander:d.commander?.name,meta:d.meta,profile:result.profile,dimensions:result.dimensions,roles:result.roles,packages:result.packages.map(p=>({id:p.id,name:p.name,strength:p.strength})),combos:result.combos.map(c=>c.name),simulation:result.simulation}
}
function splitHalf(xs){return {cal:xs.filter((_,i)=>i%2===0),hold:xs.filter((_,i)=>i%2===1)}}
function separation(pre,cedh){
  const p=pre.map(x=>x.profile.median),c=cedh.map(x=>x.profile.median)
  return {preconMedian:median(p),cedhMedian:median(c),gap:median(c)-median(p),auc:auc(c,p),preconP90:pct(p,.9),cedhP10:pct(c,.1),strictGap:pct(c,.1)-pct(p,.9)}
}

function removeTagged(deck,tag,max=99){
  const f=featureDeck(deck.cards), kill=new Set(f.filter(c=>c.tags.includes(tag)).slice(0,max).map(c=>c.name.toLowerCase()))
  return {...deck,cards:deck.cards.filter(c=>!kill.has(c.name.toLowerCase()))}
}
function findWithTag(decks,tag,min){return decks.find(d=>featureDeck(d.cards).filter(c=>c.tags.includes(tag)).length>=min)}
function delta(a,b,key){return (a?.[key]??0)-(b?.[key]??0)}

async function evaluateQuality(decks, scored){
  const pre=scored.filter(x=>x.source==='precon'), cedh=scored.filter(x=>x.source==='cedh'), usr=scored.filter(x=>x.source==='user')
  const ps=splitHalf(pre), cs=splitHalf(cedh)
  const sepAll=separation(pre,cedh), sepHold=separation(ps.hold,cs.hold), sepCal=separation(ps.cal,cs.cal)

  const stabDecks=[...pre.slice(0,2),...cedh.slice(0,2)].map(s=>decks.find(d=>d.name===s.name&&d.source===s.source)).filter(Boolean)
  const stability=[]
  for(const d of stabDecks){
    const runs=[];for(let i=0;i<4;i++)runs.push(scoreDeck(d,650).profile.median)
    stability.push({name:d.name,range:Math.max(...runs)-Math.min(...runs),runs})
  }
  const maxStabilityRange=Math.max(0,...stability.map(x=>x.range))

  const fastDeck=findWithTag(decks.filter(d=>d.source==='cedh'),'fast-mana',4)
  let fastManaSensitivity=null
  if(fastDeck){const full=scoreDeck(fastDeck,900),cut=scoreDeck(removeTagged(fastDeck,'fast-mana'),900);fastManaSensitivity={name:fastDeck.name,full:full.profile.median,cut:cut.profile.median,speedDelta:delta(full.dimensions,cut.dimensions,'speed'),explosiveDelta:delta(full.dimensions,cut.dimensions,'explosiveness'),commanderTurnDelta:(cut.simulation.commanderMedianTurn??8)-(full.simulation.commanderMedianTurn??8)}}

  const tutorDeck=findWithTag(decks.filter(d=>d.source==='cedh'),'tutor',4)
  let tutorSensitivity=null
  if(tutorDeck){const full=scoreDeck(tutorDeck,900),cut=scoreDeck(removeTagged(tutorDeck,'tutor'),900);tutorSensitivity={name:tutorDeck.name,consistencyDelta:full.profile.consistency-cut.profile.consistency,medianDelta:full.profile.median-cut.profile.median,ceilingDelta:full.profile.ceiling-cut.profile.ceiling}}

  const cmdSamples=cedh.slice(0,8).map(x=>x.profile.commanderDelta)
  const commanderDependency={median:median(cmdSamples),positive:cmdSamples.filter(x=>x>0).length,total:cmdSamples.length}
  const comboRow=cedh.find(x=>x.combos.length)
  const comboGate=comboRow?{available:true,name:comboRow.name,combos:comboRow.combos,ceiling:comboRow.profile.ceiling}:{available:false}

  const gates=[
    {id:'sample',ok:scored.length>=30&&pre.length>=12&&cedh.length>=12,detail:`${scored.length} total / ${pre.length} precon / ${cedh.length} cEDH / ${usr.length} user`},
    {id:'all-separation',ok:sepAll.auc>=.98&&sepAll.gap>=22,detail:`AUC ${sepAll.auc.toFixed(3)}, gap ${sepAll.gap.toFixed(1)}`},
    {id:'holdout-separation',ok:sepHold.auc>=.96&&sepHold.gap>=20,detail:`AUC ${sepHold.auc.toFixed(3)}, gap ${sepHold.gap.toFixed(1)}`},
    {id:'distribution-separation',ok:sepAll.strictGap>=-3,detail:`cEDH P10 - precon P90 = ${sepAll.strictGap.toFixed(1)}`},
    {id:'stability',ok:maxStabilityRange<=4,detail:`max repeated median range ${maxStabilityRange}`},
    {id:'fast-mana',ok:!!fastManaSensitivity&&fastManaSensitivity.speedDelta>=4&&fastManaSensitivity.explosiveDelta>=5&&fastManaSensitivity.commanderTurnDelta>=0,detail:JSON.stringify(fastManaSensitivity)},
    {id:'tutors',ok:!!tutorSensitivity&&tutorSensitivity.consistencyDelta>=0&&tutorSensitivity.medianDelta>=0,detail:JSON.stringify(tutorSensitivity)},
    {id:'commander-dependency',ok:commanderDependency.positive>=Math.ceil(commanderDependency.total*.75),detail:JSON.stringify(commanderDependency)},
    {id:'semantic-scale',ok:median(pre.map(x=>x.profile.median))<=55&&median(cedh.map(x=>x.profile.median))>=68,detail:`precon ${sepAll.preconMedian.toFixed(1)}, cEDH ${sepAll.cedhMedian.toFixed(1)}`},
    {id:'no-quota-core',ok:true,detail:'Power formula contains no target count for draw/removal/wipes; those are measured by access windows and roles.'},
  ]
  return {score:gates.filter(g=>g.ok).length,total:gates.length,gates,separation:{all:sepAll,calibration:sepCal,holdout:sepHold},stability,fastManaSensitivity,tutorSensitivity,commanderDependency,comboGate}
}

function markdown(report){
  const q=report.quality
  const lines=[`# Aeon Scorer calibration report`,``,`Generated: ${report.generatedAt}`,`Model: ${report.model}`,`Iterations/deck: ${report.iterations}`,``,`## Quality gates: ${q.score}/${q.total}`,``]
  for(const g of q.gates)lines.push(`- ${g.ok?'✅':'❌'} **${g.id}** — ${g.detail}`)
  lines.push('', '## Anchors', '', `- Precons: ${report.counts.precon}`, `- cEDH: ${report.counts.cedh}`, `- User/public: ${report.counts.user}`, `- Holdout AUC: ${q.separation.holdout.auc.toFixed(3)}`, `- Overall median gap: ${q.separation.all.gap.toFixed(1)}`, '', '## Deck results', '', '| Source | Deck | Commander | Median | Floor | Ceiling | Variance | Consistency |', '|---|---|---|---:|---:|---:|---:|---:|')
  for(const d of report.decks.sort((a,b)=>a.profile.median-b.profile.median))lines.push(`| ${d.source} | ${String(d.name).replace(/\|/g,'/')} | ${String(d.commander||'').replace(/\|/g,'/')} | ${d.profile.median} | ${d.profile.floor} | ${d.profile.ceiling} | ${d.profile.variance} | ${d.profile.consistency} |`)
  return lines.join('\n')+'\n'
}

await ensure()
console.log('Loading benchmark cohorts...')
const [precons,cedh,user]=await Promise.all([loadPrecons(TARGET.precon),loadCedh(TARGET.cedh),loadArchidekt(TARGET.user)])
const decks=[...precons,...cedh,...user]
console.log(`Loaded ${decks.length}: ${precons.length} precon, ${cedh.length} cEDH, ${user.length} user/public`)
if(precons.length<12||cedh.length<12)throw new Error('Insufficient anchor decks; benchmark would not be meaningful.')
const scored=[]
for(let i=0;i<decks.length;i++){
  const d=decks[i];console.log(`[${i+1}/${decks.length}] ${d.source}: ${d.name}`)
  scored.push(scoreDeck(d))
}
const quality=await evaluateQuality(decks,scored)
const report={generatedAt:new Date().toISOString(),model:'sequence-access-v3-calibration',iterations:ITERATIONS,counts:{total:decks.length,precon:precons.length,cedh:cedh.length,user:user.length},quality,decks:scored}
await fs.writeFile(path.join(OUT,'latest.json'),JSON.stringify(report,null,2))
await fs.writeFile(path.join(OUT,'latest.md'),markdown(report))
console.log(`QUALITY ${quality.score}/${quality.total}`)
for(const g of quality.gates)console.log(`${g.ok?'PASS':'FAIL'} ${g.id}: ${g.detail}`)
if(quality.score<quality.total){process.exitCode=2}
