import { useMemo,useState } from 'react'
import { parseDecklist,fetchCards,fetchCard } from './scryfall.js'
import { parseAeonShiftCsv,AEONSHIFT_META } from './data/aeonshift.js'
import { analyzePower } from './engine/powerModel.js'

const SAMPLE=`1 Sol Ring\n1 Arcane Signet\n1 Swords to Plowshares\n1 Beast Within\n1 Cultivate\n1 Harmonize\n36 Forest`
const CALIBRATION={decks:38,precon:49,user:57,cedh:78}
const LABELS={draw:'pioche',tutor:'tutor','repeatable-tutor':'tutor répétable','fast-mana':'fast mana',removal:'removal','tempo-interaction':'tempo',counterspell:'contre',protection:'protection',recursion:'récursion',tokens:'tokens','token-payoff':'payoff tokens','token-doubler':'double tokens','sac-outlet':'sac outlet','death-payoff':'payoff mort',etb:'ETB',blink:'blink',constellation:'constellation','artifact-payoff':'payoff artefact',landfall:'landfall','counter-producer':'produit marqueurs','counter-payoff':'payoff marqueurs','counter-doubler':'double marqueurs',spellslinger:'spellslinger','exile-cast':'jeu exil','exile-payoff':'payoff exil',cheat:'cheat',free:'gratuit',stax:'stax','extra-turn':'tour supp.','extra-combat':'combat supp.',win:'wincon','trigger-doubler':'double triggers',lifegain:'lifegain','life-payoff':'payoff vie'}
const HIDDEN_TAGS=new Set(['land','creature','enchantment','artifact','instant','sorcery','mana','sacrifice','graveyard-setup'])
function Stat({label,value,suffix='',sub}){return <div className="stat"><span>{label}</span><strong>{value}{suffix}</strong>{sub&&<small>{sub}</small>}</div>}
function Bar({label,value}){return <div className="barRow"><div><span>{label}</span><b>{value}</b></div><div className="bar"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div></div>}
function fmtDisp(v){return v<12?'faible':v<22?'modérée':v<32?'élevée':'très élevée'}
function prettyTags(tags){return tags.filter(t=>!HIDDEN_TAGS.has(t)).map(t=>LABELS[t]||t).slice(0,5).join(' · ')||'valeur structurelle'}

export default function App(){
  const[deckText,setDeckText]=useState(''),[commanderName,setCommanderName]=useState(''),[commander,setCommander]=useState(null)
  const[aeonMap,setAeonMap]=useState(new Map()),[result,setResult]=useState(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[iterations,setIterations]=useState(3000)
  const parsed=useMemo(()=>parseDecklist(deckText),[deckText]),total=parsed.reduce((s,x)=>s+x.qty,0)

  async function analyze(){
    setError('');setResult(null)
    try{
      if(!parsed.length)throw new Error('Colle une decklist au format "1 Nom de carte".')
      if(!commanderName.trim())throw new Error('Renseigne le commandant : le modèle Commander ne score plus une liste sans son commandant.')
      if(total!==99&&total!==100)throw new Error(`La liste contient ${total} cartes. Importe exactement 99 cartes si le commandant est séparé, ou 100 s’il est inclus dans la liste.`)
      setStatus(`Scryfall : 0/${parsed.length}`)
      const fetched=await fetchCards(parsed,(n,t)=>setStatus(`Scryfall : ${n}/${t}`))
      if(fetched.length!==total)throw new Error(`${total-fetched.length} carte(s) n’ont pas été résolues. Corrige la liste avant de scorer : une liste partielle fausserait le résultat.`)
      setStatus('Chargement du commandant…')
      const cmd=await fetchCard(commanderName)
      if(!cmd)throw new Error('Commandant introuvable sur Scryfall.')
      const containsCommander=fetched.some(c=>c.name.toLowerCase()===cmd.name.toLowerCase()||(c.aliases||[]).some(a=>a.toLowerCase()===commanderName.trim().toLowerCase()))
      if(containsCommander&&total!==100)throw new Error('Le commandant est inclus dans la liste : le total doit être 100 cartes.')
      if(!containsCommander&&total!==99)throw new Error('Le commandant n’est pas dans la liste : le main deck doit contenir exactement 99 cartes.')
      setCommander(cmd);setStatus(`Simulation de ${iterations.toLocaleString('fr-FR')} séquences…`);await new Promise(r=>setTimeout(r,20))
      setResult(analyzePower(fetched,cmd,aeonMap,iterations));setStatus('')
    }catch(e){setError(e.message||String(e));setStatus('')}
  }
  async function importAeon(ev){const f=ev.target.files?.[0];if(!f)return;const map=parseAeonShiftCsv(await f.text());setAeonMap(map);if(!map.size)setError('CSV AeonShift non reconnu ou vide.')}

  return <main>
    <header><div><div className="eyebrow">AEON SCORER v3.1 · SEMANTIC HARDENING</div><h1>Mesurer les sorties d’un deck, avec des preuves lisibles.</h1></div><div className="headerSide"><p>Commander : séquences, packages, fenêtres de mana, dispersion et dépendance au commandant.</p><span className="calBadge">validation v3.1 en cours</span></div></header>
    <section className="panel setup">
      <div className="field grow"><label>Decklist</label><textarea value={deckText} onChange={e=>setDeckText(e.target.value)} placeholder={SAMPLE}/><small>{total} carte(s) reconnue(s) · 99 sans commandant / 100 avec commandant</small></div>
      <div className="side">
        <div className="field"><label>Commandant</label><input value={commanderName} onChange={e=>setCommanderName(e.target.value)} placeholder="Hei Bai, Forest Guardian"/></div>
        <div className="field"><label>Séquences Monte Carlo</label><select value={iterations} onChange={e=>setIterations(Number(e.target.value))}><option value={1500}>1 500 · rapide</option><option value={3000}>3 000 · normal</option><option value={6000}>6 000 · précis</option></select></div>
        <div className="field"><label>AeonShift CSV <em>optionnel</em></label><input type="file" accept=".csv,text/csv" onChange={importAeon}/><small>{aeonMap.size?`${aeonMap.size} entrées chargées`:'Aucun prior AeonShift chargé'}</small></div>
        <button onClick={analyze} disabled={!!status}>{status||'Analyser le deck'}</button>{error&&<div className="error">{error}</div>}
      </div>
    </section>
    {result&&<>
      <section className="heroScore panel">
        <div className="primary"><span>Puissance médiane</span><strong>{result.profile.median}</strong><small>/100 · score structurel calibré</small></div>
        <div className="grid4"><Stat label="Sortie basse P20" value={result.profile.floor}/><Stat label="Sortie haute P80" value={result.profile.ceiling}/><Stat label="Dispersion P20↔P80" value={result.profile.dispersion} sub={fmtDisp(result.profile.dispersion)}/><Stat label="Couverture d’analyse" value={result.profile.coverage} suffix="%" sub="pas une probabilité d’exactitude"/></div>
        {commander&&<div className="cmdDelta">Dépendance estimée à <b>{commander.name}</b> : <strong>+{result.profile.commanderDelta}</strong> · accès commandant médian <strong>{result.simulation.commanderMedianTurn?`T${result.simulation.commanderMedianTurn}`:'n/d'}</strong> · package opérationnel médian <strong>{result.simulation.engineMedianTurn?`T${result.simulation.engineMedianTurn}`:'n/d'}</strong> · récupération après disruption T4→T5 <strong>{result.simulation.recoveryAfterDisruption}%</strong>.</div>}
      </section>
      <section className="reference panel"><div><b>Repères historiques v3</b><small>médianes du corpus précédent, jamais des seuils ni des brackets</small></div><span>Précons <strong>{CALIBRATION.precon}</strong></span><span>Cohorte perso <strong>{CALIBRATION.user}</strong></span><span>cEDH <strong>{CALIBRATION.cedh}</strong></span></section>
      <section className="cols">
        <div className="panel"><h2>Dimensions</h2>{Object.entries(result.dimensions).map(([k,v])=><Bar key={k} label={{speed:'Vitesse',consistency:'Consistance',explosiveness:'Explosivité',synergy:'Synergie',interaction:'Interaction accessible',resilience:'Résilience après disruption'}[k]} value={v}/>)}</div>
        <div className="panel"><h2>Structure détectée</h2><div className="miniGrid"><Stat label="Terrains" value={result.roles.lands}/><Stat label="MV moyen" value={result.roles.avgCmc.toFixed(2)}/><Stat label="Fast mana" value={result.roles.fastMana}/><Stat label="Tutors" value={result.roles.tutors}/></div>{result.aeon.available?<p className="note">Prior AeonShift : <b>{result.aeon.score}/100</b> · {result.aeon.ranked} carte(s) classée(s). Poids volontairement faible.</p>:<p className="note">AeonShift n’est pas nécessaire. Son CSV peut seulement ajouter un signal secondaire.</p>}</div>
      </section>
      <section className="panel"><h2>Courbe d’accès par tour</h2><p className="note">Chaque colonne est testée <b>indépendamment</b> : elle répond « pourrais-je accéder à cette fonction à ce tour ? », pas « puis-je tout faire simultanément ? ». <b>Package opérationnel</b> exige un producteur + un payoff distincts du même package, avec une fenêtre de mana plausible.</p><div className="turnTable"><div className="turnHead"><span>Tour</span><span>Commandant</span><span>Package opérationnel</span><span>Interaction lançable</span><span>Ressource lançable</span><span>Burst accessible</span></div>{result.simulation.turnProfile.map(r=><div className="turnLine" key={r.turn}><b>T{r.turn}</b><span>{r.commander}%</span><span>{r.engine}%</span><span>{r.interaction}%</span><span>{r.resource}%</span><span>{r.burst}%</span></div>)}</div></section>
      <section className="cols">
        <div className="panel"><h2>Packages détectés</h2>{result.packages.length?result.packages.map(p=><article className="pkg" key={p.id}><div><b>{p.name}</b><span>cohésion {p.cohesion??p.strength}/100</span></div><p>{p.evidence}</p><small><b>Producteurs :</b> {p.producers.join(' · ')||'—'}</small><small><b>Payoffs :</b> {p.payoffs.join(' · ')||'—'}</small></article>):<p className="muted">Aucun package avec deux rôles suffisamment étayés.</p>}</div>
        <div className="panel"><h2>Principaux drivers</h2>{result.drivers.map(d=><div className="driver" key={d.name}><span><b>{d.name}</b><small>{prettyTags(d.tags)}</small></span><strong>{d.impact}</strong></div>)}</div>
      </section>
      {result.combos.length>0&&<section className="panel"><h2>Combos connues détectées</h2>{result.combos.map(c=><div className="combo" key={c.name}><b>{c.name}</b><span>{c.cards.join(' + ')}</span></div>)}</section>}
      <section className="panel caveats"><h2>Lecture correcte</h2><p><b>{result.profile.median}</b> est le centre estimé. P20/P80 décrivent des sorties basses/hautes du même modèle de séquences après le même ajustement structurel ; <b>{result.profile.peak}</b> est le pic P80 séparé. Un score n’est ni un winrate, ni un bracket, ni une note au joueur.</p><p>Pour comparer une table, rapproche d’abord les médianes puis vérifie dispersion, P80, vitesse et combos. Deux decks à 58 peuvent être très différents si l’un fait 52–64 et l’autre 35–82.</p>{result.warnings.map((w,i)=><p key={i}>• {w}</p>)}</section>
    </>}
    <footer>Modèle {result?.methodology.model||'sequence-access-v3.1-semantic'} · {AEONSHIFT_META.note}</footer>
  </main>
}
