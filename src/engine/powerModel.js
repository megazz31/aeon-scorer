import { featureDeck, cardFeatures } from './cardFeatures.js'
import { augmentFeatureDeck } from './semanticAugment.js'
import { detectPackages, commanderSynergy } from './packageGraph.js'
import { detectKnownCombos, comboScoringSignal } from './knownCombos.js'
import { simulateSequences } from './sequenceSimulator.js'
import { simulateSequencesMulti } from './sequenceSimulatorMulti.js'
import { buildExperienceFingerprint } from './experienceModel.js'
import { buildTableFriction } from './frictionModel.js'
import { buildGoldfishHorizon } from './goldfishHorizon.js'
import { sampleFirstAccess } from './firstAccessSampler.js'
import { aeonPriorFor } from '../data/aeonshift.js'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n))
const avg=xs=>xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:0
const canonicalCardOrder=(a,b)=>{const x=String(a?.name||'').toLowerCase(),y=String(b?.name||'').toLowerCase();return x<y?-1:x>y?1:0}
function hashSeed(cards,commanders,salt=''){const cmd=(Array.isArray(commanders)?commanders:[commanders]).filter(Boolean).map(c=>c.name),key=[...cmd,...cards.map(c=>c.name)].sort().join('|')+'|'+salt;let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function calibratePower(x){if(x<=30)return clamp(x*.80);if(x<=45)return clamp(24+(x-30)*1.50);if(x<=70)return clamp(46.5+(x-45)*1.28);if(x<=90)return clamp(78.5+(x-70)*.75);return clamp(93.5+(x-90)*.65)}
function roleStats(cards){const nonlands=cards.filter(c=>!c.isLand),lands=cards.filter(c=>c.isLand),count=t=>nonlands.filter(c=>c.tags.includes(t)).length,unknownManaLands=lands.filter(c=>!(c.sourceColors||[]).length&&!/(plains|island|swamp|mountain|forest|any color|search your library for .*land)/i.test(`${c.type||''} ${c.oracle||''}`)).length;return {lands:lands.length,nonlands:nonlands.length,fastMana:count('fast-mana'),tutors:count('tutor'),repeatableTutors:count('repeatable-tutor'),draw:count('draw'),interaction:nonlands.filter(c=>c.interaction>0).length,protection:count('protection'),recursion:count('recursion'),wipes:count('wipe'),avgCmc:nonlands.length?avg(nonlands.map(c=>c.cmc)):0,unknownManaLands}}
function aeonSignal(cards,map){if(!map?.size)return {available:false,score:null,ranked:0,top:[]};const rows=cards.map(c=>({name:c.name,...aeonPriorFor(c,map)})).filter(x=>x.points!=null),top=[...rows].sort((a,b)=>b.points-a.points).slice(0,12),weighted=top.length?avg(top.map((x,i)=>x.normalized*(1-i/(top.length*1.8)))):0;return {available:true,score:Math.round(weighted*100),ranked:rows.length,top:top.slice(0,8)}}
function weightedPackageCohesion(packages){const weights=[1,.65,.4],value=p=>p.scoringCohesion??p.cohesion??p.strength??0,top=[...packages].sort((a,b)=>value(b)-value(a)).slice(0,3);if(!top.length)return 0;return top.reduce((s,p,i)=>s+value(p)*weights[i],0)/weights.slice(0,top.length).reduce((a,b)=>a+b,0)}
function analysisCoverage(cards,packages,combos){const nonlands=cards.filter(c=>!c.isLand),lands=cards.filter(c=>c.isLand),texted=nonlands.filter(c=>c.oracle?.trim()).length/Math.max(1,nonlands.length),featureHit=nonlands.filter(c=>c.tags.length>1).length/Math.max(1,nonlands.length),manaKnown=lands.filter(c=>(c.sourceColors||[]).length||/(plains|island|swamp|mountain|forest|any color|search your library for .*land)/i.test(`${c.type||''} ${c.oracle||''}`)).length/Math.max(1,lands.length);let score=45+texted*20+featureHit*15+manaKnown*12;if(packages.length)score+=3;if(combos.length)score+=1;return Math.round(clamp(score,30,96))}
function hasTargetCommanderDiscount(c){const o=String(c?.oracle||'');return /spells you cast cost [^.]{0,100} less to cast for each target/i.test(o)||/spells you cast that target (?:a|one or more) creatures? cost [^.]{0,100} less to cast/i.test(o)}
function hasTopLibraryCreatureCheat(c){const o=String(c?.oracle||'');return /look at the top (?:\w+|\d+) cards? of your library/i.test(o)&&/put (?:a|one) [^.]{0,100}creature card [^.]{0,100}onto the battlefield/i.test(o)}
function combinedCommanderSynergy(cards,commanders){
  if(!commanders.length)return {score:0,connected:[],tags:[],commanders:[]}
  if(commanders.length===1)return commanderSynergy(cards,commanders[0])
  const parts=commanders.map(c=>({name:c.name,...commanderSynergy(cards,c)})),connected=[...new Set(parts.flatMap(x=>x.connected))],tags=[...new Set(parts.flatMap(x=>x.tags))],limitations=[...new Set(parts.flatMap(x=>x.limitations||[]))],nonlands=cards.filter(c=>!c.isLand).length
  return {score:Math.min(100,Math.round(connected.length/Math.max(1,nonlands)*170)),connected,tags,limitations,commanders:parts}
}

export function analyzePower(rawCards,rawCommander=null,aeonMap=null,iterations=3000,options={}){
  const rawCommanders=(Array.isArray(rawCommander)?rawCommander:[rawCommander]).filter(Boolean).slice(0,2),commanders=rawCommanders.map(cardFeatures),commander=commanders[0]||null,multi=commanders.length>1
  let cards=augmentFeatureDeck(featureDeck(rawCards)).sort(canonicalCardOrder)
  if(commanders.length){const names=new Set(commanders.map(c=>c.name.toLowerCase()));cards=cards.filter(c=>!names.has(c.name.toLowerCase())||c.__keepIn99)}
  const packages=detectPackages(cards,commander),combos=detectKnownCombos(cards.concat(commanders)),cmdSyn=combinedCommanderSynergy(cards,commanders),roles=roleStats(cards)
  const sim=multi?simulateSequencesMulti(cards,commanders,packages,combos,iterations,7,seeded(hashSeed(cards,commanders,'with-command-v31'))):simulateSequences(cards,commander,packages,combos,iterations,7,seeded(hashSeed(cards,commander,'with-command-v31')))
  const simNoCmd=commanders.length?simulateSequences(cards,null,packages.filter(p=>p.id!=='early-commander'),combos,Math.max(1200,Math.floor(iterations/2)),7,seeded(hashSeed(cards,null,'no-command-v31'))):null
  const aeon=aeonSignal(cards.concat(commanders),aeonMap),packageCohesion=weightedPackageCohesion(packages),comboSignal=comboScoringSignal(combos),comboBoost=comboSignal.boost,t3=sim.turnProfile.find(x=>x.turn===3)||{},t4=sim.turnProfile.find(x=>x.turn===4)||{}
  const speed=clamp(28+(3.4-roles.avgCmc)*11+roles.fastMana*3+(commanders.length&&sim.commanderMedianTurn?Math.max(0,5-sim.commanderMedianTurn)*5:0)+(sim.engineMedianTurn?Math.max(0,6-sim.engineMedianTurn)*2:0)+(t3.engine||0)*.08)
  const interaction=clamp((t4.interaction||0)*.72+(t3.interaction||0)*.28),resilience=clamp(sim.recoveryAfterDisruption*.25+(t4.resource||0)*.10+roles.recursion*3.2+roles.protection*1.2),explosiveness=clamp((t4.burst||0)*.68+roles.fastMana*3.5+comboBoost+(sim.peak-sim.high)*.35),synergy=clamp(packageCohesion*.72+cmdSyn.score*.28+comboSignal.families*5+comboSignal.redundancy),consistency=clamp(sim.consistency*.88+roles.tutors*1.8+roles.repeatableTutors*1.3)
  const aeonAdj=aeon.available?(aeon.score-35)*.05:0,structural=clamp(sim.median*.36+speed*.20+synergy*.10+consistency*.15+interaction*.06+resilience*.04+explosiveness*.09+aeonAdj),shift=structural-sim.median
  const floor=calibratePower(clamp(sim.floor+shift)),median=calibratePower(structural),ceiling=calibratePower(clamp(sim.high+shift)),peak=calibratePower(clamp(sim.peak+shift+comboBoost*.18)),dispersion=Math.max(0,ceiling-floor),commanderDelta=commanders.length&&simNoCmd?Math.max(0,Math.round((sim.median-simNoCmd.median)+cmdSyn.score*.08)):0
  const dimensions={speed:Math.round(speed),consistency:Math.round(consistency),explosiveness:Math.round(explosiveness),synergy:Math.round(synergy),interaction:Math.round(interaction),resilience:Math.round(resilience)},warnings=[],targetReduction=sim?.commanderMechanics?.targetCostReduction||null,topLibraryCheat=sim?.commanderMechanics?.topLibraryCheat||null,targetReductionXConservative=!!targetReduction&&cards.some(c=>/\{X\}/i.test(String(c.manaCost||''))&&/\btarget\b/i.test(String(c.oracle||'')))
  if(roles.lands<28)warnings.push('Très peu de terrains détectés : vérifier que la liste importée est complète.')
  if(!commanders.length)warnings.push('Aucun commandant sélectionné : dépendance et accès au commandant non mesurés.')
  if(multi)warnings.push('Deux commandants modélisés séparément en command zone ; leur taxe de commandant est suivie indépendamment.')
  if(roles.unknownManaLands>Math.max(2,roles.lands*.15))warnings.push(`${roles.unknownManaLands} terrain(s) ont une production colorée mal déterminée : la courbe d’accès peut être moins précise.`)
  if(aeon.available)warnings.push('AeonShift est utilisé comme prior faible uniquement ; ce n’est pas une calibration Commander multijoueur.')
  if(combos.length)warnings.push('Combo connue détectée : sa consistance réelle dépend encore des tuteurs, redondances et fenêtres de protection.')
  const drivers=cards.filter(c=>!c.isLand).map(c=>{const ap=aeonPriorFor(c,aeonMap),pkg=packages.filter(p=>(p.members||[]).some(n=>n.toLowerCase()===c.name.toLowerCase())).length,base=c.development*.85+c.interaction*.8+c.resilience*.7+c.explosiveness*1.15+c.recurring*.55+c.efficiency*.4;return {name:c.name,impact:Math.round((base+pkg*.7+(ap.normalized||0)*1.1)*10)/10,tags:c.tags.slice(0,6),aeon:ap.points}}).sort((a,b)=>b.impact-a.impact).slice(0,12)
  const coverage=analysisCoverage(cards,packages,combos),firstAccessIterations=options?.firstAccess===false?0:Math.max(1,Math.min(Math.max(1,iterations),800,Math.max(80,Math.floor(iterations/3))))
  if(firstAccessIterations>0)sim.firstAccess=sampleFirstAccess({cards,commanders,packages,combos,iterations:firstAccessIterations,maxTurn:7,rng:seeded(hashSeed(cards,commanders,'first-access-v2'))})
  const limitations=[...(cmdSyn.limitations||[])]
  const equipmentPackagePresent=packages.some(p=>p.id==='equipment')
  if(equipmentPackagePresent)limitations.push('equipment-attachment-activation-combat-not-sequence-simulated')
  if(equipmentPackagePresent)warnings.push('Les synergies Équipement sont reconnues structurellement, mais Aeon ne considère comme moteur séquencé que les payoffs immédiatement actifs au lancement ; les coûts d’équipement, l’attache et le combat restent conservateurs.')
  if(targetReductionXConservative)limitations.push('target-cost-reduction-x-value-conservative')
  if(targetReductionXConservative)warnings.push('Réduction de coût liée aux cibles simulée sur le mana générique connu ; les valeurs X choisies restent volontairement conservatrices.')
  const commanderLimitationWarning={
    'commander-enchantment-animation-combat-not-sequence-simulated':'Le commandant transforme ou renforce des enchantements-créatures : cette cohérence est reconnue, mais les dégâts de combat générés par cette animation restent conservateurs.',
    'go-wide-combat-damage-not-sequence-simulated':'Le commandant amplifie les attaques de masse : la cohérence du plan go-wide est reconnue, mais les dégâts de combat multijoueur ne sont pas encore simulés tour par tour.',
    'donation-goad-opponent-behavior-not-sequence-simulated':'Le plan donation/goad est reconnu, mais Aeon ne simule pas encore les décisions de l’adversaire ni la durée de vie des créatures données.',
    'donation-value-not-sequence-simulated':'Le commandant récompense les permanents donnés aux adversaires : cette cohérence est reconnue, mais Aeon ne simule pas encore la valeur perdue ou gagnée lors du choix des permanents à donner.',
    'top-library-restricted-cast-not-sequence-simulated':'Le commandant permet de lancer une catégorie précise de cartes depuis le dessus de la bibliothèque : cette profondeur virtuelle est reconnue, sans simuler encore chaque carte révélée et lancée tour par tour.',
    'exact-one-life-loss-frequency-conservative':'Les sources répétées de perte exacte de 1 point de vie sont reliées au commandant ; leur fréquence réelle reste volontairement conservatrice.',
    'activated-ability-mana-and-exhaust-compression-not-sequence-simulated':'Le commandant convertit sa puissance en mana réservé aux capacités et peut déployer des permanents via une capacité coûteuse ; cette compression n’est pas encore simulée intégralement.'
  }
  for(const limitation of cmdSyn.limitations||[]){const w=commanderLimitationWarning[limitation];if(w)warnings.push(w)}
  const result={profile:{median:Math.round(median),floor:Math.round(floor),ceiling:Math.round(ceiling),peak:Math.round(peak),dispersion:Math.round(dispersion),variance:Math.round(dispersion),consistency:Math.round(consistency),commanderDelta,coverage,dataCoverage:coverage},dimensions,roles,packages,combos,commanderSynergy:cmdSyn,commanderNames:commanders.map(c=>c.name),aeon,simulation:sim,drivers,warnings,methodology:{iterations,firstAccessIterations,model:'sequence-access-v3.2-semantic',maxTurn:7,commandZoneCount:commanders.length,separateCommanderTax:multi,curveMeaning:'Chaque colonne mesure un accès indépendant ; elles ne représentent pas une même ligne de jeu simultanée.',commanderMechanics:sim.commanderMechanics||null,comboSignal,limitations}}
  result.experience=buildExperienceFingerprint(result,cards.concat(commanders))
  result.friction=buildTableFriction(result,cards.concat(commanders))
  result.horizon=buildGoldfishHorizon(result)
  const detail={result,cards,commander,commanders,iterations}
  if(options?.emitProduct!==false&&typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent!=='undefined')queueMicrotask(()=>{try{window.dispatchEvent(new CustomEvent('aeon-analysis-computed',{detail}))}catch{}})
  const hook=globalThis?.__AEON_ANALYSIS_HOOK__;if(options?.record!==false&&typeof hook==='function')queueMicrotask(()=>{try{hook(detail)}catch{}})
  return result
}
