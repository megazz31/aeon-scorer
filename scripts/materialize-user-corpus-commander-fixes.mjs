import fs from 'node:fs'
const patch=(path,fn)=>{const before=fs.readFileSync(path,'utf8'),after=fn(before);if(after===before){console.log('unchanged',path);return}fs.writeFileSync(path,after);console.log('patched',path)}
const once=(s,a,b,label)=>{if(s.includes(b))return s;if(!s.includes(a))throw new Error(`missing ${label}`);return s.replace(a,b)}

patch('src/engine/packageGraph.js',s=>{
  s=once(s,"import { topLibraryCheatProfile, isTopLibraryCheatTarget } from './commanderMechanics.js'","import { topLibraryCheatProfile, isTopLibraryCheatTarget } from './commanderMechanics.js'\nimport { extraCommanderSynergy } from './commanderSynergyPatterns.js'",'package import')
  s=once(s,"  const custom=[]\n  const scope=targetReductionScope(commander)","  const custom=[],extra=extraCommanderSynergy(cards,commander)\n  for(const tag of extra.tags)semantic.add(tag)\n  custom.push(...extra.connected)\n  const scope=targetReductionScope(commander)",'extra commander synergy')
  s=once(s,"  return {score,connected:connected.map(c=>c.name),tags:[...semantic]}","  return {score,connected:connected.map(c=>c.name),tags:[...semantic],limitations:extra.limitations}",'commander synergy return')
  return s
})

patch('src/engine/powerModel.js',s=>{
  s=once(s,"import { detectKnownCombos } from './knownCombos.js'","import { detectKnownCombos, comboScoringSignal } from './knownCombos.js'",'combo signal import')
  s=once(s,"  const parts=commanders.map(c=>({name:c.name,...commanderSynergy(cards,c)})),connected=[...new Set(parts.flatMap(x=>x.connected))],tags=[...new Set(parts.flatMap(x=>x.tags))],nonlands=cards.filter(c=>!c.isLand).length\n  return {score:Math.min(100,Math.round(connected.length/Math.max(1,nonlands)*170)),connected,tags,commanders:parts}","  const parts=commanders.map(c=>({name:c.name,...commanderSynergy(cards,c)})),connected=[...new Set(parts.flatMap(x=>x.connected))],tags=[...new Set(parts.flatMap(x=>x.tags))],limitations=[...new Set(parts.flatMap(x=>x.limitations||[]))],nonlands=cards.filter(c=>!c.isLand).length\n  return {score:Math.min(100,Math.round(connected.length/Math.max(1,nonlands)*170)),connected,tags,limitations,commanders:parts}",'multi commander limitations')
  s=once(s,"  const aeon=aeonSignal(cards.concat(commanders),aeonMap),packageCohesion=weightedPackageCohesion(packages),comboBoost=combos.reduce((s,c)=>s+c.severity*14,0),t3=sim.turnProfile.find(x=>x.turn===3)||{},t4=sim.turnProfile.find(x=>x.turn===4)||{}","  const aeon=aeonSignal(cards.concat(commanders),aeonMap),packageCohesion=weightedPackageCohesion(packages),comboSignal=comboScoringSignal(combos),comboBoost=comboSignal.boost,t3=sim.turnProfile.find(x=>x.turn===3)||{},t4=sim.turnProfile.find(x=>x.turn===4)||{}",'combo boost')
  s=once(s,"explosiveness=clamp((t4.burst||0)*.68+roles.fastMana*3.5+comboBoost+(sim.peak-sim.high)*.35),synergy=clamp(packageCohesion*.72+cmdSyn.score*.28+combos.length*5)","explosiveness=clamp((t4.burst||0)*.68+roles.fastMana*3.5+comboBoost+(sim.peak-sim.high)*.35),synergy=clamp(packageCohesion*.72+cmdSyn.score*.28+comboSignal.families*5+comboSignal.redundancy)",'combo dimension')
  s=once(s,"  const limitations=[]\n  if(targetReductionXConservative)limitations.push('target-cost-reduction-x-value-conservative')","  const limitations=[...(cmdSyn.limitations||[])]\n  if(targetReductionXConservative)limitations.push('target-cost-reduction-x-value-conservative')",'methodology limitations')
  s=once(s,"  if(targetReductionXConservative)warnings.push('Réduction de coût liée aux cibles simulée sur le mana générique connu ; les valeurs X choisies restent volontairement conservatrices.')","  if(targetReductionXConservative)warnings.push('Réduction de coût liée aux cibles simulée sur le mana générique connu ; les valeurs X choisies restent volontairement conservatrices.')\n  const commanderLimitationWarning={\n    'commander-enchantment-animation-combat-not-sequence-simulated':'Le commandant transforme ou renforce des enchantements-créatures : cette cohérence est reconnue, mais les dégâts de combat générés par cette animation restent conservateurs.',\n    'go-wide-combat-damage-not-sequence-simulated':'Le commandant amplifie les attaques de masse : la cohérence du plan go-wide est reconnue, mais les dégâts de combat multijoueur ne sont pas encore simulés tour par tour.',\n    'donation-goad-opponent-behavior-not-sequence-simulated':'Le plan donation/goad est reconnu, mais Aeon ne simule pas encore les décisions de l’adversaire ni la durée de vie des créatures données.',\n    'exact-one-life-loss-frequency-conservative':'Les sources répétées de perte exacte de 1 point de vie sont reliées au commandant ; leur fréquence réelle reste volontairement conservatrice.',\n    'activated-ability-mana-and-exhaust-compression-not-sequence-simulated':'Le commandant convertit sa puissance en mana réservé aux capacités et peut déployer des permanents via une capacité coûteuse ; cette compression n’est pas encore simulée intégralement.'\n  }\n  for(const limitation of cmdSyn.limitations||[]){const w=commanderLimitationWarning[limitation];if(w)warnings.push(w)}",'commander warnings')
  s=once(s,"commanderMechanics:sim.commanderMechanics||null,limitations}","commanderMechanics:sim.commanderMechanics||null,comboSignal,limitations}",'methodology combo signal')
  return s
})

patch('package.json',s=>{
  if(!s.includes('node scripts/user-corpus-commander-regression-test.mjs')){
    s=once(s,'node scripts/semantic16-commander-compression-test.mjs','node scripts/semantic16-commander-compression-test.mjs && node scripts/user-corpus-commander-regression-test.mjs','semantic test hook')
  }
  if(!s.includes('node scripts/user-corpus-combo-regression-test.mjs')){
    s=once(s,'node scripts/user-corpus-commander-regression-test.mjs','node scripts/user-corpus-commander-regression-test.mjs && node scripts/user-corpus-combo-regression-test.mjs','combo test hook')
  }
  return s
})
console.log('USER CORPUS COMMANDER FIXES MATERIALIZED')
