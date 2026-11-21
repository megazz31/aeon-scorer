import { useEffect, useMemo, useState } from 'react'
import { featureDeck } from './engine/cardFeatures.js'
import { deckFacts, estimateBracket, BRACKET_MIN_TURNS } from './engine/bracketEstimate.js'
import { CHARTER_OPTIONS, normalizeCharter, encodeCharter, decodeCharter, evaluateCharter } from './engine/tableCharter.js'
import { gameChangersIn } from './productData.js'
import './tableVerdict.css'

const STORE = 'aeon-table-charter'
const pick = (lang, en, fr) => lang === 'fr' ? fr : en
const turn = (v, max) => v == null ? '—' : v > max ? `>T${max}` : `T${v}`
const BRACKET_LABEL = { 1: ['Exhibition', 'Exhibition'], 2: ['Core', 'Core'], 3: ['Upgraded', 'Upgraded'], 4: ['Optimized', 'Optimized'], 5: ['cEDH', 'cEDH'] }
const FLOOR = {
  'game-changers': ['Game Changers', 'Game Changers'], 'mass-land-denial': ['Mass land denial', 'Destruction massive de terrains'], 'extra-turns': ['Extra turns', 'Tours supplémentaires'],
  combos: ['Game-ending combos', 'Combos qui finissent la partie'], speed: ['Speed vs official turn expectations', 'Vitesse vs tours attendus officiels'], baseline: ['No bracket 3+ signal', 'Aucun signal de bracket 3+'],
}
const CHECK = {
  'game-changers': ['Game Changers', 'Game Changers'], 'fast-mana': ['Fast mana', 'Mana rapide'], combos: ['Combos', 'Combos'], tutors: ['Tutors', 'Tuteurs'], 'extra-turns': ['Extra turns', 'Tours supplémentaires'],
  'mass-land-denial': ['Mass land denial', 'Destruction massive de terrains'], 'land-lock': ['Land locks (Blood Moon…)', 'Verrous de terrains (Blood Moon…)'], stax: ['Stax', 'Stax'],
  'tempo-denial': ['Repeated bounce / stun (Valefor…)', 'Renvois / stun répétés (Valefor…)'], theft: ['Stealing permanents', 'Vol de permanents'], 'min-turns': ['Minimum game length', 'Durée minimale de partie'],
}
const STATUS = { ok: ['Fits', 'Conforme'], announce: ['Announce it', 'À annoncer'], discuss: ['Worth a talk', 'À discuter'], out: ['Breaks the charter', 'Hors charte'] }
const FLOOR_STATUS = { ok: ['inside', 'dedans'], limit: ['on the edge', 'en limite'], exceeds: ['above', 'au-dessus'], unknown: ['unknown', 'inconnu'] }
const OPTION = {
  any: ['Any', 'Libre'], 'sol-ring-only': ['Sol Ring only', 'Sol Ring seulement'], none: ['None', 'Aucun'], late: ['Late only', 'Tardives seulement'], single: ['No chaining', 'Pas d’enchaînement'],
  forbidden: ['Forbidden', 'Interdit'], announce: ['Announce', 'À annoncer'], allowed: ['Allowed', 'Autorisé'],
}
const FIELD = {
  fastMana: ['Fast mana', 'Mana rapide'], combos: ['Game-ending combos', 'Combos qui finissent la partie'], extraTurns: ['Extra turns', 'Tours supplémentaires'], mld: ['Mass land denial', 'Destruction massive de terrains'],
  landLock: ['Land locks', 'Verrous de terrains'], stax: ['Stax', 'Stax'], tempoDenial: ['Repeated bounce / stun', 'Renvois / stun répétés'], theft: ['Theft', 'Vol'],
  maxGameChangers: ['Max Game Changers', 'Game Changers max'], comboMinTurn: ['Combos not before turn', 'Combos pas avant le tour'], maxTutors: ['Max tutors', 'Tuteurs max'], minTurns: ['Games last at least (turns)', 'Parties d’au moins (tours)'],
}

function initialCharter() {
  try { const fromUrl = decodeCharter(new URLSearchParams(location.search).get('charte')); if (fromUrl) return fromUrl } catch {}
  try { const saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved) return normalizeCharter(saved) } catch {}
  return normalizeCharter({ preset: 3 })
}

function checkDetail(c, lang) {
  const d = c.detail || {}, cap = n => n >= 99 ? '∞' : n
  switch (c.id) {
    case 'game-changers': return `${d.count} / ${cap(d.max)}`
    case 'tutors': return `${d.count} / ${cap(d.max)}`
    case 'extra-turns': return pick(lang, `${d.count} card(s)`, `${d.count} carte(s)`)
    case 'fast-mana': return d.turn1Share != null ? pick(lang, `fast mana on turn 1 in ${d.turn1Share}% of games`, `mana rapide au tour 1 dans ${d.turn1Share}% des parties`) : ''
    case 'combos': return d.policy === 'late' ? pick(lang, `${d.earlyShare}% of games win by combo before turn ${d.beforeTurn}`, `${d.earlyShare}% des parties gagnent par combo avant le tour ${d.beforeTurn}`) : pick(lang, `${d.lines} line(s) detected`, `${d.lines} ligne(s) détectée(s)`)
    case 'min-turns': return pick(lang, `${d.share}% of games eliminate a player by turn ${d.measuredTurn} (blocking table)`, `${d.share}% des parties éliminent un joueur au tour ${d.measuredTurn} ou avant (table qui bloque)`)
    case 'tempo-denial': return d.recurring?.length ? pick(lang, `repeatable: ${d.recurring.join(', ')}`, `répétable : ${d.recurring.join(', ')}`) : ''
    default: return ''
  }
}

function floorDetail(f, lang) {
  const d = f.detail || {}
  if (f.id === 'speed') return d.reason ? pick(lang, 'clock unavailable', 'horloge indisponible') : pick(lang, `${d.share}% of games eliminate a player by turn ${d.turn} · first elimination median ${d.firstKillMedian ? `T${d.firstKillMedian}` : '—'}`, `${d.share}% des parties éliminent un joueur au tour ${d.turn} ou avant · première élimination médiane ${d.firstKillMedian ? `T${d.firstKillMedian}` : '—'}`)
  if (f.id === 'combos') return d.lines ? pick(lang, `${d.lines} line(s) · ${d.winByTurn6}% win by turn 6`, `${d.lines} ligne(s) · ${d.winByTurn6}% de victoires au tour 6`) : pick(lang, 'none detected', 'aucune détectée')
  if ('count' in d) return pick(lang, `${d.count} card(s)`, `${d.count} carte(s)`)
  return ''
}

export function TableVerdict({ clock, result, cards = [], insights = null, lang = 'en', compact = false }) {
  const L = (en, fr) => pick(lang, en, fr)
  const [charter, setCharter] = useState(initialCharter), [copied, setCopied] = useState(''), [open, setOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(charter)) } catch {} }, [charter])
  const facts = useMemo(() => {
    const featured = cards.some(c => Array.isArray(c?.tags)) ? cards : featureDeck(cards)
    const f = deckFacts({ ...result, clock }, featured, { gameChangers: gameChangersIn(featured.map(c => c.name)), spellbook: insights })
    // Commander Spellbook lists are a second source for the official categories: union, never replacement.
    const union = (a, b) => [...new Set([...(a || []), ...(b || [])])]
    return { ...f, massLandDenial: union(f.massLandDenial, insights?.massLandDenialCards), extraTurns: union(f.extraTurns, insights?.extraTurnCards) }
  }, [result, clock, cards, insights])
  const estimate = useMemo(() => estimateBracket(facts), [facts])
  const verdict = useMemo(() => evaluateCharter(charter, facts), [charter, facts])
  if (!clock) return null
  const max = clock.maxTurn || 12, fk = clock.firstKill, gf = clock.goldfish?.firstKill
  const set = (k, v) => setCharter(c => normalizeCharter({ ...c, [k]: v }))
  const preset = p => setCharter(normalizeCharter({ preset: p }))
  async function share() {
    const url = `${location.origin}/?charte=${encodeCharter(charter)}`
    try { await navigator.clipboard.writeText(url); setCopied(L('Link copied', 'Lien copié')) } catch { setCopied(url) }
  }
  const bars = (fk.byTurn || []).filter(r => r.turn >= 3)
  const minTurn = charter.minTurns || BRACKET_MIN_TURNS[estimate.bracket] || 0
  const range = estimate.range[1] > estimate.range[0] ? `B${estimate.range[0]}–B${estimate.range[1]}` : `B${estimate.bracket}`
  return <section className={`tableVerdict${compact ? ' compact' : ''}`} aria-label={L('Table verdict', 'Verdict de table')}>
    <header className="tvHead"><div><span>{L('TABLE VERDICT', 'VERDICT DE TABLE')}</span><h2>{L('Which table does this deck belong at?', 'À quelle table ce deck a sa place ?')}</h2></div><p>{L('In turns, the unit of the official brackets. Simulated games, explicit assumptions, every claim backed by cards.', 'En tours, l’unité des brackets officiels. Parties simulées, hypothèses explicites, chaque affirmation appuyée par des cartes.')}</p></header>

    <div className="tvCards">
      <article className="tvCard tvClock">
        <span>{L('First elimination', 'Première élimination')}</span>
        <strong>{turn(fk.median, max)}</strong>
        <small>{L('median', 'médiane')} · P20 {turn(fk.p20, max)} · P80 {turn(fk.p80, max)}</small>
        <p>{L('Table that blocks (realistic).', 'Table qui bloque (réaliste).')} {L('Whole table beaten', 'Table entière battue')} : <b>{turn(clock.win?.median, max)}</b> · {L('no-blocker ceiling', 'plafond sans bloqueurs')} : <b>{turn(gf?.median, max)}</b></p>
      </article>
      <article className="tvCard tvBracket">
        <span>{L('Estimated bracket', 'Bracket estimé')}</span>
        <strong>{range}</strong>
        <small>{BRACKET_LABEL[estimate.bracket][lang === 'fr' ? 1 : 0]} · {L('decided by', 'décidé par')} {estimate.binding.map(id => FLOOR[id]?.[lang === 'fr' ? 1 : 0] || id).join(', ')}</small>
        <p>{estimate.b1Compatible ? L('Inside every bracket 1 limit: bracket 1 is a table intent (theme first), Aeon cannot prove it from cards.', 'Dans toutes les limites du bracket 1 : le bracket 1 est une intention de table (thème avant tout), Aeon ne peut pas le prouver par les cartes.') : estimate.cedhSpeed ? L('cEDH-level speed: bracket 5 is a competitive intent, the speed is there.', 'Vitesse de niveau cEDH : le bracket 5 est une intention compétitive, la vitesse y est.') : L('Highest of the per-rule floors below. Rule 0 decides.', 'Le plus haut des planchers par règle ci-dessous. La règle 0 décide.')}</p>
      </article>
      <article className={`tvCard tvCharter status-${verdict.verdict}`}>
        <span>{L('Your table charter', 'Ta charte de table')}</span>
        <strong>{STATUS[verdict.verdict][lang === 'fr' ? 1 : 0]}</strong>
        <div className="tvPresets" role="group" aria-label={L('Charter preset', 'Préréglage de charte')}>{[1, 2, 3, 4, 5].map(p => <button key={p} className={charter.preset === p ? 'active' : ''} onClick={() => preset(p)}>B{p}</button>)}</div>
        <p>{verdict.culprits.length ? <>{L('Cards to discuss', 'Cartes à discuter')} : {verdict.culprits.slice(0, 6).join(', ')}{verdict.culprits.length > 6 ? '…' : ''}</> : L('Nothing in this deck breaks the charter.', 'Rien dans ce deck ne sort de la charte.')}</p>
      </article>
    </div>

    <div className="tvTurns" aria-label={L('Share of games with a first elimination by each turn', 'Part des parties avec une première élimination à chaque tour')}>
      {bars.map(r => { const g = gf?.byTurn?.find(x => x.turn === r.turn)?.cumulative ?? r.cumulative; return <div key={r.turn} className={r.turn < minTurn ? 'early' : ''} title={L(`Turn ${r.turn}: ${r.cumulative}% (no-blocker ceiling ${g}%)`, `Tour ${r.turn} : ${r.cumulative}% (plafond sans bloqueurs ${g}%)`)}><i style={{ height: `${Math.max(2, g)}%` }} className="gold" /><i style={{ height: `${Math.max(2, r.cumulative)}%` }} /><b>{Math.round(r.cumulative)}%</b><small>T{r.turn}</small></div> })}
    </div>
    <p className="tvLegend">{L('Cumulative share of games where a player is eliminated by that turn. Bright: table that blocks. Dim: no blockers. Red bars: before the table’s minimum game length.', 'Part cumulée des parties où un joueur est éliminé à ce tour ou avant. Vif : table qui bloque. Sombre : sans bloqueurs. Barres rouges : avant la durée minimale de la table.')}</p>

    <details className="tvDetails" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary>{L('Adjust the charter and see every check', 'Ajuster la charte et voir chaque contrôle')}</summary>
      <div className="tvCharterForm">
        {Object.keys(CHARTER_OPTIONS).map(k => <label key={k}><span>{FIELD[k][lang === 'fr' ? 1 : 0]}</span><select value={charter[k]} onChange={e => set(k, e.target.value)}>{CHARTER_OPTIONS[k].map(v => <option key={v} value={v}>{OPTION[v]?.[lang === 'fr' ? 1 : 0] || v}</option>)}</select></label>)}
        {['maxGameChangers', 'comboMinTurn', 'maxTutors', 'minTurns'].map(k => <label key={k}><span>{FIELD[k][lang === 'fr' ? 1 : 0]}</span><input type="number" min="0" max="99" value={charter[k]} onChange={e => set(k, e.target.value)} /></label>)}
      </div>
      <div className="tvShare"><button onClick={share}>{L('Copy the charter link for the table', 'Copier le lien de la charte pour la table')}</button>{copied && <small>{copied}</small>}</div>
      <ul className="tvChecks">{verdict.checks.map(c => <li key={c.id} className={`status-${c.status}`}><b>{CHECK[c.id]?.[lang === 'fr' ? 1 : 0] || c.id}</b><em>{STATUS[c.status][lang === 'fr' ? 1 : 0]}</em><span>{checkDetail(c, lang)}</span>{c.cards.length > 0 && <small>{c.cards.slice(0, 10).join(' · ')}</small>}</li>)}</ul>
    </details>

    <details className="tvDetails">
      <summary>{L('Why this bracket? (decision trace)', 'Pourquoi ce bracket ? (trace de décision)')}</summary>
      <ul className="tvChecks">{estimate.floors.map(f => <li key={f.id} className={`floor-${f.status}`}><b>{FLOOR[f.id]?.[lang === 'fr' ? 1 : 0] || f.id}</b><em>B{f.floor} · {FLOOR_STATUS[f.status]?.[lang === 'fr' ? 1 : 0]}</em><span>{floorDetail(f, lang)}</span>{f.evidence.length > 0 && <small>{f.evidence.slice(0, 10).join(' · ')}</small>}</li>)}</ul>
      <p className="tvNote">{L('Official expectations (WotC, Oct. 2025): bracket 1 ≥ 9 turns, 2 ≥ 8, 3 ≥ 6, 4 ≥ 4. A floor is “on the edge” when 15–35% of games break it.', 'Attentes officielles (WotC, oct. 2025) : bracket 1 ≥ 9 tours, 2 ≥ 8, 3 ≥ 6, 4 ≥ 4. Un plancher est « en limite » quand 15 à 35 % des parties le dépassent.')}</p>
    </details>

    <details className="tvDetails">
      <summary>{L('What makes this deck fast', 'Ce qui rend ce deck rapide')}</summary>
      <ul className="tvChecks">
        {(clock.drivers || []).slice(0, 6).map(d => <li key={d.name}><b>{d.name}</b><em>{d.share}%</em><span>{L(`part of the damage in ${d.share}% of eliminations · ${d.fastShare}% of the fastest ones`, `contribue à ${d.share}% des éliminations · ${d.fastShare}% des plus rapides`)}</span></li>)}
        {(clock.combos || []).filter(c => c.winBefore?.[10] > 0).slice(0, 6).map(c => <li key={c.name}><b>{c.name}</b><em>{c.winBefore[6]}% ≤T6</em><span>{L(`${c.winBefore[8]}% by turn 8 · tutored in ${c.tutoredShare}% of its wins`, `${c.winBefore[8]}% au tour 8 · tutorée dans ${c.tutoredShare}% de ses victoires`)}</span></li>)}
        {clock.fastManaTurn1?.share > 0 && <li><b>{L('Fast mana on turn 1', 'Mana rapide au tour 1')}</b><em>{clock.fastManaTurn1.share}%</em><span>{Object.entries(clock.fastManaTurn1.byCard || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, v]) => `${n} ${v}%`).join(' · ')}</span></li>}
      </ul>
      {clock.coverage?.warning && <p className="tvWarn">{L('Many tutors but no detected win line: this deck is probably faster than this clock says (missing combo data).', 'Beaucoup de tuteurs mais aucune ligne de victoire détectée : ce deck est probablement plus rapide que cette horloge (données de combo manquantes).')}</p>}
      <p className="tvNote">{L(`${clock.iterations} simulated games · ${clock.coverage?.combos || 0} win line(s) (${clock.coverage?.externalCombos || 0} from Commander Spellbook) · ${clock.coverage?.estimatedPowerCards || 0} creature(s) with estimated power.`, `${clock.iterations} parties simulées · ${clock.coverage?.combos || 0} ligne(s) de victoire (${clock.coverage?.externalCombos || 0} via Commander Spellbook) · ${clock.coverage?.estimatedPowerCards || 0} créature(s) à puissance estimée.`)}</p>
      <p className="tvNote">{L('Assumptions', 'Hypothèses')} : {L('3 opponents at 40 life; blocking table halves ground damage (×0.7 trample/menace, ×0.85 evasive); burn, drain and combos are not blocked; no opposing interaction; a combo fires when every piece and its mana are available; tutors only fetch win-line pieces.', '3 adversaires à 40 PV ; la table qui bloque divise les dégâts au sol par deux (×0,7 piétinement/menace, ×0,85 évasion) ; brûlure, drain et combos ne sont pas bloqués ; pas d’interaction adverse ; une combo part quand toutes ses pièces et son mana sont là ; les tuteurs ne cherchent que des pièces de ligne de victoire.')}</p>
    </details>
  </section>
}

export default TableVerdict
