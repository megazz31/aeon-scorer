import { topLibraryCheatProfile, isTopLibraryCheatTarget } from './commanderMechanics.js'
import { extraCommanderSynergy } from './commanderSynergyPatterns.js'

const MOTIFS=[
  {id:'early-commander',name:'Accélération du commandant',special:'commander'},
  {id:'blink-etb',name:'Blink / ETB',producers:['blink'],payoffs:['etb'],minP:2,minY:2},
  {id:'constellation',name:'Enchantements / Constellation',producers:['enchantment'],payoffs:['constellation'],minP:4,minY:1},
  {id:'equipment',name:'Équipements / Voltron',special:'equipment'},
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
function semanticText(c){return String(c?.oracle||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim().toLowerCase()}
function semanticClauses(c){return semanticText(c).split(/[.\n;]+/).map(x=>x.trim()).filter(Boolean)}
const isOneShotSpell=c=>/\binstant\b|\bsorcery\b/i.test(c.type||'')

function hasDirectPersistentManaAction(c){
  const o=semanticText(c),t=String(c?.type||'').toLowerCase()
  if(!hasTag(c,'mana')&&(c.sourceColors?.length||0)<=0)return false
  if(/\b(?:creature|artifact|token)s? you control have \{t\}: add\b/.test(o)&&!t.includes('creature'))return false
  if(/\bwhenever enchanted (?:land|forest|plains|island|swamp|mountain) is tapped for mana\b[^.]{0,120}\badds?\b/.test(o))return true
  if(/(?:\{t\}|\btap\b)[^.:;]{0,60}:?\s*add\b/.test(o))return true
  if(/\bhas \{t\}: add\b/.test(o)&&t.includes('creature'))return true
  return false
}
function restrictionMatchesCommander(c,commander){
  const o=semanticText(c),ct=String(commander?.type||'').toLowerCase()
  if(/spend this mana only to activate abilities/.test(o))return false
  const m=o.match(/spend this mana only to cast (?:an? |your )?([^.;]{0,80}?)(?: spell| spells)/)
  if(!m)return true
  const scope=m[1]
  if(/commander/.test(scope))return true
  if(/noncreature/.test(scope))return !ct.includes('creature')
  if(/creature/.test(scope)&&!/(noncreature)/.test(scope))return ct.includes('creature')
  if(/artifact/.test(scope))return ct.includes('artifact')
  if(/enchantment/.test(scope))return ct.includes('enchantment')
  if(/legendary/.test(scope))return ct.includes('legendary')
  const words=scope.match(/[a-z][a-z'-]+/g)||[]
  const ignored=new Set(['a','an','the','your','spell','spells','color','colors','of','any','one','only'])
  const typed=words.filter(w=>!ignored.has(w))
  if(typed.length&&typed.some(w=>ct.includes(w)))return true
  return typed.length===0
}
const isManaPermanent=(c,commander)=>{
  if(/\binstant\b|\bsorcery\b/i.test(c.type||''))return false
  if(!hasDirectPersistentManaAction(c))return false
  if(!restrictionMatchesCommander(c,commander))return false
  const o=semanticText(c)
  if(/whenever an opponent|when an opponent|whenever a creature dies|whenever a permanent dies|when this creature dies|deals combat damage/.test(o)&&!/\{t\}:|\btap\b/.test(o))return false
  return true
}

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
function harmfulLeaveDownside(c){const o=semanticText(c);return /when(?:ever)? [^.]{0,100} leaves the battlefield[^.]{0,220}(?:you discard|discard \w+ cards?|you lose \d+ life|sacrifice \w+ creatures?|sacrifice \d+ creatures?)/.test(o)}
function trueEtbPayoff(c){
  if(c.isLand||/\bland\b/i.test(c.type||''))return false
  if(harmfulLeaveDownside(c))return false
  return semanticClauses(c).some(s=>{
    if(!/\bwhen(?:ever)?\b[^.\n;]{0,180}\benters(?: the battlefield)?\b/.test(s))return false
    const opponentOnly=/(?:land|creature|artifact|permanent|enchantment) an opponent controls enters|(?:land|creature|artifact|permanent|enchantment)s? your opponents? control enters|under an opponent'?s control enters/.test(s)
    return !opponentOnly
  })
}
function isEquipmentCard(c){return /\bartifact\b[^—\n]*—[^\n]*\bequipment\b|\bequipment\b/i.test(c.type||'')}
function isEquipmentPayoff(c){
  const o=semanticText(c)
  if(!o)return false
  return /\bequipment(?:s)? (?:you control|attached|card|cards)|\bequipped creature|\bequip (?:ability|abilities|cost|costs)|\bfor each equipment\b/.test(o)
}
function isEnchantmentCastPayoff(c){return /\bwhenever you cast an? enchantment spell\b|\benchantment spells? you cast\b/.test(semanticText(c))}
function targetReductionScope(c){
  const o=semanticText(c)
  if(/spells you cast cost [^.]{0,100} less to cast for each target/.test(o))return 'any'
  if(/spells you cast that target (?:a|one or more) creatures? cost [^.]{0,100} less to cast/.test(o))return 'creature'
  return null
}
function spellTargetsScope(c,scope){
  const t=String(c?.type||'').toLowerCase(),o=semanticText(c)
  if(!/\binstant\b|\bsorcery\b|\benchantment\b/.test(t))return false
  if(scope==='creature')return /\btarget [^.]{0,60}\bcreature\b|\benchant creature\b/.test(o)
  return /\btarget\b/.test(o)||(/\baura\b/.test(t)&&/\benchant\b/.test(o))
}
function commanderCounterTriggerKind(c){
  const o=semanticText(c)
  if(!/whenever one or more [^.]{0,80}counters? (?:are|is) put on/.test(o))return null
  if(/\+1\/\+1 counters?/.test(o))return 'plus1'
  if(/-1\/-1 counters?/.test(o))return 'minus1'
  return 'generic'
}
function cardProducesCounterKind(c,kind){
  if(!hasTag(c,'counter-producer'))return false
  const kinds=counterKinds(c)
  if(kind==='generic')return kinds.size>0
  return kinds.has(kind)||kinds.has('wild')||kinds.has('any')
}
function creatureSubtypes(c){
  const t=String(c?.type||'')
  if(!/\bcreature\b/i.test(t)||!/[—-]/.test(t))return []
  const rhs=t.split(/[—-]/).slice(1).join(' ')
  return rhs.split(/\s+/).map(x=>x.replace(/[^A-Za-z'-]/g,'')).filter(Boolean)
}
function tribalTypesReferenced(cards,commander){
  const counts=new Map()
  for(const c of cards){for(const subtype of creatureSubtypes(c)){const k=subtype.toLowerCase();counts.set(k,(counts.get(k)||0)+1)}}
  const o=semanticText(commander),out=[]
  for(const [type,count] of counts){
    if(count<3||type.length<3)continue
    const re=new RegExp(`\\b${escaped(type)}(?:s|es)?\\b`)
    if(re.test(o))out.push(type)
  }
  return out
}

export function detectPackages(cards,commander=null){
  const out=[],nonlands=cards.filter(c=>!c.isLand),functionalPool=cards
  for(const m of MOTIFS){
    if(m.special==='commander'){
      if(!commander)continue
      const burst=roleCards(nonlands,['burst-mana']).filter(c=>restrictionMatchesCommander(c,commander))
      const cmdCmc=Number(commander.cmc||0),maxSetupCmc=Math.max(0,Math.min(3,cmdCmc-2))
      const persistent=uniqByName(nonlands.filter(c=>!hasTag(c,'burst-mana')&&(c.cmc||0)<=maxSetupCmc&&(isImmediateLandRamp(c)||isManaPermanent(c,commander))))
      const meaningful=burst.length>=2||(cmdCmc>=4&&(burst.length+persistent.length)>=4)
      if(!meaningful)continue
      const cohesion=Math.min(100,Math.round(22+burst.length*13+persistent.length*3+Math.max(0,cmdCmc-3)*4)),members=uniqByName([...burst,...persistent])
      out.push({id:m.id,name:m.name,strength:cohesion,cohesion,producers:previewNames(members),payoffs:[commander.name],members:allNames([...members,commander]),producerCards:members.map(mini),payoffCards:[mini(commander)],evidence:`${burst.length} accélérateur(s) burst + ${persistent.length} source(s) persistante(s) réellement dans la fenêtre T${Math.max(1,cmdCmc-1)} ou avant vers un commandant MV ${cmdCmc}.`})
      continue
    }
    if(m.special==='equipment'){
      const producers=uniqByName(functionalPool.filter(isEquipmentCard)),payoffs=uniqByName(functionalPool.filter(c=>!isEquipmentCard(c)&&isEquipmentPayoff(c)))
      if(producers.length<4||payoffs.length<1)continue
      const members=uniqByName([...producers,...payoffs]),density=members.length/Math.max(1,nonlands.length),balance=Math.min(producers.length,payoffs.length)/Math.max(producers.length,payoffs.length),cohesion=Math.min(100,Math.round(24+members.length*3.3+density*52+balance*18))
      out.push({id:m.id,name:m.name,strength:cohesion,cohesion,producers:previewNames(producers),payoffs:previewNames(payoffs),members:allNames(members),producerCards:producers.map(mini),supportCards:[],payoffCards:payoffs.map(mini),producerTags:['equipment-type'],supportTags:[],payoffTags:['equipment-payoff'],evidence:`${producers.length} équipement(s), ${payoffs.length} carte(s) qui les convertissent en avantage.`})
      continue
    }
    let producers=roleCards(functionalPool,m.producers)
    const supports=m.supports?.length?roleCards(functionalPool,m.supports):[]
    const producerEvidence=uniqByName([...producers,...supports])
    let payoffs=m.id==='blink-etb'?uniqByName(functionalPool.filter(trueEtbPayoff)):m.id==='spells'?roleCards(functionalPool,m.payoffs).filter(c=>!isOneShotSpell(c)):m.id==='constellation'?uniqByName([...roleCards(functionalPool,m.payoffs),...functionalPool.filter(isEnchantmentCastPayoff)]):roleCards(functionalPool,m.payoffs)
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
    const evidence=m.supports?.length?`${producers.length} producteur(s) opérationnel(s) + ${supports.length} support(s), ${payoffs.length} payoff(s), ${members.length} carte(s) distincte(s).`:`${producers.length} producteur(s), ${payoffs.length} payoff(s), ${members.length} carte(s) distincte(s).`
    out.push({id:m.id,name:m.name,strength:cohesion,cohesion,producers:previewNames(effectiveEvidence),payoffs:previewNames(payoffs),members:allNames(members),producerCards:producers.map(mini),supportCards:supports.map(mini),payoffCards:payoffs.map(mini),producerTags:m.producers,supportTags:m.supports||[],payoffTags:m.payoffs,evidence})
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
  const custom=[],extra=extraCommanderSynergy(cards,commander)
  for(const tag of extra.tags)semantic.add(tag)
  custom.push(...extra.connected)
  const scope=targetReductionScope(commander)
  if(scope){semantic.add('target-cost-reduction');custom.push(...cards.filter(c=>spellTargetsScope(c,scope)))}
  const cheatProfile=topLibraryCheatProfile(commander)
  if(cheatProfile){semantic.add('top-library-cheat');custom.push(...cards.filter(c=>isTopLibraryCheatTarget(c,cheatProfile)))}
  if(isEnchantmentCastPayoff(commander)){semantic.add('enchantment-cast-payoff');custom.push(...cards.filter(c=>/\benchantment\b/i.test(c.type||'')))}
  if(isEquipmentPayoff(commander)){semantic.add('equipment-payoff');custom.push(...cards.filter(isEquipmentCard))}
  const counterTriggerKind=commanderCounterTriggerKind(commander)
  if(counterTriggerKind){semantic.add('counter-payoff');custom.push(...cards.filter(c=>cardProducesCounterKind(c,counterTriggerKind)))}
  const tribes=tribalTypesReferenced(cards,commander)
  for(const tribe of tribes){semantic.add(`tribal:${tribe}`);custom.push(...cards.filter(c=>creatureSubtypes(c).some(x=>x.toLowerCase()===tribe)))}
  const nonlands=cards.filter(c=>!c.isLand),connectedByTags=semantic.size?cards.filter(c=>{
    if(c.tags.some(t=>semantic.has(t)&&t!=='counter-producer'&&t!=='counter-payoff'&&t!=='modified-payoff'))return true
    const counterRole=hasTag(c,'counter-producer')||hasTag(c,'counter-payoff')||hasTag(c,'modified-payoff')
    return counterEngine&&counterRole&&(hasTag(commander,'counter-producer')?counterCompatible(commander,c):counterCompatible(c,commander))
  }):[]
  const connected=uniqByName([...connectedByTags,...custom])
  const score=Math.min(100,Math.round(connected.length/Math.max(1,nonlands.length)*170))
  return {score,connected:connected.map(c=>c.name),tags:[...semantic],limitations:extra.limitations}
}
