import assert from 'node:assert/strict'
import { summarizePreconCatalog } from '../api/precon-stats.js'

const analysis=(median)=>({median,p20:median-10,p80:median+10,peak:median+20,coverage:90})
const catalog={
  meta:{total:3,unsupported:1,incomplete:0,engineVersion:'3.3.0',semanticVersion:'3.3.0-semantic-15'},
  data:[
    {slug:'a',supported:true,analysis:analysis(40),releaseDate:'2024-01-01'},
    {slug:'b',supported:true,analysis:analysis(60),releaseDate:'2025-01-01'},
    {slug:'c',supported:false,analysis:null,releaseDate:'2026-01-01'},
    {slug:'b-alt',supported:true,analysis:analysis(100),analysisVariant:true,variantOf:'b',releaseDate:'2025-01-01'},
  ],
}

const stats=summarizePreconCatalog(catalog)
assert.equal(stats.total,3,'total must describe canonical products, not alternate commander analyses')
assert.equal(stats.catalogEntries,4,'catalog entry count must expose visible variants separately')
assert.equal(stats.analysisVariants,1)
assert.equal(stats.analyzed,2,'canonical analyzed count must exclude alternate commander variants')
assert.equal(stats.analyzedVariants,1)
assert.equal(stats.unsupported,1)
assert.equal(stats.reference.median,50,'reference median must not double-weight a precon through an alternate commander')
assert.equal(stats.reference.mean,50,'reference mean must stay canonical')
assert.equal(stats.methodology,'aggregate-over-supported-canonical-public-precons-v2')

console.log('PRECON STATS CONTRACT OK — canonical reference stats exclude alternate commander variants')
