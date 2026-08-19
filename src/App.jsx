import { useMemo, useState } from 'react'
import { parseDecklist, fetchCards, fetchCard } from './scryfall.js'
import { parseAeonShiftCsv, AEONSHIFT_META } from './data/aeonshift.js'
import { analyzePower } from './engine/powerModel.js'

const SAMPLE=`1 Sol Ring\n1 Arcane Signet\n1 Swords to Plowshares\n1 Beast Within\n1 Cultivate\n1 Harmonize\n36 Forest`
const CALIBRATION={decks:38,precon:49,user:57,cedh:78,gates:'12/12'}

function Stat({label,value,suffix='',sub}){
  return <div className="stat"><span>{label}</span><strong>{value}{suffix}</strong>{sub&&<small>{sub}</small>}</div>
}
function Bar({label,value}){
  return <div className="barRow"><div><span>{label}</span><b>{value}</b></div><div className="bar"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div></div>
}
function fmtVar(v){return v<8?'faible':v<16?'modérée':v<26?'élevée':'très élevée'}

export default function App(){
  const[deckText,setDeckText]=useState('')
  const[commanderName,setCommanderName]=useState('')
  const[commander,setCommander]=useState(null)
  const[aeonMap,setAeonMap]=useState(new Map())
  const[result,setResult]=useState(null)
  const[status,setStatus]=useState('')
  const[error,setError]=useState('')
  const[iterations,setIterations]=useState(3000)

  const parsed=useMemo(()=>parseDecklist(deckText),[deckText])

  async function analyze(){
    setError('');setResult(null)
    try{
      if(!parsed.length)throw new Error('Colle une decklist au format "1 Nom de carte".')
      setStatus(`Scryfall : 0/${parsed.length}`)
      const fetched=await fetchCards(parsed,(n,t)=>setStatus(`Scryfall : ${n}/${t}`))
      if(fetched.length<Math.min(80,parsed.reduce((s,x)=>s+x.qty,0)))throw new Error('Trop de cartes n’ont pas été résolues par Scryfall. Vérifie la decklist.')
      let cmd=null
      if(commanderName.trim()){
        setStatus('Chargement du commandant…')
        cmd=await fetchCard(commanderName)
        if(!cmd)throw new Error('Commandant introuvable sur Scryfall.')
      }
      setCommander(cmd)
      setStatus(`Simulation de ${iterations.toLocaleString('fr-FR')} séquences…`)
      await new Promise(r=>setTimeout(r,20))
      const r=analyzePower(fetched,cmd,aeonMap,iterations)
      setResult(r);setStatus('')
    }catch(e){setError(e.message||String(e));setStatus('')}
  }

  async function importAeon(ev){
    const f=ev.target.files?.[0];if(!f)return
    const text=await f.text();const map=parseAeonShiftCsv(text);setAeonMap(map)
  }

  return <main>
    <header>
      <div><div className="eyebrow">AEON SCORER v3 · CALIBRATED POWER DISTRIBUTION</div><h1>Mesurer les sorties d’un deck, pas additionner ses cartes.</h1></div>
      <div className="headerSide"><p>Commander : vitesse, packages, variance, dépendance au commandant et accès aux ressources.</p><span className="calBadge">{CALIBRATION.decks} decks · {CALIBRATION.gates} gates</span></div>
    </header>

    <section className="panel setup">
      <div className="field grow"><label>Decklist</label><textarea value={deckText} onChange={e=>setDeckText(e.target.value)} placeholder={SAMPLE}/><small>{parsed.reduce((s,x)=>s+x.qty,0)} carte(s) reconnue(s)</small></div>
      <div className="side">
        <div className="field"><label>Commandant</label><input value={commanderName} onChange={e=>setCommanderName(e.target.value)} placeholder="Hei Bai, Forest Guardian"/></div>
        <div className="field"><label>Séquences Monte Carlo</label><select value={iterations} onChange={e=>setIterations(Number(e.target.value))}><option value={1500}>1 500 · rapide</option><option value={3000}>3 000 · normal</option><option value={6000}>6 000 · précis</option></select></div>
        <div className="field"><label>AeonShift CSV <em>optionnel</em></label><input type="file" accept=".csv,text/csv" onChange={importAeon}/><small>{aeonMap.size?`${aeonMap.size} entrées chargées`:'Aucun prior AeonShift chargé'}</small></div>
        <button onClick={analyze} disabled={!!status}>{status||'Analyser le deck'}</button>
        {error&&<div className="error">{error}</div>}
      </div>
    </section>

    {result&&<>
      <section className="heroScore panel">
        <div className="primary"><span>Puissance médiane</span><strong>{result.profile.median}</strong><small>/100 · distribution structurelle</small></div>
        <div className="grid4">
          <Stat label="Plancher P20" value={result.profile.floor}/>
          <Stat label="Plafond P80" value={result.profile.ceiling}/>
          <Stat label="Variance" value={result.profile.variance} sub={fmtVar(result.profile.variance)}/>
          <Stat label="Confiance modèle" value={result.profile.confidence} suffix="%"/>
        </div>
        {commander&&<div className="cmdDelta">Dépendance estimée à <b>{commander.name}</b> : <strong>+{result.profile.commanderDelta}</strong> points · tour médian d’accès : <strong>{result.simulation.commanderMedianTurn?`T${result.simulation.commanderMedianTurn}`:'n/d'}</strong>.</div>}
      </section>

      <section className="reference panel">
        <div><b>Repères de calibration</b><small>médianes du corpus, pas des seuils ni des brackets</small></div>
        <span>Précons <strong>{CALIBRATION.precon}</strong></span><span>Cohorte perso <strong>{CALIBRATION.user}</strong></span><span>cEDH <strong>{CALIBRATION.cedh}</strong></span>
      </section>

      <section className="cols">
        <div className="panel"><h2>Dimensions</h2>{Object.entries(result.dimensions).map(([k,v])=><Bar key={k} label={{speed:'Vitesse',consistency:'Consistance',explosiveness:'Explosivité',synergy:'Synergie',interaction:'Interaction accessible',resilience:'Résilience'}[k]} value={v}/>)}</div>
        <div className="panel"><h2>Structure détectée</h2><div className="miniGrid">
          <Stat label="Terrains" value={result.roles.lands}/><Stat label="MV moyen" value={result.roles.avgCmc.toFixed(2)}/><Stat label="Fast mana" value={result.roles.fastMana}/><Stat label="Tutors" value={result.roles.tutors}/>
        </div>
        {result.aeon.available?<p className="note">Prior AeonShift : <b>{result.aeon.score}/100</b> · {result.aeon.ranked} carte(s) classée(s). Poids volontairement faible.</p>:<p className="note">Importe le CSV AeonShift courant pour ajouter leur classification comme signal secondaire.</p>}</div>
      </section>

      <section className="panel"><h2>Courbe d’accès par tour</h2><div className="turnTable"><div className="turnHead"><span>Tour</span><span>Commandant</span><span>Moteur</span><span>Interaction</span><span>Rebuild</span><span>Explosif</span></div>{result.simulation.turnProfile.map(r=><div className="turnLine" key={r.turn}><b>T{r.turn}</b><span>{r.commander}%</span><span>{r.engine}%</span><span>{r.interaction}%</span><span>{r.rebuild}%</span><span>{r.explosive}%</span></div>)}</div></section>

      <section className="cols">
        <div className="panel"><h2>Packages détectés</h2>{result.packages.length?result.packages.map(p=><article className="pkg" key={p.id}><div><b>{p.name}</b><span>{p.strength}/100</span></div><p>{p.evidence}</p><small>{[...p.producers,...p.payoffs].slice(0,8).join(' · ')}</small></article>):<p className="muted">Aucun package assez dense détecté automatiquement.</p>}</div>
        <div className="panel"><h2>Principaux drivers</h2>{result.drivers.map(d=><div className="driver" key={d.name}><span><b>{d.name}</b><small>{d.tags.join(' · ')||'valeur générique'}</small></span><strong>{d.impact}</strong></div>)}</div>
      </section>

      {result.combos.length>0&&<section className="panel"><h2>Combos connues détectées</h2>{result.combos.map(c=><div className="combo" key={c.name}><b>{c.name}</b><span>{c.cards.join(' + ')}</span></div>)}</section>}

      <section className="panel caveats"><h2>Lecture correcte</h2><p><b>{result.profile.median} ± {result.profile.variance}</b> décrit une distribution estimée des sorties, pas un winrate et pas un bracket. Le moteur mesure l’accès à des fonctions/packages jusqu’au tour {result.methodology.maxTurn}; il ne prétend pas résoudre toutes les règles de Magic.</p>{result.warnings.map((w,i)=><p key={i}>• {w}</p>)}</section>
    </>}

    <footer>Modèle {result?.methodology.model||'sequence-access-v3-calibrated'} · AeonShift est une source externe indépendante. {AEONSHIFT_META.note}</footer>
  </main>
}
