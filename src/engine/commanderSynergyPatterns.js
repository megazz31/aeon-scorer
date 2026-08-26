const text=c=>String(c?.oracle||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim().toLowerCase()
const type=c=>String(c?.type||'').toLowerCase()
const uniq=xs=>{const seen=new Set(),out=[];for(const x of xs||[]){const k=String(x?.name||'').toLowerCase();if(k&&!seen.has(k)){seen.add(k);out.push(x)}}return out}

function isCreature(c){return /\bcreature\b/.test(type(c))}
function isEnchantment(c){return /\benchantment\b/.test(type(c))}
function isAura(c){return /\baura\b/.test(type(c))}
function isEquipment(c){return /\bequipment\b/.test(type(c))}
function hasTag(c,t){return Array.isArray(c?.tags)&&c.tags.includes(t)}

function attackSupport(c){
  const o=text(c)
  return isCreature(c)||hasTag(c,'tokens')||/\bwhenever [^.]{0,100} attacks\b|\battacking creatures?\b|\bcreatures? you control (?:get|gain|have)\b|\bdouble strike\b|\bhaste\b|\bbattle cry\b|\bmelee\b/.test(o)
}
function donationSupport(c){
  const o=text(c)
  if(/\b(?:target opponent|target player) gains control\b|\bexchange control\b|\bexchange of words\b/.test(o))return true
  if(!isCreature(c))return false
  return /\bcan['’]?t attack\b|\bcan['’]?t block\b|\bcan['’]?t be sacrificed\b|\bat the beginning of your upkeep\b[^.]{0,140}\b(?:sacrifice|lose life|deals? [^.]*(?:damage )?to you)\b|\bwhen [^.]{0,80} enters\b[^.]{0,140}\b(?:sacrifice|lose life)\b|\byou lose the game\b/.test(o)
}
function exactOneLifeSupport(c){
  const o=text(c)
  return /\b(?:each|target) opponent [^.]{0,80}loses 1 life\b|\bdeals? 1 damage to (?:each|target) opponent\b|\bwhenever [^.]{0,140}(?:opponent|player)[^.]{0,140}(?:draws?|casts?|taps? a land|loses? life)[^.]{0,140}(?:loses 1 life|deals? 1 damage)\b|\bwhenever you cast [^.]{0,100}deals? 1 damage to each opponent\b/.test(o)
}

export function extraCommanderSynergy(cards,commander){
  const o=text(commander),connected=[],tags=[],limitations=[]
  if(/\benchantment creatures? you control have\b/.test(o)||/\btarget non-aura enchantment you control becomes a creature\b/.test(o)){
    tags.push('enchantment-animation')
    connected.push(...(cards||[]).filter(isEnchantment))
    limitations.push('commander-enchantment-animation-combat-not-sequence-simulated')
  }
  if(/\bother creatures you control have melee\b/.test(o)||(/\bmelee\b/.test(o)&&/\bother creatures you control\b/.test(o))){
    tags.push('go-wide-combat')
    connected.push(...(cards||[]).filter(attackSupport))
    limitations.push('go-wide-combat-damage-not-sequence-simulated')
  }
  const transfers=/\b(?:target )?opponent gains control of (?:up to one )?target (?:creature|permanent) you control\b/.test(o)
  const rewardsOwnership=/\b(?:creature|permanent)s? you own (?:but don['’]?t control|that (?:your )?opponents? control)\b/.test(o)
  if(transfers&&rewardsOwnership){
    connected.push(...(cards||[]).filter(donationSupport))
    if(/\bcreature you own but don['’]?t control\b/.test(o)&&/\bgoad/.test(o)){
      tags.push('donation-goad')
      limitations.push('donation-goad-opponent-behavior-not-sequence-simulated')
    }else{
      tags.push('donation-engine')
      limitations.push('donation-value-not-sequence-simulated')
    }
  }
  if(/\bopponents? each lose exactly 1 life\b/.test(o)||/\bopponents? lose exactly 1 life\b/.test(o)){
    tags.push('exact-one-life-loss')
    connected.push(...(cards||[]).filter(exactOneLifeSupport))
    limitations.push('exact-one-life-loss-frequency-conservative')
  }
  if(/\bspend this mana only to activate abilities\b/.test(o)&&/\bput any number of permanent cards from your hand onto the battlefield\b/.test(o)){
    tags.push('activated-ability-compression')
    limitations.push('activated-ability-mana-and-exhaust-compression-not-sequence-simulated')
  }
  if(/\byou may cast (?:aura and equipment|equipment and aura) spells from the top of your library\b/.test(o)){
    tags.push('top-library-aura-equipment')
    connected.push(...(cards||[]).filter(c=>isAura(c)||isEquipment(c)))
    limitations.push('top-library-restricted-cast-not-sequence-simulated')
  }
  return {connected:uniq(connected),tags:[...new Set(tags)],limitations:[...new Set(limitations)]}
}