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
function deathPayoff(o){
  const s=withoutReminderText(o).toLowerCase()
  const grantedToOpponent=/target creature an opponent controls[^.]{0,180}(?:has|gains)[^.]{0,140}when(?:ever)? this creature dies/.test(s)
  const opponentAura=/enchant creature an opponent controls[^.]{0,180}when enchanted creature dies/.test(s)
  return clauses(s).some(c=>{
    if(/\bwhenever you sacrifice\b/.test(c))return true
    if(!/\b(?:dies|die)\b/.test(c))return false
    if(grantedToOpponent&&/when(?:ever)? this creature dies/.test(c))return false
    if(opponentAura&&/when enchanted creature dies/.test(c))return false
    if(/creature dealt damage by this creature[^.]*dies/.test(c)&&!/you control/.test(c))return false
    const opponentOnly=/(?:creature|permanent|artifact|planeswalker) an opponent controls dies|blocking creature an opponent controls dies|creatures? your opponents control die/.test(c)
    const ownOrAny=/this (?:creature|permanent|artifact|enchantment) dies|another [^.]* you control dies|(?:a|another|one or more|one or more other|nontoken|token) [^.]{0,70} you control (?:dies|die)|attacking creature you control [^.]* dies|\banother creature dies\b|\ba creature dies\b|\bone or more creatures die\b|\bnontoken creature dies\b/.test(c)
    if(opponentOnly&&!/you control [^.]* (?:dies|die)|attacking creature you control/.test(c))return false
    return ownOrAny
  })
}
function counterKinds(o){
  const s=o.toLowerCase(),out=[],add=k=>{if(!out.includes(k))out.push(k)}
  for(const [kind,re] of [
    ['plus1',/\+1\/\+1 counters?/],['minus1',/-1\/-1 counters?/],['charge',/charge counters?/],['poison',/poison counters?/],['stun',/stun counters?/],['shield',/shield counters?/],['lore',/lore counters?/],['time',/time counters?/],['oil',/oil counters?/],['experience',/experience counters?/],['energy',/energy counters?|\{e\}/],['rad',/rad counters?/],['loyalty',/loyalty counters?/],['finality',/finality counters?/],['quest',/quest counters?/],['storage',/storage counters?/],['muster',/muster counters?/],['verse',/verse counters?/],['brick',/brick counters?/],['age',/age counters?/],['fate',/fate counters?/],['spore',/spore counters?/],['slime',/slime counters?/]
  ])if(re.test(s))add(kind)
  if(/\bproliferate\b/.test(s))add('wild')
  const concrete=out.some(k=>k!=='wild'&&k!=='generic')
  if(/each kind of counter|different kinds? of counters|number of counters? (?:on|among|removed)/.test(s)||(!concrete&&/for each [^.]*counter|for each counter removed/.test(s)))add('any')
  if(!out.length&&/\bcounters?\b/.test(s))add('generic')
  return out
}
function counterRoles(o){
  const s=o.toLowerCase(),putCounter=/put (?:a |one |two |three |x |up to [a-z]+ )?(?:\+1\/\+1 |[-+]?\d+\/[-+]?\d+ )?counters? on/,
    producer=clauses(s).some(c=>{const actionable=c.replace(/\b(?:if|whenever) you put [^,]*counters? on[^,]*(?:,\s*|$)/,'');return putCounter.test(actionable)||/enters(?: the battlefield)? with [^.]*counters? on/.test(actionable)||/\bproliferate\b/.test(actionable)}),
    removeOwn=/remove (?:a|one|two|three|x|any number of) counters? from [^.]{0,100}(?:you control|this)/.test(s),
    payoff=/for each [^.]*counter|with (?:a|one or more|\w+) counters? on|has (?:a|one or more|\w+) counters? on|whenever one or more counters? (?:are|is) put|\b(?:if|whenever) you put [^.]*counters? on/.test(s)||removeOwn,
    doubler=/twice that many(?: of those)? counters|double the number of [^.]*counters|additional [^.]*counter would be put|that many plus one [^.]*counters/.test(s)
  return {producer,payoff,doubler,kinds:counterKinds(s)}
}
function tokenRoles(o){const s=o.toLowerCase(),producer=/create [^.]*\btokens?\b/.test(s),payoff=/\btokens?\b you control|creature \btokens?\b (?:you control )?(?:get|have)|whenever [^.]*\btokens?\b[^.]*enters|whenever one or more \btokens?\b|whenever you create [^.]*\btokens?\b|sacrifice (?:a|one or more) \btokens?\b/.test(s),doubler=/if [^.]*would create [^.]*\btokens?\b[^.]*twice|twice that many [^.]*\btokens?\b|create twice that many [^.]*\btokens?\b/.test(s);return {producer,payoff,doubler}}
const triggerDoubler=o=>/triggers? an additional time|trigger an additional time|causes? [^.]* ability to trigger an additional time/i.test(o)
function artifactPayoff(o){const s=withoutReminderText(o).toLowerCase();return clauses(s).some(c=>{if(/opponent/.test(c)&&/artifact/.test(c)&&!/artifacts? you control/.test(c))return false;return /artifacts? you control/.test(c)||/whenever (?:an|another|one or more) artifacts? [^.]*enters[^.]*under your control/.test(c)||/whenever you cast (?:an? )?artifact/.test(c)||/artifact spells? you cast/.test(c)||/for each artifact you control/.test(c)||/whenever you sacrifice (?:an|another|one or more) artifacts?/.test(c)||/whenever (?:an|another) artifact you control [^.]*graveyard/.test(c)})}
const constellation=o=>/\bconstellation\b|whenever an enchantment [^.]* enters|whenever another enchantment [^.]* enters/i.test(o)
function spellslinger(o){const s=withoutReminderText(o).toLowerCase(),kind='(?:instant or sorcery|instant and sorcery|instant|sorcery|noncreature)';return /\bmagecraft\b/.test(s)||new RegExp(`\\bwhenever you (?:cast|cast or copy|copy) (?:an? )?${kind} spell`).test(s)||new RegExp(`\\b${kind} spells? you cast\\b`).test(s)||/\byou may cast (?:an? )?instant or sorcery spell\b/.test(s)||/\bcopy target instant or sorcery spell you control\b/.test(s)||new RegExp(`\\bfirst ${kind} spell you cast\\b`).test(s)}
function exileCast(o){const s=withoutReminderText(o).toLowerCase();return /\b(?:cast|play) [^.]{0,140} from exile\b/.test(s)||/\bexile .{0,280}\b(?:you may|you can) (?:play|cast)\b/.test(s)||/\bexile .{0,280}\bcast (?:it|them|those cards|any number|that card)\b/.test(s)||/\bplay (?:a land|lands?|a card|cards?) or cast (?:a spell|spells?) from among cards? exiled\b/.test(s)}
function exilePayoff(o){const s=withoutReminderText(o).toLowerCase();return /\bwhenever (?:you|a player) (?:cast|casts|play|plays) [^.]{0,140} from exile\b/.test(s)||/\bif you (?:cast|play) [^.]{0,140} from exile\b/.test(s)||/\b(?:spell|spells|card|cards) you (?:cast|play) from exile\b/.test(s)||/\bfirst spell you cast from exile\b/.test(s)}
function landfallPayoff(o){const s=withoutReminderText(o).toLowerCase();if(/\blandfall\b/.test(s))return true;return clauses(s).some(c=>/whenever (?:a|one or more) lands? [^.]*enters/.test(c)&&!/land an opponent controls enters|lands? your opponents? control enters/.test(c))}
function lifeGainSource(o){const s=withoutReminderText(o).toLowerCase();if(/\blifelink\b/.test(s))return true;return clauses(s).some(c=>{if(/opponents? gains? [^.]*life/.test(c)&&!/\byou (?:may )?gain [^.]*life/.test(c))return false;return /\byou (?:may )?gain [^.]*life\b/.test(c)||/\beach player gains? [^.]*life\b/.test(c)||/\btarget player gains? [^.]*life\b/.test(c)})}
function lifePayoff(o){const s=withoutReminderText(o).toLowerCase();return /whenever you gain life|whenever you would gain life|if you gained life|for each [^.]*life you gained|your life total (?:increases|increased)|whenever your life total changes/.test(s)}
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
  if(/\bsacrifice\b/i.test(semantic))add('sacrifice');if(isSacOutlet(card,semantic))add('sac-outlet');if(isSacEnabler(card,semantic))add('sac-enabler');if(deathPayoff(semantic))add('death-payoff')
  if(/enters(?: the battlefield)?|whenever [^.]* enters/i.test(semantic))add('etb');if(isBlinkText(semantic))add('blink');if(constellation(semantic))add('constellation');if(artifactPayoff(semantic))add('artifact-payoff');if(landfallPayoff(semantic))add('landfall')
  if(counters.producer)add('counter-producer');if(counters.payoff)add('counter-payoff');if(counters.doubler){add('counter-doubler');add('counter-payoff')}for(const kind of counters.kinds)add(`counter-kind:${kind}`)
  if(lifeGainSource(semantic))add('lifegain');if(lifePayoff(semantic))add('life-payoff')
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
