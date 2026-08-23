import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { analyzePower } from '../src/engine/powerModel.js'
import { ENGINE_VERSION, SEMANTIC_VERSION } from '../src/version.js'

const root=path.resolve('.')
const SENTINEL_SLUGS=[
  'blood-rites-lcc',
  'explorers-of-the-deep-lcc',
  'cavalry-charge-moc',
  'creative-energy-m3c',
  'eldrazi-unbound-cmm',
  'deep-clue-sea-mkc',
  'animated-army-blc',
  'quick-draw-otc',
  'mutant-menace-pip',
  'peace-offering-blc'
]
const sortedPackageIds=result=>(result?.packages||[]).map(p=>p.id).sort()
function expandMainDeck(decklist,oracleCards,commanderName){
  const index=new Map(oracleCards.map(c=>[String(c.name||'').toLowerCase(),c])),out=[]
  for(const raw of String(decklist||'').split(/\r?\n/)){
    const m=raw.trim().match(/^(\d+)\s+(.+)$/);if(!m)continue
    const qty=Number(m[1])||0,name=m[2].trim(),key=name.toLowerCase()
    if(key===String(commanderName||'').toLowerCase())continue
    const source=index.get(key)
    assert.ok(source,`Oracle evidence missing decklist card: ${name}`)
    for(let i=0;i<qty;i++)out.push({...source,isCommander:false})
  }
  return out
}

console.log(`Running Fast Sentinel Precon Audit (${SENTINEL_SLUGS.length} diverse archetypes)...`)
const start=Date.now()
let validated=0

for(const slug of SENTINEL_SLUGS){
  const filePath=path.join(root,'public/precons',`${slug}.json`)
  const data=JSON.parse(await fs.readFile(filePath,'utf8'))
  const {name,commanderName,decklist,oracleCards,result:expected,analysis}=data
  assert.ok(name&&commanderName&&decklist&&Array.isArray(oracleCards),`${slug} invalid precon payload`)
  assert.ok(expected&&Array.isArray(expected.packages),`${slug} must contain its committed full analysis result`)
  assert.ok(analysis,`${slug} must contain a committed analysis summary`)
  assert.equal(analysis.engineVersion,ENGINE_VERSION,`${slug} stale engine snapshot`)
  assert.equal(analysis.semanticVersion,SEMANTIC_VERSION,`${slug} stale semantic snapshot`)

  const commanders=oracleCards.filter(c=>c.isCommander||c.name.toLowerCase()===commanderName.toLowerCase())
  assert.equal(commanders.length,1,`${slug} must have exactly one identified commander in Oracle evidence`)
  const commander={...commanders[0],isCommander:true}
  const cards=expandMainDeck(decklist,oracleCards,commanderName)
  assert.equal(cards.length,Number(data.cardCount),`${slug} expanded decklist must match cardCount`)
  const fastResult=analyzePower(cards,commander,null,400)

  assert.ok(Number.isFinite(fastResult.profile.median),`${slug} invalid median`)
  assert.ok(fastResult.profile.floor<=fastResult.profile.median,`${slug} floor > median`)
  assert.ok(fastResult.profile.median<=fastResult.profile.ceiling,`${slug} median > ceiling`)
  assert.ok(fastResult.profile.ceiling<=fastResult.profile.peak,`${slug} ceiling > peak`)
  assert.ok(Math.abs(fastResult.profile.median-analysis.median)<=6,`${slug} fast median drifted too far from 3200 snapshot: ${fastResult.profile.median} vs ${analysis.median}`)
  assert.deepEqual(sortedPackageIds(fastResult),sortedPackageIds(expected),`${slug} package graph differs from committed snapshot`)

  validated++
  console.log(`  ✓ ${name} [${fastResult.profile.median} (${fastResult.profile.floor}-${fastResult.profile.ceiling}) peak ${fastResult.profile.peak}] - ${fastResult.packages.length} pkg(s)`)
}

assert.equal(validated,SENTINEL_SLUGS.length,'every sentinel precon must be present and validated')
const elapsed=((Date.now()-start)/1000).toFixed(2)
console.log(`FAST SENTINEL PRECON AUDIT OK — ${validated} archetypes validated in ${elapsed}s.`)