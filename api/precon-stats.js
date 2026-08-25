const median=values=>{const xs=[...values].filter(Number.isFinite).sort((a,b)=>a-b);if(!xs.length)return null;const i=Math.floor(xs.length/2);return xs.length%2?xs[i]:(xs[i-1]+xs[i])/2}
const mean=values=>values.length?values.reduce((s,x)=>s+x,0)/values.length:null
const rounded=n=>n==null?null:Math.round(n*10)/10
const isVariant=x=>x?.analysisVariant===true&&!!x?.variantOf

export function summarizePreconCatalog(catalog={}){
  const all=Array.isArray(catalog.data)?catalog.data:[],canonical=all.filter(x=>!isVariant(x)),variants=all.filter(isVariant)
  const rows=canonical.filter(x=>x?.supported&&x?.analysis),variantRows=variants.filter(x=>x?.supported&&x?.analysis)
  const pick=key=>rows.map(x=>Number(x.analysis?.[key])).filter(Number.isFinite),medians=pick('median'),p20=pick('p20'),p80=pick('p80'),peaks=pick('peak'),coverage=pick('coverage')
  const dates=rows.map(x=>String(x.releaseDate||'')).filter(Boolean).sort()
  return {
    generatedAt:catalog.meta?.generatedAt||null,
    engineVersion:catalog.meta?.engineVersion||null,
    semanticVersion:catalog.meta?.semanticVersion||null,
    sourceName:catalog.meta?.sourceName||null,
    sourceRevision:catalog.meta?.sourceRevision||null,
    total:Number(catalog.meta?.total??canonical.length),
    catalogEntries:all.length,
    analysisVariants:variants.length,
    analyzed:rows.length,
    analyzedVariants:variantRows.length,
    unsupported:Number(catalog.meta?.unsupported||0),
    incomplete:Number(catalog.meta?.incomplete||0),
    earliestYear:catalog.meta?.earliestYear||null,
    latestYear:catalog.meta?.latestYear||null,
    reference:{
      median:rounded(median(medians)),mean:rounded(mean(medians)),
      p20Median:rounded(median(p20)),p80Median:rounded(median(p80)),peakMedian:rounded(median(peaks)),coverageMean:rounded(mean(coverage)),
    },
    latestAnalyzedRelease:dates.at(-1)||null,
    methodology:'aggregate-over-supported-canonical-public-precons-v2',
  }
}

export default async function handler(req,res){
  try{
    const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim(),host=req.headers.host
    if(!host)throw new Error('host_unavailable')
    const upstream=await fetch(`${proto}://${host}/precons/catalog.json`,{headers:{Accept:'application/json'}})
    if(!upstream.ok)throw new Error(`catalog_http_${upstream.status}`)
    const catalog=await upstream.json()
    res.setHeader('Cache-Control','public, max-age=300, s-maxage=900, stale-while-revalidate=86400')
    return res.status(200).json(summarizePreconCatalog(catalog))
  }catch(error){
    console.error('[precon-stats]',error?.message||error)
    return res.status(502).json({error:'Unable to compute the public precon reference right now.'})
  }
}
