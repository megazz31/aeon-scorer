const CLASSES=['stack','creature','artifact','enchantment','graveyard','wipe']
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):0))
const level=n=>n>=60?'high':n>=30?'moderate':n>0?'low':'none'
const classPoint=(r,key,turn)=>Number(r?.answerProfile?.classes?.[key]?.turns?.find(x=>x.turn===turn)?.value||0)
const threatPoint=(threat,turn)=>Number(threat?.turns?.find(x=>x.turn===turn)?.value||0)
function combinedAnswer(opponents,key,turn){
  const probabilities=opponents.map(o=>clamp(classPoint(o,key,turn))/100)
  return Math.round(clamp((1-probabilities.reduce((p,x)=>p*(1-x),1))*100))
}

export function buildAnswerDebt(results=[]){
  const decks=results.filter(Boolean),classes={}
  for(const key of CLASSES){
    const rows=[]
    decks.forEach((r,index)=>{
      const opponents=decks.filter((_,i)=>i!==index)
      for(const threat of r?.threatProfile?.threats||[]){
        if(!(threat.answers||[]).includes(key))continue
        for(const p of threat.turns||[]){
          const demand=Math.round(clamp(threatPoint(threat,p.turn))),coverage=combinedAnswer(opponents,key,p.turn),gap=Math.max(0,demand-coverage)
          if(demand<=0)continue
          rows.push({deckIndex:index,turn:p.turn,threatId:threat.id,demand,coverage,gap})
        }
      }
    })
    rows.sort((a,b)=>b.gap-a.gap||b.demand-a.demand||a.turn-b.turn||a.deckIndex-b.deckIndex||String(a.threatId).localeCompare(String(b.threatId)))
    const worst=rows[0]||null,score=Math.round(clamp(worst?.gap||0))
    classes[key]={score,level:level(score),worst,examples:rows.slice(0,3)}
  }
  const highest=Object.entries(classes).map(([answerClass,v])=>({answerClass,...v})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.answerClass.localeCompare(b.answerClass))
  return {
    modelVersion:'answer-debt-v1',
    classes,
    highest:highest.slice(0,3),
    confidence:{timing:'inherits-threat-answer-proxies',productCalibration:'experimental'},
    notes:['Answer Debt is the largest observed gap between a class-specific threat demand and the other seats’ class-specific answer coverage.','It is a diagnostic aggregation of the existing Threat/Answer models, not a new probability model.','A high debt means the pod appears structurally under-covered for that answer class in at least one relevant turn window.'],
  }
}
