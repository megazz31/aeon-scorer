const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a))
const round1=n=>Math.round(Number(n)*10)/10

const MODEL_CEILING=92
const DATA_WEIGHT=.35
const MODEL_WEIGHT=.65

const LIMITATIONS=Object.freeze({
  'commander-enchantment-animation-combat-not-sequence-simulated':{penalty:14,severity:'high',direction:'underestimate',scope:'commander'},
  'go-wide-combat-damage-not-sequence-simulated':{penalty:16,severity:'high',direction:'underestimate',scope:'commander'},
  'donation-goad-opponent-behavior-not-sequence-simulated':{penalty:20,severity:'high',direction:'uncertain',scope:'commander'},
  'donation-value-not-sequence-simulated':{penalty:17,severity:'high',direction:'uncertain',scope:'commander'},
  'top-library-restricted-cast-not-sequence-simulated':{penalty:15,severity:'high',direction:'underestimate',scope:'commander'},
  'exact-one-life-loss-frequency-conservative':{penalty:11,severity:'moderate',direction:'underestimate',scope:'commander'},
  'activated-ability-mana-and-exhaust-compression-not-sequence-simulated':{penalty:18,severity:'high',direction:'underestimate',scope:'commander'},
  'equipment-attachment-activation-combat-not-sequence-simulated':{penalty:13,severity:'moderate',direction:'underestimate',scope:'package'},
  'target-cost-reduction-x-value-conservative':{penalty:8,severity:'moderate',direction:'underestimate',scope:'mechanic'},
})

function commanderCentrality(result){
  const score=clamp(result?.commanderSynergy?.score,0,100)/100
  return .70+score*.30
}

function packageCentrality(result,id){
  const pkg=(result?.packages||[]).find(row=>row?.id===id)
  const cohesion=clamp(pkg?.scoringCohesion??pkg?.cohesion??pkg?.strength,0,100)/100
  return .65+cohesion*.35
}

function limitationCentrality(code,spec,result){
  if(spec.scope==='commander')return commanderCentrality(result)
  if(code==='equipment-attachment-activation-combat-not-sequence-simulated')return packageCentrality(result,'equipment')
  return 1
}

function reasonForLimitation(code,result){
  const spec=LIMITATIONS[code]||{penalty:10,severity:'moderate',direction:'uncertain',scope:'mechanic'}
  const centrality=limitationCentrality(code,spec,result)
  return {
    code,
    severity:spec.severity,
    direction:spec.direction,
    scope:spec.scope,
    penalty:round1(spec.penalty*centrality),
    evidence:{centrality:round1(centrality*100)}
  }
}

function comboReason(result){
  const combos=Array.isArray(result?.combos)?result.combos:[]
  if(!combos.length)return null
  const families=new Set(combos.map(combo=>combo?.family||combo?.name).filter(Boolean)).size
  const nonSequenced=combos.filter(combo=>combo?.sequenceEligible===false).length
  const penalty=Math.min(10,3+Math.max(0,families-1)*1.5+nonSequenced*1.5)
  return {
    code:'known-combo-execution-partial',
    severity:nonSequenced?'moderate':'low',
    direction:'uncertain',
    scope:'combo',
    penalty:round1(penalty),
    evidence:{combos:combos.length,families,nonSequenced}
  }
}

function manaReason(result){
  const unknown=Math.max(0,Number(result?.roles?.unknownManaLands||0))
  const lands=Math.max(0,Number(result?.roles?.lands||0))
  if(!unknown||unknown<=Math.max(2,lands*.15))return null
  return {
    code:'unknown-mana-production',
    severity:unknown>Math.max(4,lands*.25)?'high':'moderate',
    direction:'uncertain',
    scope:'mana',
    penalty:round1(Math.min(10,3+unknown*.9)),
    evidence:{unknownManaLands:unknown,lands}
  }
}

function commanderReason(result){
  if((result?.commanderNames||[]).length)return null
  return {
    code:'commander-missing',
    severity:'high',
    direction:'uncertain',
    scope:'commander',
    penalty:22,
    evidence:{commanders:0}
  }
}

function directionFromReasons(reasons){
  if(!reasons.length)return 'none'
  const totals={underestimate:0,overestimate:0,uncertain:0}
  for(const reason of reasons)totals[reason.direction]=(totals[reason.direction]||0)+Number(reason.penalty||0)
  const directional=Math.max(totals.underestimate,totals.overestimate)
  const direction=totals.underestimate>=totals.overestimate?'underestimate':'overestimate'
  if(directional<4||totals.uncertain>=directional*.8)return 'uncertain'
  return direction
}

function levelFor(score){return score>=85?'high':score>=65?'moderate':'low'}

export function buildScoringReliability(result={}){
  const dataCompleteness=clamp(result?.profile?.dataCoverage??result?.profile?.coverage,0,100)
  const limitations=[...new Set(Array.isArray(result?.methodology?.limitations)?result.methodology.limitations:[])]
  const reasons=limitations.map(code=>reasonForLimitation(code,result))
  for(const reason of [comboReason(result),manaReason(result),commanderReason(result)])if(reason)reasons.push(reason)
  reasons.sort((a,b)=>b.penalty-a.penalty||a.code.localeCompare(b.code))
  const penaltyTotal=reasons.reduce((sum,reason)=>sum+Number(reason.penalty||0),0)
  const modelCoverage=round1(clamp(MODEL_CEILING-penaltyTotal,25,MODEL_CEILING))
  const score=Math.round(clamp(dataCompleteness*DATA_WEIGHT+modelCoverage*MODEL_WEIGHT,0,100))
  return Object.freeze({
    modelVersion:'scoring-reliability-v1',
    score,
    level:levelFor(score),
    dataCompleteness:Math.round(dataCompleteness),
    modelCoverage,
    direction:directionFromReasons(reasons),
    reasons:Object.freeze(reasons.map(reason=>Object.freeze({...reason,evidence:Object.freeze({...reason.evidence})}))),
    methodology:Object.freeze({
      kind:'diagnostic-index',
      calibration:'heuristic-v1',
      probability:false,
      modelCeiling:MODEL_CEILING,
      dataWeight:DATA_WEIGHT,
      modelWeight:MODEL_WEIGHT,
    })
  })
}
