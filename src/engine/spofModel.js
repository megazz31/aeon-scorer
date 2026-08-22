const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const level=n=>n>=70?'very-high':n>=50?'high':n>=30?'moderate':n>=12?'low':'minimal'
const uniq=xs=>[...new Set(xs.filter(Boolean))]
const text=c=>`${c?.type||''} ${c?.oracle||''}`.toLowerCase()

function semanticDependency(cards,packages,kind){
  const nonlands=cards.filter(c=>!c?.isLand),total=Math.max(1,nonlands.length)
  let hits=[]
  if(kind==='graveyard')hits=nonlands.filter(c=>/graveyard/.test(text(c))&&(c.tags?.some(t=>['recursion','graveyard-setup','death-payoff'].includes(t))||/from your graveyard|in your graveyard|cards? in your graveyard/.test(text(c))))
  if(kind==='artifact')hits=nonlands.filter(c=>/artifact/.test(text(c))&&(c.tags?.includes('artifact-payoff')||/artifacts? you control|artifact spells? you cast/.test(text(c))))
  if(kind==='enchantment')hits=nonlands.filter(c=>/enchantment/.test(text(c))&&(c.tags?.includes('constellation')||/enchantments? you control|enchantment spells? you cast/.test(text(c))))
  if(kind==='creature-board')hits=nonlands.filter(c=>/creature/.test(c?.type||'')&&(c.tags?.some(t=>['token-payoff','death-payoff','counter-payoff','modified-payoff'].includes(t))||/creatures? you control/.test(text(c))))
  const relevantPackages=(packages||[]).filter(p=>{
    const id=String(p.id||'').toLowerCase()
    if(kind==='graveyard')return /grave|recursion|sacrifice/.test(id)
    if(kind==='artifact')return /artifact|treasure/.test(id)
    if(kind==='enchantment')return /enchant|constellation/.test(id)
    if(kind==='creature-board')return /token|counter|sacrifice|tribal|creature/.test(id)
    return false
  })
  const density=hits.length/total,packageStrength=relevantPackages.length?Math.max(...relevantPackages.map(p=>Number(p.strength??p.cohesion??0))):0
  const score=Math.round(clamp(density*105+packageStrength*.35))
  return {score,level:level(score),method:'semantic-proxy',evidence:{cards:uniq(hits.map(c=>c.name)).slice(0,12),packages:relevantPackages.map(p=>p.id).slice(0,6),density:Number(density.toFixed(3))}}
}

export function buildSpofProfile(result={},cards=[]){
  const commanderDelta=Math.max(0,Number(result.profile?.commanderDelta||0))
  const commanderScore=Math.round(clamp(commanderDelta*5))
  const dependencies={
    commander:{score:commanderScore,level:level(commanderScore),method:'counterfactual-no-commander',delta:{medianEquivalent:commanderDelta},evidence:{commanderNames:result.commanderNames||[],commanderSynergy:Number(result.commanderSynergy?.score||0)}},
    graveyard:semanticDependency(cards,result.packages,'graveyard'),
    artifact:semanticDependency(cards,result.packages,'artifact'),
    enchantment:semanticDependency(cards,result.packages,'enchantment'),
    creatureBoard:semanticDependency(cards,result.packages,'creature-board'),
  }
  const entries=Object.entries(dependencies).sort((a,b)=>b[1].score-a[1].score)
  return {modelVersion:'spof-v1',dependencies,highest:entries.length?{kind:entries[0][0],...entries[0][1]}:null,confidence:{commander:'causal-existing-model',otherDependencies:'semantic-proxy',productCalibration:'experimental'},notes:['Commander dependency uses Aeon’s existing no-command counterfactual delta.','Other dependency classes are semantic structural proxies until explicit suppression simulations are validated.','No claim is made that a semantic proxy equals real-game loss under hate.']}
}
