export const HORIZON_MODEL_VERSION='goldfish-horizon-v2'

const clamp=n=>Math.max(0,Math.min(100,Number.isFinite(Number(n))?Math.round(Number(n)):0))
const firstThreshold=(points,threshold)=>points.find(p=>p.value>=threshold)?.turn??null
const withMilestones=(id,label,semantics,points,extra={})=>({id,label,semantics,points:points.map(p=>({turn:Number(p.turn),value:clamp(p.value)})).filter(p=>Number.isFinite(p.turn)&&p.turn>0),...extra,milestones:{}})
const finalize=c=>({...c,milestones:{at25:firstThreshold(c.points,25),at50:firstThreshold(c.points,50),at75:firstThreshold(c.points,75)}})
const availabilityCurve=(id,label,semantics,rows,key)=>finalize(withMilestones(id,label,semantics,rows.map(r=>({turn:r.turn,value:r[key]}))))
const firstAccessCurve=(id,label,source)=>source?.points?.length?finalize(withMilestones(id,label,'cumulative-first-access',source.points,{observedWithinHorizon:Number(source.observedWithinHorizon||0)})):null

export function buildGoldfishHorizon(result={}){
  const rows=Array.isArray(result?.simulation?.turnProfile)?result.simulation.turnProfile:[],sample=result?.simulation?.firstAccess||null
  const availabilityCurves={
    commander:availabilityCurve('commander-online','Commander online','online-by-turn',rows,'commander'),
    engine:availabilityCurve('engine-operational','Engine operational','available-on-turn',rows,'engine'),
    interaction:availabilityCurve('interaction-available','Meaningful interaction available','available-on-turn',rows,'interaction'),
    resource:availabilityCurve('resource-action','Draw / recursion action available','available-on-turn',rows,'resource'),
    burst:availabilityCurve('burst-access','Burst / high-impact line available','available-on-turn',rows,'burst'),
  }
  const firstAccessCurves=sample?.curves?{
    commander:firstAccessCurve('commander-first-access','Commander first online',sample.curves.commander),
    engine:firstAccessCurve('engine-first-access','Engine first operational',sample.curves.engine),
    interaction:firstAccessCurve('interaction-first-access','First meaningful interaction access',sample.curves.interaction),
    resource:firstAccessCurve('resource-first-access','First draw / recursion access',sample.curves.resource),
    burst:firstAccessCurve('burst-first-access','First burst / high-impact access',sample.curves.burst),
  }:{}
  const hasFirstAccess=Object.values(firstAccessCurves).some(Boolean),curves={}
  for(const key of ['commander','engine','interaction','resource','burst'])curves[key]=firstAccessCurves[key]||availabilityCurves[key]
  const maxTurn=rows.length?Math.max(...rows.map(r=>Number(r.turn)||0)):Number(result?.methodology?.maxTurn||sample?.maxTurn||0),iterations=Number(result?.simulation?.iterations||result?.methodology?.iterations||0),firstAccessIterations=Number(sample?.iterations||0)
  return {
    modelVersion:HORIZON_MODEL_VERSION,maxTurn,iterations,firstAccessIterations,curves,availabilityCurves,firstAccessCurves,
    confidence:{simulation:iterations>=1800?'high':iterations>=600?'moderate':'low',firstAccess:firstAccessIterations>=800?'high':firstAccessIterations>=400?'moderate':firstAccessIterations>0?'exploratory':'unavailable',productCalibration:'experimental'},
    provenance:{preferred:hasFirstAccess?sample.modelVersion||'first-access-sampler':'turn-profile-fallback',mainSimulationIterations:iterations,firstAccessIterations},
    notes:hasFirstAccess?['Goldfish Horizon is a temporal access profile, not a win-probability curve.','V2 prefers true cumulative P(first access ≤ turn) curves from an independent deterministic sub-sample while preserving the historical on-turn curves in availabilityCurves.','The first-access sampler cannot alter the main power simulation because it uses a separate RNG stream after score calculation.']:['Goldfish Horizon is a temporal access profile, not a win-probability curve.','No first-access sampler payload is present, so V2 falls back to historical simulator semantics: commander online-by-turn and other signals available-on-turn.'],
  }
}
