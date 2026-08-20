import { useEffect,useMemo,useState } from 'react'
import { parseDecklist,fetchCards,fetchCard } from './scryfall.js'
import { parseAeonShiftCsv,AEONSHIFT_META } from './data/aeonshift.js'
import { analyzePower } from './engine/powerModel.js'
import { SITE_META,WhyPage,MethodPage,AboutPage } from './sitePages.jsx'

const SAMPLE=`1 Sol Ring\n1 Arcane Signet\n1 Swords to Plowshares\n1 Beast Within\n1 Cultivate\n1 Harmonize\n36 Forest`
const CALIBRATION={precon:49,cedh:78}
const SITE_URL='https://aeon-scorer.vercel.app'
const ROUTES=new Set(Object.keys(SITE_META))
const LABELS={draw:'pioche',tutor:'tutor','repeatable-tutor':'tutor répétable','fast-mana':'fast mana','burst-mana':'mana burst',removal:'removal','tempo-interaction':'tempo',counterspell:'contre',protection:'protection',recursion:'récursion',tokens:'tokens','token-payoff':'payoff tokens','token-doubler':'double tokens','sac-outlet':'sac outlet','death-payoff':'payoff mort',etb:'ETB',blink:'blink',constellation:'constellation','artifact-payoff':'payoff artefact',landfall:'landfall','counter-producer':'produit marqueurs','counter-payoff':'payoff marqueurs','counter-doubler':'double marqueurs',spellslinger:'spellslinger','exile-cast':'jeu exil','exile-payoff':'payoff exil',cheat:'cheat',free:'coût alternatif/gratuit',stax:'stax','extra-turn':'tour supp.','extra-combat':'combat supp.',win:'wincon','trigger-doubler':'double triggers',lifegain:'lifegain','life-payoff':'payoff vie'}
const HIDDEN_TAGS=new Set(['land','creature','enchantment','artifact','instant','sorcery','mana','sacrifice','graveyard-setup'])

function Stat({label,value,suffix='',sub,accent=false}){return <div className={`stat${accent?' accentStat':''}`}><span>{label}</span><strong>{value}{suffix}</strong>{sub&&<small>{sub}</small>}</div>}
function Bar({label,value}){return <div className="barRow"><div><span>{label}</span><b>{value}</b></div><div className="bar"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div></div>}
function prettyTags(tags){return tags.filter(t=>!HIDDEN_TAGS.has(t)).map(t=>LABELS[t]||t).slice(0,5).join(' · ')||'valeur structurelle'}
function cleanPath(){const p=window.location.pathname.replace(/\/+$/,'')||'/';return ROUTES.has(p)?p:'/'}
function NavLink({to,route,navigate,children}){return <a href={to} className={route===to?'active':''} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();navigate(to)}}}>{children}</a>}
function SiteNav({route,navigate}){return <nav className="siteNav" aria-label="Navigation principale"><a href="/" className="brand" onClick={e=>{e.preventDefault();navigate('/')}}><span className="brandMark">A</span><span><b>Aeon Scorer</b><small>Commander power analyzer</small></span></a><div className="navLinks"><NavLink to="/" route={route} navigate={navigate}>Analyser</NavLink><NavLink to="/pourquoi" route={route} navigate={navigate}>Pourquoi ?</NavLink><NavLink to="/methodologie" route={route} navigate={navigate}>Méthodologie</NavLink><NavLink to="/a-propos" route={route} navigate={navigate}>À propos</NavLink><a href="https://github.com/megazz31/aeon-scorer" target="_blank" rel="noreferrer">GitHub ↗</a></div></nav>}

export default function App(){
  const[route,setRoute]=useState(()=>cleanPath())
  const[deckText,setDeckText]=useState(''),[commanderName,setCommanderName]=useState(''),[commander,setCommander]=useState(null)
  const[aeonMap,setAeonMap]=useState(new Map()),[result,setResult]=useState(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[iterations,setIterations]=useState(3000),[view,setView]=useState('summary')
  const parsed=useMemo(()=>parseDecklist(deckText),[deckText]),total=parsed.reduce((s,x)=>s+x.qty,0)

  useEffect(()=>{const onPop=()=>setRoute(cleanPath());window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])
  useEffect(()=>{const meta=SITE_META[route]||SITE_META['/'];document.title=meta.title;const desc=document.querySelector('meta[name="description"]');if(desc)desc.setAttribute('content',meta.description);let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=`${SITE_URL}${route==='/'?'':route}`;const ogTitle=document.querySelector('meta[property="og:title"]');if(ogTitle)ogTitle.setAttribute('content',meta.title);const ogDesc=document.querySelector('meta[property="og:description"]');if(ogDesc)ogDesc.setAttribute('content',meta.description);const ogUrl=document.querySelector('meta[property="og:url"]');if(ogUrl)ogUrl.setAttribute('content',canonical.href)},[route])

  function navigate(path){const next=ROUTES.has(path)?path:'/';if(window.location.pathname!==next)window.history.pushState({},'',next);setRoute(next);window.scrollTo({top:0,behavior:'smooth'})}

  async function analyze(){
    setError('');setResult(null)
    try{
      if(!parsed.length)throw new Error('Colle une decklist au format "1 Nom de carte".')
      if(!commanderName.trim())throw new Error('Renseigne le commandant : le modèle Commander ne score plus une liste sans son commandant.')
      if(total!==99&&total!==100)throw new Error(`La liste contient ${total} cartes. Importe exactement 99 cartes si le commandant est séparé, ou 100 s’il est inclus dans la liste. La v3.1 ne gère pas encore les configurations Partner/Background à deux commandants.`)
      setStatus(`Scryfall : 0/${parsed.length}`)
      const fetched=await fetchCards(parsed,(n,t)=>setStatus(`Scryfall : ${n}/${t}`))
      if(fetched.length!==total)throw new Error(`${total-fetched.length} carte(s) n’ont pas été résolues. Corrige la liste avant de scorer : une liste partielle fausserait le résultat.`)
      setStatus('Chargement du commandant…')
      const cmd=await fetchCard(commanderName)
      if(!cmd)throw new Error('Commandant introuvable sur Scryfall.')
      const sameCommander=c=>(c.id&&cmd.id&&c.id===cmd.id)||c.name.toLowerCase()===cmd.name.toLowerCase()||(c.aliases||[]).some(a=>a.toLowerCase()===commanderName.trim().toLowerCase())
      const commanderCopies=fetched.filter(sameCommander).length
      if(commanderCopies>1)throw new Error(`Le commandant apparaît ${commanderCopies} fois dans la liste. Une analyse à commandant unique attend au maximum une copie.`)
      if(commanderCopies===1&&total!==100)throw new Error('Le commandant est inclus dans la liste : le total doit être 100 cartes.')
      if(commanderCopies===0&&total!==99)throw new Error('Le commandant n’est pas dans la liste : le main deck doit contenir exactement 99 cartes.')
      const allowed=new Set(cmd.colorIdentity||[]),offColor=fetched.filter(c=>!sameCommander(c)&&(c.colorIdentity||[]).some(x=>!allowed.has(x)))
      if(offColor.length)throw new Error(`Identité couleur incompatible avec ${cmd.name} : ${[...new Set(offColor.map(c=>c.name))].slice(0,6).join(', ')}${offColor.length>6?'…':''}`)
      setCommander(cmd);setStatus(`Simulation de ${iterations.toLocaleString('fr-FR')} séquences…`);await new Promise(r=>setTimeout(r,20))
      setResult(analyzePower(fetched,cmd,aeonMap,iterations));setView('summary');setStatus('')
    }catch(e){setError(e.message||String(e));setStatus('')}
  }
  async function importAeon(ev){const f=ev.target.files?.[0];if(!f)return;const map=parseAeonShiftCsv(await f.text());setAeonMap(map);if(!map.size)setError('CSV AeonShift non reconnu ou vide.')}

  return <main>
    <SiteNav route={route} navigate={navigate}/>

    {route==='/pourquoi'&&<WhyPage navigate={navigate}/>} 
    {route==='/methodologie'&&<MethodPage navigate={navigate}/>} 
    {route==='/a-propos'&&<AboutPage/>}

    {route==='/'&&<>
      <header className="homeHead"><div><div className="eyebrow">AEON SCORER v3.1</div><h1>Comparer la puissance réelle des decks Commander.</h1></div><div className="headerSide"><p>Un score central, une plage de sorties et un pic. Les diagnostics expliquent ensuite pourquoi.</p><span className="calBadge">v3.1 validée · macro + micro + convergence</span></div></header>
      <section className="panel setup">
        <div className="field grow"><label>Decklist</label><textarea value={deckText} onChange={e=>setDeckText(e.target.value)} placeholder={SAMPLE}/><small>{total} carte(s) reconnue(s) · 99 sans commandant / 100 avec commandant</small></div>
        <div className="side">
          <div className="field"><label>Commandant</label><input value={commanderName} onChange={e=>setCommanderName(e.target.value)} placeholder="Hei Bai, Forest Guardian"/><small>v3.1 : un seul commandant. Partner / Background à deux commandants n’est pas encore modélisé.</small></div>
          <div className="field"><label>Séquences Monte Carlo</label><select value={iterations} onChange={e=>setIterations(Number(e.target.value))}><option value={1500}>1 500 · rapide</option><option value={3000}>3 000 · normal</option><option value={6000}>6 000 · précis</option></select></div>
          <div className="field"><label>AeonShift CSV <em>optionnel</em></label><input type="file" accept=".csv,text/csv" onChange={importAeon}/><small>{aeonMap.size?`${aeonMap.size} entrées chargées`:'Aucun prior AeonShift chargé'}</small></div>
          <button onClick={analyze} disabled={!!status}>{status||'Analyser le deck'}</button>{error&&<div className="error">{error}</div>}
        </div>
      </section>
      <p className="toolIntro">Aeon Scorer n’utilise ni bracket fixe ni note arbitraire par carte. <a href="/pourquoi" onClick={e=>{e.preventDefault();navigate('/pourquoi')}}>Pourquoi ce modèle ?</a></p>

      {result&&<>
        <nav className="resultNav" aria-label="Vues de l’analyse"><button className={view==='summary'?'active':''} onClick={()=>setView('summary')}>Résumé puissance</button><button className={view==='diagnostic'?'active':''} onClick={()=>setView('diagnostic')}>Diagnostic détaillé</button></nav>

        {view==='summary'&&<>
          <section className="heroScore panel">
            <div className="primary"><span>Puissance médiane</span><strong>{result.profile.median}</strong><small>/100 · puissance habituelle estimée</small></div>
            <div className="grid3"><Stat label="Sortie basse · P20" value={result.profile.floor} sub="partie où le deck déroule moins bien"/><Stat label="Sortie haute · P80" value={result.profile.ceiling} sub="bonne sortie plausible"/><Stat label="Pic" value={result.profile.peak} accent sub="haut de potentiel, pas la sortie habituelle"/></div>
            <div className="powerRead"><b>{result.profile.median} [{result.profile.floor}–{result.profile.ceiling}] · pic {result.profile.peak}</b><span>Pour comparer deux decks, commence par la médiane, puis vérifie le chevauchement P20–P80 et enfin le pic.</span></div>
          </section>

          <section className="summaryStrip panel"><div><b>Repères de calibration</b><small>repères statistiques, jamais des brackets ni des seuils</small></div><span>Précons <strong>{CALIBRATION.precon}</strong></span><span>cEDH <strong>{CALIBRATION.cedh}</strong></span></section>
          {result.combos.length>0&&<section className="panel summaryAlert"><div><b>⚠ Combo connue détectée</b><span>Le pic peut être plus important que la médiane pour l’expérience de table.</span></div><strong>{result.combos.length}</strong></section>}
          {result.profile.coverage<88&&<section className="panel summaryAlert dataAlert"><div><b>Couverture d’analyse limitée : {result.profile.coverage}%</b><span>Le score reste calculé, mais vérifie le diagnostic avant de t’y fier pour équilibrer une table.</span></div></section>}
          <section className="panel compactHelp"><h2>Lecture rapide</h2><p><b>{result.profile.median}</b> est le chiffre principal. <b>{result.profile.floor}–{result.profile.ceiling}</b> décrit la zone habituelle de variation du deck. <b>{result.profile.peak}</b> montre jusqu’où il peut monter dans une sortie très favorable.</p><p>Un score n’est ni un winrate ni un bracket. Deux decks avec la même médiane peuvent produire des parties très différentes si leurs plages ou leurs pics divergent fortement.</p></section>
        </>}

        {view==='diagnostic'&&<>
          <section className="panel diagOverview"><h2>Fiabilité et dépendance</h2><div className="grid4"><Stat label="Dépendance commandant" value={`+${result.profile.commanderDelta}`}/><Stat label="Accès commandant médian" value={result.simulation.commanderMedianTurn?`T${result.simulation.commanderMedianTurn}`:'n/d'}/><Stat label="Package opérationnel médian" value={result.simulation.engineMedianTurn?`T${result.simulation.engineMedianTurn}`:'n/d'}/><Stat label="Couverture des données" value={result.profile.coverage} suffix="%" sub="couverture, pas exactitude"/></div>{commander&&<p className="note">Après le checkpoint de disruption T4, une <b>option de reprise accessible</b> est présente à T5 dans <b>{result.simulation.recoveryAfterDisruption}%</b> des séquences. Cette mesure n’est pas une simulation complète d’un wipe.</p>}</section>

          <section className="cols"><div className="panel"><h2>Pourquoi ce score ?</h2>{Object.entries(result.dimensions).map(([k,v])=><Bar key={k} label={{speed:'Vitesse',consistency:'Consistance',explosiveness:'Explosivité',synergy:'Synergie',interaction:'Interaction accessible',resilience:'Options de reprise'}[k]} value={v}/>)}</div><div className="panel"><h2>Structure détectée</h2><div className="miniGrid"><Stat label="Terrains" value={result.roles.lands}/><Stat label="MV moyen" value={result.roles.avgCmc.toFixed(2)}/><Stat label="Fast mana" value={result.roles.fastMana}/><Stat label="Tutors" value={result.roles.tutors}/></div>{result.aeon.available?<p className="note">Prior AeonShift : <b>{result.aeon.score}/100</b> · {result.aeon.ranked} carte(s) classée(s). Poids volontairement faible.</p>:<p className="note">AeonShift n’est pas nécessaire. Son CSV peut seulement ajouter un signal secondaire.</p>}</div></section>

          <section className="panel"><h2>Courbe d’accès par tour</h2><p className="note">Chaque colonne est testée <b>indépendamment</b> : elle répond « pourrais-je accéder à cette fonction à ce tour ? », pas « puis-je tout faire simultanément ? ». <b>Package opérationnel</b> exige un producteur + un payoff distincts du même package, avec une fenêtre de mana plausible.</p><div className="turnTable"><div className="turnHead"><span>Tour</span><span>Commandant</span><span>Package opérationnel</span><span>Interaction lançable</span><span>Ressource lançable</span><span>Burst accessible</span></div>{result.simulation.turnProfile.map(r=><div className="turnLine" key={r.turn}><b>T{r.turn}</b><span>{r.commander}%</span><span>{r.engine}%</span><span>{r.interaction}%</span><span>{r.resource}%</span><span>{r.burst}%</span></div>)}</div></section>

          <section className="cols"><div className="panel"><h2>Packages détectés</h2>{result.packages.length?result.packages.map(p=><article className="pkg" key={p.id}><div><b>{p.name}</b><span>cohésion {p.cohesion??p.strength}/100</span></div><p>{p.evidence}</p><small><b>Producteurs :</b> {p.producers.join(' · ')||'—'}</small><small><b>Payoffs :</b> {p.payoffs.join(' · ')||'—'}</small></article>):<p className="muted">Aucun package avec deux rôles suffisamment étayés.</p>}</div><div className="panel"><h2>Principaux drivers</h2>{result.drivers.map(d=><div className="driver" key={d.name}><span><b>{d.name}</b><small>{prettyTags(d.tags)}</small></span><strong>{d.impact}</strong></div>)}</div></section>

          {result.combos.length>0&&<section className="panel"><h2>Combos connues détectées</h2>{result.combos.map(c=><div className="combo" key={c.name}><b>{c.name}</b><span>{c.cards.join(' + ')}</span></div>)}<p className="note">Bibliothèque haute confiance volontairement non exhaustive : absence ici ne signifie pas absence de combo dans le deck.</p></section>}
          <section className="panel caveats"><h2>Limites du diagnostic</h2><p>Les dimensions servent à <b>expliquer</b> la puissance, pas à remplacer le score principal. La couverture mesure la quantité de données comprises par le moteur, pas une probabilité d’exactitude.</p><p>« Options de reprise » mesure l’accès à une ressource, un autre package ou un recast du commandant après le checkpoint de disruption ; ce n’est pas une simulation complète d’un wipe. Les tuteurs et coûts alternatifs contextuels ne sont pas encore exécutés comme un moteur de règles.</p><p>La détection de combos est volontairement partielle. Aucune combo détectée ne veut pas dire « aucune combo possible ».</p>{result.warnings.map((w,i)=><p key={i}>• {w}</p>)}</section>
        </>}
      </>}
    </>}

    <footer><span>Aeon Scorer · MTG Commander power analyzer</span><span className="footerLinks"><a href="/pourquoi" onClick={e=>{e.preventDefault();navigate('/pourquoi')}}>Pourquoi</a><a href="/methodologie" onClick={e=>{e.preventDefault();navigate('/methodologie')}}>Méthodologie</a><a href="/a-propos" onClick={e=>{e.preventDefault();navigate('/a-propos')}}>À propos</a><a href="https://github.com/megazz31/aeon-scorer" target="_blank" rel="noreferrer">GitHub</a></span><small>Modèle {result?.methodology.model||'sequence-access-v3.1-semantic'} · {AEONSHIFT_META.note}</small></footer>
  </main>
}
