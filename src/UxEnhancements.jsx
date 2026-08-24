import { useEffect,useMemo,useState } from 'react'
import { createPortal } from 'react-dom'
import { productLabel,packageStrength,visibleTagLabels } from './uxCopy.js'
import { AEON_LABEL,SEMANTIC_VERSION } from './version.js'
import { VALIDATED_CALIBRATION } from './calibrationReference.js'

const language=()=>localStorage.getItem('aeon-lang')==='fr'?'fr':'en'
const t=(en,fr)=>language()==='fr'?fr:en

const REPLACEMENTS_FR=new Map([
  ['Pod Match','Comparer 2–4 decks'],['Aeon Match','Former des tables de 4'],
  ['Dépendance commandant','Impact du commandant'],['Accès commandant médian','Commandant jouable'],['Package opérationnel médian','Moteur actif'],['Couverture des données','Couverture sémantique'],
  ['Consistance','Régularité'],['Interaction accessible','Interaction disponible'],['Options de reprise','Résilience'],['Package opérationnel','Moteur actif'],['Package','Moteur actif'],['Interaction lançable','Interaction disponible'],['Ressource lançable','Développement disponible'],['Burst accessible','Accélération explosive'],['Burst','Accélération explosive'],
  ['Producteurs:','Cartes qui activent :'],['Payoffs:','Cartes qui en profitent :'],['Principaux drivers','Cartes les plus influentes'],['PRINCIPAUX DRIVERS','CARTES LES PLUS INFLUENTES'],['Impact structurel','Influence relative dans ce deck'],
  ['Aeon Experience Intelligence · expérimental','Laboratoire Aeon · diagnostics expérimentaux'],['Horizon Goldfish','Vitesse sans opposition'],['SPOF','Dépendances critiques'],['Stress apparié de suppression des dépendances','Test de résistance des dépendances'],['SOURCE SYNC','SOURCE DU DECK'],
  ['resource Denial','Déni de ressources'],['forced Discard Sacrifice','Défausse / sacrifice forcés'],['lock Potential','Potentiel de verrouillage'],['long Sequencing','Tours longs / complexes'],['exile Interaction','Sensible à l’exil'],['enchantment Suppression','Sensible aux anti-enchantements'],['graveyard Hate','Sensible à la hate cimetière'],['turn Complexity','Complexité des tours'],
  ['low','Faible'],['moderate','Modéré'],['high','Élevé'],['very high','Très élevé'],['very-high','Très élevé'],
  ['cumulative-first-access','Premier accès fiable'],['semantic-proxy+paired-suppression-evidence','Preuves sémantiques + test de résistance'],
  ['Partager la carte Rule 0','Partager ce deck'],['Comparer le pod','Évaluer ces decks'],['Compare in Pod Match','Comparer 2–4 decks'],['Comparer dans Pod Match','Comparer 2–4 decks'],
  ['Aeon Pod Intelligence','Diagnostic avancé de la table'],['Mismatch multi-axes','Écart global de profils'],['Diagnostic Agency','Capacité à participer'],['Dette de réponse principale','Faiblesse de réponse principale'],['Answer Debt','Manque de réponses'],
])
const REPLACEMENTS_EN=new Map([
  ['Pod Match','Compare 2–4 decks'],['Aeon Match','Build tables of 4'],['Commander dependency','Commander impact'],['Median commander access','Commander castable'],['Median operational package','Engine online'],['Data coverage','Semantic coverage'],['Consistency','Output regularity'],['Accessible interaction','Available interaction'],['Recovery options','Resilience'],['Operational package','Engine online'],['Package','Engine online'],['Castable interaction','Available interaction'],['Castable resource','Available development'],['Accessible burst','Explosive acceleration'],['Burst','Explosive acceleration'],['Producers:','Enablers:'],['Payoffs:','Beneficiaries:'],['Main drivers','Most influential cards'],['MAIN DRIVERS','MOST INFLUENTIAL CARDS'],['Structural impact','Relative influence in this deck'],['Aeon Experience Intelligence · experimental','Aeon Lab · experimental diagnostics'],['Goldfish Horizon','Unopposed speed'],['SPOF','Critical dependencies'],['Paired dependency suppression stress','Dependency stress test'],['SOURCE SYNC','DECK SOURCE'],['Compare in Pod Match','Compare 2–4 decks'],['Compare pod','Evaluate these decks'],['Share Rule 0 card','Share this deck'],['Aeon Pod Intelligence','Advanced table diagnostic'],['Multi-axis mismatch','Overall profile gap'],['Agency diagnostic','Participation capacity'],['Top Answer Debt','Main response weakness'],['Answer Debt','Response gap'],['cumulative-first-access','First reliable access'],['semantic-proxy+paired-suppression-evidence','Semantic evidence + stress test'],
])

function applyValidatedReferences(){
  const pre=VALIDATED_CALIBRATION.preconMedian,cedh=VALIDATED_CALIBRATION.cedhMedian
  const preTick=document.querySelector('.preconTick');if(preTick){preTick.style.left=`${pre}%`;const label=preTick.querySelector('em');if(label)label.textContent=language()==='fr'?`Précon calibration ${pre}`:`Precon calibration ${pre}`}
  const cedhTick=document.querySelector('.cedhTick');if(cedhTick){cedhTick.style.left=`${cedh}%`;const label=cedhTick.querySelector('em');if(label)label.textContent=`cEDH ${cedh}`}
  document.querySelectorAll('.heroProof span').forEach(el=>{const text=String(el.textContent||'');if(/38 calibration decks|38 decks de calibration|39 calibration decks|39 decks de calibration/i.test(text))el.textContent=language()==='fr'?`${VALIDATED_CALIBRATION.benchmarkDecks} decks dans la cohorte de validation`:`${VALIDATED_CALIBRATION.benchmarkDecks} decks in the validation cohort`})
  document.querySelectorAll('.rangeLegend span').forEach(el=>{const text=String(el.textContent||'');if(/repères précon\/cEDH|Precon\/cEDH markers/i.test(text))el.textContent=language()==='fr'?`Repères de validation actuels : précon ${pre}, cEDH ${cedh}. Ce sont des médianes de cohorte, pas des seuils.`:`Current validation references: precon ${pre}, cEDH ${cedh}. These are cohort medians, not thresholds.`})
}
function applyPublicDiagnosticCopy(){
  const lang=language()
  document.querySelectorAll('.publicDriver strong').forEach(el=>{const x=String(el.textContent||'').trim();if(/^\d+(?:\.\d+)?$/.test(x))el.textContent=lang==='fr'?`indice ${x}`:`index ${x}`})
  document.querySelectorAll('.publicDriver small').forEach(el=>{if(el.dataset.aeonFriendly==='1')return;const raw=String(el.textContent||'').split(' · ').map(x=>x.trim()).filter(Boolean);el.textContent=visibleTagLabels(raw,lang,6).join(' · ')||String(el.textContent||'');el.dataset.aeonFriendly='1'})
  document.querySelectorAll('.publicPackage>div span').forEach(el=>{const x=String(el.textContent||'').trim(),m=x.match(/^(?:cohésion|cohesion)\s+(\d+(?:\.\d+)?)\/100$/i);if(m){const qualitative=packageStrength(Number(m[1]),lang);el.textContent=lang==='fr'?`Synergie ${qualitative.toLowerCase()} · indice ${m[1]}/100`:`${qualitative} synergy · index ${m[1]}/100`}})
}
function replaceExactText(root=document.body){
  if(!root)return
  const map=language()==='fr'?REPLACEMENTS_FR:REPLACEMENTS_EN
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT)
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode)
  for(const node of nodes){const raw=node.nodeValue||'',trimmed=raw.trim(),replacement=map.get(trimmed);if(!replacement||trimmed===replacement)continue;const lead=raw.match(/^\s*/)?.[0]||'',tail=raw.match(/\s*$/)?.[0]||'';node.nodeValue=`${lead}${replacement}${tail}`}
  document.querySelectorAll('.driver strong').forEach(el=>{const x=String(el.textContent||'').trim();if(/^\d+(?:\.\d+)?$/.test(x))el.textContent=language()==='fr'?`indice ${x}`:`index ${x}`})
  document.querySelectorAll('.pkg>div span').forEach(el=>{const x=String(el.textContent||'').trim(),m=x.match(/^(?:cohésion|cohesion)\s+(\d+(?:\.\d+)?)\/100$/i);if(m){const qualitative=packageStrength(Number(m[1]),language());el.textContent=language()==='fr'?`Synergie ${qualitative.toLowerCase()} · indice ${m[1]}/100`:`${qualitative} synergy · index ${m[1]}/100`}})
  document.querySelectorAll('.aeonLab .intelligencePanel[open]').forEach(el=>el.removeAttribute('open'))
  const overview=document.querySelector('.diagOverview');if(overview&&!overview.querySelector('.uxMetricClarifier')){const note=document.createElement('p');note.className='note uxMetricClarifier';note.textContent=language()==='fr'?'« Impact du commandant » est le delta structurel estimé avec/sans commandant. « Résilience » agrège plusieurs signaux ; le pourcentage T5 ci-dessous mesure seulement l’accès à une option de reprise après le checkpoint T4.':'“Commander impact” is the estimated structural delta with/without the commander. “Resilience” aggregates several signals; the T5 percentage below only measures access to one recovery option after the T4 checkpoint.';overview.appendChild(note)}
  const firstDriver=document.querySelector('.driver');if(firstDriver&&firstDriver.parentElement&&!firstDriver.parentElement.querySelector('.uxDriverClarifier')){const note=document.createElement('p');note.className='note uxDriverClarifier';note.textContent=language()==='fr'?'L’indice d’influence classe les cartes entre elles dans ce deck. Ce n’est pas un nombre de points ajouté au score et il ne doit pas être comparé directement entre deux decks.':'The influence index ranks cards inside this deck. It is not a number of points added to the score and should not be compared directly across decks.';firstDriver.parentElement.insertBefore(note,firstDriver)}
  const footer=document.querySelector('.footerInner>small');if(footer)footer.textContent=language()==='fr'?`Aeon Scorer ${AEON_LABEL} · modèle sémantique ${SEMANTIC_VERSION} · les identifiants techniques restent dans le Laboratoire Aeon.`:`Aeon Scorer ${AEON_LABEL} · semantic model ${SEMANTIC_VERSION} · technical model identifiers stay in Aeon Lab.`
  applyValidatedReferences();applyPublicDiagnosticCopy()
}

export function FriendlyCopyObserver(){
  useEffect(()=>{let queued=false;const run=()=>{queued=false;replaceExactText()};run();const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(run)}});observer.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>observer.disconnect()},[])
  return null
}

export function usePortalTarget(selector,{className='',placement='append'}={}){
  const[target,setTarget]=useState(null)
  useEffect(()=>{let dead=false,observer=null
    const attach=()=>{if(dead)return true;const anchor=document.querySelector(selector);if(!anchor)return false;let host=anchor.parentElement?.querySelector(`:scope > [data-aeon-ux-host="${className||selector}"]`);if(!host){host=document.createElement('div');host.dataset.aeonUxHost=className||selector;if(className)host.className=className;if(placement==='after')anchor.insertAdjacentElement('afterend',host);else if(placement==='before')anchor.insertAdjacentElement('beforebegin',host);else anchor.appendChild(host)}setTarget(host);return true}
    if(!attach()){observer=new MutationObserver(()=>{if(attach())observer?.disconnect()});observer.observe(document.body,{subtree:true,childList:true})}
    return()=>{dead=true;observer?.disconnect();setTarget(null)}
  },[selector,className,placement])
  return target
}

export function WorkflowNav(){
  const[target,setTarget]=useState(null)
  useEffect(()=>{const find=()=>setTarget(document.querySelector('.navLinks'));find();const o=new MutationObserver(find);o.observe(document.body,{subtree:true,childList:true});return()=>o.disconnect()},[])
  if(!target)return null
  const lang=language()
  return createPortal(<span className="uxWorkflowNav" aria-label={t('Deck and table tools','Decks et outils de table')}><a href="/decklists-publiques">{lang==='fr'?'Préconstruits':'Precons'}</a><a href="/pod">{lang==='fr'?'Comparer':'Compare'}</a><a href="/match">{lang==='fr'?'Tables de 4':'Tables of 4'}</a><a href="/tournoi">{lang==='fr'?'Tournoi':'Tournament'}</a></span>,target)
}

export function ResultActionBar({analysisReady=false,shareBusy=false,shareUrl='',onShare,onCompare,onTables,onTournament}){
  const lang=language(),target=usePortalTarget('.scoreSummary',{className:'resultWorkflowHost',placement:'after'}),[notice,setNotice]=useState('')
  const actions=useMemo(()=>({
    share:async()=>{setNotice('');try{const url=await onShare?.();if(url)setNotice(t('Share link copied.','Lien de partage copié.'))}catch(e){setNotice(e.message||String(e))}},
    compare:async()=>{setNotice('');try{await onCompare?.()}catch(e){setNotice(e.message||String(e))}},
    tables:async()=>{setNotice('');try{await onTables?.()}catch(e){setNotice(e.message||String(e))}},
    tournament:async()=>{setNotice('');try{await onTournament?.()}catch(e){setNotice(e.message||String(e))}},
  }),[onShare,onCompare,onTables,onTournament])
  if(!target)return null
  return createPortal(<section className="resultWorkflowBar" aria-label={t('Next actions','Actions principales')}>
    <div className="resultWorkflowCopy"><span>{t('USE THIS RESULT','UTILISER CE RÉSULTAT')}</span><b>{t('Compare it before the game.','Compare-le avant la partie.')}</b><small>{t('Sharing creates a versioned snapshot. Comparison and table formation use that exact snapshot, so the result cannot silently change underneath the group.','Le partage crée un snapshot versionné. La comparaison et la formation de tables utilisent exactement ce résultat : il ne peut pas changer silencieusement sous les joueurs.')}</small></div>
    <div className="resultWorkflowActions"><button className="uxPrimaryAction" onClick={actions.compare} disabled={!analysisReady||shareBusy}>{shareBusy?t('Preparing…','Préparation…'):productLabel('compare',lang)}</button><button onClick={actions.share} disabled={!analysisReady||shareBusy}>{shareUrl?t('Copy share link','Copier le lien'):productLabel('share',lang)}</button><button onClick={actions.tables} disabled={!analysisReady||shareBusy}>{productLabel('tables',lang)}</button><button onClick={actions.tournament} disabled={!analysisReady||shareBusy}>{productLabel('tournament',lang)}</button></div>
    {!analysisReady&&<p>{t('The analysis is being versioned; these actions unlock in a moment.','L’analyse est en cours de versionnage ; ces actions se débloquent dans un instant.')}</p>}{notice&&<p>{notice}</p>}
  </section>,target)
}
