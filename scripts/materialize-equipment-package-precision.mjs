import fs from 'node:fs'
// Keep structural Equipment cohesion visible; only scoringCohesion is discounted for delayed attach/combat payoffs.
const packagePath='src/engine/packageGraph.js'
const powerPath='src/engine/powerModel.js'
const before=fs.readFileSync(packagePath,'utf8')
let s=before

const roleBlock=`function isEquipmentCard(c){return /\\bartifact\\b[^—\\n]*—[^\\n]*\\bequipment\\b|\\bequipment\\b/i.test(c.type||'')}
function isEquipmentPayoff(c){
  const o=semanticText(c)
  if(!o)return false
  return /\\bwhenever (?:an? |one or more )?equipped creatures?\\b|\\bequipped creatures? you control\\b|\\bwhenever you cast [^.]{0,120}\\bequipment\\b|\\bfor each equipment (?:attached|you control)\\b|\\bfor each aura and equipment attached\\b|\\bfor each equipment attached\\b|\\bequipment attached to (?:it|this creature|that creature)\\b|\\bas long as [^.]{0,100}equipment (?:is|are) attached\\b|\\bwhenever (?:an? )?equipment [^.]{0,100}becomes? attached\\b|\\bif [^.]{0,80}is equipped\\b/.test(o)
}
function isImmediateEquipmentPayoff(c){
  const o=semanticText(c)
  return /\\bwhenever you cast [^.]{0,120}\\bequipment\\b|\\bfor each equipment you control\\b/.test(o)
}
function isEquipmentSupport(c){
  const o=semanticText(c)
  if(!o||isEquipmentPayoff(c))return false
  return /search your library [^.]{0,140}equipment|return [^.]{0,120}equipment [^.]{0,120}graveyard|attach (?:target |an? |this )?equipment|attach [^.]{0,100}equipment|\\bequip (?:ability|abilities|cost|costs)\\b|equipment spells? you cast cost|cast equipment spells? as though|equipment cards? [^.]{0,100}(?:hand|graveyard|battlefield)/.test(o)
}
`
{
  const start=s.indexOf('function isEquipmentCard(c)')
  const end=s.indexOf('function isEnchantmentCastPayoff(c)')
  if(start<0||end<=start)throw new Error('missing Equipment role anchors')
  const current=s.slice(start,end)
  if(current!==roleBlock)s=s.slice(0,start)+roleBlock+s.slice(end)
}

const packageBlock=`    if(m.special==='equipment'){
      const producers=uniqByName(functionalPool.filter(isEquipmentCard))
      const supports=uniqByName(functionalPool.filter(c=>!isEquipmentCard(c)&&isEquipmentSupport(c)))
      const commanderPayoff=commander&&!isEquipmentCard(commander)&&isEquipmentPayoff(commander)?[commander]:[]
      const payoffs=uniqByName([...functionalPool.filter(c=>!isEquipmentCard(c)&&isEquipmentPayoff(c)),...commanderPayoff])
      if(producers.length<4||payoffs.length<1)continue
      const members=uniqByName([...producers,...supports,...payoffs]),density=members.filter(c=>c!==commander).length/Math.max(1,nonlands.length),effectivePayoffDepth=payoffs.length+Math.min(supports.length,producers.length)*.35,balance=Math.min(producers.length,effectivePayoffDepth)/Math.max(producers.length,effectivePayoffDepth),cohesion=Math.min(100,Math.round(24+members.length*3.0+density*46+balance*16))
      const sequencePayoffs=payoffs.filter(isImmediateEquipmentPayoff),sequencePayoffRatio=sequencePayoffs.length/Math.max(1,payoffs.length),scoringCohesion=Math.min(cohesion,Math.round(cohesion*(.35+sequencePayoffRatio*.65)))
      out.push({id:m.id,name:m.name,strength:cohesion,cohesion,scoringCohesion,sequencePayoffRatio:Number(sequencePayoffRatio.toFixed(3)),producers:previewNames(producers),supports:previewNames(supports),payoffs:previewNames(payoffs),sequencePayoffs:previewNames(sequencePayoffs),members:allNames(members),producerCards:producers.map(mini),supportCards:supports.map(mini),payoffCards:payoffs.map(mini),producerTags:['equipment-type'],supportTags:['equipment-support'],payoffTags:['equipment-payoff'],evidence:\`${producers.length} équipement(s), ${supports.length} support(s) de tutor/attache/coût, ${payoffs.length} payoff(s) structurel(s), ${sequencePayoffs.length}/${payoffs.length} immédiatement actif(s) pour le scoring.\`})
      continue
    }
`
{
  const start=s.indexOf("    if(m.special==='equipment'){")
  const end=s.indexOf('    let producers=roleCards(functionalPool,m.producers)',start)
  if(start<0||end<=start)throw new Error('missing Equipment package anchors')
  const current=s.slice(start,end)
  if(current!==packageBlock)s=s.slice(0,start)+packageBlock+s.slice(end)
}

const powerBefore=fs.readFileSync(powerPath,'utf8')
let p=powerBefore
const oldWeighted="function weightedPackageCohesion(packages){const weights=[1,.65,.4],top=packages.slice(0,3);if(!top.length)return 0;return top.reduce((s,p,i)=>s+(p.cohesion??p.strength??0)*weights[i],0)/weights.slice(0,top.length).reduce((a,b)=>a+b,0)}"
const newWeighted="function weightedPackageCohesion(packages){const weights=[1,.65,.4],value=p=>p.scoringCohesion??p.cohesion??p.strength??0,top=[...packages].sort((a,b)=>value(b)-value(a)).slice(0,3);if(!top.length)return 0;return top.reduce((s,p,i)=>s+value(p)*weights[i],0)/weights.slice(0,top.length).reduce((a,b)=>a+b,0)}"
if(p.includes(oldWeighted))p=p.replace(oldWeighted,newWeighted)
else if(!p.includes(newWeighted))throw new Error('missing weightedPackageCohesion anchor')

const packageChanged=s!==before,powerChanged=p!==powerBefore
if(packageChanged)fs.writeFileSync(packagePath,s)
if(powerChanged)fs.writeFileSync(powerPath,p)
if(packageChanged||powerChanged)console.log('EQUIPMENT SCORING COHESION MATERIALIZED')
else console.log('EQUIPMENT SCORING COHESION ALREADY PRESENT')
