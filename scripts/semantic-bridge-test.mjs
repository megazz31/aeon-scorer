/**
 * Contrat du pont sémantique rules-v2 -> aeon-scorer.
 *
 * Ce test défend trois propriétés, dans cet ordre d'importance :
 * 1. une aptitude compilée `exact` produit le rôle attendu ;
 * 2. une carte refusée (ou absente de l'artefact) garde EXACTEMENT le
 *    comportement heuristique actuel et n'invente aucun rôle ;
 * 3. même entrée -> même sortie, y compris au niveau du score.
 *
 * Il s'exécute sur l'artefact réellement commité : si l'artefact perd une
 * famille sémantique, les témoins requis par les tests disparaissent et le test
 * échoue au lieu de passer à vide.
 *
 * Commande : node scripts/semantic-bridge-test.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { cardFeatures } from '../src/engine/cardFeatures.js'
import { augmentFeatureDeck } from '../src/engine/semanticAugment.js'
import { analyzePower } from '../src/engine/powerModel.js'
import {
  RULES_SEMANTICS_ARTIFACT,
  augmentRulesSemanticTags,
  rulesSemanticCoverage,
  rulesSemanticSummary,
  rulesSemanticRoleTags
} from '../src/engine/rulesSemantics.js'

const artifact = RULES_SEMANTICS_ARTIFACT
const entries = Object.entries(artifact.cards)
const cardsWithStatus = status => entries.filter(([, entry]) => entry.status === status)
const hasEffect = (entry, predicate) => (entry.effects ?? []).some(predicate)

// --- 1. Provenance et forme de l'artefact ---------------------------------
assert.equal(artifact.kind, 'rules-v2-card-semantics', 'artifact kind must identify the rules-v2 bridge')
assert.equal(artifact.schemaVersion, 1)
assert.match(artifact.source.compilerSha256, /^[0-9a-f]{64}$/, 'artifact must pin the simulator compiler revision it was built from')
assert.match(artifact.source.corpusSha256, /^[0-9a-f]{64}$/, 'artifact must pin the corpus revision')
assert.ok(artifact.source.compiler.endsWith('semanticAbilityCompilerV3.js'))
const statusCounts = { exact: 0, partial: 0, refused: 0, uncompiled: 0 }
for (const [, entry] of entries) {
  assert.ok(Object.hasOwn(statusCounts, entry.status), `unknown artifact status ${entry.status}`)
  statusCounts[entry.status] += 1
  if (entry.status === 'uncompiled') {
    assert.equal(entry.abilityCount, 0, `${entry.name}: an uncompiled card cannot carry abilities`)
    assert.equal(entry.effects.length, 0, `${entry.name}: an uncompiled card cannot carry compiled effects`)
  }
  if (entry.status === 'partial') assert.ok(entry.exactAbilityCount > 0 && entry.exactAbilityCount < entry.abilityCount, `${entry.name}: partial must be strictly between zero and all abilities`)
  // Règle dure : aucun effet n'est exporté pour une aptitude non `exact`.
  if (entry.exactAbilityCount === 0) assert.equal(entry.effects.length, 0, `${entry.name}: no effect may exist without an exact ability`)
}
assert.equal(statusCounts.exact, artifact.counts.exact)
assert.equal(statusCounts.partial, artifact.counts.partial)
assert.equal(statusCounts.refused, artifact.counts.refused)
assert.equal(statusCounts.uncompiled, artifact.counts.uncompiled)
assert.equal(entries.length, artifact.counts.cards)
assert.ok(artifact.counts.exact > 0 && artifact.counts.refused > 0, 'artifact must contain both compiled and refused cards')

// --- 2. Une carte compilée exactement donne le rôle attendu ---------------
// Les témoins sont pris dans l'artefact. Les cartes de test n'ont AUCUN texte
// Oracle : tout rôle obtenu vient donc du compilateur, pas de l'heuristique.
const blank = (name, oracleId) => ({ name, oracleId, oracle: '', type: '', cmc: 0, manaCost: '', producedColors: [], producedMana: [], tags: [] })
const controllerDraw = entries.find(([, entry]) => entry.status === 'exact' && hasEffect(entry, effect => effect.type === 'draw' && effect.player?.context === 'source-controller'))
const controllerMill = entries.find(([, entry]) => entry.exactAbilityCount > 0 && hasEffect(entry, effect => effect.type === 'mill' && effect.player?.context === 'source-controller'))
const controllerToken = entries.find(([, entry]) => entry.exactAbilityCount > 0 && hasEffect(entry, effect => effect.type === 'create-token' && effect.controller?.context === 'source-controller'))
const landSearch = entries.find(([, entry]) => entry.exactAbilityCount > 0 && hasEffect(entry, effect => effect.type === 'search-library' && effect.destination === 'battlefield' && effect.filter?.objectType === 'land'))
const opponentPermanentRemoval = entries.find(([, entry]) => entry.exactAbilityCount > 0 && hasEffect(entry, effect => (effect.type === 'destroy' || effect.type === 'exile') && effect.target?.decision?.zone === 'battlefield' && effect.target.decision.controller !== 'you'))
const enteredTrigger = entries.find(([, entry]) => entry.exactAbilityCount > 0 && (entry.triggerEvents ?? []).includes('enters-battlefield'))
const ownGraveyardRecursion = entries.find(([, entry]) => entry.exactAbilityCount > 0 && hasEffect(entry, effect => effect.type === 'move-object' && effect.fromZone === 'graveyard' && effect.toZone === 'battlefield' && effect.object?.decision?.zone === 'graveyard' && effect.object.decision.owner === 'you'))

const witnesses = [
  [controllerDraw, 'draw'],
  [controllerMill, 'graveyard-setup'],
  [controllerToken, 'tokens'],
  [landSearch, 'land-ramp'],
  [opponentPermanentRemoval, 'removal'],
  [enteredTrigger, 'etb'],
  [ownGraveyardRecursion, 'recursion']
]
for (const [witness, role] of witnesses) {
  assert.ok(witness, `artifact must still contain a witness card for the ${role} mapping`)
  const [oracleId, entry] = witness
  const decorated = augmentRulesSemanticTags(blank(entry.name, oracleId))
  assert.ok(decorated.tags.includes(role), `${entry.name} must receive ${role} from compiled semantics alone`)
  assert.deepEqual(decorated.rulesSemantics.roles.sort(), [...new Set(decorated.rulesSemantics.roles)].sort(), 'roles must be deduplicated')
}

// Un brûlage de joueur n'est pas un retrait : la seule forme « damage » mappée
// est celle qui cible un permanent du champ de bataille.
for (const [oracleId, entry] of entries) {
  const playerOnlyBurn = (entry.effects ?? []).filter(effect => effect.type === 'damage' && effect.target?.context)
  if (!playerOnlyBurn.length) continue
  const otherRemoval = (entry.effects ?? []).some(effect => effect.type === 'damage' && effect.target?.decision?.zone === 'battlefield')
  if (otherRemoval) continue
  assert.ok(!rulesSemanticRoleTags(blank(entry.name, oracleId)).includes('removal'), `${entry.name}: damage to players is not removal`)
}
const burnOnly = entries.find(([, entry]) => entry.status === 'exact' && (entry.effects ?? []).length > 0 && entry.effects.every(effect => effect.type === 'damage' && effect.target?.context === 'opponents'))
if (burnOnly) {
  const [oracleId, entry] = burnOnly
  assert.ok(!augmentRulesSemanticTags(blank(entry.name, oracleId)).tags.includes('removal'), `${entry.name}: player burn is not removal`)
}

// Le mana produit par le contrôleur est reconnu comme ressource.
const controllerMana = entries.find(([, entry]) => entry.status === 'exact' && hasEffect(entry, effect => effect.type === 'add-mana' && effect.player?.context === 'source-controller'))
assert.ok(controllerMana, 'artifact must still contain an exact add-mana ability')
assert.ok(augmentRulesSemanticTags(blank(controllerMana[1].name, controllerMana[0])).tags.includes('mana'))

// Récupération depuis le cimetière d'un adversaire : pas de rôle recursion.
let opponentGraveyardWitnesses = 0
for (const [oracleId, entry] of entries) {
  if (!(entry.effects ?? []).some(effect => effect.type === 'move-object' && effect.object?.decision?.owner === 'opponent')) continue
  opponentGraveyardWitnesses += 1
  assert.ok(!rulesSemanticRoleTags(blank(entry.name, oracleId)).includes('recursion'), `${entry.name}: an opponent graveyard must never be credited as recursion`)
}
assert.ok(opponentGraveyardWitnesses > 0, 'artifact must still contain an opponent-graveyard move to defend the recursion mapping')

// --- 3. Une carte refusée garde le repli, sans rien inventer ---------------
const refused = cardsWithStatus('refused')
const uncompiled = cardsWithStatus('uncompiled')
assert.ok(refused.length > 0 && uncompiled.length > 0)
for (const [oracleId, entry] of [...refused.slice(0, 40), ...uncompiled.slice(0, 40)]) {
  const card = blank(entry.name, oracleId)
  assert.equal(rulesSemanticRoleTags(card).length, 0, `${entry.name}: a refused card must not yield a role`)
  assert.equal(augmentRulesSemanticTags(card), card, `${entry.name}: a refused card must be returned untouched`)
}

// L'heuristique reste intacte sur une carte refusée : mêmes tags avec et sans pont.
const refusedWithText = entries.find(([oracleId, entry]) => entry.status === 'refused' && (entry.refusalReasons ?? []).length > 0)
assert.ok(refusedWithText, 'artifact must contain a named refusal to test the fallback')
const heuristicCard = { name: refusedWithText[1].name, oracleId: refusedWithText[0], oracle: 'Whenever this creature enters, draw a card.', type: 'Creature — Test', cmc: 3, manaCost: '{2}{G}', producedMana: [], tags: [] }
const [featured] = augmentFeatureDeck([cardFeatures(heuristicCard)], { rulesSemantics: true })
const [heuristicOnly] = augmentFeatureDeck([cardFeatures(heuristicCard)], { rulesSemantics: false })
assert.deepEqual(featured.tags, heuristicOnly.tags, 'a refused card must keep exactly the heuristic tags')
assert.ok(featured.tags.includes('draw') && featured.tags.includes('etb'), 'the heuristic must still work on refused cards')

// Une carte absente de l'artefact (pas d'oracleId, ou oracleId inconnu) est intacte.
for (const card of [blank('Anonyme', undefined), blank('Anonyme', '00000000-0000-0000-0000-000000000000')]) {
  assert.equal(augmentRulesSemanticTags(card), card, 'cards unknown to the artifact must be returned untouched')
}

// Aucun comportement par nom : même nom, oracleId inconnu -> aucun rôle.
const namedOnly = { ...blank(controllerMana[1].name, '00000000-0000-0000-0000-000000000000') }
assert.equal(rulesSemanticRoleTags(namedOnly).length, 0, 'the bridge must never resolve a card by name')

// Le pont est additif : un rôle heuristique ne disparaît jamais.
const hybrid = { ...blank(controllerDraw[1].name, controllerDraw[0]), oracle: 'When this creature enters, draw a card.', type: 'Creature — Test', cmc: 2, manaCost: '{1}{U}' }
const hybridTags = augmentRulesSemanticTags({ ...cardFeatures(hybrid) }).tags
assert.ok(hybridTags.includes('draw') && hybridTags.includes('etb'), 'heuristic roles must survive the bridge')

// --- 4. Déterminisme -------------------------------------------------------
const coverageA = rulesSemanticCoverage([cardFeatures(hybrid)])
const coverageB = rulesSemanticCoverage([cardFeatures(hybrid)])
assert.deepEqual(coverageA, coverageB)
const summaryA = rulesSemanticSummary(augmentFeatureDeck([cardFeatures(hybrid)], { rulesSemantics: true }))
const summaryB = rulesSemanticSummary(augmentFeatureDeck([cardFeatures(hybrid)], { rulesSemantics: true }))
assert.deepEqual(summaryA, summaryB)
assert.ok(artifact.counts.cards > 0 && coverageA.cards === 1)

// --- 5. Niveau analyse : mêmes entrées -> mêmes sorties --------------------
const commander = { name: 'Bridge Commander', oracle: 'Flying', type: 'Legendary Creature — Test', cmc: 4, manaCost: '{3}{U}', producedMana: [], colors: ['U'], colorIdentity: ['U'] }
const deck = [
  ...Array.from({ length: 38 }, (_, index) => ({ name: `Bridge Island ${index}`, oracle: '{T}: Add {U}.', type: 'Basic Land — Island', cmc: 0, manaCost: '', producedMana: ['U'], colors: [], colorIdentity: [] })),
  ...Array.from({ length: 30 }, (_, index) => ({ name: `Bridge Bear ${index}`, oracle: 'Flying', type: 'Creature — Bear', cmc: 3, manaCost: '{2}{U}', producedMana: [], colors: ['U'], colorIdentity: ['U'] })),
  ...Array.from({ length: 31 }, (_, index) => ({ name: `Bridge Spell ${index}`, oracle: 'Draw a card.', type: 'Instant', cmc: 1, manaCost: '{U}', producedMana: [], colors: ['U'], colorIdentity: ['U'] }))
]
const runA = analyzePower(deck, commander, null, 120, { emitProduct: false, record: false, firstAccess: false })
const runB = analyzePower(deck, commander, null, 120, { emitProduct: false, record: false, firstAccess: false })
assert.deepEqual(runA.profile, runB.profile, 'same input must produce the same score')
assert.deepEqual(runA.dimensions, runB.dimensions)
assert.deepEqual(runA.packages.map(pkg => pkg.id), runB.packages.map(pkg => pkg.id))
assert.deepEqual(runA.semantics, runB.semantics)
assert.equal(runA.semantics.cards, 100, 'every card of the analysis (99 cards + commander) must be covered by the semantic summary')
assert.ok(runA.methodology.cardSemantics, 'the analysis must expose which semantics artifact it used')
assert.equal(runA.methodology.cardSemantics.artifactVersion, artifact.schemaVersion)

// Le mode de mesure désactive strictement la seconde passe d'augmentation.
const runWithoutBridge = analyzePower(deck, commander, null, 120, { emitProduct: false, record: false, firstAccess: false, rulesSemantics: false })
assert.equal(runWithoutBridge.semantics.bridged, 0, 'the measurement mode must not add bridged roles')
assert.deepEqual(runWithoutBridge.profile, runA.profile, 'this synthetic deck has no compiled card, so both modes agree')

console.log(`SEMANTIC BRIDGE OK — ${artifact.counts.cards} cartes (${artifact.counts.exact} exact, ${artifact.counts.partial} partial, ${artifact.counts.refused} refusées, ${artifact.counts.uncompiled} non compilées) · ${witnesses.length} familles de rôles défendues`)
