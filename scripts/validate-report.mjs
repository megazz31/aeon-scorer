import fs from 'node:fs/promises'

const path='calibration/latest.json'
const report=JSON.parse(await fs.readFile(path,'utf8'))
const decks=report.decks||[]
const median=xs=>{if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
const strongPackages=d=>(d.packages||[]).filter(p=>p.strength>=80).length

// Remove the old declarative gate: quality must be demonstrated by observations.
const gates=(report.quality?.gates||[]).filter(g=>g.id!=='no-quota-core')
const pre=decks.filter(d=>d.source==='precon')
const cedh=decks.filter(d=>d.source==='cedh')
const user=decks.filter(d=>d.source==='user')

const pkg={
  preconStrongMedian:median(pre.map(strongPackages)),
  userStrongMedian:user.length?median(user.map(strongPackages)):null,
  heiBaiFalseSpells:user.find(d=>/hei bai/i.test(d.name))?.packages?.some(p=>p.id==='spells')??null,
}
gates.push({
  id:'package-precision',
  ok:pkg.preconStrongMedian<=3&&(pkg.userStrongMedian==null||pkg.userStrongMedian<=4)&&pkg.heiBaiFalseSpells!==true,
  detail:JSON.stringify(pkg),
})

// Personal/public cohort is not used as the low/high anchor. It should land between them as a holdout sanity check.
const mids={precon:median(pre.map(d=>d.profile.median)),user:median(user.map(d=>d.profile.median)),cedh:median(cedh.map(d=>d.profile.median))}
gates.push({
  id:'untrained-mid-cohort',
  ok:user.length>=5&&mids.user>mids.precon&&mids.user<mids.cedh,
  detail:JSON.stringify(mids),
})

// Known compact combo coverage should be visible in the competitive cohort and reach a high ceiling.
const comboDecks=cedh.filter(d=>(d.combos||[]).length>0)
const combo={count:comboDecks.length,ceilingMedian:median(comboDecks.map(d=>d.profile.ceiling)),names:comboDecks.slice(0,3).map(d=>d.name)}
gates.push({
  id:'combo-signal',
  ok:combo.count>=1&&combo.ceilingMedian>=90,
  detail:JSON.stringify(combo),
})

report.quality.gates=gates
report.quality.score=gates.filter(g=>g.ok).length
report.quality.total=gates.length
report.quality.extended={packagePrecision:pkg,midCohort:mids,comboSignal:combo}
await fs.writeFile(path,JSON.stringify(report,null,2))

// Regenerate the short markdown header/gates while preserving the deck table from benchmark output.
let md=await fs.readFile('calibration/latest.md','utf8')
const deckSection=md.includes('## Anchors')?md.slice(md.indexOf('## Anchors')):''
const head=[`# Aeon Scorer calibration report`,``,`Generated: ${report.generatedAt}`,`Model: ${report.model}`,`Iterations/deck: ${report.iterations}`,``,`## Quality gates: ${report.quality.score}/${report.quality.total}`,``]
for(const g of gates)head.push(`- ${g.ok?'✅':'❌'} **${g.id}** — ${g.detail}`)
await fs.writeFile('calibration/latest.md',head.join('\n')+'\n\n'+deckSection)

console.log(`EXTENDED QUALITY ${report.quality.score}/${report.quality.total}`)
for(const g of gates)console.log(`${g.ok?'PASS':'FAIL'} ${g.id}: ${g.detail}`)
if(report.quality.score!==report.quality.total)process.exitCode=2
