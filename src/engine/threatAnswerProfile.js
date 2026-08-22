const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const lower=c=>`${c?.type||''} ${c?.oracle||''}`.toLowerCase()
const has=(c,t)=>Array.isArray(c?.tags)&&c.tags.includes(t)
const turnsOf=result=>result?.horizon?.curves?.interaction?.points||[]
const point=(result,key,turn)=>result?.horizon?.curves?.[key]?.points?.find(x=>x.turn===turn)?.value||0
const level=n=>n>=70?'high':n>=40?'moderate':'low'
const ANSWER_CLASSES=['stack','creature','artifact','enchantment','graveyard','wipe']

export function answerClassFlags(card){
  const s=lower(card),interaction=Number(card?.interaction||0)>0||has(card,'removal')||has(card,'counterspell')||has(card,'wipe')||has(card,'tempo-interaction')
  return {
    interaction,
    stack:has(card,'counterspell')||/counter target (?:spell|activated ability|triggered ability)/.test(s),
    creature:interaction&&(/target creature/.test(s)||/destroy (?:all|each) creatures?/.test(s)||/exile (?:all|each) creatures?/.test(s)),
    artifact:interaction&&(/target artifact/.test(s)||/artifacts? (?:are|your opponents control)|destroy all artifacts|exile all artifacts/.test(s)),
    enchantment:interaction&&(/target enchantment/.test(s)||/destroy all enchantments|exile all enchantments/.test(s)),
    graveyard:/exile [^.]*graveyard|cards? in graveyards? can(?:not|'t) leave|players? can(?:not|'t) cast [^.]*graveyard|if a card [^.]*graveyard [^.]* exile/.test(s),
    wipe:has(card,'wipe')||/(?:destroy|exile) all creatures|all creatures get -\d+\/-\d+/.test(s),
  }
}

const mv=c=>Math.max(0,Number(c?.manaReq?.total??c?.cmc??0)||0)
const earliestManaTurn=c=>Math.max(1,Math.ceil(mv(c)))
function populationSize(result,cards){const roleCount=Number(result?.roles?.lands||0)+Number(result?.roles?.nonlands||0);if(roleCount>0)return roleCount;const cmd=new Set((result?.commanderNames||[]).map(x=>String(x).toLowerCase())),library=cards.filter(c=>!cmd.has(String(c?.name||'').toLowerCase()));return Math.max(1,library.length||99)}
function atLeastOneSeen(population,hits,draws){const n=Math.max(0,Math.min(population,Math.floor(draws))),k=Math.max(0,Math.min(population,Math.floor(hits)));if(!k||!n)return 0;if(k>=population)return 100;let none=1;for(let i=0;i<n;i++){const remaining=population-i;if(remaining<=0){none=0;break}const miss=Math.max(0,population-k-i);none*=miss/remaining;if(none<=0)break}return clamp((1-none)*100)}
function firstAccessTiming(result,hits,population){let prior=0;return turnsOf(result).map(p=>{const turn=Number(p.turn),eligible=hits.filter(x=>earliestManaTurn(x.card)<=turn).length,draws=Math.min(population,7+turn),drawAccess=atLeastOneSeen(population,eligible,draws),generalAccess=clamp(Number(p.value||0)),value=Math.round(Math.max(prior,Math.min(generalAccess,drawAccess)));prior=value;return {turn,value}})}
function scaledFallback(result,availabilityScale){return turnsOf(result).map(p=>({turn:p.turn,value:Math.round(clamp(Number(p.value||0)*availabilityScale))}))}

export function buildAnswerProfile(result={},cards=[]){
  const rows=cards.map(c=>({card:c,flags:answerClassFlags(c)})),interactionRows=rows.filter(x=>x.flags.interaction),den=Math.max(1,interactionRows.length),classes={},firstAccess=result?.horizon?.curves?.interaction?.semantics==='cumulative-first-access',population=populationSize(result,cards)
  for(const key of ANSWER_CLASSES){
    const hits=rows.filter(x=>x.flags[key]),density=hits.length/den,availabilityScale=clamp(density*170,0,100)/100,meanManaValue=hits.length?hits.reduce((s,x)=>s+mv(x.card),0)/hits.length:0,earliest=hits.length?Math.min(...hits.map(x=>earliestManaTurn(x.card))):null,timingMethod=firstAccess?'class-card-draw-mv-envelope':'scaled-general-interaction-fallback'
    classes[key]={count:hits.length,density:Number(density.toFixed(3)),availabilityScale:Number(availabilityScale.toFixed(3)),meanManaValue:Number(meanManaValue.toFixed(2)),earliestManaTurn:earliest,timingMethod,turns:firstAccess?firstAccessTiming(result,hits,population):scaledFallback(result,availabilityScale),level:level(availabilityScale*100)}
  }
  return {modelVersion:'answer-profile-v2',interactionCards:interactionRows.length,classes,confidence:{classification:'semantic-proxy',timing:firstAccess?'card-specific-draw-mv-envelope':'scaled-general-interaction-fallback',productCalibration:'experimental'},notes:firstAccess?['Class timing is bounded by Aeon true first-interaction access and a class-specific draw/mana-value envelope built from the actual answer cards.','This is more specific than density scaling but is still not rules-complete card-by-card casting: alternate costs, tutors, card draw sequencing and colored-mana details remain approximations.','A card may cover multiple answer classes.']:['Historical analysis without cumulative first-access Horizon data: class timing falls back to the V1 general-interaction × class-density method.','A card may cover multiple answer classes.']}
}

function packageStrength(result,idPattern){return Math.max(0,...(result.packages||[]).filter(p=>idPattern.test(String(p.id||''))).map(p=>Number(p.strength??p.cohesion??0)))}
export function buildThreatProfile(result={},cards=[]){
  const combo=Number(result.comboAccessibility?.highest?.score||0),graveyard=Number(result.spof?.dependencies?.graveyard?.score||0),artifact=Math.max(Number(result.spof?.dependencies?.artifact?.score||0),packageStrength(result,/artifact|treasure/i)),enchantment=Math.max(Number(result.spof?.dependencies?.enchantment?.score||0),packageStrength(result,/enchant|constellation/i)),board=Math.max(Number(result.spof?.dependencies?.creatureBoard?.score||0),packageStrength(result,/token|counter|sacrifice|tribal|creature/i)),extraTurns=Number(result.friction?.signals?.extraTurns?.score||0),firstAccess=['engine','burst'].some(key=>result?.horizon?.curves?.[key]?.semantics==='cumulative-first-access')
  const defs=[
    {id:'combo',strength:combo,curve:'burst',answers:['stack','creature','artifact','enchantment','graveyard']},
    {id:'graveyard-engine',strength:graveyard,curve:'engine',answers:['graveyard']},
    {id:'artifact-engine',strength:artifact,curve:'engine',answers:['artifact']},
    {id:'enchantment-engine',strength:enchantment,curve:'engine',answers:['enchantment']},
    {id:'creature-board',strength:board,curve:'engine',answers:['wipe','creature']},
    {id:'extra-turn-loop',strength:extraTurns,curve:'burst',answers:['stack']},
  ].filter(x=>x.strength>=12)
  const threats=defs.map(d=>({...d,level:level(d.strength),turns:(result.horizon?.curves?.[d.curve]?.points||[]).map(p=>({turn:p.turn,value:Math.round(clamp(Number(p.value||0)*(d.strength/100)))}))}))
  return {modelVersion:'threat-profile-v2',threats,confidence:{classification:'structural-proxy',timing:firstAccess?'horizon-first-access-weighted':'horizon-weighted-fallback',productCalibration:'experimental'},notes:['Threat classes represent disruption needs, not deterministic win conditions.','Threat timing follows the active Horizon temporal semantics; Temporal V2 analyses therefore use cumulative first-access curves.','Combo V2 still exposes multiple possible answer classes because exact combo-piece zones/types are not fully simulated yet.']}
}
