import { simulateSequences } from './sequenceSimulator.js'
import { simulateSequencesMulti } from './sequenceSimulatorMulti.js'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const level=n=>n>=70?'very-high':n>=50?'high':n>=30?'moderate':n>=12?'low':'minimal'
const uniq=xs=>[...new Set(xs.filter(Boolean))]
const text=c=>`${c?.type||''} ${c?.oracle||''}`.toLowerCase()
const counterfactualCache=new WeakMap()

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

function hashSeed(cards,commanders){const key=[...commanders.map(c=>c.name),...cards.map(c=>c.name)].sort().join('|')+'|spof-tax-v1';let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function withTax(c,tax){const req=c?.manaReq||{generic:Math.max(0,Number(c?.cmc||0)),colored:[],total:Number(c?.cmc||0)},baseTotal=Number(req.total??c?.cmc??0);return {...c,cmc:Number(c?.cmc||baseTotal)+tax,manaReq:{...req,generic:Number(req.generic||0)+tax,total:baseTotal+tax}}}
const snapshot=sim=>({median:Number(sim?.median||0),commanderMedianTurn:sim?.commanderMedianTurn??null,commanderAccessByTurn:(sim?.turnProfile||[]).map(x=>({turn:x.turn,value:Number(x.commander||0)}))})

export function buildCommanderTaxCounterfactual(result={},cards=[]){
  if(result&&typeof result==='object'&&counterfactualCache.has(result))return counterfactualCache.get(result)
  const names=(result.commanderNames||[]).filter(Boolean),commanders=names.map(name=>cards.find(c=>String(c?.name||'').toLowerCase()===String(name).toLowerCase())).filter(Boolean)
  if(!names.length||commanders.length!==names.length){if(result&&typeof result==='object')counterfactualCache.set(result,null);return null}
  const nameSet=new Set(names.map(x=>x.toLowerCase())),deck=cards.filter(c=>!nameSet.has(String(c?.name||'').toLowerCase())||c.__keepIn99),iterations=Math.max(400,Math.min(800,Math.round(Number(result.methodology?.iterations||3000)/4))),maxTurn=Math.max(4,Number(result.methodology?.maxTurn||7)),seed=hashSeed(deck,commanders),multi=commanders.length>1
  const run=(tax,available=true)=>{const taxed=commanders.map(c=>withTax(c,tax)),rng=seeded(seed);if(!available)return simulateSequences(deck,null,(result.packages||[]).filter(p=>p.id!=='early-commander'),result.combos||[],iterations,maxTurn,rng);return multi?simulateSequencesMulti(deck,taxed,result.packages||[],result.combos||[],iterations,maxTurn,rng):simulateSequences(deck,taxed[0],result.packages||[],result.combos||[],iterations,maxTurn,rng)}
  const baseline=run(0),tax2=run(2),tax4=run(4),unavailable=run(0,false),out={modelVersion:'commander-tax-counterfactual-v1',iterations,maxTurn,scope:multi?'all-command-zone-cards-taxed-equally':'commander-tax',baseline:snapshot(baseline),tax2:snapshot(tax2),tax4:snapshot(tax4),unavailable:{median:Number(unavailable?.median||0)},delta:{tax2Median:Math.max(0,Number(baseline?.median||0)-Number(tax2?.median||0)),tax4Median:Math.max(0,Number(baseline?.median||0)-Number(tax4?.median||0)),unavailableMedian:Math.max(0,Number(baseline?.median||0)-Number(unavailable?.median||0))},confidence:{comparison:'paired-fixed-seed',productCalibration:'experimental'},notes:['Baseline, +2, +4 and unavailable simulations reuse the same deterministic sequence seed.','For two-command-zone-card decks, +2/+4 is applied equally to both cards as a command-zone dependency stress test.']}
  if(result&&typeof result==='object')counterfactualCache.set(result,out);return out
}

export function buildSpofProfile(result={},cards=[]){
  const taxProfile=buildCommanderTaxCounterfactual(result,cards),existingDelta=Math.max(0,Number(result.profile?.commanderDelta||0)),pairedUnavailable=Number(taxProfile?.delta?.unavailableMedian),commanderDelta=Number.isFinite(pairedUnavailable)?Math.max(existingDelta,pairedUnavailable):existingDelta
  const commanderScore=Math.round(clamp(commanderDelta*5))
  const dependencies={
    commander:{score:commanderScore,level:level(commanderScore),method:taxProfile?'paired-commander-counterfactual':'counterfactual-no-commander',delta:{medianEquivalent:commanderDelta,tax2Median:taxProfile?.delta?.tax2Median??null,tax4Median:taxProfile?.delta?.tax4Median??null,unavailableMedian:taxProfile?.delta?.unavailableMedian??existingDelta},counterfactual:taxProfile,evidence:{commanderNames:result.commanderNames||[],commanderSynergy:Number(result.commanderSynergy?.score||0)}},
    graveyard:semanticDependency(cards,result.packages,'graveyard'),
    artifact:semanticDependency(cards,result.packages,'artifact'),
    enchantment:semanticDependency(cards,result.packages,'enchantment'),
    creatureBoard:semanticDependency(cards,result.packages,'creature-board'),
  }
  const entries=Object.entries(dependencies).sort((a,b)=>b[1].score-a[1].score)
  return {modelVersion:'spof-v1',dependencies,highest:entries.length?{kind:entries[0][0],...entries[0][1]}:null,confidence:{commander:taxProfile?'paired-fixed-seed-counterfactual':'causal-existing-model',otherDependencies:'semantic-proxy',productCalibration:'experimental'},notes:['Commander dependency measures normal, +2 tax, +4 tax and unavailable counterfactuals when command-zone card data is available.','Other dependency classes remain semantic structural proxies until explicit suppression simulations are validated.','No claim is made that a semantic proxy equals real-game loss under hate.']}
}
