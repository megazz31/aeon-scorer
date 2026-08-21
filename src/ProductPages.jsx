import { useEffect,useMemo,useState } from 'react'
import { loadAnalysisShare } from './supabaseClient.js'
import { normalizedShare,podSummary } from './productData.js'
import './product.css'

const lang=()=>localStorage.getItem('aeon-lang')==='fr'?'fr':'en'
const t=(en,fr)=>lang()==='fr'?fr:en
const shareCode=input=>String(input||'').trim().match(/(?:\/a\/)?([a-f0-9]{12})(?:\b|\/|$)/i)?.[1]?.toLowerCase()||''
function Range({d}){const left=Math.max(0,Math.min(100,d.p20)),right=Math.max(left,Math.min(100,d.p80)),mid=Math.max(0,Math.min(100,d.median)),peak=Math.max(0,Math.min(100,d.peak));return <div className="podRange"><i style={{left:`${left}%`,width:`${Math.max(1,right-left)}%`}}/><b style={{left:`${mid}%`}}/><em style={{left:`${peak}%`}}/></div>}
export function Rule0Card({share,compact=false}){const d=normalizedShare(share),signals=d.bracketSignals||{},cmd=d.commanderNames.join(' + ')||d.deckName;return <article className={`rule0Card${compact?' compact':''}`}>
  <div className="rule0Head"><div><span>AEON RULE 0</span><h1>{d.deckName}</h1><p>{cmd}</p></div><strong>{d.median}</strong></div>
  <div className="rule0Numbers"><span><b>{d.p20}</b><small>P20</small></span><span><b>{d.median}</b><small>{t('Median','Médiane')}</small></span><span><b>{d.p80}</b><small>P80</small></span><span><b>{d.peak}</b><small>{t('Peak','Pic')}</small></span></div>
  <Range d={d}/>
  <div className="rule0Signals"><span>{d.gameChangers.length} Game Changer{d.gameChangers.length===1?'':'s'}</span>{signals.spellbookBracket&&<span>Spellbook · {signals.spellbookBracket}</span>}{Number(signals.twoCardCombos)>0&&<span>{signals.twoCardCombos} {t('two-card combo(s)','combo(s) 2 cartes')}</span>}</div>
  {!!d.gameChangers.length&&<small className="rule0Gc">{d.gameChangers.join(' · ')}</small>}
  <footer>Aeon {d.engineVersion} · {d.semanticVersion} · {d.iterations.toLocaleString()} {t('sequences','séquences')}</footer>
</article>}

export function SharedAnalysisPage(){const code=shareCode(location.pathname),[row,setRow]=useState(null),[error,setError]=useState('');useEffect(()=>{loadAnalysisShare(code).then(x=>x?setRow(x):setError(t('Share not found or revoked.','Partage introuvable ou révoqué.'))).catch(e=>setError(e.message||String(e)))},[code]);return <main className="productPage"><a className="productBack" href="/">← Aeon Scorer</a>{error&&<div className="productError">{error}</div>}{row&&<><Rule0Card share={row}/><div className="productActions"><button onClick={()=>navigator.clipboard?.writeText(location.href)}>{t('Copy share link','Copier le lien')}</button><a href={`/pod?d=${code}`}>{t('Compare in Pod Match','Comparer dans Pod Match')}</a></div><p className="productNote">{t('This is a versioned Aeon snapshot for pre-game discussion, not an official Commander bracket or win-rate prediction.','Ceci est un snapshot Aeon versionné pour la discussion pré-game, pas un bracket Commander officiel ni une prédiction de win rate.')}</p></>}</main>}

const asymmetryLabel=code=>({
  'high-peak-asymmetry':t('High peak asymmetry','Forte asymétrie de pic'),
  'high-dispersion-asymmetry':t('Different variance profile','Dispersion très différente'),
  'high-explosiveness-asymmetry':t('Explosiveness gap','Écart d’explosivité'),
  'high-speed-asymmetry':t('Speed gap','Écart de vitesse'),
  'high-consistency-asymmetry':t('Consistency gap','Écart de consistance'),
}[code]||code)

export function PodMatchPage(){
  const initial=useMemo(()=>{const qs=new URLSearchParams(location.search),first=qs.get('d')||'';return [first,'','','']},[]),[inputs,setInputs]=useState(initial),[rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  async function compare(){setBusy(true);setError('');try{const codes=[...new Set(inputs.map(shareCode).filter(Boolean))].slice(0,4);if(codes.length<2)throw new Error(t('Add at least two Aeon share links/codes.','Ajoute au moins deux liens/codes de partage Aeon.'));const loaded=await Promise.all(codes.map(loadAnalysisShare));if(loaded.some(x=>!x))throw new Error(t('One share could not be loaded.','Un partage n’a pas pu être chargé.'));setRows(loaded)}catch(e){setError(e.message||String(e))}finally{setBusy(false)}}
  const summary=useMemo(()=>podSummary(rows),[rows]),label={close:t('Very close normal ranges','Plages habituelles très proches'),playable:t('Playable normal-range spread','Écart de plages jouable'),mismatch:t('Range mismatch to discuss','Écart de plages à discuter'),'need-more':t('Add decks','Ajoute des decks')}[summary.fit]
  return <main className="productPage wide"><a className="productBack" href="/">← Aeon Scorer</a><header className="productHero"><span>AEON POD MATCH · EXPERIMENTAL</span><h1>{t('Compare the table, not just one number.','Compare la table, pas seulement un chiffre.')}</h1><p>{t('Paste 2–4 Aeon share links. Range fit compares median and P20–P80 overlap; Aeon reports peak, dispersion and dimension asymmetries separately instead of hiding them in one score.','Colle 2 à 4 liens de partage Aeon. Le range fit compare médiane et recouvrement P20–P80 ; Aeon signale séparément les asymétries de pic, dispersion et dimensions au lieu de les cacher dans un score unique.')}</p></header>
  <div className="podInputs">{inputs.map((v,i)=><input key={i} value={v} onChange={e=>setInputs(xs=>xs.map((x,j)=>j===i?e.target.value:x))} placeholder={`Deck ${i+1} · https://…/a/…`}/>)}</div><button className="productPrimary" onClick={compare} disabled={busy}>{busy?t('Loading…','Chargement…'):t('Compare pod','Comparer le pod')}</button>{error&&<div className="productError">{error}</div>}
  {rows.length>1&&<section className="podResults"><div className={`podVerdict ${summary.fit}`}><b>{label}</b><span>{t(`Median spread ${summary.medianSpread} · peak spread ${summary.peakSpread}`,`Écart médiane ${summary.medianSpread} · écart pic ${summary.peakSpread}`)}</span></div>{summary.decks.map((d,i)=><div className="podDeck" key={d.code||i}><div><b>{d.deckName}</b><small>{d.commanderNames.join(' + ')}</small></div><strong>{d.median}</strong><span>{d.p20}–{d.p80}</span><span>{t('peak','pic')} {d.peak}</span><Range d={d}/></div>)}
  {!!summary.warnings.length&&<div className="podWarnings"><b>{t('Aeon asymmetry flags','Alertes d’asymétrie Aeon')}</b>{summary.warnings.map((w,i)=><div key={w.key||i}><span>{asymmetryLabel(w.code)}</span><small>{summary.decks[w.a]?.deckName} ↔ {summary.decks[w.b]?.deckName} · Δ {w.gap}</small></div>)}</div>}
  <p className="productNote">{summary.fit==='mismatch'?t('At least one pair has a large median gap or little overlap in its normal output bands. Discuss intent, combos and the asymmetry flags before starting.','Au moins une paire présente un gros écart de médiane ou peu de recouvrement des sorties habituelles. Discutez intention, combos et alertes d’asymétrie avant de lancer la partie.'):summary.warnings.length?t('Normal ranges overlap, but at least one deck has a materially different peak, variance or dimension profile. Treat this as a Rule 0 warning, not an automatic mismatch.','Les plages habituelles se recouvrent, mais au moins un deck présente un profil de pic, variance ou dimension sensiblement différent. C’est une alerte Rule 0, pas un mismatch automatique.'):t('The normal output bands overlap reasonably well and no major Aeon asymmetry flag fired. Pilot skill, matchup and politics still matter.','Les plages de sorties habituelles se recouvrent raisonnablement et aucune grosse asymétrie Aeon n’est détectée. Pilotage, matchup et politique restent importants.')}</p></section>}
  </main>}
