import { readFileSync } from 'node:fs'
import { analyzePower } from '../src/engine/powerModel.js'
import { parseAeonShiftCsv } from '../src/data/aeonshift.js'
import { AEON_LABEL, ENGINE_VERSION, MODEL_ID, SEMANTIC_VERSION } from '../src/version.js'

if (AEON_LABEL !== 'v3.3') throw new Error(`Unexpected public version label: ${AEON_LABEL}`)
if (ENGINE_VERSION !== '3.3.0') throw new Error(`Unexpected engine version: ${ENGINE_VERSION}`)
if (SEMANTIC_VERSION !== '3.3.0-semantic-17') throw new Error(`Unexpected semantic version: ${SEMANTIC_VERSION}`)

const land = () => ({ name: 'Forest', type: 'Basic Land — Forest', oracle: '', cmc: 0, manaCost: '', id: crypto.randomUUID() })
const card = (name, oracle, cmc, type = 'Instant') => ({ name, oracle, cmc, type, manaCost: '', id: crypto.randomUUID() })
const deck = [
  ...Array.from({ length: 36 }, land),
  card('Dark Ritual', 'Add {B}{B}{B}.', 1),
  card('Lotus Petal', 'Sacrifice Lotus Petal: Add one mana of any color.', 0, 'Artifact'),
  card('Elvish Spirit Guide', 'Exile Elvish Spirit Guide from your hand: Add {G}.', 3, 'Creature'),
  card('Simian Spirit Guide', 'Exile Simian Spirit Guide from your hand: Add {R}.', 3, 'Creature'),
  ...Array.from({ length: 10 }, (_, i) => card(`Draw ${i}`, 'Draw two cards.', 2, 'Sorcery')),
  ...Array.from({ length: 10 }, (_, i) => card(`Removal ${i}`, 'Destroy target creature.', 2)),
  ...Array.from({ length: 39 }, (_, i) => card(`Body ${i}`, 'When this creature enters, create a 1/1 token.', 3, 'Creature')),
]
const cmd = card('Test Commander', 'Whenever another creature enters, draw a card.', 5, 'Legendary Creature')
const csv = 'Name,Base Singleton,Duel Commander\nDark Ritual,5,5\nLotus Petal,16,16\n'
const map = parseAeonShiftCsv(csv)
const r = analyzePower(deck, cmd, map, 300)
if (!Number.isFinite(r.profile.median) || !r.packages.some(p => p.id === 'early-commander')) throw new Error('Smoke test failed')
if (r.methodology?.model !== MODEL_ID) throw new Error(`Model id mismatch: ${r.methodology?.model} !== ${MODEL_ID}`)

const edge = readFileSync(new URL('../supabase/functions/record-analysis/index.ts', import.meta.url), 'utf8')
if (!edge.includes(`const ENGINE_VERSION = '${ENGINE_VERSION}'`)) throw new Error('Frontend/record-analysis engine mismatch')
if (!edge.includes(`const SEMANTIC_VERSION = '${SEMANTIC_VERSION}'`)) throw new Error('Frontend/record-analysis semantic mismatch')
if (!edge.includes("'3.3.0|3.3.0-semantic-16'")) throw new Error('record-analysis must remain rolling-compatible with semantic-16 during semantic-17 rollout')
if (!edge.includes("'3.3.0|3.3.0-semantic-15'")) throw new Error('record-analysis must remain rolling-compatible with semantic-15 during semantic-17 rollout')
if (!edge.includes("'3.3.0|3.3.0-semantic-14'")) throw new Error('record-analysis must remain rolling-compatible with semantic-14 during semantic-17 rollout')
if (!edge.includes("'3.2.0|3.2.0-semantic-1'")) throw new Error('record-analysis must remain rolling-compatible with legacy production 3.2.0|3.2.0-semantic-1')
if (!edge.includes('engine_version: engineVersion') || !edge.includes('semantic_version: semanticVersion')) throw new Error('record-analysis must persist actual client versions')
if (!edge.includes(".eq('engine_version', engineVersion)") || !edge.includes(".eq('semantic_version', semanticVersion)")) throw new Error('record-analysis deduplication must be version-aware')

const stalePublicLabels = ['Aeon Scorer v3.1', 'Aeon Scorer v3.2', 'v3.1 calibration', 'v3.2 calibration', 'v3.1 validation', 'v3.2 validation', 'v3.1 validée', 'v3.2 validée', 'Calibration et validation v3.1', 'Calibration et validation v3.2']
for (const path of ['../src/App.jsx', '../src/sitePages.jsx']) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const stale = stalePublicLabels.find(label => source.includes(label))
  if (stale) throw new Error(`Stale public version label in ${path}: ${stale}`)
}

console.log('Smoke OK', { version: ENGINE_VERSION, semantic: SEMANTIC_VERSION, model: MODEL_ID, profile: r.profile, packages: r.packages.map(p => p.name) })
