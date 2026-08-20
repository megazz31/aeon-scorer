import fs from 'node:fs/promises'

const a=JSON.parse(await fs.readFile('calibration/run-1800.json','utf8'))
const b=JSON.parse(await fs.readFile('calibration/run-3200.json','utf8'))
const key=d=>`${d.source}::${d.name}`
const bm=new Map((b.decks||[]).map(d=>[key(d),d]))
const rows=[]
for(const x of (a.decks||[])){
  const y=bm.get(key(x));if(!y)continue
  rows.push({name:x.name,source:x.source,median:Math.abs(x.profile.median-y.profile.median),floor:Math.abs(x.profile.floor-y.profile.floor),ceiling:Math.abs(x.profile.ceiling-y.profile.ceiling),peak:Math.abs((x.profile.peak??x.profile.ceiling)-(y.profile.peak??y.profile.ceiling))})
}
const median=xs=>{if(!xs.length)return 0;const s=[...xs].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
const max=(field)=>Math.max(0,...rows.map(r=>r[field]))
const cohort=(report,source)=>median((report.decks||[]).filter(d=>d.source===source).map(d=>d.profile.median))
const cohortDelta={precon:Math.abs(cohort(a,'precon')-cohort(b,'precon')),user:Math.abs(cohort(a,'user')-cohort(b,'user')),cedh:Math.abs(cohort(a,'cedh')-cohort(b,'cedh'))}
const summary={matched:rows.length,maxMedianDelta:max('median'),maxFloorDelta:max('floor'),maxCeilingDelta:max('ceiling'),maxPeakDelta:max('peak'),cohortDelta}
const ok=rows.length>=30&&summary.maxMedianDelta<=3&&summary.maxFloorDelta<=5&&summary.maxCeilingDelta<=5&&Math.max(...Object.values(cohortDelta))<=2
console.log(`${ok?'SAMPLING CONVERGENCE OK':'SAMPLING CONVERGENCE FAIL'} — ${JSON.stringify(summary)}`)
if(!ok){
  console.log('Largest median deltas:',rows.sort((x,y)=>y.median-x.median).slice(0,8))
  process.exitCode=2
}
