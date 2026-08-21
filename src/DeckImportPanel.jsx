import { useState } from 'react'
import './deckImport.css'

const t=(lang,en,fr)=>lang==='fr'?fr:en

export default function DeckImportPanel({lang='en',onImported}){
  const[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('')
  const L=(en,fr)=>t(lang,en,fr)

  async function submit(ev){
    ev?.preventDefault?.()
    if(!url.trim()||busy)return
    setBusy(true);setNotice('');setError('')
    try{
      const response=await fetch('/api/import-deck',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.trim()})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(data.error||L('Unable to import this deck.','Impossible d’importer ce deck.'))
      if(!data.commanderName||!data.decklist)throw new Error(L('The imported deck is missing a commander or main deck.','Le deck importé ne contient pas de commandant ou de deck principal exploitable.'))
      onImported?.(data)
      if(typeof window!=='undefined'&&typeof CustomEvent!=='undefined')window.dispatchEvent(new CustomEvent('aeon-deck-imported',{detail:data}))
      const source=data.source==='moxfield'?'Moxfield':'Archidekt'
      setNotice(L(`${source} imported · ${data.cardCount} main-deck cards · ${data.commanderName}`,`${source} importé · ${data.cardCount} cartes dans le deck · ${data.commanderName}`))
    }catch(e){setError(e.message||String(e))}
    finally{setBusy(false)}
  }

  return <section className="deckUrlImport" aria-labelledby="deck-url-import-label">
    <div className="deckUrlImportHead"><div><span className="sectionEyebrow">{L('QUICK IMPORT','IMPORT RAPIDE')}</span><label id="deck-url-import-label" htmlFor="deck-url">{L('Moxfield or Archidekt link','Lien Moxfield ou Archidekt')}</label></div><span>{L('Public decks','Decks publics')}</span></div>
    <form className="deckUrlImportRow" onSubmit={submit}>
      <input id="deck-url" type="url" inputMode="url" autoComplete="off" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.moxfield.com/decks/…  ·  https://archidekt.com/decks/…"/>
      <button type="submit" disabled={busy||!url.trim()}>{busy?L('Importing…','Import…'):L('Import deck','Importer')}</button>
    </form>
    <p>{L('Aeon fills the commander and decklist below. You can still edit either field manually before analyzing. Public single-commander decks only for now.','Aeon remplit le commandant et la decklist ci-dessous. Tu peux toujours modifier manuellement les deux champs avant l’analyse. Decks publics à un seul commandant pour le moment.')}</p>
    {notice&&<div className="deckImportNotice" role="status">✓ {notice}</div>}
    {error&&<div className="deckImportError" role="alert">{error}</div>}
  </section>
}
