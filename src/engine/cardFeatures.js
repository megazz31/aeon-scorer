const clamp=(n,a=0,b=10)=>Math.max(a,Math.min(b,n))
const textOf=c=>(c.oracle||'').replace(/\s+/g,' ').trim()
const lower=c=>textOf(c).toLowerCase()
const typeLower=c=>(c.type||'').toLowerCase()
const unique=xs=>[...new Set(xs)]
const clauses=text=>String(text||'').split(/[.\n;]+/).map(x=>x.trim()).filter(Boolean)
function withoutReminderText(text){let out='',depth=0;for(const ch of String(text||'')){if(ch==='('){depth++;continue}if(ch===')'&&depth){depth--;continue}if(!depth)out+=ch}return out.replace(/\s+/g,' ').trim()}
function escapedName(card){return (card.name||'').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

function isOwnTargetClause(s){return /you control|you own|your graveyard|your hand/.test(s)}
function isBlinkText(o){return /exile [^.\n;]{0,140}(?:you control|another target|one other target|target creature)[^.\n;]{0,140}(?:return|returns) [^.\n;]{0,140}(?:battlefield|under its owner)/i.test(o)||/exile [^.\n;]{0,180}you control\.[^.\n;]{0,180}return (?:that card|those cards|them)[^.\n;]{0,180}battlefield/i.test(o)||/exile [^.\n;]{0,120} until [^.\n;]{0,120} returns? to the battlefield/i.test(o)||/flicker/i.test(o)}
function isTemporaryInteraction(o){const s=o.toLowerCase();return /exile (?:up to )?(?:one other |one |another )?target [^.\n;]+/.test(s)&&!/target [^.\n;]+ you control/.test(s)&&/return (?:that card|it|them|those cards)[^.\n;]+battlefield/.test(s)}
function isTargetRemoval(o){const temporary=isTemporaryInteraction(o);for(const c of clauses(o.toLowerCase())){if(isOwnTargetClause(c))continue;if(/destroy target /.test(c))return true;if(/exile (?:up to )?(?:one other |one |another )?target /.test(c)&&!temporary&&!/return .*battlefield/.test(c))return true;if(/return target [^.]+ to (?:its|their|that player's|owner'?s) hand/.test(c))return true;if(/target [^.]+ gets -(?:\d+|x)\/-(?:\d+|x)/.test(c))return true}return false}
function isTutor(o){const s=o.toLowerCase(),search=clauses(s).find(c=>/search your library(?: and\/or your graveyard)? for /.test(c));if(!search)return false;const landOnly=/ for [^.]*\b(?:basic land|land card|plains(?: card)?|island(?: card)?|swamp(?: card)?|mountain(?: card)?|forest(?: card)?)\b/.test(search);return !landOnly}
function isRepeatableTutor(card,o){const s=o.toLowerCase();if(/at the beginning [^.]*search your library|whenever [^.]*search your library/.test(s))return true;if(!/:\s*search your library/.test(s))return false;const name=escapedName(card);if(name&&new RegExp(`(?:sacrifice|exile) ${name}[^:]*:`).test(s))return false;return true}
function isLandRamp(o){const s=o.toLowerCase();return /search your library [^.]*\b(?:land card|plains|island|swamp|mountain|forest)\b[^.]*put [^.]*onto the battlefield/.test(s)||/put (?:a|one|up to one) land card [^.]*onto the battlefield/.test(s)||/you may play an additional land/.test(s)}
function isRecursion(o){const s=o.toLowerCase();return /return [^.]* from (?:your|a) graveyard/.test(s)||/cast [^.]* from your graveyard/.test(s)||/play [^.]* from your graveyard/.test(s)||/search your library and\/or your graveyard for [^.]*put [^.]*onto the battlefield/.test(s)}
function isGraveSetup(o){const s=o.toLowerCase();return /\bmill \d|\bmill x|surveil|discard (?:a|one|two|three|x) cards?|put the top [^.]*cards? of (?:your|a) library into (?:your|its) graveyard/.test(s)}
function isDrawSource(o){
  const s=withoutReminderText(o).toLowerCase()
  return clauses(s).some(c=>{
    if(/\b(?:whenever|if) you (?:would )?draw\b/.test(c)&&!/,\s*(?:you may )?draw\b/.test(c))return false
    if(/\b(?:each |target )?opponents? draws?\b/.test(c)&&!/\byou (?:may )?draw\b/.test(c))return false
    return /\byou (?:may )?draw (?:a|one|two|three|four|five|\d+|x|that many|up to [a-z]+) cards?\b/.test(c)
      || /(?:^|,|\bthen\b|\band\b)\s*(?:you may )?draw (?:a|one|two|three|four|five|\d+|x|that many|up to [a-z]+) cards?\b/.test(c)
      || /\beach player draws? (?:a|one|two|three|four|five|\d+|x) cards?\b/.test(c)
      || /\btarget player draws? (?:a|one|two|three|four|five|\d+|x) cards?\b/.test(c)
  })
}
function isSacOutlet(card,o){const s=withoutReminderText(o).toLowerCase(),name=escapedName(card);if(name&&new RegExp(`sacrifice ${name}`).test(s))return false;return /sacrifice (?:another |a |an |one or more )?(?:creature|artifact|permanent|token)[^:]{0,80}:/.test(s)}
function isSacEnabler(card,o){const s=withoutReminderText(o).toLowerCase(),name=escapedName(card);if(name&&new RegExp(`sacrifice ${name}`).test(s))return false;return /as an additional cost to cast [^.]*sacrifice (?:another |a |an )?(?:creature|artifact|permanent|token)/.test(s)||/when you cast [^.]*you may sacrifice (?:another |a |an )?(?:creature|artifact|permanent|token)/.test(s)}
function counterRoles(o){const s=o.toLowerCase(),producer=/put (?:a |one |two |three |x )?(?:\+1\/\+1 |[-+]?\d+\/[-+]?\d+ )?counters? on|proliferate/.test(s),payoff=/for each [^.]*counter|with (?:a|one or more|\w+) counters? on|has (?:a|one or more|\w+) counters? on|remove (?:a|one|\w+) counters? from|whenever one or more counters? (?:are|is) put/.test(s),doubler=/twice that many(?: of those)? counters|double the number of [^.]*counters|additional [^.]*counter would be put|that many plus one [^.]*counters/.test(s);return {producer,payoff,doubler}}
function tokenRoles(o){const s=o.toLowerCase(),producer=/create [^.]* tokens?/.test(s),payoff=/tokens? you control|creature tokens? [^.]* (?:get|have)|whenever [^.]*token[^.]*enters|whenever one or more tokens|sacrifice (?:a|one or more) tokens?/.test(s),doubler=/if [^.]*would create [^.]*token[^.]*twice|twice that many [^.]*tokens|create twice that many [^.]*tokens/.test(s);return {producer,payoff,doubler}}
const triggerDoubler=o=>/triggers? an additional time|trigger an additional time|causes? [^.]* ability to trigger an additional time/i.test(o)
function artifactPayoff(o){const s=withoutReminderText(o).toLowerCase();return clauses(s).some(c=>{if(/opponent/.test(c)&&/artifact/.test(c)&&!/artifacts? you control/.test(c))return false;return /artifacts? you control/.test(c)||/whenever (?:an|another|one or more) artifacts? [^.]*enters[^.]*under your control/.test(c)||/whenever you cast (?:an? )?artifact/.test(c)||/artifact spells? you cast/.test(c)||/for each artifact you control/.test(c)||/whenever you sacrifice (?:an|another|one or more) artifacts?/.test(c)||/whenever (?:an|another) artifact you control [^.]*graveyard/.test(c)})}
const constellation=o=>/\bconstellation\b|whenever an enchantment [^.]* enters|whenever another enchantment [^.]* enters/i.test(o)
function spellslinger(o){const s=withoutReminderText(o).toLowerCase(),kind='(?:instant or sorcery|instant and sorcery|instant|sorcery|noncreature)';return /\bmagecraft\b/.test(s)||new RegExp(`\\bwhenever you (?:cast|cast or copy|copy) (?:an? )?${kind} spell`).test(s)||new RegExp(`\\b${kind} spells? you cast\\b`).test(s)||/\byou may cast (?:an? )?instant or sorcery spell\b/.test(s)||/\bcopy target instant or sorcery spell you control\b/.test(s)||/\bfirst (?:instant|sorcery|noncreature )?spell you cast\b/.test(s)}
function exileCast(o){const s=withoutReminderText(o).toLowerCase();return /\b(?:cast|play) [^.]{0,140} from exile\b/.test(s)||/\bexile .{0,280}\b(?:you may|you can) (?:play|cast)\b/.test(s)||/\bexile .{0,280}\bcast (?:it|them|those cards|any number|that card)\b/.test(s)||/\bplay (?:a land|lands?|a card|cards?) or cast (?:a spell|spells?) from among cards? exiled\b/.test(s)}
function exilePayoff(o){const s=withoutReminderText(o).toLowerCase();return /\bwhenever (?:you|a player) (?:cast|casts|play|plays) [^.]{0,140} from exile\b/.test(s)||/\bif you (?:cast|play) [^.]{0,140} from exile\b/.test(s)||/\b(?:spell|spells|card|cards) you (?:cast|play) from exile\b/.test(s)||/\bfirst spell you cast from exile\b/.test(s)}
const manaText=o=>/add \{|add one mana|add two mana|add three mana|add four mana|treasure token/i.test(o)
function fastManaKind(card,o){const n=(card.name||'').toLowerCase();if(/dark ritual|cabal ritual|culling the weak|rite of flame|lotus petal|elvish spirit guide|simian spirit guide|jeweled lotus|lion's eye diamond|mana vault|grim monolith/.test(n))return 'burst';if(/sol ring|mana crypt|chrome mox|mox diamond|mox opal|mox amber/.test(n))return 'persistent';if(Number(card.cmc||0)<=1&&/sacrifice [^.]*: add (?:\{|three mana|two mana)/i.test(o))return 'burst';return null}
function protection(o){const s=o.toLowerCase();return /hexproof|indestructible|phase out|protection from|counter target spell [^.]*targets?/.test(s)||(isBlinkText(o)&&/you control/.test(s))}

export function tagsFor(card){
  const o=textOf(card),semantic=withoutReminderText(o),t=typeLower(card),tags=[],add=x=>{if(x&&!tags.includes(x))tags.push(x)},counters=counterRoles(semantic),tokens=tokenRoles(semantic),fm=fastManaKind(card,semantic)
  if(/\bland\b/.test(t))add('land');if(/\bcreature\b/.test(t))add('creature');if(/\benchantment\b/.test(t))add('enchantment');if(/\bartifact\b/.test(t))add('artifact');if(/\binstant\b/.test(t))add('instant');if(/\bsorcery\b/.test(t))add('sorcery')
  if(isDrawSource(semantic))add('draw')
  if(isTutor(semantic)){add('tutor');if(isRepeatableTutor(card,semantic))add('repeatable-tutor')}
  if(isLandRamp(semantic))add('land-ramp');if(manaText(semantic))add('mana');if(fm){add('fast-mana');add('mana');if(fm==='burst')add('burst-mana')}
  if(isTargetRemoval(semantic))add('removal');if(isTemporaryInteraction(semantic)){add('tempo-interaction');add('blink')}
  if(/counter target (?:spell|activated ability|triggered ability)/i.test(semantic))add('counterspell')
  if(/destroy all|exile all|each player sacrifices|all creatures get -|return all [^.]* to their owners/i.test(semantic))add('wipe')
  if(protection(semantic))add('protection');if(isRecursion(semantic))add('recursion');if(isGraveSetup(semantic))add('graveyard-setup')
  if(tokens.producer)add('tokens');if(tokens.payoff)add('token-payoff');if(tokens.doubler){add('token-doubler');add('token-payoff')}
  if(/\bsacrifice\b/i.test(semantic))add('sacrifice');if(isSacOutlet(card,semantic))add('sac-outlet');if(isSacEnabler(card,semantic))add('sac-enabler');if(/whenever [^.]* dies|whenever you sacrifice|when [^.]* dies/i.test(semantic))add('death-payoff')
  if(/enters(?: the battlefield)?|whenever [^.]* enters/i.test(semantic))add('etb');if(isBlinkText(semantic))add('blink');if(constellation(semantic))add('constellation');if(artifactPayoff(semantic))add('artifact-payoff');if(/\blandfall\b|whenever a land [^.]* enters/i.test(semantic))add('landfall')
  if(counters.producer)add('counter-producer');if(counters.payoff)add('counter-payoff');if(counters.doubler){add('counter-doubler');add('counter-payoff')}
  if(/gain [^.]* life|lifelink/i.test(semantic))add('lifegain');if(/whenever you gain life|if you gained life|each opponent loses/i.test(semantic))add('life-payoff')
  if(spellslinger(semantic))add('spellslinger');if(exileCast(semantic))add('exile-cast');if(exilePayoff(semantic))add('exile-payoff')
  if(/without paying [^.]* mana cost|put [^.]* onto the battlefield from your (?:hand|library)/i.test(semantic))add('cheat');if(/without paying [^.]* mana cost|rather than pay [^.]* mana cost/i.test(semantic))add('free')
  if(/opponents can'?t|players can'?t|spells cost [^.]* more|unless [^.]* pays|skip [^.]* step/i.test(semantic))add('stax');if(/take an extra turn/i.test(semantic))add('extra-turn');if(/additional combat|extra combat/i.test(semantic))add('extra-combat');if(/you win the game|target opponent loses the game/i.test(semantic))add('win');if(triggerDoubler(semantic))add('trigger-doubler')
  return unique(tags)
}

function manaValueScore(cmc){if(cmc<=0)return 1;if(cmc<=1)return .95;if(cmc<=2)return .85;if(cmc<=3)return .72;if(cmc<=4)return .58;if(cmc<=5)return .46;if(cmc<=6)return .35;return .25}
export function manaRequirement(card){const symbols=[...String(card.manaCost||'').matchAll(/\{([^}]+)\}/g)].map(m=>m[1].toUpperCase()),colored=[];let generic=0;for(const sym of symbols){if(/^\d+$/.test(sym)){generic+=Number(sym);continue}if(sym==='X'||sym==='Y'||sym==='Z')continue;if(/^[WUBRGC]$/.test(sym)){colored.push([sym]);continue}const opts=sym.split('/').filter(x=>/^[WUBRGC]$/.test(x));if(opts.length)colored.push(opts)}return {generic,colored,total:Number(card.cmc||generic+colored.length)}}
export function sourceColors(card){const pm=Array.isArray(card.producedMana)?card.producedMana:[];if(pm.length)return unique(pm.map(x=>String(x).toUpperCase()).filter(x=>/^[WUBRGC]$/.test(x)));const t=typeLower(card),o=lower(card),out=[];if(/plains/.test(t))out.push('W');if(/island/.test(t))out.push('U');if(/swamp/.test(t))out.push('B');if(/mountain/.test(t))out.push('R');if(/forest/.test(t))out.push('G');if(/\badd (?:one )?mana of any color\b|\badd one mana of any type that a land you control could produce\b/.test(o))return ['W','U','B','R','G'];for(const c of ['W','U','B','R','G','C'])if(new RegExp(`\\badd \\{${c}\\}`,'i').test(o))out.push(c);return unique(out)}

export function cardFeatures(card){
  const o=lower(card),t=typeLower(card),tags=tagsFor(card),has=x=>tags.includes(x),isLand=t.includes('land'),isCreature=t.includes('creature'),cmc=Number(card.cmc||0)
  let development=0;if(has('mana'))development+=1;if(has('land-ramp'))development+=1;if(has('draw'))development+=1.1;if(has('tutor'))development+=1.15;if(has('tokens'))development+=.45;if(has('cheat'))development+=1.15;if(has('trigger-doubler')||has('token-doubler')||has('counter-doubler'))development+=.8
  let interaction=0;if(has('removal'))interaction+=1;if(has('tempo-interaction'))interaction+=.65;if(has('counterspell'))interaction+=1.1;if(has('wipe'))interaction+=1.5;if(has('stax'))interaction+=1
  let resilience=0;if(has('draw'))resilience+=.7;if(has('recursion'))resilience+=1;if(has('protection'))resilience+=.85
  let explosiveness=0;if(has('fast-mana'))explosiveness+=1.5;if(has('free'))explosiveness+=1.1;if(has('cheat'))explosiveness+=1.05;if(has('extra-turn'))explosiveness+=2;if(has('extra-combat'))explosiveness+=1;if(has('trigger-doubler')||has('token-doubler'))explosiveness+=.55;if(has('win'))explosiveness+=2;if(/\bstorm\b/.test(o))explosiveness+=1
  let standalone=.7;if(interaction)standalone+=.4;if(has('draw'))standalone+=.3;if(has('protection'))standalone+=.2;if(/if you control|as long as you control|only if|unless you control/.test(o))standalone-=.3;if(/whenever another|for each other|equal to the number of/.test(o))standalone-=.12;standalone=clamp(standalone,.1,1.5)
  const recurring=/at the beginning|whenever|each [^.]* step|once each turn/.test(o)?1:0,immediacy=/enters|haste|flash/.test(o)||has('instant')?1:0,efficiency=manaValueScore(cmc)
  return {...card,tags,isLand,isCreature,development,interaction,resilience,explosiveness,standalone,recurring,immediacy,efficiency,manaReq:manaRequirement(card),sourceColors:sourceColors(card)}
}
export function featureDeck(cards){return cards.map(cardFeatures)}