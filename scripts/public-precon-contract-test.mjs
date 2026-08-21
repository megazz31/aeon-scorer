import fs from 'node:fs/promises'
import path from 'node:path'
import { strict as assert } from 'node:assert'
import { ENGINE_VERSION,SEMANTIC_VERSION } from '../src/version.js'
import { filterPublicDecks,publicDeckColorKey,publicDeckSpread,publicDeckStatus,sortPublicDecks } from '../src/publicDecksModel.js'

const root=path.resolve('.')
const migration=await fs.readFile(path.join(root,'supabase/migrations/20260821110000_aeon_public_precon_library.sql'),'utf8')
const generator=await fs.readFile(path.join(root,'scripts/generate-public-precons.mjs'),'utf8')
const page=await fs.readFile(path.join(root,'src/PublicDecksPage.jsx'),'utf8')

assert.match(migration,/create table if not exists public\.public_decks/i)
assert.match(migration,/create table if not exists public\.public_deck_analyses/i)
assert.match(migration,/enable row level security/i)
assert.match(migration,/grant select on table public\.public_decks to anon, authenticated/i)
assert.doesNotMatch(migration,/grant (?:insert|update|delete|all).*public_decks.*anon/i)
assert.match(generator,/\/commander\/i\.test/)
assert.match(generator,/AEON_PRECON_ITERATIONS\|\|3200/)
assert.match(generator,/byHash=new Map/)
assert.match(generator,/multiple_commanders_not_supported/)
assert.match(page,/medianMin/)
assert.match(page,/p20Min/)
assert.match(page,/p80Min/)
assert.match(page,/peakMin/)
assert.match(page,/colorMode/)
assert.match(page,/Re-audit needed/)

const base={analysis:{engineVersion:ENGINE_VERSION,semanticVersion:SEMANTIC_VERSION,median:50,p20:42,p80:58,peak:70,coverage:95},supported:true}
const rows=[
  {...base,name:'Alpha',commanderName:'One',releaseDate:'2024-01-01',colorIdentity:['W','U']},
  {...base,name:'Beta',commanderName:'Two',releaseDate:'2023-01-01',colorIdentity:['W','U','B'],analysis:{...base.analysis,median:61,p20:55,p80:66,peak:80}},
  {...base,name:'Gamma',commanderName:'Three',releaseDate:'2022-01-01',colorIdentity:[],analysis:null},
]
assert.equal(publicDeckStatus(rows[0],ENGINE_VERSION,SEMANTIC_VERSION),'current')
assert.equal(publicDeckStatus(rows[2],ENGINE_VERSION,SEMANTIC_VERSION),'pending')
assert.equal(publicDeckColorKey(rows[0]),'WU')
assert.equal(publicDeckColorKey(rows[2]),'C')
assert.equal(publicDeckSpread(rows[0]),16)
assert.deepEqual(filterPublicDecks(rows,{colors:['W','U'],colorMode:'exact'},{engineVersion:ENGINE_VERSION,semanticVersion:SEMANTIC_VERSION}).map(x=>x.name),['Alpha'])
assert.deepEqual(filterPublicDecks(rows,{colors:['W','U'],colorMode:'contains'},{engineVersion:ENGINE_VERSION,semanticVersion:SEMANTIC_VERSION}).map(x=>x.name),['Alpha','Beta'])
assert.deepEqual(filterPublicDecks(rows,{medianMin:60},{engineVersion:ENGINE_VERSION,semanticVersion:SEMANTIC_VERSION}).map(x=>x.name),['Beta'])
assert.equal(sortPublicDecks(rows,'peak','desc')[0].name,'Beta')

const catalogPath=path.join(root,'public/precons/catalog.json')
try{
  const payload=JSON.parse(await fs.readFile(catalogPath,'utf8')),catalog=payload.data||[]
  assert(catalog.length>0,'generated precon catalog must not be empty')
  assert.equal(payload.meta.engineVersion,ENGINE_VERSION)
  assert.equal(payload.meta.semanticVersion,SEMANTIC_VERSION)
  assert.equal(new Set(catalog.map(x=>x.slug)).size,catalog.length,'slugs must be unique')
  assert.equal(new Set(catalog.map(x=>x.deckHash)).size,catalog.length,'exact duplicate deck hashes must be collapsed')
  assert(catalog.some(x=>x.analysis),'catalog must contain analyzed precons')
  for(const deck of catalog){
    assert(deck.slug&&deck.deckHash&&deck.name&&deck.commanderName)
    const detail=JSON.parse(await fs.readFile(path.join(root,'public/precons',`${deck.slug}.json`),'utf8'))
    assert.equal(detail.deckHash,deck.deckHash)
    if(deck.analysis){for(const k of ['median','p20','p80','peak','coverage'])assert(Number(deck.analysis[k])>=0&&Number(deck.analysis[k])<=100,`${deck.name} ${k} outside 0..100`)}
  }
  console.log(`Public precon contract OK: ${catalog.length} canonical decks, ${catalog.filter(x=>x.analysis).length} analyzed.`)
}catch(e){
  if(e?.code==='ENOENT')console.log('Public precon contract OK (catalog not generated in this checkout yet).')
  else throw e
}
