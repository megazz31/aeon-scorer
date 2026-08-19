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
function calibratePower(x){
  if(x<=45)return clamp(x*.67)
  if(x<=70)return clamp(30+(x-45)*1.2)
  if(x<=90)return clamp(60+(x-70)*1.5)
  return clamp(90+(x-90))
}

function roleStats(cards){
  const nonlands=cards.filter(c=>!c.isLand)
  const countTag=t=>nonlands.filter(c=>c.tags.includes(t)).length
  return {
    lands:cards.filter(c=>c.isLand).length,
    nonlands:nonlands.length,
    fastMana:countTag('fast-mana'),
    tutors:countTag('tutor'),
    draw:countTag('draw'),
    interaction:nonlands.filter(c=>c.interaction>0).length,
    protection:countTag('protection'),
    recursion:countTag('recursion'),
    wipes:countTag('wipe'),
    avgCmc:nonlands.length?avg(nonlands.map(c=>c.cmc)):0,
  }
}

function aeonSignal(cards,map){
  if(!map?.size)return {available:false,score:null,ranked:0,top:[]}
  const rows=cards.map(c=>({name:c.name,...aeonPriorFor(c,map)})).filter(x=>x.points!=null)
  const top=[...rows].sort((a,b)=>b.points-a.points).slice(0,12)
  const weighted=top.length?avg(top.map((x,i)=>x.normalized*(1-i/(top.length*1.8)))):0
  return {available:true,score:Math.round(weighted*100),ranked:rows.length,top:top.slice(0,8)}
}

function parsedConfidence(cards,packages,combos){
  const nonlands=cards.filter(c=>!c.isLand)
  const texted=nonlands.filter(c=>c.oracle?.trim()).length/Math.max(1,nonlands.length)
  const featureHit=nonlands.filter(c=>c.tags.length>0).length/Math.max(1,nonlands.length)
  let score=55+texted*20+featureHit*15
  if(packages.length)score+=5
  if(combos.length)score+=3
  return Math.round(clamp(score,35,96))
}

export function analyzePower(rawCards, rawCommander=null, aeonMap=null, iterations=3000){
  let commander=rawCommander?cardFeatures(rawCommander):null
  let cards=featureDeck(rawCards)

  if(commander){
    const ix=cards.findIndex(c=>c.name.toLowerCase()===commander.name.toLowerCase())
    if(ix>=0)cards=cards.filter((_,i)=>i!==ix)
  }

  const packages=detectPackages(cards,commander)
  const combos=detectKnownCombos(cards.concat(commander?[commander]:[]))
  const cmdSyn=commanderSynergy(cards,commander)
  const roles=roleStats(cards)
  const sim=simulateSequences(cards,commander,packages,iterations,7,seeded(hashSeed(cards,commander,'with-command')))
  const simNoCmd=commander?simulateSequences(cards,null,packages.filter(p=>p.id!=='early-commander'),Math.max(1200,Math.floor(iterations/2)),7,seeded(hashSeed(cards,null,'no-command'))):null
  const aeon=aeonSignal(cards.concat(commander?[commander]:[]),aeonMap)

  const packageStrength=packages.length?avg(packages.slice(0,4).map(p=>p.strength)):0
  const comboBoost=combos.reduce((s,c)=>s+c.severity*16,0)
  const turn3=sim.turnProfile.find(x=>x.turn===3)||{}
  const turn4=sim.turnProfile.find(x=>x.turn===4)||{}
  const turn5=sim.turnProfile.find(x=>x.turn===5)||{}

  const speed=clamp(
    32 + (3.4-roles.avgCmc)*12 + roles.fastMana*3.2 +
    (commander&&sim.commanderMedianTurn?Math.max(0,5-sim.commanderMedianTurn)*5:0) +
    (turn3.engine||0)*.12
  )
  const interaction=clamp((turn4.interaction||0)*.78 + (turn3.interaction||0)*.22)
  const resilience=clamp((turn5.rebuild||0)*.58 + roles.recursion*4 + roles.protection*2.2 - (cmdSyn.score*.10))
  const explosiveness=clamp((turn4.explosive||0)*.62 + roles.fastMana*4.5 + comboBoost + packageStrength*.12)
  const synergy=clamp(packageStrength*.72 + cmdSyn.score*.38 + combos.length*6)
  const consistency=clamp(sim.consistency + roles.tutors*2.3 + Math.min(10,packages.length*1.5))

  const aeonAdj=aeon.available?(aeon.score-35)*.06:0
  const structural=clamp(
    sim.median*.44 + speed*.13 + synergy*.16 + consistency*.12 +
    interaction*.06 + resilience*.05 + explosiveness*.04 + aeonAdj
  )

  const latentFloor=clamp(sim.floor*.72 + Math.min(25,roles.draw*1.2+roles.recursion*2.1+roles.interaction*.45))
  const latentCeiling=clamp(Math.max(structural,sim.ceiling*.72 + explosiveness*.19 + synergy*.16 + comboBoost*.35))
  const median=calibratePower(structural)
  const floor=calibratePower(latentFloor)
  const ceiling=calibratePower(latentCeiling)
  const variance=clamp(Math.max(0,ceiling-floor)*.55 + sim.variance*.45,0,50)
  const commanderDelta=commander&&simNoCmd?Math.max(0,Math.round((sim.median-simNoCmd.median)+cmdSyn.score*.10)):0

  const dimensions={
    speed:Math.round(speed),
    consistency:Math.round(consistency),
    explosiveness:Math.round(explosiveness),
    synergy:Math.round(synergy),
    interaction:Math.round(interaction),
    resilience:Math.round(resilience),
  }

  const warnings=[]
  if(roles.lands<28)warnings.push('Très peu de terrains détectés : vérifier que la liste importée est complète.')
  if(!commander)warnings.push('Aucun commandant sélectionné : dépendance au commandant et package early-commander non mesurés.')
  if(aeon.available)warnings.push('Les points AeonShift sont utilisés comme prior faible uniquement ; ils ne sont pas une calibration Commander multijoueur.')
  if(combos.length)warnings.push('Combo connue détectée : sa vraie consistance dépend des tuteurs, redondances et fenêtres de protection.')

  const drivers=cards.filter(c=>!c.isLand).map(c=>{
    const ap=aeonPriorFor(c,aeonMap)
    const base=c.development*.9+c.interaction*.75+c.resilience*.7+c.explosiveness*1.2+c.recurring*.6+c.efficiency*.4
    const pkg=packages.filter(p=>[...(p.producers||[]),...(p.payoffs||[])].includes(c.name)).length
    return {name:c.name,impact:Math.round((base+pkg*.8+(ap.normalized||0)*1.2)*10)/10,tags:c.tags.slice(0,5),aeon:ap.points}
  }).sort((a,b)=>b.impact-a.impact).slice(0,12)

  return {
    profile:{
      median:Math.round(median),floor:Math.round(floor),ceiling:Math.round(ceiling),
      variance:Math.round(variance),consistency:Math.round(consistency),
      commanderDelta, confidence:parsedConfidence(cards,packages,combos),
    },
    dimensions,roles,packages,combos,commanderSynergy:cmdSyn,aeon,simulation:sim,drivers,warnings,
    methodology:{iterations,model:'sequence-access-v3-calibrated',maxTurn:7},
  }
}
