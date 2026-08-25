import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { analyzePower } from '../src/engine/powerModel.js'
import { ENGINE_VERSION,SEMANTIC_VERSION } from '../src/version.js'

export const PRECON_COMMANDER_VARIANTS=[
  {
    baseSlug:'temur-roar-tdc',
    slug:'temur-roar-tdc-ureni',
    commanderName:'Ureni of the Unwritten',
    name:'Temur Roar — Ureni',
    reason:'official-secondary-commander',
  },
]

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const publicPrecons=path.join(repoRoot,'public','precons')
const distPrecons=path.join(repoRoot,'dist','precons')
const clean=s=>String(s||'').trim()
const key=s=>clean(s).toLowerCase()

function parseDecklist(text){
  return String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const m=line.match(/^(\d+)\s+(.+)$/)
    if(!m)throw new Error(`Invalid decklist line: ${line}`)
    return {quantity:Number(m[1]),name:m[2].trim()}
  })
}
function formatDecklist(rows){return rows.map(x=>`${x.quantity} ${x.name}`).join('\n')}
function expandRows(rows,byName){
  const out=[]
  for(const row of rows){
    const card=byName.get(key(row.name))
    if(!card)throw new Error(`Missing Oracle evidence for ${row.name}`)
    for(let i=0;i<row.quantity;i++)out.push({...card,isCommander:false})
  }
  return out
}
function sha256(value){return crypto.createHash('sha256').update(String(value)).digest('hex')}
function catalogEntry(detail){
  const {decklist,oracleCards,result,...summary}=detail
  return summary
}
function commanderImage(card){
  return card?.scryfallId?`https://api.scryfall.com/cards/${encodeURIComponent(card.scryfallId)}?format=image&version=normal`:null
}

export function buildPreconVariant(base,spec,{iterations=null}={}){
  if(!base?.supported||!base?.result||!base?.analysis)throw new Error(`${spec.baseSlug} must contain a current analyzed base precon.`)
  const byName=new Map((base.oracleCards||[]).map(c=>[key(c.name),c]))
  const newCommander=byName.get(key(spec.commanderName)),oldCommander=byName.get(key(base.commanderName))
  if(!newCommander)throw new Error(`${spec.commanderName} is not present in ${spec.baseSlug}.`)
  if(!oldCommander)throw new Error(`${base.commanderName} commander evidence is missing from ${spec.baseSlug}.`)
  const baseRows=parseDecklist(base.decklist),mainRows=[]
  let removed=0
  for(const row of baseRows){
    if(key(row.name)===key(spec.commanderName)){
      if(row.quantity!==1)throw new Error(`${spec.commanderName} must occur exactly once in the base 99.`)
      removed+=row.quantity
      continue
    }
    mainRows.push(row)
  }
  if(removed!==1)throw new Error(`${spec.commanderName} was not found exactly once in the base 99.`)
  mainRows.push({quantity:1,name:base.commanderName})
  const cardCount=mainRows.reduce((sum,x)=>sum+x.quantity,0)
  if(cardCount!==99)throw new Error(`Alternate command zone must leave 99 cards; got ${cardCount}.`)
  const rawCards=expandRows(mainRows,byName),commander={...newCommander,isCommander:true}
  const runIterations=iterations||Number(base.analysis.iterations)||3200
  const result=analyzePower(rawCards,commander,null,runIterations,{emitProduct:false,record:false})
  const decklist=formatDecklist(mainRows),oracleCards=(base.oracleCards||[]).map(c=>({...c,isCommander:key(c.name)===key(spec.commanderName)}))
  return {
    ...base,
    slug:spec.slug,
    deckHash:sha256(`${key(spec.commanderName)}\n${decklist.split(/\r?\n/).sort().join('\n')}`),
    name:spec.name,
    commanderName:spec.commanderName,
    commanderImageUrl:commanderImage(newCommander),
    commanderOracleId:newCommander.oracleId||null,
    colorIdentity:newCommander.colorIdentity||base.colorIdentity||[],
    analysisVariant:true,
    variantOf:base.slug,
    variantReason:spec.reason,
    originalCommanderName:base.commanderName,
    cardCount,
    decklist,
    oracleCards,
    analysis:{
      median:result.profile.median,
      p20:result.profile.floor,
      p80:result.profile.ceiling,
      peak:result.profile.peak,
      coverage:result.profile.coverage,
      engineVersion:ENGINE_VERSION,
      semanticVersion:SEMANTIC_VERSION,
      oracleSnapshotHash:base.analysis.oracleSnapshotHash||null,
      scryfallOracleDate:base.analysis.scryfallOracleDate||null,
      iterations:runIterations,
      analyzedAt:base.analysis.analyzedAt||null,
    },
    result,
  }
}

export function generatePreconVariants({sourceDir=publicPrecons,targetDir=distPrecons,iterations=null}={}){
  fs.mkdirSync(targetDir,{recursive:true})
  const catalogPath=path.join(targetDir,'catalog.json')
  if(!fs.existsSync(catalogPath))throw new Error('dist/precons/catalog.json is missing. Run vite build first.')
  const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'))
  let data=(catalog.data||[]).filter(x=>!PRECON_COMMANDER_VARIANTS.some(v=>v.slug===x.slug))
  for(const spec of PRECON_COMMANDER_VARIANTS){
    const basePath=path.join(sourceDir,`${spec.baseSlug}.json`)
    const base=JSON.parse(fs.readFileSync(basePath,'utf8'))
    const variant=buildPreconVariant(base,spec,{iterations})
    fs.writeFileSync(path.join(targetDir,`${spec.slug}.json`),`${JSON.stringify(variant,null,2)}\n`)
    data.push(catalogEntry(variant))
  }
  data.sort((a,b)=>String(b.releaseDate||'').localeCompare(String(a.releaseDate||''))||String(a.name||'').localeCompare(String(b.name||'')))
  catalog.data=data
  catalog.meta={...(catalog.meta||{}),analysisVariants:PRECON_COMMANDER_VARIANTS.length}
  fs.writeFileSync(catalogPath,`${JSON.stringify(catalog,null,2)}\n`)
  return {variants:PRECON_COMMANDER_VARIANTS.length,entries:data.length}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const out=generatePreconVariants()
  console.log(`PRECON COMMANDER VARIANTS OK · ${out.variants} variant(s), ${out.entries} catalog entries`)
}
