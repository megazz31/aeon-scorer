export const RULE0_INTENT_VERSION='rule0-intent-v1'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):0))
export const rule0AnswerKey=(deckIndex,id)=>`${Number(deckIndex)}:${String(id||'')}`

const SPECS={
  'combo-intent':{
    choices:[
      {value:'primary',label:'Primary win plan',labelFr:'Plan de victoire principal',pressure:80,conflict:0},
      {value:'backup',label:'Backup finisher',labelFr:'Finisher de secours',pressure:30,conflict:0},
      {value:'not-planned',label:'Not an intended line',labelFr:'Ligne non recherchée',pressure:5,conflict:0},
    ],
  },
  'extra-turn-intent':{
    choices:[
      {value:'repeat',label:'Repeat/chains are intended',labelFr:'Les chaînes sont recherchées',pressure:80,conflict:0},
      {value:'single',label:'At most one extra turn',labelFr:'Au plus un tour supplémentaire',pressure:25,conflict:0},
      {value:'not-planned',label:'Not an intended plan',labelFr:'Plan non recherché',pressure:5,conflict:0},
    ],
  },
  'land-denial-acceptance':{
    choices:[
      {value:'accepted',label:'Accepted for this game',labelFr:'Accepté pour cette partie',pressure:0,conflict:0},
      {value:'uncertain',label:'Needs discussion',labelFr:'À discuter',pressure:0,conflict:40},
      {value:'rejected',label:'Not accepted for this game',labelFr:'Non accepté pour cette partie',pressure:0,conflict:100},
    ],
  },
}

export function choicesForRule0Question(id){return (SPECS[id]?.choices||[]).map(({value,label,labelFr})=>({value,label,labelFr}))}

export function buildRule0IntentOverlay(questions=[],answers={}){
  const perDeck={},applied=[]
  let unresolved=0
  for(const q of questions){
    const key=rule0AnswerKey(q.deckIndex,q.id),value=answers?.[key]
    if(value==null||value===''){unresolved++;continue}
    const choice=(SPECS[q.id]?.choices||[]).find(x=>x.value===value)
    if(!choice)continue
    const row=perDeck[q.deckIndex]||(perDeck[q.deckIndex]={pressure:0,conflict:0,answers:[]})
    row.pressure=clamp(Math.max(row.pressure,choice.pressure||0))
    row.conflict=clamp(Math.max(row.conflict,choice.conflict||0))
    row.answers.push({id:q.id,value:choice.value,pressure:choice.pressure||0,conflict:choice.conflict||0})
    applied.push({deckIndex:q.deckIndex,id:q.id,value:choice.value,pressure:choice.pressure||0,conflict:choice.conflict||0})
  }
  return {
    modelVersion:RULE0_INTENT_VERSION,
    perDeck,
    applied,
    answersApplied:applied.length,
    unresolvedQuestions:unresolved,
    confidence:{source:'declared-intent',productCalibration:'experimental'},
    notes:['Intent answers modify only the product compatibility overlay; they never rewrite card semantics, detected capabilities, deck power or Threat–Answer evidence.','An answer may reduce or increase declared experience pressure, but objective deck capability remains unchanged.'],
  }
}
