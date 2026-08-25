import { useEffect,useMemo,useState } from 'react'
import { createMatchSession,joinMatchSession,loadAnalysisShare,loadMatchSession,setMatchSessionStatus } from './supabaseClient.js'
import { roadmapResultFromShare,normalizedShare } from './productData.js'
import { formPods } from './engine/matchmaking.js'
import { buildCrossTableRepairs } from './engine/matchRepair.js'
import { buildPodIntelligence } from './engine/roadmapEngine.js'
import { analyzePower } from './engine/powerModel.js'
import { parseDecklist,fetchCards,fetchCard } from './scryfall.js'
import { resolveDeckReference } from './deckPickerSource.js'
import DeckPresetsBar from './DeckPresetsBar.jsx'
import DeckPickerModal from './DeckPickerModal.jsx'
import GameObservationForm from './GameObservationForm.jsx'
import './product.css'

const lang=()=>localStorage.getItem('aeon-lang')==='fr'?'fr':'en'
const t=(en,fr)=>lang()==='fr'?fr:en
const pretty=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/-/g,' ')
const codeOf=input=>String(input||'').trim().match(/(?:\/a\/)?([a-f0-9]{12})(?:\b|\/|$)/i)?.[1]?.toLowerCase()||''
const externalDeckUrl=input=>{try{const u=new URL(String(input||'').trim());return u.protocol==='https:'&&/(^|\.)(moxfield\.com|archidekt\.com)$/i.test(u.hostname)?u.toString():''}catch{return ''}}
const sessionOf=()=>String(new URLSearchParams(location.search).get('session')||'').trim().toLowerCase().match(/^[a-f0-9]{10}$/)?.[0]||''
const tokenKey=code=>`aeon-match-organizer-${code}`
const predictionFrom=intel=>{const gap=intel?.threatAnswer?.decks?.flatMap(d=>d.turns||[]).reduce((m,x)=>Math.max(m,Number(x.gap||0)),0)||0;return {riskScore:intel?.gameQuality?.risk?.score||0,riskLevel:intel?.gameQuality?.risk?.level||'low',podMismatch:intel?.podMatch?.mismatch||0,threatGap:gap}}

export default function AeonMatchPage(){
  const sessionCode=useMemo(sessionOf,[])
  const [text,setText]=useState('')
  const [players,setPlayers]=useState([])
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [sessionInfo,setSessionInfo]=useState(null)
  const [joinShare,setJoinShare]=useState('')
  const [sessionState,setSessionState]=useState('')
  const [modalOpen,setModalOpen]=useState(false)

  const match=useMemo(()=>players.length>=4?formPods(players,{podSize:4}):null,[players])
  const repairAudit=useMemo(()=>match?buildCrossTableRepairs(match):null,[match])
  const tableIntelligence=useMemo(()=>match?Object.fromEntries(match.pods.map(p=>[p.table,buildPodIntelligence(p.players.map(x=>x.analysis))])):{},[match])
  const organizerToken=sessionCode?localStorage.getItem(tokenKey(sessionCode))||'':''

  const playerFromShare=(row,i)=>({
    id:row.share_code||row.code||`p${i}`,
    name:normalizedShare(row).deckName,
    analysis:roadmapResultFromShare(row),
    share:row,
    source:row.source_type||'share'
  })

  async function rowsToPlayers(rows){
    setPlayers(rows.map(playerFromShare))
  }

  async function loadCodes(codes){
    const rows=await Promise.all(codes.map(c=>resolveDeckReference(c)||loadAnalysisShare(c)))
    if(rows.some(x=>!x))throw new Error(t('One or more shares could not be loaded.','Un ou plusieurs partages n’ont pas pu être chargés.'))
    await rowsToPlayers(rows)
  }

  async function analyzeExternal(url,index){
    const response=await fetch('/api/import-deck',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})})
    const data=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(data.error||t('Unable to import this deck.','Impossible d’importer ce deck.'))
    const parsed=parseDecklist(data.decklist)
    const expected=100-Math.max(1,(data.commanderNames||[data.commanderName]).filter(Boolean).length)
    const total=parsed.reduce((s,x)=>s+x.qty,0)
    if(total!==expected)throw new Error(t(`Imported ${data.deckName||'deck'} has ${total} main-deck cards; expected ${expected}.`,`Le deck importé ${data.deckName||''} contient ${total} cartes principales ; ${expected} attendues.`))
    const cards=await fetchCards(parsed)
    const commanderNames=(data.commanderNames||[data.commanderName]).filter(Boolean)
    const commanders=(await Promise.all(commanderNames.map(fetchCard))).filter(Boolean)
    if(cards.length!==total||commanders.length!==commanderNames.length)throw new Error(t('Some imported cards or commanders could not be resolved.','Certaines cartes ou commandants importés n’ont pas pu être résolus.'))
    const analysis=analyzePower(cards,commanders.length===1?commanders[0]:commanders,null,1800,{emitProduct:false,record:false})
    const id=`local:${data.source||'url'}:${data.sourceId||index}:${index}`
    return {id,name:data.deckName||commanderNames.join(' + ')||`Imported deck ${index+1}`,analysis,share:null,source:'local-url',sourceUrl:data.sourceUrl||url}
  }

  async function loadLocal(overrideText=null){
    setBusy(true);setError('')
    try{
      const currentText=overrideText!==null?overrideText:text
      const raw=[...new Set(currentText.split(/\r?\n|\s+/).map(x=>x.trim()).filter(Boolean))].slice(0,64)
      if(raw.length<4)throw new Error(t('Add at least four Aeon shares, precons, saved decks or public Moxfield/Archidekt URLs.','Ajoute au moins quatre partages Aeon, préconstruits, decks sauvegardés ou URLs publiques Moxfield/Archidekt.'))
      
      const externalCount=raw.map(x=>({raw:x,url:externalDeckUrl(x)})).filter(x=>x.url).length
      if(externalCount>8)throw new Error(t('Direct local import is limited to 8 external deck URLs per batch. Use versioned Aeon shares or precons for larger events.','L’import local direct est limité à 8 URLs de decks externes par lot. Utilise les partages Aeon ou préconstruits pour les grands événements.'))
      
      const loaded=[]
      for(let i=0;i<raw.length;i++){
        const item=raw[i]
        const resolvedRow=await resolveDeckReference(item)
        if(resolvedRow){
          loaded.push(playerFromShare(resolvedRow,i))
        }else if(externalDeckUrl(item)){
          loaded.push(await analyzeExternal(externalDeckUrl(item),i))
        }else{
          throw new Error(t(`Could not resolve entry: "${item}". Check format or share code.`,`Entrée impossible à résoudre : "${item}". Vérifie le format ou le code.`))
        }
      }
      setPlayers(loaded)
    }catch(e){
      setError(e.message||String(e))
    }finally{
      setBusy(false)
    }
  }

  function handlePreset(refs){
    const nextText=refs.join('\n')
    setText(nextText)
    loadLocal(nextText)
  }

  function handleMultiModalSelect(items){
    const refs=items.map(x=>typeof x==='string'?x:x.ref)
    const nextText=refs.join('\n')
    setText(nextText)
    if(refs.length>=4){
      loadLocal(nextText)
    }
  }

  async function refreshSession(){
    if(!sessionCode)return
    setBusy(true);setError('')
    try{
      const info=await loadMatchSession(sessionCode)
      setSessionInfo(info)
      await loadCodes((info.entries||[]).map(x=>x.shareCode))
    }catch(e){
      setError(e.message||String(e))
      setPlayers([])
    }finally{
      setBusy(false)
    }
  }

  useEffect(()=>{if(sessionCode)refreshSession()},[sessionCode])

  async function createSession(){
    setBusy(true);setError('')
    try{
      const x=await createMatchSession(64)
      localStorage.setItem(tokenKey(x.code),x.organizerToken)
      location.href=`/match?session=${x.code}`
    }catch(e){
      setError(e.message==='authentication_required'?t('Sign in first to create an organizer session. Players will not need an account to join.','Connecte-toi d’abord pour créer une session organisateur. Les joueurs n’auront pas besoin de compte pour la rejoindre.'):e.message||String(e))
    }finally{
      setBusy(false)
    }
  }

  async function join(){
    const resolved=await resolveDeckReference(joinShare)
    const code=resolved?.share_code||resolved?.code||codeOf(joinShare)
    if(!code){
      setSessionState(t('Paste a valid Aeon share link/code or precon reference.','Colle un lien/code Aeon valide ou une référence de préconstruit.'))
      return
    }
    setBusy(true);setSessionState('')
    try{
      await joinMatchSession(sessionCode,code)
      setJoinShare('')
      setSessionState(t('Joined.','Ajouté.'))
      await refreshSession()
    }catch(e){
      setSessionState(e.message||String(e))
    }finally{
      setBusy(false)
    }
  }

  async function setStatus(status){
    if(!organizerToken)return
    setBusy(true)
    try{
      await setMatchSessionStatus(sessionCode,organizerToken,status)
      await refreshSession()
    }catch(e){
      setError(e.message||String(e))
    }finally{
      setBusy(false)
    }
  }

  const joinUrl=sessionCode?`${location.origin}/match?session=${sessionCode}`:''

  return <main className="productPage wide">
    <a className="productBack" href="/">← Aeon Scorer</a>
    <header className="productHero">
      <span>AEON MATCH · P5 EXPERIMENTAL</span>
      <h1>{t('Form better Commander tables.','Former de meilleures tables Commander.')}</h1>
      <p>{t('Persistent event sessions use versioned Aeon shares. Local Match can also analyze saved account decks, precons, or up to 8 public Moxfield/Archidekt URLs directly. Small complete pools up to 12 players are solved exactly; larger pools use deterministic local optimization.','Les sessions événement persistantes utilisent des partages Aeon versionnés. Le Match local peut aussi analyser des decks du compte, des préconstruits officiels ou jusqu’à 8 URLs publiques Moxfield/Archidekt directement. Les petits groupes complets jusqu’à 12 joueurs sont résolus exactement ; les plus grands utilisent une optimisation locale déterministe.')}</p>
    </header>

    {!sessionCode&&<>
      <div className="productActions">
        <button className="productPrimary" onClick={createSession} disabled={busy}>{t('Create LGS / event session','Créer une session LGS / événement')}</button>
      </div>
      <p className="productNote">{t('Organizer creation requires an Aeon account. Joining a persistent session does not. Persistent sessions store only public Rule 0 share codes; direct Moxfield/Archidekt imports below stay local and are not enrolled into Reality observations.','La création organisateur nécessite un compte Aeon. Rejoindre une session persistante n’en nécessite pas. Les sessions persistantes ne stockent que des codes Rule 0 publics ; les imports directs Moxfield/Archidekt ci-dessous restent locaux et ne sont pas intégrés aux observations Reality.')}</p>
      
      <DeckPresetsBar
        mode="match"
        onSelectRefs={handlePreset}
        onOpenModal={()=>setModalOpen(true)}
      />

      <textarea
        className="matchInput"
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder={'https://…/a/abc123def456\nprecon:blood-rites-lcc\nhttps://www.moxfield.com/decks/…\nhttps://archidekt.com/decks/…'}
      />
      <button className="productPrimary" onClick={()=>loadLocal()} disabled={busy}>
        {busy?t('Loading / analyzing…','Chargement / analyse…'):t('Generate tables locally','Générer les tables localement')}
      </button>
    </>}

    <DeckPickerModal
      isOpen={modalOpen}
      onClose={()=>setModalOpen(false)}
      onSelect={handleMultiModalSelect}
      multiSelect={true}
    />

    {sessionCode&&<section className="rule0Tools">
      <div className="rule0ToolsHead">
        <div><span className="sectionEyebrow">FAST JOIN</span><h3>{t('Session','Session')} {sessionCode}</h3></div>
        <small>{sessionInfo?.status||'…'} · {players.length}/{sessionInfo?.maxPlayers||64}</small>
      </div>
      <div className="productActions">
        <button onClick={()=>navigator.clipboard?.writeText(joinUrl)}>{t('Copy join link','Copier le lien')}</button>
        {navigator.share&&<button onClick={()=>navigator.share({title:'Aeon Match',url:joinUrl})}>{t('Share join link','Partager le lien')}</button>}
        <button onClick={refreshSession} disabled={busy}>{t('Refresh','Actualiser')}</button>
      </div>
      <p className="productNote">{joinUrl}</p>
      {sessionInfo?.status==='open'&&<div className="feedbackBox">
        <input value={joinShare} onChange={e=>setJoinShare(e.target.value)} placeholder={t('Your Aeon Rule 0 share link or precon reference','Ton lien Rule 0 Aeon ou référence de préconstruit')}/>
        <button onClick={join} disabled={busy}>{t('Join session','Rejoindre')}</button>
      </div>}
      {sessionState&&<p className="productNote">{sessionState}</p>}
      {organizerToken&&<div className="productActions">
        <button onClick={()=>setStatus('open')}>{t('Open joins','Ouvrir')}</button>
        <button onClick={()=>setStatus('locked')}>{t('Lock roster','Verrouiller')}</button>
        <button onClick={()=>setStatus('closed')}>{t('Close session','Fermer')}</button>
      </div>}
      <p className="productNote">{t('This link is QR-ready for the organizer’s preferred display/QR tool; Aeon itself does not send the session data to a third-party QR service.','Ce lien est prêt à être converti en QR avec l’outil d’affichage/QR choisi par l’organisateur ; Aeon n’envoie pas les données de session à un service QR tiers.')}</p>
    </section>}

    {error&&<div className="productError">{error}</div>}

    {match&&<section className="podResults">
      <div className="podVerdict playable">
        <b>{match.pods.length} {t('table(s) generated','table(s) générée(s)')}</b>
        <span>{t(`Total mismatch ${match.totalMismatch} · ${match.algorithm}`,`Mismatch total ${match.totalMismatch} · ${match.algorithm}`)}</span>
      </div>
      {match.pods.map(p=>{
        const intel=tableIntelligence[p.table]
        const prediction=predictionFrom(intel)
        const debt=intel?.answerDebt?.highest?.[0]
        const agency=intel?.agencyTimeline?.highestRisk
        const agencyPlayer=agency?p.players[agency.index]:null
        const shareBacked=p.players.every(x=>x.share?.share_code)
        return <div className="podWarnings" key={p.table}>
          <b>{t('Table','Table')} {p.table} · mismatch {p.assessment.mismatch}/100</b>
          {p.players.map(player=><div key={player.id}>
            <span>{player.name}</span>
            <small>{player.analysis.commanderNames?.join(' + ')||'—'} · median {player.analysis.profile?.median}{player.source==='local-url'?` · ${t('local quick analysis','analyse locale rapide')}`:''}</small>
          </div>)}
          {intel&&<div>
            <span>{t('Game quality','Qualité de partie')}</span>
            <small>{intel.gameQuality.compatibility} · {intel.gameQuality.risk.level} {intel.gameQuality.risk.score}/100</small>
          </div>}
          {agency&&<div>
            <span>{t('Agency diagnostic','Diagnostic Agency')} · {agencyPlayer?.name||t('seat','siège')} {agency.index+1}</span>
            <small>{agency.riskLevel} · {t('max participation gap','gap de participation max')} {agency.maxParticipationGap}/100 · {t('meaningful agency','agence significative')} {agency.firstMeaningfulAgencyTurn?`T${agency.firstMeaningfulAgencyTurn}`:'—'} · {t('material pressure','pression matérielle')} {agency.firstMaterialPressureTurn?`T${agency.firstMaterialPressureTurn}`:'—'}{agency.pressureBeforeAgency?` · ${t('pressure arrives first','la pression arrive avant')}`:''}</small>
          </div>}
          {debt&&<div>
            <span>{t('Top Answer Debt','Dette de réponse principale')} · {pretty(debt.answerClass)}</span>
            <small>{debt.level} · {debt.score}/100{debt.worst?` · T${debt.worst.turn} · ${pretty(debt.worst.threatId)}`:''}</small>
          </div>}
          {shareBacked?<GameObservationForm rows={p.players.map(x=>x.share)} podModelVersion={intel?.modelVersion||'pod-intelligence-v3'} prediction={prediction}/>:<p className="productNote">{t('Reality feedback is disabled for this table because at least one deck is a non-persisted local import. Create versioned Aeon shares first if you want this game included in calibration data.','Le retour Reality est désactivé pour cette table car au moins un deck est un import local non persisté. Crée d’abord des partages Aeon versionnés si tu veux inclure cette partie dans les données de calibration.')}</p>}
        </div>
      })}
      {match.pods.length>1&&repairAudit&&<div className="podWarnings">
        <b>{t('Pod Repair audit','Audit Pod Repair')} · {repairAudit.modelVersion}</b>
        {repairAudit.repairs.length?repairAudit.repairs.map((r,i)=><div key={`${r.tableA}-${r.swap.aId}-${r.tableB}-${r.swap.bId}`}>
          <span>{t('Suggested cross-table swap','Échange inter-table suggéré')} #{i+1}</span>
          <small>{t('Table','Table')} {r.tableA}: {r.swap.aName} ↔ {t('Table','Table')} {r.tableB}: {r.swap.bName} · {r.before.total} → {r.after.total} (−{r.improvement})</small>
        </div>):<div>
          <span>{t('No better one-swap repair found','Aucun meilleur échange simple trouvé')}</span>
          <small>{t(`${repairAudit.evaluatedSwaps} cross-table 1↔1 swaps audited.`,`${repairAudit.evaluatedSwaps} échanges inter-table 1↔1 audités.`)}</small>
        </div>}
      </div>}
      {!!match.unassigned.length&&<p className="productNote">{t(`${match.unassigned.length} player(s) remain unassigned because only complete tables of four are generated.`,`${match.unassigned.length} joueur(s) restent sans table car seules les tables complètes de quatre sont générées.`)}</p>}
      <p className="productNote">{match.optimality==='exact-for-current-objective'?t('This small pool is the exact optimum for the current Aeon Match objective; Pod Repair still audits the remaining one-swap neighborhood as an explicit proof check. Agency is a diagnostic only and does not alter the matching objective.','Ce petit groupe est l’optimum exact pour l’objectif Aeon Match actuel ; Pod Repair audite tout de même le voisinage des échanges simples comme contrôle explicite. Agency est uniquement un diagnostic et ne modifie pas l’objectif de matchmaking.'):t('Large-pool matchmaking is deterministic and locally optimized. Pod Repair audits whether any remaining single cross-table swap improves that local solution. Agency is a diagnostic only and does not alter the matching objective.','Le matchmaking des grands groupes est déterministe et optimisé localement. Pod Repair audite si un échange inter-table simple peut encore améliorer cette solution locale. Agency est uniquement un diagnostic et ne modifie pas l’objectif de matchmaking.')}</p>
    </section>}
  </main>
}
