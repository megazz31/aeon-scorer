const delta=(a,b)=>Number((Number(b||0)-Number(a||0)).toFixed(2))
const get=(o,path)=>path.split('.').reduce((x,k)=>x?.[k],o)

export function explainVariantDelta(base={},variant={}){
  const changes={
    median:delta(base.profile?.median,variant.profile?.median),
    p20:delta(base.profile?.floor,variant.profile?.floor),
    p80:delta(base.profile?.ceiling,variant.profile?.ceiling),
    peak:delta(base.profile?.peak,variant.profile?.peak),
    speed:delta(base.dimensions?.speed,variant.dimensions?.speed),
    interaction:delta(base.dimensions?.interaction,variant.dimensions?.interaction),
    resilience:delta(base.dimensions?.resilience,variant.dimensions?.resilience),
    explosiveness:delta(base.dimensions?.explosiveness,variant.dimensions?.explosiveness),
    commanderDependency:delta(base.spof?.dependencies?.commander?.score,variant.spof?.dependencies?.commander?.score),
    turnComplexity:delta(base.experience?.dimensions?.turnComplexity?.score,variant.experience?.dimensions?.turnComplexity?.score),
  }
  const packageBefore=new Map((base.packages||[]).map(p=>[p.id,p.strength??p.cohesion??0])),packageAfter=new Map((variant.packages||[]).map(p=>[p.id,p.strength??p.cohesion??0])),packageChanges=[]
  for(const id of new Set([...packageBefore.keys(),...packageAfter.keys()])){const d=delta(packageBefore.get(id)||0,packageAfter.get(id)||0);if(d)packageChanges.push({id,delta:d})}
  packageChanges.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))
  return {modelVersion:'deck-doctor-explain-v1',changes,packageChanges:packageChanges.slice(0,8),confidence:{comparison:'controlled-if-inputs-share-same-analysis-settings',productCalibration:'experimental'},notes:['This explains observed analysis deltas; it does not infer that one card alone caused every correlated dimension change.']}
}

function objectiveValue(candidate,objective){
  const r=candidate.analysis||candidate,targetMedian=Number(objective.targetMedian??r.profile?.median??0)
  if(objective.type==='reduce-peak-preserve-median')return Math.abs((r.profile?.median||0)-targetMedian)*Number(objective.medianPenalty||2)+(r.profile?.peak||0)
  if(objective.type==='reduce-commander-dependency')return (r.spof?.dependencies?.commander?.score||0)+Math.abs((r.profile?.median||0)-targetMedian)*Number(objective.medianPenalty||1)
  if(objective.type==='increase-interaction')return -(r.dimensions?.interaction||0)+Math.max(0,Number(objective.minMedian||0)-(r.profile?.median||0))*3
  if(objective.type==='target-pod')return Number(candidate.podMismatch??100)
  if(objective.path)return Number(get(r,objective.path)??0)*Number(objective.direction==='max'?-1:1)
  return Number(candidate.score??0)
}

export function selectConstrainedVariant(base={},candidates=[],objective={type:'reduce-peak-preserve-median'},constraints={}){
  const effectiveObjective={...objective}
  if(['reduce-peak-preserve-median','reduce-commander-dependency'].includes(effectiveObjective.type)&&effectiveObjective.targetMedian==null)effectiveObjective.targetMedian=Number(base.profile?.median||0)
  const valid=candidates.filter(c=>c?.analysis||c?.profile).filter(c=>{
    const r=c.analysis||c
    if(constraints.minMedian!=null&&(r.profile?.median||0)<constraints.minMedian)return false
    if(constraints.maxMedian!=null&&(r.profile?.median||0)>constraints.maxMedian)return false
    if(constraints.maxPeak!=null&&(r.profile?.peak||0)>constraints.maxPeak)return false
    if(constraints.maxCommanderDependency!=null&&(r.spof?.dependencies?.commander?.score||0)>constraints.maxCommanderDependency)return false
    return true
  }).map(c=>({...c,__objective:objectiveValue(c,effectiveObjective)})).sort((a,b)=>a.__objective-b.__objective)
  const finalists=valid.slice(0,5).map(c=>({id:c.id||c.name||null,objective:c.__objective,analysis:c.analysis||c,explanation:explainVariantDelta(base,c.analysis||c)}))
  return {modelVersion:'deck-doctor-v1',objective:effectiveObjective,constraints,finalists,best:finalists[0]||null,confidence:{candidateGeneration:'external',evaluation:'analysis-derived',productCalibration:'experimental'},notes:['V1 optimizes only among supplied legal/analyzed candidates.','Card candidate generation, legality/budget filtering and full-run confirmation remain upstream responsibilities.']}
}
