/**
 * Construit le corpus local des 12 decks Archidekt utilisés par le simulateur
 * (`fixtures/rules-v2/archidekt-13.json`) dans un format consommable par
 * `analyzePower`, avec les données Oracle réellement nécessaires au scoreur
 * (type, coût, cmc, production de mana) résolues auprès de Scryfall.
 *
 * Ce corpus est un intrant de mesure commité : il rend la comparaison
 * avant/après reproductible hors ligne et sans réseau.
 *
 * Usage : node scripts/build-archidekt-corpus.mjs [--rules-repo <chemin>]
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { normalizeScryfallCard } from '../src/scryfallNormalize.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(HERE, '..')
export const CORPUS_PATH = path.join(REPO_ROOT, 'semantic', 'corpus-archidekt-12.json')
export const DEFAULT_RULES_REPO = process.env.AEON_RULES_REPO || path.resolve(REPO_ROOT, '..', 'MonSimulateur-MTG')
const FIXTURE_RELATIVE = path.join('fixtures', 'rules-v2', 'archidekt-13.json')
const USER_AGENT = 'aeon-scorer-semantic-bridge/1.0 (+https://github.com/megazz31/aeon-scorer)'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function fetchJson(url, options = {}, attempts = 8) {
  let last
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(options.headers ?? {}) } })
      if (response.ok) return response.json()
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after') ?? 0)
        await sleep(Math.max(retryAfter * 1000, 1500 * (attempt + 1)))
        last = new Error(`${response.status} ${url}`)
        continue
      }
      throw new Error(`${response.status} ${response.statusText} ${url}`)
    } catch (error) {
      last = error
      if (attempt < attempts - 1) await sleep(1500 * (attempt + 1))
    }
  }
  throw last
}

const CACHE_PATH = path.join(REPO_ROOT, 'semantic', '.scryfall-cache.json')

function loadCache() {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))))
  } catch {
    return new Map()
  }
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
  const sorted = Object.fromEntries([...cache.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)))
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(sorted, null, 0)}\n`)
}

function isCommander(entry) {
  return (entry.categories ?? []).some(category => /commander/i.test(String(category)))
}

function isSideboard(entry) {
  return (entry.categories ?? []).some(category => /sideboard|maybeboard|considering/i.test(String(category)))
}

export function readFixture(fixturePath) {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
}

export function deckRecipes(corpus) {
  return corpus.decks.map(deck => {
    const main = (deck.cards ?? []).filter(entry => !isSideboard(entry))
    const commanders = main.filter(isCommander).map(entry => entry.name)
    return {
      id: String(deck.id),
      name: deck.name,
      commanders: [...new Set(commanders)].sort(),
      entries: main.map(entry => ({ name: entry.name, quantity: Math.max(1, Number(entry.quantity ?? 1)) }))
    }
  })
}

async function resolveNames(names) {
  const resolved = loadCache()
  const unique = [...new Set(names)].sort()
  const pending = unique.filter(name => !resolved.has(name.toLowerCase()))
  for (let index = 0; index < pending.length; index += 75) {
    const batch = pending.slice(index, index + 75)
    const payload = await fetchJson('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch.map(name => ({ name })) })
    })
    for (const card of payload.data ?? []) resolved.set(String(card.name).toLowerCase(), normalizeScryfallCard(card))
    saveCache(resolved)
    for (const name of batch.filter(entry => !resolved.has(entry.toLowerCase()))) {
      const exact = await fetchJson(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`).catch(() => null)
      if (exact) {
        resolved.set(name.toLowerCase(), normalizeScryfallCard(exact))
        saveCache(resolved)
      }
      await sleep(150)
    }
    const remaining = pending.length - Math.min(pending.length, index + 75)
    console.log(`resolved ${Math.min(pending.length, index + 75)}/${pending.length} (${remaining} restants)`)
    if (remaining > 0) await sleep(700)
  }
  return resolved
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

export async function buildCorpus({ rulesRepo = DEFAULT_RULES_REPO } = {}) {
  const fixturePath = path.join(rulesRepo, FIXTURE_RELATIVE)
  const fixtureText = fs.readFileSync(fixturePath, 'utf8')
  const recipes = deckRecipes(JSON.parse(fixtureText))
  const allNames = recipes.flatMap(recipe => [...recipe.entries.map(entry => entry.name), ...recipe.commanders])
  const resolved = await resolveNames(allNames)
  const missing = [...new Set(allNames.filter(name => !resolved.has(name.toLowerCase())))].sort()
  if (missing.length) throw new Error(`${missing.length} cartes non résolues auprès de Scryfall: ${missing.slice(0, 10).join(', ')}`)

  const decks = recipes.map(recipe => {
    const cards = []
    for (const entry of recipe.entries) {
      const card = resolved.get(entry.name.toLowerCase())
      for (let copy = 0; copy < entry.quantity; copy += 1) cards.push({ ...card })
    }
    cards.sort((left, right) => left.name.localeCompare(right.name))
    return {
      id: recipe.id,
      name: recipe.name,
      commanders: recipe.commanders.map(name => ({ ...resolved.get(name.toLowerCase()) })),
      cards
    }
  })

  return {
    schemaVersion: 1,
    kind: 'aeon-deck-corpus',
    generatedBy: 'aeon-scorer/scripts/build-archidekt-corpus.mjs',
    source: {
      repository: path.basename(rulesRepo),
      fixture: FIXTURE_RELATIVE.split(path.sep).join('/'),
      fixtureSha256: sha256(fixtureText.replace(/\r\n/g, '\n')),
      oracleProvider: 'scryfall'
    },
    counts: {
      decks: decks.length,
      uniqueNames: [...new Set(allNames)].length,
      cardsPerDeck: decks.map(deck => deck.cards.length)
    },
    decks
  }
}

function serialize(corpus) {
  return `${JSON.stringify(corpus, null, 2)}\n`
}

async function main() {
  const argv = process.argv.slice(2)
  const repoIndex = argv.indexOf('--rules-repo')
  const rulesRepo = repoIndex >= 0 ? path.resolve(argv[repoIndex + 1]) : DEFAULT_RULES_REPO
  const corpus = await buildCorpus({ rulesRepo })
  fs.mkdirSync(path.dirname(CORPUS_PATH), { recursive: true })
  fs.writeFileSync(CORPUS_PATH, serialize(corpus))
  console.log(`wrote ${path.relative(REPO_ROOT, CORPUS_PATH)}`)
  console.log(JSON.stringify(corpus.counts))
}

if (process.argv[1] && path.basename(process.argv[1]) === path.basename(fileURLToPath(import.meta.url))) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
