function shuffle(arr,rng=Math.random){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function percentile(xs,p){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]*(hi-i)+a[hi]*(i-lo)}
const uniq=xs=>[...new Set(xs)]
const isBurst=c=>c.tags.includes('fast-mana')
const isPermanentRamp=c=>!c.isLand&&!isBurst(c)&&(c.tags.includes('land-ramp')||(c.sourceColors?.length||0)>0)&&(c.cmc||0)<=3
function alwaysTappedLand(c){
  const o=(c.oracle||'').toLowerCase()
  if(!/enters(?: the battlefield)? tapped/.test(o))return false
  return !/unless|you may pay|if you control|if an opponent|reveal [^.]* from your hand|as [^.]* enters/.test(o)
}
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
function permanentRampSource(c,commander){if(c.tags.includes('land-ramp')){const colors=commander?.manaReq?.colored?.flat()||['W','U','B','R','G'];return source(colors.length?colors:['W','U','B','R','G'],c.name)}return source(c.sourceColors?.length?c.sourceColors:['C'],c.name)}
function burstNetSources(c,baseSources,seenCards,forCommander=false){
  const n=c.name.toLowerCase(),any=['W','U','B','R','G'],hasB=baseSources.some(s=>s.options.includes('B'))
  if(n.includes('dark ritual'))return hasB?[source(['B'],c.name),source(['B'],c.name)]:[]
  if(n.includes('culling the weak')){const creature=seenCards.some(x=>x.isCreature&&x!==c);return hasB&&creature?[source(['B'],c.name),source(['B'],c.name),source(['B'],c.name)]:[]}
  if(n.includes('elvish spirit guide'))return [source(['G'],c.name)]
  if(n.includes('simian spirit guide'))return [source(['R'],c.name)]
  if(n.includes('lotus petal'))return [source(any,c.name)]
  if(n.includes('mana crypt'))return [source(['C'],c.name),source(['C'],c.name)]
  if(n.includes('mana vault'))return baseSources.length>=1?[source(['C'],c.name),source(['C'],c.name)]:[]
  if(n.includes('chrome mox')||n.includes('mox diamond'))return [source(any,c.name)]
  if(n.includes('jeweled lotus'))return forCommander?[source(any,c.name),source(any,c.name),source(any,c.name)]:[]
  return [source(c.sourceColors?.length?c.sourceColors:['C'],c.name)]
}
function paymentOptions(card,tax=0){const req=card.manaReq||{generic:Math.max(0,Number(card.cmc||0)),colored:[]},colored=(req.colored||[]).map(opts=>opts.length?opts:['C']),represented=Number(req.generic||0)+colored.length,total=Math.max(Number(card.cmc||represented),represented)+tax,generic=Math.max(Number(req.generic||0)+tax,total-colored.length);return {colored,generic,total}}
export function canPay(card,sources,tax=0){
  const req=paymentOptions(card,tax);if(sources.length<req.total)return false
  const pips=[...req.colored].sort((a,b)=>a.length-b.length),used=new Set()
  function place(i){if(i>=pips.length)return sources.length-used.size>=req.generic;for(let s=0;s<sources.length;s++){if(used.has(s)||!pips[i].some(c=>sources[s].options.includes(c)))continue;used.add(s);if(place(i+1))return true;used.delete(s)}return false}
  return place(0)
}
function potentialSources(activeSources,hand,used,forCommander=false){const out=[...activeSources],seen=hand.filter(c=>!used.has(c));for(const c of seen.filter(isBurst))out.push(...burstNetSources(c,out,seen,forCommander));return out}
function chooseLand(hand,used,commander){
  const lands=hand.filter(c=>c.isLand&&!used.has(c));if(!lands.length)return null
  const needs=new Set(commander?.manaReq?.colored?.flat()||[])
  return [...lands].sort((a,b)=>{const score=c=>inferredLandColors(c).filter(x=>needs.has(x)).length*5+inferredLandColors(c).length-(alwaysTappedLand(c)?2:0);return score(b)-score(a)})[0]
}
function castableCards(hand,used,sources,pred){return hand.filter(c=>!used.has(c)&&pred(c)&&canPay(c,sources))}
function cardByName(cards,name){const n=name.toLowerCase();return cards.find(c=>c.name.toLowerCase()===n)}
function operationalPackage(hand,battlefield,used,packages,sources,cumulativeMana){
  const available=[...battlefield,...hand.filter(c=>!used.has(c))]
  for(const p of packages.filter(x=>x.id!=='early-commander')){
    const producers=(p.producerCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean),payoffs=(p.payoffCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean)
    for(const a of producers)for(const b of payoffs){if(a.name.toLowerCase()===b.name.toLowerCase())continue;const aBoard=battlefield.includes(a),bBoard=battlefield.includes(b),deploy=(aBoard?0:Number(a.cmc||0))+(bBoard?0:Number(b.cmc||0));if(deploy>cumulativeMana)continue;if(!aBoard&&!canPay(a,sources))continue;if(!bBoard&&!canPay(b,sources))continue;return {ok:true,packageId:p.id}}
  }
  return {ok:false,packageId:null}
}
function comboAccessible(hand,battlefield,used,combos,sources,cumulativeMana){
  if(!combos?.length)return false
  const available=[...battlefield,...hand.filter(c=>!used.has(c))]
  for(const combo of combos){const pieces=combo.cards.map(n=>cardByName(available,n)).filter(Boolean);if(pieces.length!==combo.cards.length)continue;const deploy=pieces.filter(c=>!battlefield.includes(c)).reduce((s,c)=>s+Number(c.cmc||0),0);if(deploy<=cumulativeMana&&pieces.every(c=>battlefield.includes(c)||canPay(c,sources)))return true}
  return false
}

export function simulateSequences(cards,commander,packages,combos=[],iterations=3000,maxTurn=7,rng=Math.random){
  const libBase=cards.filter(c=>!commander||c.name.toLowerCase()!==commander.name.toLowerCase()||c.__keepIn99),samples=[],cmdTurns=[],engineTurns=[],recoverySamples=[]
  const turnStats=Array.from({length:maxTurn},()=>({cmd:0,engine:0,interaction:0,resource:0,burst:0,total:0}))
  for(let it=0;it<iterations;it++){
    let lib=shuffle(libBase,rng),hand=lib.splice(0,7)
    for(let mull=0;mull<2;mull++){const lands=hand.filter(c=>c.isLand).length,early=hand.some(c=>!c.isLand&&(c.cmc||0)<=2);if(lands>=2&&lands<=5&&early)break;lib=shuffle(libBase,rng);hand=lib.splice(0,7)}
    const used=new Set(),battlefield=[],activeSources=[]
    let pendingSources=[],cmdTurn=null,engineTurn=null,peak=0,sum=0,cumulativeMana=0,recovered=false,disruptedPackageId=null
    for(let turn=1;turn<=maxTurn;turn++){
      activeSources.push(...pendingSources);pendingSources=[]
      if(lib.length)hand.push(lib.shift())
      const land=chooseLand(hand,used,commander)
      if(land){used.add(land);battlefield.push(land);const src=baseLandSource(land);if(alwaysTappedLand(land))pendingSources.push(src);else activeSources.push(src)}
      const baseSources=[...activeSources];cumulativeMana+=baseSources.length
      const ramp=castableCards(hand,used,baseSources,isPermanentRamp).sort((a,b)=>(a.cmc||0)-(b.cmc||0))[0]
      if(ramp){used.add(ramp);battlefield.push(ramp);pendingSources.push(permanentRampSource(ramp,commander))}
      const generalSources=potentialSources(baseSources,hand,used,false),commanderSources=potentialSources(baseSources,hand,used,true)
      if(commander&&cmdTurn==null&&canPay(commander,commanderSources)){cmdTurn=turn;battlefield.push(commander)}
      const engine=operationalPackage(hand,battlefield,used,packages,generalSources,cumulativeMana)
      if(engine.ok&&engineTurn==null)engineTurn=turn;if(turn===4&&engine.ok)disruptedPackageId=engine.packageId
      const interaction=castableCards(hand,used,generalSources,c=>c.interaction>0).length>0,resource=castableCards(hand,used,generalSources,c=>c.tags.includes('draw')||c.tags.includes('recursion')).length>0
      const manaBurst=generalSources.length>=baseSources.length+2,highImpact=castableCards(hand,used,generalSources,c=>c.tags.includes('extra-turn')||c.tags.includes('win')||c.tags.includes('cheat')).length>0,combo=comboAccessible(hand,battlefield,used,combos,generalSources,cumulativeMana),burst=manaBurst||highImpact||combo
      if(turn===5){const recast=commander?canPay(commander,commanderSources,2):false,alternateEngine=engine.ok&&(!disruptedPackageId||engine.packageId!==disruptedPackageId);recovered=resource||alternateEngine||recast;recoverySamples.push(recovered?1:0)}
      const cmdOnline=commander&&cmdTurn!=null&&cmdTurn<=turn,manaTempo=Math.min(1.35,baseSources.length/Math.max(2,turn+1))
      const state=100*Math.min(1,.27*manaTempo+.22*(engine.ok?1:0)+.14*(interaction?1:0)+.11*(resource?1:0)+.10*(cmdOnline?1:0)+.08*(burst?1:0)+.08*(combo?1:0))
      peak=Math.max(peak,state);sum+=state
      const ts=turnStats[turn-1];ts.total++;ts.cmd+=cmdOnline?1:0;ts.engine+=engine.ok?1:0;ts.interaction+=interaction?1:0;ts.resource+=resource?1:0;ts.burst+=burst?1:0
    }
    if(cmdTurn!=null)cmdTurns.push(cmdTurn);if(engineTurn!=null)engineTurns.push(engineTurn);samples.push({avg:sum/maxTurn,peak,cmdTurn:cmdTurn||maxTurn+1,engineTurn:engineTurn||maxTurn+1,recovered})
  }
  const avgs=samples.map(x=>x.avg),peaks=samples.map(x=>x.peak),floor=percentile(avgs,.20),median=percentile(avgs,.50),high=percentile(avgs,.80),peak=percentile(peaks,.80),q25=percentile(avgs,.25),q75=percentile(avgs,.75),iqr=q75-q25,consistency=Math.max(0,Math.min(100,100-iqr*2.2))
  const turnProfile=turnStats.map((s,i)=>({turn:i+1,commander:Math.round(s.cmd/Math.max(1,s.total)*100),engine:Math.round(s.engine/Math.max(1,s.total)*100),interaction:Math.round(s.interaction/Math.max(1,s.total)*100),resource:Math.round(s.resource/Math.max(1,s.total)*100),burst:Math.round(s.burst/Math.max(1,s.total)*100)}))
  return {iterations,floor:Math.round(floor),median:Math.round(median),high:Math.round(high),ceiling:Math.round(high),peak:Math.round(peak),iqr:Math.round(iqr),consistency:Math.round(consistency),commanderMedianTurn:cmdTurns.length?Math.round(percentile(cmdTurns,.5)*10)/10:null,engineMedianTurn:engineTurns.length?Math.round(percentile(engineTurns,.5)*10)/10:null,recoveryAfterDisruption:Math.round(recoverySamples.reduce((s,x)=>s+x,0)/Math.max(1,recoverySamples.length)*100),turnProfile}
}