import fs from 'node:fs'

const patch=(path,fn)=>{
  const before=fs.readFileSync(path,'utf8')
  const after=fn(before)
  if(after===before){console.log('unchanged',path);return}
  fs.writeFileSync(path,after)
  console.log('patched',path)
}
const replaceOnce=(src,from,to,label)=>{
  if(src.includes(to))return src
  if(!src.includes(from))throw new Error(`semantic15 hotfix missing ${label}`)
  return src.replace(from,to)
}

patch('src/engine/cardFeatures.js',src=>{
  src=replaceOnce(
    src,
    "function protection(card,o){const s=withoutReminderText(o).toLowerCase();const grants=/(?:target|equipped|enchanted) [^.]{0,100}(?:gains?|has) [^.]{0,80}(?:hexproof|indestructible|protection from|ward)|(?:creatures?|permanents?|artifacts?|enchantments?) you control [^.]{0,80}(?:gain|have) [^.]{0,80}(?:hexproof|indestructible|protection from|ward)|other [^.]{0,80} you control [^.]{0,80}(?:have|gain) [^.]{0,80}(?:hexproof|indestructible|protection from|ward)/.test(s);const reactive=/counter target spell [^.]*targets?|target [^.]{0,80} phases? out|phase out target/.test(s);return grants||reactive||(isBlinkText(s)&&/you control/.test(s))}",
    "function protection(card,o){const s=withoutReminderText(o).toLowerCase();const grants=/(?:target|equipped|enchanted) [^.]{0,100}(?:gains?|has) [^.]{0,80}(?:hexproof|shroud|indestructible|protection from|ward)|(?:creatures?|permanents?|artifacts?|enchantments?) you control [^.]{0,80}(?:gain|have) [^.]{0,80}(?:hexproof|shroud|indestructible|protection from|ward)|other [^.]{0,80} you control [^.]{0,80}(?:have|gain) [^.]{0,80}(?:hexproof|shroud|indestructible|protection from|ward)/.test(s);const targetShield=/(?:target|equipped|enchanted) [^.]{0,100}can'?t be the target of [^.]{0,100}(?:opponents?|your opponents?)|(?:creatures?|permanents?|artifacts?|enchantments?) you control [^.]{0,100}can'?t be the target of [^.]{0,100}(?:opponents?|your opponents?)/.test(s);const reactive=/counter target spell [^.]*targets?|target [^.]{0,80} phases? out|phase out target/.test(s);return grants||targetShield||reactive||(isBlinkText(s)&&/you control/.test(s))}",
    'protection scope'
  )
  src=replaceOnce(
    src,
    "function exileCast(o){const s=withoutReminderText(o).toLowerCase();if(isGraveyardSpellReplay(s))return false;return /\\b(?:cast|play) [^.]{0,140} from exile\\b/.test(s)||/\\bexile .{0,280}\\b(?:you may|you can) (?:play|cast)\\b/.test(s)||/\\bexile .{0,280}\\bcast (?:it|them|those cards|any number|that card)\\b/.test(s)||/\\bplay (?:a land|lands?|a card|cards?) or cast (?:a spell|spells?) from among cards? exiled\\b/.test(s)}",
    "function exileCast(o){const s=withoutReminderText(o).toLowerCase();if(isGraveyardSpellReplay(s))return false;return /\\b(?:cast|play) [^,.;]{0,140} from exile\\b/.test(s)||/\\bexile .{0,280}\\b(?:you may|you can) (?:play|cast)\\b/.test(s)||/\\bexile .{0,280}\\bcast (?:it|them|those cards|any number|that card)\\b/.test(s)||/\\bplay (?:a land|lands?|a card|cards?) or cast (?:a spell|spells?) from among cards? exiled\\b/.test(s)}",
    'exile-cast clause locality'
  )
  return src
})

patch('scripts/semantic-direction-regression-test.mjs',src=>replaceOnce(
  src,
  "// Protection includes hexproof, shroud, ward, indestructible, phase out, protection from.\nassert.equal(has(card('Lightning Greaves','Artifact — Equipment','Equipped creature has haste and shroud.\\nEquip {0}'),'protection'),true)\nassert.equal(has(card('Canopy Gargantuan','Creature — Beast','Flying, ward {2}'),'protection'),true)\nassert.equal(has(card('Shielding Plax','Enchantment — Aura','Enchanted creature can\\'t be the target of spells or abilities your opponents control.'),'protection'),true)",
  "// Protection is deck-facing only when the card protects another resource; self-only durability stays separate.\nassert.equal(has(card('Lightning Greaves','Artifact — Equipment','Equipped creature has haste and shroud.\\nEquip {0}'),'protection'),true)\nassert.equal(has(card('Canopy Gargantuan','Creature — Beast','Flying, ward {2}'),'protection'),false)\nassert.equal(has(card('Canopy Gargantuan','Creature — Beast','Flying, ward {2}'),'self-protection'),true)\nassert.equal(has(card('Shielding Plax','Enchantment — Aura','Enchanted creature can\\'t be the target of spells or abilities your opponents control.'),'protection'),true)",
  'protection regression expectations'
))

console.log('SEMANTIC-15 HOTFIX APPLIED')
