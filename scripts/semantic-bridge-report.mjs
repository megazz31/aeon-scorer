/**
 * Rapport avant/après du pont sémantique, sur le même jeu de 12 decks.
 *
 * « Avant » = heuristiques de texte d'aeon-scorer seules.
 * « Après » = mêmes heuristiques + rôles issus de la sémantique compilée par
 * MonSimulateur-MTG (module `src/engine/rulesSemantics.js`).
 *
 * Usage : node scripts/semantic-bridge-report.mjs [--iterations 3000] [--json]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { featureDeck } from '../src/engine/cardFeatures.js'
import { augmentFeatureDeck } from '../src/engine/semanticAugment.js'
import { analyzePower } from '../src/engine/powerModel.js'
import { RULES_SEMANTICS_ARTIFACT, rulesSemanticCoverage } from '../src/engine/rulesSemantics.js'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS_PATH = path.join(REPO_ROOT, 'semantic', 'corpus-archidekt-12.json')
const REPORT_PATH = path.join(REPO_ROOT, 'semantic', 'bridge-report.json')

const TYPE_TAGS = new Set(['land', 'creature', 'enchantment', 'artifact', 'instant', 'sorcery'])
const functionalTags = card => (card.tags ?? []).filter(tag => !TYPE_TAGS.has(tag) && !tag.startsWith('counter-kind:'))
const uniqueByName = cards => {
  const seen = new Map()
  for (const card of cards) if (!seen.has(card.name)) seen.set(card.name, card)
  return [...seen.values()]
}
const round = value => Math.round(value * 10) / 10
const median = values => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function roleCoverage(deck, bridge) {
  const featured = augmentFeatureDeck(featureDeck(deck.cards), { rulesSemantics: bridge })
  const heuristic = bridge ? augmentFeatureDeck(featureDeck(deck.cards), { rulesSemantics: false }) : featured
  const heuristicByName = new Map(heuristic.map(card => [card.name, card]))
  const unique = uniqueByName(featured)
  // La couverture se mesure sur les cartes heuristiques, pas sur les cartes déjà
  // augmentées, sinon le pont paraîtrait n'ajouter aucun rôle.
  const coverage = rulesSemanticCoverage(heuristic)
  const withRole = unique.filter(card => functionalTags(card).length > 0).length
  const withHeuristicRole = unique.filter(card => functionalTags(heuristicByName.get(card.name) ?? { tags: [] }).length > 0).length
  return {
    cards: unique.length,
    withRole,
    withHeuristicRole,
    withoutRole: unique.length - withRole,
    artifact: {
      exact: coverage.exact,
      partial: coverage.partial,
      refused: coverage.refused,
      uncompiled: coverage.uncompiled,
      unknownToArtifact: coverage.unknownToArtifact,
      heuristicOnly: coverage.heuristicOnly,
      bridged: coverage.bridged,
      tagsAdded: coverage.tagsAdded
    }
  }
}

function scoreDeck(deck, bridge, iterations) {
  const result = analyzePower(deck.cards, deck.commanders, null, iterations, { rulesSemantics: bridge, firstAccess: false })
  return {
    profile: {
      median: result.profile.median,
      p20: result.profile.floor,
      p80: result.profile.ceiling,
      peak: result.profile.peak,
      dispersion: result.profile.dispersion,
      consistency: result.profile.consistency,
      coverage: result.profile.coverage
    },
    dimensions: result.dimensions,
    roles: result.roles,
    packages: result.packages.map(pkg => ({ id: pkg.id, strength: pkg.strength, producers: pkg.producers?.length ?? 0, payoffs: pkg.payoffs?.length ?? 0 })),
    combos: result.combos.map(combo => combo.name)
  }
}

function packageSummary(packages) {
  return packages.map(pkg => pkg.id).sort().join(',') || '—'
}

async function main() {
  const argv = process.argv.slice(2)
  const iterationsIndex = argv.indexOf('--iterations')
  const iterations = iterationsIndex >= 0 ? Number(argv[iterationsIndex + 1]) : 3000
  const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8'))
  const corpusDecks = corpus.decks
  const decks = corpusDecks.map(deck => {
    const before = scoreDeck(deck, false, iterations)
    const after = scoreDeck(deck, true, iterations)
    return {
      id: deck.id,
      name: deck.name,
      commanders: deck.commanders.map(commander => commander.name),
      before: { ...before, coverage: roleCoverage(deck, false) },
      after: { ...after, coverage: roleCoverage(deck, true) }
    }
  })

  const totals = {
    uniqueCards: 0,
    artifact: RULES_SEMANTICS_ARTIFACT.counts,
    bridgedCards: 0,
    tagsAdded: {},
    withRoleBefore: 0,
    withRoleAfter: 0,
    withRoleCards: 0,
    cardsWithoutRoleBefore: 0,
    cardsWithoutRoleAfter: 0
  }
  const globalBefore = new Map()
  for (const deck of corpusDecks) {
    for (const card of uniqueByName(augmentFeatureDeck(featureDeck(deck.cards), { rulesSemantics: false }))) globalBefore.set(card.name, card)
  }
  const globalAfter = new Map()
  for (const deck of corpusDecks) {
    for (const card of uniqueByName(augmentFeatureDeck(featureDeck(deck.cards), { rulesSemantics: true }))) globalAfter.set(card.name, card)
  }
  for (const [name, card] of globalAfter) {
    const before = globalBefore.get(name)
    const beforeTags = functionalTags(before ?? { tags: [] })
    const afterTags = functionalTags(card)
    if (beforeTags.length) totals.withRoleBefore += 1
    if (afterTags.length) totals.withRoleAfter += 1
    else totals.cardsWithoutRoleAfter += 1
    if (!beforeTags.length) totals.cardsWithoutRoleBefore += 1
    const added = afterTags.filter(tag => !beforeTags.includes(tag))
    if (added.length) {
      totals.bridgedCards += 1
      for (const tag of added) totals.tagsAdded[tag] = (totals.tagsAdded[tag] ?? 0) + 1
    }
  }
  totals.withRoleCards = globalAfter.size
  totals.uniqueCards = globalAfter.size
  totals.tagsAdded = Object.fromEntries(Object.entries(totals.tagsAdded).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))

  const report = {
    iterations,
    semanticArtifact: {
      schemaVersion: RULES_SEMANTICS_ARTIFACT.schemaVersion,
      source: RULES_SEMANTICS_ARTIFACT.source,
      corpus: RULES_SEMANTICS_ARTIFACT.corpus,
      counts: RULES_SEMANTICS_ARTIFACT.counts
    },
    totals,
    decks: decks.map(deck => ({
      ...deck,
      deltas: {
        median: deck.after.profile.median - deck.before.profile.median,
        p20: deck.after.profile.p20 - deck.before.profile.p20,
        p80: deck.after.profile.p80 - deck.before.profile.p80,
        peak: deck.after.profile.peak - deck.before.profile.peak,
        consistency: deck.after.profile.consistency - deck.before.profile.consistency,
        packagesBefore: packageSummary(deck.before.packages),
        packagesAfter: packageSummary(deck.after.packages)
      }
    }))
  }
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)

  const lines = []
  lines.push(`# Pont sémantique rules-v2 — mesure sur ${decks.length} decks (${iterations} itérations)`)
  lines.push('')
  lines.push(`Artefact: ${RULES_SEMANTICS_ARTIFACT.counts.cards} cartes (${RULES_SEMANTICS_ARTIFACT.counts.exact} exact, ${RULES_SEMANTICS_ARTIFACT.counts.partial} partial, ${RULES_SEMANTICS_ARTIFACT.counts.refused} refusées, ${RULES_SEMANTICS_ARTIFACT.counts.uncompiled} non compilées)`)
  lines.push(`Cartes uniques du corpus: ${totals.uniqueCards} · avec au moins un rôle fonctionnel avant: ${totals.withRoleBefore} · après: ${totals.withRoleAfter}`)
  lines.push(`Cartes gagnant au moins un rôle par le pont: ${totals.bridgedCards}`)
  lines.push(`Rôles ajoutés: ${Object.entries(totals.tagsAdded).map(([tag, n]) => `${tag}=${n}`).join(', ') || 'aucun'}`)
  lines.push('')
  lines.push('| Deck | médiane av/après | P20 | P80 | pic | consistance | rôles modifiés | paquets av/après |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const deck of report.decks) {
    const roleDiff = Object.keys(deck.after.roles).filter(key => deck.before.roles[key] !== deck.after.roles[key]).map(key => `${key} ${deck.before.roles[key]}→${deck.after.roles[key]}`).join(', ') || '—'
    lines.push(`| ${deck.name} | ${deck.before.profile.median} → ${deck.after.profile.median} | ${deck.before.profile.p20} → ${deck.after.profile.p20} | ${deck.before.profile.p80} → ${deck.after.profile.p80} | ${deck.before.profile.peak} → ${deck.after.profile.peak} | ${deck.before.profile.consistency} → ${deck.after.profile.consistency} | ${roleDiff} | ${deck.before.packages.map(p => p.id).join(',') || '—'} → ${deck.after.packages.map(p => p.id).join(',') || '—'} |`)
  }
  const medians = report.decks.map(deck => deck.deltas.median)
  lines.push('')
  lines.push(`Médiane des écarts de médiane: ${round(median(medians))} · écart max: ${Math.max(...medians.map(Math.abs))}`)
  lines.push('')
  lines.push('## Couverture sémantique par deck (recon)')
  lines.push('')
  lines.push('| Deck | cartes | rôle av/après | exact | partial | refusées | non compilées | hors artefact | pont |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const deck of report.decks) {
    const before = deck.before.coverage
    const after = deck.after.coverage
    lines.push(`| ${deck.name} | ${before.cards} | ${before.withHeuristicRole} → ${after.withRole} | ${after.artifact.exact} | ${after.artifact.partial} | ${after.artifact.refused} | ${after.artifact.uncompiled} | ${after.artifact.unknownToArtifact} | ${after.artifact.bridged} |`)
  }
  const text = `${lines.join('\n')}\n`
  fs.writeFileSync(path.join(REPO_ROOT, 'semantic', 'bridge-report.md'), text)
  if (argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else process.stdout.write(text)
}

main().catch(error => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
