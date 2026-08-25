import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseDeckReference, preconToShareRow, savedDeckToShareRow, POPULAR_PRECON_PRESETS } from '../src/deckPickerSource.js'
import { normalizedShare, podSummary, roadmapResultFromShare } from '../src/productData.js'
import { buildPodIntelligence } from '../src/engine/roadmapEngine.js'
import { formPods } from '../src/engine/matchmaking.js'

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 1. Test parseDeckReference
assert.deepEqual(parseDeckReference('https://aeon-scorer.vercel.app/a/79dd4ccae3d3'), { type: 'share', code: '79dd4ccae3d3' })
assert.deepEqual(parseDeckReference('/a/79dd4ccae3d3'), { type: 'share', code: '79dd4ccae3d3' })
assert.deepEqual(parseDeckReference('79dd4ccae3d3'), { type: 'share', code: '79dd4ccae3d3' })
assert.deepEqual(parseDeckReference('precon:blood-rites-lcc'), { type: 'precon', slug: 'blood-rites-lcc' })
assert.deepEqual(parseDeckReference('https://aeon-scorer.vercel.app/decklists-publiques/blood-rites-lcc'), { type: 'precon', slug: 'blood-rites-lcc' })
assert.deepEqual(parseDeckReference('/decklists-publiques/blood-rites-lcc/'), { type: 'precon', slug: 'blood-rites-lcc' })
assert.deepEqual(parseDeckReference('saved:86fb050d-6cb6-49e3-a4bf-e5a6f586611f'), { type: 'saved', id: '86fb050d-6cb6-49e3-a4bf-e5a6f586611f' })
assert.equal(parseDeckReference(''), null)
assert.equal(parseDeckReference('Alice'), null)

// 2. Test preconToShareRow & product compatibility
const preconJson = JSON.parse(read('public/precons/blood-rites-lcc.json'))
const shareRow = preconToShareRow(preconJson)
assert.equal(shareRow.share_code, 'precon:blood-rites-lcc')
assert.equal(shareRow.deck_name, 'Blood Rites')
assert.deepEqual(shareRow.commander_names, ['Clavileño, First of the Blessed'])
assert.equal(shareRow.median, 55)

const norm = normalizedShare(shareRow)
assert.equal(norm.deckName, 'Blood Rites')
assert.equal(norm.median, 55)

const roadmapRes = roadmapResultFromShare(shareRow)
assert.equal(roadmapRes.profile.median, 55)
assert.equal(roadmapRes.deckName, 'Blood Rites')

// 3. Test multi-precon pod intelligence & matchmaking
const p1 = preconToShareRow(JSON.parse(read('public/precons/blood-rites-lcc.json')))
const p2 = preconToShareRow(JSON.parse(read('public/precons/explorers-of-the-deep-lcc.json')))
const p3 = preconToShareRow(JSON.parse(read('public/precons/cavalry-charge-moc.json')))
const p4 = preconToShareRow(JSON.parse(read('public/precons/creative-energy-m3c.json')))
const rows = [p1, p2, p3, p4]

const summary = podSummary(rows)
assert.ok(summary.fit, 'podSummary must calculate fit')
assert.equal(summary.decks.length, 4)

const intel = buildPodIntelligence(rows.map(roadmapResultFromShare))
assert.ok(intel?.podMatch?.mismatch >= 0, 'podIntelligence must calculate mismatch')

const players = rows.map((r, i) => ({
  id: r.share_code,
  name: r.deck_name,
  analysis: roadmapResultFromShare(r),
  share: r,
  source: 'precon'
}))
const matchmaking = formPods(players, { podSize: 4 })
assert.equal(matchmaking.pods.length, 1)

// 4. Test savedDeckToShareRow
const mockSavedDeck = {
  id: 'mock-1234',
  name: 'My Custom Deck',
  commander_name: 'Urza, Lord High Artificer',
  latest: {
    median: 62,
    p20: 50,
    p80: 74,
    peak: 92,
    coverage: 90,
    iterations: 3000,
    engine_version: '3.3.0',
    semantic_version: '3.3.0-semantic-14',
    result: {
      dimensions: { speed: 70, synergy: 80 },
      packages: [],
      combos: []
    }
  }
}
const savedShareRow = savedDeckToShareRow(mockSavedDeck)
assert.equal(savedShareRow.share_code, 'saved:mock-1234')
assert.equal(savedShareRow.deck_name, 'My Custom Deck')
assert.equal(savedShareRow.median, 62)

// 5. Test Presets
assert.ok(POPULAR_PRECON_PRESETS.length >= 4)
for (const preset of POPULAR_PRECON_PRESETS) {
  assert.ok(preset.id)
  assert.ok(preset.labelEn)
  assert.ok(preset.labelFr)
  assert.ok(Array.isArray(preset.slugs) && preset.slugs.length >= 4)
}

// 6. Source UI Contract Assertions
const podCode = read('src/ProductPages.jsx')
assert.match(podCode, /DeckPresetsBar/, 'PodMatchPage must include DeckPresetsBar')
assert.match(podCode, /DeckSlotPicker/, 'PodMatchPage must include DeckSlotPicker')
assert.match(podCode, /DeckPickerModal/, 'PodMatchPage must include DeckPickerModal')
assert.match(podCode, /resolveDeckReference/, 'PodMatchPage must use resolveDeckReference')

const matchCode = read('src/AeonMatchPage.jsx')
assert.match(matchCode, /DeckPresetsBar/, 'AeonMatchPage must include DeckPresetsBar')
assert.match(matchCode, /DeckPickerModal/, 'AeonMatchPage must include DeckPickerModal')
assert.match(matchCode, /resolveDeckReference/, 'AeonMatchPage must use resolveDeckReference')

const tournamentCode = read('src/TournamentPage.jsx')
assert.match(tournamentCode, /DeckPresetsBar/, 'TournamentPage must include DeckPresetsBar')
assert.match(tournamentCode, /DeckPickerModal/, 'TournamentPage must include DeckPickerModal')
assert.match(tournamentCode, /resolveDeckReference/, 'TournamentPage must use resolveDeckReference')

const cloudCode = read('src/CloudWorkspace.jsx')
assert.match(cloudCode, /\/pod\?d=saved:/, 'CloudWorkspace must provide direct Compare action link')

const publicDecksCode = read('src/PublicDecksPage.jsx')
assert.match(publicDecksCode, /\/pod\?d=precon:/, 'PublicDecksPage must provide direct Compare action link')
assert.match(publicDecksCode, /\/tournoi\?d=precon:/, 'PublicDecksPage must provide direct Tournament action link')

const cssCode = read('src/readability.css')
assert.match(cssCode, /\.deckPresetsBar/, 'readability.css must style deckPresetsBar')
assert.match(cssCode, /\.deckSlotPicker/, 'readability.css must style deckSlotPicker')
assert.match(cssCode, /\.deckPickerModal/, 'readability.css must style deckPickerModal')

console.log('DECK PREFILL CONTRACT OK — universal slot selector, multi-deck presets, cross-tool resolver and direct action gateways verified.')
