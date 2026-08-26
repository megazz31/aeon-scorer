import fs from 'node:fs'
const path='src/engine/packageGraph.js'
const before=fs.readFileSync(path,'utf8')
let s=before

const roleBlock=`function isEquipmentCard(c){return /\\bartifact\\b[^—\\n]*—[^\\n]*\\bequipment\\b|\\bequipment\\b/i.test(c.type||'')}
function isEquipmentPayoff(c){
  const o=semanticText(c)
  if(!o)return false
  return /\\bwhenever (?:an? |one or more )?equipped creatures?\\b|\\bequipped creatures? you control\\b|\\bwhenever you cast [^.]{0,120}\\bequipment\\b|\\bfor each equipment (?:attached|you control)\\b|\\bfor each aura and equipment attached\\b|\\bfor each equipment attached\\b|\\bequipment attached to (?:it|this creature|that creature)\\b|\\bas long as [^.]{0,100}equipment (?:is|are) attached\\b|\\bwhenever (?:an? )?equipment [^.]{0,100}becomes? attached\\b|\\bif [^.]{0,80}is equipped\\b/.test(o)
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
      out.push({id:m.id,name:m.name,strength:cohesion,cohesion,producers:previewNames(producers),supports:previewNames(supports),payoffs:previewNames(payoffs),members:allNames(members),producerCards:producers.map(mini),supportCards:supports.map(mini),payoffCards:payoffs.map(mini),producerTags:['equipment-type'],supportTags:['equipment-support'],payoffTags:['equipment-payoff'],evidence:\`${'${producers.length}'} équipement(s), ${'${supports.length}'} support(s) de tutor/attache/coût, ${'${payoffs.length}'} payoff(s) qui convertissent réellement l’équipement en avantage.\`})
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

if(s!==before){fs.writeFileSync(path,s);console.log('EQUIPMENT PACKAGE PRECISION MATERIALIZED')}else console.log('EQUIPMENT PACKAGE PRECISION ALREADY PRESENT')
