export const COLOR_ORDER=['W','U','B','R','G']

export function publicDeckStatus(deck,engineVersion,semanticVersion){
  if(!deck?.supported)return 'unsupported'
  if(!deck?.analysis)return 'pending'
  if(deck.analysis.engineVersion===engineVersion&&deck.analysis.semanticVersion===semanticVersion)return 'current'
  return 'outdated'
}

export function publicDeckSpread(deck){
  const a=deck?.analysis
  return a&&Number.isFinite(Number(a.p20))&&Number.isFinite(Number(a.p80))?Number(a.p80)-Number(a.p20):null
}

export function publicDeckColorKey(deck){
  const colors=(deck?.colorIdentity||[]).filter(x=>COLOR_ORDER.includes(x)).sort((a,b)=>COLOR_ORDER.indexOf(a)-COLOR_ORDER.indexOf(b))
  return colors.length?colors.join(''): 'C'
}

export function publicDeckYear(deck){
  const y=Number(String(deck?.releaseDate||'').slice(0,4))
  return Number.isFinite(y)?y:null
}

const num=v=>v===''||v===null||v===undefined?null:Number(v)
const inRange=(value,min,max)=>{
  if(value===null||value===undefined||!Number.isFinite(Number(value)))return min===null&&max===null
  const n=Number(value)
  return (min===null||n>=min)&&(max===null||n<=max)
}

export function filterPublicDecks(decks,filters={},versions={}){
  const search=String(filters.search||'').trim().toLowerCase()
  const selectedColors=(filters.colors||[]).filter(Boolean)
  const colorMode=filters.colorMode==='exact'?'exact':'contains'
  const yearMin=num(filters.yearMin),yearMax=num(filters.yearMax)
  const status=filters.status||'all'
  const ranges={
    median:[num(filters.medianMin),num(filters.medianMax)],
    p20:[num(filters.p20Min),num(filters.p20Max)],
    p80:[num(filters.p80Min),num(filters.p80Max)],
    peak:[num(filters.peakMin),num(filters.peakMax)],
  }
  return (decks||[]).filter(deck=>{
    if(search){
      const hay=[deck.name,deck.commanderName,deck.productName,deck.setCode,deck.releaseDate].filter(Boolean).join(' ').toLowerCase()
      if(!hay.includes(search))return false
    }
    if(selectedColors.length){
      const colors=(deck.colorIdentity||[]).filter(x=>COLOR_ORDER.includes(x))
      if(selectedColors.includes('C')){if(colors.length)return false}
      else if(colorMode==='exact'){
        if(colors.length!==selectedColors.length||selectedColors.some(c=>!colors.includes(c)))return false
      }else if(selectedColors.some(c=>!colors.includes(c)))return false
    }
    const year=publicDeckYear(deck)
    if(yearMin!==null&&(year===null||year<yearMin))return false
    if(yearMax!==null&&(year===null||year>yearMax))return false
    if(status!=='all'&&publicDeckStatus(deck,versions.engineVersion,versions.semanticVersion)!==status)return false
    for(const [key,[min,max]] of Object.entries(ranges))if((min!==null||max!==null)&&!inRange(deck.analysis?.[key],min,max))return false
    return true
  })
}

const cmp=(a,b)=>a===b?0:a===null||a===undefined?1:b===null||b===undefined?-1:a<b?-1:1
export function sortPublicDecks(decks,sort='release',direction='desc'){
  const dir=direction==='asc'?1:-1
  const value=(d)=>{
    if(sort==='name')return String(d.name||'').toLowerCase()
    if(sort==='commander')return String(d.commanderName||'').toLowerCase()
    if(sort==='median'||sort==='p20'||sort==='p80'||sort==='peak'||sort==='coverage')return d.analysis?.[sort]??null
    if(sort==='spread')return publicDeckSpread(d)
    return d.releaseDate||null
  }
  return [...(decks||[])].sort((a,b)=>{
    const av=value(a),bv=value(b),primary=cmp(av,bv)*dir
    return primary||String(a.name||'').localeCompare(String(b.name||''))
  })
}

export function publicDeckStats(decks,versions={}){
  const rows=decks||[],analyzed=rows.filter(d=>d.analysis).length,current=rows.filter(d=>publicDeckStatus(d,versions.engineVersion,versions.semanticVersion)==='current').length
  const supported=rows.filter(d=>d.supported).length
  return {total:rows.length,supported,analyzed,current,pending:rows.filter(d=>publicDeckStatus(d,versions.engineVersion,versions.semanticVersion)==='pending').length,outdated:rows.filter(d=>publicDeckStatus(d,versions.engineVersion,versions.semanticVersion)==='outdated').length}
}
