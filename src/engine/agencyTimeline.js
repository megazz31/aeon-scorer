export const AGENCY_TIMELINE_MODEL_VERSION='agency-timeline-v1'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):0))
const level=n=>n>=60?'high':n>=30?'moderate':'low'
const point=(rows,turn)=>Number(rows?.find(x=>Number(x.turn)===Number(turn))?.value||0)
const horizonPoint=(r,key,turn)=>point(r?.horizon?.curves?.[key]?.points,turn)
const classPoint=(r,key,turn)=>point(r?.answerProfile?.classes?.[key]?.turns,turn)
const threatPoint=(threat,turn)=>point(threat?.turns,turn)

function developmentAt(deck,turn){
  return Math.round(clamp(Math.max(horizonPoint(deck,'commander',turn),horizonPoint(deck,'engine',turn),horizonPoint(deck,'resource',turn))))
}
function pressureRows(decks,index,turn){
  const rows=[]
  decks.forEach((r,opponentIndex)=>{if(opponentIndex===index)return;for(const threat of r?.threatProfile?.threats||[]){const pressure=Math.round(clamp(threatPoint(threat,turn)));if(pressure<=0)continue;rows.push({opponentIndex,threatId:threat.id,family:threat.family||null,pressure,answerClasses:[...(threat.answers||[])],unknownPrerequisites:[...(threat.prerequisites?.unknown||[])]})}})
  return rows.sort((a,b)=>b.pressure-a.pressure||a.opponentIndex-b.opponentIndex||String(a.threatId).localeCompare(String(b.threatId)))
}
function responseAt(deck,pressures,turn){
  let best={value:0,opponentIndex:null,threatId:null,answerClass:null,pressure:0}
  for(const row of pressures){
    let answerClass=null,availability=0
    for(const key of row.answerClasses){const v=Math.round(clamp(classPoint(deck,key,turn)));if(v>availability||(v===availability&&String(key)<String(answerClass||'~'))){availability=v;answerClass=key}}
    const value=Math.min(row.pressure,availability)
    if(value>best.value||(value===best.value&&row.pressure>best.pressure))best={value,opponentIndex:row.opponentIndex,threatId:row.threatId,answerClass,pressure:row.pressure}
  }
  return best
}
function firstTurn(rows,key,threshold=50){return rows.find(x=>Number(x[key]||0)>=threshold)?.turn??null}

export function buildAgencyTimeline(results=[],threatAnswer=null){
  const decks=results.filter(Boolean)
  if(!decks.length||threatAnswer?.modelVersion!=='threat-answer-v4')return null
  const maxTurn=Math.max(0,...decks.map(r=>Number(r?.methodology?.maxTurn||7))),turns=Array.from({length:maxTurn},(_,i)=>i+1)
  const seats=decks.map((deck,index)=>{
    const timeline=turns.map(turn=>{
      const pressures=pressureRows(decks,index,turn),dominant=pressures[0]||null,development=developmentAt(deck,turn),response=responseAt(deck,pressures,turn),closurePressure=Math.round(clamp(dominant?.pressure||0)),responseAgency=Math.round(clamp(response.value)),agency=Math.round(clamp(Math.max(development,responseAgency))),participationGap=Math.max(0,closurePressure-agency)
      return {turn,developmentAgency:development,responseAgency,agency,closurePressure,participationGap,dominantThreat:dominant?{opponentIndex:dominant.opponentIndex,threatId:dominant.threatId,family:dominant.family,answerClasses:dominant.answerClasses,unknownPrerequisiteCount:dominant.unknownPrerequisites.length}:null,responseTarget:response.threatId?{opponentIndex:response.opponentIndex,threatId:response.threatId,answerClass:response.answerClass}:null}
    })
    const firstMeaningfulAgencyTurn=firstTurn(timeline,'agency',50),firstMaterialPressureTurn=firstTurn(timeline,'closurePressure',50),maxParticipationGap=Math.max(0,...timeline.map(x=>x.participationGap)),pressureBeforeAgency=firstMaterialPressureTurn!=null&&(firstMeaningfulAgencyTurn==null||firstMaterialPressureTurn<firstMeaningfulAgencyTurn)
    return {index,timeline,firstMeaningfulAgencyTurn,firstMaterialPressureTurn,pressureBeforeAgency,maxParticipationGap,riskLevel:level(maxParticipationGap)}
  })
  return {modelVersion:AGENCY_TIMELINE_MODEL_VERSION,seats,highestRisk:[...seats].sort((a,b)=>b.maxParticipationGap-a.maxParticipationGap||Number(b.pressureBeforeAgency)-Number(a.pressureBeforeAgency)||a.index-b.index)[0]||null,confidence:{interpretation:'structural-participation-diagnostic',threatInput:'threat-answer-v4',development:'horizon-access-envelope',response:'class-specific-answer-access'},notes:['Agency means potential to advance a plan or present a relevant response before structural opponent pressure; it is not a probability that a player will participate.','Closure pressure is derived from opponent Threat Object timing and strength, not a deterministic prediction that the game ends on that turn.','V1 is diagnostic only and does not change Game Quality or Aeon power coefficients.']}
}
