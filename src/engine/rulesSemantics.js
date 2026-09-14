/**
 * Pont sémantique MonSimulateur-MTG -> aeon-scorer.
 *
 * aeon-scorer dérive ses rôles fonctionnels d'heuristiques de texte Oracle.
 * MonSimulateur-MTG sait, aptitude par aptitude, si son compilateur sémantique a
 * compilé le texte en `exact` ou l'a refusé avec une raison NOMMÉE, et quels
 * effets il a réellement compilés.
 *
 * Ce module traduit une partie STRICTE de ces effets compilés en rôles
 * aeon-scorer. Trois règles non négociables :
 *
 * 1. Seules les aptitudes `exact` parlent. Une aptitude refusée n'ajoute rien :
 *    la carte garde exactement le comportement heuristique actuel.
 * 2. Le pont est ADDITIF uniquement. Il n'enlève jamais un rôle trouvé par
 *    l'heuristique : une capacité statique, un mot-clé ou un effet non modélisé
 *    peuvent justifier un rôle que le compilateur n'a pas encore compilé.
 * 3. Aucune table par nom de carte, aucun `oracleId` en dur : la seule clé est
 *    l'`oracleId` porté par la carte analysée, résolu dans l'artefact généré.
 *
 * L'artefact `semantic/rules-v2-card-semantics.json` est produit par
 * `node scripts/export-rules-semantics.mjs`, qui appelle la chaîne du simulateur
 * (même entrée que `node scripts/rules-automation-final.js --json`). Il n'est
 * jamais édité à la main.
 */
import artifact from '../../semantic/rules-v2-card-semantics.json' with { type: 'json' }
import { metricScores } from './cardFeatures.js'

export const RULES_SEMANTICS_ARTIFACT = artifact

/**
 * Statuts qui portent de la sémantique compilée : `exact` (toutes les aptitudes)
 * et `partial` (au moins une). Dans les deux cas l'artefact ne liste que les
 * effets réellement compilés — une aptitude refusée ne contribue jamais.
 */
const COMPILED_STATUSES = new Set(['exact', 'partial'])
const PERMANENT_TYPES = new Set(['creature', 'artifact', 'enchantment', 'planeswalker', 'permanent', 'battle', 'land'])

const isController = value => value?.context === 'source-controller'
const isOpponentControlled = decision => decision?.controller !== 'you'

/** Cible d'un effet de retrait : un permanent sur le champ de bataille dont on
 * ne sait pas qu'il appartient au contrôleur de la source. C'est exactement la
 * définition de `isTargetRemoval` côté heuristique (elle exclut les clauses
 * « you control / you own / your graveyard / your hand »). */
function removesBattlefieldPermanent(value) {
  const decision = value?.decision
  if (!decision || decision.type !== 'target' || decision.zone !== 'battlefield') return false
  return isOpponentControlled(decision)
}

function isRemovalEffect(effect) {
  switch (effect.type) {
    case 'destroy':
    case 'exile':
      return removesBattlefieldPermanent(effect.target)
    case 'damage':
      // Un brûlage de joueur (« deals 2 damage to each opponent ») n'est pas un
      // retrait : il faut une cible de permanent typée.
      return removesBattlefieldPermanent(effect.target) &&
        Array.isArray(effect.target.decision.cardTypes) &&
        effect.target.decision.cardTypes.some(type => PERMANENT_TYPES.has(type))
    case 'modify-pt':
      return typeof effect.power === 'number' && effect.power < 0 && removesBattlefieldPermanent(effect.target)
    default:
      return false
  }
}

/** Récupération depuis SON cimetière vers le champ de bataille ou la main. */
function isRecursionEffect(effect) {
  if (effect.type !== 'move-object') return false
  if (effect.fromZone !== 'graveyard') return false
  if (effect.toZone !== 'battlefield' && effect.toZone !== 'hand') return false
  const decision = effect.object?.decision
  return Boolean(decision) && decision.type === 'target' && decision.zone === 'graveyard' && decision.owner === 'you'
}

function searchObjectType(effect) {
  const value = effect.filter?.objectType
  return typeof value === 'string' ? value : null
}

/**
 * Traduction effet compilé -> rôle aeon-scorer.
 *
 * Chaque entrée n'est ajoutée que si le contrat du simulateur porte
 * explicitement l'information correspondante. Aucune heuristique de secours
 * n'est appliquée ici : un effet non listé ne produit aucun rôle.
 */
function rolesFromEffect(effect, add) {
  switch (effect.type) {
    case 'draw':
      if (isController(effect.player)) add('draw')
      return
    case 'mill':
      // « mill N » côté contrôleur : mise en place de cimetière, comme la règle
      // heuristique `isGraveSetup`.
      if (isController(effect.player)) add('graveyard-setup')
      return
    case 'create-token':
      if (isController(effect.controller)) add('tokens')
      return
    case 'life-delta':
      if (isController(effect.player) && typeof effect.amount?.constant === 'number' && effect.amount.constant > 0) add('lifegain')
      return
    case 'add-mana':
      if (isController(effect.player)) add('mana')
      return
    case 'search-library': {
      if (!isController(effect.player)) return
      const objectType = searchObjectType(effect)
      if (objectType === null) return
      if (objectType === 'land') {
        if (effect.destination === 'battlefield') add('land-ramp')
        return
      }
      add('tutor')
      return
    }
    default:
      if (isRemovalEffect(effect)) add('removal')
      else if (isRecursionEffect(effect)) add('recursion')
  }
}

function tagsFromCompiledEffects(entry) {
  const tags = []
  const add = tag => {
    if (!tags.includes(tag)) tags.push(tag)
  }
  for (const effect of entry.effects ?? []) rolesFromEffect(effect, add)
  if ((entry.triggerEvents ?? []).includes('enters-battlefield')) add('etb')
  return tags
}

export function rulesSemanticsEntry(card) {
  const oracleId = card?.oracleId
  if (!oracleId) return null
  const entry = artifact.cards?.[oracleId]
  return entry && COMPILED_STATUSES.has(entry.status) ? entry : null
}

/**
 * Rôles justifiés par la sémantique compilée. Ne lit QUE les aptitudes exactes :
 * l'artefact ne place déjà dans `effects` que les effets des aptitudes `exact`.
 */
export function rulesSemanticRoleTags(card) {
  const entry = rulesSemanticsEntry(card)
  if (!entry || entry.exactAbilityCount === 0) return []
  return tagsFromCompiledEffects(entry)
}

/**
 * Ajoute les rôles compilés à ceux de l'heuristique, puis recalcule les
 * primitives dérivées (`development`, `interaction`, `resilience`,
 * `explosiveness`, `standalone`) avec la même formule que `cardFeatures`.
 *
 * Sans ce recalcul, un rôle ajouté n'aurait aucun effet mesurable : `tags` et
 * les contributions numériques divergeraient.
 *
 * Retourne la carte inchangée (même référence) quand le pont n'apporte aucun
 * rôle, pour que le chemin heuristique existant reste bit à bit identique.
 */
export function augmentRulesSemanticTags(card) {
  if (!card) return card
  const entry = rulesSemanticsEntry(card)
  if (!entry || entry.exactAbilityCount === 0) return card
  const roles = tagsFromCompiledEffects(entry)
  if (!roles.length) return card
  const tags = Array.isArray(card.tags) ? card.tags : []
  const added = roles.filter(role => !tags.includes(role))
  if (!added.length) return card
  const merged = [...tags, ...added]
  return { ...card, tags: merged, ...metricScores(card, merged), rulesSemantics: { status: entry.status, roles, added } }
}

/**
 * Couverture du pont sur un paquet de cartes, pour la recon et les rapports.
 *
 * À appeler sur des cartes AVANT `augmentRulesSemanticTags` : c'est ce qui
 * permet de mesurer ce que le pont ajouterait. Sur des cartes déjà augmentées,
 * `bridged` vaut 0 par construction.
 */
export function rulesSemanticCoverage(cards = []) {
  const unique = new Map()
  for (const card of cards) {
    const key = card?.oracleId || card?.name
    if (key && !unique.has(key)) unique.set(key, card)
  }
  const coverage = {
    cards: unique.size,
    withEntry: 0,
    exact: 0,
    partial: 0,
    refused: 0,
    uncompiled: 0,
    unknownToArtifact: 0,
    bridged: 0,
    tagsAdded: {},
    heuristicOnly: 0
  }
  for (const card of unique.values()) {
    const entry = card?.oracleId ? artifact.cards?.[card.oracleId] : null
    if (!entry) {
      coverage.unknownToArtifact += 1
      continue
    }
    coverage.withEntry += 1
    if (entry.status === 'exact') coverage.exact += 1
    else if (entry.status === 'partial') coverage.partial += 1
    else if (entry.status === 'uncompiled') coverage.uncompiled += 1
    else coverage.refused += 1
    if (!COMPILED_STATUSES.has(entry.status)) {
      coverage.heuristicOnly += 1
      continue
    }
    const tags = Array.isArray(card.tags) ? card.tags : []
    const added = tagsFromCompiledEffects(entry).filter(tag => !tags.includes(tag))
    if (added.length) {
      coverage.bridged += 1
      for (const tag of added) coverage.tagsAdded[tag] = (coverage.tagsAdded[tag] ?? 0) + 1
    }
  }
  coverage.tagsAdded = Object.fromEntries(Object.entries(coverage.tagsAdded).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
  return coverage
}

/**
 * Résumé de provenance sémantique d'une analyse, calculé sur les cartes déjà
 * passées par `augmentRulesSemanticTags`.
 *
 * Il ne modifie aucun score : il rend visible, dans le résultat, la part de la
 * liste dont les rôles reposent sur une sémantique compilée `exact` et la part
 * qui garde le repli heuristique. C'est la garantie opposable du pont : un rôle
 * ajouté est toujours traçable jusqu'à une aptitude compilée.
 */
export function rulesSemanticSummary(cards = []) {
  const unique = new Map()
  for (const card of cards) {
    const key = card?.oracleId || card?.name
    if (key && !unique.has(key)) unique.set(key, card)
  }
  const summary = {
    artifactVersion: artifact.schemaVersion,
    cards: unique.size,
    exact: 0,
    partial: 0,
    refused: 0,
    uncompiled: 0,
    unknownToArtifact: 0,
    bridged: 0,
    rolesAdded: {}
  }
  for (const card of unique.values()) {
    const entry = card?.oracleId ? artifact.cards?.[card.oracleId] : null
    if (!entry) {
      summary.unknownToArtifact += 1
      continue
    }
    if (entry.status === 'exact') summary.exact += 1
    else if (entry.status === 'partial') summary.partial += 1
    else if (entry.status === 'uncompiled') summary.uncompiled += 1
    else summary.refused += 1
    const added = card.rulesSemantics?.added ?? []
    if (added.length) {
      summary.bridged += 1
      for (const role of added) summary.rolesAdded[role] = (summary.rolesAdded[role] ?? 0) + 1
    }
  }
  summary.rolesAdded = Object.fromEntries(Object.entries(summary.rolesAdded).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
  return summary
}
