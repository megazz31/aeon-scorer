const text=c=>String(c?.oracle||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim().toLowerCase()

export function isOracleLandRamp(card){
  const s=text(card)
  if(!s)return false
  // Search-to-battlefield ramp. Accept singular/plural "land card(s)" and
  // intervening reveal/choice wording (Cultivate/Kodama/Migration/Dragonstorm).
  if(/search your library[^.]{0,220}\b(?:basic )?land cards?\b[^.]{0,260}\bput\b[^.]{0,180}\bonto the battlefield\b/.test(s))return true
  if(/search your library[^.]{0,220}\b(?:plains|island|swamp|mountain|forest)(?: card)?s?\b[^.]{0,260}\bput\b[^.]{0,180}\bonto the battlefield\b/.test(s))return true
  // Direct land deployment from another zone.
  if(/\bput (?:a|one|two|up to [a-z0-9]+|any number of|all)?\s*land cards?[^.]{0,220}\bonto the battlefield\b/.test(s))return true
  if(/\bput [^.]{0,180}\bland cards? from [^.]{0,120}\bonto the battlefield\b/.test(s))return true
  if(/\byou may play an additional land\b/.test(s))return true
  return false
}

export function augmentFunctionalTags(card){
  if(!card)return card
  const tags=Array.isArray(card.tags)?card.tags:[]
  if(tags.includes('land-ramp')||!isOracleLandRamp(card))return card
  return {...card,tags:[...tags,'land-ramp']}
}

export function augmentFeatureDeck(cards=[]){return (cards||[]).map(augmentFunctionalTags)}
