export const EXPERIENCE_MODEL_VERSION='experience-v1'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):0))
const round=n=>Math.round(clamp(n))
const avg=xs=>xs.length?xs.reduce((s,x)=>s+Number(x||0),0)/xs.length:0
const levelFor=score=>score<25?'low':score<50?'moderate':score<75?'high':'very-high'
const ev=(signal,value,source,reason)=>({signal,value:Math.round(Number(value||0)*10)/10,source,reason})
const dimension=(score,evidence)=>({score:round(score),level:levelFor(round(score)),evidence:evidence.filter(Boolean).slice(0,4)})

const CHAIN_TAGS=new Set(['spellslinger','token-payoff','death-payoff','life-payoff','counter-payoff','exile-payoff','artifact-payoff','landfall','constellation','trigger-doubler'])
function packageCohesion(packages){return avg(packages.slice(0,3).map(p=>p.cohesion??p.strength??0))}
function cardComplexity(cards){
  const pool=(Array.isArray(cards)?cards:[]).filter(c=>!c?.isLand&&!/\bland\b/i.test(c?.type||''))
  if(!pool.length)return {available:false,recurring:0,chain:0,activated:0,total:0}
  const recurring=pool.filter(c=>c?.recurring||/\bwhenever\b|\bat the beginning\b|\bonce each turn\b|\beach [^.]{0,30} step\b/i.test(c?.oracle||'')).length
  const chain=pool.filter(c=>(c?.tags||[]).some(t=>CHAIN_TAGS.has(t))).length
  const activated=pool.filter(c=>/:\s*[^.\n]+/.test(c?.oracle||'')).length
  return {available:true,recurring,chain,activated,total:pool.length}
}
function confidence(result,cards){
  const coverage=Number(result?.profile?.coverage??result?.profile?.dataCoverage??0),iterations=Number(result?.methodology?.iterations||0),hasCards=Array.isArray(cards)&&cards.length>=20
  return {
    semantic:coverage>=90?'high':coverage>=75?'moderate':'low',
    simulation:iterations>=1800?'high':iterations>=600?'moderate':'low',
    productCalibration:'experimental',
    evidenceCoverage:hasCards?'full':'result-only',
  }
}

export function buildExperienceFingerprint(result={},cards=[]){
  const profile=result?.profile||{},d=result?.dimensions||{},packages=Array.isArray(result?.packages)?result.packages:[],combos=Array.isArray(result?.combos)?result.combos:[],cmd=result?.commanderSynergy||{}
  const pkgCohesion=packageCohesion(packages),complex=cardComplexity(cards)
  const speed=clamp(d.speed),explosive=clamp(d.explosiveness),interaction=clamp(d.interaction),resilience=clamp(d.resilience),synergy=clamp(d.synergy),consistency=clamp(d.consistency)
  const dispersion=clamp(profile.dispersion??Math.max(0,Number(profile.ceiling||0)-Number(profile.floor||0))),tailGap=Math.max(0,Number(profile.peak||0)-Number(profile.ceiling||0))
  const commanderDelta=Math.max(0,Number(profile.commanderDelta||0)),commanderSynergy=clamp(cmd.score)
  const inevitability=clamp(synergy*.35+consistency*.30+resilience*.20+pkgCohesion*.15)
  const dependency=clamp(commanderDelta*4+commanderSynergy*.45)
  const complexity=complex.available
    ?clamp((complex.recurring/complex.total)*45+(complex.chain/complex.total)*35+(complex.activated/complex.total)*10+Math.min(10,packages.length*2)+Math.min(12,combos.length*4))
    :clamp(Math.min(30,packages.length*5)+Math.min(24,combos.length*8))
  const volatility=clamp(dispersion*2+tailGap*1.5)

  return {
    modelVersion:EXPERIENCE_MODEL_VERSION,
    dimensions:{
      tempo:dimension(speed,[ev('speed',speed,'aeon-dimension','Existing Aeon speed dimension; no power-score feedback.')]),
      explosiveness:dimension(explosive,[ev('explosiveness',explosive,'aeon-dimension','Existing Aeon explosiveness dimension; no power-score feedback.')]),
      volatility:dimension(volatility,[ev('normal-range-width',dispersion,'profile','P20–P80 spread.'),ev('high-roll-tail',tailGap,'profile','Peak distance above P80.')]),
      interaction:dimension(interaction,[ev('interaction',interaction,'aeon-dimension','Existing Aeon interaction-access dimension.')]),
      resilience:dimension(resilience,[ev('resilience',resilience,'aeon-dimension','Existing Aeon recovery/resilience dimension.')]),
      inevitability:dimension(inevitability,[ev('synergy',synergy,'aeon-dimension','Structural package/commander synergy.'),ev('consistency',consistency,'aeon-dimension','Ability to reproduce normal game plans.'),ev('resilience',resilience,'aeon-dimension','Ability to keep the engine relevant.'),ev('package-cohesion',pkgCohesion,'package-model','Average cohesion of the three strongest packages.')]),
      dependency:dimension(dependency,[ev('commander-delta',commanderDelta,'profile','Observed command-zone contribution proxy.'),ev('commander-synergy',commanderSynergy,'package-model','Share of the deck connected to commander semantics.'),ev('scope-v1',0,'model-note','V1 dependency is command-zone focused; generalized SPOF arrives later in P2.')]),
      turnComplexity:dimension(complexity,complex.available?[ev('recurring-cards',complex.recurring,'semantic','Cards with recurring/triggered actions.'),ev('chain-payoffs',complex.chain,'semantic','Cards that convert repeated package events into additional actions.'),ev('activated-cards',complex.activated,'semantic','Cards exposing repeatable activated decisions.'),ev('packages',packages.length,'package-model','Independent engines increase sequencing branches.')]:[ev('packages',packages.length,'package-model','Fallback proxy because analyzed card evidence was not supplied.'),ev('combos',combos.length,'combo-model','Fallback complexity contribution from known lines.')]),
    },
    confidence:confidence(result,cards),
    notes:['Experience Fingerprint V1 is parallel product intelligence and does not modify the Aeon 0–100 power score.','Inevitability and dependency are structural proxies until P2 SPOF and P7 real-game calibration mature.'],
  }
}
