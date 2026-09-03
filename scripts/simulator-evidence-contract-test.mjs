import assert from 'node:assert/strict'
import {
  buildSimulatorEvidenceCandidates,
  inspectSimulatorEvidenceBundle,
  SIMULATOR_EVIDENCE_SCHEMA_VERSION
} from '../src/interop/simulatorEvidence.js'

const trustedEntry = {
  cardKey: 'oracle:test',
  oracleId: 'test',
  oracleFingerprint: 'oracle-v1:abc',
  actionFingerprint: 'action-v1:def',
  action: { type: 'draw', amount: 2 },
  status: 'group_confirmed',
  observations: 12,
  confirmations: 6,
  rejections: 0,
  distinctSessions: 2,
  distinctVerifiers: 2,
  engineVerified: false
}

const bundle = {
  schemaVersion: SIMULATOR_EVIDENCE_SCHEMA_VERSION,
  kind: 'mtg-simulator-semantic-evidence',
  generatedAt: new Date().toISOString(),
  entries: [trustedEntry]
}

const inspected = inspectSimulatorEvidenceBundle(bundle)
assert.equal(inspected.valid, true)
assert.equal(inspected.candidates.length, 1)
assert.equal(inspected.candidates[0].safety, 'candidate-fixture-only')
assert.equal(inspected.candidates[0].changesScoring, false)

const forged = inspectSimulatorEvidenceBundle({
  ...bundle,
  entries: [{
    ...trustedEntry,
    status: 'group_confirmed',
    confirmations: 1,
    distinctSessions: 1,
    distinctVerifiers: 1
  }]
})
assert.equal(forged.candidates.length, 0)
assert.ok(forged.rejected[0].reasons.some(reason => reason.startsWith('insufficient-evidence:')))
assert.ok(forged.rejected[0].reasons.some(reason => reason.startsWith('status-mismatch:')))

const tamperedFingerprint = inspectSimulatorEvidenceBundle({
  ...bundle,
  entries: [{
    ...trustedEntry,
    action: { type: 'mill', amount: 2 }
  }]
})
assert.equal(tamperedFingerprint.candidates.length, 0)
assert.ok(tamperedFingerprint.rejected[0].reasons.includes('action-fingerprint-mismatch'))

const contested = buildSimulatorEvidenceCandidates({
  ...bundle,
  entries: [{
    ...trustedEntry,
    rejections: 1,
    status: 'contested'
  }]
})
assert.equal(contested.length, 0)

const unsupported = inspectSimulatorEvidenceBundle({
  ...bundle,
  entries: [{
    ...trustedEntry,
    action: { type: 'cast_spell', amount: 1 }
  }]
})
assert.equal(unsupported.candidates.length, 0)
assert.ok(unsupported.rejected[0].reasons.includes('unsupported-action'))

const privacyViolation = inspectSimulatorEvidenceBundle({
  ...bundle,
  verifierIds: ['should-not-exist']
})
assert.equal(privacyViolation.valid, false)
assert.ok(privacyViolation.errors.includes('private-identifiers-present'))

const fakeEngineVerified = inspectSimulatorEvidenceBundle({
  ...bundle,
  entries: [{ ...trustedEntry, engineVerified: true }]
})
assert.equal(fakeEngineVerified.candidates.length, 0)
assert.ok(fakeEngineVerified.rejected[0].reasons.includes('simulator-cannot-claim-engine-verified'))

console.log('SIMULATOR EVIDENCE CONTRACT OK — evidence creates candidates only, never scoring truth')
