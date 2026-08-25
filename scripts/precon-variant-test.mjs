import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { buildPreconVariant,PRECON_COMMANDER_VARIANTS } from './build-precon-variants.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const spec=PRECON_COMMANDER_VARIANTS.find(x=>x.commanderName==='Ureni of the Unwritten')
assert.ok(spec,'Ureni must remain a curated official alternate commander variant')
const base=JSON.parse(fs.readFileSync(path.join(root,'public','precons',`${spec.baseSlug}.json`),'utf8'))
assert.equal(base.commanderName,"Eshki, Temur's Roar")
assert.match(base.decklist,/1 Ureni of the Unwritten/)

const variant=buildPreconVariant(base,spec,{iterations:180})
assert.equal(variant.commanderName,'Ureni of the Unwritten')
assert.equal(variant.variantOf,'temur-roar-tdc')
assert.equal(variant.analysisVariant,true)
assert.equal(variant.cardCount,99)
assert.ok(!variant.decklist.includes('Ureni of the Unwritten'),'Ureni must leave the 99 when promoted to the command zone')
assert.match(variant.decklist,/1 Eshki, Temur's Roar/,'Eshki must move into the 99')
assert.deepEqual(variant.result.commanderNames,['Ureni of the Unwritten'])
for(const key of ['median','p20','p80','peak','coverage'])assert.ok(Number.isFinite(Number(variant.analysis[key])),`${key} must be numeric`)
console.log(`PRECON VARIANT CONTRACT OK · Ureni median ${variant.analysis.median} at 180 test iterations`)
