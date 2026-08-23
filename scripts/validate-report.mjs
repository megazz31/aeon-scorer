import fs from 'node:fs/promises'
import { AEON_LABEL, MODEL_ID } from '../src/version.js'

const path='calibration/latest.json'
const report=JSON.parse(await fs.readFile(path,'utf8'))
const decks=report.decks||[]
const median=xs=>{if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
const strongPackages=d=>(d.packages||[]).filter(p=>(p.cohesion??p.strength??0)>=80).length

report.model=MODEL_ID
const gates=(report.quality?.gates||[]).filter(g=>g.id!=='no-quota-core')
const pre=decks.filter(d=>d.source==='precon')
const cedh=decks.filter(d=>d.source==='cedh')
const user=decks.filter(d=>d.source==='user')

// Never make the model pass by relaxing the presentation-scale gate.
const strictScale={precon:median(pre.map(d=>d.profile.median)),cedh:median(cedh.map(d=>d.profile.median))}
const scaleIx=gates.findIndex(g=>g.id==='semantic-scale')
const strictScaleGate={id:'semantic-scale',ok:strictScale.precon>=42&&strictScale.precon<=55&&strictScale.cedh>=72&&strictScale.cedh<=88,detail:`strict precon ${strictScale.precon.toFixed(1)}, cEDH ${strictScale.cedh.toFixed(1)}`}
if(scaleIx>=0)gates[scaleIx]=strictScaleGate;else gates.push(strictScaleGate)

const hei=user.find(d=>/hei bai/i.test(d.name))
const heiIds=new Set((hei?.packages||[]).map(p=>p.id))
const pkg={
  preconStrongMedian:median(pre.map(strongPackages)),
  userStrongMedian:user.length?median(user.map(strongPackages)):null,
  heiBaiFound:!!hei,
  heiBaiHasEarly:heiIds.has('early-commander'),
  heiBaiHasBlink:heiIds.has('blink-etb'),
  heiBaiHasConstellation:heiIds.has('constellation'),
  heiBaiFalseSpells:heiIds.has('spells'),
  heiBaiFalseCounters:heiIds.has('counters'),
  heiBaiFalseGraveyard:heiIds.has('graveyard'),
  heiBaiT1Engine:hei?.simulation?.turnProfile?.find(x=>x.turn===1)?.engine??null,
}
gates.push({id:'package-precision',ok:pkg.preconStrongMedian<=3&&(pkg.userStrongMedian==null||pkg.userStrongMedian<=4),detail:JSON.stringify({preconStrongMedian:pkg.preconStrongMedian,userStrongMedian:pkg.userStrongMedian})})
gates.push({id:'hei-bai-real-regression',ok:pkg.heiBaiFound&&pkg.heiBaiHasEarly&&pkg.heiBaiHasBlink&&pkg.heiBaiHasConstellation&&!pkg.heiBaiFalseSpells&&!pkg.heiBaiFalseCounters&&!pkg.heiBaiFalseGraveyard&&(pkg.heiBaiT1Engine??100)<=5,detail:JSON.stringify(pkg)})

const mids={precon:strictScale.precon,user:median(user.map(d=>d.profile.median)),cedh:strictScale.cedh}
gates.push({id:'untrained-mid-cohort',ok:user.length>=5&&mids.user>mids.precon&&mids.user<mids.cedh,detail:JSON.stringify(mids)})

const comboDecks=cedh.filter(d=>(d.combos||[]).length>0)
const combo={count:comboDecks.length,peakMedian:median(comboDecks.map(d=>d.profile.peak??d.profile.ceiling)),names:comboDecks.slice(0,3).map(d=>d.name)}
gates.push({id:'combo-signal',ok:combo.count>=1&&combo.peakMedian>=90,detail:JSON.stringify(combo)})

const badProfiles=decks.filter(d=>{const p=d.profile||{};return ![p.floor,p.median,p.ceiling,p.peak].every(Number.isFinite)||p.floor>p.median||p.median>p.ceiling||p.ceiling>p.peak}).map(d=>d.name)
gates.push({id:'profile-invariants',ok:badProfiles.length===0,detail:badProfiles.length?badProfiles.slice(0,5).join(', '):'P20 ≤ P50 ≤ P80 ≤ peak for all decks'})

report.quality.gates=gates
report.quality.score=gates.filter(g=>g.ok).length
report.quality.total=gates.length
report.quality.extended={strictScale,packagePrecision:pkg,midCohort:mids,comboSignal:combo,badProfiles}
await fs.writeFile(path,JSON.stringify(report,null,2))

let md=await fs.readFile('calibration/latest.md','utf8')
const deckSection=md.includes('## Anchors')?md.slice(md.indexOf('## Anchors')):''
const head=[`# Aeon Scorer ${AEON_LABEL} calibration report`,``,`Generated: ${report.generatedAt}`,`Model: ${report.model}`,`Iterations/deck: ${report.iterations}`,``,`## Macro quality gates: ${report.quality.score}/${report.quality.total}`,``]
for(const g of gates)head.push(`- ${g.ok?'✅':'❌'} **${g.id}** — ${g.detail}`)
await fs.writeFile('calibration/latest.md',head.join('\n')+'\n\n'+deckSection)

console.log(`EXTENDED QUALITY ${report.quality.score}/${report.quality.total}`)
for(const g of gates)console.log(`${g.ok?'PASS':'FAIL'} ${g.id}: ${g.detail}`)
if(report.quality.score!==report.quality.total)process.exitCode=2
