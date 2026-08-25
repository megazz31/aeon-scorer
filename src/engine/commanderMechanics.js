const cleanText=c=>String(c?.oracle||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim().toLowerCase()
const typeText=c=>String(c?.type||'').toLowerCase()
const wordNumber=w=>({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10}[String(w||'').toLowerCase()]||Number(w)||0)

export function targetCostReductionProfile(commander){
  const o=cleanText(commander)
  let m=o.match(/spells you cast cost \{(\d+)\} less to cast for each target/)
  if(m)return {kind:'per-target',scope:'any',amount:Number(m[1])||1}
  m=o.match(/spells you cast that target (?:a|one or more) creatures? cost \{(\d+)\} less to cast/)
  if(m)return {kind:'target-scope',scope:'creature',amount:Number(m[1])||1}
  return null
}

function targetMultiplicity(o){
  let best=0
  const words='one|two|three|four|five|six|seven|eight|nine|ten|\\d+'
  for(const m of o.matchAll(new RegExp(`(?:up to |exactly )?(${words}) target\\b`,'g')))best=Math.max(best,wordNumber(m[1]))
  const literal=(o.match(/\btarget\b/g)||[]).length
  return Math.max(best,literal)
}

export function targetCountForSpell(card,scope='any'){
  const t=typeText(card),o=cleanText(card)
  if(!/\binstant\b|\bsorcery\b|\benchantment\b/.test(t))return 0
  if(scope==='creature'){
    const creatureTargets=(o.match(/\btarget [^.;]{0,70}\bcreature\b/g)||[]).length
    const aura=/\baura\b/.test(t)&&/\benchant creature\b/.test(o)?1:0
    const fixed=[...o.matchAll(/(?:up to |exactly )?(one|two|three|four|five|six|seven|eight|nine|ten|\d+) target [^.;]{0,60}\bcreatures?\b/g)].reduce((n,m)=>Math.max(n,wordNumber(m[1])),0)
    return Math.max(creatureTargets,aura,fixed)
  }
  const aura=/\baura\b/.test(t)&&/\benchant\b/.test(o)?1:0
  return Math.max(aura,targetMultiplicity(o))
}

export function targetGenericReduction(card,commander){
  const profile=targetCostReductionProfile(commander)
  if(!profile)return 0
  const targets=targetCountForSpell(card,profile.scope)
  if(!targets)return 0
  const generic=Math.max(0,Number(card?.manaReq?.generic||0))
  if(!generic)return 0
  const raw=profile.kind==='per-target'?profile.amount*targets:profile.amount
  return Math.min(generic,Math.max(0,raw))
}

export function combinedTargetGenericReduction(card,commanders=[]){
  const list=(Array.isArray(commanders)?commanders:[commanders]).filter(Boolean)
  const generic=Math.max(0,Number(card?.manaReq?.generic||0))
  return Math.min(generic,list.reduce((n,c)=>n+targetGenericReduction(card,c),0))
}

export function targetCostReductionStats(cards,commander){
  const profile=targetCostReductionProfile(commander)
  if(!profile)return null
  const rows=(cards||[]).map(card=>({card,reduction:targetGenericReduction(card,commander)})).filter(x=>x.reduction>0)
  const total=rows.reduce((n,x)=>n+x.reduction,0)
  return {profile,eligibleSpells:rows.length,averageGenericReduction:rows.length?Math.round(total/rows.length*10)/10:0,maxGenericReduction:rows.length?Math.max(...rows.map(x=>x.reduction)):0}
}

function subtypeFromCheat(o){
  const patterns=[
    /put (?:a|one|up to one) ([a-z][a-z'-]+) creature card [^.;]{0,120}onto the battlefield/,
    /put (?:a|one|up to one) creature card (?:with|of) [^.;]{0,30}type ([a-z][a-z'-]+) [^.;]{0,100}onto the battlefield/
  ]
  for(const re of patterns){const m=o.match(re);if(m)return m[1]}
  return null
}

export function topLibraryCheatProfile(commander){
  const o=cleanText(commander)
  const m=o.match(/look at the top (one|two|three|four|five|six|seven|eight|nine|ten|\d+) cards? of your library/)
  if(!m||!/put [^.;]{0,180}creature card [^.;]{0,180}onto the battlefield/.test(o))return null
  const enter=/\bwhen(?:ever)? (?:this creature|[^.;]{1,70}) enters(?: the battlefield)?\b[^.;]{0,180}look at the top/.test(o)||/\bwhen(?:ever)? (?:this creature|[^.;]{1,70}) enters(?: the battlefield)? or attacks\b/.test(o)
  const attack=/\bwhen(?:ever)? (?:this creature|[^.;]{1,70}) attacks\b[^.;]{0,180}look at the top/.test(o)||/\bwhen(?:ever)? (?:this creature|[^.;]{1,70}) enters(?: the battlefield)? or attacks\b/.test(o)||/\bwhen (?:this creature|[^.;]{1,70}) enters(?: the battlefield)? and whenever (?:it|this creature|[^.;]{1,70}) attacks\b/.test(o)
  return {look:wordNumber(m[1]),subtype:subtypeFromCheat(o),onEnter:enter,onAttack:attack,haste:/\bhaste\b/.test(o)}
}

function creatureSubtypes(card){
  const t=String(card?.type||'')
  if(!/\bcreature\b/i.test(t))return []
  const parts=t.split(/[—-]/)
  if(parts.length<2)return []
  return parts.slice(1).join(' ').split(/\s+/).map(x=>x.toLowerCase().replace(/[^a-z'-]/g,'')).filter(Boolean)
}

export function cardHasSubtype(card,subtype){return creatureSubtypes(card).includes(String(subtype||'').toLowerCase())}

export function isTopLibraryCheatTarget(card,profile){
  if(!profile||!/\bcreature\b/i.test(card?.type||''))return false
  if(!profile.subtype)return true
  return cardHasSubtype(card,profile.subtype)
}

export function topLibraryCheatDeckStats(cards,commander){
  const profile=topLibraryCheatProfile(commander)
  if(!profile)return null
  const population=Math.max(0,(cards||[]).length),hits=(cards||[]).filter(c=>isTopLibraryCheatTarget(c,profile)).length,draws=Math.min(profile.look,population)
  let miss=1
  for(let i=0;i<draws;i++)miss*=Math.max(0,population-hits-i)/Math.max(1,population-i)
  const hitProbability=population?1-miss:0
  const hitCards=(cards||[]).filter(c=>isTopLibraryCheatTarget(c,profile))
  const avgManaValue=hitCards.length?hitCards.reduce((n,c)=>n+Number(c.cmc||0),0)/hitCards.length:0
  return {profile,population,hits,hitProbability:Math.round(hitProbability*1000)/1000,averageHitManaValue:Math.round(avgManaValue*10)/10}
}

export function typeCostReductionProfile(source){
  const o=cleanText(source)
  const m=o.match(/\b([a-z][a-z'-]+) spells you cast cost \{(\d+)\} less to cast\b/)
  if(!m)return null
  const subtype=m[1].toLowerCase(),amount=Math.max(1,Number(m[2])||1)
  if(['noncreature','creature','artifact','enchantment','instant','sorcery','legendary'].includes(subtype))return null
  return {subtype,amount}
}

export function typeGenericReduction(card,sources=[]){
  const generic=Math.max(0,Number(card?.manaReq?.generic||0))
  if(!generic)return 0
  let total=0
  for(const source of sources||[]){const p=typeCostReductionProfile(source);if(p&&cardHasSubtype(card,p.subtype))total+=p.amount}
  return Math.min(generic,total)
}

export function typeCostReducerMatches(card,spell){const p=typeCostReductionProfile(card);return !!p&&cardHasSubtype(spell,p.subtype)}

export function commandZoneDeploymentProfile(card){
  const o=cleanText(card)
  if(!/put a commander you own from the command zone onto the battlefield/.test(o))return null
  return {grantsHaste:/\bit gains haste\b|\bthat commander gains haste\b/.test(o),temporary:/return (?:it|that commander) to the command zone/.test(o)}
}
