import fs from 'node:fs'

const paths=['src/engine/sequenceSimulator.js','src/engine/sequenceSimulatorMulti.js']
const importLine="import { sequenceEligibleCombos } from './knownCombos.js'"
const importAnchor="import { isImmediateLandRamp } from './packageGraph.js'"
const old="function comboAccessible(hand,priorHand,battlefield,used,combos,currentSources,priorSources){if(!combos?.length)return false;const available=[...battlefield,...hand.filter(c=>!used.has(c)),...priorHand],priorSet=new Set(priorHand);for(const combo of combos){"
const next="function comboAccessible(hand,priorHand,battlefield,used,combos,currentSources,priorSources){const eligible=sequenceEligibleCombos(combos);if(!eligible.length)return false;const available=[...battlefield,...hand.filter(c=>!used.has(c)),...priorHand],priorSet=new Set(priorHand);for(const combo of eligible){"

for(const path of paths){
  let s=fs.readFileSync(path,'utf8'),changed=false
  if(!s.includes(importLine)){
    if(!s.includes(importAnchor))throw new Error(`${path}: missing sequence simulator import anchor`)
    s=s.replace(importAnchor,`${importAnchor}\n${importLine}`);changed=true
  }
  if(!s.includes(next)){
    if(!s.includes(old))throw new Error(`${path}: missing comboAccessible anchor`)
    s=s.replace(old,next);changed=true
  }
  if(changed){fs.writeFileSync(path,s);console.log(`patched ${path}`)}else console.log(`unchanged ${path}`)
}

console.log('COMBO SEQUENCE ELIGIBILITY MATERIALIZED — single and multi commander')
