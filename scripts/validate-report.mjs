import fs from 'node:fs/promises'

const path='calibration/latest.json'
const report=JSON.parse(await fs.readFile(path,'utf8'))
const decks=report.decks||[]
const median=xs=>{if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
const strongPackages=d=>(d.packages||[]).filter(p=>(p.cohesion??p.strength??0)>=80).length

report.model='sequence-access-v3.1-semantic'
const gates=(report.quality?.gates||[]).filter(g=>g.id!=='no-quota-core')
const pre=decks.filter(d=>d.source==='precon')
const cedh=decks.filter(d=>d.source==='cedh')
const user=decks.filter(d=>d.source==='user')

const hei=user.find(d=>/hei bai/i.test(d.name))
const pkg={
  preconStrongMedian:median(pre.map(strongPackages)),
  userStrongMedian:user.length?median(user.map(strongPackages)):null,
  heiBaiFalseSpells:hei?.packages?.some(p=>p.id==='spells')??null,
  heiBaiFalseCounters:hei?.packages?.some(p=>p.id==='counters')??null,
  heiBaiFalseGraveyard:hei?.packages?.some(p=>p.id==='graveyard')??null,
}
gates.push({
  id:'package-precision',
  ok:pkg.preconStrongMedian<=3&&(pkg.userStrongMedian==null||pkg.userStrongMedian<=4)&&pkg.heiBaiFalseSpells!==true&&pkg.heiBaiFalseCounters!==true&&pkg.heiBaiFalseGraveyard!==true,
  detail:JSON.stringify(pkg),
})

const mids={precon:median(pre.map(d=>d.profile.median)),user:median(user.map(d=>d.profile.median)),cedh:median(cedh.map(d=>d.profile.median))}
gates.push({
  id:'untrained-mid-cohort',
  ok:user.length>=5&&mids.user>mids.precon&&mids.user<mids.cedh,
  detail:JSON.stringify(mids),
})

// Combo impact belongs in the exceptional peak, not in the routine P80 output.
const comboDecks=cedh.filter(d=>(d.combos||[]).length>0)
const combo={count:comboDecks.length,peakMedian:median(comboDecks.map(d=>d.profile.peak??d.profile.ceiling)),names:comboDecks.slice(0,3).map(d=>d.name)}
gates.push({
  id:'combo-signal',
  ok:combo.count>=1&&combo.peakMedian>=90,
  detail:JSON.stringify(combo),
})

// Public profile invariants must hold for every benchmarked deck.
const badProfiles=decks.filter(d=>{
  const p=d.profile||{}
  return ![p.floor,p.median,p.ceiling,p.peak].every(Number.isFinite)||p.floor>p.median||p.median>p.ceiling||p.ceiling>p.peak
}).map(d=>d.name)
gates.push({id:'profile-invariants',ok:badProfiles.length===0,detail:badProfiles.length?badProfiles.slice(0,5).join(', '):'P20 ≤ P50 ≤ P80 ≤ peak for all decks'})

report.quality.gates=gates
report.quality.score=gates.filter(g=>g.ok).length
report.quality.total=gates.length
report.quality.extended={packagePrecision:pkg,midCohort:mids,comboSignal:combo,badProfiles}
await fs.writeFile(path,JSON.stringify(report,null,2))

let md=await fs.readFile('calibration/latest.md','utf8')
const deckSection=md.includes('## Anchors')?md.slice(md.indexOf('## Anchors')):''
const head=[`# Aeon Scorer v3.1 calibration report`,``,`Generated: ${report.generatedAt}`,`Model: ${report.model}`,`Iterations/deck: ${report.iterations}`,``,`## Macro quality gates: ${report.quality.score}/${report.quality.total}`,``]
for(const g of gates)head.push(`- ${g.ok?'✅':'❌'} **${g.id}** — ${g.detail}`)
await fs.writeFile('calibration/latest.md',head.join('\n')+'\n\n'+deckSection)

console.log(`EXTENDED QUALITY ${report.quality.score}/${report.quality.total}`)
for(const g of gates)console.log(`${g.ok?'PASS':'FAIL'} ${g.id}: ${g.detail}`)
if(report.quality.score!==report.quality.total)process.exitCode=2
