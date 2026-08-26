import fs from 'node:fs'
const path='src/engine/sequenceSimulator.js'
const before=fs.readFileSync(path,'utf8')
let s=before
if(!s.includes("import { sequenceEligibleCombos } from './knownCombos.js'")){
  const anchor="import { isImmediateLandRamp } from './packageGraph.js'"
  if(!s.includes(anchor))throw new Error('missing sequence simulator import anchor')
  s=s.replace(anchor,`${anchor}\nimport { sequenceEligibleCombos } from './knownCombos.js'`)
}
const old="function comboAccessible(hand,priorHand,battlefield,used,combos,currentSources,priorSources){if(!combos?.length)return false;const available=[...battlefield,...hand.filter(c=>!used.has(c)),...priorHand],priorSet=new Set(priorHand);for(const combo of combos){"
const next="function comboAccessible(hand,priorHand,battlefield,used,combos,currentSources,priorSources){const eligible=sequenceEligibleCombos(combos);if(!eligible.length)return false;const available=[...battlefield,...hand.filter(c=>!used.has(c)),...priorHand],priorSet=new Set(priorHand);for(const combo of eligible){"
if(!s.includes(next)){
  if(!s.includes(old))throw new Error('missing comboAccessible anchor')
  s=s.replace(old,next)
}
if(s!==before){fs.writeFileSync(path,s);console.log('COMBO SEQUENCE ELIGIBILITY MATERIALIZED')}else console.log('COMBO SEQUENCE ELIGIBILITY ALREADY PRESENT')
