import fs from 'node:fs/promises'
import path from 'node:path'

const root=path.resolve('.')
const catalogPath=path.join(root,'public/precons/catalog.json')
const docsPath=path.join(root,'docs/PUBLIC_PRECONS.md')
const payload=JSON.parse(await fs.readFile(catalogPath,'utf8'))
const meta=payload.meta||{}

for(const key of ['generatedAt','engineVersion','semanticVersion','iterations','sourceRevision','total','analyzed','unsupported','incomplete']){
  if(meta[key]===undefined||meta[key]===null)throw new Error(`catalog metadata missing ${key}`)
}

const generatedDate=String(meta.generatedAt).slice(0,10)
const line=`Current reviewed snapshot: **${meta.total} canonical / ${meta.analyzed} analyzed / ${meta.unsupported} unsupported / ${meta.incomplete} incomplete**, generated ${generatedDate}, at ${Number(meta.iterations).toLocaleString('en-US')} sequences with engine \`${meta.engineVersion}\` / semantic \`${meta.semanticVersion}\`; source revision MTGJSON \`${meta.sourceRevision}\`.`
const start='<!-- PRECON_SNAPSHOT_START -->'
const end='<!-- PRECON_SNAPSHOT_END -->'
const docs=await fs.readFile(docsPath,'utf8')
const a=docs.indexOf(start),b=docs.indexOf(end)
if(a<0||b<a)throw new Error('PUBLIC_PRECONS.md snapshot markers missing or malformed')
const next=docs.slice(0,a+start.length)+'\n'+line+'\n'+docs.slice(b)
if(next!==docs)await fs.writeFile(docsPath,next)
console.log(`PRECON DOC SNAPSHOT SYNCED — ${meta.total} canonical / ${meta.analyzed} analyzed / ${meta.semanticVersion}`)
