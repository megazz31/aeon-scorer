import { useEffect,useMemo,useState } from 'react'
import Rule0Tools from './Rule0Tools.jsx'
import { deckDiff } from './productData.js'
import './product.css'

const currentInput=()=>({decklist:document.getElementById('decklist')?.value||'',commander:document.getElementById('commander')?.value||''})
const nativeSet=(el,value)=>{if(!el)return;const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')?.set?.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
const language=()=>localStorage.getItem('aeon-lang')==='fr'?'fr':'en'
const t=(en,fr)=>language()==='fr'?fr:en

function SourceSync({source,onSource}){
  const[fresh,setFresh]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const current=currentInput(),diff=useMemo(()=>fresh?deckDiff(current.decklist,fresh.decklist):null,[fresh,current.decklist])
  if(!source?.sourceUrl)return null
  async function refresh(){setBusy(true);setError('');setFresh(null);try{const r=await fetch('/api/import-deck',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:source.sourceUrl})}),x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(x.error||t('Source refresh failed.','Échec de l’actualisation de la source.'));setFresh(x)}catch(e){setError(e.message||String(e))}finally{setBusy(false)}}
  function load(){if(!fresh)return;nativeSet(document.getElementById('decklist'),fresh.decklist||'');nativeSet(document.getElementById('commander'),fresh.commanderName||'');onSource?.(fresh);window.dispatchEvent(new CustomEvent('aeon-deck-imported',{detail:fresh}));window.scrollTo({top:document.querySelector('.analyzerCard')?.offsetTop||0,behavior:'smooth'})}
  return <section className="rule0Tools sourceSync"><div className="rule0ToolsHead"><div><span className="sectionEyebrow">SOURCE SYNC</span><h3>{source.source==='moxfield'?'Moxfield':'Archidekt'}</h3></div><a href={source.sourceUrl} target="_blank" rel="noreferrer">↗</a></div><p className="productNote">{t('Check whether the source list changed, review the card diff, then load it without losing the current analysis snapshot.','Vérifie si la liste source a changé, regarde le diff, puis charge-la sans perdre le snapshot d’analyse actuel.')}</p><button className="productPrimary" onClick={refresh} disabled={busy}>{busy?t('Checking…','Vérification…'):t('Check source for changes','Vérifier les changements')}</button>{error&&<div className="productError">{error}</div>}{fresh&&<>{diff?.changes?<><div className="deckDiff"><div><b>+ {t('Upstream added','Ajouté en source')}</b><ul>{diff.added.slice(0,14).map(x=><li key={x.name}>{x.qty} {x.name}</li>)}</ul></div><div><b>− {t('Upstream removed','Retiré en source')}</b><ul>{diff.removed.slice(0,14).map(x=><li key={x.name}>{x.qty} {x.name}</li>)}</ul></div></div><button className="productPrimary" onClick={load}>{t('Load refreshed version','Charger la nouvelle version')}</button></>:<div className="deckImportNotice">✓ {t('Source and current editor match.','La source et l’éditeur actuel correspondent.')}</div>}</>}</section>
}

export default function ProductWorkspace({children}){
  const[analysis,setAnalysis]=useState(null),[analysisId,setAnalysisId]=useState(null),[source,setSource]=useState(null),[langTick,setLangTick]=useState(0)
  useEffect(()=>{
    const computed=e=>{const input=currentInput();setAnalysis({...e.detail,decklist:input.decklist,commanderNames:[e.detail?.commander?.name||input.commander].filter(Boolean)});setAnalysisId(null)}
    const recorded=e=>{const out=e.detail||{},id=out?.analysis?.id||out?.id||null;if(id)setAnalysisId(id)}
    const imported=e=>setSource(e.detail||null)
    const storage=e=>{if(e.key==='aeon-lang')setLangTick(x=>x+1)}
    window.addEventListener('aeon-analysis-computed',computed);window.addEventListener('aeon-analysis-recorded',recorded);window.addEventListener('aeon-deck-imported',imported);window.addEventListener('storage',storage)
    return()=>{window.removeEventListener('aeon-analysis-computed',computed);window.removeEventListener('aeon-analysis-recorded',recorded);window.removeEventListener('aeon-deck-imported',imported);window.removeEventListener('storage',storage)}
  },[])
  const lang=useMemo(()=>{langTick;return language()},[langTick])
  return <>{children}{analysis?.result&&<div className="productWorkspaceTools"><Rule0Tools lang={lang} analysisId={analysisId} result={analysis.result} cards={[...(analysis.cards||[]),analysis.commander].filter(Boolean)} decklist={analysis.decklist} commanderNames={analysis.commanderNames}/><SourceSync source={source} onSource={setSource}/></div>}</>
}
