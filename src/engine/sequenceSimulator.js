function shuffle(arr,rng=Math.random){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function percentile(xs,p){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]*(hi-i)+a[hi]*(i-lo)}
const uniq=xs=>[...new Set(xs)]
const isPermanentCard=c=>!/\binstant\b|\bsorcery\b/i.test(c.type||'')
const isArtifact=c=>/\bartifact\b/i.test(c.type||'')
const isBurst=c=>c.tags.includes('burst-mana')
const isPermanentRamp=c=>!c.isLand&&!isBurst(c)&&(c.tags.includes('land-ramp')||(isPermanentCard(c)&&(c.sourceColors?.length||0)>0))&&(c.cmc||0)<=3
function alwaysTappedLand(c){const o=(c.oracle||'').toLowerCase();if(!/enters(?: the battlefield)? tapped/.test(o))return false;return !/unless|you may pay|if you control|if an opponent|reveal [^.]* from your hand|as [^.]* enters/.test(o)}
function source(options,origin='source'){return {options:uniq(options?.length?options:['C']),origin}}
function inferredLandColors(c){
  if(c.sourceColors?.length)return c.sourceColors
  const o=(c.oracle||'').toLowerCase(),t=(c.type||'').toLowerCase(),out=[]
  if(/plains/.test(t))out.push('W');if(/island/.test(t))out.push('U');if(/swamp/.test(t))out.push('B');if(/mountain/.test(t))out.push('R');if(/forest/.test(t))out.push('G')
  if(/search your library for [^.]*plains/.test(o))out.push('W');if(/search your library for [^.]*island/.test(o))out.push('U');if(/search your library for [^.]*swamp/.test(o))out.push('B');if(/search your library for [^.]*mountain/.test(o))out.push('R');if(/search your library for [^.]*forest/.test(o))out.push('G')
  if(/search your library for (?:a )?basic land/.test(o)||/any color|any type that a land you control could produce/.test(o))return ['W','U','B','R','G']
  return uniq(out.length?out:['C'])
}
function baseLandSource(c){return source(inferredLandColors(c),c.name)}
function productionCount(c){const n=(c.name||'').toLowerCase(),o=(c.oracle||'').toLowerCase();if(n.includes('sol ring')||n.includes('mana crypt'))return 2;const m=o.match(/add ((?:\{[wubrgc]\})+)/i);if(m)return Math.max(1,(m[1].match(/\{[wubrgc]\}/gi)||[]).length);if(/add three mana/.test(o))return 3;if(/add two mana/.test(o))return 2;return 1}
export function permanentRampSupport(c,hand,used,battlefield,commander){
  const n=(c.name||'').toLowerCase(),any=['W','U','B','R','G']
  if(n.includes('chrome mox')){const needs=new Set(commander?.manaReq?.colored?.flat()||[]);const imprint=hand.filter(x=>x!==c&&!used.has(x)&&!x.isLand&&!isArtifact(x)&&(x.colors||[]).length).sort((a,b)=>(b.colors||[]).filter(x=>needs.has(x)).length-(a.colors||[]).filter(x=>needs.has(x)).length)[0];return imprint?{consume:[imprint],colors:uniq(imprint.colors)}:null}
  if(n.includes('mox diamond')){const land=hand.find(x=>x!==c&&x.isLand&&!used.has(x));return land?{consume:[land],colors:any}:null}
  if(n.includes('mox opal')){const artifacts=battlefield.filter(isArtifact);return artifacts.length>=2?{consume:[],colors:any}:null}
  if(n.includes('mox amber')){const legends=battlefield.filter(x=>/\blegendary\b/i.test(x.type||'')&&/\bcreature\b|\bplaneswalker\b/i.test(x.type||'')&&(x.colors||[]).length);const colors=uniq(legends.flatMap(x=>x.colors||[]));return colors.length?{consume:[],colors}:null}
  return {consume:[],colors:null}
}
function permanentRampSources(c,commander,support={}){const colors=support.colors?.length?support.colors:c.tags.includes('land-ramp')?(commander?.manaReq?.colored?.flat()||['W','U','B','R','G']):(c.sourceColors?.length?c.sourceColors:['C']);const count=c.tags.includes('land-ramp')?1:productionCount(c);return Array.from({length:count},()=>source(colors.length?colors:['C'],c.name))}
function rampValue(c){return productionCount(c)-Number(c.cmc||0)+(isArtifact(c)?0.25:0)}
function burstPriority(c){const n=c.name.toLowerCase();if(/lotus petal|elvish spirit guide|simian spirit guide|lion's eye diamond|jeweled lotus/.test(n))return 0;if(/dark ritual|cabal ritual|rite of flame|mana vault|grim monolith/.test(n))return 1;if(/culling the weak/.test(n))return 2;return 1}
export function burstNetSources(c,baseSources,battlefield,forCommander=false){
  const n=c.name.toLowerCase(),any=['W','U','B','R','G'],hasB=baseSources.some(s=>s.options.includes('B')),hasR=baseSources.some(s=>s.options.includes('R'))
  if(n.includes('dark ritual'))return hasB?[source(['B'],c.name),source(['B'],c.name)]:[]
  if(n.includes('cabal ritual'))return hasB&&baseSources.length>=2?[source(['B'],c.name)]:[]
  if(n.includes('culling the weak')){const creature=battlefield.some(x=>x.isCreature);return hasB&&creature?[source(['B'],c.name),source(['B'],c.name),source(['B'],c.name)]:[]}
  if(n.includes('rite of flame'))return hasR?[source(['R'],c.name)]:[]
  if(n.includes('elvish spirit guide'))return [source(['G'],c.name)]
  if(n.includes('simian spirit guide'))return [source(['R'],c.name)]
  if(n.includes('lotus petal'))return [source(any,c.name)]
  if(n.includes("lion's eye diamond"))return forCommander?[source(any,c.name),source(any,c.name),source(any,c.name)]:[]
  if(n.includes('mana vault'))return baseSources.length>=1?[source(['C'],c.name),source(['C'],c.name)]:[]
  if(n.includes('grim monolith'))return baseSources.length>=2?[source(['C'],c.name)]:[]
  if(n.includes('jeweled lotus'))return forCommander?[source(any,c.name),source(any,c.name),source(any,c.name)]:[]
  return [source(c.sourceColors?.length?c.sourceColors:['C'],c.name)]
}
function paymentOptions(card,tax=0){const req=card.manaReq||{generic:Math.max(0,Number(card.cmc||0)),colored:[]},colored=(req.colored||[]).map(opts=>opts.length?opts:['C']),represented=Number(req.generic||0)+colored.length,total=Math.max(Number(card.cmc||represented),represented)+tax,generic=Math.max(Number(req.generic||0)+tax,total-colored.length);return {colored,generic,total}}
function paymentIndices(card,sources,tax=0){const req=paymentOptions(card,tax);if(sources.length<req.total)return null;const pips=[...req.colored].sort((a,b)=>a.length-b.length),used=new Set();function place(i){if(i>=pips.length){const remaining=[];for(let s=0;s<sources.length;s++)if(!used.has(s))remaining.push(s);if(remaining.length<req.generic)return null;return new Set([...used,...remaining.slice(0,req.generic)])}for(let s=0;s<sources.length;s++){if(used.has(s)||!pips[i].some(c=>sources[s].options.includes(c)))continue;used.add(s);const result=place(i+1);if(result)return result;used.delete(s)}return null}return place(0)}
export function canPay(card,sources,tax=0){return paymentIndices(card,sources,tax)!==null}
function payAndRemain(card,sources,tax=0){const used=paymentIndices(card,sources,tax);return used?[...sources].filter((_,i)=>!used.has(i)):null}
function canPayPair(a,b,sources){const ra=paymentOptions(a),rb=paymentOptions(b),fake={cmc:ra.total+rb.total,manaReq:{generic:ra.generic+rb.generic,colored:[...ra.colored,...rb.colored],total:ra.total+rb.total}};return canPay(fake,sources)}
function potentialSources(activeSources,hand,used,forCommander=false,battlefield=[]){const out=[...activeSources];const bursts=hand.filter(c=>!used.has(c)&&isBurst(c)).sort((a,b)=>burstPriority(a)-burstPriority(b)||a.name.localeCompare(b.name));for(const c of bursts)out.push(...burstNetSources(c,out,battlefield,forCommander));return out}
function chooseLand(hand,used,commander){const lands=hand.filter(c=>c.isLand&&!used.has(c));if(!lands.length)return null;const needs=new Set(commander?.manaReq?.colored?.flat()||[]);return [...lands].sort((a,b)=>{const score=c=>inferredLandColors(c).filter(x=>needs.has(x)).length*5+inferredLandColors(c).length-(alwaysTappedLand(c)?2:0);return score(b)-score(a)})[0]}
function castableCards(hand,used,sources,pred){return hand.filter(c=>!used.has(c)&&pred(c)&&canPay(c,sources))}
function cardByName(cards,name){const n=name.toLowerCase();return cards.find(c=>c.name.toLowerCase()===n)}
function pairOperational(a,b,battlefield,currentSources,priorSources,priorHandSet){const aBoard=battlefield.includes(a),bBoard=battlefield.includes(b);if(aBoard&&bBoard)return true;if(aBoard)return canPay(b,currentSources);if(bBoard)return canPay(a,currentSources);if(canPayPair(a,b,currentSources))return true;const aWasKnown=priorHandSet.has(a),bWasKnown=priorHandSet.has(b);if(aWasKnown&&isPermanentCard(a)&&canPay(a,priorSources)&&canPay(b,currentSources))return true;if(bWasKnown&&isPermanentCard(b)&&canPay(b,priorSources)&&canPay(a,currentSources))return true;return false}
function operationalPackage(hand,priorHand,battlefield,used,packages,currentSources,priorSources){const available=[...battlefield,...hand.filter(c=>!used.has(c)),...priorHand],priorSet=new Set(priorHand);for(const p of packages.filter(x=>x.id!=='early-commander')){const producers=(p.producerCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean),payoffs=(p.payoffCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean);for(const a of producers)for(const b of payoffs){if(a.name.toLowerCase()===b.name.toLowerCase())continue;if(pairOperational(a,b,battlefield,currentSources,priorSources,priorSet))return {ok:true,packageId:p.id}}}return {ok:false,packageId:null}}
function comboAccessible(hand,priorHand,battlefield,used,combos,currentSources,priorSources){if(!combos?.length)return false;const available=[...battlefield,...hand.filter(c=>!used.has(c)),...priorHand],priorSet=new Set(priorHand);for(const combo of combos){const pieces=combo.cards.map(n=>cardByName(available,n)).filter(Boolean);if(pieces.length!==combo.cards.length)continue;if(pieces.length===2&&pairOperational(pieces[0],pieces[1],battlefield,currentSources,priorSources,priorSet))return true;if(pieces.every(c=>battlefield.includes(c)||canPay(c,currentSources)))return true}return false}

function keepOpeningHand(hand){const lands=hand.filter(c=>c.isLand).length,early=hand.some(c=>!c.isLand&&((c.cmc||0)<=2||c.tags?.includes('fast-mana')||c.tags?.includes('land-ramp')));return lands>=2&&lands<=5&&early}
function bottomKeepValue(c,commander,landCount){
  if(c.isLand){const needs=new Set(commander?.manaReq?.colored?.flat()||[]),colorHits=inferredLandColors(c).filter(x=>needs.has(x)).length;return landCount>3?-8+colorHits+(alwaysTappedLand(c)?-1:0):5+colorHits}
  let v=0
  if(c.tags?.includes('fast-mana')||c.tags?.includes('land-ramp'))v+=8
  if((c.cmc||0)<=2)v+=4
  if(c.tags?.includes('draw')||c.interaction>0)v+=2
  if((c.cmc||0)>=5)v-=4
  if((c.cmc||0)>=7)v-=2
  return v
}
export function applyCommanderLondonBottom(hand,penalty,commander=null){
  if(penalty<=0)return {hand:[...hand],bottom:[]}
  const landCount=hand.filter(c=>c.isLand).length,ranked=[...hand].map((c,i)=>({c,i,v:bottomKeepValue(c,commander,landCount)})).sort((a,b)=>a.v-b.v||b.i-a.i),bottom=ranked.slice(0,Math.min(penalty,hand.length)).map(x=>x.c),bottomSet=new Set(bottom)
  return {hand:hand.filter(c=>!bottomSet.has(c)),bottom}
}
function openingHand(libBase,commander,rng){
  let lib=[],hand=[],mulligans=0
  while(true){lib=shuffle(libBase,rng);hand=lib.splice(0,7);if(keepOpeningHand(hand)||mulligans>=2)break;mulligans++}
  const penalty=Math.max(0,mulligans-1),adjusted=applyCommanderLondonBottom(hand,penalty,commander);lib.push(...adjusted.bottom)
  return {lib,hand:adjusted.hand,mulligans,penalty}
}

export function simulateSequences(cards,commander,packages,combos=[],iterations=3000,maxTurn=7,rng=Math.random){
  const libBase=cards.filter(c=>!commander||c.name.toLowerCase()!==commander.name.toLowerCase()||c.__keepIn99),samples=[],cmdTurns=[],engineTurns=[],recoverySamples=[]
  const turnStats=Array.from({length:maxTurn},()=>({cmd:0,engine:0,interaction:0,resource:0,burst:0,total:0}))
  for(let it=0;it<iterations;it++){
    let {lib,hand}=openingHand(libBase,commander,rng)
    const used=new Set(),battlefield=[],activeSources=[]
    let pendingSources=[],priorSources=[],cmdTurn=null,engineTurn=null,peak=0,sum=0,recovered=false,disruptedPackageId=null
    for(let turn=1;turn<=maxTurn;turn++){
      activeSources.push(...pendingSources);pendingSources=[];const priorHand=[...hand];if(lib.length)hand.push(lib.shift())
      const land=chooseLand(hand,used,commander);if(land){used.add(land);battlefield.push(land);const src=baseLandSource(land);if(alwaysTappedLand(land))pendingSources.push(src);else activeSources.push(src)}
      let turnSources=[...activeSources]
      const rampCandidates=castableCards(hand,used,turnSources,isPermanentRamp).map(card=>({card,support:permanentRampSupport(card,hand,used,battlefield,commander)})).filter(x=>x.support).sort((a,b)=>rampValue(b.card)-rampValue(a.card)||(a.card.cmc||0)-(b.card.cmc||0))
      const rampChoice=rampCandidates[0]
      if(rampChoice){const ramp=rampChoice.card,support=rampChoice.support,produced=permanentRampSources(ramp,commander,support),remaining=payAndRemain(ramp,turnSources);used.add(ramp);for(const costCard of support.consume||[])used.add(costCard);if(isPermanentCard(ramp))battlefield.push(ramp);if(remaining){if(isArtifact(ramp)){activeSources.push(...produced);turnSources=[...remaining,...produced]}else{turnSources=[...remaining];pendingSources.push(...produced)}}}
      const generalSources=potentialSources(turnSources,hand,used,false,battlefield),commanderSources=potentialSources(turnSources,hand,used,true,battlefield)
      if(commander&&cmdTurn==null&&canPay(commander,commanderSources)){cmdTurn=turn;battlefield.push(commander)}
      const engine=operationalPackage(hand,priorHand,battlefield,used,packages,generalSources,priorSources);if(engine.ok&&engineTurn==null)engineTurn=turn;if(turn===4&&engine.ok)disruptedPackageId=engine.packageId
      const interaction=castableCards(hand,used,generalSources,c=>c.interaction>0).length>0,resource=castableCards(hand,used,generalSources,c=>c.tags.includes('draw')||c.tags.includes('recursion')).length>0
      const manaBurst=generalSources.length>=turnSources.length+2,highImpact=castableCards(hand,used,generalSources,c=>c.tags.includes('extra-turn')||c.tags.includes('win')||c.tags.includes('cheat')).length>0,combo=comboAccessible(hand,priorHand,battlefield,used,combos,generalSources,priorSources),burst=manaBurst||highImpact||combo
      if(turn===5){const recast=commander?canPay(commander,commanderSources,2):false,alternateEngine=engine.ok&&(!disruptedPackageId||engine.packageId!==disruptedPackageId);recovered=resource||alternateEngine||recast;recoverySamples.push(recovered?1:0)}
      const cmdOnline=commander&&cmdTurn!=null&&cmdTurn<=turn,manaTempo=Math.min(1.35,activeSources.length/Math.max(2,turn+1)),state=100*Math.min(1,.27*manaTempo+.22*(engine.ok?1:0)+.14*(interaction?1:0)+.11*(resource?1:0)+.10*(cmdOnline?1:0)+.08*(burst?1:0)+.08*(combo?1:0))
      peak=Math.max(peak,state);sum+=state;const ts=turnStats[turn-1];ts.total++;ts.cmd+=cmdOnline?1:0;ts.engine+=engine.ok?1:0;ts.interaction+=interaction?1:0;ts.resource+=resource?1:0;ts.burst+=burst?1:0;priorSources=[...turnSources]
    }
    if(cmdTurn!=null)cmdTurns.push(cmdTurn);if(engineTurn!=null)engineTurns.push(engineTurn);samples.push({avg:sum/maxTurn,peak,cmdTurn:cmdTurn||maxTurn+1,engineTurn:engineTurn||maxTurn+1,recovered})
  }
  const avgs=samples.map(x=>x.avg),peaks=samples.map(x=>x.peak),floor=percentile(avgs,.20),median=percentile(avgs,.50),high=percentile(avgs,.80),peak=percentile(peaks,.80),q25=percentile(avgs,.25),q75=percentile(avgs,.75),iqr=q75-q25,consistency=Math.max(0,Math.min(100,100-iqr*2.2))
  const turnProfile=turnStats.map((s,i)=>({turn:i+1,commander:Math.round(s.cmd/Math.max(1,s.total)*100),engine:Math.round(s.engine/Math.max(1,s.total)*100),interaction:Math.round(s.interaction/Math.max(1,s.total)*100),resource:Math.round(s.resource/Math.max(1,s.total)*100),burst:Math.round(s.burst/Math.max(1,s.total)*100)}))
  return {iterations,floor:Math.round(floor),median:Math.round(median),high:Math.round(high),ceiling:Math.round(high),peak:Math.round(peak),iqr:Math.round(iqr),consistency:Math.round(consistency),commanderMedianTurn:cmdTurns.length?Math.round(percentile(cmdTurns,.5)*10)/10:null,engineMedianTurn:engineTurns.length?Math.round(percentile(engineTurns,.5)*10)/10:null,recoveryAfterDisruption:Math.round(recoverySamples.reduce((s,x)=>s+x,0)/Math.max(1,recoverySamples.length)*100),turnProfile}
}
