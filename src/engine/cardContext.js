const stripReminder=text=>{
  let out='',depth=0
  for(const ch of String(text||'')){
    if(ch==='('){depth++;continue}
    if(ch===')'&&depth){depth--;continue}
    if(!depth)out+=ch
  }
  return out.replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim()
}
const clauses=text=>String(text||'').split(/[.\n;]+/).map(x=>x.trim()).filter(Boolean)
const has=(s,re)=>re.test(s)
const recurringWindow=/at the beginning of (?:your|each) (?:upkeep|end step|first main phase)/
const controllerLifePayment=clause=>{
  const c=String(clause||'').toLowerCase()
  if(/\bward\s*[—-]\s*pay\b/.test(c))return false
  if(/\b(?:an? |each |target )?opponents?\b[^.]{0,100}\bpay\b|\bthey (?:may )?pay\b/.test(c))return false
  return /\b(?:you may )?pay (?:\d+|x|that much) life\b|\bpay life equal to\b|\bby paying life equal to\b|\bcan be paid with either [^{]* or \d+ life\b/.test(c)
}

export const CARD_CONTEXT_SEVERITY={
  'lose-game':'critical',
  'harmful-leave':'critical',
  'recurring-sacrifice':'major',
  'recurring-discard':'major',
  'recurring-life-loss':'major',
  'life-payment':'moderate',
  'draw-discard':'moderate',
  'combat-gated-draw':'moderate',
  'temporary-removal':'moderate',
  'self-only-protection':'moderate',
  'alternate-timing':'moderate',
  'defensive-tax':'minor',
  'conditional-lifegain':'minor',
}

export function cardContextFlags(card={}){
  const raw=String(card.oracle||card.oracle_text||'')
  const s=stripReminder(raw).toLowerCase(),tags=card.tags||card.engine_tags||[],flags=[]
  const add=id=>{if(!flags.includes(id))flags.push(id)}
  if(!s)return flags
  const cs=clauses(s),hasRecurringWindow=recurringWindow.test(s)

  if(has(s,/\byou lose the game\b/))add('lose-game')
  if(cs.some(c=>/leaves? the battlefield/.test(c)&&/(?:you discard|you lose [^.]*life|you lose the game|sacrifice (?:a|an|one|two|three|\d+|x) [^.]*\b(?:creature|permanent|artifact|enchantment)s?\b)/.test(c)))add('harmful-leave')
  if(cs.some(c=>recurringWindow.test(c)&&/\bsacrifice (?:a|an|another|one|two|three|\d+|x) [^.]*\b(?:creature|permanent|artifact|enchantment)s?\b/.test(c)))add('recurring-sacrifice')
  if(cs.some(c=>recurringWindow.test(c)&&/\b(?:you )?discard (?:a|one|two|three|\d+|x|all) cards?\b/.test(c)))add('recurring-discard')
  const recurringLifeInSameClause=cs.some(c=>(recurringWindow.test(c)||/^whenever /.test(c))&&/\byou lose (?:\d+|x|that much) life\b/.test(c))
  const recurringModalLife=hasRecurringWindow&&/\bchoose one or more\b/.test(s)&&/\byou lose (?:\d+|x|that much) life\b/.test(s)
  if(recurringLifeInSameClause||recurringModalLife)add('recurring-life-loss')
  if(cs.some(controllerLifePayment))add('life-payment')

  const drawClause=cs.some(c=>/\b(?:you )?draw (?:a|one|two|three|four|five|six|seven|\d+|x|that many|cards? equal to)\b/.test(c)||/\bdraw (?:a|one|two|three|four|five|six|seven|\d+|x|that many) cards?\b/.test(c))
  if(drawClause&&has(s,/\bdiscard (?:a|one|two|three|\d+|x|that many|all) cards?\b/))add('draw-discard')
  if(drawClause&&has(s,/(?:whenever|when) [^.]{0,180}deals? (?:combat )?damage to (?:a player|an opponent)/))add('combat-gated-draw')

  if(has(s,/\bexile target [^.]{0,120}\buntil (?:(?:this|that) [^.]{0,60}|it|the [^.]{0,60}) leaves the battlefield\b/))add('temporary-removal')
  if(tags.includes('protection')&&has(s,/\b(?:this creature|this permanent|this enchantment|this artifact) (?:has|gains?) [^.]{0,80}(?:indestructible|hexproof|ward|protection from)/)&&!has(s,/\b(?:target|another|other|creatures? you control|permanents? you control) [^.]{0,100}(?:gains?|have|has) [^.]{0,80}(?:indestructible|hexproof|ward|protection from)/))add('self-only-protection')
  if(has(s,/\bimpending\b|\bprototype\b|\bevoke\b|\bmiracle\b|\boverload\b/))add('alternate-timing')
  if(tags.includes('stax')&&has(s,/creatures? can'?t attack you unless|can'?t attack you or planeswalkers? you control unless/))add('defensive-tax')
  if(tags.includes('lifegain')&&has(s,/\bif you control [^.]{0,80},? [^.]{0,120}you gain [^.]{0,40}life\b|\botherwise,? you lose [^.]{0,40}life\b/))add('conditional-lifegain')

  return flags
}

export function cardContextSeverity(card={}){
  const order={critical:4,major:3,moderate:2,minor:1}
  let best='none',score=0
  for(const flag of cardContextFlags(card)){
    const level=CARD_CONTEXT_SEVERITY[flag]||'minor',value=order[level]||0
    if(value>score){score=value;best=level}
  }
  return best
}
