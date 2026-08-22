const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const avg=xs=>xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:0
const level=n=>n>=70?'high':n>=40?'moderate':'low'
const horizonPoint=(r,key,turn)=>r?.horizon?.curves?.[key]?.points?.find(x=>x.turn===turn)?.value??0
const classPoint=(r,key,turn)=>r?.answerProfile?.classes?.[key]?.turns?.find(x=>x.turn===turn)?.value??0
const threatPoint=(threat,turn)=>threat?.turns?.find(x=>x.turn===turn)?.value??0
function answerForThreat(opponents,classes,turn){
  if(!classes?.length)return Math.round(avg(opponents.map(o=>horizonPoint(o,'interaction',turn))))
  const perOpponent=opponents.map(o=>Math.max(0,...classes.map(k=>classPoint(o,k,turn))))
  const combined=1-perOpponent.reduce((p,x)=>p*(1-clamp(x)/100),1)
  return Math.round(clamp(combined*100))
}
export function buildClassThreatAnswerTimeline(results=[]){
  const decks=results.filter(Boolean),turns=Array.from({length:Math.max(0,...decks.map(r=>Number(r?.methodology?.maxTurn||7)))},(_,i)=>i+1),classSpecific=decks.some(r=>(r?.threatProfile?.threats||[]).length)&&decks.some(r=>r?.answerProfile?.classes)
  if(!classSpecific)return null
  const timingModels=[...new Set(decks.map(r=>r?.answerProfile?.modelVersion).filter(Boolean))],classTimingV2=decks.some(r=>Object.values(r?.answerProfile?.classes||{}).some(c=>c?.timingMethod==='class-card-draw-mv-envelope')),modelVersion=classTimingV2?'threat-answer-v3':'threat-answer-v2'
  return {modelVersion,decks:decks.map((r,index)=>({index,turns:turns.map(turn=>{
    const opponents=decks.filter((_,i)=>i!==index),candidates=(r?.threatProfile?.threats||[]).map(th=>{const threat=Math.round(clamp(threatPoint(th,turn))),answer=answerForThreat(opponents,th.answers,turn),gap=Math.max(0,threat-answer);return {turn,threat,answer,gap,level:level(gap),threatId:th.id,answerClasses:th.answers||[]}}).sort((a,b)=>b.gap-a.gap||b.threat-a.threat||String(a.threatId).localeCompare(String(b.threatId)))
    return candidates[0]||{turn,threat:0,answer:0,gap:0,level:'low',threatId:null,answerClasses:[]}
  })})),confidence:{productCalibration:'experimental',answerCombination:'multi-opponent-coverage-proxy',answerTimingModels:timingModels,classSpecificTiming:classTimingV2?'v2':'legacy'},notes:classTimingV2?['Threats are matched to relevant semantic answer classes rather than generic interaction.','Per opponent, Aeon uses the strongest relevant answer class; table coverage remains an experimental combination proxy.','V3 consumes class-specific Answer Profile V2 timing based on actual answer-card counts and mana-value gating.']:['Threats are matched to relevant semantic answer classes rather than generic interaction.','Per opponent, Aeon uses the strongest relevant answer class; table coverage remains an experimental combination proxy.','All supplied class timings are legacy/fallback, so the compatibility model remains threat-answer-v2.']}
}
