const clamp=(n,a=0,b=10)=>Math.max(a,Math.min(b,n))
const textOf=c=>String(c.oracle||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n+/g,'\n').trim()
const lower=c=>textOf(c).toLowerCase()
const typeLower=c=>(c.type||'').toLowerCase()
const unique=xs=>[...new Set(xs)]
const clauses=text=>String(text||'').split(/[.\n;]+/).map(x=>x.replace(/^[\s•+—-]+/,'').trim()).filter(Boolean)
const abilities=text=>String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean)
function withoutReminderText(text){let out='',depth=0;for(const ch of String(text||'')){if(ch==='('){depth++;continue}if(ch===')'&&depth){depth--;continue}if(!depth)out+=ch}return out.replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim()}
function escapedName(card){return (card.name||'').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

function isOwnTargetClause(s){return /you control|you own|your graveyard|your hand/.test(s)}
function isBlinkText(o){
  const s=withoutReminderText(o).toLowerCase()
  if(/\bflicker\b/.test(s))return true
  return abilities(s).some(a=>{
    const exile=/\bexile\b[^\n]{0,180}\b(?:target|another|one other|up to one|up to x)\b/.test(a)
    const returns=/\breturn(?:s|ed)?\b[^\n]{0,180}\bbattlefield\b/.test(a)
    if(!exile||!returns)return false
    const opponentOnly=/target [^.]{0,120}(?:an opponent controls|opponent controls)|target attacking creature an opponent controls/.test(a)
    const ownCapable=/you control|you own|another target|one other target|up to one target|up to x target|target (?:creature|nonland permanent|permanent)/.test(a)
    return !opponentOnly||ownCapable&&/you control|you own/.test(a)
  })
}
function isTemporaryInteraction(o){const s=withoutReminderText(o).toLowerCase();return abilities(s).some(a=>/exile (?:up to )?(?:one other |one |another )?target [^.\n;]+/.test(a)&&!/target [^.\n;]+ you control/.test(a)&&/return (?:that card|it|them|those cards|the exiled cards?)[^.\n;]+battlefield/.test(a))}
function isTargetRemoval(o){
  const s=withoutReminderText(o).toLowerCase(),temporary=isTemporaryInteraction(s)
  if(abilities(s).some(a=>/choose target (?:artifact|creature|enchantment|planeswalker|permanent|nonland permanent)[^.]*\.\s*(?:its|that permanent's|that creature's) owner shuffles? (?:it|that [^.]{0,40}) into [^.]{0,50}\blibrary\b/.test(a)))return true
  if(/target creature you control fights target|target creature you control deals damage equal to its power to target|deals damage equal to its power to target creature (?:an opponent|you don't)/.test(s))return true
  if(/target (?:player|opponent) sacrifices (?:a|an|one|two|\d+) (?:creature|artifact|enchantment|permanent|planeswalker)/.test(s))return true
  for(const c of clauses(s)){
    if(isOwnTargetClause(c))continue
    if(/destroy target /.test(c))return true
    if(/exile (?:up to )?(?:one other |one |another )?target /.test(c)&&!temporary&&!/return .*battlefield/.test(c))return true
    if(/return target [^.]+ to (?:its|their|that player's|owner'?s) hand/.test(c))return true
    if(/target [^.]+ gets -(?:\d+|x)\/-(?:\d+|x)/.test(c))return true
    const libraryObject=/(?:target (?:attacking |blocking )?(?:artifact|creature|enchantment|planeswalker|permanent|nonland permanent|historic permanent|spell)|target [^.]{0,60}\b(?:artifact|creature|enchantment|planeswalker|permanent|spell)\b)/.test(c)
    if(libraryObject&&(/put target [^.]{0,120}(?:into|on) [^.]{0,80}\blibrary\b/.test(c)||/target [^.]{0,100}owner shuffles? (?:it|that [^.]{0,40}) into [^.]{0,50}\blibrary\b/.test(c)||/shuffle target [^.]{0,100} into [^.]{0,50}\blibrary\b/.test(c)||/(?:owner|controller) of target [^.]{0,100} shuffles? (?:it|that [^.]{0,40}) into [^.]{0,50}\blibrary\b/.test(c)))return true
  }
  return false
}
function isTutor(o){const s=o.toLowerCase(),search=clauses(s).find(c=>/search your library(?: and\/or your graveyard)? for /.test(c));if(!search)return false;const landOnly=/ for [^.]*\b(?:basic land|land card|plains(?: card)?|island(?: card)?|swamp(?: card)?|mountain(?: card)?|forest(?: card)?)\b/.test(search);return !landOnly}
function isRepeatableTutor(card,o){const s=o.toLowerCase();if(/at the beginning [^.]*search your library|whenever [^.]*search your library/.test(s))return true;if(!/:\s*search your library/.test(s))return false;const name=escapedName(card);if(name&&new RegExp(`(?:sacrifice|exile) ${name}[^:]*:`).test(s))return false;return true}
function isLandRamp(o){
  const s=o.toLowerCase()
  return /search your library [^.]*\b(?:land card|plains|island|swamp|mountain|forest)\b[^.]*put [^.]*onto the battlefield/.test(s)
    ||/put (?:a|one|two|up to \w+|any number of|all)?\s*land cards? [^.]*onto the battlefield/.test(s)
    ||/put [^.]*land cards? from [^.]*onto the battlefield/.test(s)
    ||/you may play an additional land/.test(s)
}
function isGraveyardSpellReplay(o){const s=String(o||'').toLowerCase();return /(?:instant or sorcery|instant and\/or sorcery)[\s\S]{0,180}from your graveyard[\s\S]{0,260}copy (?:it|them|the card|those cards|each|that card)[\s\S]{0,180}(?:cast|without paying)/.test(s)}
function isRecursion(o){const s=o.toLowerCase();if(/\b(?<!-)(?:flashback|unearth|escape|disturb|retrace|jump-start|aftermath|dredge|encore|embalm|eternalize)\b/.test(s))return true;return /return [^.]* from (?:your|a) graveyard/.test(s)||/cast [^.]* from your graveyard/.test(s)||/play [^.]* from your graveyard/.test(s)||/search your library and\/or your graveyard for [^.]*put [^.]*onto the battlefield/.test(s)||isGraveyardSpellReplay(s)}
function isGraveSetup(o){const s=withoutReminderText(o).toLowerCase();if(/put all cards? exiled this way that (?:weren't|were not) cast into your graveyard/.test(s))return true;return clauses(s).some(c=>{if(/(?:target|each|an?) opponents? [^.]{0,80}discards?/.test(c)&&!/\byou (?:may )?discard\b/.test(c)&&!/each player discards?/.test(c))return false;return /\bmill (?:\d+|x|one|two|three|four|five)\b|\bsurveil\b|\byou (?:may )?discard (?:a|one|two|three|x|any number of) cards?\b|\bdiscard (?:a|one|two|three|x|any number of) cards?\b|\beach player discards?\b|\byou and [^.]{0,80} each discard\b|put the top [^.]*cards? of (?:your|a) library into (?:your|its) graveyard/.test(c)})}
function isDrawSource(o){
  const s=withoutReminderText(o).toLowerCase()
  return clauses(s).some(c=>{
    const triggerOnly=/^(?:whenever|if) you (?:would )?draw\b/.test(c)&&!/,\s*(?:then\s+)?(?:you\s+)?(?:may\s+)?draw\b/.test(c)
    if(triggerOnly)return false
    if(/\b(?:each |target )?opponents? draws?\b/.test(c)&&!/\byou (?:may )?draw\b|\byou and [^,]{0,80}(?:each )?draw\b|\beach player draws?\b/.test(c))return false
    if(/\bif you would draw\b/.test(c)&&!/,\s*(?:then\s+)?(?:you\s+)?(?:may\s+)?draw\b/.test(c))return false
    return /\byou (?:may )?draw\b/.test(c)
      || /\byou and [^,]{0,80}(?:each )?draw\b/.test(c)
      || /\beach player draws?\b/.test(c)
      || /\btarget player draws?\b/.test(c)
      || /(?:each player|you and [^,]{0,80}) [^.;]{0,120}\b(?:and|then) draws?\b/.test(c)
      || /\beach player [^.;]{0,120}\bthen draws? (?:a|one|two|three|four|five|six|seven|\d+|x|that many|up to [a-z]+|cards? equal to)\b/.test(c)
      || /\byou [^.;]{0,100}\band draw (?:a|one|two|three|four|five|six|seven|\d+|x|that many|up to [a-z]+) cards?\b/.test(c)
      || /(?:^|[:,—-]\s*)draw (?:a|one|two|three|four|five|six|seven|\d+|x|that many|up to [a-z]+) cards?\b/.test(c)
      || /\bdraw cards? equal to\b/.test(c)
      || /\bdraw (?:an additional )?card for each\b/.test(c)
      || /\bconnives?|cycl(?:ing|es)\b/.test(c)
  })
}
function isSacOutlet(card,o){const s=withoutReminderText(o).toLowerCase(),name=escapedName(card);if(name&&new RegExp(`sacrifice ${name}`).test(s))return false;return /sacrifice (?:another |a |an |one or more )?(?:creature|artifact|permanent|token)[^:]{0,80}:/.test(s)}
function isSacEnabler(card,o){const s=withoutReminderText(o).toLowerCase(),name=escapedName(card);if(name&&new RegExp(`sacrifice ${name}`).test(s))return false;return /as an additional cost to cast [^.]*sacrifice (?:another |a |an )?(?:creature|artifact|permanent|token)/.test(s)||/when you cast [^.]*you may sacrifice (?:another |a |an )?(?:creature|artifact|permanent|token)/.test(s)}
function deathPayoff(o){
  const s=withoutReminderText(o).toLowerCase()
  const grantedToOpponent=/target creature an opponent controls[^.]{0,180}(?:has|gains)[^.]{0,140}when(?:ever)? this creature dies/.test(s)
  const opponentAura=/enchant creature an opponent controls/.test(s)&&/when enchanted creature dies/.test(s)
  return clauses(s).some(c=>{
    if(/\bwhenever (?:you|a player) sacrifices? (?:another |a |an |one or more )?(?:creature|permanent|token|nontoken permanent)\b/.test(c))return true
    if(!/\b(?:dies|die)\b/.test(c))return false
    if(grantedToOpponent&&/when(?:ever)? this creature dies/.test(c))return false
    if(opponentAura&&/when enchanted creature dies/.test(c))return false
    if(/creature dealt damage by this creature[^.]*dies/.test(c)&&!/you control/.test(c))return false
    const opponentOnly=/(?:creature|permanent|artifact|planeswalker) an opponent controls [^.]{0,80}(?:dies|die)|blocking creature an opponent controls [^.]{0,80}(?:dies|die)|creatures? your opponents control [^.]{0,80}(?:dies|die)/.test(c)
    const ownOrAny=/this (?:creature|permanent|artifact|enchantment) [^.]{0,40}(?:dies|die)|another [^.]* you control [^.]{0,70}(?:dies|die)|(?:a|an|another|one or more|one or more other|nontoken|token) [^.]{0,70} you control [^.]{0,70}(?:dies|die)|attacking creature you control [^.]* dies|\b(?:equipped|enchanted) creature dies\b|\bcreature of the chosen type dies\b|\banother creature dies\b|\ba creature dies\b|\bone or more creatures die\b|\bnontoken creature dies\b/.test(c)
    if(opponentOnly&&!/you control [^.]* (?:dies|die)|attacking creature you control/.test(c))return false
    return ownOrAny
  })
}
const COUNTER_KEYWORD=/\b(?<!-)(?:evolve|adapt|amass|support|bolster|graft|modular|outlast|renown|backup|monstrosity|explores?|connives?|blights?|fabricate|riot|bloodthirst|undying|persist|unleash|scavenge|training|mentor|incubate|devour|wither|infect)(?!-)\b/
function opponentOnlyCounterKeywordClause(c){return /(?:each|target|an?) opponents? [^.]{0,80}\bblights?\b/.test(c)||/(?:creature|permanent) an opponent controls [^.]{0,80}\b(?:connives?|explores?)\b/.test(c)}
function counterKinds(o){
  const s=o.toLowerCase(),out=[],add=k=>{if(!out.includes(k))out.push(k)}
  for(const [kind,re] of [
    ['plus1',/\+1\/\+1 counters?|\b(?<!-)(?:evolve|adapt(?:\s*(?:\d+|x))?|amass\b|support(?:\s*(?:\d+|x))?|bolster(?:\s*(?:\d+|x))?|graft(?:\s*(?:\d+|x))?|modular(?:\s*(?:\d+|x))?|outlast\b|renown(?:\s*(?:\d+|x))?|backup(?:\s*(?:\d+|x))?|monstrosity(?:\s*(?:\d+|x))?|explores?\b)(?!-)\b/],
    ['minus1',/-1\/-1 counters?|\b(?<!-)(?:blights?(?:\s*(?:\d+|x))?|persist|wither|infect)(?!-)\b/],
    ['charge',/charge counters?/],['poison',/poison counters?/],['stun',/stun counters?/],['shield',/shield counters?/],['lore',/lore counters?/],['time',/time counters?/],['oil',/oil counters?/],['experience',/experience counters?/],['energy',/energy counters?|\{e\}/],['rad',/rad counters?/],['loyalty',/loyalty counters?/],['finality',/finality counters?/],['quest',/quest counters?/],['storage',/storage counters?/],['muster',/muster counters?/],['verse',/verse counters?/],['brick',/brick counters?/],['age',/age counters?/],['fate',/fate counters?/],['spore',/spore counters?/],['slime',/slime counters?/]
  ])if(re.test(s))add(kind)
  if(/\b(?<!-)(?:connives?|fabricate(?:\s*(?:\d+|x))?|riot|bloodthirst(?:\s*(?:\d+|x))?|undying|unleash|scavenge|training|mentor|incubate(?:\s*(?:\d+|x))?|devour(?:\s*(?:\d+|x))?)(?!-)\b/.test(s))add('plus1')
  if(/\bproliferate\b/.test(s))add('wild')
  const concrete=out.some(k=>k!=='wild'&&k!=='generic'),counterNoun=/\b(?:a|an|one|two|three|four|five|x|any number of|one or more|those|these|that|the|each|number of)(?: [a-z0-9+/-]+){0,3} counters?\b|\b[a-z][a-z'-]{2,} counters?\b|\bcounters? on\b|\bcounter from\b|\bcounter to\b/
  if(/each kind of counter|different kinds? of counters|number of counters? (?:on|among|removed)/.test(s)||(!concrete&&/for each [^.]*counter|for each counter removed/.test(s)))add('any')
  if(!out.length&&counterNoun.test(s))add('generic')
  return out
}
function counterRoles(o){
  const s=o.toLowerCase(),
    putCounter=/\bput\s+[^.\n;]{0,80}\bcounters?\s+(?:from\s+[^.\n;]{0,40}\s+)?on(?:to)?\b/,
    entersWith=/\benters?(?: the battlefield)? with [^.\n;]{0,60}\bcounters?\b/,
    keywordProducer=clauses(s).some(c=>COUNTER_KEYWORD.test(c)&&!opponentOnlyCounterKeywordClause(c)),
    producer=keywordProducer||clauses(s).some(c=>{
      if(/\binstead\b/.test(c)&&/\b(?:if|would)\b/.test(c))return false
      const actionable=c.replace(/\b(?:if|whenever) (?:you|a player|[a-z]+) (?:would )?put [^,]*counters? on[^,]*(?:,\s*|$)/,'')
        .replace(/\b(?:if|whenever) [^,]*counters? (?:would be|are|is) put on[^,]*(?:,\s*|$)/,'')
      return putCounter.test(actionable)||entersWith.test(actionable)||/\bproliferate\b/.test(actionable)
    }),
    removeOwn=/remove (?:a|one|two|three|x|any number of) counters? from [^.]{0,100}(?:you control|this)/.test(s),
    modifiedPayoff=/\bmodified (?:creature|creatures|permanent|permanents)\b/.test(s),
    payoff=/for each [^.]*counter|with (?:a|one or more|\w+) counters? on|has (?:a|one or more|\w+) counters? on|whenever one or more counters? (?:are|is) put|\b(?:if|whenever) you put [^.]*counters? on|creatures with counters/.test(s)||removeOwn,
    doubler=/twice that many(?: of those)? counters|double the number of [^.]*counters|additional [^.]*counter would be put|that many plus one [^.]*counters/.test(s)
  return {producer,payoff,modifiedPayoff,doubler,kinds:counterKinds(s)}
}
function investigatesForYou(c){if(!/\binvestigate(?:s|d)?\b/.test(c))return false;if(/(?:target|each|an?) opponents? [^.]{0,80}investigates?|(?:its|that|their) controller investigates?|that player investigates?/.test(c)&&!/\byou [^.]{0,50}investigate/.test(c))return false;return /\byou [^.]{0,50}investigate|(?:^|,|\bthen\b)\s*investigate(?:s|d)?\b|\binvestigate(?:s|d)?(?:\s+(?:x|twice|three times|\d+ times))?\b/.test(c)}
function tokenRoles(o){const s=o.toLowerCase(),cs=clauses(s),keywordProducer=/\b(?<!-)(?:amass|incubate|fabricate|populate|living weapon|for mirrodin!|myriad|encore|embalm|eternalize|offspring|afterlife|squad)(?!-)\b/.test(s),producer=/create [^.]*\btokens?\b/.test(s)||cs.some(investigatesForYou)||keywordProducer,payoff=/\btokens?\b you control|creature \btokens?\b (?:you control )?(?:get|have)|whenever [^.]*\btokens?\b[^.]*enters|whenever one or more \btokens?\b|whenever you create [^.]*\btokens?\b|sacrifice (?:a|one or more) \btokens?\b|\bif you created a token\b|\bnumber of tokens you created\b|\bfor each token you control\b|\bfor each creature token you control\b|\bdestroy all nontoken creatures\b/.test(s),doubler=/if [^.]*would create [^.]*\btokens?\b[^.]*twice|twice that many [^.]*\btokens?\b|create twice that many [^.]*\btokens?\b/.test(s);return {producer,payoff,doubler}}
const triggerDoubler=o=>/triggers? an additional time|trigger an additional time|causes? [^.]* ability to trigger an additional time/i.test(o)
function artifactPayoff(o){const s=withoutReminderText(o).toLowerCase();return clauses(s).some(c=>{if(/opponent/.test(c)&&/artifact/.test(c)&&!/artifacts? you control/.test(c))return false;return /artifacts? you control/.test(c)||/whenever (?:an|another|one or more) artifacts? [^.]*enters[^.]*under your control/.test(c)||/whenever you cast (?:an? )?artifact/.test(c)||/artifact spells? you cast/.test(c)||/for each artifact you control/.test(c)||/whenever you sacrifice (?:an|another|one or more) artifacts?/.test(c)||/whenever (?:an|another) artifact you control [^.]*graveyard/.test(c)})}
const constellation=o=>/\bconstellation\b|whenever an enchantment [^.]* enters|whenever another enchantment [^.]* enters/i.test(o)
function spellslinger(o){const s=withoutReminderText(o).toLowerCase(),kind='(?:instant or sorcery|instant and sorcery|instant|sorcery|noncreature)',hasOwnProwess=/creatures you control have prowess/i.test(s)||s.split(/\n+/).some(line=>!/token(?:s)? with prowess/.test(line)&&/\bprowess\b/.test(line));return /\bmagecraft\b/.test(s)||hasOwnProwess||new RegExp(`\\bwhenever you (?:cast|cast or copy|copy) (?:an? )?${kind} spell`).test(s)||new RegExp(`\\b${kind} spells? you cast\\b`).test(s)||/\byou may cast (?:an? )?instant or sorcery spell\b/.test(s)||/\bcopy target instant or sorcery spell you control\b/.test(s)||new RegExp(`\\bfirst ${kind} spell you cast\\b`).test(s)}
function exileCast(o){const s=withoutReminderText(o).toLowerCase();if(isGraveyardSpellReplay(s))return false;return /\b(?:cast|play) [^.]{0,140} from exile\b/.test(s)||/\bexile .{0,280}\b(?:you may|you can) (?:play|cast)\b/.test(s)||/\bexile .{0,280}\bcast (?:it|them|those cards|any number|that card)\b/.test(s)||/\bplay (?:a land|lands?|a card|cards?) or cast (?:a spell|spells?) from among cards? exiled\b/.test(s)}
function exilePayoff(o){const s=withoutReminderText(o).toLowerCase();return /\bwhenever (?:you|a player) (?:cast|casts|play|plays) [^.]{0,140} from exile\b/.test(s)||/\bif you (?:cast|play) [^.]{0,140} from exile\b/.test(s)||/\b(?:spell|spells|card|cards) you (?:cast|play) from exile\b/.test(s)||/\bfirst spell you cast from exile\b/.test(s)}
function landfallPayoff(o){const s=withoutReminderText(o).toLowerCase();if(/\blandfall\b/.test(s))return true;return clauses(s).some(c=>/whenever (?:a|one or more) lands? [^.]*enters/.test(c)&&!/land an opponent controls enters|lands? your opponents? control enters/.test(c))}
function lifeGainSource(o){const s=withoutReminderText(o).toLowerCase();if(/\blifelink\b/.test(s))return true;return clauses(s).some(c=>{if(/\b(?:if|whenever) you would gain life\b/.test(c)&&/\binstead\b/.test(c))return false;const actionable=c.replace(/\b(?:whenever you (?:would )?gain life|if you (?:gain|gained) life[^,]*)(?:,\s*|$)/,'');if(/opponents? gains? [^.]*life/.test(actionable)&&!/\byou (?:may )?gain [^.]*life/.test(actionable))return false;return /\byou (?:may )?gain [^.]*life\b/.test(actionable)||/\beach player gains? [^.]*life\b/.test(actionable)||/\btarget player gains? [^.]*life\b/.test(actionable)})}
function lifePayoff(o){const s=withoutReminderText(o).toLowerCase();return /whenever you (?:would )?gain life|if you (?:would )?gain life|if you gained life|for each [^.]*life you gained|your life total (?:increases|increased)|whenever your life total changes/.test(s)}
function isManaSourceText(o){
  const s=withoutReminderText(o).toLowerCase()
  return clauses(s).some(c=>{
    if(/(?:target|each|an?) opponents? [^.]{0,100}(?:adds?|creates? [^.]*(?:treasure|gold|powerstone))|(?:its|that|their) controller creates? [^.]*(?:treasure|gold|powerstone)|that player creates? [^.]*(?:treasure|gold|powerstone)/.test(c)&&!/\byou [^.]{0,60}(?:add|create)/.test(c))return false
    if(/\b(?:add|adds) (?:\{|one mana|two mana|three mana|four mana|x mana|an? additional|an amount of|\w+ mana)/.test(c))return true
    if(/\b(?:add|adds) (?:\{[wubrgc0-9x/|]+\})+/.test(c))return true
    if(/\byou (?:add|create) [^.]{0,100}(?:treasure|gold|powerstone)/.test(c))return true
    if(/\bcreate [^.]{0,100}(?:treasure|gold|powerstone|eldrazi spawn|eldrazi scion) token/.test(c))return true
    return false
  })
}
function isCounterspell(o){const s=withoutReminderText(o).toLowerCase();return clauses(s).some(c=>/\bcounter target [^\n;.]{0,140}\b(?:spell|activated ability|triggered ability|ability)\b/.test(c))}
function isStax(o){const s=withoutReminderText(o).toLowerCase();return clauses(s).some(c=>{if(/\bcounter target\b/.test(c))return false;if(/(?:creatures?|permanents?) can'?t (?:attack|block|activate) [^.]{0,100} unless [^.]{0,80} pays?/.test(c))return true;return /\b(?:opponents?|players) can'?t (?:cast|play|activate|attack|block|draw|untap|search|gain|sacrifice)|\bspells? (?:your opponents? cast )?cost [^.]{0,80} more(?: to cast)?|\b(?:each|target|your) opponents? skips? [^.]{0,50}(?:step|phase)/.test(c)})}
function fastManaKind(card,o){const n=(card.name||'').toLowerCase();if(/dark ritual|cabal ritual|culling the weak|rite of flame|lotus petal|elvish spirit guide|simian spirit guide|jeweled lotus|lion's eye diamond|mana vault|grim monolith/.test(n))return 'burst';if(/sol ring|mana crypt|chrome mox|mox diamond|mox opal|mox amber/.test(n))return 'persistent';if(Number(card.cmc||0)<=1&&/sacrifice [^.]*: add (?:\{|three mana|two mana)/i.test(o))return 'burst';return null}
function protection(card,o){const s=withoutReminderText(o).toLowerCase();const grants=/(?:target|equipped|enchanted) [^.]{0,100}(?:gains?|has) [^.]{0,80}(?:hexproof|indestructible|protection from|ward)|(?:creatures?|permanents?|artifacts?|enchantments?) you control [^.]{0,80}(?:gain|have) [^.]{0,80}(?:hexproof|indestructible|protection from|ward)|other [^.]{0,80} you control [^.]{0,80}(?:have|gain) [^.]{0,80}(?:hexproof|indestructible|protection from|ward)/.test(s);const reactive=/counter target spell [^.]*targets?|target [^.]{0,80} phases? out|phase out target/.test(s);return grants||reactive||(isBlinkText(s)&&/you control/.test(s))}

export function tagsFor(card){
  const o=textOf(card),semantic=withoutReminderText(o),t=typeLower(card),tags=[],add=x=>{if(x&&!tags.includes(x))tags.push(x)},counters=counterRoles(semantic),tokens=tokenRoles(semantic),fm=fastManaKind(card,semantic)
  if(/\bland\b/.test(t))add('land');if(/\bcreature\b/.test(t))add('creature');if(/\benchantment\b/.test(t))add('enchantment');if(/\bartifact\b/.test(t))add('artifact');if(/\binstant\b/.test(t))add('instant');if(/\bsorcery\b/.test(t))add('sorcery')
  if(isDrawSource(semantic))add('draw')
  if(isTutor(semantic)){add('tutor');if(isRepeatableTutor(card,semantic))add('repeatable-tutor')}
  if(isLandRamp(semantic))add('land-ramp');if(isManaSourceText(semantic))add('mana');if(fm){add('fast-mana');add('mana');if(fm==='burst')add('burst-mana')}
  if(isTargetRemoval(semantic))add('removal');if(isTemporaryInteraction(semantic))add('tempo-interaction')
  if(isCounterspell(semantic))add('counterspell')
  if(/destroy (?:all|each)|exile (?:all|each)|each player sacrifices (?:all|all but|all nonland|[0-9]+|x)|(?:all|each) creatures? (?:your opponents? control )?gets? -(?:[0-9]+|x)|return (?:all|each) [^.]* to (?:their|its) owner|return all nonland permanents target player controls|deals? (?:[2-9]|[1-9]\d+|x) damage to (?:each|all|each other) creatures?|deals? (?:[2-9]|[1-9]\d+|x) damage to each creature without flying/i.test(semantic))add('wipe')
  if(protection(card,semantic))add('protection');else if(/\b(?:hexproof|shroud|indestructible|protection from|ward)\b/i.test(semantic))add('self-protection');if(isRecursion(semantic))add('recursion');if(isGraveSetup(semantic))add('graveyard-setup')
  if(tokens.producer)add('tokens');if(tokens.payoff)add('token-payoff');if(tokens.doubler){add('token-doubler');add('token-payoff')}
  if(/\bsacrifice\b/i.test(semantic))add('sacrifice');if(isSacOutlet(card,semantic))add('sac-outlet');if(isSacEnabler(card,semantic))add('sac-enabler');if(deathPayoff(semantic))add('death-payoff')
  if(/\bwhen(?:ever)?\b[^.\n;]{0,220}\benters(?: the battlefield)?\b/i.test(semantic))add('etb');if(isBlinkText(semantic))add('blink');if(constellation(semantic))add('constellation');if(artifactPayoff(semantic))add('artifact-payoff');if(landfallPayoff(semantic))add('landfall')
  if(counters.producer)add('counter-producer');if(counters.payoff)add('counter-payoff');if(counters.modifiedPayoff)add('modified-payoff');if(counters.doubler){add('counter-doubler');add('counter-payoff')}for(const kind of counters.kinds)add(`counter-kind:${kind}`)
  if(lifeGainSource(semantic))add('lifegain');if(lifePayoff(semantic))add('life-payoff')
  if(spellslinger(semantic))add('spellslinger');if(exileCast(semantic))add('exile-cast');if(exilePayoff(semantic))add('exile-payoff')
  if(/without paying [^.]* mana cost|put [^.]* onto the battlefield from your (?:hand|library)/i.test(semantic))add('cheat');if(/without paying [^.]* mana cost|rather than pay [^.]* mana cost/i.test(semantic))add('free')
  if(isStax(semantic))add('stax');if(/take an extra turn/i.test(semantic))add('extra-turn');if(/additional combat|extra combat/i.test(semantic))add('extra-combat');if(/you win the game|target opponent loses the game/i.test(semantic))add('win');if(triggerDoubler(semantic))add('trigger-doubler')
  return unique(tags)
}

function manaValueScore(cmc){if(cmc<=0)return 1;if(cmc<=1)return .95;if(cmc<=2)return .85;if(cmc<=3)return .72;if(cmc<=4)return .58;if(cmc<=5)return .46;if(cmc<=6)return .35;return .25}
export function manaRequirement(card){const symbols=[...String(card.manaCost||'').matchAll(/\{([^}]+)\}/g)].map(m=>m[1].toUpperCase()),colored=[];let generic=0;for(const sym of symbols){if(/^\d+$/.test(sym)){generic+=Number(sym);continue}if(sym==='X'||sym==='Y'||sym==='Z')continue;if(/^[WUBRGC]$/.test(sym)){colored.push([sym]);continue}const opts=sym.split('/').filter(x=>/^[WUBRGC]$/.test(x));if(opts.length)colored.push(opts)}return {generic,colored,total:Number(card.cmc||generic+colored.length)}}
export function sourceColors(card){
  const pm=Array.isArray(card.producedMana)?card.producedMana:[];
  if(pm.length)return unique(pm.map(x=>String(x).toUpperCase()).filter(x=>/^[WUBRGC]$/.test(x)));
  const t=typeLower(card),o=lower(card),out=[];
  if(/plains/.test(t))out.push('W');if(/island/.test(t))out.push('U');if(/swamp/.test(t))out.push('B');if(/mountain/.test(t))out.push('R');if(/forest/.test(t))out.push('G');
  if(/\badds? (?:an additional )?(?:one )?mana of any (?:color|type)\b|\badds? one mana of any type that a land you control could produce\b|\bany combination of colors\b|\bchoose a color\b[^.]*\badds? (?:one |an amount of )?mana of (?:that|the chosen) color\b/i.test(o))return ['W','U','B','R','G'];
  const manaClauses=o.split(/[.\n;]+/).filter(c=>!/whenever an opponent discards/i.test(c))
  for(const c of ['W','U','B','R','G','C']){
    const re=new RegExp(`\\badds?\\s+(?:an amount of\\s+|an additional\\s+|\\{[0-9x/]+\\}|,\\s*)*\\{${c}\\}`, 'i')
    if(manaClauses.some(cl=>re.test(cl))) out.push(c);
  }
  return unique(out)
}

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