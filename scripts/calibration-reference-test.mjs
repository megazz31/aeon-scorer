import assert from 'node:assert/strict'
import fs from 'node:fs'
import { VALIDATED_CALIBRATION as ref } from '../src/calibrationReference.js'

const report=JSON.parse(fs.readFileSync(new URL('../calibration/latest.json',import.meta.url),'utf8'))
const all=report.quality?.separation?.all||{}
assert.equal(ref.generatedAt,report.generatedAt)
assert.equal(ref.model,report.model)
assert.equal(ref.benchmarkDecks,report.counts?.total)
assert.equal(ref.preconDecks,report.counts?.precon)
assert.equal(ref.cedhDecks,report.counts?.cedh)
assert.equal(ref.userDecks,report.counts?.user)
assert.equal(ref.preconMedian,all.preconMedian)
assert.equal(ref.cedhMedian,all.cedhMedian)
assert.equal(report.quality?.score,report.quality?.total,'visible references must only use a fully passing stored calibration report')
console.log(`CALIBRATION REFERENCE OK — precon ${ref.preconMedian}, cEDH ${ref.cedhMedian}, ${ref.benchmarkDecks} benchmark decks`)
