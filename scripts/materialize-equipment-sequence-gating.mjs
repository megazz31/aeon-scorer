import fs from 'node:fs'

const paths=['src/engine/sequenceSimulator.js','src/engine/sequenceSimulatorMulti.js']
const helper=`function equipmentSequencePayoffForSimulation(c){\n  const o=String(c?.oracle||'').replace(/\\([^)]*\\)/g,' ').replace(/\\s+/g,' ').trim().toLowerCase()\n  return /\\bwhenever you cast [^.]{0,120}\\bequipment\\b|\\bfor each equipment you control\\b/.test(o)\n}\n`
const oldPair="const producers=(p.producerCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean),payoffs=(p.payoffCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean);"
const newPair="const producers=(p.producerCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean);let payoffs=(p.payoffCards||[]).map(x=>cardByName(available,x.name)).filter(Boolean);if(p.id==='equipment')payoffs=payoffs.filter(equipmentSequencePayoffForSimulation);"

for(const path of paths){
  let s=fs.readFileSync(path,'utf8'),changed=false
  if(!s.includes('function equipmentSequencePayoffForSimulation')){
    const anchor='function counterKinds(c){'
    if(!s.includes(anchor))throw new Error(`${path}: counterKinds anchor not found`)
    s=s.replace(anchor,helper+anchor);changed=true
  }
  if(s.includes(oldPair)){s=s.replace(oldPair,newPair);changed=true}
  else if(!s.includes(newPair))throw new Error(`${path}: operationalPackage payoff anchor not found`)
  if(changed){fs.writeFileSync(path,s);console.log(`patched ${path}`)}else console.log(`unchanged ${path}`)
}

const powerPath='src/engine/powerModel.js'
let power=fs.readFileSync(powerPath,'utf8')
const oldLimit="const limitations=[...(cmdSyn.limitations||[])]\n  if(targetReductionXConservative)limitations.push('target-cost-reduction-x-value-conservative')"
const newLimit="const limitations=[...(cmdSyn.limitations||[])]\n  const equipmentPackagePresent=packages.some(p=>p.id==='equipment')\n  if(equipmentPackagePresent)limitations.push('equipment-attachment-activation-combat-not-sequence-simulated')\n  if(equipmentPackagePresent)warnings.push('Les synergies Équipement sont reconnues structurellement, mais Aeon ne considère comme moteur séquencé que les payoffs immédiatement actifs au lancement ; les coûts d’équipement, l’attache et le combat restent conservateurs.')\n  if(targetReductionXConservative)limitations.push('target-cost-reduction-x-value-conservative')"
if(power.includes(oldLimit))power=power.replace(oldLimit,newLimit)
else if(!power.includes('equipment-attachment-activation-combat-not-sequence-simulated'))throw new Error('powerModel limitation anchor not found')
fs.writeFileSync(powerPath,power)

console.log('EQUIPMENT SEQUENCE GATING MATERIALIZED — single and multi commander')
