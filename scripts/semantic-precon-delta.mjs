import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const baseline=process.argv[2]||'HEAD^'
const root=path.resolve('.')
const current=JSON.parse(await fs.readFile(path.join(root,'public/precons/catalog.json'),'utf8'))
const previous=JSON.parse(execFileSync('git',['show',`${baseline}:public/precons/catalog.json`],{encoding:'utf8',maxBuffer:20*1024*1024}))
const previousByHash=new Map((previous.data||[]).map(x=>[x.deckHash,x]))
const rows=[]
for(const deck of current.data||[]){
  const old=previousByHash.get(deck.deckHash)
  if(!old?.analysis||!deck.analysis)continue
  rows.push({
    slug:deck.slug,
    name:deck.name,
    median:deck.analysis.median-old.analysis.median,
    p20:deck.analysis.p20-old.analysis.p20,
    p80:deck.analysis.p80-old.analysis.p80,
    peak:deck.analysis.peak-old.analysis.peak,
    coverage:deck.analysis.coverage-old.analysis.coverage,
  })
}
const median=xs=>{const a=[...xs].sort((a,b)=>a-b);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
const summary=key=>{
  const xs=rows.map(r=>r[key]),sum=xs.reduce((a,b)=>a+b,0)
  return {mean:xs.length?sum/xs.length:0,median:median(xs),min:xs.length?Math.min(...xs):0,max:xs.length?Math.max(...xs):0,positive:xs.filter(x=>x>0).length,zero:xs.filter(x=>x===0).length,negative:xs.filter(x=>x<0).length}
}
const outliers=rows.filter(r=>Math.abs(r.median)>=3||Math.abs(r.peak)>=5).sort((a,b)=>Math.max(Math.abs(b.median),Math.abs(b.peak))-Math.max(Math.abs(a.median),Math.abs(a.peak))||a.name.localeCompare(b.name))
const report={
  baseline,
  fromSemantic:previous.meta?.semanticVersion||null,
  toSemantic:current.meta?.semanticVersion||null,
  matched:rows.length,
  totalCurrent:(current.data||[]).length,
  metrics:{median:summary('median'),p20:summary('p20'),p80:summary('p80'),peak:summary('peak'),coverage:summary('coverage')},
  within:{median1:rows.filter(r=>Math.abs(r.median)<=1).length,median2:rows.filter(r=>Math.abs(r.median)<=2).length,peak2:rows.filter(r=>Math.abs(r.peak)<=2).length},
  outliers,
}
const fmt=n=>Number(n).toFixed(2).replace(/\.00$/,'')
const lines=[
  `# Semantic precon delta`,
  ``,
  `Baseline: \`${baseline}\``,
  `Semantic: \`${report.fromSemantic}\` → \`${report.toSemantic}\``,
  `Matched analyzed decks: **${report.matched}**`,
  ``,
  `| Metric | Mean Δ | Median Δ | Min | Max | + / 0 / - |`,
  `|---|---:|---:|---:|---:|---:|`,
  ...['median','p20','p80','peak','coverage'].map(k=>{const s=report.metrics[k];return `| ${k} | ${fmt(s.mean)} | ${fmt(s.median)} | ${s.min} | ${s.max} | ${s.positive} / ${s.zero} / ${s.negative} |`}),
  ``,
  `Median |Δ| ≤ 1: **${report.within.median1}/${report.matched}**`,
  `Median |Δ| ≤ 2: **${report.within.median2}/${report.matched}**`,
  `Peak |Δ| ≤ 2: **${report.within.peak2}/${report.matched}**`,
  ``,
  `## Outliers (|Δmedian| ≥ 3 or |Δpeak| ≥ 5)`,
  ...(outliers.length?outliers.map(r=>`- ${r.name} (${r.slug}): median ${r.median>=0?'+':''}${r.median}, P20 ${r.p20>=0?'+':''}${r.p20}, P80 ${r.p80>=0?'+':''}${r.p80}, peak ${r.peak>=0?'+':''}${r.peak}, coverage ${r.coverage>=0?'+':''}${r.coverage}`):['- none']),
  ``,
]
await fs.mkdir(path.join(root,'calibration'),{recursive:true})
await fs.writeFile(path.join(root,'calibration','semantic-precon-delta.json'),JSON.stringify(report,null,2)+'\n')
await fs.writeFile(path.join(root,'calibration','semantic-precon-delta.md'),lines.join('\n'))
console.log(lines.join('\n'))