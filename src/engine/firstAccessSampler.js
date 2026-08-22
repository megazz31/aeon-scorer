import { simulateSequences } from './sequenceSimulator.js'
import { simulateSequencesMulti } from './sequenceSimulatorMulti.js'

export const FIRST_ACCESS_MODEL_VERSION='first-access-sampler-v1'
const SIGNALS=['commander','engine','interaction','resource','burst']
const boundedIterations=n=>Math.max(1,Math.min(1200,Math.floor(Number(n)||1)))
const firstTurn=(rows,key)=>rows.find(r=>Number(r?.[key]||0)>0)?.turn??null
const cumulativePoints=(turns,maxTurn,total)=>Array.from({length:maxTurn},(_,i)=>{const turn=i+1,hits=turns.reduce((n,x)=>n+(x!=null&&x<=turn?1:0),0);return {turn,value:Math.round(hits/Math.max(1,total)*100)}})

export function sampleFirstAccess({cards=[],commanders=[],packages=[],combos=[],iterations=600,maxTurn=7,rng=Math.random}={}){
  const cmd=(Array.isArray(commanders)?commanders:[commanders]).filter(Boolean).slice(0,2),count=boundedIterations(iterations),first=Object.fromEntries(SIGNALS.map(k=>[k,[]])),perCommander=Object.fromEntries(cmd.map(c=>[c.name,[]]))
  for(let i=0;i<count;i++){
    const sim=cmd.length>1?simulateSequencesMulti(cards,cmd,packages,combos,1,maxTurn,rng):simulateSequences(cards,cmd[0]||null,packages,combos,1,maxTurn,rng),rows=sim.turnProfile||[]
    for(const key of SIGNALS)first[key].push(firstTurn(rows,key))
    for(const name of Object.keys(perCommander))perCommander[name].push(rows.find(r=>Number(r?.commanders?.[name]||0)>0)?.turn??(cmd.length===1?firstTurn(rows,'commander'):null))
  }
  const curves=Object.fromEntries(SIGNALS.map(key=>[key,{id:`${key}-first-access`,semantics:'cumulative-first-access',points:cumulativePoints(first[key],maxTurn,count),observedWithinHorizon:first[key].filter(x=>x!=null).length}]))
  const commanderCurves=Object.fromEntries(Object.entries(perCommander).map(([name,turns])=>[name,{id:'commander-first-access',semantics:'cumulative-first-access',points:cumulativePoints(turns,maxTurn,count),observedWithinHorizon:turns.filter(x=>x!=null).length}]))
  return {modelVersion:FIRST_ACCESS_MODEL_VERSION,iterations:count,maxTurn,curves,commanders:commanderCurves,confidence:{sampling:count>=800?'high':count>=400?'moderate':'exploratory'},notes:['Each sample reuses the existing sequence simulator with one sequence and records the first turn each availability signal becomes true.','The sampler uses an independent deterministic RNG stream so it cannot alter the main Aeon power simulation.','Probabilities use all sampled sequences as denominator; a sequence with no access inside the horizon remains a miss.']}
}
