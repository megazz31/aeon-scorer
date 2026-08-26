import { isImmediateLandRamp } from './packageGraph.js'
import { sequenceEligibleCombos } from './knownCombos.js'
import { targetGenericReduction, targetCostReductionStats, topLibraryCheatProfile, isTopLibraryCheatTarget, typeGenericReduction, typeCostReducerMatches, typeCostReductionProfile, commandZoneDeploymentProfile } from './commanderMechanics.js'

function shuffle(arr,rng=Math.random){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function percentile(xs,p){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]*(hi-i)+a[hi]*(i-lo)}
const uniq=xs=>[...new Set(xs)]
const isPermanentCard=c=>!/\binstant\b|\bsorcery\b/i.test(c.type||'')
const isArtifact=c=>/\bartifact\b/i.test(c.type||'')
const isBurst=c=>c.tags.includes('burst-mana')
const numberWord=w=>({one:1,two:2,three:3,four:4,five:5,six:6}[String(w||'').toLowerCase()]||Number(w)||0)
export function immediateLandRampNetSources(c){
  if(!isImmediateLandRamp(c))return 0
  const o=String(c?.oracle||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim().toLowerCase()
  let entered=1
  if(!/put one (?:of (?:them|those cards) )?onto the battlefield/.test(o)){
    const m=o.match(/search your library for (?:up to )?(one|two|three|four|five|six|\d+) [^.;]{0,100}\b(?:basic land|plains|island|swamp|mountain|forest|land) cards?\b/)
    if(m&&/put (?:them|those cards) onto the battlefield/.test(o))entered=Math.max(1,numberWord(m[1]))
  }
  const landSacrifice=/additional cost[^.]{0,100}sacrifice (?:a|one) land|sacrifice (?:a|one) land[^.:]{0,80}:/.test(o)?1:0
  return Math.max(0,entered-landSacrifice)
}
const isPermanentRamp=c=>{if(c.isLand||isBurst(c))return false;const landRamp=immediateLandRampNetSources(c),manaPermanent=isPermanentCard(c)&&(c.sourceColors?.length||0)>0;if(!landRamp&&!manaPermanent)return false;return (c.cmc||0)<=3||(landRamp>=2&&(c.cmc||0)<=4)}
function alwaysTappedLand(c){const o=(c.oracle||'').toLowerCase();if(!/enters(?: the battlefield)? tapped/.test(o))return false;return !/unless|you may pay|if you control|if an opponent|reveal [^.]* from your hand|as [^.]* enters/.test(o)}
function source(options,origin='source',extra={}){return {options:uniq(Array.isArray(options)?options:['C']),origin,...extra}}
function fetchLandInfo(c){
  if(!/\bland\b/i.test(c.type||''))return null
  const o=(c.oracle||'').toLowerCase();if(!/search your library for [^.]*\b(?:basic land|plains|island|swamp|mountain|forest)\b[^.]*put [^.]*onto the battlefield/.test(o))return null
  const colors=[];if(/search your library for [^.]*plains/.test(o))colors.push('W');if(/search your library for [^.]*island/.test(o))colors.push('U');if(/search your library for [^.]*swamp/.test(o))colors.push('B');if(/search your library for [^.]*mountain/.test(o))colors.push('R');if(/search your library for [^.]*forest/.test(o))colors.push('G');if(/search your library for [^.]*basic land/.test(o))colors.push('W','U','B','R','G')
  return {colors:uniq(colors.length?colors:['W','U','B','R','G']),delayed:/put [^.]*onto the battlefield tapped/.test(o)||alwaysTappedLand(c),fabled:/if you control four or more lands, untap that land/.test(o)}
}
function landTypes(battlefield){const types=new Set();for(const c of battlefield.filter(x=>x.isLand||/\bland\b/i.test(x.type||''))){const t=(c.type||'').toLowerCase();for(const x of ['plains','island','swamp','mountain','forest'])if(t.includes(x))types.add(x)}return types}
function directLandColors(c){
  const o=(c.oracle||'').toLowerCase(),t=(c.type||'').toLowerCase(),out=[]
  if(/plains/.test(t))out.push('W');if(/island/.test(t))out.push('U');if(/swamp/.test(t))out.push('B');if(/mountain/.test(t))out.push('R');if(/forest/.test(t))out.push('G')
  for(const m of o.matchAll(/(?:^|\n)\{t\}(?:, pay 1 life)?: add ((?:\{[wubrgc]\})(?: or \{[wubrgc]\})?)/gi)){for(const x of m[1].matchAll(/\{([wubrgc])\}/gi))out.push(x[1].toUpperCase())}
  if(/(?:^|\n)\{t\}(?:, pay 1 life)?: add one mana of any color\b/i.test(c.oracle||''))out.push('W','U','B','R','G')
  if(/(?:^|\n)\{t\}(?:, pay 1 life)?: add one mana of any type that a land you control could produce\b/i.test(c.oracle||''))out.push('W','U','B','R','G')
  return uniq(out)
}
function filterLandInfo(c){
  if(!/\bland\b/i.test(c.type||''))return null
  const o=(c.oracle||'').toLowerCase()
  const pair=o.match(/\{1\},\s*\{t\}: add ((?:\{[wubrgc]\}){2})/i)
  if(pair){const outputs=[...pair[1].matchAll(/\{([wubrgc])\}/gi)].map(m=>[m[1].toUpperCase()]);return {cost:1,outputs}}
  if(/\{1\},\s*\{t\}: add one mana of any color\b/i.test(o))return {cost:1,outputs:[['W','U','B','R','G']]}
  return null
}
function isConditionalLand(c){const n=(c.name||'').toLowerCase();return n==='temple of the false god'||/^tainted (?:field|wood|isle|peak)$/.test(n)||n==='spire of industry'||n==='nimbus maze'}
export function landManaSources(c,battlefield=[]){
  if(!/\bland\b/i.test(c.type||''))return []
  const n=(c.name||'').toLowerCase(),types=landTypes(battlefield),conditional={landSource:true,conditionalLand:isConditionalLand(c)}
  const fetch=fetchLandInfo(c);if(fetch)return [source(fetch.colors,c.name,{landSource:true})]
  if(n==='temple of the false god'){const landCount=battlefield.filter(x=>x.isLand||/\bland\b/i.test(x.type||'')).length;return landCount>=5?[source(['C'],c.name,conditional),source(['C'],c.name,conditional)]:[]}
  if(/^tainted (?:field|wood|isle|peak)$/.test(n)){const colors=types.has('swamp')?(c.sourceColors?.length?c.sourceColors:directLandColors(c)):['C'];return [source(colors.length?colors:['C'],c.name,conditional)]}
  if(n==='spire of industry'){const hasArtifact=battlefield.some(x=>isArtifact(x)&&x!==c);return [source(hasArtifact?['C','W','U','B','R','G']:['C'],c.name,conditional)]}
  if(n==='nimbus maze'){const colors=['C'];if(types.has('island'))colors.push('W');if(types.has('plains'))colors.push('U');return [source(colors,c.name,conditional)]}
  const filter=filterLandInfo(c)
  if(filter){const fallback=directLandColors(c);return [source(fallback,c.name,{landSource:true,filter})]}
  const direct=directLandColors(c);if(direct.length)return Array.from({length:productionCount(c)},()=>source(direct,c.name,{landSource:true}))
  if(c.sourceColors?.length)return [source(c.sourceColors,c.name,{landSource:true})]
  return [source(['C'],c.name,{landSource:true})]
}
function inferredLandColors(c,battlefield=[]){
  const fetch=fetchLandInfo(c);if(fetch)return fetch.colors
  const filter=filterLandInfo(c);if(filter)return uniq([...directLandColors(c),...filter.outputs.flat()])
  const pools=landManaSources(c,[...battlefield,c]);const out=uniq(pools.flatMap(s=>[...(s.options||[]),...(s.filter?.outputs||[]).flat()]));return out.length?out:['C']
}
function poolKey(pool){return pool.map(s=>`${s.origin}:${(s.options||[]).join('')}`).sort().join('|')}
function chooseCostIndices(pool,cost){if(cost<=0)return [[]];if(cost===1)return pool.map((_,i)=>[i]);const out=[];function rec(start,left,acc){if(!left){out.push([...acc]);return}for(let i=start;i<=pool.length-left;i++){acc.push(i);rec(i+1,left-1,acc);acc.pop()}}rec(0,cost,[]);return out}
function expandManaPools(sources){
  const filters=sources.filter(s=>s.filter),normal=sources.filter(s=>!s.filter);let pools=[normal]
  for(const f of filters){const next=[];for(const pool of pools){next.push(pool);if(f.options?.length)next.push([...pool,source(f.options,f.origin)]);for(const idxs of chooseCostIndices(pool,f.filter.cost||1)){const used=new Set(idxs),remaining=pool.filter((_,i)=>!used.has(i)),outputs=(f.filter.outputs||[]).map(opts=>source(opts,f.origin));next.push([...remaining,...outputs])}}const seen=new Set();pools=next.filter(p=>{const k=poolKey(p);if(seen.has(k))return false;seen.add(k);return true})}
  return pools
}
function maxManaCount(sources){return Math.max(0,...expandManaPools(sources).map(p=>p.length))}
function refreshConditionalLandSources(battlefield,activeSources){
  const names=new Set(battlefield.filter(isConditionalLand).map(c=>c.name));if(!names.size)return
  for(let i=activeSources.length-1;i>=0;i--)if(activeSources[i].conditionalLand&&names.has(activeSources[i].origin))activeSources.splice(i,1)
  for(const land of battlefield.filter(isConditionalLand))activeSources.push(...landManaSources(land,battlefield))
}
function productionCount(c){const n=(c.name||'').toLowerCase(),o=(c.oracle||'').toLowerCase();if(n.includes('sol ring')||n.includes('mana crypt'))return 2;const m=o.match(/add ((?:\{[wubrgc]\})+)/i);if(m)return Math.max(1,(m[1].match(/\{[wubrgc]\}/gi)||[]).length);if(/add three mana/.test(o))return 3;if(/add two mana/.test(o))return 2;return 1}
export function permanentRampSupport(c,hand,used,battlefield,commander){
  const n=(c.name||'').toLowerCase(),any=['W','U','B','R','G']
  if(n.includes('chrome mox')){const needs=new Set(commander?.manaReq?.colored?.flat()||[]);const imprint=hand.filter(x=>x!==c&&!used.has(x)&&!x.isLand&&!isArtifact(x)&&(x.colors||[]).length).sort((a,b)=>(b.colors||[]).filter(x=>needs.has(x)).length-(a.colors||[]).filter(x=>needs.has(x)).length)[0];return imprint?{consume:[imprint],colors:uniq(imprint.colors)}:null}
  if(n.includes('mox diamond')){const land=hand.find(x=>x!==c&&x.isLand&&!used.has(x));return land?{consume:[land],colors:any}:null}
  if(n.includes('mox opal')){const artifacts=battlefield.filter(isArtifact);return artifacts.length>=2?{consume:[],colors:any}:null}
  if(n.includes('mox amber')){const legends=battlefield.filter(x=>/\blegendary\b/i.test(x.type||'')&&/\bcreature\b|\bplaneswalker\b/i.test(x.type||'')&&(x.colors||[]).length);const colors=uniq(legends.flatMap(x=>x.colors||[]));return colors.length?{consume:[],colors}:null}
  return {consume:[],colors:null}
}
function permanentRampSources(c,commander,support={}){const landRamp=immediateLandRampNetSources(c),colors=support.colors?.length?support.colors:landRamp?(commander?.manaReq?.colored?.flat()||['W','U','B','R','G']):(c.sourceColors?.length?c.sourceColors:['C']);const count=landRamp||productionCount(c);return Array.from({length:count},()=>source(colors.length?colors:['C'],c.name))}
function rampValue(c){const landRamp=immediateLandRampNetSources(c),output=landRamp||productionCount(c);return output-Number(c.cmc||0)+(isArtifact(c)?0.25:0)}
function burstPriority(c){const n=c.name.toLowerCase();if(/lotus petal|elvish spirit guide|simian spirit guide|lion's eye diamond|jeweled lotus/.test(n))return 0;if(/dark ritual|cabal ritual|rite of flame|mana vault|grim monolith/.test(n))return 1;if(/culling the weak/.test(n))return 2;return 1}
function canProduceColor(sources,color){return expandManaPools(sources).some(pool=>pool.some(s=>s.options.includes(color)))}
export function burstNetSources(c,baseSources,battlefield,forCommander=false){
  const n=c.name.toLowerCase(),any=['W','U','B','R','G'],hasB=canProduceColor(baseSources,'B'),hasR=canProduceColor(baseSources,'R')
  if(n.includes('dark ritual'))return hasB?[source(['B'],c.name),source(['B'],c.name)]:[]
  if(n.includes('cabal ritual'))return hasB&&maxManaCount(baseSources)>=2?[source(['B'],c.name)]:[]
  if(n.includes('culling the weak')){const creature=battlefield.some(x=>x.isCreature);return hasB&&creature?[source(['B'],c.name),source(['B'],c.name),source(['B'],c.name)]:[]}
  if(n.includes('rite of flame'))return hasR?[source(['R'],c.name)]:[]
  if(n.includes('elvish spirit guide'))return [source(['G'],c.name)]
  if(n.includes('simian spirit guide'))return [source(['R'],c.name)]
  if(n.includes('lotus petal'))return [source(any,c.name)]
  if(n.includes("lion's eye diamond"))return forCommander?[source(any,c.name),source(any,c.name),source(any,c.name)]:[]
  if(n.includes('mana vault'))return maxManaCount(baseSources)>=1?[source(['C'],c.name),source(['C'],c.name)]:[]
  if(n.includes('grim monolith'))return maxManaCount(baseSources)>=2?[source(['C'],c.name)]:[]
  if(n.includes('jeweled lotus'))return forCommander?[source(any,c.name),source(any,c.name),source(any,c.name)]:[]
  return [source(c.sourceColors?.length?c.sourceColors:['C'],c.name)]
}
function paymentOptions(card,tax=0,genericReduction=0){const req=card.manaReq||{generic:Math.max(0,Number(card.cmc||0)),colored:[]},colored=(req.colored||[]).map(opts=>opts.length?opts:['C']),represented=Number(req.generic||0)+colored.length,baseGeneric=Math.max(0,Number(req.generic||0)+tax),reduction=Math.min(baseGeneric,Math.max(0,Number(genericReduction||0))),baseTotal=Math.max(Number(card.cmc||represented),represented)+tax,total=Math.max(colored.length,baseTotal-reduction),generic=Math.max(0,baseGeneric-reduction,total-colored.length);return {colored,generic,total}}
function concretePaymentIndices(card,sources,tax=0,genericReduction=0){const req=paymentOptions(card,tax,genericReduction);if(sources.length<req.total)return null;const pips=[...req.colored].sort((a,b)=>a.length-b.length),used=new Set();function place(i){if(i>=pips.length){const remaining=[];for(let s=0;s<sources.length;s++)if(!used.has(s))remaining.push(s);if(remaining.length<req.generic)return null;return new Set([...used,...remaining.slice(0,req.generic)])}for(let s=0;s<sources.length;s++){if(used.has(s)||!pips[i].some(c=>sources[s].options.includes(c)))continue;used.add(s);const result=place(i+1);if(result)return result;used.delete(s)}return null}return place(0)}
function paymentResult(card,sources,tax=0,genericReduction=0){for(const pool of expandManaPools(sources)){const used=concretePaymentIndices(card,pool,tax,genericReduction);if(used)return {pool,used}}return null}
export function canPay(card,sources,tax=0,genericReduction=0){return paymentResult(card,sources,tax,genericReduction)!==null}
function payAndRemain(card,sources,tax=0,genericReduction=0){const result=paymentResult(card,sources,tax,genericReduction);return result?result.pool.filter((_,i)=>!result.used.has(i)):null}
function canPayPair(a,b,sources){const ra=paymentOptions(a),rb=paymentOptions(b),fake={cmc:ra.total+rb.total,manaReq:{generic:ra.generic+rb.generic,colored:[...ra.colored,...rb.colored],total:ra.total+rb.total}};return canPay(fake,sources)}
function potentialSources(activeSources,hand,used,forCommander=false,battlefield=[]){const out=[...activeSources];const bursts=hand.filter(c=>!used.has(c)&&isBurst(c)).sort((a,b)=>burstPriority(a)-burstPriority(b)||a.name.localeCompare(b.name));for(const c of bursts)out.push(...burstNetSources(c,out,battlefield,forCommander));return out}
function chooseLand(hand,used,commander,battlefield=[]){const lands=hand.filter(c=>c.isLand&&!used.has(c));if(!lands.length)return null;const needs=new Set(commander?.manaReq?.colored?.flat()||[]),landCount=battlefield.filter(c=>c.isLand).length;return [...lands].sort((a,b)=>{const score=c=>inferredLandColors(c,battlefield).filter(x=>needs.has(x)).length*5+inferredLandColors(c,battlefield).length-(alwaysTappedLand(c)?2:0)-(((c.name||'').toLowerCase()==='temple of the false god'&&landCount<4)?12:0);return score(b)-score(a)})[0]}
function castableCards(hand,used,sources,pred){return hand.filter(c=>!used.has(c)&&pred(c)&&canPay(c,sources))}
function cardByName(cards,name){const n=name.toLowerCase();return cards.find(c=>c.name.toLowerCase()===n)}
function pairOperational(a,b,battlefield,currentSources,priorSources,priorHandSet){const aBoard=battlefield.includes(a),bBoard=battlefield.includes(b);if(aBoard&&bBoard)return true;if(aBoard)return canPay(b,currentSources);if(bBoard)return canPay(a,currentSources);if(canPayPair(a,b,currentSources))return true;const aWasKnown=priorHandSet.has(a),bWasKnown=priorHandSet.has(b);if(aWasKnown&&isPermanentCard(a)&&canPay(a,priorSources)&&canPay(b,currentSources))return true;if(bWasKnown&&isPermanentCard(b)&&canPay(b,priorSources)&&canPay(a,currentSources))return true;return false}
function counterKinds(c){return new Set((c?.tags||[]).filter(t=>t.startsWith('counter-kind:')).map(t=>t.slice(13)))}
function counterScopeOpponentOnly(c){const o=(c.oracle||'').toLowerCase(),cs=o.split(/[.\n;]+/).filter(s=>/put [^.]*counters? on/.test(s));return cs.length>0&&cs.every(s=>/opponent/.test(s)&&!/you control|this (?:creature|artifact|enchantment|permanent)|target (?:creature|artifact|permanent)(?! an opponent)|each creature(?! your opponents)/.test(s))}
function counterPayoffUsesOpponent(c){const o=(c.oracle||'').toLowerCase();return /opponents? (?:has|have|with) [^.]*counters?|counters? on (?:an |each )?opponents?|poison counters? (?:an |each |your )?opponents?|for each [^.]*counter [^.]*opponent/.test(o)}
function counterPairCompatible(a,b){const ak=counterKinds(a),bk=counterKinds(b);if(!ak.size||!bk.size)return false;if(counterScopeOpponentOnly(a)&&!counterPayoffUsesOpponent(b))return false;if(ak.has('wild')||bk.has('wild')||ak.has('any')||bk.has('any'))return true;for(const k of ak)if(k!=='generic'&&bk.has(k))return true;return ak.has('generic')&&bk.has('generic')}
function operationalPackage(hand,priorHand,battlefield,used,packages,currentSources,priorSources){const available=[...battlefield,...hand.filter(c=>!used.has(c)),...priorHand],priorSet=new Set(priorHand);for(const p of packages.filter(x=>x.id!=='early-commander')){const producers=(p.producerCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean),payoffs=(p.payoffCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean);for(const a of producers)for(const b of payoffs){if(a.name.toLowerCase()===b.name.toLowerCase())continue;if(p.id==='counters'&&!counterPairCompatible(a,b))continue;if(pairOperational(a,b,battlefield,currentSources,priorSources,priorSet))return {ok:true,packageId:p.id}}}return {ok:false,packageId:null}}
function comboAccessible(hand,priorHand,battlefield,used,combos,currentSources,priorSources){const eligible=sequenceEligibleCombos(combos);if(!eligible.length)return false;const available=[...battlefield,...hand.filter(c=>!used.has(c)),...priorHand],priorSet=new Set(priorHand);for(const combo of eligible){const pieces=combo.cards.map(n=>cardByName(available,n)).filter(Boolean);if(pieces.length!==combo.cards.length)continue;if(pieces.length===2&&pairOperational(pieces[0],pieces[1],battlefield,currentSources,priorSources,priorSet))return true;if(pieces.every(c=>battlefield.includes(c)||canPay(c,currentSources)))return true}return false}

function canPayWithCommanderMechanic(card,sources,commander,alreadyOnline=false,postCommanderSources=null){if(canPay(card,sources))return true;const reduction=targetGenericReduction(card,commander);if(!reduction)return false;if(alreadyOnline&&canPay(card,sources,0,reduction))return true;return !!postCommanderSources&&canPay(card,postCommanderSources,0,reduction)}
function unlockedByCommanderMechanic(card,sources,commander,alreadyOnline=false,postCommanderSources=null){if(canPay(card,sources))return false;const reduction=targetGenericReduction(card,commander);if(!reduction)return false;return alreadyOnline?canPay(card,sources,0,reduction):!!postCommanderSources&&canPay(card,postCommanderSources,0,reduction)}
function resolveTopLibraryCheat(lib,battlefield,profile){if(!profile?.look||!lib.length)return {triggered:false,hit:false,card:null,compressed:0};const looked=lib.splice(0,Math.min(profile.look,lib.length)),eligible=looked.filter(c=>isTopLibraryCheatTarget(c,profile)).sort((a,b)=>(Number(b.cmc||0)+Number(b.development||0)+Number(b.explosiveness||0))-(Number(a.cmc||0)+Number(a.development||0)+Number(a.explosiveness||0))||String(a.name||'').localeCompare(String(b.name||''))),chosen=eligible[0]||null;if(chosen)battlefield.push(chosen);for(const c of looked)if(c!==chosen)lib.push(c);return {triggered:true,hit:!!chosen,card:chosen,compressed:chosen?Number(chosen.cmc||0):0}}
function castCommanderReducerSetup(hand,used,battlefield,turnSources,commander){let remaining=turnSources,casts=0;for(let n=0;n<3;n++){const commanderSources=potentialSources(remaining,hand,used,true,battlefield),existingReduction=typeGenericReduction(commander,battlefield);if(canPay(commander,commanderSources,0,existingReduction))break;const candidates=hand.filter(c=>!used.has(c)&&isPermanentCard(c)&&typeCostReducerMatches(c,commander)&&(c.cmc||0)<=3&&canPay(c,remaining)).sort((a,b)=>(a.cmc||0)-(b.cmc||0)||(typeCostReductionProfile(b)?.amount||0)-(typeCostReductionProfile(a)?.amount||0)||a.name.localeCompare(b.name));const c=candidates[0];if(!c)break;const next=payAndRemain(c,remaining);if(!next)break;used.add(c);battlefield.push(c);remaining=next;casts++}return {remaining,casts}}
function commandZoneDeployer(card){return commandZoneDeploymentProfile(card)}
function keepOpeningHand(hand){const lands=hand.filter(c=>c.isLand).length,early=hand.some(c=>{if(c.isLand)return false;const ramp=immediateLandRampNetSources(c);return (c.cmc||0)<=2||c.tags?.includes('fast-mana')||(ramp>0&&((c.cmc||0)<=2||lands>=3))});return lands>=2&&lands<=5&&early}
function bottomKeepValue(c,commander,landCount){
  if(c.isLand){const needs=new Set(commander?.manaReq?.colored?.flat()||[]),colorHits=inferredLandColors(c).filter(x=>needs.has(x)).length,temple=(c.name||'').toLowerCase()==='temple of the false god';return landCount>3?-8+colorHits+(alwaysTappedLand(c)?-1:0)-(temple?3:0):5+colorHits-(temple?8:0)}
  let v=0;const ramp=immediateLandRampNetSources(c);if(c.tags?.includes('fast-mana'))v+=8;if(ramp)v+=(c.cmc||0)<=2?8:(c.cmc||0)===3?5:ramp>=2?4:2;if((c.cmc||0)<=2)v+=4;if(c.tags?.includes('draw')||c.interaction>0)v+=2;if((c.cmc||0)>=5)v-=4;if((c.cmc||0)>=7)v-=2;return v
}
export function applyCommanderLondonBottom(hand,penalty,commander=null){if(penalty<=0)return {hand:[...hand],bottom:[]};const landCount=hand.filter(c=>c.isLand).length,ranked=[...hand].map((c,i)=>({c,i,v:bottomKeepValue(c,commander,landCount)})).sort((a,b)=>a.v-b.v||b.i-a.i),bottom=ranked.slice(0,Math.min(penalty,hand.length)).map(x=>x.c),bottomSet=new Set(bottom);return {hand:hand.filter(c=>!bottomSet.has(c)),bottom}}
function openingHand(libBase,commander,rng){let lib=[],hand=[],mulligans=0;while(true){lib=shuffle(libBase,rng);hand=lib.splice(0,7);if(keepOpeningHand(hand)||mulligans>=2)break;mulligans++}const penalty=Math.max(0,mulligans-1),adjusted=applyCommanderLondonBottom(hand,penalty,commander);lib.push(...adjusted.bottom);return {lib,hand:adjusted.hand,mulligans,penalty}}

export function simulateSequences(cards,commander,packages,combos=[],iterations=3000,maxTurn=7,rng=Math.random){
  const libBase=cards.filter(c=>!commander||c.name.toLowerCase()!==commander.name.toLowerCase()||c.__keepIn99),samples=[],cmdTurns=[],engineTurns=[],recoverySamples=[]
  const targetStats=targetCostReductionStats(cards,commander),cheatProfile=topLibraryCheatProfile(commander),typeReducerCards=commander?cards.filter(c=>typeCostReducerMatches(c,commander)):[],commandZoneDeployers=commander?cards.filter(c=>!!commandZoneDeployer(c)):[];let cheatTriggers=0,cheatHits=0,cheatCompressed=0,targetUnlockEvents=0,typeReducerCasts=0,commandZoneDeployments=0
  const turnStats=Array.from({length:maxTurn},()=>({cmd:0,engine:0,interaction:0,resource:0,burst:0,commanderCheat:0,targetReduction:0,typeReduction:0,commandZoneDeployment:0,total:0}))
  for(let it=0;it<iterations;it++){
    let {lib,hand}=openingHand(libBase,commander,rng)
    const used=new Set(),battlefield=[],activeSources=[]
    let pendingSources=[],priorSources=[],cmdTurn=null,engineTurn=null,peak=0,sum=0,recovered=false,disruptedPackageId=null
    for(let turn=1;turn<=maxTurn;turn++){
      activeSources.push(...pendingSources);pendingSources=[];refreshConditionalLandSources(battlefield,activeSources);const priorHand=[...hand];if(lib.length)hand.push(lib.shift())
      const land=chooseLand(hand,used,commander,battlefield);if(land){used.add(land);battlefield.push(land);const landCount=battlefield.filter(c=>c.isLand).length,sources=landManaSources(land,battlefield),fetch=fetchLandInfo(land),fetchDelayed=!!fetch&&fetch.delayed&&!(fetch.fabled&&landCount>=4);if(alwaysTappedLand(land)||fetchDelayed)pendingSources.push(...sources);else activeSources.push(...sources);refreshConditionalLandSources(battlefield,activeSources)}
      let turnSources=[...activeSources]
      for(let rampCasts=0;rampCasts<8;rampCasts++){
        const commanderNowSources=commander&&cmdTurn==null?potentialSources(turnSources,hand,used,true,battlefield):[],commanderNowReduction=commander&&cmdTurn==null?typeGenericReduction(commander,battlefield):0
        if(commander&&cmdTurn==null&&canPay(commander,commanderNowSources,0,commanderNowReduction))break
        const rampCandidates=castableCards(hand,used,turnSources,isPermanentRamp).map(card=>({card,support:permanentRampSupport(card,hand,used,battlefield,commander)})).filter(x=>x.support).sort((a,b)=>rampValue(b.card)-rampValue(a.card)||(a.card.cmc||0)-(b.card.cmc||0))
        const rampChoice=rampCandidates[0];if(!rampChoice)break
        const ramp=rampChoice.card,support=rampChoice.support,produced=permanentRampSources(ramp,commander,support),remaining=payAndRemain(ramp,turnSources)
        if(!remaining)break
        used.add(ramp);for(const costCard of support.consume||[])used.add(costCard);if(isPermanentCard(ramp))battlefield.push(ramp)
        if(isArtifact(ramp)){activeSources.push(...produced);turnSources=[...remaining,...produced]}else{turnSources=[...remaining];pendingSources.push(...produced)}
      }
      let reducerCastsThisTurn=0;if(commander&&cmdTurn==null&&typeReducerCards.length){const setup=castCommanderReducerSetup(hand,used,battlefield,turnSources,commander);turnSources=setup.remaining;reducerCastsThisTurn=setup.casts;typeReducerCasts+=setup.casts}
      let generalSources=potentialSources(turnSources,hand,used,false,battlefield),commanderSources=potentialSources(turnSources,hand,used,true,battlefield)
      const wasCommanderOnline=!!commander&&cmdTurn!=null&&cmdTurn<turn;let commanderCastThisTurn=false,temporaryCommanderThisTurn=false,temporaryCommanderHaste=false,postCommanderSources=null,deploymentUsedThisTurn=false
      const commanderReduction=commander?typeGenericReduction(commander,battlefield):0
      if(commander&&cmdTurn==null&&canPay(commander,commanderSources,0,commanderReduction)){postCommanderSources=payAndRemain(commander,commanderSources,0,commanderReduction);cmdTurn=turn;commanderCastThisTurn=true;battlefield.push(commander)}
      if(commander&&cmdTurn==null&&!commanderCastThisTurn&&commandZoneDeployers.length){const deployer=hand.filter(c=>!used.has(c)&&!!commandZoneDeployer(c)&&canPay(c,generalSources)).sort((a,b)=>(a.cmc||0)-(b.cmc||0)||a.name.localeCompare(b.name))[0];if(deployer){const remaining=payAndRemain(deployer,generalSources);if(remaining){used.add(deployer);if(isPermanentCard(deployer))battlefield.push(deployer);const dp=commandZoneDeployer(deployer);temporaryCommanderThisTurn=true;temporaryCommanderHaste=!!dp?.grantsHaste;deploymentUsedThisTurn=true;commandZoneDeployments++;postCommanderSources=remaining;if(!battlefield.includes(commander))battlefield.push(commander)}}}
      let cheatCard=null,cheatTriggeredThisTurn=false
      if(commander&&cheatProfile){const entersNow=commanderCastThisTurn||temporaryCommanderThisTurn,attacksNow=wasCommanderOnline||(commanderCastThisTurn&&cheatProfile.haste)||(temporaryCommanderThisTurn&&temporaryCommanderHaste);const triggers=(entersNow&&cheatProfile.onEnter?1:0)+(attacksNow&&cheatProfile.onAttack?1:0);for(let n=0;n<triggers;n++){const hit=resolveTopLibraryCheat(lib,battlefield,cheatProfile);if(hit.triggered){cheatTriggers++;cheatTriggeredThisTurn=true}if(hit.hit){cheatHits++;cheatCompressed+=hit.compressed;cheatCard=hit.card}}}
      generalSources=potentialSources(turnSources,hand,used,false,battlefield)
      const commanderMechanicOnline=wasCommanderOnline||commanderCastThisTurn||temporaryCommanderThisTurn,mechanicSources=(commanderCastThisTurn||temporaryCommanderThisTurn)?postCommanderSources:null
      const mechanicPay=c=>{const staticReduction=typeGenericReduction(c,battlefield);if(canPay(c,generalSources,0,staticReduction))return true;const targetReduction=commanderMechanicOnline?targetGenericReduction(c,commander):0,totalReduction=Math.min(Number(c?.manaReq?.generic||0),staticReduction+targetReduction);return targetReduction>0&&((wasCommanderOnline&&canPay(c,generalSources,0,totalReduction))||(!wasCommanderOnline&&mechanicSources&&canPay(c,mechanicSources,0,totalReduction)))}
      const targetUnlock=!!targetStats&&commanderMechanicOnline&&hand.some(c=>!used.has(c)&&!canPay(c,generalSources,0,typeGenericReduction(c,battlefield))&&mechanicPay(c));if(targetUnlock)targetUnlockEvents++
      const engine=operationalPackage(hand,priorHand,battlefield,used,packages,generalSources,priorSources);if(engine.ok&&engineTurn==null)engineTurn=turn;if(turn===4&&engine.ok)disruptedPackageId=engine.packageId
      const interaction=!!(cheatCard&&cheatCard.interaction>0)||hand.some(c=>!used.has(c)&&c.interaction>0&&mechanicPay(c)),resource=!!(cheatCard&&(cheatCard.tags.includes('draw')||cheatCard.tags.includes('recursion')))||hand.some(c=>!used.has(c)&&(c.tags.includes('draw')||c.tags.includes('recursion'))&&mechanicPay(c))
      const manaBurst=maxManaCount(generalSources)>=maxManaCount(turnSources)+2,highImpact=!!(cheatCard&&(Number(cheatCard.cmc||0)>=5||cheatCard.tags.includes('win')||cheatCard.tags.includes('cheat')))||hand.some(c=>!used.has(c)&&(c.tags.includes('extra-turn')||c.tags.includes('win')||c.tags.includes('cheat'))&&mechanicPay(c)),combo=comboAccessible(hand,priorHand,battlefield,used,combos,generalSources,priorSources),burst=manaBurst||highImpact||combo
      if(turn===5){const recast=commander?canPay(commander,commanderSources,2,typeGenericReduction(commander,battlefield)):false,alternateEngine=engine.ok&&(!disruptedPackageId||engine.packageId!==disruptedPackageId);recovered=resource||alternateEngine||recast;recoverySamples.push(recovered?1:0)}
      const cmdOnline=commander&&cmdTurn!=null&&cmdTurn<=turn,cmdActive=cmdOnline||temporaryCommanderThisTurn,manaTempo=Math.min(1.35,maxManaCount(activeSources)/Math.max(2,turn+1)),state=100*Math.min(1,.27*manaTempo+.22*(engine.ok?1:0)+.14*(interaction?1:0)+.11*(resource?1:0)+.10*(cmdActive?1:0)+.08*(burst?1:0)+.08*(combo?1:0))
      peak=Math.max(peak,state);sum+=state;const ts=turnStats[turn-1];ts.total++;ts.cmd+=cmdOnline?1:0;ts.engine+=engine.ok?1:0;ts.interaction+=interaction?1:0;ts.resource+=resource?1:0;ts.burst+=burst?1:0;ts.commanderCheat+=cheatTriggeredThisTurn?1:0;ts.targetReduction+=targetUnlock?1:0;ts.typeReduction+=reducerCastsThisTurn>0?1:0;ts.commandZoneDeployment+=deploymentUsedThisTurn?1:0;priorSources=[...turnSources];if(temporaryCommanderThisTurn&&cmdTurn==null){const i=battlefield.indexOf(commander);if(i>=0)battlefield.splice(i,1)}
    }
    if(cmdTurn!=null)cmdTurns.push(cmdTurn);if(engineTurn!=null)engineTurns.push(engineTurn);samples.push({avg:sum/maxTurn,peak,cmdTurn:cmdTurn||maxTurn+1,engineTurn:engineTurn||maxTurn+1,recovered})
  }
  const avgs=samples.map(x=>x.avg),peaks=samples.map(x=>x.peak),floor=percentile(avgs,.20),median=percentile(avgs,.50),high=percentile(avgs,.80),peak=percentile(peaks,.80),q25=percentile(avgs,.25),q75=percentile(avgs,.75),iqr=q75-q25,consistency=Math.max(0,Math.min(100,100-iqr*2.2))
  const turnProfile=turnStats.map((s,i)=>({turn:i+1,commander:Math.round(s.cmd/Math.max(1,s.total)*100),engine:Math.round(s.engine/Math.max(1,s.total)*100),interaction:Math.round(s.interaction/Math.max(1,s.total)*100),resource:Math.round(s.resource/Math.max(1,s.total)*100),burst:Math.round(s.burst/Math.max(1,s.total)*100),commanderCheat:Math.round(s.commanderCheat/Math.max(1,s.total)*100),targetReduction:Math.round(s.targetReduction/Math.max(1,s.total)*100),typeReduction:Math.round(s.typeReduction/Math.max(1,s.total)*100),commandZoneDeployment:Math.round(s.commandZoneDeployment/Math.max(1,s.total)*100)}))
  const commanderMechanics={targetCostReduction:targetStats?{...targetStats,unlockRate:Math.round(targetUnlockEvents/Math.max(1,iterations*maxTurn)*1000)/10}:null,topLibraryCheat:cheatProfile?{profile:cheatProfile,triggers:cheatTriggers,hits:cheatHits,hitRate:Math.round(cheatHits/Math.max(1,cheatTriggers)*1000)/10,averageManaCompressed:Math.round(cheatCompressed/Math.max(1,cheatHits)*10)/10}:null,typeCostReduction:typeReducerCards.length?{eligibleReducers:typeReducerCards.map(c=>({name:c.name,profile:typeCostReductionProfile(c)})),casts:typeReducerCasts}:null,commandZoneDeployment:commandZoneDeployers.length?{eligibleCards:commandZoneDeployers.map(c=>({name:c.name,profile:commandZoneDeployer(c)})),uses:commandZoneDeployments}:null}
  return {iterations,floor:Math.round(floor),median:Math.round(median),high:Math.round(high),ceiling:Math.round(high),peak:Math.round(peak),iqr:Math.round(iqr),consistency:Math.round(consistency),commanderMedianTurn:cmdTurns.length?Math.round(percentile(cmdTurns,.5)*10)/10:null,engineMedianTurn:engineTurns.length?Math.round(percentile(engineTurns,.5)*10)/10:null,recoveryAfterDisruption:Math.round(recoverySamples.reduce((s,x)=>s+x,0)/Math.max(1,recoverySamples.length)*100),turnProfile,commanderMechanics}
}