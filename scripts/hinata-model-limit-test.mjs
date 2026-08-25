import fs from 'node:fs'
import assert from 'node:assert/strict'

const model=fs.readFileSync(new URL('../src/engine/powerModel.js',import.meta.url),'utf8')
assert.match(model,/spells you cast cost \\{1\\} less to cast for each target/i,'Hinata-style commander text must be detected explicitly')
assert.match(model,/commander-target-cost-reduction-not-simulated/,'machine-readable methodology must expose the limitation')
assert.match(model,/Le score peut donc être conservateur pour les decks de type Hinata/,'the user must be warned that this mechanic can be under-scored')
console.log('HINATA MODEL LIMIT CONTRACT OK')
