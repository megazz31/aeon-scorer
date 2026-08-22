export const HORIZON_MODEL_VERSION='goldfish-horizon-v1'

const clamp=n=>Math.max(0,Math.min(100,Number.isFinite(Number(n))?Math.round(Number(n)):0))
const firstThreshold=(points,threshold)=>points.find(p=>p.value>=threshold)?.turn??null
const curve=(id,label,semantics,rows,key)=>{
  const points=rows.map(r=>({turn:Number(r.turn),value:clamp(r[key])})).filter(p=>Number.isFinite(p.turn)&&p.turn>0)
  return {id,label,semantics,points,milestones:{at25:firstThreshold(points,25),at50:firstThreshold(points,50),at75:firstThreshold(points,75)}}
}

export function buildGoldfishHorizon(result={}){
  const rows=Array.isArray(result?.simulation?.turnProfile)?result.simulation.turnProfile:[]
  const curves={
    commander:curve('commander-online','Commander online','online-by-turn',rows,'commander'),
    engine:curve('engine-operational','Engine operational','available-on-turn',rows,'engine'),
    interaction:curve('interaction-available','Meaningful interaction available','available-on-turn',rows,'interaction'),
    resource:curve('resource-action','Draw / recursion action available','available-on-turn',rows,'resource'),
    burst:curve('burst-access','Burst / high-impact line available','available-on-turn',rows,'burst'),
  }
  const maxTurn=rows.length?Math.max(...rows.map(r=>Number(r.turn)||0)):Number(result?.methodology?.maxTurn||0)
  const iterations=Number(result?.simulation?.iterations||result?.methodology?.iterations||0)
  return {
    modelVersion:HORIZON_MODEL_VERSION,
    maxTurn,
    iterations,
    curves,
    confidence:{simulation:iterations>=1800?'high':iterations>=600?'moderate':'low',productCalibration:'experimental'},
    notes:['Goldfish Horizon is a temporal access profile, not a win-probability curve.','V1 preserves simulator semantics: commander is online-by-turn; engine, interaction, resource and burst are availability on that specific turn.','V1 intentionally does not convert on-turn availability into fake cumulative first-access probabilities.'],
  }
}
