import fs from 'node:fs'
import assert from 'node:assert/strict'

const model=fs.readFileSync(new URL('../src/engine/powerModel.js',import.meta.url),'utf8')
assert.match(model,/function hasTargetCommanderDiscount/,'target-based commander discounts must use a generalized detector rather than a Hinata-only exception')
assert.match(model,/for each target/,'Hinata-style per-target compression must remain represented')
assert.match(model,/target \(\?:a\|one or more\) creatures\?/,'Killian-style creature-target compression must share the same model-limit family')
assert.match(model,/commander-target-cost-reduction-not-simulated/,'machine-readable methodology must expose the limitation')
assert.match(model,/Hinata ou Killian/,'the user must be warned that target-cost commanders can currently be under-scored')
assert.match(model,/commander-top-library-cheat-not-simulated/,'Ureni-style top-library free deployment must also expose a machine-readable limitation until sequence-aware simulation exists')
console.log('TARGET-COST + TOP-LIBRARY MODEL LIMIT CONTRACT OK')
