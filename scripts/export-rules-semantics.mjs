/**
 * Exporte la sémantique par carte compilée par MonSimulateur-MTG vers un
 * artefact consommable par aeon-scorer.
 *
 * La vérité reste dans MonSimulateur-MTG : ce script n'implémente aucune
 * grammaire, aucune taxonomie et aucun statut. Il appelle la même chaîne que
 * `node scripts/rules-automation-final.js --json` (certification d'automatisation)
 * puis, pour chaque aptitude dont le compilateur sémantique rend `exact`, il
 * relit les effets compilés avec `compileSemanticAbilityV3`. Une aptitude qui
 * n'est pas `exact` est exportée avec son refus nommé et rien d'autre.
 *
 * Usage :
 *   node scripts/export-rules-semantics.mjs [--rules-repo <chemin>] [--check]
 *
 * `--check` ne réécrit rien et échoue si l'artefact commité diffère de la
 * régénération : c'est la garde qui empêche deux vérités de diverger.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(HERE, '..')
export const ARTIFACT_PATH = path.join(REPO_ROOT, 'semantic', 'rules-v2-card-semantics.json')
export const DEFAULT_RULES_REPO = process.env.AEON_RULES_REPO || path.resolve(REPO_ROOT, '..', 'MonSimulateur-MTG')

const CORPUS_RELATIVE = path.join('fixtures', 'rules-v2', 'archidekt-13.json')
const VERIFICATION_RELATIVE = path.join('fixtures', 'rules-v2', 'automation-verification.json')
const COMPILER_RELATIVE = path.join('src', 'rules-v2', 'compiler', 'semanticAbilityCompilerV3.js')
const CERTIFICATION_RELATIVE = path.join('src', 'rules-v2', 'diagnostics', 'finalAutomationCertification.js')
const NATIVE_KEYWORD_RELATIVE = path.join('src', 'rules-v2', 'diagnostics', 'nativeKeywordAbility.js')

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function fileSha256(filePath) {
  return sha256(fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n'))
}

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/**
 * Projette une `value spec` telle quelle. Aucune interprétation : soit la forme
 * est connue et recopiée, soit elle reste `null` (et l'appelant ne pourra rien
 * en déduire, ce qui est le comportement voulu).
 */
function summarizeValue(value, decisionsById) {
  if (!value || typeof value !== 'object') return null
  switch (value.type) {
    case 'context': return { context: value.context }
    case 'constant': return { constant: value.value }
    case 'decision': return { decision: summarizeDecision(decisionsById.get(value.decisionId)) }
    case 'object-set': return { objectSet: { zone: value.zone ?? null, controller: value.controller ?? null, filter: value.filter ?? null } }
    default: return null
  }
}

function summarizeDecision(decision) {
  if (!decision) return null
  const payload = decision.payload ?? {}
  const predicates = Array.isArray(payload.predicates) ? payload.predicates : []
  const controller = predicates.find(predicate => predicate?.kind === 'controller')
  const cardType = predicates.find(predicate => predicate?.kind === 'cardType')
  const base = decision.type === 'target'
    ? { zone: payload.source?.zone ?? null, owner: payload.source?.owner ?? null, controller: controller?.value ?? null, cardTypes: cardType?.values ?? [] }
    : { source: payload.source ?? null, filter: payload.filter ?? null }
  return { type: decision.type, ...base }
}

/** Projection d'un effet compilé : uniquement les champs porteurs de sens pour
 * le rôle fonctionnel, recopiés depuis le contrat du simulateur. */
function summarizeEffect(effect, decisionsById) {
  const summary = { type: effect.type }
  switch (effect.type) {
    case 'draw':
    case 'mill':
    case 'scry':
      summary.player = summarizeValue(effect.subject, decisionsById)
      summary.amount = summarizeValue(effect.amount, decisionsById)
      break
    case 'life-delta':
      summary.player = summarizeValue(effect.subject, decisionsById)
      summary.amount = summarizeValue(effect.amount, decisionsById)
      break
    case 'destroy':
    case 'exile':
    case 'sacrifice':
    case 'tap':
    case 'untap':
      summary.target = summarizeValue(effect.subject, decisionsById)
      break
    case 'damage':
      summary.target = summarizeValue(effect.target, decisionsById)
      summary.amount = summarizeValue(effect.amount, decisionsById)
      break
    case 'modify-pt':
      summary.target = summarizeValue(effect.subject, decisionsById)
      summary.power = effect.power
      summary.toughness = effect.toughness
      break
    case 'counter-delta':
      summary.target = summarizeValue(effect.subject, decisionsById)
      summary.amount = summarizeValue(effect.amount, decisionsById)
      break
    case 'move-object':
      summary.object = summarizeValue(effect.object, decisionsById)
      summary.fromZone = effect.fromZone ?? null
      summary.toZone = effect.toZone ?? null
      break
    case 'create-token':
      summary.controller = summarizeValue(effect.controller, decisionsById)
      break
    case 'search-library': {
      summary.player = summarizeValue(effect.player, decisionsById)
      summary.destination = effect.destination ?? null
      const decision = decisionsById.get(effect.decisionId)
      summary.filter = decision?.payload?.filter ?? null
      break
    }
    case 'add-mana':
      summary.player = summarizeValue(effect.subject, decisionsById)
      break
    default:
      break
  }
  return summary
}

/** Une aptitude est sémantiquement connue quand le compilateur rend `exact`,
 * qu'elle soit compilée comme règle sémantique ou classée mot-clé natif. */
function abilitySemantics(record, compileSemanticAbility, classifyNativeKeywordAbility) {
  const native = classifyNativeKeywordAbility(record.text)
  if (native?.ok) {
    return { known: true, effects: [], triggerEvents: [], capabilities: record.requiredCapabilities ?? [], keywords: sortedUnique(native.keywords ?? []) }
  }
  const compiled = compileSemanticAbility(record.text, { id: record.uniqueKey, cardName: record.cardName })
  if (compiled.status !== 'exact') {
    return { known: false, reason: compiled.reason ?? 'semantic-refused', effects: [], triggerEvents: [], capabilities: [], keywords: [] }
  }
  const plan = compiled.value?.plan ?? null
  const decisionsById = new Map((compiled.value?.decisions ?? []).map(decision => [decision.id, decision]))
  return {
    known: true,
    effects: (plan?.effects ?? []).map(effect => summarizeEffect(effect, decisionsById)),
    triggerEvents: sortedUnique(plan?.trigger?.events ?? []),
    capabilities: record.requiredCapabilities ?? [],
    keywords: []
  }
}

function effectKey(effect) {
  return JSON.stringify(effect)
}

export function buildArtifact({ rulesRepo = DEFAULT_RULES_REPO } = {}) {
  const corpusPath = path.join(rulesRepo, CORPUS_RELATIVE)
  const verificationPath = path.join(rulesRepo, VERIFICATION_RELATIVE)
  const compilerPath = path.join(rulesRepo, COMPILER_RELATIVE)
  const certificationPath = path.join(rulesRepo, CERTIFICATION_RELATIVE)
  const nativeKeywordPath = path.join(rulesRepo, NATIVE_KEYWORD_RELATIVE)
  for (const required of [corpusPath, compilerPath, certificationPath, nativeKeywordPath]) {
    if (!fs.existsSync(required)) throw new Error(`rules repository incomplete, missing ${required}`)
  }

  return Promise.all([
    import(pathToFileURL(compilerPath).href),
    import(pathToFileURL(certificationPath).href),
    import(pathToFileURL(nativeKeywordPath).href)
  ]).then(([compiler, certification, native]) => {
    const corpus = readJson(corpusPath)
    const verification = fs.existsSync(verificationPath) ? readJson(verificationPath) : undefined
    const built = certification.buildFinalAutomationCertification(corpus, { verification })
    const records = built.report.abilities

    const uniqueByKey = new Map()
    for (const record of records) {
      const previous = uniqueByKey.get(record.uniqueKey)
      // Deux occurrences du même texte doivent rendre le même verdict : sinon la
      // certification du simulateur aurait déjà jeté (contrat `conflicting
      // automation result`). On refuse d'exporter une carte ambiguë.
      if (previous && (previous.text !== record.text || previous.status !== record.status)) {
        throw new Error(`conflicting semantic result for ${record.uniqueKey}`)
      }
      if (!previous) uniqueByKey.set(record.uniqueKey, record)
    }

    const cards = new Map()
    const ensureCard = (cardId, name) => {
      const existing = cards.get(cardId)
      if (existing) return existing
      const created = {
        name,
        abilities: 0,
        knownAbilities: 0,
        effects: new Map(),
        capabilities: [],
        keywords: [],
        triggerEvents: [],
        refusalReasons: []
      }
      cards.set(cardId, created)
      return created
    }
    // Toutes les cartes du corpus sont présentes, même celles dont le corpus ne
    // porte aucun texte Oracle : « non compilée » et « refusée » sont deux états
    // distincts, et un consommateur ne doit jamais les confondre avec « exacte ».
    for (const deck of corpus.decks ?? []) {
      for (const card of deck.cards ?? []) ensureCard(String(card.cardId), card.name)
    }

    let uniqueAbilityCount = 0
    for (const record of uniqueByKey.values()) {
      uniqueAbilityCount += 1
      const entry = ensureCard(String(record.cardId), record.cardName)
      const semantics = abilitySemantics(record, compiler.compileSemanticAbilityV3, native.classifyNativeKeywordAbility)
      entry.abilities += 1
      if (semantics.known) {
        entry.knownAbilities += 1
        for (const effect of semantics.effects) entry.effects.set(effectKey(effect), effect)
        entry.capabilities.push(...semantics.capabilities)
        entry.keywords.push(...semantics.keywords)
        entry.triggerEvents.push(...semantics.triggerEvents)
      } else {
        entry.refusalReasons.push(semantics.reason)
      }
    }

    const payload = {}
    const counts = { cards: 0, exact: 0, partial: 0, refused: 0, uncompiled: 0 }
    for (const [oracleId, entry] of [...cards.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      const uncompiled = entry.abilities === 0
      const exact = !uncompiled && entry.knownAbilities === entry.abilities
      const partial = entry.knownAbilities > 0 && !exact
      counts.cards += 1
      if (uncompiled) counts.uncompiled += 1
      else if (exact) counts.exact += 1
      else if (partial) counts.partial += 1
      else counts.refused += 1
      payload[oracleId] = {
        name: entry.name,
        // Verdict carte : `exact` (toutes les aptitudes compilées), `partial`
        // (au moins une, pas toutes), `refused` (aucune) ou `uncompiled` (le
        // corpus ne porte aucun texte Oracle). Seuls `exact` et `partial`
        // exposent des effets, et uniquement ceux de leurs aptitudes exactes.
        status: uncompiled ? 'uncompiled' : exact ? 'exact' : partial ? 'partial' : 'refused',
        abilityCount: entry.abilities,
        exactAbilityCount: entry.knownAbilities,
        // Les effets et capacités listés ne viennent QUE des aptitudes exactes :
        // une carte partiellement comprise n'hérite jamais de la sémantique de
        // l'aptitude incomprise.
        effects: [...entry.effects.keys()].sort().map(key => entry.effects.get(key)),
        capabilities: sortedUnique(entry.capabilities),
        nativeKeywords: sortedUnique(entry.keywords),
        triggerEvents: sortedUnique(entry.triggerEvents),
        refusalReasons: uncompiled ? ['no-ability-in-corpus'] : sortedUnique(entry.refusalReasons)
      }
    }

    return {
      schemaVersion: 1,
      kind: 'rules-v2-card-semantics',
      generatedBy: 'aeon-scorer/scripts/export-rules-semantics.mjs',
      source: {
        repository: path.basename(rulesRepo),
        corpus: CORPUS_RELATIVE.split(path.sep).join('/'),
        corpusSha256: fileSha256(corpusPath),
        compiler: COMPILER_RELATIVE.split(path.sep).join('/'),
        compilerSha256: fileSha256(compilerPath),
        certification: CERTIFICATION_RELATIVE.split(path.sep).join('/'),
        certificationSha256: fileSha256(certificationPath)
      },
      corpus: {
        deckCount: built.report.deckCount,
        uniqueAbilityCount,
        certificationOk: built.ok === true
      },
      counts,
      cards: payload
    }
  })
}

export function serializeArtifact(artifact) {
  return `${JSON.stringify(artifact, null, 2)}\n`
}

async function main() {
  const argv = process.argv.slice(2)
  const rulesRepoArg = argv.indexOf('--rules-repo')
  const rulesRepo = rulesRepoArg >= 0 ? path.resolve(argv[rulesRepoArg + 1]) : DEFAULT_RULES_REPO
  const check = argv.includes('--check')
  const artifact = await buildArtifact({ rulesRepo })
  const serialized = serializeArtifact(artifact)
  if (check) {
    const current = fs.existsSync(ARTIFACT_PATH) ? fs.readFileSync(ARTIFACT_PATH, 'utf8') : ''
    if (current !== serialized) {
      console.error('semantic artifact is stale: rerun node scripts/export-rules-semantics.mjs')
      process.exitCode = 1
      return
    }
    console.log(`semantic artifact up to date (${artifact.counts.cards} cartes, ${artifact.counts.exact} exactes)`)
    return
  }
  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true })
  fs.writeFileSync(ARTIFACT_PATH, serialized)
  console.log(`wrote ${path.relative(REPO_ROOT, ARTIFACT_PATH)}`)
  console.log(JSON.stringify({ ...artifact.corpus, ...artifact.counts }, null, 2))
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
