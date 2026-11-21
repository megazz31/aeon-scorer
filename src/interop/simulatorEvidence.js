export const SIMULATOR_EVIDENCE_SCHEMA_VERSION = 1

const SUPPORTED_ACTIONS = new Set([
  'draw',
  'mill',
  'create_token',
  'add_counter'
])

function asInt(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function normalizeName(value) {
  return normalizeText(value).toLowerCase()
}

function fnv1a(value) {
  let hash = 0x811c9dc5
  const text = String(value || '')
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function canonicalActionDescriptor(action = {}) {
  const type = String(action.type || action.action || '').trim()
  const amount = Math.max(1, Math.min(99, Number.parseInt(action.amount, 10) || 1))
  const descriptor = { type, amount }

  if (type === 'add_counter') {
    descriptor.counterName = normalizeText(action.counterName).toLowerCase()
  }
  if (type === 'create_token') {
    descriptor.tokenKey = String(action.tokenKey || '').trim()
    descriptor.tokenName = normalizeName(descriptor.tokenKey.split('|')[0])
  }

  return descriptor
}

function actionFingerprint(action = {}) {
  return `action-v1:${fnv1a(JSON.stringify(canonicalActionDescriptor(action)))}`
}

function recomputeStatus(entry = {}) {
  const confirmations = asInt(entry.confirmations)
  const rejections = asInt(entry.rejections)
  const sessions = asInt(entry.distinctSessions)
  const verifiers = asInt(entry.distinctVerifiers)

  if (rejections > 0) return 'contested'
  if (confirmations >= 6 && verifiers >= 2 && sessions >= 2) return 'group_confirmed'
  if (confirmations >= 8 && sessions >= 3) return 'local_trusted'
  if (confirmations > 0) return 'confirmed'
  if (asInt(entry.observations) > 0) return 'observed'
  return 'unseen'
}

function hasPrivateIdentifiers(bundle) {
  const serialized = JSON.stringify(bundle)
  return /"verifierIds?"|"sessionIds?"|"eventIds?"/.test(serialized)
}

function validateAction(action = {}) {
  if (!SUPPORTED_ACTIONS.has(action.type)) return 'unsupported-action'
  const amount = asInt(action.amount)
  if (amount < 1 || amount > 99) return 'invalid-amount'
  if (action.type === 'add_counter' && !String(action.counterName || '').trim()) {
    return 'missing-counter-name'
  }
  if (action.type === 'create_token' && !String(action.tokenKey || '').trim()) {
    return 'missing-token-key'
  }
  return null
}

export function inspectSimulatorEvidenceBundle(bundle = {}) {
  const errors = []
  if (bundle.schemaVersion !== SIMULATOR_EVIDENCE_SCHEMA_VERSION) {
    errors.push('unsupported-schema')
  }
  if (bundle.kind !== 'mtg-simulator-semantic-evidence') {
    errors.push('invalid-kind')
  }
  if (!Array.isArray(bundle.entries)) {
    errors.push('missing-entries')
  }
  if (hasPrivateIdentifiers(bundle)) {
    errors.push('private-identifiers-present')
  }

  const candidates = []
  const rejected = []

  if (errors.length > 0) {
    return { valid: false, errors, candidates, rejected }
  }

  for (const entry of bundle.entries) {
    const reasons = []
    const recomputedStatus = recomputeStatus(entry)

    if (!entry?.cardKey) reasons.push('missing-card-key')
    if (!entry?.oracleFingerprint) reasons.push('missing-oracle-fingerprint')
    if (!entry?.actionFingerprint) reasons.push('missing-action-fingerprint')
    if (
      entry?.actionFingerprint &&
      entry?.action &&
      entry.actionFingerprint !== actionFingerprint(entry.action)
    ) {
      reasons.push('action-fingerprint-mismatch')
    }
    if (entry?.engineVerified === true) reasons.push('simulator-cannot-claim-engine-verified')

    const actionError = validateAction(entry?.action)
    if (actionError) reasons.push(actionError)

    if (!['local_trusted', 'group_confirmed'].includes(recomputedStatus)) {
      reasons.push(`insufficient-evidence:${recomputedStatus}`)
    }

    if (entry?.status && entry.status !== recomputedStatus) {
      reasons.push(`status-mismatch:${entry.status}->${recomputedStatus}`)
    }

    if (reasons.length > 0) {
      rejected.push({
        cardKey: entry?.cardKey || null,
        actionFingerprint: entry?.actionFingerprint || null,
        reasons
      })
      continue
    }

    candidates.push({
      cardKey: entry.cardKey,
      oracleId: entry.oracleId || null,
      oracleFingerprint: entry.oracleFingerprint,
      actionFingerprint: entry.actionFingerprint,
      action: entry.action,
      evidence: {
        status: recomputedStatus,
        observations: asInt(entry.observations),
        confirmations: asInt(entry.confirmations),
        distinctSessions: asInt(entry.distinctSessions),
        distinctVerifiers: asInt(entry.distinctVerifiers),
        firstSeenAt: entry.firstSeenAt || null,
        lastSeenAt: entry.lastSeenAt || null
      },
      safety: 'candidate-fixture-only',
      changesScoring: false
    })
  }

  return {
    valid: true,
    errors: [],
    candidates,
    rejected
  }
}

export function buildSimulatorEvidenceCandidates(bundle = {}) {
  return inspectSimulatorEvidenceBundle(bundle).candidates
}
