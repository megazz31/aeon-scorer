const allowedBalance=new Set(['very-unbalanced','unbalanced','mixed','balanced','very-balanced'])
const allowedWin=new Set(['combat','combo','drain','lock','concession','other'])
const allowedEvent=new Set(['runaway-start','unanswered-combo','lock','mana-issue','normal-game','other','none'])
const allowedRisk=new Set(['low','moderate','high'])
const num=(x,fallback=NaN)=>Number.isFinite(Number(x))?Number(x):fallback
const field=(o,camel,snake)=>o?.[camel]??o?.[snake]

export function validateGameObservation(input={}){
  const errors=[],turnBand=String(field(input,'turnBand','turn_band')||''),winType=field(input,'winType','win_type'),balance=input.balance,dominantEvent=field(input,'dominantEvent','dominant_event')||'none',podModelVersion=String(field(input,'podModelVersion','pod_model_version')||'').trim(),predictedRiskScore=num(field(input,'predictedRiskScore','predicted_risk_score')),predictedRiskLevel=String(field(input,'predictedRiskLevel','predicted_risk_level')||''),predictedPodMismatch=num(field(input,'predictedPodMismatch','predicted_pod_mismatch')),predictedThreatGap=num(field(input,'predictedThreatGap','predicted_threat_gap'))
  if(!/^(1-4|5-7|8-10|11\+)$/.test(turnBand))errors.push('invalid-turn-band')
  if(!allowedWin.has(winType))errors.push('invalid-win-type')
  if(!allowedBalance.has(balance))errors.push('invalid-balance')
  if(!allowedEvent.has(dominantEvent))errors.push('invalid-dominant-event')
  if(!podModelVersion)errors.push('missing-pod-model-version')
  if(!(predictedRiskScore>=0&&predictedRiskScore<=100))errors.push('invalid-predicted-risk')
  if(!allowedRisk.has(predictedRiskLevel))errors.push('invalid-predicted-risk-level')
  if(!(predictedPodMismatch>=0&&predictedPodMismatch<=100))errors.push('invalid-predicted-pod-mismatch')
  if(!(predictedThreatGap>=0&&predictedThreatGap<=100))errors.push('invalid-predicted-threat-gap')
  return {ok:errors.length===0,errors,value:errors.length?null:{turnBand,winType,balance,dominantEvent,podModelVersion,predictedRiskScore,predictedRiskLevel,predictedPodMismatch,predictedThreatGap,semanticVersion:field(input,'semanticVersion','semantic_version')||null,engineVersion:field(input,'engineVersion','engine_version')||null,podFingerprint:field(input,'podFingerprint','pod_fingerprint')||null,playgroupKey:input.playgroupKey||null,observedAt:field(input,'observedAt','observed_at')||input.created_at||new Date().toISOString()}}
}

const balanceScore=x=>({'very-unbalanced':0,'unbalanced':25,mixed:50,balanced:75,'very-balanced':100}[x]??50)
const isSevere=x=>['very-unbalanced','unbalanced'].includes(x.balance)
export function summarizeRealityObservations(observations=[]){
  const valid=observations.map(validateGameObservation).filter(x=>x.ok).map(x=>x.value),groups=new Set(valid.map(x=>x.playgroupKey).filter(Boolean)),pods=new Set(valid.map(x=>x.podFingerprint).filter(Boolean)),severe=valid.filter(isSevere),normal=valid.filter(x=>x.dominantEvent==='normal-game'),avg=valid.length?valid.reduce((s,x)=>s+balanceScore(x.balance),0)/valid.length:0
  return {modelVersion:'aeon-reality-v1',count:valid.length,distinctPlaygroups:groups.size,distinctPods:pods.size,balanceIndex:Math.round(avg),severeMismatchRate:valid.length?Number((severe.length/valid.length).toFixed(3)):0,normalGameRate:valid.length?Number((normal.length/valid.length).toFixed(3)):0,meanPredictedRisk:valid.length?Number((valid.reduce((s,x)=>s+x.predictedRiskScore,0)/valid.length).toFixed(2)):0,byRiskLevel:Object.fromEntries([...allowedRisk].map(k=>[k,valid.filter(x=>x.predictedRiskLevel===k).length])),byDominantEvent:Object.fromEntries([...allowedEvent].map(k=>[k,valid.filter(x=>x.dominantEvent===k).length])),confidence:{productCalibration:'observational-only'}}
}

function auc(rows){
  const pos=rows.filter(x=>x.y===1),neg=rows.filter(x=>x.y===0);if(!pos.length||!neg.length)return null
  let wins=0;for(const p of pos)for(const n of neg)wins+=p.p>n.p?1:p.p===n.p?0.5:0
  return wins/(pos.length*neg.length)
}
export function evaluateRealityCalibration(observations=[]){
  const valid=observations.map(validateGameObservation).filter(x=>x.ok).map(x=>x.value),rows=valid.map(x=>({p:x.predictedRiskScore/100,y:isSevere(x)?1:0,level:x.predictedRiskLevel})),rate=rows.length?rows.reduce((s,x)=>s+x.y,0)/rows.length:0
  const brier=rows.length?rows.reduce((s,x)=>s+(x.p-x.y)**2,0)/rows.length:null,baselineBrier=rows.length?rows.reduce((s,x)=>s+(rate-x.y)**2,0)/rows.length:null
  const bands=[['low',0,39],['moderate',40,69],['high',70,100]].map(([name,lo,hi])=>{const xs=valid.filter(x=>x.predictedRiskScore>=lo&&x.predictedRiskScore<=hi),pred=xs.length?xs.reduce((s,x)=>s+x.predictedRiskScore/100,0)/xs.length:0,obs=xs.length?xs.filter(isSevere).length/xs.length:0;return {band:name,count:xs.length,meanPrediction:Number(pred.toFixed(3)),observedSevereRate:Number(obs.toFixed(3)),absoluteCalibrationError:Number(Math.abs(pred-obs).toFixed(3))}})
  const calibrationMae=rows.length?bands.reduce((s,b)=>s+b.absoluteCalibrationError*b.count,0)/rows.length:null,aucValue=auc(rows)
  return {modelVersion:'reality-calibration-eval-v1',count:rows.length,severeRate:Number(rate.toFixed(3)),brier:brier==null?null:Number(brier.toFixed(4)),baselineBrier:baselineBrier==null?null:Number(baselineBrier.toFixed(4)),brierImprovement:brier==null?null:Number((baselineBrier-brier).toFixed(4)),auc:aucValue==null?null:Number(aucValue.toFixed(4)),calibrationMae:calibrationMae==null?null:Number(calibrationMae.toFixed(4)),bands,notes:['These metrics evaluate an experimental pre-game risk score against observed severe imbalance.','They are validation metrics, not permission to publish the score as an exact probability.']}
}

export function calibrationReadiness(observations=[],options={}){
  const summary=summarizeRealityObservations(observations),evaluation=evaluateRealityCalibration(observations),minGames=Number(options.minGames||1000),minDistinctPods=Number(options.minDistinctPods||100),reasons=[]
  if(summary.count<minGames)reasons.push(`need-${minGames}-games`)
  if(summary.distinctPods&&summary.distinctPods<minDistinctPods)reasons.push(`need-${minDistinctPods}-distinct-pods`)
  if(!summary.distinctPods&&summary.distinctPlaygroups<Number(options.minPlaygroups||50))reasons.push('need-independent-cohort-keys')
  if(evaluation.auc==null)reasons.push('need-positive-and-negative-outcomes')
  const ready=reasons.length===0
  return {modelVersion:'calibration-readiness-v2',ready,summary,evaluation,requirements:{minGames,minDistinctPods,holdoutRequired:true,baselineComparisonRequired:true,calibrationCurveRequired:true,podLeakageProtection:true,playgroupLeakageProtectionBeforePublicProbability:true},reasons,notes:['Readiness is necessary, not sufficient, for publishing exact game-quality probabilities.','A true production promotion still requires a held-out cohort and protection against playgroup leakage.','No observation automatically rewrites card semantics or deck power truth.']}
}
