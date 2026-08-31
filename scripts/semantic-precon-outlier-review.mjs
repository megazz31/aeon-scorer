import fs from 'node:fs'
import path from 'node:path'

const deltaPath=path.resolve('calibration/semantic-precon-delta.json')
const preconDir=path.resolve('public/precons')
const outJson=path.resolve('calibration/semantic-outlier-review.json')
const outMd=path.resolve('calibration/semantic-outlier-review.md')

const delta=JSON.parse(fs.readFileSync(deltaPath,'utf8'))
const outliers=Array.isArray(delta.outliers)?delta.outliers:[]
const rows=[]
const topNames=xs=>(xs||[]).slice(0,8).map(x=>typeof x==='string'?x:x?.name).filter(Boolean)

for(const d of outliers){
  const file=path.join(preconDir,`${d.slug}.json`)
  if(!fs.existsSync(file))continue
  const deck=JSON.parse(fs.readFileSync(file,'utf8')),r=deck.result||{},p=r.profile||{},dims=r.dimensions||{},roles=r.roles||{},cmd=r.commanderSynergy||{}
  rows.push({
    slug:d.slug,name:d.name,commander:deck.commanderName||null,
    delta:{median:d.median,p20:d.p20,p80:d.p80,peak:d.peak,coverage:d.coverage},
    current:{median:p.median,p20:p.floor,p80:p.ceiling,peak:p.peak,coverage:p.coverage,dimensions:dims,roles,commanderSynergy:{score:cmd.score??0,tags:cmd.tags||[],connectedCount:(cmd.connected||[]).length},packages:(r.packages||[]).map(x=>({id:x.id,name:x.name,cohesion:x.cohesion??x.strength??0,producers:(x.producerCards||[]).length||topNames(x.producers).length,payoffs:(x.payoffCards||[]).length||topNames(x.payoffs).length,members:(x.members||[]).length,evidence:x.evidence||null})).slice(0,5),combos:(r.combos||[]).map(x=>({name:x.name,severity:x.severity,family:x.family||null})),limitations:r.methodology?.limitations||[]}
  })
}

rows.sort((a,b)=>Math.abs(b.delta.median)-Math.abs(a.delta.median)||Math.abs(b.delta.peak)-Math.abs(a.delta.peak))
fs.writeFileSync(outJson,JSON.stringify({semantic:delta.toSemantic,baseline:delta.fromSemantic,rows},null,2)+'\n')

const lines=['# Semantic precon outlier review','',`Semantic: \`${delta.fromSemantic}\` → \`${delta.toSemantic}\``,`Reviewed outliers: **${rows.length}**`,'']
for(const x of rows){
  const d=x.current.dimensions||{},r=x.current.roles||{}
  lines.push(`## ${x.name} — ${x.commander||'Unknown commander'}`,'',`- Δ median **${x.delta.median>=0?'+':''}${x.delta.median}**, Δ peak **${x.delta.peak>=0?'+':''}${x.delta.peak}**; current **${x.current.median} [${x.current.p20}-${x.current.p80}]**, peak **${x.current.peak}**.`)
  lines.push(`- Dimensions: speed ${d.speed??'-'}, consistency ${d.consistency??'-'}, synergy ${d.synergy??'-'}, interaction ${d.interaction??'-'}, resilience ${d.resilience??'-'}, explosiveness ${d.explosiveness??'-'}.`)
  lines.push(`- Roles: lands ${r.lands??'-'}, draw ${r.draw??'-'}, tutors ${r.tutors??'-'}, fast mana ${r.fastMana??'-'}, protection ${r.protection??'-'}, recursion ${r.recursion??'-'}.`)
  lines.push(`- Commander synergy: **${x.current.commanderSynergy.score}**, connected ${x.current.commanderSynergy.connectedCount}, tags ${x.current.commanderSynergy.tags.join(', ')||'none'}.`)
  if(x.current.packages.length)lines.push(`- Packages: ${x.current.packages.map(p=>`${p.name} ${p.cohesion}/100 (${p.members} members; ${p.producers} producers / ${p.payoffs} payoffs)`).join(' · ')}.`)
  if(x.current.combos.length)lines.push(`- Combos: ${x.current.combos.map(c=>`${c.name}${c.family?` [${c.family}]`:''}`).join(' · ')}.`)
  if(x.current.limitations.length)lines.push(`- Limitations: ${x.current.limitations.join(', ')}.`)
  lines.push('')
}
fs.writeFileSync(outMd,lines.join('\n')+'\n')
console.log(`SEMANTIC OUTLIER REVIEW OK — ${rows.length} detailed precon outliers written`)
