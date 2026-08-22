import fs from 'node:fs/promises'
import path from 'node:path'
import { tagsFor, cardFeatures } from '../src/engine/cardFeatures.js'
import { detectPackages, commanderSynergy } from '../src/engine/packageGraph.js'

const root = path.resolve('.')
const preconsDir = path.join(root, 'public/precons')

async function fullCorpusPackageAudit() {
  const files = (await fs.readdir(preconsDir)).filter(f => f.endsWith('.json') && f !== 'catalog.json')
  console.log(`Auditing detected packages across all ${files.length} precons...\n`)

  let totalPackages = 0
  const packageDistribution = {}
  const cardRoleAudits = {
    validCards: 0,
    invalidProducerInPackage: [],
    invalidPayoffInPackage: [],
    invalidCommanderSynergy: []
  }

  for (const file of files) {
    const raw = await fs.readFile(path.join(preconsDir, file), 'utf8')
    const deck = JSON.parse(raw)
    const oracleCards = deck.oracleCards || []
    const commanderName = deck.commanderName
    const commanderRaw = oracleCards.find(c => c.isCommander || c.name.toLowerCase() === (commanderName || '').toLowerCase())
    const commander = commanderRaw ? cardFeatures({ ...commanderRaw, isCommander: true }) : null

    // Expand deck
    const deckCards = []
    for (const rawLine of (deck.decklist || '').split(/\r?\n/)) {
      const m = rawLine.trim().match(/^(\d+)\s+(.+)$/)
      if (!m) continue
      const qty = Number(m[1]) || 0
      const name = m[2].trim()
      if (commander && name.toLowerCase() === commander.name.toLowerCase()) continue
      const found = oracleCards.find(c => c.name.toLowerCase() === name.toLowerCase())
      if (found) {
        for (let i = 0; i < qty; i++) {
          deckCards.push(cardFeatures({
            name: found.name,
            type: found.type || found.type_line,
            oracle: found.oracle || found.oracle_text,
            cmc: found.cmc,
            manaCost: found.manaCost || found.mana_cost,
            producedMana: found.producedMana || found.produced_mana,
            colors: found.colors,
            colorIdentity: found.colorIdentity || found.color_identity,
            isCommander: false
          }))
        }
      }
    }

    const packages = detectPackages(deckCards, commander)
    totalPackages += packages.length

    for (const pkg of packages) {
      packageDistribution[pkg.id] = (packageDistribution[pkg.id] || 0) + 1

      // Verify every producer card has a valid producer role
      for (const prod of (pkg.producerCards || [])) {
        cardRoleAudits.validCards++
        if (pkg.id === 'early-commander') {
          // must be burst mana or persistent ramp/mana cmc <= 3
          const isBurst = (prod.tags || []).includes('burst-mana')
          const isRampOrMana = (prod.tags || []).includes('land-ramp') || (prod.tags || []).includes('mana')
          if (!isBurst && !(prod.cmc <= 3 && isRampOrMana)) {
            cardRoleAudits.invalidProducerInPackage.push({ deck: deck.name, pkg: pkg.id, card: prod.name })
          }
        } else if (pkg.producerTags) {
          const hasAnyTag = pkg.producerTags.some(t => (prod.tags || []).includes(t))
          if (!hasAnyTag) {
            cardRoleAudits.invalidProducerInPackage.push({ deck: deck.name, pkg: pkg.id, card: prod.name, tags: prod.tags, expected: pkg.producerTags })
          }
        }
      }

      // Verify every payoff card has a valid payoff role
      for (const payoff of (pkg.payoffCards || [])) {
        cardRoleAudits.validCards++
        if (pkg.id === 'early-commander') {
          // Payoff is commander
          if (payoff.name !== commander?.name) {
            cardRoleAudits.invalidPayoffInPackage.push({ deck: deck.name, pkg: pkg.id, card: payoff.name })
          }
        } else if (pkg.id === 'blink-etb') {
          // True ETB payoff
          const o = (payoff.oracle || '').toLowerCase()
          if (payoff.isLand || /enters tapped|enters the battlefield tapped/i.test(o) && !/when(?:ever)? [^.]* enters/i.test(o)) {
            cardRoleAudits.invalidPayoffInPackage.push({ deck: deck.name, pkg: pkg.id, card: payoff.name, reason: 'tapped land or non-trigger' })
          }
        } else if (pkg.payoffTags) {
          const hasAnyTag = pkg.payoffTags.some(t => (payoff.tags || []).includes(t))
          if (!hasAnyTag) {
            cardRoleAudits.invalidPayoffInPackage.push({ deck: deck.name, pkg: pkg.id, card: payoff.name, tags: payoff.tags, expected: pkg.payoffTags })
          }
        }
      }
    }

    // Check commander synergy
    if (commander) {
      const syn = commanderSynergy(deckCards, commander)
      if (syn.score < 0 || syn.score > 100 || isNaN(syn.score)) {
        cardRoleAudits.invalidCommanderSynergy.push({ deck: deck.name, commander: commander.name, score: syn.score })
      }
    }
  }

  console.log(`=== AUDIT SUMMARY ===`)
  console.log(`Total decks inspected: ${files.length}`)
  console.log(`Total packages detected across corpus: ${totalPackages}`)
  console.log(`Total card instances verified inside packages: ${cardRoleAudits.validCards}\n`)
  
  console.log('Package Distribution across precons:')
  for (const [pkgId, count] of Object.entries(packageDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${pkgId.padEnd(16)}: ${count} decks (${((count / files.length) * 100).toFixed(1)}%)`)
  }

  console.log(`\nInvalid Producer cards in packages: ${cardRoleAudits.invalidProducerInPackage.length}`)
  if (cardRoleAudits.invalidProducerInPackage.length > 0) {
    for (const item of cardRoleAudits.invalidProducerInPackage) {
      console.log(`  Deck: [${item.deck}] Pkg: ${item.pkg} Card: ${item.card} Tags: ${JSON.stringify(item.tags)} Expected: ${JSON.stringify(item.expected)}`)
    }
  }
  console.log(`Invalid Payoff cards in packages: ${cardRoleAudits.invalidPayoffInPackage.length}`)
  console.log(`Invalid Commander synergies: ${cardRoleAudits.invalidCommanderSynergy.length}`)

  if (cardRoleAudits.invalidProducerInPackage.length === 0 &&
      cardRoleAudits.invalidPayoffInPackage.length === 0 &&
      cardRoleAudits.invalidCommanderSynergy.length === 0) {
    console.log('\n🌟 100% PERFECT: Zero role leakage, zero invalid package assignments across all 168 precons!')
  }
}

fullCorpusPackageAudit()
