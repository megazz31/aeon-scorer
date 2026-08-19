const MOTIFS=[
  {id:'early-commander',name:'Accélération du commandant',special:'commander'},
  {id:'blink-etb',name:'Blink / ETB',producers:['blink'],payoffs:['etb'],minP:2,minY:2},
  {id:'constellation',name:'Enchantements / Constellation',producers:['enchantment'],payoffs:['constellation'],minP:4,minY:1},
  {id:'tokens',name:'Tokens / conversion',producers:['tokens'],payoffs:['token-payoff'],minP:3,minY:2},
  {id:'sacrifice',name:'Sacrifice / mort',producers:['sac-outlet'],payoffs:['death-payoff'],minP:2,minY:2},
  {id:'graveyard',name:'Cimetière / récursion',producers:['graveyard-setup'],payoffs:['recursion'],minP:2,minY:2},
  {id:'lands',name:'Lands / Landfall',producers:['land-ramp'],payoffs:['landfall'],minP:2,minY:1},
  {id:'counters',name:'Marqueurs',producers:['counter-producer'],payoffs:['counter-payoff'],minP:3,minY:2},
  {id:'spells',name:'Spellslinger',producers:['instant','sorcery'],payoffs:['spellslinger'],minP:10,minY:2},
  {id:'exile',name:'Jeu depuis l’exil',producers:['exile-cast'],payoffs:['exile-payoff'],minP:2,minY:1},
  {id:'artifacts',name:'Artefacts',producers:['artifact'],payoffs:['artifact-payoff'],minP:5,minY:2},
]

const hasTag=(c,t)=>c.tags?.includes(t)
const uniqByName=xs=>{
  const seen=new Set(),out=[]
  for(const x of xs){const k=x.name.toLowerCase();if(!seen.has(k)){seen.add(k);out.push(x)}}
  return out
}
const mini=c=>({name:c.name,cmc:Number(c.cmc||0),tags:c.tags||[],manaReq:c.manaReq||null})
const previewNames=xs=>uniqByName(xs).slice(0,10).map(x=>x.name)
const allNames=xs=>uniqByName(xs).map(x=>x.name)
function roleCards(nonlands,tags){return uniqByName(nonlands.filter(c=>tags.some(t=>hasTag(c,t))))}
function overlapCount(a,b){const s=new Set(a.map(x=>x.name.toLowerCase()));return b.filter(x=>s.has(x.name.toLowerCase())).length}

export function detectPackages(cards,commander=null){
  const out=[],nonlands=cards.filter(c=>!c.isLand)
  for(const m of MOTIFS){
    if(m.special==='commander'){
      if(!commander)continue
      const burst=roleCards(nonlands,['fast-mana'])
      const persistent=uniqByName(nonlands.filter(c=>!hasTag(c,'fast-mana')&&(c.cmc||0)<=3&&(hasTag(c,'land-ramp')||(c.sourceColors?.length||0)>0)))
      const cmdCmc=Number(commander.cmc||0)
      const meaningful=burst.length>=2||(cmdCmc>=4&&(burst.length+persistent.length)>=4)
      if(!meaningful)continue
      const cohesion=Math.min(100,Math.round(22+burst.length*13+persistent.length*3+Math.max(0,cmdCmc-3)*4))
      const members=uniqByName([...burst,...persistent])
      out.push({id:m.id,name:m.name,strength:cohesion,cohesion,producers:previewNames(members),payoffs:[commander.name],members:allNames([...members,commander]),producerCards:members.map(mini),payoffCards:[mini(commander)],evidence:`${burst.length} accélérateur(s) burst + ${persistent.length} source(s) persistante(s) vers un commandant MV ${cmdCmc}.`})
      continue
    }

    const producers=roleCards(nonlands,m.producers),payoffs=roleCards(nonlands,m.payoffs)
    if(producers.length<(m.minP||2)||payoffs.length<(m.minY||1))continue
    const members=uniqByName([...producers,...payoffs]),overlap=overlapCount(producers,payoffs),roleDistinct=Math.max(0,members.length-overlap)
    if(members.length<3||roleDistinct<2)continue
    const density=members.length/Math.max(1,nonlands.length),balance=Math.min(producers.length,payoffs.length)/Math.max(producers.length,payoffs.length)
    const cohesion=Math.min(100,Math.round(24+members.length*3.3+density*52+balance*18))
    out.push({id:m.id,name:m.name,strength:cohesion,cohesion,producers:previewNames(producers),payoffs:previewNames(payoffs),members:allNames(members),producerCards:producers.map(mini),payoffCards:payoffs.map(mini),producerTags:m.producers,payoffTags:m.payoffs,evidence:`${producers.length} producteur(s), ${payoffs.length} payoff(s), ${members.length} carte(s) distincte(s).`})
  }
  return out.sort((a,b)=>b.cohesion-a.cohesion)
}

const SYNERGY_TAGS=new Set(['blink','etb','tokens','token-payoff','sac-outlet','death-payoff','recursion','graveyard-setup','constellation','enchantment','counter-producer','counter-payoff','artifact-payoff','artifact','exile-cast','exile-payoff','landfall','land-ramp','spellslinger','instant','sorcery','lifegain','life-payoff'])
export function commanderSynergy(cards,commander){
  if(!commander)return {score:0,connected:[],tags:[]}
  const semantic=new Set((commander.tags||[]).filter(t=>SYNERGY_TAGS.has(t)))
  const pair=(a,b)=>{if(semantic.has(a))semantic.add(b)}
  pair('blink','etb');pair('etb','blink');pair('tokens','token-payoff');pair('token-payoff','tokens');pair('sac-outlet','death-payoff');pair('death-payoff','sac-outlet');pair('recursion','graveyard-setup');pair('graveyard-setup','recursion');pair('constellation','enchantment');pair('counter-producer','counter-payoff');pair('counter-payoff','counter-producer');pair('artifact-payoff','artifact');pair('exile-cast','exile-payoff');pair('exile-payoff','exile-cast');pair('landfall','land-ramp');pair('spellslinger','instant');pair('spellslinger','sorcery');pair('lifegain','life-payoff');pair('life-payoff','lifegain')
  const nonlands=cards.filter(c=>!c.isLand),connected=semantic.size?uniqByName(nonlands.filter(c=>c.tags.some(t=>semantic.has(t)))):[]
  const score=Math.min(100,Math.round(connected.length/Math.max(1,nonlands.length)*170))
  return {score,connected:connected.map(c=>c.name),tags:[...semantic]}
}
