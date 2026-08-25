import { useEffect,useMemo,useState } from 'react'
import { createPortal } from 'react-dom'
import { parseDecklist,fetchCards,fetchCard } from './scryfall.js'
import { analyzePower } from './engine/powerModel.js'
import { cardFeatures,featureDeck } from './engine/cardFeatures.js'
import { combinedColorIdentity,validateCommanderPair } from './engine/commanderPair.js'
import { ENGINE_VERSION,SEMANTIC_VERSION } from './version.js'
import { hashDeck,recordAnalysis,restoreSession } from './supabaseClient.js'

const language=()=>localStorage.getItem('aeon-lang')==='fr'?'fr':'en'
const t=(en,fr)=>language()==='fr'?fr:en
const currentInput=()=>({decklist:document.getElementById('decklist')?.value||'',commander:document.getElementById('commander')?.value||'',iterations:Number(document.getElementById('iterations')?.value||3000)})
const norm=s=>String(s||'').trim().toLowerCase()

function evidence(cards,commanders){const uniq=new Map();for(const c of [...featureDeck(cards),...commanders.map(cardFeatures)]){const id=c.oracleId||c.id||c.name;if(!uniq.has(id))uniq.set(id,{oracleId:c.oracleId||c.id,scryfallId:c.scryfallId||c.id||null,name:c.name,oracle:c.oracle||'',type:c.type||'',tags:c.tags||[]})}return [...uniq.values()]}

function Panel({source}){
  const[second,setSecond]=useState(source?.commanderNames?.[1]||''),[status,setStatus]=useState(''),[error,setError]=useState(''),[pairKind,setPairKind]=useState(''),[result,setResult]=useState(null)
  useEffect(()=>{if(source?.commanderNames?.[1])setSecond(source.commanderNames[1]);else if(source?.commanderNames?.length===1)setSecond('')},[source?.commanderNames?.join('|')])
  useEffect(()=>{
    const onImport=e=>{
      if(e.detail?.commanderNames?.length>1)setSecond(e.detail.commanderNames[1]||'')
      else if(e.detail?.commanderNames?.length===1)setSecond('')
    }
    window.addEventListener('aeon-deck-imported',onImport)
    return()=>window.removeEventListener('aeon-deck-imported',onImport)
  },[])
  async function analyzePair(){
    const input=currentInput();setStatus(t('Resolving command zone…','Résolution de la command zone…'));setError('');setResult(null);setPairKind('')
    try{
      if(!input.commander||!second.trim())throw new Error(t('Enter both commanders.','Renseigne les deux commandants.'))
      const [a,b]=await Promise.all([fetchCard(input.commander),fetchCard(second.trim())]);if(!a||!b)throw new Error(t('One commander could not be resolved on Scryfall.','Un des commandants est introuvable sur Scryfall.'))
      const legal=validateCommanderPair(a,b);if(!legal.ok)throw new Error(t(legal.reason,'Cette paire ne présente pas une capacité de double commandant prise en charge.'))
      setPairKind(legal.kind)
      const parsed=parseDecklist(input.decklist),total=parsed.reduce((s,x)=>s+x.qty,0);if(total<98||total>100)throw new Error(t(`The pasted list has ${total} cards. A two-commander deck needs 98 library cards, or up to 100 lines when commanders are included in the paste.`,`La liste collée contient ${total} cartes. Un deck à deux commandants doit laisser 98 cartes en bibliothèque, ou jusqu’à 100 si les commandants sont inclus dans le collage.`))
      setStatus('Scryfall…');const fetched=await fetchCards(parsed);if(fetched.length!==total)throw new Error(t('Some cards could not be resolved.','Certaines cartes n’ont pas été résolues.'))
      const cmdNames=new Set([norm(a.name),norm(b.name)]),main=fetched.filter(c=>!cmdNames.has(norm(c.name)))
      if(main.length!==98)throw new Error(t(`After removing the two commanders, Aeon finds ${main.length} library cards instead of 98.`,`Après retrait des deux commandants, Aeon trouve ${main.length} cartes en bibliothèque au lieu de 98.`))
      const allowed=new Set(combinedColorIdentity([a,b])),offColor=main.filter(c=>(c.colorIdentity||[]).some(x=>!allowed.has(x)))
      if(offColor.length)throw new Error(t(`Combined color identity mismatch: ${[...new Set(offColor.map(c=>c.name))].slice(0,6).join(', ')}${offColor.length>6?'…':''}`,`Identité couleur combinée incompatible : ${[...new Set(offColor.map(c=>c.name))].slice(0,6).join(', ')}${offColor.length>6?'…':''}`))
      setStatus(t(`Simulating ${input.iterations.toLocaleString('en-US')} sequences…`,`Simulation de ${input.iterations.toLocaleString('fr-FR')} séquences…`));await new Promise(r=>setTimeout(r,20))
      const out=analyzePower(fetched,[a,b],null,input.iterations,{record:true,emitProduct:true});setResult(out)
      setStatus('')
    }catch(e){setStatus('');setError(e.message||String(e))}
  }
  return <div className="multiCommanderBox"><div className="multiCommanderTitle"><span>{t('OPTIONAL SECOND COMMANDER','DEUXIÈME COMMANDANT OPTIONNEL')}</span>{pairKind&&<b>{pairKind}</b>}</div><input id="commander2" value={second} onChange={e=>setSecond(e.target.value)} placeholder={t('Background, Partner, Companion…','Background, Partner, Compagnon…')}/><small>{t('Partner · Partner with · Friends forever · Choose a Background · Doctor’s companion. Combined color identity, separate command-zone access and separate commander tax.','Partner · Partner with · Friends forever · Choose a Background · Compagnon du Docteur. Identité couleur combinée, accès séparé à la command zone et taxe de commandant séparée.')}</small><button type="button" className="multiCommanderAction" onClick={analyzePair} disabled={!!status||!second.trim()}>{status||t('Analyze two commanders','Analyser les deux commandants')}</button>{error&&<div className="deckImportError">{error}</div>}{result&&<div className="multiCommanderResult"><strong>{result.profile.median}</strong><span>P20 {result.profile.floor} · P80 {result.profile.ceiling} · {t('peak','pic')} {result.profile.peak}</span><small>{Object.entries(result.simulation.commanderMedianTurns||{}).map(([n,v])=>`${n}: ${v?`T${v}`:'n/a'}`).join(' · ')}</small></div>}</div>
}

export default function MultiCommanderControls({source}){
  const[target,setTarget]=useState(null)
  useEffect(()=>{let tries=0;const find=()=>{const el=document.querySelector('.configPanel');if(el){setTarget(el);const old=document.querySelector('#commander')?.closest('.field')?.querySelector('small');if(old)old.dataset.aeonOldDisplay=old.style.display,old.style.display='none';return}if(tries++<30)setTimeout(find,100)};find();return()=>{const old=document.querySelector('#commander')?.closest('.field')?.querySelector('small');if(old){old.style.display=old.dataset.aeonOldDisplay||'';delete old.dataset.aeonOldDisplay}}},[])
  return target?createPortal(<Panel source={source}/>,target):null
}
