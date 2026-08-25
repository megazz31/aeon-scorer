import { useEffect,useMemo,useState } from 'react'
import { parseDecklist,fetchCards,fetchCard } from './scryfall.js'
import { parseAeonShiftCsv } from './data/aeonshift.js'
import { analyzePower } from './engine/powerModel.js'
import { combinedColorIdentity,validateCommanderPair } from './engine/commanderPair.js'
import { SITE_META,WhyPage,MethodPage,AboutPage } from './sitePages.jsx'
import DeckImportPanel from './DeckImportPanel.jsx'
import { AEON_LABEL,MODEL_ID } from './version.js'
import { VALIDATED_CALIBRATION } from './calibrationReference.js'

const SAMPLE=`1 Sol Ring\n1 Arcane Signet\n1 Swords to Plowshares\n1 Beast Within\n1 Cultivate\n1 Harmonize\n36 Forest`
const CALIBRATION={precon:VALIDATED_CALIBRATION.preconMedian,cedh:VALIDATED_CALIBRATION.cedhMedian}
const SITE_URL='https://aeon-scorer.vercel.app'
const ROUTES=new Set(Object.keys(SITE_META.en))
const HIDDEN_TAGS=new Set(['land','creature','enchantment','artifact','instant','sorcery','mana','sacrifice','graveyard-setup'])
const TAG_LABELS={
  en:{draw:'draw',tutor:'tutor','repeatable-tutor':'repeatable tutor','fast-mana':'fast mana','burst-mana':'burst mana',removal:'removal','tempo-interaction':'tempo',counterspell:'counterspell',protection:'protection',recursion:'recursion',tokens:'tokens','token-payoff':'token payoff','token-doubler':'token doubler','sac-outlet':'sac outlet','death-payoff':'death payoff',etb:'ETB',blink:'blink',constellation:'constellation','artifact-payoff':'artifact payoff',landfall:'landfall','counter-producer':'counter producer','counter-payoff':'counter payoff','counter-doubler':'counter doubler',spellslinger:'spellslinger','exile-cast':'exile casting','exile-payoff':'exile payoff',cheat:'cheat',free:'free / alternate cost',stax:'stax','extra-turn':'extra turn','extra-combat':'extra combat',win:'wincon','trigger-doubler':'trigger doubler',lifegain:'lifegain','life-payoff':'life payoff'},
  fr:{draw:'pioche',tutor:'tutor','repeatable-tutor':'tutor répétable','fast-mana':'fast mana','burst-mana':'mana burst',removal:'removal','tempo-interaction':'tempo',counterspell:'contre',protection:'protection',recursion:'récursion',tokens:'tokens','token-payoff':'payoff tokens','token-doubler':'double tokens','sac-outlet':'sac outlet','death-payoff':'payoff mort',etb:'ETB',blink:'blink',constellation:'constellation','artifact-payoff':'payoff artefact',landfall:'landfall','counter-producer':'produit marqueurs','counter-payoff':'payoff marqueurs','counter-doubler':'double marqueurs',spellslinger:'spellslinger','exile-cast':'jeu exil','exile-payoff':'payoff exil',cheat:'cheat',free:'coût alternatif / gratuit',stax:'stax','extra-turn':'tour supp.','extra-combat':'combat supp.',win:'wincon','trigger-doubler':'double triggers',lifegain:'lifegain','life-payoff':'payoff vie'}
}
const PACKAGE_LABELS={
  en:{'early-commander':'Commander acceleration','blink-etb':'Blink / ETB',constellation:'Enchantments / Constellation',tokens:'Tokens / conversion',sacrifice:'Sacrifice / death',graveyard:'Graveyard / recursion',lands:'Lands / Landfall',counters:'Counters',spells:'Spellslinger',exile:'Exile casting',artifacts:'Artifacts'},
  fr:{'early-commander':'Accélération du commandant','blink-etb':'Blink / ETB',constellation:'Enchantements / Constellation',tokens:'Tokens / conversion',sacrifice:'Sacrifice / mort',graveyard:'Cimetière / récursion',lands:'Lands / Landfall',counters:'Marqueurs',spells:'Spellslinger',exile:'Jeu depuis l’exil',artifacts:'Artefacts'}
}
const t=(lang,en,fr)=>lang==='fr'?fr:en

function Stat({label,value,suffix='',sub,accent=false}){return <div className={`stat${accent?' accentStat':''}`}><span>{label}</span><strong>{value}{suffix}</strong>{sub&&<small>{sub}</small>}</div>}
function Bar({label,value}){return <div className="barRow"><div><span>{label}</span><b>{value}</b></div><div className="bar"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div></div>}
function prettyTags(tags,lang){return tags.filter(x=>!HIDDEN_TAGS.has(x)).map(x=>TAG_LABELS[lang][x]||x).slice(0,5).join(' · ')||t(lang,'structural value','valeur structurelle')}
function cleanPath(){const p=window.location.pathname.replace(/\/+$/,'')||'/';return ROUTES.has(p)?p:'/'}
function packageName(p,lang){return PACKAGE_LABELS[lang][p.id]||p.name}
function packageEvidence(p,lang){
  if(p.id==='early-commander'){
    const burst=(p.producerCards||[]).filter(c=>(c.tags||[]).includes('burst-mana')).length
    const persistent=Math.max(0,(p.producerCards||[]).length-burst)
    const mv=p.payoffCards?.[0]?.cmc??'—'
    return t(lang,`${burst} burst accelerator(s) + ${persistent} persistent source(s) toward a mana value ${mv} commander.`,`${burst} accélérateur(s) burst + ${persistent} source(s) persistante(s) vers un commandant MV ${mv}.`)
  }
  const producers=(p.producerCards||[]).length,payoffs=(p.payoffCards||[]).length,members=(p.members||[]).length
  return t(lang,`${producers} producer(s), ${payoffs} payoff(s), ${members} distinct card(s).`,`${producers} producteur(s), ${payoffs} payoff(s), ${members} carte(s) distincte(s).`)
}
function localizeWarning(w,lang){
  if(lang==='fr')return w
  if(w.startsWith('Très peu de terrains'))return 'Very few lands detected: verify that the imported list is complete.'
  if(w.startsWith('Aucun commandant'))return 'No commander selected: commander dependency and access were not measured.'
  const mana=w.match(/^(\d+) terrain\(s\)/);if(mana)return `${mana[1]} land(s) have poorly determined colored mana production; the access curve may be less precise.`
  if(w.startsWith('AeonShift'))return 'AeonShift is used only as a weak prior; it is not a multiplayer Commander calibration.'
  if(w.startsWith('Combo connue'))return 'Known combo detected: real consistency still depends on tutors, redundancy and protection windows.'
  return w
}
function NavLink({to,route,navigate,children}){return <a href={to} aria-current={route===to?'page':undefined} className={route===to?'active':''} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();navigate(to)}}}>{children}</a>}
function SiteNav({route,navigate,lang,onLanguage}){return <div className="navFrame"><nav className="siteNav" aria-label={t(lang,'Main navigation','Navigation principale')}>
  <a href="/" className="brand" onClick={e=>{e.preventDefault();navigate('/')}}><span className="brandMark" aria-hidden="true"><i>A</i></span><span className="brandText"><b>Aeon Scorer</b><small>{t(lang,'Commander power analyzer','Analyseur de puissance Commander')}</small></span></a>
  <div className="navLinks"><NavLink to="/" route={route} navigate={navigate}>{t(lang,'Analyze','Analyser')}</NavLink><NavLink to="/pourquoi" route={route} navigate={navigate}>{t(lang,'Why','Pourquoi')}</NavLink><NavLink to="/methodologie" route={route} navigate={navigate}>{t(lang,'Methodology','Méthodologie')}</NavLink><NavLink to="/a-propos" route={route} navigate={navigate}>{t(lang,'About','À propos')}</NavLink></div>
  <div className="navActions"><div className="languageSwitch" role="group" aria-label={t(lang,'Language','Langue')}><button className={lang==='en'?'active':''} onClick={()=>onLanguage('en')} aria-pressed={lang==='en'}>EN</button><button className={lang==='fr'?'active':''} onClick={()=>onLanguage('fr')} aria-pressed={lang==='fr'}>FR</button></div><a className="navExternal" href="https://github.com/megazz31/aeon-scorer" target="_blank" rel="noreferrer">GitHub <span>↗</span></a></div>
</nav></div>}
function PowerRange({floor,median,ceiling,peak,lang}){
  const clamp=n=>Math.max(0,Math.min(100,n)),left=clamp(floor),right=clamp(ceiling),mid=clamp(median),top=clamp(peak)
  return <div className="powerRange" aria-label={t(lang,`Power distribution: P20 ${floor}, median ${median}, P80 ${ceiling}, peak ${peak}`,`Distribution de puissance : P20 ${floor}, médiane ${median}, P80 ${ceiling}, pic ${peak}`)}>
    <div className="rangeTop"><span>{t(lang,'Estimated distribution','Distribution estimée')}</span><small>{t(lang,'0–100 scale','échelle 0–100')}</small></div>
    <div className="scaleRail"><span className="rangeBand" style={{left:`${left}%`,width:`${Math.max(1,right-left)}%`}}/><span className="calTick preconTick" style={{left:`${CALIBRATION.precon}%`}}><i/><em>{t(lang,'Precon','Précon')} {CALIBRATION.precon}</em></span><span className="calTick cedhTick" style={{left:`${CALIBRATION.cedh}%`}}><i/><em>cEDH {CALIBRATION.cedh}</em></span><span className="scoreTick medianTick" style={{left:`${mid}%`}}><i/><em>{median}</em></span><span className="scoreTick peakTick" style={{left:`${top}%`}}><i/><em>{t(lang,'peak','pic')} {peak}</em></span></div>
    <div className="rangeLegend"><span><i className="legendBand"/>{t(lang,`Usual range ${floor}–${ceiling}`,`Zone habituelle ${floor}–${ceiling}`)}</span><span>{t(lang,'Precon/cEDH markers are calibration medians, not thresholds.','Les repères précon/cEDH sont des médianes de calibration, pas des seuils.')}</span></div>
  </div>
}

export default function App(){
  const[route,setRoute]=useState(()=>cleanPath())
  const[lang,setLang]=useState(()=>localStorage.getItem('aeon-lang')==='fr'?'fr':'en')
  const[deckText,setDeckText]=useState(''),[commanderName,setCommanderName]=useState(''),[commander,setCommander]=useState(null)
  const[aeonMap,setAeonMap]=useState(new Map()),[result,setResult]=useState(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[iterations,setIterations]=useState(3000),[view,setView]=useState('summary')
  const parsed=useMemo(()=>parseDecklist(deckText),[deckText]),total=parsed.reduce((s,x)=>s+x.qty,0)
  const L=(en,fr)=>t(lang,en,fr)

  useEffect(()=>{const onPop=()=>setRoute(cleanPath());window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])
  useEffect(()=>{document.documentElement.lang=lang;const meta=(SITE_META[lang]||SITE_META.en)[route]||(SITE_META[lang]||SITE_META.en)['/'];document.title=meta.title;const desc=document.querySelector('meta[name="description"]');if(desc)desc.setAttribute('content',meta.description);let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=`${SITE_URL}${route==='/'?'':route}`;const ogTitle=document.querySelector('meta[property="og:title"]');if(ogTitle)ogTitle.setAttribute('content',meta.title);const ogDesc=document.querySelector('meta[property="og:description"]');if(ogDesc)ogDesc.setAttribute('content',meta.description);const ogUrl=document.querySelector('meta[property="og:url"]');if(ogUrl)ogUrl.setAttribute('content',canonical.href)},[route,lang])

  function changeLanguage(next){if(next===lang)return;localStorage.setItem('aeon-lang',next);setLang(next);setError('');setStatus('')}
  function navigate(path){const next=ROUTES.has(path)?path:'/';if(window.location.pathname!==next)window.history.pushState({},'',next);setRoute(next);window.scrollTo({top:0,behavior:'smooth'})}
  const nativeSet=(el,value)=>{if(!el)return;const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')?.set?.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}

  function applyDeckImport(data){
    setDeckText(data.decklist||'')
    let c1=data.commanderName||''
    let c2=''
    if(Array.isArray(data.commanderNames)&&data.commanderNames.length>1){
      c1=data.commanderNames[0]
      c2=data.commanderNames[1]
    }else if(c1.includes('+')){
      const parts=c1.split('+').map(s=>s.trim()).filter(Boolean)
      c1=parts[0]||''
      c2=parts[1]||''
    }
    setCommanderName(c1)
    if(typeof document!=='undefined'){
      const el1=document.getElementById('commander')
      if(el1&&el1.value!==c1)nativeSet(el1,c1)
      const el2=document.getElementById('commander2')
      if(el2)nativeSet(el2,c2)
    }
    setCommander(null)
    setResult(null)
    setError('')
    setStatus('')
    setView('summary')
  }

  useEffect(()=>{
    const onImport=e=>{if(e.detail)applyDeckImport(e.detail)}
    window.addEventListener('aeon-deck-imported',onImport)
    return()=>window.removeEventListener('aeon-deck-imported',onImport)
  },[])

  async function analyze(){
    setError('');setResult(null)
    try{
      if(!parsed.length)throw new Error(L('Paste a decklist using the format "1 Card Name".','Colle une decklist au format "1 Nom de carte".'))
      if(!commanderName.trim())throw new Error(L('Enter the commander. Aeon Scorer does not score a Commander list without its commander.','Renseigne le commandant : Aeon Scorer ne score pas une liste Commander sans son commandant.'))
      
      const secondCommanderEl=typeof document!=='undefined'?document.getElementById('commander2'):null
      const rawSecond=secondCommanderEl?.value?.trim()||(commanderName.includes('+')?commanderName.split('+')[1]?.trim():'')
      const rawFirst=commanderName.includes('+')?commanderName.split('+')[0]?.trim():commanderName.trim()

      if(rawSecond){
        // Two-commander Partner / Background / Friends forever / Doctor's companion
        if(total<98||total>100)throw new Error(L(`The list contains ${total} cards. Import 98 cards with separate commanders, or up to 100 lines when commanders are included. Two-commander Partner / Background configurations are fully supported.`,`La liste contient ${total} cartes. Importe 98 cartes si les commandants sont séparés, ou jusqu’à 100 lignes s’ils sont inclus. Les configurations Partner / Background à deux commandants sont pleinement gérées.`))
        setStatus(`Scryfall: 0/${parsed.length}`)
        const fetched=await fetchCards(parsed,(n,totalCards)=>setStatus(`Scryfall: ${n}/${totalCards}`))
        if(fetched.length!==total)throw new Error(L(`${total-fetched.length} card(s) could not be resolved. Fix the list before scoring it; a partial list would distort the result.`,`${total-fetched.length} carte(s) n’ont pas été résolues. Corrige la liste avant de scorer : une liste partielle fausserait le résultat.`))
        
        setStatus(L('Resolving command zone…','Résolution de la command zone…'))
        const [a,b]=await Promise.all([fetchCard(rawFirst),fetchCard(rawSecond)])
        if(!a||!b)throw new Error(L('One commander could not be resolved on Scryfall.','Un des commandants est introuvable sur Scryfall.'))
        const legal=validateCommanderPair(a,b)
        if(!legal.ok)throw new Error(t(lang,legal.reason,'Cette paire ne présente pas une capacité de double commandant prise en charge.'))
        
        const norm=s=>String(s||'').trim().toLowerCase()
        const cmdNames=new Set([norm(a.name),norm(b.name)])
        const main=fetched.filter(c=>!cmdNames.has(norm(c.name)))
        if(main.length!==98)throw new Error(L(`After removing the two commanders, Aeon finds ${main.length} library cards instead of 98.`,`Après retrait des deux commandants, Aeon trouve ${main.length} cartes en bibliothèque au lieu de 98.`))
        
        const allowed=new Set(combinedColorIdentity([a,b]))
        const offColor=main.filter(c=>(c.colorIdentity||[]).some(x=>!allowed.has(x)))
        if(offColor.length)throw new Error(L(`Combined color identity mismatch: ${[...new Set(offColor.map(c=>c.name))].slice(0,6).join(', ')}${offColor.length>6?'…':''}`,`Identité couleur combinée incompatible : ${[...new Set(offColor.map(c=>c.name))].slice(0,6).join(', ')}${offColor.length>6?'…':''}`))
        
        setCommander({name:`${a.name} + ${b.name}`,colorIdentity:combinedColorIdentity([a,b])})
        setStatus(L(`Simulating ${iterations.toLocaleString('en-US')} sequences…`,`Simulation de ${iterations.toLocaleString('fr-FR')} séquences…`))
        await new Promise(r=>setTimeout(r,20))
        setResult(analyzePower(fetched,[a,b],aeonMap,iterations))
        setView('summary')
        setStatus('')
      }else{
        // Single commander
        if(total!==99&&total!==100)throw new Error(L(`The list contains ${total} cards. Import exactly 99 cards when the commander is separate, or 100 when it is included. Two-commander Partner / Background configurations are supported by filling the second commander.`,`La liste contient ${total} cartes. Importe exactement 99 cartes si le commandant est séparé, ou 100 s’il est inclus. Les configurations Partner / Background à deux commandants sont gérées en renseignant le second commandant.`))
        setStatus(`Scryfall: 0/${parsed.length}`)
        const fetched=await fetchCards(parsed,(n,totalCards)=>setStatus(`Scryfall: ${n}/${totalCards}`))
        if(fetched.length!==total)throw new Error(L(`${total-fetched.length} card(s) could not be resolved. Fix the list before scoring it; a partial list would distort the result.`,`${total-fetched.length} carte(s) n’ont pas été résolues. Corrige la liste avant de scorer : une liste partielle fausserait le résultat.`))
        setStatus(L('Loading commander…','Chargement du commandant…'))
        const cmd=await fetchCard(rawFirst)
        if(!cmd)throw new Error(L('Commander not found on Scryfall.','Commandant introuvable sur Scryfall.'))
        const sameCommander=c=>(c.id&&cmd.id&&c.id===cmd.id)||c.name.toLowerCase()===cmd.name.toLowerCase()||(c.aliases||[]).some(a=>a.toLowerCase()===rawFirst.toLowerCase())
        const commanderCopies=fetched.filter(sameCommander).length
        if(commanderCopies>1)throw new Error(L(`The commander appears ${commanderCopies} times in the list. A single-commander analysis allows at most one copy.`,`Le commandant apparaît ${commanderCopies} fois dans la liste. Une analyse à commandant unique attend au maximum une copie.`))
        if(commanderCopies===1&&total!==100)throw new Error(L('The commander is included in the list, so the total must be 100 cards.','Le commandant est inclus dans la liste : le total doit être 100 cartes.'))
        if(commanderCopies===0&&total!==99)throw new Error(L('The commander is separate, so the main deck must contain exactly 99 cards.','Le commandant n’est pas dans la liste : le main deck doit contenir exactement 99 cartes.'))
        const allowed=new Set(cmd.colorIdentity||[]),offColor=fetched.filter(c=>!sameCommander(c)&&(c.colorIdentity||[]).some(x=>!allowed.has(x)))
        if(offColor.length)throw new Error(L(`Color identity mismatch with ${cmd.name}: ${[...new Set(offColor.map(c=>c.name))].slice(0,6).join(', ')}${offColor.length>6?'…':''}`,`Identité couleur incompatible avec ${cmd.name} : ${[...new Set(offColor.map(c=>c.name))].slice(0,6).join(', ')}${offColor.length>6?'…':''}`))
        setCommander(cmd);setStatus(L(`Simulating ${iterations.toLocaleString('en-US')} sequences…`,`Simulation de ${iterations.toLocaleString('fr-FR')} séquences…`));await new Promise(r=>setTimeout(r,20))
        setResult(analyzePower(fetched,cmd,aeonMap,iterations));setView('summary');setStatus('')
      }
    }catch(e){setError(e.message||String(e));setStatus('')}
  }
  async function importAeon(ev){const f=ev.target.files?.[0];if(!f)return;const map=parseAeonShiftCsv(await f.text());setAeonMap(map);if(!map.size)setError(L('AeonShift CSV was empty or not recognized.','CSV AeonShift non reconnu ou vide.'))}

  return <div className="appRoot">
    <SiteNav route={route} navigate={navigate} lang={lang} onLanguage={changeLanguage}/>
    <main>
      {route==='/pourquoi'&&<WhyPage navigate={navigate} lang={lang}/>} 
      {route==='/methodologie'&&<MethodPage navigate={navigate} lang={lang}/>} 
      {route==='/a-propos'&&<AboutPage lang={lang}/>} 

      {route==='/'&&<>
        <section className="homeHero">
          <div className="heroCopy">
            <div className="heroKicker"><span className="statusDot"/>Aeon Scorer {AEON_LABEL} · {L('validated model','modèle validé')}</div>
            <h1>{L('Commander power is more than a bracket.','La puissance d’un deck ne se résume pas à un bracket.')}</h1>
            <p>{L('The five Commander Brackets describe intended play experience. Aeon Scorer estimates what your deck can actually produce through a ','Les cinq brackets Commander décrivent une expérience de jeu. Aeon Scorer estime ce que ton deck peut réellement produire avec une ')}<b>{L('median','médiane')}</b>, {L('a ','une ')}<b>{L('low output','sortie basse')}</b>, {L('a ','une ')}<b>{L('high output','sortie haute')}</b> {L('and a ','et un ')}<b>{L('peak','pic')}</b>.</p>
            <div className="heroProof"><span>{L(`${VALIDATED_CALIBRATION.benchmarkDecks} calibration decks`,`${VALIDATED_CALIBRATION.benchmarkDecks} decks de calibration`)}</span><span>{L('1,800 / 3,200 sequences','1 800 / 3 200 séquences')}</span><span>{L('Micro + macro + convergence','Micro + macro + convergence')}</span></div>
          </div>
          <aside className="heroExample" aria-label={L('Aeon Scorer result example','Exemple de résultat Aeon Scorer')}><div className="exampleLabel">{L('How to read it','Exemple de lecture')}</div><div className="exampleScore"><strong>55</strong><div><span>45–65</span><small>{L('usual range','plage habituelle')}</small></div></div><div className="examplePeak"><span>{L('Peak','Pic')}</span><b>85</b></div><p>{L('Same median ≠ same deck. The range and peak show what a single number hides.','Même médiane ≠ même deck. La plage et le pic montrent ce qu’un chiffre unique cache.')}</p></aside>
        </section>

        <section className="contentCallout" style={{marginBottom:18}}><b>{L('Aeon improves through real use.','Aeon s’améliore grâce aux analyses réelles.')}</b> {L('Each successful analysis is versioned and expands Aeon’s semantic QA corpus, including anonymous runs. It helps expose misread cards and regressions so future versions can improve. Analyses are evidence, never automatic truth.','Chaque analyse réussie est versionnée et agrandit le corpus QA sémantique d’Aeon, y compris les analyses anonymes. Cela aide à repérer les cartes mal comprises et les régressions pour améliorer les prochaines versions. Les analyses sont des indices, jamais une vérité automatique.')}</section>

        <section className="analyzerCard">
          <div className="analyzerHeader"><div><span className="sectionEyebrow">{L('NEW ANALYSIS','NOUVELLE ANALYSE')}</span><h2>{L('Import or paste your decklist. Aeon does the rest.','Importe ou colle ta decklist. Aeon fait le reste.')}</h2></div><span className="validationPill"><i/>{AEON_LABEL} {L('validated','validée')}</span></div>
          <DeckImportPanel lang={lang} onImported={applyDeckImport}/>
          <div className="analyzerGrid">
            <div className="deckEditor"><div className="fieldHeader"><label htmlFor="decklist">Decklist</label><span className={`cardCount ${total===99||total===100?'ready':''}`}>{total} {L(total===1?'card':'cards',total>1?'cartes':'carte')}</span></div><textarea id="decklist" value={deckText} onChange={e=>setDeckText(e.target.value)} placeholder={SAMPLE}/><div className="editorFoot"><span>{L('99 cards with a separate commander · 100 when included','99 cartes si le commandant est séparé · 100 s’il est inclus')}</span><button type="button" className="textButton" onClick={()=>setDeckText('')}>{L('Clear','Effacer')}</button></div></div>
            <aside className="configPanel">
              <div className="field"><label htmlFor="commander">Commander</label><input id="commander" value={commanderName} onChange={e=>setCommanderName(e.target.value)} placeholder="Hei Bai, Forest Guardian"/><small>{L('Single commander only for now. Two-commander Partner / Background configurations are not modeled yet.','Un seul commandant pour le moment. Partner / Background à deux commandants n’est pas encore modélisé.')}</small></div>
              <div className="field"><label htmlFor="iterations">{L('Monte Carlo sequences','Séquences Monte Carlo')}</label><select id="iterations" value={iterations} onChange={e=>setIterations(Number(e.target.value))}><option value={1500}>1,500 · {L('fast','rapide')}</option><option value={3000}>3,000 · {L('recommended','recommandé')}</option><option value={6000}>6,000 · {L('precise','précis')}</option></select></div>
              <details className="advancedOptions"><summary>{L('Advanced options','Options avancées')} <span>{L('optional','facultatif')}</span></summary><div className="advancedBody"><div className="field"><label htmlFor="aeonshift">AeonShift CSV prior</label><input id="aeonshift" type="file" accept=".csv,text/csv" onChange={importAeon}/><small>{aeonMap.size?L(`${aeonMap.size} entries loaded`,`${aeonMap.size} entrées chargées`):L('No AeonShift prior loaded. The score works without it.','Aucun prior AeonShift chargé. Le score fonctionne sans.')}</small></div></div></details>
              <button className="primaryAction" onClick={analyze} disabled={!!status}><span>{status||L('Analyze deck','Analyser le deck')}</span><i aria-hidden="true">→</i></button>{error&&<div className="error" role="alert">{error}</div>}
            </aside>
          </div>
          <div className="analyzerFoot"><span>{L('No fixed bracket. No arbitrary per-card score.','Aucun bracket fixe. Aucune note arbitraire par carte.')}</span><a href="/pourquoi" onClick={e=>{e.preventDefault();navigate('/pourquoi')}}>{L('Why this model?','Pourquoi ce modèle ?')}</a></div>
        </section>

        {result&&<section className="resultsArea">
          <div className="resultsHeading"><div><span className="sectionEyebrow">{L('RESULT','RÉSULTAT')}</span><h2>{commander?.name||L('Analyzed deck','Deck analysé')}</h2></div><nav className="resultNav" aria-label={L('Analysis views','Vues de l’analyse')}><button className={view==='summary'?'active':''} onClick={()=>setView('summary')}>{L('Summary','Résumé')}</button><button className={view==='diagnostic'?'active':''} onClick={()=>setView('diagnostic')}>{L('Detailed diagnostic','Diagnostic détaillé')}</button></nav></div>
          {view==='summary'&&<><section className="scoreSummary panel"><div className="primaryScore"><span>{L('Median power','Puissance médiane')}</span><strong>{result.profile.median}</strong><small>/100 · {L('estimated usual level','niveau habituel estimé')}</small></div><div className="scoreMetrics"><Stat label={L('Low output · P20','Sortie basse · P20')} value={result.profile.floor} sub={L('when the deck runs below normal','quand le deck déroule moins bien')}/><Stat label={L('High output · P80','Sortie haute · P80')} value={result.profile.ceiling} sub={L('plausible strong output','bonne sortie plausible')}/><Stat label={L('Peak','Pic')} value={result.profile.peak} accent sub={L('accessible upper potential','haut de potentiel accessible')}/></div><PowerRange floor={result.profile.floor} median={result.profile.median} ceiling={result.profile.ceiling} peak={result.profile.peak} lang={lang}/><div className="scoreRead"><b>{result.profile.median} [{result.profile.floor}–{result.profile.ceiling}] · {L('peak','pic')} {result.profile.peak}</b><p>{L('Compare the median first. P20–P80 shows how far normal outputs can spread, then peak shows the upper potential.','Compare d’abord la médiane. P20–P80 montre l’amplitude des sorties habituelles, puis le pic montre le haut de potentiel.')}</p></div></section>{result.combos.length>0&&<section className="summaryAlert comboAlert"><div><span className="alertIcon">!</span><div><b>{L('Known combo detected','Combo connue détectée')}</b><p>{L('Peak may matter more than median for the table experience.','Le pic peut compter davantage que la médiane pour l’expérience de table.')}</p></div></div><strong>{result.combos.length}</strong></section>}{result.profile.coverage<88&&<section className="summaryAlert dataAlert"><div><span className="alertIcon">i</span><div><b>{L('Limited analysis coverage','Couverture d’analyse limitée')}: {result.profile.coverage}%</b><p>{L('The score is still calculated, but check the diagnostic before using it for table matching.','Le score est calculé, mais consulte le diagnostic avant de l’utiliser pour équilibrer une table.')}</p></div></div></section>}</>}

          {view==='diagnostic'&&<div className="diagnosticStack">
            <section className="panel diagOverview"><div className="panelHeading"><div><span className="sectionEyebrow">{L('RELIABILITY','FIABILITÉ')}</span><h2>{L('Dependency and data','Dépendance et données')}</h2></div><p>{L('These values explain the score. They do not replace median, P20, P80 and peak.','Ces valeurs expliquent le score. Elles ne remplacent pas médiane, P20, P80 et pic.')}</p></div><div className="grid4"><Stat label={L('Commander dependency','Dépendance commandant')} value={`+${result.profile.commanderDelta}`}/><Stat label={L('Median commander access','Accès commandant médian')} value={result.simulation.commanderMedianTurn?`T${result.simulation.commanderMedianTurn}`:'n/a'}/><Stat label={L('Median operational package','Package opérationnel médian')} value={result.simulation.engineMedianTurn?`T${result.simulation.engineMedianTurn}`:'n/a'}/><Stat label={L('Data coverage','Couverture des données')} value={result.profile.coverage} suffix="%" sub={L('coverage, not accuracy','couverture, pas exactitude')}/></div>{commander&&<p className="note">{L('After the T4 disruption checkpoint, an ','Après le checkpoint de disruption T4, une ')}<b>{L('accessible recovery option','option de reprise accessible')}</b>{L(' is present on T5 in ',' est présente à T5 dans ')}<b>{result.simulation.recoveryAfterDisruption}%</b>{L(' of sequences. This is not a full board-wipe simulation.',' des séquences. Cette mesure n’est pas une simulation complète d’un wipe.')}</p>}</section>
            <section className="cols"><div className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">{L('DIMENSIONS','DIMENSIONS')}</span><h2>{L('Why this score?','Pourquoi ce score ?')}</h2></div></div>{Object.entries(result.dimensions).map(([k,v])=><Bar key={k} label={{speed:L('Speed','Vitesse'),consistency:L('Consistency','Consistance'),explosiveness:L('Explosiveness','Explosivité'),synergy:L('Synergy','Synergie'),interaction:L('Accessible interaction','Interaction accessible'),resilience:L('Recovery options','Options de reprise')}[k]} value={v}/>)}</div><div className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">{L('STRUCTURE','STRUCTURE')}</span><h2>{L('Detected deck','Deck détecté')}</h2></div></div><div className="miniGrid"><Stat label={L('Lands','Terrains')} value={result.roles.lands}/><Stat label={L('Avg. mana value','MV moyen')} value={result.roles.avgCmc.toFixed(2)}/><Stat label="Fast mana" value={result.roles.fastMana}/><Stat label="Tutors" value={result.roles.tutors}/></div>{result.aeon.available?<p className="note">AeonShift prior: <b>{result.aeon.score}/100</b> · {result.aeon.ranked} {L('ranked card(s). Deliberately weak weight.','carte(s) classée(s). Poids volontairement faible.')}</p>:<p className="note">{L('AeonShift is not required. Its CSV only adds a secondary signal.','AeonShift n’est pas nécessaire. Son CSV ajoute seulement un signal secondaire.')}</p>}</div></section>
            <section className="panel"><div className="panelHeading"><div><span className="sectionEyebrow">{L('ACCESS','ACCÈS')}</span><h2>{L('Turn-by-turn curve','Courbe par tour')}</h2></div><p>{L('Each column is tested independently, not as one line where everything happens at once.','Chaque colonne est testée indépendamment, pas comme une ligne où tout est fait simultanément.')}</p></div><p className="note"><b>{L('Operational package','Package opérationnel')}</b> {L('requires a distinct producer + payoff from the same package with a plausible mana window.','exige un producteur + un payoff distincts du même package, avec une fenêtre de mana plausible.')}</p><div className="turnTable"><div className="turnHead"><span>{L('Turn','Tour')}</span><span>Commander</span><span>{L('Operational package','Package opérationnel')}</span><span>{L('Castable interaction','Interaction lançable')}</span><span>{L('Castable resource','Ressource lançable')}</span><span>{L('Accessible burst','Burst accessible')}</span></div>{result.simulation.turnProfile.map(r=><div className="turnLine" key={r.turn}><b>T{r.turn}</b><span>{r.commander}%</span><span>{r.engine}%</span><span>{r.interaction}%</span><span>{r.resource}%</span><span>{r.burst}%</span></div>)}</div></section>
            <section className="cols"><div className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">{L('SYNERGIES','SYNERGIES')}</span><h2>{L('Detected packages','Packages détectés')}</h2></div></div>{result.packages.length?result.packages.map(p=><article className="pkg" key={p.id}><div><b>{packageName(p,lang)}</b><span>{L('cohesion','cohésion')} {p.cohesion??p.strength}/100</span></div><p>{packageEvidence(p,lang)}</p><small><b>{L('Producers','Producteurs')}:</b> {p.producers.join(' · ')||'—'}</small><small><b>Payoffs:</b> {p.payoffs.join(' · ')||'—'}</small></article>):<p className="muted">{L('No package has two sufficiently supported functional roles.','Aucun package avec deux rôles suffisamment étayés.')}</p>}</div><div className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">{L('IMPACT','IMPACT')}</span><h2>{L('Main drivers','Principaux drivers')}</h2></div></div>{result.drivers.map(d=><div className="driver" key={d.name}><span><b>{d.name}</b><small>{prettyTags(d.tags,lang)}</small></span><strong>{d.impact}</strong></div>)}</div></section>
            {result.combos.length>0&&<section className="panel"><div className="panelHeading compact"><div><span className="sectionEyebrow">COMBOS</span><h2>{L('Known combos detected','Combos connues détectées')}</h2></div></div>{result.combos.map(c=><div className="combo" key={c.name}><b>{c.name}</b><span>{c.cards.join(' + ')}</span></div>)}<p className="note">{L('The high-confidence combo library is intentionally non-exhaustive. No result here does not mean the deck has no possible combo.','Bibliothèque haute confiance volontairement non exhaustive : absence ici ne signifie pas absence de combo dans le deck.')}</p></section>}
            <section className="panel caveats"><div className="panelHeading compact"><div><span className="sectionEyebrow">{L('LIMITS','LIMITES')}</span><h2>{L('What the diagnostic does not simulate','Ce que le diagnostic ne simule pas')}</h2></div></div><p>{L('Dimensions explain power; they do not replace the main score. Coverage measures how much data the engine understood, not a probability of correctness.','Les dimensions servent à expliquer la puissance, pas à remplacer le score principal. La couverture mesure la quantité de données comprises par le moteur, pas une probabilité d’exactitude.')}</p><p>{L('Recovery options measure access to a resource, another package or a commander recast after the disruption checkpoint; this is not a full wipe simulation. Tutors and contextual alternate costs are not executed as a full rules engine.','« Options de reprise » mesure l’accès à une ressource, un autre package ou un recast du commandant après le checkpoint de disruption ; ce n’est pas une simulation complète d’un wipe. Les tuteurs et coûts alternatifs contextuels ne sont pas encore exécutés comme un moteur de règles.')}</p><p>{L('Combo detection is intentionally partial. No detected combo does not mean no combo is possible.','La détection de combos est volontairement partielle. Aucune combo détectée ne veut pas dire « aucune combo possible ».')}</p>{result.warnings.map((w,i)=><p key={i}>• {localizeWarning(w,lang)}</p>)}</section>
          </div>}
        </section>}
      </>}
    </main>
    <footer><div className="footerInner"><div><a href="/" className="footerBrand" onClick={e=>{e.preventDefault();navigate('/')}}>Aeon Scorer</a><span>{L('MTG Commander power analyzer','Analyseur de puissance MTG Commander')}</span></div><div className="footerLinks"><a href="/pourquoi" onClick={e=>{e.preventDefault();navigate('/pourquoi')}}>{L('Why','Pourquoi')}</a><a href="/methodologie" onClick={e=>{e.preventDefault();navigate('/methodologie')}}>{L('Methodology','Méthodologie')}</a><a href="/a-propos" onClick={e=>{e.preventDefault();navigate('/a-propos')}}>{L('About','À propos')}</a><a href="https://github.com/megazz31/aeon-scorer" target="_blank" rel="noreferrer">GitHub ↗</a></div><small>{L('Model','Modèle')} {result?.methodology.model||MODEL_ID} · {L('AeonShift remains an optional weak prior.','AeonShift reste un prior faible et optionnel.')}</small></div></footer>
  </div>
}
