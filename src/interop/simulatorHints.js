import { tagsFor } from '../engine/cardFeatures.js'
import { ENGINE_VERSION, SEMANTIC_VERSION } from '../version.js'

export const SIMULATOR_HINT_SCHEMA_VERSION = 1
export const SIMULATOR_HINT_SAFETY = 'suggestion-only'

function normalizeCard(card = {}) {
  return {
    ...card,
    oracle: card.oracle ?? card.oracle_text ?? card.oracleText ?? '',
    type: card.type ?? card.type_line ?? card.frontType_line ?? '',
    name: card.name ?? card.cardNameEN ?? card.nameEN ?? card.cardName ?? ''
  }
}

function pushHint(hints, id, label, evidenceTags) {
  if (hints.some(hint => hint.id === id)) return
  hints.push({
    id,
    label,
    evidenceTags: [...new Set(evidenceTags)].sort()
  })
}

export function buildSimulatorHints(inputCard = {}) {
  const card = normalizeCard(inputCard)
  const tags = tagsFor(card)
  const tagSet = new Set(tags)
  const typeLine = String(card.type || '').toLowerCase()
  const hints = []

  if (tagSet.has('tokens')) {
    pushHint(hints, 'associated-tokens', 'Jetons associés', ['tokens'])
  }

  const counterTags = tags.filter(tag =>
    tag === 'counter-producer' ||
    tag === 'counter-payoff' ||
    tag === 'modified-payoff' ||
    tag.startsWith('counter-kind:')
  )
  if (counterTags.length > 0) {
    pushHint(hints, 'counters', 'Marqueurs', counterTags)
  }

  const sacrificeTags = tags.filter(tag =>
    tag === 'sacrifice' ||
    tag === 'sac-outlet' ||
    tag === 'sac-enabler'
  )
  if (sacrificeTags.length > 0) {
    pushHint(hints, 'sacrifice', 'Outils de sacrifice', sacrificeTags)
  }

  if (tagSet.has('draw')) {
    pushHint(hints, 'draw-helper', 'Outils de pioche', ['draw'])
  }

  const graveyardTags = tags.filter(tag =>
    tag === 'recursion' ||
    tag === 'graveyard-setup'
  )
  if (graveyardTags.length > 0) {
    pushHint(hints, 'graveyard-tools', 'Outils de cimetière', graveyardTags)
  }

  if (tagSet.has('lifegain')) {
    pushHint(hints, 'life-tools', 'Outils de points de vie', ['lifegain'])
  }

  if (/\baura\b/.test(typeLine)) {
    pushHint(hints, 'aura-attachment', 'Attachement Aura', ['type:aura'])
  }

  if (/\bequipment\b/.test(typeLine)) {
    pushHint(hints, 'equipment-attachment', 'Attachement Equipment', ['type:equipment'])
  }

  return {
    schemaVersion: SIMULATOR_HINT_SCHEMA_VERSION,
    safety: SIMULATOR_HINT_SAFETY,
    source: {
      engineVersion: ENGINE_VERSION,
      semanticVersion: SEMANTIC_VERSION
    },
    cardKey: String(inputCard.oracleId || card.name || '').trim().toLowerCase(),
    hints
  }
}
