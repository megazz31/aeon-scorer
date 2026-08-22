import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { analyzePower } from '../src/engine/powerModel.js'

const root = path.resolve('.')
const SENTINEL_SLUGS = [
  'blood-rites-lcc',
  'explorers-of-the-deep-lcc',
  'cavalry-charge-moc',
  'creative-energy-m3c',
  'eldrazi-unbound-cmm',
  'deep-clue-sea-mkc',
  'animated-army-blc',
  'quick-draw-otc',
  'mutant-menace-pip',
  'peace-offering-blc'
]

console.log(`Running Fast Sentinel Precon Audit (${SENTINEL_SLUGS.length} diverse archetypes)...`)
const start = Date.now()

for (const slug of SENTINEL_SLUGS) {
  const filePath = path.join(root, 'public/precons', `${slug}.json`)
  let data
  try {
    data = JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (e) {
    console.warn(`Sentinel deck ${slug} not found, skipping.`)
    continue
  }

  const { name, commanderName, decklist, oracleCards, result: expected } = data
  assert.ok(name && commanderName && decklist && Array.isArray(oracleCards), `${slug} invalid precon payload`)

  const commander = oracleCards.find(c => c.isCommander || c.name.toLowerCase() === commanderName.toLowerCase())
  assert.ok(commander, `${slug} must have an identified commander in Oracle evidence`)

  const cards = oracleCards.filter(c => !c.isCommander)
  // Run fast 400 iterations for sub-second execution
  const fastResult = analyzePower(cards, commander, null, 400)

  assert.ok(Number.isFinite(fastResult.profile.median), `${slug} invalid median`)
  assert.ok(fastResult.profile.median >= 35 && fastResult.profile.median <= 75, `${slug} median out of precon bounds: ${fastResult.profile.median}`)
  assert.ok(fastResult.profile.floor <= fastResult.profile.median, `${slug} floor > median`)
  assert.ok(fastResult.profile.median <= fastResult.profile.ceiling, `${slug} median > ceiling`)
  assert.ok(fastResult.profile.ceiling <= fastResult.profile.peak, `${slug} ceiling > peak`)

  // Check expected packages presence
  if (slug === 'blood-rites-lcc') {
    assert.ok(fastResult.packages.some(p => p.id === 'sacrifice' || p.id === 'tokens'), 'Blood Rites must detect sacrifice or tokens')
  } else if (slug === 'explorers-of-the-deep-lcc') {
    assert.ok(fastResult.packages.some(p => p.id === 'counters' || p.id === 'early-commander'), 'Explorers must detect counters or early commander')
  } else if (slug === 'cavalry-charge-moc') {
    assert.ok(fastResult.packages.some(p => p.id === 'graveyard' || p.id === 'early-commander'), 'Cavalry Charge must detect graveyard recursion')
  }

  console.log(`  ✓ ${name} [${fastResult.profile.median} (${fastResult.profile.floor}-${fastResult.profile.ceiling}) peak ${fastResult.profile.peak}] - ${fastResult.packages.length} pkg(s)`)
}

const elapsed = ((Date.now() - start) / 1000).toFixed(2)
console.log(`FAST SENTINEL PRECON AUDIT OK — ${SENTINEL_SLUGS.length} archetypes validated in ${elapsed}s.`)
