/**
 * Effet du pont sémantique sur la bibliothèque publique de précons.
 *
 * Sert de garde de non-régression : le pont ne doit déplacer que les decks où
 * une carte porte une aptitude vraiment compilée que l'heuristique manquait.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { analyzePower } from '../src/engine/powerModel.js'

const root = path.resolve('.')
const slugs = (await fs.readdir(path.join(root, 'public/precons'))).filter(name => name.endsWith('.json'))
const changed = []
let checked = 0
for (const slug of slugs) {
  const data = JSON.parse(await fs.readFile(path.join(root, 'public/precons', slug), 'utf8'))
  if (!Array.isArray(data.oracleCards) || !data.commanderName || !data.decklist) continue
  const index = new Map(data.oracleCards.map(card => [String(card.name).toLowerCase(), card]))
  const commander = index.get(String(data.commanderName).toLowerCase())
  if (!commander) continue
  const cards = []
  for (const line of String(data.decklist).split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+)\s+(.+)$/)
    if (!match) continue
    const name = match[2].trim()
    if (name.toLowerCase() === commander.name.toLowerCase()) continue
    const source = index.get(name.toLowerCase())
    if (!source) continue
    for (let copy = 0; copy < Number(match[1]); copy += 1) cards.push(source)
  }
  if (cards.length < 90) continue
  checked += 1
  const withBridge = analyzePower(cards, { ...commander, isCommander: true }, null, 250, { emitProduct: false, record: false, firstAccess: false })
  const withoutBridge = analyzePower(cards, { ...commander, isCommander: true }, null, 250, { emitProduct: false, record: false, firstAccess: false, rulesSemantics: false })
  const delta = withBridge.profile.median - withoutBridge.profile.median
  const packageIds = values => values.packages.map(pkg => pkg.id).join(',')
  if (delta !== 0 || packageIds(withBridge) !== packageIds(withoutBridge) || withBridge.semantics.bridged > 0) {
    changed.push({ slug, name: data.name, delta, bridged: withBridge.semantics.bridged, rolesAdded: withBridge.semantics.rolesAdded, packages: `${packageIds(withoutBridge)} -> ${packageIds(withBridge)}` })
  }
}
console.log(`precons checked: ${checked}`)
console.log(`precons affected by the bridge: ${changed.length}`)
for (const row of changed) console.log(`  ${row.slug} median ${row.delta >= 0 ? '+' : ''}${row.delta} · cartes pontées ${row.bridged} · rôles ${JSON.stringify(row.rolesAdded)}`)
