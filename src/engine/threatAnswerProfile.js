const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const lower=c=>`${c?.type||''} ${c?.oracle||''}`.toLowerCase()
const has=(c,t)=>Array.isArray(c?.tags)&&c.tags.includes(t)
const turnsOf=result=>result?.horizon?.curves?.interaction?.points||[]
const point=(result,key,turn)=>result?.horizon?.curves?.[key]?.points?.find(x=>x.turn===turn)?.value||0
const level=n=>n>=70?'high':n>=40?'moderate':'low'

function classFlags(card){
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

export function buildAnswerProfile(result={},cards=[]){
  const rows=cards.map(c=>({card:c,flags:classFlags(c)})),interactionRows=rows.filter(x=>x.flags.interaction),den=Math.max(1,interactionRows.length),classes={}
  for(const key of ['stack','creature','artifact','enchantment','graveyard','wipe']){
    const hits=rows.filter(x=>x.flags[key]),density=hits.length/den,availabilityScale=clamp(density*170,0,100)/100
    classes[key]={count:hits.length,density:Number(density.toFixed(3)),availabilityScale:Number(availabilityScale.toFixed(3)),turns:turnsOf(result).map(p=>({turn:p.turn,value:Math.round(clamp(Number(p.value||0)*availabilityScale))})),level:level(availabilityScale*100)}
  }
  return {modelVersion:'answer-profile-v1',interactionCards:interactionRows.length,classes,confidence:{classification:'semantic-proxy',timing:'scaled-from-general-interaction-access',productCalibration:'experimental'},notes:['Class timing scales Aeon general interaction access by semantic class coverage; it is not yet a card-by-card casting simulation.','A card may cover multiple answer classes.']}
}

function packageStrength(result,idPattern){return Math.max(0,...(result.packages||[]).filter(p=>idPattern.test(String(p.id||''))).map(p=>Number(p.strength??p.cohesion??0)))}
export function buildThreatProfile(result={},cards=[]){
  const combo=Number(result.comboAccessibility?.highest?.score||0),graveyard=Number(result.spof?.dependencies?.graveyard?.score||0),artifact=Math.max(Number(result.spof?.dependencies?.artifact?.score||0),packageStrength(result,/artifact|treasure/i)),enchantment=Math.max(Number(result.spof?.dependencies?.enchantment?.score||0),packageStrength(result,/enchant|constellation/i)),board=Math.max(Number(result.spof?.dependencies?.creatureBoard?.score||0),packageStrength(result,/token|counter|sacrifice|tribal|creature/i)),extraTurns=Number(result.friction?.signals?.extraTurns?.score||0)
  const defs=[
    {id:'combo',strength:combo,curve:'burst',answers:['stack','creature','artifact','enchantment','graveyard']},
    {id:'graveyard-engine',strength:graveyard,curve:'engine',answers:['graveyard']},
    {id:'artifact-engine',strength:artifact,curve:'engine',answers:['artifact']},
    {id:'enchantment-engine',strength:enchantment,curve:'engine',answers:['enchantment']},
    {id:'creature-board',strength:board,curve:'engine',answers:['wipe','creature']},
    {id:'extra-turn-loop',strength:extraTurns,curve:'burst',answers:['stack']},
  ].filter(x=>x.strength>=12)
  const threats=defs.map(d=>({...d,level:level(d.strength),turns:(result.horizon?.curves?.[d.curve]?.points||[]).map(p=>({turn:p.turn,value:Math.round(clamp(Number(p.value||0)*(d.strength/100)))}))}))
  return {modelVersion:'threat-profile-v1',threats,confidence:{classification:'structural-proxy',timing:'horizon-weighted',productCalibration:'experimental'},notes:['Threat classes represent disruption needs, not deterministic win conditions.','Combo V1 exposes multiple possible answer classes because exact combo-piece zones/types are not fully simulated yet.']}
}
