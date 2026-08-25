import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`semantic16 ramp planner patch: missing ${label}`)
  return source.replace(before, after)
}

const singlePath='src/engine/sequenceSimulator.js'
let single=fs.readFileSync(singlePath,'utf8')

single=replaceOnce(single,
`const isBurst=c=>c.tags.includes('burst-mana')
const isPermanentRamp=c=>!c.isLand&&!isBurst(c)&&(isImmediateLandRamp(c)||(isPermanentCard(c)&&(c.sourceColors?.length||0)>0))&&(c.cmc||0)<=3`,
`const isBurst=c=>c.tags.includes('burst-mana')
const numberWord=w=>({one:1,two:2,three:3,four:4,five:5,six:6}[String(w||'').toLowerCase()]||Number(w)||0)
export function immediateLandRampNetSources(c){
  if(!isImmediateLandRamp(c))return 0
  const o=String(c?.oracle||'').replace(/\\([^)]*\\)/g,' ').replace(/\\s+/g,' ').trim().toLowerCase()
  let entered=1
  if(!/put one (?:of (?:them|those cards) )?onto the battlefield/.test(o)){
    const m=o.match(/search your library for (?:up to )?(one|two|three|four|five|six|\\d+) [^.;]{0,100}\\b(?:basic land|plains|island|swamp|mountain|forest|land) cards?\\b/)
    if(m&&/put (?:them|those cards) onto the battlefield/.test(o))entered=Math.max(1,numberWord(m[1]))
  }
  const landSacrifice=/additional cost[^.]{0,100}sacrifice (?:a|one) land|sacrifice (?:a|one) land[^.:]{0,80}:/.test(o)?1:0
  return Math.max(0,entered-landSacrifice)
}
const isPermanentRamp=c=>{if(c.isLand||isBurst(c))return false;const landRamp=immediateLandRampNetSources(c),manaPermanent=isPermanentCard(c)&&(c.sourceColors?.length||0)>0;if(!landRamp&&!manaPermanent)return false;return (c.cmc||0)<=3||(landRamp>=2&&(c.cmc||0)<=4)}`,
'land-ramp net source helper')

single=replaceOnce(single,
`function permanentRampSources(c,commander,support={}){const landRamp=isImmediateLandRamp(c),colors=support.colors?.length?support.colors:landRamp?(commander?.manaReq?.colored?.flat()||['W','U','B','R','G']):(c.sourceColors?.length?c.sourceColors:['C']);const count=landRamp?1:productionCount(c);return Array.from({length:count},()=>source(colors.length?colors:['C'],c.name))}
function rampValue(c){return productionCount(c)-Number(c.cmc||0)+(isArtifact(c)?0.25:0)}`,
`function permanentRampSources(c,commander,support={}){const landRamp=immediateLandRampNetSources(c),colors=support.colors?.length?support.colors:landRamp?(commander?.manaReq?.colored?.flat()||['W','U','B','R','G']):(c.sourceColors?.length?c.sourceColors:['C']);const count=landRamp||productionCount(c);return Array.from({length:count},()=>source(colors.length?colors:['C'],c.name))}
function rampValue(c){const landRamp=immediateLandRampNetSources(c),output=landRamp||productionCount(c);return output-Number(c.cmc||0)+(isArtifact(c)?0.25:0)}`,
'land-ramp source count')

single=replaceOnce(single,
`function castCommanderReducerSetup(hand,used,battlefield,turnSources,commander){let remaining=turnSources,casts=0;for(let n=0;n<3;n++){const candidates=hand.filter(c=>!used.has(c)&&isPermanentCard(c)&&typeCostReducerMatches(c,commander)&&(c.cmc||0)<=3&&canPay(c,remaining)).sort((a,b)=>(a.cmc||0)-(b.cmc||0)||(typeCostReductionProfile(b)?.amount||0)-(typeCostReductionProfile(a)?.amount||0)||a.name.localeCompare(b.name));const c=candidates[0];if(!c)break;const next=payAndRemain(c,remaining);if(!next)break;used.add(c);battlefield.push(c);remaining=next;casts++}return {remaining,casts}}`,
`function castCommanderReducerSetup(hand,used,battlefield,turnSources,commander){let remaining=turnSources,casts=0;for(let n=0;n<3;n++){const commanderSources=potentialSources(remaining,hand,used,true,battlefield),existingReduction=typeGenericReduction(commander,battlefield);if(canPay(commander,commanderSources,0,existingReduction))break;const candidates=hand.filter(c=>!used.has(c)&&isPermanentCard(c)&&typeCostReducerMatches(c,commander)&&(c.cmc||0)<=3&&canPay(c,remaining)).sort((a,b)=>(a.cmc||0)-(b.cmc||0)||(typeCostReductionProfile(b)?.amount||0)-(typeCostReductionProfile(a)?.amount||0)||a.name.localeCompare(b.name));const c=candidates[0];if(!c)break;const next=payAndRemain(c,remaining);if(!next)break;used.add(c);battlefield.push(c);remaining=next;casts++}return {remaining,casts}}`,
'reducer commander-priority guard')

single=replaceOnce(single,
`function keepOpeningHand(hand){const lands=hand.filter(c=>c.isLand).length,early=hand.some(c=>!c.isLand&&((c.cmc||0)<=2||c.tags?.includes('fast-mana')||isImmediateLandRamp(c)));return lands>=2&&lands<=5&&early}`,
`function keepOpeningHand(hand){const lands=hand.filter(c=>c.isLand).length,early=hand.some(c=>{if(c.isLand)return false;const ramp=immediateLandRampNetSources(c);return (c.cmc||0)<=2||c.tags?.includes('fast-mana')||(ramp>0&&((c.cmc||0)<=2||lands>=3))});return lands>=2&&lands<=5&&early}`,
'mulligan ramp quality')

single=replaceOnce(single,
`  let v=0;if(c.tags?.includes('fast-mana')||isImmediateLandRamp(c))v+=8;if((c.cmc||0)<=2)v+=4;if(c.tags?.includes('draw')||c.interaction>0)v+=2;if((c.cmc||0)>=5)v-=4;if((c.cmc||0)>=7)v-=2;return v`,
`  let v=0;const ramp=immediateLandRampNetSources(c);if(c.tags?.includes('fast-mana'))v+=8;if(ramp)v+=(c.cmc||0)<=2?8:(c.cmc||0)===3?5:ramp>=2?4:2;if((c.cmc||0)<=2)v+=4;if(c.tags?.includes('draw')||c.interaction>0)v+=2;if((c.cmc||0)>=5)v-=4;if((c.cmc||0)>=7)v-=2;return v`,
'London bottom ramp quality')

single=replaceOnce(single,
`      for(let rampCasts=0;rampCasts<8;rampCasts++){
        const rampCandidates=castableCards(hand,used,turnSources,isPermanentRamp).map(card=>({card,support:permanentRampSupport(card,hand,used,battlefield,commander)})).filter(x=>x.support).sort((a,b)=>rampValue(b.card)-rampValue(a.card)||(a.card.cmc||0)-(b.card.cmc||0))`,
`      for(let rampCasts=0;rampCasts<8;rampCasts++){
        const commanderNowSources=commander&&cmdTurn==null?potentialSources(turnSources,hand,used,true,battlefield):[],commanderNowReduction=commander&&cmdTurn==null?typeGenericReduction(commander,battlefield):0
        if(commander&&cmdTurn==null&&canPay(commander,commanderNowSources,0,commanderNowReduction))break
        const rampCandidates=castableCards(hand,used,turnSources,isPermanentRamp).map(card=>({card,support:permanentRampSupport(card,hand,used,battlefield,commander)})).filter(x=>x.support).sort((a,b)=>rampValue(b.card)-rampValue(a.card)||(a.card.cmc||0)-(b.card.cmc||0))`,
'single commander ramp priority')

fs.writeFileSync(singlePath,single)

const multiPath='src/engine/sequenceSimulatorMulti.js'
let multi=fs.readFileSync(multiPath,'utf8')
multi=replaceOnce(multi,
`import { landManaSources,permanentRampSupport,burstNetSources,canPay,applyCommanderLondonBottom } from './sequenceSimulator.js'`,
`import { landManaSources,permanentRampSupport,burstNetSources,canPay,applyCommanderLondonBottom,immediateLandRampNetSources } from './sequenceSimulator.js'`,
'multi ramp helper import')
multi=replaceOnce(multi,
`const isBurst=c=>c.tags.includes('burst-mana')
const isPermanentRamp=c=>!c.isLand&&!isBurst(c)&&(isImmediateLandRamp(c)||(isPermanentCard(c)&&(c.sourceColors?.length||0)>0))&&(c.cmc||0)<=3`,
`const isBurst=c=>c.tags.includes('burst-mana')
const isPermanentRamp=c=>{if(c.isLand||isBurst(c))return false;const landRamp=immediateLandRampNetSources(c),manaPermanent=isPermanentCard(c)&&(c.sourceColors?.length||0)>0;if(!landRamp&&!manaPermanent)return false;return (c.cmc||0)<=3||(landRamp>=2&&(c.cmc||0)<=4)}`,
'multi ramp eligibility')
multi=replaceOnce(multi,
`function permanentRampSources(c,priority,support={}){const landRamp=isImmediateLandRamp(c),colors=support.colors?.length?support.colors:landRamp?(priority?.manaReq?.colored?.flat()||['W','U','B','R','G']):(c.sourceColors?.length?c.sourceColors:['C']);const count=landRamp?1:productionCount(c);return Array.from({length:count},()=>source(colors.length?colors:['C'],c.name))}
function rampValue(c){return productionCount(c)-Number(c.cmc||0)+(isArtifact(c)?0.25:0)}`,
`function permanentRampSources(c,priority,support={}){const landRamp=immediateLandRampNetSources(c),colors=support.colors?.length?support.colors:landRamp?(priority?.manaReq?.colored?.flat()||['W','U','B','R','G']):(c.sourceColors?.length?c.sourceColors:['C']);const count=landRamp||productionCount(c);return Array.from({length:count},()=>source(colors.length?colors:['C'],c.name))}
function rampValue(c){const landRamp=immediateLandRampNetSources(c),output=landRamp||productionCount(c);return output-Number(c.cmc||0)+(isArtifact(c)?0.25:0)}`,
'multi ramp source count')
multi=replaceOnce(multi,
`function keepOpeningHand(hand){const lands=hand.filter(c=>c.isLand).length,early=hand.some(c=>!c.isLand&&((c.cmc||0)<=2||c.tags?.includes('fast-mana')||isImmediateLandRamp(c)));return lands>=2&&lands<=5&&early}`,
`function keepOpeningHand(hand){const lands=hand.filter(c=>c.isLand).length,early=hand.some(c=>{if(c.isLand)return false;const ramp=immediateLandRampNetSources(c);return (c.cmc||0)<=2||c.tags?.includes('fast-mana')||(ramp>0&&((c.cmc||0)<=2||lands>=3))});return lands>=2&&lands<=5&&early}`,
'multi mulligan ramp quality')
multi=replaceOnce(multi,
`      for(let rampCasts=0;rampCasts<8;rampCasts++){
        const rampCandidates=castableCards(hand,used,turnSources,isPermanentRamp).map(card=>({card,support:permanentRampSupport(card,hand,used,battlefield,priority)})).filter(x=>x.support).sort((a,b)=>rampValue(b.card)-rampValue(a.card)||(a.card.cmc||0)-(b.card.cmc||0))`,
`      for(let rampCasts=0;rampCasts<8;rampCasts++){
        const commanderNowSources=potentialSources(turnSources,hand,used,true,battlefield)
        if(planCommanderCasts(cmd,cmdTurns,castCounts,commanderNowSources).indices.length)break
        const rampCandidates=castableCards(hand,used,turnSources,isPermanentRamp).map(card=>({card,support:permanentRampSupport(card,hand,used,battlefield,priority)})).filter(x=>x.support).sort((a,b)=>rampValue(b.card)-rampValue(a.card)||(a.card.cmc||0)-(b.card.cmc||0))`,
'multi commander ramp priority')
fs.writeFileSync(multiPath,multi)
console.log('SEMANTIC16 RAMP PLANNER PATCH APPLIED')
