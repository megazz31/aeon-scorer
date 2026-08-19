const rx = (r, o) => r.test(o)
const count = (r, o) => (o.match(r) || []).length

const TAG_RULES = [
  ['draw', /draws? (?:a|one|two|three|four|\d+|x) cards?|put .* into your hand|play .* from the top/i],
  ['tutor', /search your library for (?!.*basic land)/i],
  ['land-ramp', /search your library for .*land|put .*land.*onto the battlefield|additional land/i],
  ['mana', /add \{|add one mana|add two mana|add three mana|treasure token/i],
  ['fast-mana', /dark ritual|culling the weak|lotus petal|spirit guide|chrome mox|mox diamond|mana crypt|mana vault/i],
  ['removal', /destroy target|exile target|return target .* to .* hand|target .* gets -\d+\/|-x\/-x/i],
  ['counter', /counter target/i],
  ['wipe', /destroy all|exile all|each player sacrifices|all creatures get -|return all .* to their owners/i],
  ['protection', /hexproof|indestructible|protection from|phase out|counter target spell .* targets/i],
  ['recursion', /return .* from .* graveyard|cast .* from your graveyard|play .* from your graveyard/i],
  ['graveyard', /graveyard|mill |surveil/i],
  ['graveyard-setup', /mill |surveil|discard .*card|put .*from .*library into .*graveyard/i],
  ['tokens', /create .* token/i],
  ['token-payoff', /tokens? you control|creature tokens? (?:you control )?(?:get|have)|whenever .*token.*enters|one or more tokens|if you would create .*token|twice that many .*tokens?|sacrifice (?:a|an|one or more) .*token/i],
  ['sacrifice', /sacrifice|whenever .* dies|when .* dies/i],
  ['sac-outlet', /sacrifice (?:a|an|another|one or more) (?:creature|artifact|permanent|token)|sacrifice .*:/i],
  ['death-payoff', /whenever .* (?:dies|is put into a graveyard)|whenever you sacrifice|when .* dies/i],
  ['etb', /enters(?: the battlefield)?|whenever .* enters/i],
  ['blink', /exile .* then return|exile .* return .* battlefield|flicker/i],
  ['enchantment', /enchantment/i],
  ['constellation', /constellation|whenever an enchantment .* enters|whenever .* enchantment enters/i],
  ['artifact', /artifact/i],
  ['artifact-payoff', /artifacts? you control|artifact enters|whenever .*artifact|for each artifact|sacrifice an? artifact|artifact spell/i],
  ['landfall', /landfall|whenever a land enters/i],
  ['counters', /\+1\/\+1 counter|proliferate|counter on/i],
  ['counter-payoff', /creatures? you control with .*counter|one or more counters|whenever .*counter|double .*counters|additional .*counter|remove .*counter/i],
  ['lifegain', /gain .* life|lifelink/i],
  ['life-payoff', /whenever you gain life|if you gained life|each opponent loses/i],
  ['spellslinger', /instant or sorcery|noncreature spell|whenever you cast (?:an? )?(?:instant|sorcery|noncreature)|magecraft/i],
  ['exile-cast', /cast .* from exile|play .* from exile|exile the top .* may play|exile the top .* may cast/i],
  ['cheat', /without paying .* mana cost|put .* onto the battlefield from your hand|put .* onto the battlefield from your library/i],
  ['free', /without paying .* mana cost|if .* rather than pay|you may pay .* rather than pay/i],
  ['stax', /opponents can't|players can't|spells cost .* more|unless .* pays|skip .* step/i],
  ['extra-turn', /take an extra turn/i],
  ['extra-combat', /additional combat/i],
  ['win', /you win the game|target opponent loses the game/i],
  ['doubling', /twice that many|double the number|additional time|triggers an additional time/i],
]

export function tagsFor(card) {
  const o = `${card.name || ''}\n${card.type || ''}\n${card.oracle || ''}`
  return TAG_RULES.filter(([, r]) => rx(r, o)).map(([tag]) => tag)
}

function manaValueScore(cmc) {
  if (cmc <= 0) return 1
  if (cmc <= 1) return .95
  if (cmc <= 2) return .85
  if (cmc <= 3) return .72
  if (cmc <= 4) return .58
  if (cmc <= 5) return .46
  if (cmc <= 6) return .35
  return .25
}

export function cardFeatures(card) {
  const o = (card.oracle || '').toLowerCase()
  const t = (card.type || '').toLowerCase()
  const tags = tagsFor(card)
  const has = x => tags.includes(x)
  const isLand = t.includes('land')
  const isCreature = t.includes('creature')
  const cmc = Number(card.cmc || 0)

  let development = 0
  if (has('mana')) development += 1.2
  if (has('land-ramp')) development += 1
  if (has('draw')) development += 1.1
  if (has('tutor')) development += 1.2
  if (has('tokens')) development += .5
  if (has('cheat')) development += 1.2
  if (has('doubling')) development += 1.0

  let interaction = 0
  if (has('removal')) interaction += 1
  if (has('counter')) interaction += 1.1
  if (has('wipe')) interaction += 1.5
  if (has('stax')) interaction += 1.1

  let resilience = 0
  if (has('draw')) resilience += .75
  if (has('recursion')) resilience += 1
  if (has('protection')) resilience += .85
  if (/from your graveyard/i.test(o)) resilience += .35

  let explosiveness = 0
  if (has('fast-mana')) explosiveness += 1.5
  if (has('free')) explosiveness += 1.1
  if (has('cheat')) explosiveness += 1.1
  if (has('extra-turn')) explosiveness += 2
  if (has('extra-combat')) explosiveness += 1
  if (has('doubling')) explosiveness += .9
  if (has('win')) explosiveness += 2
  if (/storm/i.test(o)) explosiveness += 1

  let standalone = .7
  if (interaction) standalone += .45
  if (has('draw')) standalone += .35
  if (has('protection')) standalone += .2
  if (/if you control|as long as you control|only if|unless you control/i.test(o)) standalone -= .35
  if (/whenever another|for each other|equal to the number of/i.test(o)) standalone -= .15
  standalone = Math.max(.1, Math.min(1.5, standalone))

  const recurring = /at the beginning|whenever|each .* step|once each turn/i.test(o) ? 1 : 0
  const immediacy = /enters|haste|flash|instant/i.test(`${o} ${t}`) ? 1 : 0
  const efficiency = manaValueScore(cmc)
  const coloredPips = count(/\{[WUBRG]\}/g, card.manaCost || '')

  return {
    ...card,
    tags,
    isLand,
    isCreature,
    development,
    interaction,
    resilience,
    explosiveness,
    standalone,
    recurring,
    immediacy,
    efficiency,
    coloredPips,
  }
}

export function featureDeck(cards) {
  return cards.map(cardFeatures)
}
