const allowedBalance=new Set(['very-unbalanced','unbalanced','mixed','balanced','very-balanced'])
const allowedWin=new Set(['combat','combo','drain','lock','concession','other'])
const allowedEvent=new Set(['runaway-start','unanswered-combo','lock','mana-issue','normal-game','other','none'])

export function validateGameObservation(input={}){
  const errors=[]
  const turnBand=String(input.turnBand||'')
  if(!/^(1-4|5-7|8-10|11\+)$/.test(turnBand))errors.push('invalid-turn-band')
  if(!allowedWin.has(input.winType))errors.push('invalid-win-type')
  if(!allowedBalance.has(input.balance))errors.push('invalid-balance')
  const dominantEvent=input.dominantEvent||'none';if(!allowedEvent.has(dominantEvent))errors.push('invalid-dominant-event')
  const podModelVersion=String(input.podModelVersion||'').trim();if(!podModelVersion)errors.push('missing-pod-model-version')
  return {ok:errors.length===0,errors,value:errors.length?null:{turnBand,winType:input.winType,balance:input.balance,dominantEvent,podModelVersion,semanticVersion:input.semanticVersion||null,engineVersion:input.engineVersion||null,playgroupKey:input.playgroupKey||null,observedAt:input.observedAt||new Date().toISOString()}}
}

const balanceScore=x=>({'very-unbalanced':0,'unbalanced':25,mixed:50,balanced:75,'very-balanced':100}[x]??50)
export function summarizeRealityObservations(observations=[]){
  const valid=observations.map(validateGameObservation).filter(x=>x.ok).map(x=>x.value),groups=new Set(valid.map(x=>x.playgroupKey).filter(Boolean)),severe=valid.filter(x=>['very-unbalanced','unbalanced'].includes(x.balance)),normal=valid.filter(x=>x.dominantEvent==='normal-game'),avg=valid.length?valid.reduce((s,x)=>s+balanceScore(x.balance),0)/valid.length:0
  return {modelVersion:'aeon-reality-v1',count:valid.length,distinctPlaygroups:groups.size,balanceIndex:Math.round(avg),severeMismatchRate:valid.length?Number((severe.length/valid.length).toFixed(3)):0,normalGameRate:valid.length?Number((normal.length/valid.length).toFixed(3)):0,byDominantEvent:Object.fromEntries([...allowedEvent].map(k=>[k,valid.filter(x=>x.dominantEvent===k).length])),confidence:{productCalibration:'observational-only'}}
}

export function calibrationReadiness(observations=[],options={}){
  const summary=summarizeRealityObservations(observations),minGames=Number(options.minGames||1000),minPlaygroups=Number(options.minPlaygroups||50),reasons=[]
  if(summary.count<minGames)reasons.push(`need-${minGames}-games`)
  if(summary.distinctPlaygroups<minPlaygroups)reasons.push(`need-${minPlaygroups}-playgroups`)
  const ready=reasons.length===0
  return {modelVersion:'calibration-readiness-v1',ready,summary,requirements:{minGames,minPlaygroups,holdoutRequired:true,baselineComparisonRequired:true,calibrationCurveRequired:true,playgroupLeakageProtection:true},reasons,notes:['Readiness is necessary, not sufficient, for publishing exact game-quality probabilities.','No observation automatically rewrites card semantics or deck power truth.']}
}
