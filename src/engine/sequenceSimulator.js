function shuffle(arr, rng=Math.random) {
  const a=[...arr]
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a
}

function percentile(xs,p){
  if(!xs.length)return 0
  const a=[...xs].sort((x,y)=>x-y)
  const i=(a.length-1)*p, lo=Math.floor(i), hi=Math.ceil(i)
  return lo===hi?a[lo]:a[lo]*(hi-i)+a[hi]*(i-lo)
}

function isPermanentRamp(c){
  if(c.isLand)return false
  return (c.tags.includes('mana')||c.tags.includes('land-ramp'))&&!c.tags.includes('fast-mana')&&(c.cmc||0)<=3
}
function isBurst(c){ return c.tags.includes('fast-mana') }
function burstMana(c){
  const n=c.name.toLowerCase()
  if(n.includes('spirit guide')||n.includes('lotus petal'))return 1
  if(n.includes('dark ritual'))return 3
  if(n.includes('culling the weak'))return 4
  if(n.includes('mana crypt'))return 2
  if(n.includes('mana vault'))return 3
  if(n.includes('chrome mox')||n.includes('mox diamond'))return 1
  return 1
}

function capability(hand, packages, turn) {
  const has = tag => hand.some(c=>c.tags.includes(tag) && (c.cmc||0)<=turn+2)
  const interaction = has('removal')||has('counter')||has('wipe')||has('stax') ? 1 : 0
  const protection = has('protection') ? 1 : 0
  const rebuild = has('draw')||has('recursion') ? 1 : 0
  const tutor = has('tutor') ? 1 : 0
  const engine = packages.filter(p=>p.id!=='early-commander').some(p => {
    const names=new Set(hand.map(c=>c.name))
    const hits=[...(p.producers||[]),...(p.payoffs||[])].filter(n=>names.has(n)).length
    return hits>=2
  }) ? 1 : 0
  return {interaction,protection,rebuild,tutor,engine}
}

export function simulateSequences(cards, commander, packages, iterations=3000, maxTurn=7) {
  const libBase = cards.filter(c => !commander || c.name.toLowerCase()!==commander.name.toLowerCase() || c.__keepIn99)
  const samples=[]
  const cmdTurns=[]
  const turnStats=Array.from({length:maxTurn},()=>({cmd:0,engine:0,interaction:0,rebuild:0,explosive:0,total:0}))

  for(let it=0;it<iterations;it++){
    let lib=shuffle(libBase)
    let hand=lib.splice(0,7)
    for(let mull=0;mull<2;mull++){
      const lands=hand.filter(c=>c.isLand).length
      const early=hand.some(c=>!c.isLand&&(c.cmc||0)<=2)
      if(lands>=2&&lands<=5&&early)break
      lib=shuffle(libBase); hand=lib.splice(0,7)
    }

    let landsPlayed=0, ramp=0, cmdTurn=null, peak=0, sum=0
    const used=new Set()
    for(let turn=1;turn<=maxTurn;turn++){
      if(lib.length)hand.push(lib.shift())
      if(hand.some(c=>c.isLand&&!used.has(c))){
        const land=hand.find(c=>c.isLand&&!used.has(c)); used.add(land); landsPlayed++
      }
      let baseMana=landsPlayed+ramp
      let burst=0
      for(const c of hand){if(!used.has(c)&&isBurst(c))burst+=burstMana(c)}

      const rampCard=hand
        .filter(c=>!used.has(c)&&isPermanentRamp(c)&&(c.cmc||0)<=baseMana)
        .sort((a,b)=>(a.cmc||0)-(b.cmc||0))[0]
      if(rampCard){used.add(rampCard);ramp+=1;baseMana=Math.max(0,baseMana-(rampCard.cmc||0))}

      const effectiveMana=landsPlayed+ramp+burst
      if(commander&&cmdTurn==null&&effectiveMana>=(commander.cmc||0)) {
        cmdTurn=turn
        let needed=Math.max(0,(commander.cmc||0)-(landsPlayed+ramp))
        if(needed>0){
          const bursts=hand.filter(c=>!used.has(c)&&isBurst(c)).sort((a,b)=>burstMana(b)-burstMana(a))
          for(const c of bursts){if(needed<=0)break;used.add(c);needed-=burstMana(c)}
        }
      }

      const cap=capability(hand,packages,turn)
      const cmdOnline=commander&&cmdTurn!=null&&cmdTurn<=turn?1:0
      const explosive=(burst>=2||hand.some(c=>c.explosiveness>=2))?1:0
      const manaTempo=Math.min(1.5,effectiveMana/Math.max(2,turn+1))
      const state=100*Math.min(1,
        .25*manaTempo + .20*cap.engine + .14*cap.interaction + .10*cap.rebuild +
        .09*cap.protection + .08*cap.tutor + .08*cmdOnline + .06*explosive
      )
      peak=Math.max(peak,state);sum+=state
      const ts=turnStats[turn-1];ts.total++;ts.cmd+=cmdOnline;ts.engine+=cap.engine;ts.interaction+=cap.interaction;ts.rebuild+=cap.rebuild;ts.explosive+=explosive
    }
    if(cmdTurn!=null)cmdTurns.push(cmdTurn)
    samples.push({avg:sum/maxTurn,peak,cmdTurn:cmdTurn||maxTurn+1})
  }

  const avgs=samples.map(x=>x.avg), peaks=samples.map(x=>x.peak)
  const floor=percentile(avgs,.20), median=percentile(avgs,.50), ceiling=percentile(peaks,.80)
  const q25=percentile(avgs,.25), q75=percentile(avgs,.75)
  const variance=q75-q25
  const consistency=Math.max(0,Math.min(100,100-variance*2.2))
  const turnProfile=turnStats.map((s,i)=>({
    turn:i+1,
    commander:Math.round(s.cmd/s.total*100),
    engine:Math.round(s.engine/s.total*100),
    interaction:Math.round(s.interaction/s.total*100),
    rebuild:Math.round(s.rebuild/s.total*100),
    explosive:Math.round(s.explosive/s.total*100),
  }))
  return {
    iterations,
    floor:Math.round(floor),median:Math.round(median),ceiling:Math.round(ceiling),
    variance:Math.round(variance),consistency:Math.round(consistency),
    commanderMedianTurn:cmdTurns.length?Math.round(percentile(cmdTurns,.5)*10)/10:null,
    turnProfile,
  }
}
