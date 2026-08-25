import { listDecks, analysisHistory, loadAnalysisShare, restoreSession } from './supabaseClient.js'
import { normalizedShare } from './productData.js'

let catalogCache = null
let catalogPromise = null
const preconDetailCache = new Map()
let userDecksCache = null
let userDecksPromise = null

export async function fetchPreconCatalog() {
  if (catalogCache) return catalogCache
  if (catalogPromise) return catalogPromise
  catalogPromise = (async () => {
    try {
      const res = await fetch('/precons/catalog.json')
      if (!res.ok) throw new Error(`Precon catalog HTTP ${res.status}`)
      const json = await res.json()
      catalogCache = (json.data || []).filter(d => d.supported)
      return catalogCache
    } catch (e) {
      console.warn('Unable to load precon catalog:', e)
      return []
    } finally {
      catalogPromise = null
    }
  })()
  return catalogPromise
}

export async function fetchPreconDetail(slug) {
  const cleanSlug = String(slug || '').trim().toLowerCase()
  if (!cleanSlug) return null
  if (preconDetailCache.has(cleanSlug)) return preconDetailCache.get(cleanSlug)
  try {
    const res = await fetch(`/precons/${encodeURIComponent(cleanSlug)}.json`)
    if (!res.ok) throw new Error(`Precon detail HTTP ${res.status}`)
    const json = await res.json()
    preconDetailCache.set(cleanSlug, json)
    return json
  } catch (e) {
    console.warn(`Unable to load precon ${cleanSlug}:`, e)
    return null
  }
}

export function preconToShareRow(precon) {
  if (!precon) return null
  const slug = precon.slug
  const analysis = precon.analysis || {}
  const result = precon.result || {}
  const commanderNames = precon.commanderNames || (precon.commanderName ? [precon.commanderName] : [])
  return {
    share_code: `precon:${slug}`,
    code: `precon:${slug}`,
    deck_name: precon.name,
    deckName: precon.name,
    commander_names: commanderNames,
    commanderNames: commanderNames,
    median: analysis.median,
    p20: analysis.p20,
    p80: analysis.p80,
    peak: analysis.peak,
    coverage: analysis.coverage,
    dimensions: result.dimensions || {},
    packages: result.packages || [],
    combo_summary: result.combos || [],
    combos: result.combos || [],
    game_changers: result.gameChangers || [],
    gameChangers: result.gameChangers || [],
    bracket_signals: result.bracketSignals || {},
    bracketSignals: result.bracketSignals || {},
    product_intelligence: result.productIntelligence || {},
    productIntelligence: result.productIntelligence || {},
    engine_version: analysis.engineVersion,
    engineVersion: analysis.engineVersion,
    semantic_version: analysis.semanticVersion,
    semanticVersion: analysis.semanticVersion,
    iterations: analysis.iterations || 3200,
    source_type: 'precon',
    source_slug: slug,
    image_url: precon.commanderImageUrl || null
  }
}

export async function fetchUserSavedDecks(session = null) {
  const s = session || (await restoreSession().catch(() => null))
  if (!s) {
    userDecksCache = []
    return []
  }
  if (userDecksCache && userDecksCache._userId === s.user?.id) return userDecksCache
  if (userDecksPromise) return userDecksPromise

  userDecksPromise = (async () => {
    try {
      const rows = await listDecks(s)
      const enriched = await Promise.all(
        rows.map(async d => {
          const [history] = await Promise.all([analysisHistory(s, d.id, 1).catch(() => [])])
          return {
            ...d,
            latest: history[0] || null
          }
        })
      )
      enriched._userId = s.user?.id
      userDecksCache = enriched
      return enriched
    } catch (e) {
      console.warn('Unable to load user saved decks:', e)
      return []
    } finally {
      userDecksPromise = null
    }
  })()
  return userDecksPromise
}

export function extractDeckCommanderNames(deck) {
  if (!deck) return []
  const latest = deck.latest || {}
  const res = latest.result || {}
  if (Array.isArray(res.commanderNames) && res.commanderNames.length > 0) {
    return res.commanderNames
  }
  if (Array.isArray(deck.versions?.[0]?.commander_names) && deck.versions[0].commander_names.length > 0) {
    return deck.versions[0].commander_names
  }
  if (Array.isArray(deck.deck_data?.commanderNames) && deck.deck_data.commanderNames.length > 0) {
    return deck.deck_data.commanderNames
  }
  if (Array.isArray(deck.deck_data?.commanders) && deck.deck_data.commanders.length > 0) {
    return deck.deck_data.commanders.map(c => typeof c === 'string' ? c : (c.nameEN || c.name || c.nameFR)).filter(Boolean)
  }
  if (deck.commander_name) {
    return deck.commander_name.includes('+')
      ? deck.commander_name.split('+').map(s => s.trim()).filter(Boolean)
      : [deck.commander_name]
  }
  if (deck.deck_data?.commander) {
    return deck.deck_data.commander.includes('+')
      ? deck.deck_data.commander.split('+').map(s => s.trim()).filter(Boolean)
      : [deck.deck_data.commander]
  }
  return []
}

export function savedDeckToShareRow(deck) {
  if (!deck) return null
  const latest = deck.latest || {}
  const res = latest.result || {}
  const profile = res.profile || {}
  const commanderNames = extractDeckCommanderNames(deck)
  return {
    share_code: `saved:${deck.id}`,
    code: `saved:${deck.id}`,
    deck_name: deck.name,
    deckName: deck.name,
    commander_names: commanderNames,
    commanderNames: commanderNames,
    median: latest.median ?? profile.median,
    p20: latest.p20 ?? profile.floor,
    p80: latest.p80 ?? profile.ceiling,
    peak: latest.peak ?? profile.peak,
    coverage: latest.coverage ?? profile.coverage,
    dimensions: res.dimensions || {},
    packages: res.packages || [],
    combo_summary: res.combos || [],
    combos: res.combos || [],
    game_changers: res.gameChangers || [],
    gameChangers: res.gameChangers || [],
    bracket_signals: res.bracketSignals || {},
    bracketSignals: res.bracketSignals || {},
    product_intelligence: res.productIntelligence || {},
    productIntelligence: res.productIntelligence || {},
    engine_version: latest.engine_version || '3.3.0',
    engineVersion: latest.engine_version || '3.3.0',
    semantic_version: latest.semantic_version || '3.3.0-semantic-14',
    semanticVersion: latest.semantic_version || '3.3.0-semantic-14',
    iterations: latest.iterations || 3000,
    source_type: 'saved',
    saved_deck_id: deck.id
  }
}

export function parseDeckReference(input) {
  const str = String(input || '').trim()
  if (!str) return null

  // 1. Precon: precon:<slug> or /decklists-publiques/<slug>
  const preconPrefixMatch = str.match(/^precon:([a-z0-9-]+)$/i)
  if (preconPrefixMatch) {
    return { type: 'precon', slug: preconPrefixMatch[1].toLowerCase() }
  }
  const preconUrlMatch = str.match(/(?:https?:\/\/[^/]+)?\/decklists-publiques\/([a-z0-9-]+)(?:\/|$|\?)/i)
  if (preconUrlMatch) {
    return { type: 'precon', slug: preconUrlMatch[1].toLowerCase() }
  }

  // 2. Saved deck: saved:<id>
  const savedMatch = str.match(/^saved:([a-f0-9-]+)$/i)
  if (savedMatch) {
    return { type: 'saved', id: savedMatch[1] }
  }

  // 3. Share code: 12 hex chars or /a/12hex
  const shareMatch = str.match(/(?:\/a\/|^|\b)([a-f0-9]{12})(?:\b|\/|$)/i)
  if (shareMatch && !str.includes('decklists-publiques') && !str.startsWith('precon:') && !str.startsWith('saved:')) {
    return { type: 'share', code: shareMatch[1].toLowerCase() }
  }

  return null
}

export async function resolveDeckReference(input, session = null) {
  const ref = parseDeckReference(input)
  if (!ref) return null

  if (ref.type === 'share') {
    return loadAnalysisShare(ref.code)
  }

  if (ref.type === 'precon') {
    const detail = await fetchPreconDetail(ref.slug)
    if (!detail) return null
    return preconToShareRow(detail)
  }

  if (ref.type === 'saved') {
    const userDecks = await fetchUserSavedDecks(session)
    const hit = userDecks.find(d => d.id === ref.id)
    if (!hit) return null
    return savedDeckToShareRow(hit)
  }

  return null
}

export const POPULAR_PRECON_PRESETS = [
  {
    id: 'balanced-4',
    labelEn: '4 Balanced Precons (Median ~47–55)',
    labelFr: '4 Précons équilibrés (Médiane ~47–55)',
    slugs: ['blood-rites-lcc', 'explorers-of-the-deep-lcc', 'peace-offering-blc', 'mutant-menace-pip']
  },
  {
    id: 'diverse-4',
    labelEn: '4 Diverse Archetypes (Aggro/Spells/Vampires/Energy)',
    labelFr: '4 Archétypes variés (Aggro/Sorts/Vampires/Énergie)',
    slugs: ['quick-draw-otj', 'creative-energy-m3c', 'blood-rites-lcc', 'animated-army-blc']
  },
  {
    id: 'modern-8',
    labelEn: '8 Recent Precons (2024–2026)',
    labelFr: '8 Précons récents (2024–2026)',
    slugs: [
      'peace-offering-blc', 'animated-army-blc', 'family-matters-blc', 'squirreled-away-blc',
      'creative-energy-m3c', 'eldrazi-incursion-m3c', 'quick-draw-otj', 'grand-larceny-otj'
    ]
  },
  {
    id: 'classic-8',
    labelEn: '8 Varied Masters & Universes Beyond',
    labelFr: '8 Précons Masters & Universes Beyond',
    slugs: [
      'blood-rites-lcc', 'explorers-of-the-deep-lcc', 'cavalry-charge-moc', 'tinker-time-moc',
      'mutant-menace-pip', 'science-pip', 'hail-caesar-pip', 'scrappy-survivors-pip'
    ]
  }
]
