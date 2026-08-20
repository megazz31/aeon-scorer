import { featureDeck, cardFeatures } from './cardFeatures.js'
import { detectPackages, commanderSynergy } from './packageGraph.js'
import { detectKnownCombos } from './knownCombos.js'
import { simulateSequences } from './sequenceSimulator.js'
import { aeonPriorFor } from '../data/aeonshift.js'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const avg=xs=>xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:0

function hashSeed(cards,commander,salt=''){
  const key=[commander?.name||'',...cards.map(c=>c.name)].sort().join('|')+'|'+salt
  let h=2166136261
  for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0
}
function seeded(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Monotonic presentation scale. It stretches the structurally useful 45–70 zone
// after semantic hardening without changing ordering or introducing brackets.
function calibratePower(x){
  if(x<=30)return clamp(x*.80)
  if(x<=45)return clamp(24+(x-30)*1.50)
  if(x<=70)return clamp(46.5+(x-45)*1.28)
  if(x<=90)return clamp(78.5+(x-70)*.75)
  return clamp(93.5+(x-90)*.65)
}

function roleStats(cards){
  const nonlands=cards.filter(c=>!c.isLand),lands=cards.filter(c=>c.isLand)
  const count=t=>nonlands.filter(c=>c.tags.includes(t)).length
  const unknownManaLands=lands.filter(c=>!(c.sourceColors||[]).length&&!/(plains|island|swamp|mountain|forest|any color|search your library for .*land)/i.test(`${c.type||''} ${c.oracle||''}`)).length
  return {
    lands:lands.length,nonlands:nonlands.length,fastMana:count('fast-mana'),tutors:count('tutor'),repeatableTutors:count('repeatable-tutor'),
    draw:count('draw'),interaction:nonlands.filter(c=>c.interaction>0).length,protection:count('protection'),recursion:count('recursion'),wipes:count('wipe'),
    avgCmc:nonlands.length?avg(nonlands.map(c=>c.cmc)):0,unknownManaLands,
  }
}
function aeonSignal(cards,map){
  if(!map?.size)return {available:false,score:null,ranked:0,top:[]}
  const rows=cards.map(c=>({name:c.name,...aeonPriorFor(c,map)})).filter(x=>x.points!=null)
  const top=[...rows].sort((a,b)=>b.points-a.points).slice(0,12)
  const weighted=top.length?avg(top.map((x,i)=>x.normalized*(1-i/(top.length*1.8)))):0
  return {available:true,score:Math.round(weighted*100),ranked:rows.length,top:top.slice(0,8)}
}
function weightedPackageCohesion(packages){
  const weights=[1,.65,.4]
  const top=packages.slice(0,3)
  if(!top.length)return 0
  return top.reduce((s,p,i)=>s+(p.cohesion??p.strength??0)*weights[i],0)/weights.slice(0,top.length).reduce((a,b)=>a+b,0)
}
function analysisCoverage(cards,packages,combos){
  const nonlands=cards.filter(c=>!c.isLand),lands=cards.filter(c=>c.isLand)
  const texted=nonlands.filter(c=>c.oracle?.trim()).length/Math.max(1,nonlands.length)
  const featureHit=nonlands.filter(c=>c.tags.length>1).length/Math.max(1,nonlands.length)
  const manaKnown=lands.filter(c=>(c.sourceColors||[]).length||/(plains|island|swamp|mountain|forest|any color|search your library for .*land)/i.test(`${c.type||''} ${c.oracle||''}`)).length/Math.max(1,lands.length)
  let score=45+texted*20+featureHit*15+manaKnown*12
  if(packages.length)score+=3;if(combos.length)score+=1
  return Math.round(clamp(score,30,96))
}

export function analyzePower(rawCards,rawCommander=null,aeonMap=null,iterations=3000){
  let commander=rawCommander?cardFeatures(rawCommander):null
  let cards=featureDeck(rawCards)
  if(commander){
    const ix=cards.findIndex(c=>c.name.toLowerCase()===commander.name.toLowerCase())
    if(ix>=0)cards=cards.filter((_,i)=>i!==ix)
  }

  const packages=detectPackages(cards,commander),combos=detectKnownCombos(cards.concat(commander?[commander]:[])),cmdSyn=commanderSynergy(cards,commander),roles=roleStats(cards)
  const sim=simulateSequences(cards,commander,packages,combos,iterations,7,seeded(hashSeed(cards,commander,'with-command-v31')))
  const simNoCmd=commander?simulateSequences(cards,null,packages.filter(p=>p.id!=='early-commander'),combos,Math.max(1200,Math.floor(iterations/2)),7,seeded(hashSeed(cards,null,'no-command-v31'))):null
  const aeon=aeonSignal(cards.concat(commander?[commander]:[]),aeonMap)

  const packageCohesion=weightedPackageCohesion(packages),comboBoost=combos.reduce((s,c)=>s+c.severity*14,0)
  const t3=sim.turnProfile.find(x=>x.turn===3)||{},t4=sim.turnProfile.find(x=>x.turn===4)||{}
  const speed=clamp(28+(3.4-roles.avgCmc)*11+roles.fastMana*3+(commander&&sim.commanderMedianTurn?Math.max(0,5-sim.commanderMedianTurn)*5:0)+(sim.engineMedianTurn?Math.max(0,6-sim.engineMedianTurn)*2:0)+(t3.engine||0)*.08)
  const interaction=clamp((t4.interaction||0)*.72+(t3.interaction||0)*.28)
  const resilience=clamp(sim.recoveryAfterDisruption*.62+roles.recursion*3.2+roles.protection*1.8)
  const explosiveness=clamp((t4.burst||0)*.68+roles.fastMana*3.5+comboBoost+(sim.peak-sim.high)*.35)
  const synergy=clamp(packageCohesion*.72+cmdSyn.score*.28+combos.length*5)
  const consistency=clamp(sim.consistency*.88+roles.tutors*1.8+roles.repeatableTutors*1.3)

  const aeonAdj=aeon.available?(aeon.score-35)*.05:0
  const structural=clamp(sim.median*.40+speed*.14+synergy*.16+consistency*.12+interaction*.07+resilience*.07+explosiveness*.04+aeonAdj)
  const shift=structural-sim.median
  const rawP20=clamp(sim.floor+shift),rawP50=structural,rawP80=clamp(sim.high+shift),rawPeak=clamp(sim.peak+shift+comboBoost*.18)
  const floor=calibratePower(rawP20),median=calibratePower(rawP50),ceiling=calibratePower(rawP80),peak=calibratePower(rawPeak)
  const dispersion=Math.max(0,ceiling-floor)
  const commanderDelta=commander&&simNoCmd?Math.max(0,Math.round((sim.median-simNoCmd.median)+cmdSyn.score*.08)):0

  const dimensions={speed:Math.round(speed),consistency:Math.round(consistency),explosiveness:Math.round(explosiveness),synergy:Math.round(synergy),interaction:Math.round(interaction),resilience:Math.round(resilience)}
  const warnings=[]
  if(roles.lands<28)warnings.push('Très peu de terrains détectés : vérifier que la liste importée est complète.')
  if(!commander)warnings.push('Aucun commandant sélectionné : dépendance et accès au commandant non mesurés.')
  if(roles.unknownManaLands>Math.max(2,roles.lands*.15))warnings.push(`${roles.unknownManaLands} terrain(s) ont une production colorée mal déterminée : la courbe d’accès peut être moins précise.`)
  if(aeon.available)warnings.push('AeonShift est utilisé comme prior faible uniquement ; ce n’est pas une calibration Commander multijoueur.')
  if(combos.length)warnings.push('Combo connue détectée : sa consistance réelle dépend encore des tuteurs, redondances et fenêtres de protection.')

  const drivers=cards.filter(c=>!c.isLand).map(c=>{
    const ap=aeonPriorFor(c,aeonMap),pkg=packages.filter(p=>(p.members||[]).some(n=>n.toLowerCase()===c.name.toLowerCase())).length
    const base=c.development*.85+c.interaction*.8+c.resilience*.7+c.explosiveness*1.15+c.recurring*.55+c.efficiency*.4
    return {name:c.name,impact:Math.round((base+pkg*.7+(ap.normalized||0)*1.1)*10)/10,tags:c.tags.slice(0,6),aeon:ap.points}
  }).sort((a,b)=>b.impact-a.impact).slice(0,12)

  const coverage=analysisCoverage(cards,packages,combos)
  return {
    profile:{median:Math.round(median),floor:Math.round(floor),ceiling:Math.round(ceiling),peak:Math.round(peak),dispersion:Math.round(dispersion),variance:Math.round(dispersion),consistency:Math.round(consistency),commanderDelta,coverage,dataCoverage:coverage},
    dimensions,roles,packages,combos,commanderSynergy:cmdSyn,aeon,simulation:sim,drivers,warnings,
    methodology:{iterations,model:'sequence-access-v3.1-semantic',maxTurn:7,curveMeaning:'Chaque colonne mesure un accès indépendant ; elles ne représentent pas une même ligne de jeu simultanée.'},
  }
}
