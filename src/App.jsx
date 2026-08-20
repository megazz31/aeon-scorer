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

function Stat({label,value,suffix='',sub,accent=false}){
  return <div className={`stat${accent?' accentStat':''}`}>
    <span>{label}</span><strong>{value}{suffix}</strong>{sub&&<small>{sub}</small>}
  </div>
}
function Bar({label,value}){
  return <div className="barRow"><div><span>{label}</span><b>{value}</b></div><div className="bar"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div></div>
}
function prettyTags(tags){return tags.filter(t=>!HIDDEN_TAGS.has(t)).map(t=>LABELS[t]||t).slice(0,5).join(' · ')||'valeur structurelle'}
function cleanPath(){const p=window.location.pathname.replace(/\/+$/,'')||'/';return ROUTES.has(p)?p:'/'}
function NavLink({to,route,navigate,children}){
  return <a href={to} aria-current={route===to?'page':undefined} className={route===to?'active':''} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();navigate(to)}}}>{children}</a>
}
function SiteNav({route,navigate}){
  return <div className="navFrame"><nav className="siteNav" aria-label="Navigation principale">
    <a href="/" className="brand" onClick={e=>{e.preventDefault();navigate('/')}}>
      <span className="brandMark" aria-hidden="true"><i>A</i></span>
      <span className="brandText"><b>Aeon Scorer</b><small>Commander power analyzer</small></span>
    </a>
    <div className="navLinks">
      <NavLink to="/" route={route} navigate={navigate}>Analyser</NavLink>
      <NavLink to="/pourquoi" route={route} navigate={navigate}>Pourquoi</NavLink>
      <NavLink to="/methodologie" route={route} navigate={navigate}>Méthodologie</NavLink>
      <NavLink to="/a-propos" route={route} navigate={navigate}>À propos</NavLink>
    </div>
    <a className="navExternal" href="https://github.com/megazz31/aeon-scorer" target="_blank" rel="noreferrer">GitHub <span>↗</span></a>
  </nav></div>
}
function PowerRange({floor,median,ceiling,peak}){
  const clamp=n=>Math.max(0,Math.min(100,n))
  const left=clamp(floor),right=clamp(ceiling),mid=clamp(median),top=clamp(peak)
  return <div className="powerRange" aria-label={`Distribution de puissance : P20 ${floor}, médiane ${median}, P80 ${ceiling}, pic ${peak}`}>
    <div className="rangeTop"><span>Distribution estimée</span><small>échelle 0–100</small></div>
    <div className="scaleRail">
      <span className="rangeBand" style={{left:`${left}%`,width:`${Math.max(1,right-left)}%`}}/>
      <span className="calTick preconTick" style={{left:`${CALIBRATION.precon}%`}}><i/><em>Précon {CALIBRATION.precon}</em></span>
      <span className="calTick cedhTick" style={{left:`${CALIBRATION.cedh}%`}}><i/><em>cEDH {CALIBRATION.cedh}</em></span>
      <span className="scoreTick medianTick" style={{left:`${mid}%`}}><i/><em>{median}</em></span>
      <span className="scoreTick peakTick" style={{left:`${top}%`}}><i/><em>pic {peak}</em></span>
    </div>
    <div className="rangeLegend"><span><i className="legendBand"/>Zone habituelle {floor}–{ceiling}</span><span>Les repères précon/cEDH sont des médianes de calibration, pas des seuils.</span></div>
  </div>
}

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
      if(total!==99&&total!==100)throw new Error(`La liste contient ${total} cartes. Importe exactement 99 cartes si le commandant est séparé, ou 100 s’il est inclus dans la liste. La v3.1 ne gère pas encore les configurations Partner / Background à deux commandants.`)
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

  return <div className="appRoot">
    <SiteNav route={route} navigate={navigate}/>
    <main>
      {route==='/pourquoi'&&<WhyPage navigate={navigate}/>} 
      {route==='/methodologie'&&<MethodPage navigate={navigate}/>} 
      {route==='/a-propos'&&<AboutPage/>}

      {route==='/'&&<>
        <section className="homeHero">
          <div className="heroCopy">
            <div className="heroKicker"><span className="statusDot"/>Aeon Scorer v3.1 · modèle validé</div>
            <h1>La puissance d’un deck ne tient pas dans un « 7 ».</h1>
            <p>Mesure une <b>médiane</b>, une <b>sortie basse</b>, une <b>sortie haute</b> et un <b>pic</b>. Le diagnostic reste disponible quand tu veux comprendre le pourquoi.</p>
            <div className="heroProof"><span>38 decks de calibration</span><span>1 800 / 3 200 séquences</span><span>Micro + macro + convergence</span></div>
          </div>
          <aside className="heroExample" aria-label="Exemple de résultat Aeon Scorer">
            <div className="exampleLabel">Exemple de lecture</div>
            <div className="exampleScore"><strong>55</strong><div><span>45–65</span><small>plage habituelle</small></div></div>
            <div className="examplePeak"><span>Pic</span><b>85</b></div>
            <p>Même médiane ≠ même deck. La plage et le pic montrent ce qu’un chiffre unique cache.</p>
          </aside>
        </section>

        <section className="analyzerCard">
          <div className="analyzerHeader">
            <div><span className="sectionEyebrow">NOUVELLE ANALYSE</span><h2>Colle ta decklist. Aeon fait le reste.</h2></div>
            <span className="validationPill"><i/>v3.1 validée</span>
          </div>
          <div className="analyzerGrid">
            <div className="deckEditor">
              <div className="fieldHeader"><label htmlFor="decklist">Decklist</label><span className={`cardCount ${total===99||total===100?'ready':''}`}>{total} carte{total>1?'s':''}</span></div>
              <textarea id="decklist" value={deckText} onChange={e=>setDeckText(e.target.value)} placeholder={SAMPLE}/>
              <div className="editorFoot"><span>99 cartes si le commandant est séparé · 100 s’il est inclus</span><button type="button" className="textButton" onClick={()=>setDeckText('')}>Effacer</button></div>
            </div>
            <aside className="configPanel">
              <div className="field"><label htmlFor="commander">Commandant</label><input id="commander" value={commanderName} onChange={e=>setCommanderName(e.target.value)} placeholder="Hei Bai, Forest Guardian"/><small>Un seul commandant pour le moment. Partner / Background à deux commandants n’est pas encore modélisé.</small></div>
              <div className="field"><label htmlFor="iterations">Séquences Monte Carlo</label><select id="iterations" value={iterations} onChange={e=>setIterations(Number(e.target.value))}><option value={1500}>1 500 · rapide</option><option value={3000}>3 000 · recommandé</option><option value={6000}>6 000 · précis</option></select></div>
              <details className="advancedOptions"><summary>Options avancées <span>facultatif</span></summary><div className="advancedBody"><div className="field"><label htmlFor="aeonshift">Prior AeonShift CSV</label><input id="aeonshift" type="file" accept=".csv,text/csv" onChange={importAeon}/><small>{aeonMap.size?`${aeonMap.size} entrées chargées`:'Aucun prior AeonShift chargé. Le score fonctionne sans.'}</small></div></div></details>
              <button className="primaryAction" onClick={analyze} disabled={!!status}><span>{status||'Analyser le deck'}</span><i aria-hidden="true">→</i></button>
              {error&&<div className="error" role="alert">{error}</div>}
            </aside>
          </div>
          <div className="analyzerFoot"><span>Aucun bracket fixe. Aucune note arbitraire par carte.</span><a href="/pourquoi" onClick={e=>{e.preventDefault();navigate('/pourquoi')}}>Pourquoi ce modèle ?</a></div>
        </section>

        {result&&<section className="resultsArea">
          <div className="resultsHeading"><div><span className="sectionEyebrow">RÉSULTAT</span><h2>{commander?.name||'Deck analysé'}</h2></div><nav className="resultNav" aria-label="Vues de l’analyse"><button className={view==='summary'?'active':''} onClick={()=>setView('summary')}>Résumé</button><button className={view==='diagnostic'?'active':''} onClick={()=>setView('diagnostic')}>Diagnostic détaillé</button></nav></div>

          {view==='summary'&&<>
            <section className="scoreSummary panel">
              <div className="primaryScore"><span>Puissance médiane</span><strong>{result.profile.median}</strong><small>/100 · niveau habituel estimé</small></div>
              <div className="scoreMetrics"><Stat label="Sortie basse · P20" value={result.profile.floor} sub="quand le deck déroule moins bien"/><Stat label="Sortie haute · P80" value={result.profile.ceiling} sub="bonne sortie plausible"/><Stat label="Pic" value={result.profile.peak} accent sub="haut de potentiel accessible"/></div>
              <PowerRange floor={result.profile.floor} median={result.profile.median} ceiling={result.profile.ceiling} peak={result.profile.peak}/>
              <div className="scoreRead"><b>{result.profile.median} [{result.profile.floor}–{result.profile.ceiling}] · pic {result.profile.peak}</b><p>Le premier chiffre à comparer est la médiane. La plage P20–P80 dit à quel point les sorties peuvent s’écarter, puis le pic montre le haut de potentiel.</p></div>
            </section>
            {result.combos.length>0&&<section className="summaryAlert comboAlert"><div><span className="alertIcon">!</span><div><b>Combo connue détectée</b><p>Le pic peut compter davantage que la médiane pour l’expérience de table.</p></div></div><strong>{result.combos.length}</strong></section>}
            {result.profile.coverage<88&&<section className="summaryAlert dataAlert"><div><span className="alertIcon">i</span><div><b>Couverture d’analyse limitée : {result.profile.coverage}%</b><p>Le score est calculé, mais consulte le diagnostic avant de l’utiliser pour équilibrer une table.</p></div></div></section>}
          </>}

          {view==='diagnostic'&&<div className="diagnosticStack">
            <section className="panel diagOverview"><div className="panelHeading"><div><span className="sectionEyebrow">FIABILITÉ</span><h2>Dépendance et données</h2></div><p>Ces valeurs expliquent le score. Elles ne remplacent pas médiane, P20, P80 et pic.</p></div><div className="grid4"><Stat label="Dépendance commandant" value={`+${result.profile.commanderDelta}`}/><Stat label="Accès commandant médian" value={result.simulation.commanderMedianTurn?`T${result.simulation.commanderMedianTurn}`:'n/d'}/><Stat label="Package opérationnel médian" value={result.simulation.engineMedianTurn?`T${result.simulation.engineMedianTurn}`:'n/d'}/><Stat label="Couverture des données" value={result.profile.coverage} suffix="%" sub="couverture, pas exactitude"/></div>{commander&&<p className="note">Après le checkpoint de disruption T4, une <b>option de reprise accessible</b> est présente à T5 dans <b>{result.simulation.recoveryAfterDisruption}%</b> des séquences. Cette mesure n’est pas une simulation complète d’un wipe.</p>}</section>

            <section className="cols"><div className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">DIMENSIONS</span><h2>Pourquoi ce score ?</h2></div></div>{Object.entries(result.dimensions).map(([k,v])=><Bar key={k} label={{speed:'Vitesse',consistency:'Consistance',explosiveness:'Explosivité',synergy:'Synergie',interaction:'Interaction accessible',resilience:'Options de reprise'}[k]} value={v}/>)}</div><div className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">STRUCTURE</span><h2>Deck détecté</h2></div></div><div className="miniGrid"><Stat label="Terrains" value={result.roles.lands}/><Stat label="MV moyen" value={result.roles.avgCmc.toFixed(2)}/><Stat label="Fast mana" value={result.roles.fastMana}/><Stat label="Tutors" value={result.roles.tutors}/></div>{result.aeon.available?<p className="note">Prior AeonShift : <b>{result.aeon.score}/100</b> · {result.aeon.ranked} carte(s) classée(s). Poids volontairement faible.</p>:<p className="note">AeonShift n’est pas nécessaire. Son CSV ajoute seulement un signal secondaire.</p>}</div></section>

            <section className="panel"><div className="panelHeading"><div><span className="sectionEyebrow">ACCÈS</span><h2>Courbe par tour</h2></div><p>Chaque colonne est testée indépendamment, pas comme une ligne où tout est fait simultanément.</p></div><p className="note"><b>Package opérationnel</b> exige un producteur + un payoff distincts du même package, avec une fenêtre de mana plausible.</p><div className="turnTable"><div className="turnHead"><span>Tour</span><span>Commandant</span><span>Package opérationnel</span><span>Interaction lançable</span><span>Ressource lançable</span><span>Burst accessible</span></div>{result.simulation.turnProfile.map(r=><div className="turnLine" key={r.turn}><b>T{r.turn}</b><span>{r.commander}%</span><span>{r.engine}%</span><span>{r.interaction}%</span><span>{r.resource}%</span><span>{r.burst}%</span></div>)}</div></section>

            <section className="cols"><div className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">SYNERGIES</span><h2>Packages détectés</h2></div></div>{result.packages.length?result.packages.map(p=><article className="pkg" key={p.id}><div><b>{p.name}</b><span>cohésion {p.cohesion??p.strength}/100</span></div><p>{p.evidence}</p><small><b>Producteurs :</b> {p.producers.join(' · ')||'—'}</small><small><b>Payoffs :</b> {p.payoffs.join(' · ')||'—'}</small></article>):<p className="muted">Aucun package avec deux rôles suffisamment étayés.</p>}</div><div className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">IMPACT</span><h2>Principaux drivers</h2></div></div>{result.drivers.map(d=><div className="driver" key={d.name}><span><b>{d.name}</b><small>{prettyTags(d.tags)}</small></span><strong>{d.impact}</strong></div>)}</div></section>

            {result.combos.length>0&&<section className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">COMBOS</span><h2>Combos connues détectées</h2></div></div>{result.combos.map(c=><div className="combo" key={c.name}><b>{c.name}</b><span>{c.cards.join(' + ')}</span></div>)}<p className="note">Bibliothèque haute confiance volontairement non exhaustive : absence ici ne signifie pas absence de combo dans le deck.</p></section>}
            <section className="panel caveats"><div className="panelHeading compact"><div><span className="sectionEyebrow">LIMITES</span><h2>Ce que le diagnostic ne simule pas</h2></div></div><p>Les dimensions servent à <b>expliquer</b> la puissance, pas à remplacer le score principal. La couverture mesure la quantité de données comprises par le moteur, pas une probabilité d’exactitude.</p><p>« Options de reprise » mesure l’accès à une ressource, un autre package ou un recast du commandant après le checkpoint de disruption ; ce n’est pas une simulation complète d’un wipe. Les tuteurs et coûts alternatifs contextuels ne sont pas encore exécutés comme un moteur de règles.</p><p>La détection de combos est volontairement partielle. Aucune combo détectée ne veut pas dire « aucune combo possible ».</p>{result.warnings.map((w,i)=><p key={i}>• {w}</p>)}</section>
          </div>}
        </section>}
      </>}
    </main>

    <footer><div className="footerInner"><div><a href="/" className="footerBrand" onClick={e=>{e.preventDefault();navigate('/')}}>Aeon Scorer</a><span>MTG Commander power analyzer</span></div><div className="footerLinks"><a href="/pourquoi" onClick={e=>{e.preventDefault();navigate('/pourquoi')}}>Pourquoi</a><a href="/methodologie" onClick={e=>{e.preventDefault();navigate('/methodologie')}}>Méthodologie</a><a href="/a-propos" onClick={e=>{e.preventDefault();navigate('/a-propos')}}>À propos</a><a href="https://github.com/megazz31/aeon-scorer" target="_blank" rel="noreferrer">GitHub ↗</a></div><small>Modèle {result?.methodology.model||'sequence-access-v3.1-semantic'} · {AEONSHIFT_META.note}</small></div></footer>
  </div>
}
