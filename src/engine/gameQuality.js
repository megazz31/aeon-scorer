const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const level=n=>n>=70?'high':n>=40?'moderate':'low'
const uniq=xs=>[...new Set(xs.filter(Boolean))]

export function buildComboAccessibility(result={},cards=[]){
  const combos=result.combos||[],names=new Set((result.commanderNames||[]).map(x=>String(x).toLowerCase())),tutors=Number(result.roles?.tutors||0)+Number(result.roles?.repeatableTutors||0),draw=Number(result.roles?.draw||0),fastMana=Number(result.roles?.fastMana||0),burstT5=result.horizon?.curves?.burst?.points?.find(x=>x.turn===5)?.value||0
  const lines=combos.map(combo=>{
    const pieces=combo.cards||[],commanderPieces=pieces.filter(n=>names.has(String(n).toLowerCase())).length,piecePenalty=Math.max(0,pieces.length-2)*16,base=34+tutors*3+draw*.8+fastMana*2+burstT5*.12+commanderPieces*8-piecePenalty,score=Math.round(clamp(base))
    return {name:combo.name||pieces.join(' + '),cards:pieces,score,level:level(score),commanderPieces,signals:{tutors,draw,fastMana,burstT5},method:'structural-access-proxy'}
  })
  return {modelVersion:'combo-access-v1',lines,highest:[...lines].sort((a,b)=>b.score-a.score)[0]||null,confidence:{productCalibration:'experimental',prerequisites:combos.length?'partial':'not-applicable'},notes:['Combo presence and accessibility remain separate.','V1 is a structural access proxy; it does not expose exact before-T5/T7/T9 probabilities.','Exact timing requires piece-specific tutor eligibility, zones and prerequisite simulation.']}
}

function dep(result,key){return result.spof?.dependencies?.[key]?.score||0}
export function buildVulnerabilityMatrix(result={}){
  const commander=dep(result,'commander'),graveyard=dep(result,'graveyard'),artifact=dep(result,'artifact'),enchantment=dep(result,'enchantment'),board=dep(result,'creatureBoard'),protection=Number(result.roles?.protection||0),recursion=Number(result.roles?.recursion||0)
  const mk=(score,method,evidence=[])=>({score:Math.round(clamp(score)),level:level(score),method,evidence})
  const classes={
    commanderRemoval:mk(commander,'counterfactual-plus-structure',['SPOF commander dependency']),
    graveyardHate:mk(graveyard,'semantic-proxy',['graveyard dependency']),
    artifactSuppression:mk(artifact,'semantic-proxy',['artifact dependency']),
    enchantmentSuppression:mk(enchantment,'semantic-proxy',['enchantment dependency']),
    boardWipes:mk(board-protection*2-recursion,'semantic-proxy',['creature-board dependency','protection/recursion mitigation']),
    creatureRemoval:mk(commander*.45+board*.45-protection*2,'semantic-proxy',['commander + creature-board dependency']),
    ruleOfLaw:mk((result.experience?.dimensions?.turnComplexity?.score||0)*.75+(result.dimensions?.explosiveness||0)*.25,'behavioral-proxy',['turn complexity','explosiveness']),
    counterspells:mk((result.dimensions?.speed||0)*.22+(result.profile?.commanderDelta||0)*3+(result.combos?.length||0)*10-protection*2,'behavioral-proxy',['commander dependency','combo/spell concentration']),
  }
  return {modelVersion:'vulnerability-v1',classes,highest:Object.entries(classes).sort((a,b)=>b[1].score-a[1].score).slice(0,3).map(([kind,v])=>({kind,...v})),confidence:{productCalibration:'experimental'},notes:['Only commander removal currently includes an existing Aeon counterfactual component.','Other classes are explicit proxies until suppression simulations exist.']}
}

export function buildGameQualityForecast(results=[],podMatch=null,threatTimeline=null){
  const decks=results.filter(Boolean),match=podMatch,threat=threatTimeline
  let risk=Number(match?.mismatch||0),reasons=[]
  const severePair=match?.pairs?.filter(p=>p.mismatch>=70)||[]
  if(severePair.length)reasons.push({signal:'pair-mismatch',severity:'high',count:severePair.length})
  let maxWindow=null
  for(const d of threat?.decks||[])for(const t of d.turns||[])if(!maxWindow||t.gap>maxWindow.gap)maxWindow={deckIndex:d.index,...t}
  if(maxWindow?.gap>=35){risk+=maxWindow.gap*.45;reasons.push({signal:'exposed-threat-window',severity:maxWindow.gap>=60?'high':'moderate',deckIndex:maxWindow.deckIndex,turn:maxWindow.turn,gap:maxWindow.gap})}
  decks.forEach((r,index)=>{
    if((r.spof?.dependencies?.commander?.score||0)>=70){risk+=6;reasons.push({signal:'commander-single-point-of-failure',severity:'moderate',deckIndex:index})}
    const frictionMax=Math.max(0,...Object.values(r.friction?.signals||{}).map(x=>x.score||0));if(frictionMax>=75)reasons.push({signal:'high-friction-characteristic',severity:'moderate',deckIndex:index})
  })
  risk=Math.round(clamp(risk))
  return {modelVersion:'game-quality-v1',risk:{score:risk,level:level(risk)},compatibility:risk<40?'good':risk<70?'mixed':'poor',reasons,confidence:{productCalibration:'experimental'},notes:['V1 is a categorical risk model, not a win-rate or good-game probability.','Politics, pilot skill and unmodeled card text remain outside this forecast.']}
}
