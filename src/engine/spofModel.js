import { simulateSequences } from './sequenceSimulator.js'
import { simulateSequencesMulti } from './sequenceSimulatorMulti.js'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const level=n=>n>=70?'very-high':n>=50?'high':n>=30?'moderate':n>=12?'low':'minimal'
const uniq=xs=>[...new Set(xs.filter(Boolean))]
const text=c=>`${c?.type||''} ${c?.oracle||''}`.toLowerCase()
const counterfactualCache=new WeakMap(),suppressionCache=new WeakMap()
const DEPENDENCY_KINDS=['graveyard','artifact','enchantment','creature-board']

function dependencyCards(cards,kind){
  const nonlands=cards.filter(c=>!c?.isLand)
  if(kind==='graveyard')return nonlands.filter(c=>/graveyard/.test(text(c))&&(c.tags?.some(t=>['recursion','graveyard-setup','death-payoff'].includes(t))||/from your graveyard|in your graveyard|cards? in your graveyard/.test(text(c))))
  if(kind==='artifact')return nonlands.filter(c=>/artifact/.test(text(c))&&(c.tags?.includes('artifact-payoff')||/artifacts? you control|artifact spells? you cast/.test(text(c))))
  if(kind==='enchantment')return nonlands.filter(c=>/enchantment/.test(text(c))&&(c.tags?.includes('constellation')||/enchantments? you control|enchantment spells? you cast/.test(text(c))))
  if(kind==='creature-board')return nonlands.filter(c=>/creature/.test(c?.type||'')&&(c.tags?.some(t=>['token-payoff','death-payoff','counter-payoff','modified-payoff'].includes(t))||/creatures? you control/.test(text(c))))
  return []
}
function relevantPackages(packages,kind){return (packages||[]).filter(p=>{const id=String(p.id||'').toLowerCase();if(kind==='graveyard')return /grave|recursion|sacrifice/.test(id);if(kind==='artifact')return /artifact|treasure/.test(id);if(kind==='enchantment')return /enchant|constellation/.test(id);if(kind==='creature-board')return /token|counter|sacrifice|tribal|creature/.test(id);return false})}
function semanticDependency(cards,packages,kind){
  const nonlands=cards.filter(c=>!c?.isLand),total=Math.max(1,nonlands.length),hits=dependencyCards(cards,kind),packagesForKind=relevantPackages(packages,kind),density=hits.length/total,packageStrength=packagesForKind.length?Math.max(...packagesForKind.map(p=>Number(p.strength??p.cohesion??0))):0,score=Math.round(clamp(density*105+packageStrength*.35))
  return {score,level:level(score),method:'semantic-proxy',evidence:{cards:uniq(hits.map(c=>c.name)).slice(0,12),packages:packagesForKind.map(p=>p.id).slice(0,6),density:Number(density.toFixed(3))}}
}

function hashSeed(cards,commanders,salt='spof-tax-v1'){const key=[...commanders.map(c=>c.name),...cards.map(c=>c.name)].sort().join('|')+`|${salt}`;let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function withTax(c,tax){const req=c?.manaReq||{generic:Math.max(0,Number(c?.cmc||0)),colored:[],total:Number(c?.cmc||0)},baseTotal=Number(req.total??c?.cmc??0);return {...c,cmc:Number(c?.cmc||baseTotal)+tax,manaReq:{...req,generic:Number(req.generic||0)+tax,total:baseTotal+tax}}}
const snapshot=sim=>({median:Number(sim?.median||0),commanderMedianTurn:sim?.commanderMedianTurn??null,commanderAccessByTurn:(sim?.turnProfile||[]).map(x=>({turn:x.turn,value:Number(x.commander||0)}))})
const dependencySnapshot=sim=>({median:Number(sim?.median||0),peak:Number(sim?.peak||0),engineMedianTurn:sim?.engineMedianTurn??null,engineAccessByTurn:(sim?.turnProfile||[]).map(x=>({turn:Number(x.turn),value:Number(x.engine||0)})),resourceAccessByTurn:(sim?.turnProfile||[]).map(x=>({turn:Number(x.turn),value:Number(x.resource||0)}))})
const atTurn=(rows,turn)=>Number(rows?.find(x=>Number(x.turn)===turn)?.value||0)
const signedDelta=(a,b)=>Math.round((Number(a||0)-Number(b||0))*10)/10
const entryName=x=>String(x?.name??x??'').toLowerCase()
function blankDependencyCard(c){return {...c,type:'Sorcery',oracle:'',tags:[],interaction:0,development:0,resilience:0,explosiveness:0,recurring:0,efficiency:0,sourceColors:[],isLand:false,isCreature:false}}
function suppressPackages(packages,names){return (packages||[]).map(p=>({...p,producerCards:(p.producerCards||[]).filter(x=>!names.has(entryName(x))),payoffCards:(p.payoffCards||[]).filter(x=>!names.has(entryName(x))),members:(p.members||[]).filter(x=>!names.has(entryName(x)))}))}
function suppressCombos(combos,names){return (combos||[]).filter(combo=>!(combo.cards||[]).some(name=>names.has(String(name).toLowerCase())))}
function runSequenceScenario(deck,commanders,packages,combos,iterations,maxTurn,seed){const rng=seeded(seed),multi=commanders.length>1;return multi?simulateSequencesMulti(deck,commanders,packages,combos,iterations,maxTurn,rng):simulateSequences(deck,commanders[0]||null,packages,combos,iterations,maxTurn,rng)}

export function buildDependencySuppressionCounterfactual(result={},cards=[]){
  if(result&&typeof result==='object'&&suppressionCache.has(result))return suppressionCache.get(result)
  const names=(result.commanderNames||[]).filter(Boolean),commanders=names.map(name=>cards.find(c=>String(c?.name||'').toLowerCase()===String(name).toLowerCase())).filter(Boolean)
  if(!cards.length||names.length!==commanders.length){if(result&&typeof result==='object')suppressionCache.set(result,null);return null}
  const commanderNames=new Set(names.map(x=>String(x).toLowerCase())),deck=cards.filter(c=>!commanderNames.has(String(c?.name||'').toLowerCase())||c.__keepIn99),matched={}
  for(const kind of DEPENDENCY_KINDS)matched[kind]=dependencyCards(deck,kind)
  if(!DEPENDENCY_KINDS.some(kind=>matched[kind].length)){const empty={modelVersion:'dependency-suppression-counterfactual-v1',iterations:0,maxTurn:Number(result.methodology?.maxTurn||7),baseline:null,scenarios:Object.fromEntries(DEPENDENCY_KINDS.map(kind=>[kind,{status:'not-applicable',suppressedCards:0,suppressedFraction:0,counterfactual:null,delta:null}])),confidence:{comparison:'not-run-no-dependency-contributors',intervention:'dependency-contributor-dead-draw',productCalibration:'experimental'}};if(result&&typeof result==='object')suppressionCache.set(result,empty);return empty}
  const iterations=Math.max(240,Math.min(480,Math.round(Number(result.methodology?.iterations||3000)/6))),maxTurn=Math.max(5,Number(result.methodology?.maxTurn||7)),seed=hashSeed(deck,commanders,'spof-dependency-suppression-v1'),baselineSim=runSequenceScenario(deck,commanders,result.packages||[],result.combos||[],iterations,maxTurn,seed),baseline=dependencySnapshot(baselineSim),scenarios={}
  for(const kind of DEPENDENCY_KINDS){
    const hits=matched[kind],suppressedNames=new Set(hits.map(c=>String(c.name||'').toLowerCase()))
    if(!suppressedNames.size){scenarios[kind]={status:'not-applicable',suppressedCards:0,suppressedFraction:0,counterfactual:null,delta:null};continue}
    const suppressedDeck=deck.map(c=>suppressedNames.has(String(c.name||'').toLowerCase())?blankDependencyCard(c):c),suppressedPackages=suppressPackages(result.packages||[],suppressedNames),suppressedCombos=suppressCombos(result.combos||[],suppressedNames),sim=runSequenceScenario(suppressedDeck,commanders,suppressedPackages,suppressedCombos,iterations,maxTurn,seed),counterfactual=dependencySnapshot(sim)
    scenarios[kind]={status:'paired',suppressedCards:suppressedNames.size,suppressedFraction:Number((suppressedNames.size/Math.max(1,deck.length)).toFixed(3)),counterfactual,delta:{median:signedDelta(baseline.median,counterfactual.median),peak:signedDelta(baseline.peak,counterfactual.peak),engineT4:signedDelta(atTurn(baseline.engineAccessByTurn,4),atTurn(counterfactual.engineAccessByTurn,4)),engineT5:signedDelta(atTurn(baseline.engineAccessByTurn,5),atTurn(counterfactual.engineAccessByTurn,5)),resourceT5:signedDelta(atTurn(baseline.resourceAccessByTurn,5),atTurn(counterfactual.resourceAccessByTurn,5))}}
  }
  const out={modelVersion:'dependency-suppression-counterfactual-v1',iterations,maxTurn,baseline,scenarios,confidence:{comparison:'paired-fixed-seed',intervention:'dependency-contributor-dead-draw',deckCardinality:'preserved',productCalibration:'experimental'},notes:['Matched dependency contributors are replaced by inert dead draws so library cardinality is preserved.','Suppressed names are removed from package producer/payoff evidence and combos requiring a suppressed card are disabled.','This stress test is not a literal rules simulation of every hate card or board-state intervention.','Signed deltas are preserved; a negative delta means the suppression scenario paradoxically improved that modeled metric.']}
  if(result&&typeof result==='object')suppressionCache.set(result,out);return out
}

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
  const taxProfile=buildCommanderTaxCounterfactual(result,cards),suppression=buildDependencySuppressionCounterfactual(result,cards),existingDelta=Math.max(0,Number(result.profile?.commanderDelta||0)),pairedUnavailable=Number(taxProfile?.delta?.unavailableMedian),commanderDelta=Number.isFinite(pairedUnavailable)?Math.max(existingDelta,pairedUnavailable):existingDelta,commanderScore=Math.round(clamp(commanderDelta*5))
  const semantic={graveyard:semanticDependency(cards,result.packages,'graveyard'),artifact:semanticDependency(cards,result.packages,'artifact'),enchantment:semanticDependency(cards,result.packages,'enchantment'),creatureBoard:semanticDependency(cards,result.packages,'creature-board')}
  const withSuppression=(kind,value)=>{const scenario=suppression?.scenarios?.[kind]||null;return {...value,method:scenario?.status==='paired'?'semantic-proxy+paired-suppression-evidence':value.method,counterfactual:scenario?.status==='paired'?scenario:null}}
  const dependencies={
    commander:{score:commanderScore,level:level(commanderScore),method:taxProfile?'paired-commander-counterfactual':'counterfactual-no-commander',delta:{medianEquivalent:commanderDelta,tax2Median:taxProfile?.delta?.tax2Median??null,tax4Median:taxProfile?.delta?.tax4Median??null,unavailableMedian:taxProfile?.delta?.unavailableMedian??existingDelta},counterfactual:taxProfile,evidence:{commanderNames:result.commanderNames||[],commanderSynergy:Number(result.commanderSynergy?.score||0)}},
    graveyard:withSuppression('graveyard',semantic.graveyard),artifact:withSuppression('artifact',semantic.artifact),enchantment:withSuppression('enchantment',semantic.enchantment),creatureBoard:withSuppression('creature-board',semantic.creatureBoard),
  }
  const entries=Object.entries(dependencies).sort((a,b)=>b[1].score-a[1].score),hasSuppression=Object.values(suppression?.scenarios||{}).some(x=>x?.status==='paired')
  return {modelVersion:'spof-v2',dependencies,highest:entries.length?{kind:entries[0][0],...entries[0][1]}:null,dependencySuppression:suppression,confidence:{commander:taxProfile?'paired-fixed-seed-counterfactual':'causal-existing-model',otherDependencies:hasSuppression?'semantic-proxy-plus-paired-suppression-evidence':'semantic-proxy',scorePromotion:'semantic-score-unchanged-v1',productCalibration:'experimental'},notes:['Commander dependency measures normal, +2 tax, +4 tax and unavailable counterfactuals when command-zone card data is available.','Non-commander dependency scores remain the existing semantic structural proxies; V2 adds paired dependency-contributor suppression evidence without promoting those deltas into the score.','Dependency suppression preserves library cardinality with inert dead draws and disables affected package/combo evidence.','The suppression intervention is not a literal rules simulation of every graveyard hate, artifact suppression, enchantment suppression or board wipe effect.']}
}
