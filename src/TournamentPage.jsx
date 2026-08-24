import { useMemo,useState } from 'react'
import { loadAnalysisShare } from './supabaseClient.js'
import { normalizedShare } from './productData.js'
import { initialGroups,roundMatchCounts } from './engine/tournamentBracket.js'
import { productLabel } from './uxCopy.js'
import './product.css'

const language=()=>localStorage.getItem('aeon-lang')==='fr'?'fr':'en'
const t=(en,fr)=>language()==='fr'?fr:en
const codeOf=input=>String(input||'').trim().match(/(?:\/a\/)?([a-f0-9]{12})(?:\b|\/|$)/i)?.[1]?.toLowerCase()||''
const keyOf=(r,m)=>`${r}:${m}`
function shuffle(xs){const out=[...xs];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function automaticWinner(players=[]){const real=players.filter(Boolean);return real.length===1?real[0]:null}
function resolveWinner(players,winners,key){const explicit=winners[key];if(explicit&&players.some(p=>p?.id===explicit.id))return explicit;return automaticWinner(players)}
function buildRounds(entries,groupSize,winners){
  const counts=roundMatchCounts(entries.length,groupSize),rounds=[]
  rounds[0]=initialGroups(entries,groupSize).map((players,m)=>({players,winner:resolveWinner(players,winners,keyOf(0,m))}))
  for(let r=1;r<counts.length;r++){
    rounds[r]=Array.from({length:counts[r]},(_,m)=>{
      const players=[]
      for(let i=0;i<groupSize;i++){const prev=rounds[r-1][m*groupSize+i];players.push(prev?.winner||null)}
      return {players,winner:resolveWinner(players,winners,keyOf(r,m))}
    })
  }
  return rounds
}
function roundTitle(index,total,groupSize){if(index===total-1)return t('Final','Finale');if(index===total-2)return t('Semifinal','Demi-finale');if(index===0)return groupSize===4?t('Qualifying tables','Tables qualificatives'):t('Round 1','Tour 1');return t(`Round ${index+1}`,`Tour ${index+1}`)}

export default function TournamentPage(){
  const lang=language(),seed=codeOf(new URLSearchParams(location.search).get('d')||''),[text,setText]=useState(()=>seed?`${location.origin}/a/${seed}`:''),[entries,setEntries]=useState([]),[groupSize,setGroupSize]=useState(4),[winners,setWinners]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const rounds=useMemo(()=>entries.length>=2?buildRounds(entries,groupSize,winners):[],[entries,groupSize,winners]),champion=rounds.at(-1)?.[0]?.winner||null
  async function load(){setBusy(true);setError('');setNotice('');try{
    const raw=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,64)
    if(raw.length<2)throw new Error(t('Add at least two participants or Aeon share links.','Ajoute au moins deux participants ou liens de partage Aeon.'))
    const loaded=[]
    for(let i=0;i<raw.length;i++){
      const code=codeOf(raw[i])
      if(code){const row=await loadAnalysisShare(code);if(!row)throw new Error(t(`Share ${code} could not be loaded.`,`Le partage ${code} n’a pas pu être chargé.`));const d=normalizedShare(row);loaded.push({id:`share:${code}`,label:d.deckName,sub:d.commanderNames.join(' + '),code})}
      else loaded.push({id:`name:${i}:${raw[i]}`,label:raw[i],sub:''})
    }
    setEntries(loaded);setWinners({});setNotice(t(`${loaded.length} participants loaded. Click a name in each match/table to advance it.`,`${loaded.length} participants chargés. Clique sur un nom dans chaque match/table pour le qualifier.`))
  }catch(e){setError(e.message||String(e))}finally{setBusy(false)}}
  function choose(roundIndex,matchIndex,player){if(!player)return;setWinners(prev=>{const next={};for(const [k,v] of Object.entries(prev)){const r=Number(k.split(':')[0]);if(r<=roundIndex)next[k]=v}next[keyOf(roundIndex,matchIndex)]=player;return next})}
  function randomize(){if(entries.length<2)return;setEntries(x=>shuffle(x));setWinners({});setNotice(t('Participants shuffled.','Participants mélangés.'))}
  function copyTree(){
    const lines=[]
    rounds.forEach((round,r)=>{lines.push(roundTitle(r,rounds.length,groupSize));round.forEach((match,m)=>lines.push(`${groupSize===4?t('Table','Table'):t('Match','Match')} ${m+1}: ${match.players.filter(Boolean).map(p=>p.label).join(' / ')||'—'}${match.winner?` → ${match.winner.label}`:''}`));lines.push('')})
    if(champion)lines.push(`${t('Winner','Vainqueur')}: ${champion.label}`)
    navigator.clipboard?.writeText(lines.join('\n'))
    setNotice(t('Bracket copied.','Arbre copié.'))
  }
  return <main className="productPage wide tournamentPage">
    <a className="productBack" href="/">← Aeon Scorer</a>
    <header className="productHero"><span>{t('TOURNAMENT BRACKET','ARBRE DE TOURNOI')}</span><h1>{productLabel('tournament',lang)}</h1><p>{t('Build an elimination tree from names or Aeon share links. Choose duel mode or Commander tables of four where one player/deck advances from each table. Power scores never decide the winner or the seeding automatically.','Construis un arbre d’élimination à partir de noms ou de liens de partage Aeon. Choisis le mode duel ou des tables Commander de quatre où un joueur/deck se qualifie par table. Les scores de puissance ne décident jamais automatiquement du vainqueur ni du placement.')}</p></header>
    <section className="tournamentSetup rule0Tools"><div className="rule0ToolsHead"><div><span className="sectionEyebrow">{t('FORMAT','FORMAT')}</span><h3>{t('How should players advance?','Comment les joueurs se qualifient ?')}</h3></div></div>
      <div className="modeSwitch"><button className={groupSize===4?'active':''} onClick={()=>{setGroupSize(4);setWinners({})}}>{t('Commander · 4 players → 1 advances','Commander · 4 joueurs → 1 qualifié')}</button><button className={groupSize===2?'active':''} onClick={()=>{setGroupSize(2);setWinners({})}}>{t('Duel · 2 players → 1 advances','Duel · 2 joueurs → 1 qualifié')}</button></div>
      <label className="tournamentInputLabel">{t('One participant per line. Aeon share links are resolved to deck names.','Un participant par ligne. Les liens Aeon sont convertis en noms de decks.')}</label><textarea className="matchInput" value={text} onChange={e=>setText(e.target.value)} placeholder={t('Alice\nBob\nhttps://aeon-scorer.vercel.app/a/abc123def456','Alice\nBob\nhttps://aeon-scorer.vercel.app/a/abc123def456')}/><div className="productActions"><button className="productPrimary" onClick={load} disabled={busy}>{busy?t('Loading…','Chargement…'):t('Create bracket','Créer l’arbre')}</button>{entries.length>1&&<button onClick={randomize}>{t('Shuffle participants','Mélanger les participants')}</button>}{rounds.length>0&&<button onClick={copyTree}>{t('Copy bracket','Copier l’arbre')}</button>}</div>{error&&<div className="productError">{error}</div>}{notice&&<p className="productNote">{notice}</p>}
    </section>
    {rounds.length>0&&<section className="bracketScroller" aria-label={t('Tournament bracket','Arbre de tournoi')}><div className="bracketGrid">{rounds.map((round,r)=><div className="bracketRound" key={r}><h2>{roundTitle(r,rounds.length,groupSize)}</h2>{round.map((match,m)=><article className="bracketMatch" key={m}><small>{groupSize===4?t('Table','Table'):t('Match','Match')} {m+1}</small>{match.players.map((player,i)=>player?<button key={player.id} className={match.winner?.id===player.id?'winner':''} onClick={()=>choose(r,m,player)}><span>{player.label}</span>{player.sub&&<em>{player.sub}</em>}</button>:<div className="bracketBye" key={`bye-${i}`}>{t('Bye / waiting','Bye / en attente')}</div>)}</article>)}</div>)}</div></section>}
    {champion&&<section className="tournamentChampion"><span>{t('WINNER','VAINQUEUR')}</span><strong>{champion.label}</strong>{champion.sub&&<small>{champion.sub}</small>}</section>}
    <div className="workflowFooter"><a href="/pod">{productLabel('compare',lang)}</a><a href="/match">{productLabel('tables',lang)}</a></div>
  </main>
}
