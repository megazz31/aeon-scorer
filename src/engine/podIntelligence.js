import { buildClassThreatAnswerTimeline } from './threatAnswerTimeline.js'
import { buildRule0IntentOverlay,choicesForRule0Question } from './rule0Intent.js'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const avg=xs=>xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:0
const level=n=>n>=70?'high':n>=40?'moderate':'low'
const curve=(r,key)=>r?.horizon?.curves?.[key]?.points||[]
const pointAt=(r,key,turn)=>curve(r,key).find(x=>x.turn===turn)?.value??0
const rangeOverlap=(a,b)=>{const lo=Math.max(a?.profile?.floor??0,b?.profile?.floor??0),hi=Math.min(a?.profile?.ceiling??0,b?.profile?.ceiling??0),span=Math.max(1,Math.max(a?.profile?.ceiling??0,b?.profile?.ceiling??0)-Math.min(a?.profile?.floor??0,b?.profile?.floor??0));return clamp((hi-lo)/span*100)}

export function buildThreatAnswerTimeline(results=[]){
  const decks=results.filter(Boolean)
  const turns=Array.from({length:Math.max(0,...decks.map(r=>Number(r?.methodology?.maxTurn||7)))},(_,i)=>i+1)
  return {modelVersion:'threat-answer-v1',decks:decks.map((r,index)=>({index,turns:turns.map(turn=>{
    const burst=pointAt(r,'burst',turn),engine=pointAt(r,'engine',turn),threat=Math.round(clamp(burst*.7+engine*.3))
    const opponents=decks.filter((_,i)=>i!==index),answer=Math.round(avg(opponents.map(o=>pointAt(o,'interaction',turn))))
    const gap=Math.max(0,threat-answer)
    return {turn,threat,answer,gap,level:level(gap)}
  })})),confidence:{productCalibration:'experimental'},notes:['Threat is a V1 proxy from burst/high-impact access plus engine access.','Answer is current-turn general interaction availability; class-specific V2 is preferred when semantic profiles exist.']}
}

export function buildAdaptiveRule0(results=[],answers={}){
  const questions=[]
  results.forEach((r,index)=>{
    const signals=r?.friction?.signals||{}
    if((signals.extraTurns?.score||0)>=35)questions.push({deckIndex:index,id:'extra-turn-intent',reason:'extra-turn-recurrence',question:'Do you intend to repeat extra turns as soon as the line is available?',questionFr:'Comptes-tu enchaîner les tours supplémentaires dès que la ligne est disponible?',choices:choicesForRule0Question('extra-turn-intent')})
    if((r?.combos?.length||0)>0)questions.push({deckIndex:index,id:'combo-intent',reason:'combo-present',question:'Is the detected combo a primary win plan or a backup finisher?',questionFr:'La combo détectée est-elle un plan de victoire principal ou un finisher de secours ?',choices:choicesForRule0Question('combo-intent')})
    if((signals.massLandDenial?.score||0)>=25)questions.push({deckIndex:index,id:'land-denial-acceptance',reason:'mass-land-denial',question:'Is repeated or mass land denial acceptable for this game?',questionFr:'La destruction ou négation répétée des terrains est-elle acceptée pour cette partie ?',choices:choicesForRule0Question('land-denial-acceptance')})
  })
  const unique=[];for(const q of questions){if(unique.some(x=>x.id===q.id&&x.deckIndex===q.deckIndex))continue;unique.push(q);if(unique.length>=3)break}
  const intentOverlay=buildRule0IntentOverlay(unique,answers)
  return {modelVersion:'adaptive-rule0-v2',questions:unique,intentOverlay,confidence:{productCalibration:'experimental',answerSource:'declared-human-intent'},notes:['Questions are generated only from material detected uncertainties.','Answers affect only an explicit product-intent overlay; detected capability, semantic truth and Aeon power remain unchanged.']}
}

function threatExposureByDeck(timeline,decks){const out=decks.map(()=>0);for(const d of timeline?.decks||[])out[d.index]=Math.max(0,...(d.turns||[]).map(x=>Number(x.gap||0)));return out}
export function buildAdvancedPodMatch(results=[],suppliedThreatTimeline=null,intentOverlay=null){
  const decks=results.filter(Boolean),pairs=[],threatTimeline=suppliedThreatTimeline||buildClassThreatAnswerTimeline(decks)||buildThreatAnswerTimeline(decks),threatExposure=threatExposureByDeck(threatTimeline,decks),intentByDeck=intentOverlay?.perDeck||{}
  for(let i=0;i<decks.length;i++)for(let j=i+1;j<decks.length;j++){
    const a=decks[i],b=decks[j],medianGap=Math.abs((a.profile?.median||0)-(b.profile?.median||0)),peakGap=Math.abs((a.profile?.peak||0)-(b.profile?.peak||0)),speedGap=Math.abs((a.dimensions?.speed||0)-(b.dimensions?.speed||0)),explosiveGap=Math.abs((a.dimensions?.explosiveness||0)-(b.dimensions?.explosiveness||0)),volGap=Math.abs((a.experience?.dimensions?.volatility?.score||0)-(b.experience?.dimensions?.volatility?.score||0)),overlap=rangeOverlap(a,b)
    const frictionA=Math.max(0,...Object.values(a.friction?.signals||{}).map(x=>x.score||0)),frictionB=Math.max(0,...Object.values(b.friction?.signals||{}).map(x=>x.score||0)),frictionGap=Math.abs(frictionA-frictionB),threatGap=Math.max(threatExposure[i]||0,threatExposure[j]||0)
    const intentA=intentByDeck[i]||{},intentB=intentByDeck[j]||{},intentPressureGap=Math.abs(Number(intentA.pressure||0)-Number(intentB.pressure||0)),intentConflict=Math.max(Number(intentA.conflict||0),Number(intentB.conflict||0))
    const mismatch=Math.round(clamp(medianGap*1.6+peakGap*.8+speedGap*.7+explosiveGap*.5+volGap*.35+frictionGap*.25+(100-overlap)*.35+threatGap*.35+intentPressureGap*.30+intentConflict*.55))
    pairs.push({a:i,b:j,mismatch,level:level(mismatch),reasons:{medianGap,peakGap,speedGap,explosivenessGap:explosiveGap,volatilityGap:volGap,frictionGap,rangeOverlap:Math.round(overlap),threatAnswerExposure:Math.round(threatGap),declaredIntentGap:Math.round(intentPressureGap),declaredIntentConflict:Math.round(intentConflict)}})
  }
  const worst=[...pairs].sort((a,b)=>b.mismatch-a.mismatch)[0]||null,score=Math.round(avg(pairs.map(p=>p.mismatch)))
  return {modelVersion:intentOverlay?.answersApplied?'advanced-pod-match-v3':'advanced-pod-match-v2',deckCount:decks.length,mismatch:score,level:level(score),pairs,worstPair:worst,threatAnswerModel:threatTimeline?.modelVersion||null,intentModel:intentOverlay?.modelVersion||null,confidence:{productCalibration:'experimental',declaredIntent:intentOverlay?.answersApplied?'applied':'not-applied'},notes:['Compatibility remains decomposed; the aggregate is a convenience summary, not semantic truth.','Threat–Answer exposure remains an explicit mismatch term.','When supplied, Rule 0 answers affect only declared experience compatibility through a separate intent overlay; objective deck capability is unchanged.']}
}
