import fs from 'node:fs/promises'
import path from 'node:path'

const root=path.resolve('.')
const catalogPath=path.join(root,'public/precons/catalog.json')
const docsPath=path.join(root,'docs/PUBLIC_PRECONS.md')
const START='<!-- PRECON_SNAPSHOT_START -->'
const END='<!-- PRECON_SNAPSHOT_END -->'

const payload=JSON.parse(await fs.readFile(catalogPath,'utf8'))
const meta=payload?.meta||{}
if(!meta.total||!meta.analyzed||!meta.engineVersion||!meta.semanticVersion||!meta.generatedAt){
  throw new Error('catalog.json is missing required snapshot metadata')
}

const generatedDate=String(meta.generatedAt).slice(0,10)
const line=`Current reviewed snapshot: **${meta.total} canonical / ${meta.analyzed} analyzed / ${meta.unsupported} unsupported / ${meta.incomplete} incomplete**, generated ${generatedDate}, at ${Number(meta.iterations).toLocaleString('en-US')} sequences with engine \`${meta.engineVersion}\` / semantic \`${meta.semanticVersion}\`; source revision MTGJSON \`${meta.sourceRevision}\`.`
const docs=await fs.readFile(docsPath,'utf8')
const start=docs.indexOf(START),end=docs.indexOf(END)
if(start<0||end<0||end<start)throw new Error('PUBLIC_PRECONS.md snapshot markers are missing or malformed')
const next=`${docs.slice(0,start+START.length)}\n${line}\n${docs.slice(end)}`
await fs.writeFile(docsPath,next)
console.log(`PUBLIC_PRECONS.md synchronized to ${meta.semanticVersion} (${meta.total}/${meta.analyzed}).`)
