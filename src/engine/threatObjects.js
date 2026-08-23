export const THREAT_OBJECT_MODEL_VERSION='threat-object-v2'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):0))
const level=n=>n>=70?'high':n>=40?'moderate':'low'
const points=(result,key)=>result?.horizon?.curves?.[key]?.points||[]
const semantics=(result,key)=>result?.horizon?.curves?.[key]?.semantics||'unavailable'
const firstAt=(rows,n)=>rows.find(x=>Number(x.value||0)>=n)?.turn??null
const rounded=n=>Math.round(clamp(n))
const dep=(result,key)=>Number(result?.spof?.dependencies?.[key]?.score||0)
const pkgStrength=p=>Number(p?.strength??p?.cohesion??0)
const packages=(result,re)=>[...(result?.packages||[])].filter(p=>re.test(String(p?.id||''))).sort((a,b)=>pkgStrength(b)-pkgStrength(a)||String(a.id).localeCompare(String(b.id)))
const packageMax=(result,re)=>Math.max(0,...packages(result,re).map(pkgStrength))
const packageEvidence=(result,re)=>packages(result,re).slice(0,3).map(p=>({kind:'package',id:String(p.id),strength:rounded(pkgStrength(p))}))
const signal=(kind,id,score)=>({kind,id,score:rounded(score)})

function timing(result,curveKey,strength){
  const source=points(result,curveKey).map(x=>({turn:Number(x.turn),value:rounded(x.value)})),weighted=source.map(x=>({turn:x.turn,value:rounded(x.value*(clamp(strength)/100))})),sourceSemantics=semantics(result,curveKey),at25=firstAt(source,25),at50=firstAt(source,50),at75=firstAt(source,75)
  return {source:curveKey,semantics:sourceSemantics,status:sourceSemantics==='cumulative-first-access'?'first-access-weighted':'availability-weighted-fallback',milestones:{at25,at50,at75},criticalWindow:{startTurn:at50??at25,matureTurn:at75},turns:weighted}
}

function safeExecutionPrerequisites(x){
  if(!x)return null
  return {modelVersion:x.modelVersion||null,status:x.status||null,exactExecutionTiming:x.exactExecutionTiming||'blocked',executionClaim:x.executionClaim||'not-emitted',piecePresenceStatus:x.piecePresenceStatus||null,blockers:[...(x.blockers||[])],summary:x.summary||{},requirements:(x.requirements||[]).map(r=>({id:r.id,category:r.category||null,state:r.state||'unknown',zone:r.zone||null,requiredForExecution:!!r.requiredForExecution,engineCanEvaluate:!!r.engineCanEvaluate,evidenceSource:r.evidenceSource||null,blockerReason:r.blockerReason||null}))}
}

function object({id,family,strength,answers,result,curveKey,evidence=[],known=[],unknown=[],executionPrerequisites=null}){
  const score=rounded(strength),t=timing(result,curveKey,score),exec=safeExecutionPrerequisites(executionPrerequisites)
  return {modelVersion:THREAT_OBJECT_MODEL_VERSION,id,family,strength:score,level:level(score),answers:[...new Set(answers)].sort(),sourceEvidence:evidence,prerequisites:{known,unknown:[...new Set(unknown)].sort()},...(exec?{executionPrerequisites:exec}:{}),temporalSource:t.source,temporalSemantics:t.semantics,timingStatus:t.status,milestones:t.milestones,criticalWindow:t.criticalWindow,turns:t.turns,confidence:{classification:'structural-evidence',timing:t.status,prerequisites:unknown.length?'partial':'bounded-known',executionPrerequisites:exec?.modelVersion||'not-applicable'}}
}

export function buildThreatObjects(result={}){
  const combo=Number(result?.comboAccessibility?.highest?.score||0),comboLines=Number(result?.comboAccessibility?.lines?.length||result?.combos?.length||0),commanderPieces=Math.max(0,...(result?.comboAccessibility?.lines||[]).map(x=>Number(x.commanderPieces||0))),highestCombo=result?.comboAccessibility?.highest||null,comboExec=highestCombo?.executionEligibility||null,comboUnknown=comboExec?(comboExec.requirements||[]).filter(r=>r.state!=='known').map(r=>r.id):['exact-piece-zones','protection-window','tutor-eligibility','colored-mana-sequence'],graveyard=dep(result,'graveyard'),artifact=Math.max(dep(result,'artifact'),packageMax(result,/artifact|treasure/i)),enchantment=Math.max(dep(result,'enchantment'),packageMax(result,/enchant|constellation/i)),board=Math.max(dep(result,'creatureBoard'),packageMax(result,/token|counter|sacrifice|tribal|creature/i)),extraTurns=Number(result?.friction?.signals?.extraTurns?.score||0)
  const defs=[
    combo>=12&&{id:'combo',family:'combo',strength:combo,answers:['stack','creature','artifact','enchantment','graveyard'],curveKey:'burst',evidence:[signal('combo-access','detected-lines',comboLines),signal('combo-access','highest-accessibility',combo),signal('command-zone','commander-pieces-max',commanderPieces)],known:[{kind:'combo-lines',value:comboLines},{kind:'commander-pieces-max',value:commanderPieces},...(comboExec?[{kind:'execution-eligibility-model',value:comboExec.modelVersion},{kind:'execution-required-known',value:Number(comboExec.summary?.requiredKnown||0)},{kind:'execution-required-total',value:Number(comboExec.summary?.required||0)}]:[])],unknown:comboUnknown,executionPrerequisites:comboExec},
    graveyard>=12&&{id:'graveyard-engine',family:'engine',strength:graveyard,answers:['graveyard'],curveKey:'engine',evidence:[signal('dependency','graveyard',graveyard),...packageEvidence(result,/graveyard|reanim|recursion/i)],known:[{kind:'dependency-score',value:rounded(graveyard)}],unknown:['specific-engine-piece-state','opponent-hate-timing']},
    artifact>=12&&{id:'artifact-engine',family:'engine',strength:artifact,answers:['artifact'],curveKey:'engine',evidence:[signal('dependency','artifact',dep(result,'artifact')),...packageEvidence(result,/artifact|treasure/i)],known:[{kind:'structural-strength',value:rounded(artifact)}],unknown:['specific-engine-piece-state','opponent-hate-timing']},
    enchantment>=12&&{id:'enchantment-engine',family:'engine',strength:enchantment,answers:['enchantment'],curveKey:'engine',evidence:[signal('dependency','enchantment',dep(result,'enchantment')),...packageEvidence(result,/enchant|constellation/i)],known:[{kind:'structural-strength',value:rounded(enchantment)}],unknown:['specific-engine-piece-state','opponent-hate-timing']},
    board>=12&&{id:'creature-board',family:'board',strength:board,answers:['creature','wipe'],curveKey:'engine',evidence:[signal('dependency','creature-board',dep(result,'creatureBoard')),...packageEvidence(result,/token|counter|sacrifice|tribal|creature/i)],known:[{kind:'structural-strength',value:rounded(board)}],unknown:['board-count-at-window','protection-state','combat-politics']},
    extraTurns>=12&&{id:'extra-turn-loop',family:'turn-loop',strength:extraTurns,answers:['stack'],curveKey:'burst',evidence:[signal('friction','extra-turns',extraTurns)],known:[{kind:'extra-turn-signal',value:rounded(extraTurns)}],unknown:['recurrence-line-state','protection-window']},
  ].filter(Boolean)
  const objects=defs.map(d=>object({...d,result})).sort((a,b)=>b.strength-a.strength||a.id.localeCompare(b.id))
  return {modelVersion:THREAT_OBJECT_MODEL_VERSION,objects,confidence:{evidence:'aggregate-structural',timing:objects.some(x=>x.timingStatus==='first-access-weighted')?'mixed-or-first-access':'fallback',comboPrerequisites:comboExec?'structured-v1':'legacy-fallback'},notes:['Threat Objects V2 preserve aggregate threat arithmetic while adding structured combo execution-prerequisite evidence when available.','Unknown/unsupported prerequisites are preserved explicitly instead of being silently assumed true.','No exact combo execution-window probability is claimed by Threat Objects V2.']}
}
