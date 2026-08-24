import { useEffect } from 'react'
import AeonMatchPage from './AeonMatchPage.jsx'
import { PodMatchPage,SharedAnalysisPage } from './ProductPages.jsx'
import { productLabel } from './uxCopy.js'

const language=()=>localStorage.getItem('aeon-lang')==='fr'?'fr':'en'
const t=(en,fr)=>language()==='fr'?fr:en
const codeOf=input=>String(input||'').trim().match(/(?:\/a\/)?([a-f0-9]{12})(?:\b|\/|$)/i)?.[1]?.toLowerCase()||''
function nativeSet(el,value){if(!el)return;const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')?.set?.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function RouteIntro({kind}){const lang=language(),copy={compare:{eyebrow:t('TABLE BALANCE · EXPERIMENTAL','ÉQUILIBRE DE TABLE · EXPÉRIMENTAL'),title:t('Compare 2 to 4 decks before the game.','Comparer 2 à 4 decks avant la partie.'),body:t('Aeon compares normal power ranges first, then highlights meaningful differences in peak, speed, interaction, dependency and game experience. The goal is a clearer Rule 0 conversation, not a win-rate prediction.','Aeon compare d’abord les plages de puissance habituelles, puis met en évidence les écarts utiles de pic, vitesse, interaction, dépendance et expérience de jeu. Le but est une discussion Rule 0 plus claire, pas une prédiction de victoire.')},tables:{eyebrow:t('EVENT TABLES · EXPERIMENTAL','RÉPARTITION D’ÉVÉNEMENT · EXPÉRIMENTAL'),title:t('Build balanced Commander tables of 4.','Former des tables Commander de 4 équilibrées.'),body:t('Give Aeon several versioned shares or public deck URLs. It groups players into complete tables of four and audits whether a simple cross-table swap can improve the result.','Donne à Aeon plusieurs partages versionnés ou URLs publiques. Il forme des tables complètes de quatre puis vérifie si un échange simple entre tables peut encore améliorer l’équilibre.')}}[kind];return <div className="uxRouteIntro"><a href="/" className="productBack">← Aeon Scorer</a><span>{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.body}</p><nav><a href="/pod">{productLabel('compare',lang)}</a><a href="/match">{productLabel('tables',lang)}</a><a href="/tournoi">{productLabel('tournament',lang)}</a></nav></div>}

export function CompareDecksPage(){return <div className="uxRouteShell uxCompareRoute"><RouteIntro kind="compare"/><PodMatchPage/></div>}
export function EventTablesPage(){
  useEffect(()=>{const qs=new URLSearchParams(location.search),seed=codeOf(qs.get('d')||'')||sessionStorage.getItem('aeon-seed-share')||'';if(!seed)return;sessionStorage.removeItem('aeon-seed-share');let tries=0;const fill=()=>{const el=document.querySelector('.matchInput');if(el){nativeSet(el,`${location.origin}/a/${seed}`);return}if(tries++<40)setTimeout(fill,100)};fill()},[])
  return <div className="uxRouteShell uxTablesRoute"><RouteIntro kind="tables"/><AeonMatchPage/></div>
}
export function SharePage(){
  const lang=language(),code=codeOf(location.pathname)
  const seedTables=()=>sessionStorage.setItem('aeon-seed-share',code)
  return <div className="uxRouteShell uxShareRoute"><SharedAnalysisPage/><div className="shareWorkflowBar"><b>{t('Use this snapshot','Utiliser ce snapshot')}</b><a className="uxPrimaryAction" href={`/pod?d=${code}`}>{productLabel('compare',lang)}</a><a href={`/match?d=${code}`} onClick={seedTables}>{productLabel('tables',lang)}</a><a href={`/tournoi?d=${code}`}>{productLabel('tournament',lang)}</a></div></div>
}
