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
function threatWindow(th,opponents,turns){
  return {
    threatId:th.id,
    family:th.family||null,
    answerClasses:[...(th.answers||[])],
    criticalWindow:th.criticalWindow||null,
    timingStatus:th.timingStatus||null,
    unknownPrerequisites:[...(th.prerequisites?.unknown||[])],
    turns:turns.map(turn=>{const threat=Math.round(clamp(threatPoint(th,turn))),answer=answerForThreat(opponents,th.answers,turn),gap=Math.max(0,threat-answer);return {turn,threat,answer,gap,level:level(gap)}}),
  }
}
function worstAtTurn(windows,turn){
  const candidates=windows.map(w=>{const x=w.turns.find(p=>p.turn===turn)||{turn,threat:0,answer:0,gap:0,level:'low'};return {...x,threatId:w.threatId,answerClasses:w.answerClasses}}).sort((a,b)=>b.gap-a.gap||b.threat-a.threat||String(a.threatId).localeCompare(String(b.threatId)))
  return candidates[0]||{turn,threat:0,answer:0,gap:0,level:'low',threatId:null,answerClasses:[]}
}
export function buildClassThreatAnswerTimeline(results=[]){
  const decks=results.filter(Boolean),turns=Array.from({length:Math.max(0,...decks.map(r=>Number(r?.methodology?.maxTurn||7)))},(_,i)=>i+1),classSpecific=decks.some(r=>(r?.threatProfile?.threats||[]).length)&&decks.some(r=>r?.answerProfile?.classes)
  if(!classSpecific)return null
  const timingModels=[...new Set(decks.map(r=>r?.answerProfile?.modelVersion).filter(Boolean))],classTimingV2=decks.some(r=>Object.values(r?.answerProfile?.classes||{}).some(c=>c?.timingMethod==='class-card-draw-mv-envelope')),threatObjects=decks.some(r=>r?.threatProfile?.threatObjectModel),modelVersion=classTimingV2?(threatObjects?'threat-answer-v4':'threat-answer-v3'):'threat-answer-v2'
  const outDecks=decks.map((r,index)=>{
    const opponents=decks.filter((_,i)=>i!==index),windows=(r?.threatProfile?.threats||[]).map(th=>threatWindow(th,opponents,turns))
    return {index,turns:turns.map(turn=>worstAtTurn(windows,turn)),...(modelVersion==='threat-answer-v4'?{windows}: {})}
  })
  const notes=modelVersion==='threat-answer-v4'?['V4 preserves every Threat Object window while retaining the historical worst-window `decks[].turns` surface.','Threats are matched to relevant semantic answer classes rather than generic interaction.','Per opponent, Aeon uses the strongest relevant answer class; table coverage remains an experimental combination proxy.','V4 consumes Answer Profile V2 class timing and Threat Object prerequisite/timing metadata without changing existing worst-window arithmetic.']:classTimingV2?['Threats are matched to relevant semantic answer classes rather than generic interaction.','Per opponent, Aeon uses the strongest relevant answer class; table coverage remains an experimental combination proxy.','V3 consumes class-specific Answer Profile V2 timing based on actual answer-card counts and mana-value gating.']:['Threats are matched to relevant semantic answer classes rather than generic interaction.','Per opponent, Aeon uses the strongest relevant answer class; table coverage remains an experimental combination proxy.','All supplied class timings are legacy/fallback, so the compatibility model remains threat-answer-v2.']
  return {modelVersion,decks:outDecks,confidence:{productCalibration:'experimental',answerCombination:'multi-opponent-coverage-proxy',answerTimingModels:timingModels,classSpecificTiming:classTimingV2?'v2':'legacy',threatObjects:modelVersion==='threat-answer-v4'?'v1':'legacy'},notes}
}
