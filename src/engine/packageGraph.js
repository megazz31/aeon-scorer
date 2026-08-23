const MOTIFS=[
  {id:'early-commander',name:'Accélération du commandant',special:'commander'},
  {id:'blink-etb',name:'Blink / ETB',producers:['blink'],payoffs:['etb'],minP:2,minY:2},
  {id:'constellation',name:'Enchantements / Constellation',producers:['enchantment'],payoffs:['constellation'],minP:4,minY:1},
  {id:'tokens',name:'Tokens / conversion',producers:['tokens'],payoffs:['token-payoff'],minP:3,minY:2},
  {id:'sacrifice',name:'Sacrifice / mort',producers:['sac-outlet'],supports:['sac-enabler'],payoffs:['death-payoff'],minP:1,minEvidenceP:2,minY:2},
  {id:'graveyard',name:'Cimetière / récursion',producers:['graveyard-setup'],payoffs:['recursion'],minP:2,minY:2},
  {id:'lands',name:'Lands / Landfall',producers:['land-ramp'],payoffs:['landfall'],minP:2,minY:1},
  {id:'counters',name:'Marqueurs',producers:['counter-producer'],payoffs:['counter-payoff','modified-payoff'],minP:3,minY:2},
  {id:'spells',name:'Spellslinger',producers:['instant','sorcery'],payoffs:['spellslinger'],minP:10,minY:2},
  {id:'exile',name:'Jeu depuis l’exil',producers:['exile-cast'],payoffs:['exile-payoff'],minP:2,minY:1},
  {id:'artifacts',name:'Artefacts',producers:['artifact'],payoffs:['artifact-payoff'],minP:5,minY:2},
  {id:'lifegain',name:'Points de vie / Synergies',producers:['lifegain'],payoffs:['life-payoff'],minP:3,minY:2},
]

const hasTag=(c,t)=>c.tags?.includes(t)
const uniqByName=xs=>{const seen=new Set(),out=[];for(const x of xs){const k=x.name.toLowerCase();if(!seen.has(k)){seen.add(k);out.push(x)}}return out}
const mini=c=>({name:c.name,cmc:Number(c.cmc||0),tags:c.tags||[],manaReq:c.manaReq||null})
const previewNames=xs=>uniqByName(xs).slice(0,10).map(x=>x.name)
const allNames=xs=>uniqByName(xs).map(x=>x.name)
function roleCards(pool,tags){return uniqByName(pool.filter(c=>tags.some(t=>hasTag(c,t))))}
function overlapCount(a,b){const s=new Set(a.map(x=>x.name.toLowerCase()));return b.filter(x=>s.has(x.name.toLowerCase())).length}
const isManaPermanent=c=>!/\binstant\b|\bsorcery\b/i.test(c.type||'')&&(c.sourceColors?.length||0)>0
const isOneShotSpell=c=>/\binstant\b|\bsorcery\b/i.test(c.type||'')
function semanticText(c){return String(c?.oracle||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim().toLowerCase()}
function semanticClauses(c){return semanticText(c).split(/[.\n;]+/).map(x=>x.trim()).filter(Boolean)}

export function isImmediateLandRamp(c){
  if(!hasTag(c,'land-ramp'))return false
  const o=semanticText(c)
  if(/whenever [^.]* attacks|when [^.]* attacks|whenever [^.]* deals combat damage|when [^.]* deals combat damage|when [^.]* leaves the battlefield/.test(o))return false
  if(/if an opponent controls more lands than you|choose an opponent who controls more lands than you|player who controls more lands than you/.test(o))return false
  if(/whenever a land an opponent controls enters|whenever a land [^.]* opponent [^.]* enters/.test(o))return false
  return true
}

function counterKinds(c){return new Set((c?.tags||[]).filter(t=>t.startsWith('counter-kind:')).map(t=>t.slice(13)))}
const MODIFIED_COUNTER_KINDS=new Set(['plus1','minus1','stun','shield','finality'])
function counterProducerCanModify(c){const kinds=counterKinds(c);return [...kinds].some(k=>MODIFIED_COUNTER_KINDS.has(k))}
function opponentOnlyCounterProducer(c){
  if(counterKinds(c).has('wild'))return false
  const cs=semanticClauses(c).filter(s=>/put [^.]*counters? on/.test(s))
  if(!cs.length)return false
  const relevant=cs.filter(s=>/counter/.test(s));if(!relevant.length)return false
  return relevant.every(s=>/opponent/.test(s)&&!/you control|this (?:creature|artifact|enchantment|permanent)|target (?:creature|artifact|permanent)(?! an opponent)|each creature(?! your opponents)/.test(s))
}
function counterPayoffUsesOpponent(c){const o=semanticText(c);return /opponents? (?:has|have|with) [^.]*counters?|counters? on (?:an |each )?opponents?|poison counters? (?:an |each |your )?opponents?|for each [^.]*counter [^.]*opponent/.test(o)}
function counterCompatible(a,b){
  if(hasTag(b,'modified-payoff')&&counterProducerCanModify(a)&&!opponentOnlyCounterProducer(a))return true
  const ak=counterKinds(a),bk=counterKinds(b);if(!ak.size||!bk.size)return false
  if(opponentOnlyCounterProducer(a)&&!counterPayoffUsesOpponent(b))return false
  if(ak.has('wild')||bk.has('wild')||ak.has('any')||bk.has('any'))return true
  for(const k of ak)if(k!=='generic'&&bk.has(k))return true
  return ak.has('generic')&&bk.has('generic')
}
function compatibleCounterRoles(producers,payoffs){return {producers:producers.filter(p=>payoffs.some(y=>counterCompatible(p,y))),payoffs:payoffs.filter(y=>producers.some(p=>counterCompatible(p,y)))}}
function escaped(s){return String(s||'').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function selfEtbTrigger(c){
  const o=semanticText(c),front=String(c?.name||'').split(' // ')[0].trim(),name=escaped(front)
  if(!o)return false
  if(/\bwhen(?:ever)?\s+this\s+(?:creature|permanent|artifact|enchantment)\s+enters\b/.test(o))return true
  return !!name&&new RegExp(`\\bwhen(?:ever)?\\s+${name}\\s+enters\\b`).test(o)
}
function trueEtbPayoff(c){
  if(c.isLand||/\bland\b/i.test(c.type||''))return false
  return semanticClauses(c).some(s=>{
    if(!/\bwhen(?:ever)?\b[^.\n;]{0,180}\benters(?: the battlefield)?\b/.test(s))return false
    const opponentOnly=/(?:land|creature|artifact|permanent|enchantment) an opponent controls enters|(?:land|creature|artifact|permanent|enchantment)s? your opponents? control enters|under an opponent'?s control enters/.test(s)
    return !opponentOnly
  })
}

export function detectPackages(cards,commander=null){
  const out=[],nonlands=cards.filter(c=>!c.isLand),functionalPool=cards
  for(const m of MOTIFS){
    if(m.special==='commander'){
      if(!commander)continue
      const burst=roleCards(nonlands,['burst-mana'])
      const persistent=uniqByName(nonlands.filter(c=>!hasTag(c,'burst-mana')&&(c.cmc||0)<=3&&(isImmediateLandRamp(c)||isManaPermanent(c))))
      const cmdCmc=Number(commander.cmc||0),meaningful=burst.length>=2||(cmdCmc>=4&&(burst.length+persistent.length)>=4)
      if(!meaningful)continue
      const cohesion=Math.min(100,Math.round(22+burst.length*13+persistent.length*3+Math.max(0,cmdCmc-3)*4)),members=uniqByName([...burst,...persistent])
      out.push({id:m.id,name:m.name,strength:cohesion,cohesion,producers:previewNames(members),payoffs:[commander.name],members:allNames([...members,commander]),producerCards:members.map(mini),payoffCards:[mini(commander)],evidence:`${burst.length} accélérateur(s) burst + ${persistent.length} source(s) persistante(s) vers un commandant MV ${cmdCmc}.`})
      continue
    }
    let producers=roleCards(functionalPool,m.producers)
    const supports=m.supports?.length?roleCards(functionalPool,m.supports):[]
    const producerEvidence=uniqByName([...producers,...supports])
    let payoffs=m.id==='blink-etb'?uniqByName(functionalPool.filter(trueEtbPayoff)):m.id==='spells'?roleCards(functionalPool,m.payoffs).filter(c=>!isOneShotSpell(c)):roleCards(functionalPool,m.payoffs)
    if(m.id==='counters'){
      const compatible=compatibleCounterRoles(producers,payoffs)
      producers=compatible.producers
      payoffs=compatible.payoffs
    }
    const effectiveEvidence=m.id==='counters'?producers:producerEvidence
    if(producers.length<(m.minP||2)||effectiveEvidence.length<(m.minEvidenceP||m.minP||2)||payoffs.length<(m.minY||1))continue
    const members=uniqByName([...effectiveEvidence,...payoffs]),overlap=overlapCount(effectiveEvidence,payoffs),roleDistinct=Math.max(0,members.length-overlap)
    if(members.length<3||roleDistinct<2)continue
    const density=members.length/Math.max(1,nonlands.length),balance=Math.min(effectiveEvidence.length,payoffs.length)/Math.max(effectiveEvidence.length,payoffs.length),cohesion=Math.min(100,Math.round(24+members.length*3.3+density*52+balance*18))
    out.push({id:m.id,name:m.name,strength:cohesion,cohesion,producers:previewNames(effectiveEvidence),payoffs:previewNames(payoffs),members:allNames(members),producerCards:producers.map(mini),supportCards:supports.map(mini),payoffCards:payoffs.map(mini),producerTags:m.producers,supportTags:m.supports||[],payoffTags:m.payoffs,evidence:`${producers.length} producteur(s) opérationnel(s), ${supports.length} support(s), ${payoffs.length} payoff(s), ${members.length} carte(s) distincte(s).`})
  }
  return out.sort((a,b)=>b.cohesion-a.cohesion)
}

const COMMANDER_ENGINE_TAGS=new Set(['blink','tokens','token-payoff','sac-outlet','death-payoff','recursion','graveyard-setup','constellation','counter-producer','counter-payoff','modified-payoff','artifact-payoff','exile-cast','exile-payoff','landfall','spellslinger','lifegain','life-payoff'])
export function commanderSynergy(cards,commander){
  if(!commander)return {score:0,connected:[],tags:[]}
  const semantic=new Set((commander.tags||[]).filter(t=>COMMANDER_ENGINE_TAGS.has(t)))
  if(semantic.has('lifegain')&&!/\byou (?:may )?gain [^.]*life\b/.test(semanticText(commander)))semantic.delete('lifegain')
  const pair=(a,b)=>{if(semantic.has(a))semantic.add(b)}
  pair('blink','etb');pair('tokens','token-payoff');pair('token-payoff','tokens');pair('sac-outlet','death-payoff');pair('death-payoff','sac-outlet');pair('recursion','graveyard-setup');pair('graveyard-setup','recursion');pair('constellation','enchantment');pair('artifact-payoff','artifact');pair('exile-cast','exile-payoff');pair('exile-payoff','exile-cast');pair('landfall','land-ramp');pair('spellslinger','instant');pair('spellslinger','sorcery');pair('lifegain','life-payoff');pair('life-payoff','lifegain')
  if(selfEtbTrigger(commander))semantic.add('blink')
  const counterEngine=semantic.has('counter-producer')||semantic.has('counter-payoff')||semantic.has('modified-payoff')
  const nonlands=cards.filter(c=>!c.isLand),connected=semantic.size?uniqByName(cards.filter(c=>{
    if(c.tags.some(t=>semantic.has(t)&&t!=='counter-producer'&&t!=='counter-payoff'&&t!=='modified-payoff'))return true
    const counterRole=hasTag(c,'counter-producer')||hasTag(c,'counter-payoff')||hasTag(c,'modified-payoff')
    return counterEngine&&counterRole&&(hasTag(commander,'counter-producer')?counterCompatible(commander,c):counterCompatible(c,commander))
  })):[]
  const score=Math.min(100,Math.round(connected.length/Math.max(1,nonlands.length)*170))
  return {score,connected:connected.map(c=>c.name),tags:[...semantic]}
}
