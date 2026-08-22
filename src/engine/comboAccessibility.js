export const COMBO_ACCESS_MODEL_VERSION='combo-access-v2'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const level=n=>n>=70?'high':n>=40?'moderate':'low'
const TARGET_TURNS=[5,7,9]
const key=s=>String(s||'').trim().toLowerCase()

const COMBO_BOUNDARIES={
  'thoracle + consultation':['library-empty-condition','stack-sequencing','protection-window'],
  'thoracle + pact':['library-empty-condition','singleton-name-constraint','stack-sequencing','protection-window'],
  'dramatic scepter':['imprint-state','nonland-mana-positive-loop','activation-cost','protection-window'],
  'heliod ballista':['x-cost','counter-threshold','lifelink-activation','protection-window'],
  'exquisite bond':['life-change-trigger','both-permanents-survive'],
  'exquisite vito':['life-change-trigger','both-permanents-survive'],
  'painter stone':['activation-cost','color-setting-state','replacement-effect-risk'],
  'worldgorger':['graveyard-zone-piece','aura-targeting-sequence','loop-exit-condition'],
  'breach freeze':['graveyard-resource-threshold','escape-cost','storm-count','mana-loop'],
}

function structuralLine(result,combo){
  const names=new Set((result.commanderNames||[]).map(key)),pieces=combo.cards||[],commanderPieces=pieces.filter(n=>names.has(key(n))).length,tutors=Number(result.roles?.tutors||0)+Number(result.roles?.repeatableTutors||0),draw=Number(result.roles?.draw||0),fastMana=Number(result.roles?.fastMana||0),burstT5=result.horizon?.curves?.burst?.points?.find(x=>x.turn===5)?.value||0,piecePenalty=Math.max(0,pieces.length-2)*16,base=34+tutors*3+draw*.8+fastMana*2+burstT5*.12+commanderPieces*8-piecePenalty,score=Math.round(clamp(base))
  return {score,level:level(score),commanderPieces,method:'structural-access-proxy',signals:{tutors,draw,fastMana,burstT5}}
}

function chooseRatio(n,k){
  n=Math.floor(n);k=Math.floor(k)
  if(k<0||n<0||k>n)return 0
  k=Math.min(k,n-k);let out=1
  for(let i=1;i<=k;i++)out=out*(n-k+i)/i
  return out
}

function atLeastOneEachProbability(librarySize,draws,copyGroups=[]){
  const N=Math.max(0,Math.floor(librarySize)),n=Math.max(0,Math.min(N,Math.floor(draws))),groups=copyGroups.map(x=>Math.max(0,Math.floor(x))).filter(x=>x>0)
  if(!groups.length)return 1
  const denom=chooseRatio(N,n);if(!denom)return 0
  let favorable=0
  const subsets=1<<groups.length
  for(let mask=0;mask<subsets;mask++){
    let excluded=0,bits=0
    for(let i=0;i<groups.length;i++)if(mask&(1<<i)){excluded+=groups[i];bits++}
    const ways=chooseRatio(N-excluded,n)
    favorable+=(bits%2?-1:1)*ways
  }
  return Math.max(0,Math.min(1,favorable/denom))
}

function resolutionFor(result,cards,combo){
  const commanderNames=new Set((result.commanderNames||[]).map(key)),all=(cards||[]).filter(Boolean),library=all.filter(c=>!commanderNames.has(key(c?.name))||c?.__keepIn99),counts=new Map()
  for(const card of library)counts.set(key(card?.name),(counts.get(key(card?.name))||0)+1)
  const missing=[],commandZone=[],libraryGroups=[]
  for(const piece of combo.cards||[]){
    const k=key(piece)
    if(commanderNames.has(k)){commandZone.push(piece);continue}
    const copies=counts.get(k)||0
    if(copies>0)libraryGroups.push({name:piece,copies});else missing.push(piece)
  }
  return {librarySize:library.length,libraryGroups,commandZone,missing}
}

function temporalEvidence(result,cards,combo){
  const resolved=resolutionFor(result,cards,combo),pieceCount=(combo.cards||[]).length,boundaries=COMBO_BOUNDARIES[key(combo.name)]||['execution-prerequisites-not-modeled'],supported=pieceCount>=2&&resolved.missing.length===0&&resolved.librarySize>0
  const windows=TARGET_TURNS.map(turn=>{
    const rawDraws=Math.min(resolved.librarySize,7+turn),prob=supported?atLeastOneEachProbability(resolved.librarySize,rawDraws,resolved.libraryGroups.map(x=>x.copies)):null
    return {turn,piecePresence:prob==null?null:Math.round(prob*1000)/10,rawDraws}
  })
  return {
    modelVersion:'combo-piece-timing-v1',
    status:supported?'piece-presence-supported':'unsupported',
    metric:'all-required-library-piece-names-seen',
    executionStatus:'not-modeled',
    librarySize:resolved.librarySize,
    requiredPieces:pieceCount,
    libraryPieces:resolved.libraryGroups.length,
    commandZonePieces:resolved.commandZone.length,
    missingPieces:resolved.missing.length,
    windows,
    unsupportedReasons:resolved.missing.length?['missing-piece-data',...boundaries]:boundaries,
    assumptions:['opening-seven-plus-one-draw-per-turn','raw-draw-only','mulligans-not-modeled','tutors-not-modeled','mana-execution-not-modeled','protection-not-modeled'],
  }
}

export function buildComboAccessibility(result={},cards=[]){
  const combos=result.combos||[]
  const lines=combos.map((combo,index)=>{
    const structural=structuralLine(result,combo),timing=temporalEvidence(result,cards,combo)
    return {index,name:combo.name||(combo.cards||[]).join(' + '),cards:[...(combo.cards||[])],...structural,timing}
  })
  const highest=[...lines].sort((a,b)=>b.score-a.score||a.index-b.index)[0]||null,supportedTiming=lines.filter(x=>x.timing.status==='piece-presence-supported').length
  return {
    modelVersion:COMBO_ACCESS_MODEL_VERSION,
    lines,
    highest,
    timing:{status:lines.length?(supportedTiming?'piece-presence-modeled':'unsupported'):'not-applicable',targetWindows:TARGET_TURNS.map(turn=>`T${turn}`),supportedLines:supportedTiming,totalLines:lines.length,metric:'piece-presence-not-execution'},
    confidence:{productCalibration:'experimental',structuralScore:'v1-unchanged',piecePresence:'combinatorial-raw-draw',executionProbability:'not-modeled'},
    notes:['V2 keeps the historical structural accessibility score unchanged and adds a separate temporal piece-presence layer.','T5/T7/T9 piecePresence is the probability that every required library piece name has appeared in the raw opening-seven-plus-draws sample; command-zone pieces are counted separately.','These values do not include mulligan selection, tutors, execution mana, special zones, activation costs, loop prerequisites or protection windows.','No line receives an exact execution or win probability unless those prerequisites become explicitly modeled in a later version.'],
  }
}

export const _comboAccessMath={atLeastOneEachProbability}
