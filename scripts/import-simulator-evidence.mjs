import fs from 'node:fs/promises'
import { inspectSimulatorEvidenceBundle } from '../src/interop/simulatorEvidence.js'

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: npm run evidence:simulator -- path/to/evidence.json')
  process.exit(1)
}

const raw = await fs.readFile(filePath, 'utf8')
const bundle = JSON.parse(raw)
const result = inspectSimulatorEvidenceBundle(bundle)

process.stdout.write(JSON.stringify({
  valid: result.valid,
  errors: result.errors,
  candidateCount: result.candidates.length,
  rejectedCount: result.rejected.length,
  candidates: result.candidates,
  rejected: result.rejected
}, null, 2) + '\n')

if (!result.valid) process.exitCode = 1
