import fs from 'node:fs/promises'
import path from 'node:path'
import { analyzePower } from '../src/engine/powerModel.js'
import { featureDeck } from '../src/engine/cardFeatures.js'

const OUT=path.resolve('calibration')
const CACHE=path.join(OUT,'cache')
const ITERATIONS=Number(process.env.AEON_BENCH_ITERATIONS||1800)
const USERNAME=process.env.ARCHIDEKT_USERNAME||'MegazZ31'
const TARGET={precon:15,cedh:15,user:12}
const sleep=ms=>new Promise(r=>setTimeout(r,ms))

async function ensure(){await fs.mkdir(CACHE,{recursive:true})}
async function fetchWithBackoff(url,options={},attempts=7){
  let last
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url,options)
      if(r.ok)return r
      if(r.status===429||r.status>=500){const retry=Number(r.headers.get('retry-after')||0);await sleep(Math.max(retry*1000,450*(i+1)));last=new Error(`${r.status} ${r.statusText} ${url}`);continue}
      const e=new Error(`${r.status} ${r.statusText} ${url}`);e.status=r.status;throw e
    }catch(e){last=e;if(i<attempts-1)await sleep(450*(i+1))}
  }
  throw last
}
function safeName(s){return String(s).replace(/[^a-z0-9._-]+/gi,'_').slice(0,100)}
function simpleHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
async function cachedJson(key,url,options={}){
  const p=path.join(CACHE,safeName(key)+'.json')
  try{return JSON.parse(await fs.readFile(p,'utf8'))}catch{}
  const r=await fetchWithBackoff(url,{...options,headers:{'User-Agent':'AeonScorer-Calibration/3.1 (+https://github.com/megazz31/aeon-scorer)','Accept':'application/json',...(options.headers||{})}})
  const j=await r.json();await fs.writeFile(p,JSON.stringify(j));return j
}
function canonical(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim()}
function acceptableFuzzy(requested,card){const q=canonical(requested),names=[card.name,...(card.aliases||[])].map(canonical);if(names.includes(q))return true;return names.some(n=>(n.startsWith(q)||q.startsWith(n))&&Math.abs(n.length-q.length)<=3)}
function normalizeScryfall(d){
  const faces=d.card_faces||[],oracle=d.oracle_text||faces.map(f=>f.oracle_text).filter(Boolean).join('\n')||'',manaCost=d.mana_cost||faces.map(f=>f.mana_cost).filter(Boolean).join(' // ')||'',producedMana=d.produced_mana||[...new Set(faces.flatMap(f=>f.produced_mana||[]))]
  return {name:d.name,aliases:faces.map(f=>f.name).filter(Boolean),oracle,cmc:Number(d.cmc||0),manaCost,type:d.type_line||'',colors:d.colors||[],colorIdentity:d.color_identity||[],producedMana:producedMana||[],legalities:d.legalities||{},power:d.power??faces[0]?.power??null,toughness:d.toughness??faces[0]?.toughness??null,edhrecRank:d.edhrec_rank??999999}
}
function indexCard(map,c,requested=null){map.set(c.name.toLowerCase(),c);for(const a of c.aliases||[])map.set(a.toLowerCase(),c);if(requested)map.set(String(requested).toLowerCase(),c)}
async function scryfallCards(names){
  const uniq=[...new Set(names.filter(Boolean))],map=new Map()
  for(let i=0;i<uniq.length;i+=75){
    const batch=uniq.slice(i,i+75),key='scryfall31_'+simpleHash(batch.join('|')),p=path.join(CACHE,key+'.json');let j
    try{j=JSON.parse(await fs.readFile(p,'utf8'))}catch{const r=await fetchWithBackoff('https://api.scryfall.com/cards/collection',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'AeonScorer-Calibration/3.1'},body:JSON.stringify({identifiers:batch.map(name=>({name}))})});j=await r.json();await fs.writeFile(p,JSON.stringify(j));await sleep(180)}
    for(const d of j.data||[])indexCard(map,normalizeScryfall(d))
    for(const name of batch.filter(n=>!map.has(n.toLowerCase()))){
      let card=null
      try{card=normalizeScryfall(await cachedJson('sf31_exact_'+simpleHash(name),`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`))}catch{}
      if(!card){try{const c=normalizeScryfall(await cachedJson('sf31_fuzzy_'+simpleHash(name),`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`));if(acceptableFuzzy(name,c))card=c}catch{}}
      if(card)indexCard(map,card,name);await sleep(80)
    }
  }
  return map
}
function resolveNamed(names,map){const cards=[],missing=[];for(const n of names){const c=map.get(String(n).toLowerCase());if(c)cards.push({...c});else missing.push(n)}return {cards,missing}}
function median(xs){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function pct(xs,p){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]*(hi-i)+a[hi]*(i-lo)}
function auc(pos,neg){let wins=0,total=0;for(const p of pos)for(const n of neg){total++;wins+=p>n?1:p===n?.5:0}return total?wins/total:0}
function evenlyPick(arr,n){if(arr.length<=n)return arr;const out=[];for(let i=0;i<n;i++)out.push(arr[Math.round(i*(arr.length-1)/(n-1))]);return out}
function diversifyByCommander(arr,n){
  const sorted=[...arr].sort((a,b)=>String(a.commander?.name||'').localeCompare(String(b.commander?.name||''))||String(a.name).localeCompare(String(b.name))),seen=new Set(),unique=[]
  for(const d of sorted){const key=canonical(d.commander?.name);if(key&&!seen.has(key)){seen.add(key);unique.push(d)}}
  if(unique.length>=n)return evenlyPick(unique,n)
  const picked=[...unique],used=new Set(picked.map(d=>`${d.source}|${d.name}`))
  for(const d of sorted)if(!used.has(`${d.source}|${d.name}`)){picked.push(d);if(picked.length>=n)break}
  return picked
}

async function loadPrecons(n){
  const root=await cachedJson('mtgjson_decklist','https://mtgjson.com/api/v5/DeckList.json');let rows=root.data||root
  rows=rows.filter(x=>/commander/i.test(x.type||'')&&String(x.releaseDate||x.release_date||'')>='2018-01-01').sort((a,b)=>String(a.releaseDate||'').localeCompare(String(b.releaseDate||'')))
  const candidates=evenlyPick(rows,Math.min(rows.length,n*4)),raw=[]
  for(const meta of candidates){
    try{
      const fn=String(meta.fileName||meta.file_name||'').replace(/\.json$/i,'');if(!fn)continue
      const rootDeck=await cachedJson('mtgdeck_'+simpleHash(fn),`https://mtgjson.com/api/v5/decks/${encodeURIComponent(fn)}.json`),d=rootDeck.data||rootDeck
      const commanderNames=(d.commander||[]).flatMap(c=>Array(Number(c.count||c.quantity||1)).fill(c.name)).filter(Boolean),mainRows=d.mainBoard||d.mainboard||d.cards||[],names=mainRows.flatMap(c=>Array(Number(c.count||c.quantity||1)).fill(c.name)).filter(Boolean)
      if(commanderNames.length!==1||names.length<95||names.length>100)continue
      raw.push({source:'precon',name:d.name||meta.name,commanderName:commanderNames[0],names,meta:{releaseDate:meta.releaseDate||meta.release_date,type:meta.type,fileName:meta.fileName}})
    }catch(e){console.warn('precon skip',meta.name,e.message)}
  }
  const map=await scryfallCards(raw.flatMap(x=>[...x.names,x.commanderName])),resolved=[]
  for(const x of raw){const {cards,missing}=resolveNamed(x.names,map),commander=map.get(x.commanderName.toLowerCase());if(!commander||missing.length||cards.length!==x.names.length)continue;resolved.push({source:'precon',name:x.name,commander:{...commander},cards,meta:{...x.meta,rawCount:x.names.length,resolvedCount:cards.length}})}
  return evenlyPick(resolved.sort((a,b)=>String(a.meta.releaseDate||'').localeCompare(String(b.meta.releaseDate||''))),n)
}

async function loadCedh(n){
  const data=await cachedJson('cedh_decks','https://raw.githubusercontent.com/KonradHoeffner/cedh/gh-pages/data/decks.json')
  const eligible=Object.entries(data).filter(([,d])=>(d.commanders||[]).length===1&&(d.mainboard||[]).length>=95&&(d.mainboard||[]).length<=100).sort((a,b)=>a[0].localeCompare(b[0]))
  const candidates=evenlyPick(eligible,Math.min(eligible.length,n*4)),allNames=candidates.flatMap(([,d])=>[...d.mainboard,...d.commanders]),map=await scryfallCards(allNames),resolved=[]
  for(const [name,d] of candidates){const {cards,missing}=resolveNamed(d.mainboard,map),commander=map.get(d.commanders[0].toLowerCase());if(!commander||missing.length||cards.length!==d.mainboard.length)continue;resolved.push({source:'cedh',name,commander:{...commander},cards,meta:{origin:'cEDH Decklist Database mirror',rawCount:d.mainboard.length,resolvedCount:cards.length}})}
  return diversifyByCommander(resolved,n)
}

function archRows(payload){return payload?.results||payload?.decks||payload?.data||(Array.isArray(payload)?payload:[])}
function archDeckId(x){return x?.id||x?.deck?.id||x?.pk}
function includedCategoryNames(payload){const m=new Map();for(const c of payload?.categories||[])m.set(c.id,String(c.name||c.label||''));return m}
function parseArchidekt(payload){
  const catMap=includedCategoryNames(payload),names=[],commanders=[]
  for(const e of payload?.cards||payload?.cardMap||[]){
    const c=e.card?.oracleCard||e.card?.oracle_card||e.oracleCard||e.oracle_card||e.card||{},name=c.name||e.displayName||e.name;if(!name)continue
    const qty=Math.max(1,Number(e.quantity??e.qty??1)||1),catNames=[]
    for(const cat of e.categories||[]){if(typeof cat==='string')catNames.push(cat);else if(typeof cat==='number')catNames.push(catMap.get(cat)||'');else catNames.push(cat?.name||catMap.get(cat?.id)||'')}
    const isCmd=catNames.some(x=>/commander/i.test(x))||e.isCommander===true,included=!catNames.some(x=>/maybeboard|sideboard|considering/i.test(x));if(!included)continue
    for(let i=0;i<qty;i++)names.push(name);if(isCmd)commanders.push(name)
  }
  for(const x of [payload?.commander,payload?.featured,payload?.featuredCommander]){const n=x?.name||x?.oracleCard?.name||x?.oracle_card?.name;if(n)commanders.push(n)}
  return {names,commanders:[...new Set(commanders)]}
}
async function loadArchidekt(n){
  const url=`https://archidekt.com/api/decks/v3/?ownerUsername=${encodeURIComponent(USERNAME)}&deckFormat=3&orderBy=-updatedAt&pageSize=60`;let listing
  try{listing=await cachedJson('arch_listing_'+USERNAME,url)}catch(e){console.warn('Archidekt listing failed:',e.message);return []}
  const raw=[]
  for(const row of archRows(listing)){if(raw.length>=n*3)break;const id=archDeckId(row);if(!id)continue;try{const d=await cachedJson('arch_'+id,`https://archidekt.com/api/decks/${id}/`),p=parseArchidekt(d);if(p.names.length>=95&&p.names.length<=101&&p.commanders.length===1)raw.push({id,name:d.name||row.name||`Archidekt ${id}`,...p})}catch{}}
  if(!raw.length)return []
  const map=await scryfallCards(raw.flatMap(x=>[...x.names,...x.commanders])),out=[]
  for(const x of raw){const {cards,missing}=resolveNamed(x.names,map),commander=map.get(x.commanders[0].toLowerCase());if(!commander||missing.length||cards.length!==x.names.length)continue;out.push({source:'user',name:x.name,commander:{...commander},cards,meta:{archidektId:x.id,owner:USERNAME,rawCount:x.names.length,resolvedCount:cards.length}});if(out.length>=n)break}
  return out
}

function scoreDeck(d,iterations=ITERATIONS){const result=analyzePower(d.cards,d.commander,null,iterations);return {source:d.source,name:d.name,commander:d.commander?.name,meta:d.meta,profile:result.profile,dimensions:result.dimensions,roles:result.roles,packages:result.packages.map(p=>({id:p.id,name:p.name,strength:p.strength,cohesion:p.cohesion,producers:p.producers,payoffs:p.payoffs})),combos:result.combos.map(c=>c.name),simulation:result.simulation}}
function splitHalf(xs){return {cal:xs.filter((_,i)=>i%2===0),hold:xs.filter((_,i)=>i%2===1)}}
function separation(pre,cedh){const p=pre.map(x=>x.profile.median),c=cedh.map(x=>x.profile.median);return {preconMedian:median(p),cedhMedian:median(c),gap:median(c)-median(p),auc:auc(c,p),preconP90:pct(p,.9),cedhP10:pct(c,.1),strictGap:pct(c,.1)-pct(p,.9)}}
function neutralizeTagged(deck,tag,max=99){const featured=featureDeck(deck.cards),killNames=new Set(featured.filter(c=>c.tags.includes(tag)).slice(0,max).map(c=>c.name.toLowerCase()));let i=0;return {...deck,cards:deck.cards.map(c=>killNames.has(c.name.toLowerCase())?{...c,name:`Calibration Blank ${tag} ${++i}`,oracle:'',type:'Calibration',producedMana:[],power:null,toughness:null}:c)}}
function findWithTag(decks,tag,min){return decks.find(d=>featureDeck(d.cards).filter(c=>c.tags.includes(tag)).length>=min)}
function delta(a,b,key){return(a?.[key]??0)-(b?.[key]??0)}

async function evaluateQuality(decks,scored){
  const pre=scored.filter(x=>x.source==='precon'),cedh=scored.filter(x=>x.source==='cedh'),usr=scored.filter(x=>x.source==='user'),ps=splitHalf(pre),cs=splitHalf(cedh),sepAll=separation(pre,cedh),sepHold=separation(ps.hold,cs.hold),sepCal=separation(ps.cal,cs.cal),completeness=decks.every(d=>d.meta?.rawCount===d.meta?.resolvedCount)
  const dates=pre.map(x=>String(x.meta?.releaseDate||'')).filter(Boolean).sort(),temporal={earliest:dates[0]||null,latest:dates.at(-1)||null,recent:dates.filter(d=>d>='2024-01-01').length,total:dates.length}
  const distinctCedhCommanders=new Set(cedh.map(x=>canonical(x.commander))).size
  const repeatDecks=[...pre.slice(0,2),...cedh.slice(0,2)].map(s=>decks.find(d=>d.name===s.name&&d.source===s.source)).filter(Boolean),repeatability=[]
  for(const d of repeatDecks){const runs=[];for(let i=0;i<4;i++)runs.push(scoreDeck(d,650).profile.median);repeatability.push({name:d.name,range:Math.max(...runs)-Math.min(...runs),runs})}
  const maxRepeatRange=Math.max(0,...repeatability.map(x=>x.range))
  const fastDeck=findWithTag(decks.filter(d=>d.source==='cedh'),'fast-mana',4);let fastManaSensitivity=null
  if(fastDeck){const full=scoreDeck(fastDeck,900),cut=scoreDeck(neutralizeTagged(fastDeck,'fast-mana'),900);fastManaSensitivity={name:fastDeck.name,full:full.profile.median,cut:cut.profile.median,speedDelta:delta(full.dimensions,cut.dimensions,'speed'),explosiveDelta:delta(full.dimensions,cut.dimensions,'explosiveness'),commanderTurnDelta:(cut.simulation.commanderMedianTurn??8)-(full.simulation.commanderMedianTurn??8)}}
  const tutorDeck=findWithTag(decks.filter(d=>d.source==='cedh'),'tutor',4);let tutorSensitivity=null
  if(tutorDeck){const full=scoreDeck(tutorDeck,900),cut=scoreDeck(neutralizeTagged(tutorDeck,'tutor'),900);tutorSensitivity={name:tutorDeck.name,consistencyDelta:full.profile.consistency-cut.profile.consistency,medianDelta:full.profile.median-cut.profile.median,ceilingDelta:full.profile.ceiling-cut.profile.ceiling}}
  const cmdSamples=cedh.slice(0,8).map(x=>x.profile.commanderDelta),commanderDependency={median:median(cmdSamples),positive:cmdSamples.filter(x=>x>0).length,total:cmdSamples.length}
  const gates=[
    {id:'sample',ok:scored.length>=30&&pre.length>=12&&cedh.length>=12,detail:`${scored.length} total / ${pre.length} precon / ${cedh.length} cEDH / ${usr.length} user`},
    {id:'data-completeness',ok:completeness,detail:completeness?'all benchmark lists fully resolved':'one or more benchmark lists partially resolved'},
    {id:'precon-temporal-coverage',ok:temporal.total>=12&&temporal.earliest<='2019-12-31'&&temporal.latest>='2025-01-01'&&temporal.recent>=4,detail:JSON.stringify(temporal)},
    {id:'cedh-commander-diversity',ok:distinctCedhCommanders>=12,detail:`${distinctCedhCommanders}/${cedh.length} distinct commanders`},
    {id:'all-separation',ok:sepAll.auc>=.98&&sepAll.gap>=22,detail:`AUC ${sepAll.auc.toFixed(3)}, gap ${sepAll.gap.toFixed(1)}`},
    {id:'holdout-separation',ok:sepHold.auc>=.96&&sepHold.gap>=20,detail:`AUC ${sepHold.auc.toFixed(3)}, gap ${sepHold.gap.toFixed(1)}`},
    {id:'distribution-separation',ok:sepAll.strictGap>=-3,detail:`cEDH P10 - precon P90 = ${sepAll.strictGap.toFixed(1)}`},
    {id:'deterministic-repeat',ok:maxRepeatRange===0,detail:`max repeated median range ${maxRepeatRange}`},
    {id:'fast-mana',ok:!!fastManaSensitivity&&fastManaSensitivity.speedDelta>=4&&fastManaSensitivity.explosiveDelta>=5&&fastManaSensitivity.commanderTurnDelta>=0,detail:JSON.stringify(fastManaSensitivity)},
    {id:'tutors',ok:!!tutorSensitivity&&tutorSensitivity.consistencyDelta>=0&&tutorSensitivity.medianDelta>=0,detail:JSON.stringify(tutorSensitivity)},
    {id:'commander-dependency',ok:commanderDependency.positive>=Math.ceil(commanderDependency.total*.75),detail:JSON.stringify(commanderDependency)},
    {id:'semantic-scale',ok:sepAll.preconMedian>=42&&sepAll.preconMedian<=58&&sepAll.cedhMedian>=70&&sepAll.cedhMedian<=90,detail:`precon ${sepAll.preconMedian.toFixed(1)}, cEDH ${sepAll.cedhMedian.toFixed(1)}`},
  ]
  return {score:gates.filter(g=>g.ok).length,total:gates.length,gates,separation:{all:sepAll,calibration:sepCal,holdout:sepHold},temporal,distinctCedhCommanders,repeatability,fastManaSensitivity,tutorSensitivity,commanderDependency}
}

function markdown(report){
  const q=report.quality,lines=[`# Aeon Scorer v3.1 calibration report`,``,`Generated: ${report.generatedAt}`,`Model: ${report.model}`,`Iterations/deck: ${report.iterations}`,``,`## Base macro gates: ${q.score}/${q.total}`,``]
  for(const g of q.gates)lines.push(`- ${g.ok?'✅':'❌'} **${g.id}** — ${g.detail}`)
  lines.push('','## Anchors','',`- Precons: ${report.counts.precon}`,`- Precon dates: ${q.temporal?.earliest||'n/d'} → ${q.temporal?.latest||'n/d'} (${q.temporal?.recent||0} since 2024)`,`- cEDH: ${report.counts.cedh} (${q.distinctCedhCommanders||0} distinct commanders)`,`- User/public: ${report.counts.user}`,`- Holdout AUC: ${q.separation.holdout.auc.toFixed(3)}`,`- Overall median gap: ${q.separation.all.gap.toFixed(1)}`,'','## Deck results','','| Source | Deck | Commander | Median | P20 | P80 | Peak | Dispersion | Consistency |','|---|---|---|---:|---:|---:|---:|---:|---:|')
  for(const d of [...report.decks].sort((a,b)=>a.profile.median-b.profile.median))lines.push(`| ${d.source} | ${String(d.name).replace(/\|/g,'/')} | ${String(d.commander||'').replace(/\|/g,'/')} | ${d.profile.median} | ${d.profile.floor} | ${d.profile.ceiling} | ${d.profile.peak} | ${d.profile.dispersion} | ${d.profile.consistency} |`)
  return lines.join('\n')+'\n'
}

await ensure();console.log('Loading benchmark cohorts...')
const precons=await loadPrecons(TARGET.precon),cedh=await loadCedh(TARGET.cedh),user=await loadArchidekt(TARGET.user),decks=[...precons,...cedh,...user]
console.log(`Loaded ${decks.length}: ${precons.length} precon, ${cedh.length} cEDH, ${user.length} user/public`)
if(precons.length<12||cedh.length<12)throw new Error('Insufficient fully resolved anchor decks; benchmark would not be meaningful.')
const scored=[];for(let i=0;i<decks.length;i++){const d=decks[i];console.log(`[${i+1}/${decks.length}] ${d.source}: ${d.name}`);scored.push(scoreDeck(d))}
const quality=await evaluateQuality(decks,scored),report={generatedAt:new Date().toISOString(),model:'sequence-access-v3.1-semantic',iterations:ITERATIONS,counts:{total:decks.length,precon:precons.length,cedh:cedh.length,user:user.length},quality,decks:scored}
await fs.writeFile(path.join(OUT,'latest.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(OUT,'latest.md'),markdown(report));console.log(`QUALITY ${quality.score}/${quality.total}`);for(const g of quality.gates)console.log(`${g.ok?'PASS':'FAIL'} ${g.id}: ${g.detail}`);if(quality.score<quality.total)process.exitCode=2
