export const GAME_CHANGERS_SOURCE={
  label:'Commander Brackets / Game Changers',
  asOf:'2026-02-09',
  reviewedAt:'2026-08-21',
  snapshotId:'wotc-game-changers-2026-02-09-reviewed-2026-08-21',
  url:'https://magic.wizards.com/en/formats/commander',
  updateUrl:'https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026',
}
export const GAME_CHANGER_REVIEW_MAX_AGE_DAYS=120

export const GAME_CHANGERS=new Set([
  'Drannith Magistrate','Humility','Serra’s Sanctum',"Serra's Sanctum",'Smothering Tithe','Enlightened Tutor',"Teferi's Protection",
  'Consecrated Sphinx','Cyclonic Rift','Force of Will','Fierce Guardianship','Gifts Ungiven','Intuition','Mystical Tutor','Narset, Parter of Veils','Rhystic Study',"Thassa's Oracle",
  'Ad Nauseam',"Bolas's Citadel",'Braids, Cabal Minion','Demonic Tutor','Imperial Seal','Necropotence','Opposition Agent','Orcish Bowmasters','Tergrid, God of Fright','Vampiric Tutor',
  'Gamble',"Jeska's Will",'Underworld Breach','Crop Rotation',"Gaea's Cradle",'Natural Order','Seedborn Muse','Survival of the Fittest','Worldly Tutor',
  'Aura Shards','Coalition Victory','Grand Arbiter Augustin IV','Notion Thief','Ancient Tomb','Chrome Mox','Field of the Dead','Glacial Chasm','Grim Monolith',"Lion's Eye Diamond",'Mana Vault',"Mishra's Workshop",'Mox Diamond','Panoptic Mirror','The One Ring','The Tabernacle at Pendrell Vale',
  'Farewell','Biorhythm',
])

const norm=s=>String(s||'').trim().replace(/[’]/g,"'").toLowerCase()
const gameChangerIndex=new Map([...GAME_CHANGERS].map(x=>[norm(x),x]))
export function gameChangersIn(cardNames=[]){const out=[];for(const name of cardNames){const hit=gameChangerIndex.get(norm(name));if(hit&&!out.some(x=>norm(x)===norm(hit)))out.push(hit)}return out.sort((a,b)=>a.localeCompare(b))}
export function gameChangerSourceStatus(now=new Date()){
  const reviewed=new Date(`${GAME_CHANGERS_SOURCE.reviewedAt}T00:00:00Z`),current=now instanceof Date?now:new Date(now),ageDays=Math.max(0,Math.floor((current-reviewed)/86400000))
  return {status:ageDays>GAME_CHANGER_REVIEW_MAX_AGE_DAYS?'review-needed':'reviewed',ageDays,maxAgeDays:GAME_CHANGER_REVIEW_MAX_AGE_DAYS,...GAME_CHANGERS_SOURCE}
}

export function parseDeckMap(text=''){
  const map=new Map()
  for(const raw of String(text).split(/\r?\n/)){
    const line=raw.trim();if(!line||line.startsWith('//')||line.startsWith('#'))continue
    const m=line.match(/^(\d+)\s*x?\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?(?:\s+#.*)?$/i);if(!m)continue
    const qty=Math.max(0,Number(m[1])||0),name=m[2].trim();if(!qty||!name)continue
    const k=norm(name),prev=map.get(k);map.set(k,{name:prev?.name||name,qty:(prev?.qty||0)+qty})
  }
  return map
}
export function deckDiff(before='',after=''){
  const a=parseDeckMap(before),b=parseDeckMap(after),added=[],removed=[]
  for(const [k,row] of b){const delta=row.qty-(a.get(k)?.qty||0);if(delta>0)added.push({name:row.name,qty:delta})}
  for(const [k,row] of a){const delta=row.qty-(b.get(k)?.qty||0);if(delta>0)removed.push({name:row.name,qty:delta})}
  const sorter=(x,y)=>x.name.localeCompare(y.name);return {added:added.sort(sorter),removed:removed.sort(sorter),changes:added.reduce((s,x)=>s+x.qty,0)+removed.reduce((s,x)=>s+x.qty,0)}
}

const num=x=>Number.isFinite(Number(x))?Number(x):0
export function normalizedShare(row){return {code:row.share_code||row.code,deckName:row.deck_name||row.deckName||'Deck',commanderNames:row.commander_names||row.commanderNames||[],median:num(row.median),p20:num(row.p20),p80:num(row.p80),peak:num(row.peak),coverage:num(row.coverage),dimensions:row.dimensions||{},packages:row.packages||[],combos:row.combo_summary||row.combos||[],gameChangers:row.game_changers||row.gameChangers||[],bracketSignals:row.bracket_signals||row.bracketSignals||{},productIntelligence:row.product_intelligence||row.productIntelligence||{},engineVersion:row.engine_version||row.engineVersion,semanticVersion:row.semantic_version||row.semanticVersion,iterations:num(row.iterations)}}
export function roadmapResultFromShare(row){
  const d=normalizedShare(row),pi=d.productIntelligence||{},maxTurn=Math.max(0,...Object.values(pi.horizon?.curves||{}).flatMap(c=>(c.points||[]).map(p=>Number(p.turn)||0)))||7
  return {profile:{median:d.median,floor:d.p20,ceiling:d.p80,peak:d.peak,coverage:d.coverage,commanderDelta:0},dimensions:d.dimensions,packages:d.packages,combos:d.combos,commanderNames:d.commanderNames,experience:pi.experience||{dimensions:{}},friction:pi.friction||{signals:{}},horizon:pi.horizon||{curves:{}},spof:pi.spof||null,comboAccessibility:pi.comboAccessibility||null,vulnerability:pi.vulnerability||null,answerProfile:pi.answerProfile||null,threatProfile:pi.threatProfile||null,methodology:{maxTurn},shareCode:d.code,deckName:d.deckName}
}

export const POD_ASYMMETRY_THRESHOLDS={peak:15,dispersion:10,explosiveness:20,speed:20,consistency:20}
const dimensionGap=(a,b,key)=>Math.abs(num(a?.dimensions?.[key])-num(b?.dimensions?.[key]))
export function pairFit(a,b){
  a=normalizedShare(a);b=normalizedShare(b)
  const overlap=Math.max(0,Math.min(a.p80,b.p80)-Math.max(a.p20,b.p20)),union=Math.max(1,Math.max(a.p80,b.p80)-Math.min(a.p20,b.p20)),overlapRatio=overlap/union
  const medianGap=Math.abs(a.median-b.median),peakGap=Math.abs(a.peak-b.peak),dispersionGap=Math.abs((a.p80-a.p20)-(b.p80-b.p20))
  const label=medianGap<=4&&overlapRatio>=.45?'close':medianGap<=8&&overlapRatio>=.2?'playable':'mismatch'
  const gaps={explosiveness:dimensionGap(a,b,'explosiveness'),speed:dimensionGap(a,b,'speed'),consistency:dimensionGap(a,b,'consistency')},warnings=[]
  if(peakGap>=POD_ASYMMETRY_THRESHOLDS.peak)warnings.push({code:'high-peak-asymmetry',gap:peakGap})
  if(dispersionGap>=POD_ASYMMETRY_THRESHOLDS.dispersion)warnings.push({code:'high-dispersion-asymmetry',gap:dispersionGap})
  for(const key of ['explosiveness','speed','consistency'])if(gaps[key]>=POD_ASYMMETRY_THRESHOLDS[key])warnings.push({code:`high-${key}-asymmetry`,gap:gaps[key]})
  return {label,medianGap,peakGap,dispersionGap,dimensionGaps:gaps,overlapRatio:Math.round(overlapRatio*100),warnings,experimental:true}
}
export function podSummary(rows=[]){
  const decks=rows.map(normalizedShare).filter(x=>x.commanderNames.length||x.deckName);if(decks.length<2)return {decks,fit:'need-more',medianSpread:0,peakSpread:0,pairs:[],warnings:[],experimental:true}
  const pairs=[];for(let i=0;i<decks.length;i++)for(let j=i+1;j<decks.length;j++)pairs.push({a:i,b:j,...pairFit(decks[i],decks[j])})
  const medians=decks.map(x=>x.median),peaks=decks.map(x=>x.peak),medianSpread=Math.max(...medians)-Math.min(...medians),peakSpread=Math.max(...peaks)-Math.min(...peaks)
  const bad=pairs.filter(x=>x.label==='mismatch').length,close=pairs.filter(x=>x.label==='close').length
  const fit=bad?'mismatch':close===pairs.length?'close':'playable'
  const avgMedian=medians.reduce((s,x)=>s+x,0)/medians.length,outlier=decks.map((d,i)=>({i,distance:Math.abs(d.median-avgMedian)})).sort((a,b)=>b.distance-a.distance)[0]
  const warnings=[];for(const p of pairs)for(const warning of p.warnings){const key=`${warning.code}:${p.a}:${p.b}`;if(!warnings.some(x=>x.key===key))warnings.push({...warning,key,a:p.a,b:p.b})}
  return {decks,fit,medianSpread,peakSpread,pairs,warnings,outlierIndex:outlier?.i??null,experimental:true}
}

export function localBracketSignals(cards=[],result=null,spellbook=null){
  const names=cards.map(c=>typeof c==='string'?c:c?.name).filter(Boolean),gameChangers=gameChangersIn(names)
  const tags=new Set(cards.flatMap(c=>Array.isArray(c?.tags)?c.tags:[])),combos=spellbook?.included||result?.combos||[]
  const twoCardCombos=(combos||[]).filter(c=>{const cs=c.cards||c.uses||[];return cs.length===2}).length
  return {gameChangers,gameChangerCount:gameChangers.length,extraTurns:tags.has('extra-turn'),twoCardCombos,spellbookBracket:spellbook?.bracketTag||spellbook?.bracket||null,source:GAME_CHANGERS_SOURCE,sourceStatus:gameChangerSourceStatus()}
}

export function resultDelta(before,after){
  if(!before||!after)return null
  const get=(x,k)=>num(x?.profile?.[k]??x?.[k]),keys=['median','floor','ceiling','peak']
  const out={};for(const k of keys)out[k]=get(after,k)-get(before,k)
  out.commanderTurn=(after?.simulation?.commanderMedianTurn??null)!==null&&(before?.simulation?.commanderMedianTurn??null)!==null?Number(after.simulation.commanderMedianTurn)-Number(before.simulation.commanderMedianTurn):null
  return out
}
