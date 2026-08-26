import fs from 'node:fs'

const seqPath='src/engine/sequenceSimulator.js'
const powerPath='src/engine/powerModel.js'

let seq=fs.readFileSync(seqPath,'utf8')

if(!seq.includes('function equipmentSequencePayoffForSimulation')){
  const anchor='function counterKinds(c){'
  if(!seq.includes(anchor))throw new Error('sequenceSimulator anchor not found for equipment payoff gating')
  const helper=`function equipmentSequencePayoffForSimulation(c){\n  const o=String(c?.oracle||'').replace(/\\([^)]*\\)/g,' ').replace(/\\s+/g,' ').trim().toLowerCase()\n  return /\\bwhenever you cast [^.]{0,120}\\bequipment\\b|\\bfor each equipment you control\\b/.test(o)\n}\n`
  seq=seq.replace(anchor,helper+anchor)
}

const oldPair="const producers=(p.producerCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean),payoffs=(p.payoffCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean);"
const newPair="const producers=(p.producerCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean);let payoffs=(p.payoffCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean);if(p.id==='equipment')payoffs=payoffs.filter(equipmentSequencePayoffForSimulation);"
if(seq.includes(oldPair))seq=seq.replace(oldPair,newPair)
else if(!seq.includes(newPair))throw new Error('sequenceSimulator operationalPackage payoff anchor not found')

fs.writeFileSync(seqPath,seq)

let power=fs.readFileSync(powerPath,'utf8')
const oldLimit="const limitations=[...(cmdSyn.limitations||[])]\n  if(targetReductionXConservative)limitations.push('target-cost-reduction-x-value-conservative')"
const newLimit="const limitations=[...(cmdSyn.limitations||[])]\n  const equipmentPackagePresent=packages.some(p=>p.id==='equipment')\n  if(equipmentPackagePresent)limitations.push('equipment-attachment-activation-combat-not-sequence-simulated')\n  if(equipmentPackagePresent)warnings.push('Les synergies Équipement sont reconnues structurellement, mais Aeon ne considère comme moteur séquencé que les payoffs immédiatement actifs au lancement ; les coûts d’équipement, l’attache et le combat restent conservateurs.')\n  if(targetReductionXConservative)limitations.push('target-cost-reduction-x-value-conservative')"
if(power.includes(oldLimit))power=power.replace(oldLimit,newLimit)
else if(!power.includes("equipment-attachment-activation-combat-not-sequence-simulated"))throw new Error('powerModel limitation anchor not found')
fs.writeFileSync(powerPath,power)

console.log('EQUIPMENT SEQUENCE GATING MATERIALIZED')
