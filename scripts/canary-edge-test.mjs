import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const SUPABASE_URL = 'https://jrzzlcklctmqgemepucs.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable_wrSl8JoCrvkBhh3hN6LiAg_M2yHrr1y'
const ENDPOINT = `${SUPABASE_URL}/functions/v1/record-analysis`

const headers = {
  apikey: PUBLISHABLE_KEY,
  'Content-Type': 'application/json'
}

function normalizedDeckKey(decklist, commander) {
  const sorted = decklist
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join('\n')
  return `${commander.trim().toLowerCase()}\n${sorted}`
}

function hashHex(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

// Generate a valid 99 card mainboard
const sampleCards = [
  'Sol Ring', 'Arcane Signet', 'Command Tower', 'Swords to Plowshares', 'Counterspell',
  'Rhystic Study', 'Demonic Tutor', 'Cyclonic Rift', 'Mana Crypt', 'Smothering Tithe',
  'Fierce Guardianship', 'Force of Will', 'Vampiric Tutor', 'Mystical Tutor', 'Enlightened Tutor',
  'Birds of Paradise', 'Noble Hierarch', 'Deathrite Shaman', 'Bloom Tender', 'Faeburrow Elder',
  'Cultivate', 'Kodama\'s Reach', 'Farseek', 'Nature\'s Lore', 'Three Visits',
  'Heroic Intervention', 'Teferi\'s Protection', 'Flusterstorm', 'Swan Song', 'Pact of Negation',
  'Toxic Deluge', 'Damn', 'Supreme Verdict', 'Wrath of God', 'Farewell',
  'Esper Sentinel', 'Drannith Magistrate', 'Grand Abolisher', 'Opposition Agent', 'Dauthi Voidwalker',
  'Sylvan Library', 'Necropotence', 'Bolas\'s Citadel', 'Aetherflux Reservoir', 'Sensei\'s Divining Top',
  'Underworld Breach', 'Brainstorm', 'Ponder', 'Preordain', 'Gitaxian Probe',
  'Mox Diamond', 'Chrome Mox', 'Lotus Petal', 'Mana Vault', 'Grim Monolith',
  'Fellwar Stone', 'Talismans of Progress', 'Talisman of Dominance', 'Talisman of Hierarchy', 'Talisman of Curiosity',
  'Command Beacon', 'Exotic Orchard', 'City of Brass', 'Mana Confluence', 'Reflecting Pool',
  'Polluted Delta', 'Flooded Strand', 'Windswept Heath', 'Marsh Flats', 'Verdant Catacombs',
  'Misty Rainforest', 'Scalding Tarn', 'Arid Mesa', 'Bloodstained Mire', 'Wooded Foothills',
  'Tundra', 'Underground Sea', 'Tropical Island', 'Savannah', 'Scrubland', 'Bayou',
  'Hallowed Fountain', 'Watery Grave', 'Breeding Pool', 'Temple Garden', 'Godless Shrine', 'Overgrown Tomb',
  'Sea of Clouds', 'Morphic Pool', 'Rejuvenating Springs', 'Bountiful Promenade', 'Vault of Champions', 'Undergrowth Stadium',
  'Island', 'Plains', 'Swamp', 'Forest', 'Ancient Tomb', 'Gemstone Caverns', 'Urza\'s Saga'
]

const sampleDecklist = sampleCards.map(c => `1 ${c}`).join('\n')
const commanderName = 'Atraxa, Praetors\' Voice'
const validDeckHash = hashHex(normalizedDeckKey(sampleDecklist, commanderName))

const sampleResult = {
  profile: {
    median: 75,
    floor: 68,
    ceiling: 82,
    peak: 90,
    dispersion: 14,
    consistency: 80,
    commanderDelta: 5
  },
  dimensions: {
    speed: 70,
    explosiveness: 65,
    consistency: 80,
    interaction: 75,
    resilience: 60
  },
  roles: {
    accelerator: 12,
    interaction: 15,
    cardAdvantage: 10
  },
  packages: [
    { id: 'fast-mana', name: 'Fast Mana', strength: 85, cohesion: 80, producers: ['Sol Ring', 'Mana Crypt'], payoffs: [] }
  ],
  combos: [],
  simulation: {
    iterations: 1800,
    turnProfile: [{ turn: 1, engine: 5 }, { turn: 2, engine: 15 }]
  }
}

async function runCanaryTests() {
  console.log(`Running 8 Rolling Canary Tests on ${ENDPOINT}...`)
  let passed = 0

  // 1. OPTIONS CORS Preflight
  {
    const res = await fetch(ENDPOINT, { method: 'OPTIONS' })
    assert.equal(res.status, 200, 'OPTIONS must return 200 OK')
    assert.equal(res.headers.get('access-control-allow-origin'), '*', 'CORS origin must be *')
    console.log('✓ Canary 1: OPTIONS CORS preflight OK (200)')
    passed++
  }

  // 2. POST with missing required fields
  {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        decklist: sampleDecklist
      })
    })
    assert.equal(res.status, 400, 'Missing fields must return 400 Bad Request')
    const data = await res.json()
    assert.equal(data.error, 'invalid_payload')
    console.log('✓ Canary 2: Missing required fields rejected (400 invalid_payload)')
    passed++
  }

  // 3. POST with invalid deck size (e.g. 5 cards instead of 99/100)
  {
    const badDeck = '1 Sol Ring\n1 Island\n1 Swamp'
    const badHash = hashHex(normalizedDeckKey(badDeck, commanderName))
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        decklist: badDeck,
        commanderName,
        deckHash: badHash,
        engineVersion: '3.3.0',
        semanticVersion: '3.3.0-semantic-17',
        iterations: 1800,
        cards: [{ name: 'Sol Ring', tags: ['fast-mana'] }],
        result: sampleResult
      })
    })
    assert.equal(res.status, 400, 'Bad deck size must return 400')
    const data = await res.json()
    assert.equal(data.error, 'invalid_commander_deck_size')
    console.log('✓ Canary 3: Invalid deck size rejected (400 invalid_commander_deck_size)')
    passed++
  }

  // 4. POST with unsupported / future version pair
  {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        decklist: sampleDecklist,
        commanderName,
        deckHash: validDeckHash,
        engineVersion: '9.9.9',
        semanticVersion: '9.9.9-semantic-99',
        iterations: 1800,
        cards: sampleCards.map(name => ({ name })),
        result: sampleResult
      })
    })
    assert.equal(res.status, 409, 'Unsupported version pair must return 409')
    const data = await res.json()
    assert.equal(data.error, 'version_mismatch')
    console.log('✓ Canary 4: Unsupported version pair rejected (409 version_mismatch)')
    passed++
  }

  // 5. POST with legacy pair 3.2.0 | 3.2.0-semantic-1 (Rolling compatibility)
  {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        decklist: sampleDecklist,
        commanderName,
        deckHash: validDeckHash,
        engineVersion: '3.2.0',
        semanticVersion: '3.2.0-semantic-1',
        iterations: 1800,
        cards: sampleCards.map(name => ({ name })),
        result: sampleResult
      })
    })
    assert.equal(res.status, 200, 'Legacy version pair must be accepted (200 OK)')
    const data = await res.json()
    assert.equal(data.ok, true, 'Response must indicate ok: true')
    console.log('✓ Canary 5: Legacy pair 3.2.0|3.2.0-semantic-1 rolling-compat accepted (200 OK)')
    passed++
  }

  // 6. POST with current release pair 3.3.0 | 3.3.0-semantic-17
  {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        decklist: sampleDecklist,
        commanderName,
        deckHash: validDeckHash,
        engineVersion: '3.3.0',
        semanticVersion: '3.3.0-semantic-17',
        iterations: 1800,
        cards: sampleCards.map(name => ({ name })),
        result: sampleResult
      })
    })
    assert.equal(res.status, 200, 'New release version pair must be accepted (200 OK)')
    const data = await res.json()
    assert.equal(data.ok, true, 'Response must indicate ok: true')
    console.log('✓ Canary 6: Release pair 3.3.0|3.3.0-semantic-17 accepted (200 OK)')
    passed++
  }

  // 7. POST duplicate submission (Idempotence & Deduplication)
  {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        decklist: sampleDecklist,
        commanderName,
        deckHash: validDeckHash,
        engineVersion: '3.3.0',
        semanticVersion: '3.3.0-semantic-17',
        iterations: 1800,
        cards: sampleCards.map(name => ({ name })),
        result: sampleResult
      })
    })
    assert.equal(res.status, 200, 'Duplicate submission must return 200 OK')
    const data = await res.json()
    assert.equal(data.ok, true)
    assert.equal(data.duplicate, true, 'Duplicate flag must be true')
    console.log('✓ Canary 7: Duplicate analysis idempotently handled (200 OK, duplicate: true)')
    passed++
  }

  // 8. Method Not Allowed (GET)
  {
    const res = await fetch(ENDPOINT, {
      method: 'GET',
      headers
    })
    assert.equal(res.status, 405, 'GET method must return 405 Method Not Allowed')
    const data = await res.json()
    assert.equal(data.error, 'method_not_allowed')
    console.log('✓ Canary 8: Non-POST/OPTIONS method rejected (405 method_not_allowed)')
    passed++
  }

  console.log(`\n========================================`)
  console.log(`🎉 ALL 8 CANARY TESTS SUCCEEDED (${passed}/8)`)
  console.log(`========================================`)
}

runCanaryTests().catch(err => {
  console.error('Canary test failed:', err)
  process.exit(1)
})
