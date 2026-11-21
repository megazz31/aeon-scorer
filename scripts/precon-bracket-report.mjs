// Bracket estimate over every analyzed public precon. WotC places preconstructed decks in bracket 2 by default, so every
// other estimate is listed with the rule that decided it: a reviewable outlier list, not a gate.
import fs from 'node:fs/promises'
import path from 'node:path'
import { deckFacts, estimateBracket } from '../src/engine/bracketEstimate.js'
import { gameChangersIn } from '../src/productData.js'
import { SEMANTIC_VERSION } from '../src/version.js'

const dir = path.resolve('public/precons'), rows = []
for (const f of (await fs.readdir(dir)).filter(f => f.endsWith('.json') && f !== 'catalog.json')) {
  const d = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'))
  if (!d.result?.clock) continue
  const cards = d.oracleCards || [], b = estimateBracket(deckFacts(d.result, cards, { gameChangers: gameChangersIn(cards.map(c => c.name)) }))
  const evidence = b.floors.filter(x => x.floor === b.bracket && x.floor >= 3).flatMap(x => x.evidence).slice(0, 6)
  rows.push({ slug: d.slug, name: d.name, releaseDate: d.releaseDate, bracket: b.bracket, range: b.range, binding: b.binding, evidence, firstKillMedian: d.result.clock.firstKill.median })
}
const count = b => rows.filter(r => r.bracket === b).length, pct = n => Math.round(n / Math.max(1, rows.length) * 1000) / 10
const report = { generatedAt: new Date().toISOString(), semanticVersion: SEMANTIC_VERSION, label: 'precon = 2 (WotC default)', decks: rows.length, exact: pct(count(2)), withinOne: pct(rows.filter(r => Math.abs(r.bracket - 2) <= 1).length), distribution: Object.fromEntries([2, 3, 4, 5].map(b => [b, count(b)])), outliers: rows.filter(r => r.bracket !== 2).sort((a, b) => b.bracket - a.bracket || a.name.localeCompare(b.name)) }
await fs.writeFile('calibration/precon-brackets.json', JSON.stringify(report, null, 2) + '\n')
const md = [`# Bracket estimate on public precons`, '', `Semantic: \`${SEMANTIC_VERSION}\` · ${rows.length} analyzed precons · label: bracket 2 (WotC default for preconstructed decks)`, '', `- Exact (B2): **${report.exact}%** · within ±1: **${report.withinOne}%**`, `- Distribution: ${[2, 3, 4, 5].map(b => `B${b} ${count(b)}`).join(' · ')}`, '', 'Outliers are not errors by default: a precon with a Game Changer or a two-card combo is bracket 3 under the official rules.', '', '| Precon | Release | Estimate | Decided by | Evidence | First elimination (median) |', '|---|---|---|---|---|---|']
for (const r of report.outliers) md.push(`| ${r.name.replace(/\|/g, '/')} | ${r.releaseDate || '—'} | B${r.bracket}${r.range[1] > r.bracket ? `–${r.range[1]}` : ''} | ${r.binding.join(', ')} | ${r.evidence.join(' · ').replace(/\|/g, '/') || '—'} | T${r.firstKillMedian} |`)
await fs.writeFile('calibration/precon-brackets.md', md.join('\n') + '\n')
console.log(`PRECON BRACKETS — ${rows.length} decks · exact B2 ${report.exact}% · ±1 ${report.withinOne}% · ${JSON.stringify(report.distribution)}`)
