const MOTIFS = [
  { id:'early-commander', name:'Accélération du commandant', producers:['fast-mana','mana'], payoffs:[], special:'commander' },
  { id:'blink-etb', name:'Blink / ETB', producers:['blink'], payoffs:['etb'], minP:2, minY:2 },
  { id:'constellation', name:'Enchantements / Constellation', producers:['enchantment'], payoffs:['constellation'], minP:4, minY:1 },
  { id:'tokens', name:'Tokens / conversion', producers:['tokens'], payoffs:['token-payoff','doubling'], minP:3, minY:2 },
  { id:'sacrifice', name:'Sacrifice / mort', producers:['sac-outlet'], payoffs:['death-payoff'], minP:2, minY:2 },
  { id:'graveyard', name:'Cimetière / récursion', producers:['graveyard-setup'], payoffs:['recursion'], minP:2, minY:2 },
  { id:'lands', name:'Lands / Landfall', producers:['land-ramp'], payoffs:['landfall'] },
  { id:'counters', name:'Marqueurs', producers:['counters'], payoffs:['counter-payoff','doubling'], minP:3, minY:2 },
  { id:'spells', name:'Spellslinger', producers:['spellslinger'], payoffs:['draw','tokens'], minP:3, minY:2 },
  { id:'exile', name:'Jeu depuis l’exil', producers:['exile-cast'], payoffs:['draw','tokens'], minP:2, minY:2 },
  { id:'artifacts', name:'Artefacts', producers:['artifact-payoff'], payoffs:['artifact'], minP:3, minY:5 },
]

function hasTag(c, tag) { return c.tags?.includes(tag) }
function names(xs) { return xs.slice(0, 8).map(x => x.name) }

export function detectPackages(cards, commander = null) {
  const out = []
  const nonlands = cards.filter(c => !c.isLand)
  for (const m of MOTIFS) {
    let producers = nonlands.filter(c => m.producers.some(t => hasTag(c,t)))
    let payoffs = nonlands.filter(c => m.payoffs.some(t => hasTag(c,t)))

    if (m.special === 'commander') {
      const cmdCmc = Number(commander?.cmc || 0)
      const burst = nonlands.filter(c => hasTag(c,'fast-mana'))
      const persistent = nonlands.filter(c => hasTag(c,'mana') && !hasTag(c,'fast-mana'))
      const meaningful = commander && (burst.length >= 2 || (cmdCmc >= 4 && producers.length >= 4))
      if (!meaningful) continue
      const strength = Math.min(100, Math.round(25 + burst.length*13 + persistent.length*3 + Math.max(0,cmdCmc-3)*4))
      out.push({
        id:m.id, name:m.name, strength,
        producers:names([...burst,...persistent]), payoffs: commander ? [commander.name] : [],
        evidence:`${burst.length} accélérateur(s) burst + ${persistent.length} source(s) persistante(s) vers un commandant MV ${cmdCmc}.`,
      })
      continue
    }

    if (producers.length < (m.minP||2) || payoffs.length < (m.minY||1)) continue
    const pNames=new Set(producers.map(c=>c.name)); const yNames=new Set(payoffs.map(c=>c.name))
    const cross=[...pNames].filter(n=>yNames.has(n)).length
    const unique = new Set([...producers,...payoffs].map(c=>c.name)).size
    if (unique < 3 || unique-cross < 2) continue
    const density = (producers.length + payoffs.length) / Math.max(1, nonlands.length)
    const strength = Math.min(100, Math.round(30 + unique*4 + density*70))
    out.push({
      id:m.id, name:m.name, strength,
      producers:names(producers), payoffs:names(payoffs),
      evidence:`${producers.length} producteur(s), ${payoffs.length} payoff(s), ${unique} carte(s) distincte(s).`,
    })
  }
  return out.sort((a,b)=>b.strength-a.strength)
}

export function commanderSynergy(cards, commander) {
  if (!commander) return { score:0, connected:[], tags:[] }
  const cmdTags = commander.tags || []
  const semantic = new Set(cmdTags)
  if (cmdTags.includes('blink')) semantic.add('etb')
  if (cmdTags.includes('tokens')) semantic.add('tokens')
  if (cmdTags.includes('sacrifice')) semantic.add('recursion')
  if (cmdTags.includes('enchantment')) semantic.add('constellation')
  if (cmdTags.includes('exile-cast')) semantic.add('draw')

  const connected = cards.filter(c => !c.isLand && c.tags.some(t => semantic.has(t)))
  const score = Math.min(100, Math.round(connected.length / Math.max(1,cards.filter(c=>!c.isLand).length) * 180))
  return { score, connected:connected.map(c=>c.name), tags:[...semantic] }
}
