import assert from 'node:assert/strict'
import fs from 'node:fs'

const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')
const chrome=fs.readFileSync(new URL('../src/GlobalProductChrome.jsx',import.meta.url),'utf8')
const ux=fs.readFileSync(new URL('../src/UxEnhancements.jsx',import.meta.url),'utf8')
const stats=fs.readFileSync(new URL('../api/precon-stats.js',import.meta.url),'utf8')

assert.match(main,/GlobalProductChrome/)
assert.doesNotMatch(main,/publicLibraryShortcut/)
for(const route of ['/decklists-publiques','/pod','/match','/tournoi'])assert.match(chrome,new RegExp(route.replaceAll('/','\\/')))
assert.match(chrome,/Préconstruits/)
assert.match(chrome,/moyenne des scores/)
assert.match(stats,/aggregate-over-supported-public-precons-v1/)
assert.match(stats,/median:rounded\(median\(medians\)\)/)
assert.match(ux,/semantic model|modèle sémantique/)
assert.doesNotMatch(ux,/MODEL_ID/)
assert.match(ux,/\/api\/precon-stats/)
console.log('NAVIGATION UX CONTRACT OK — global routes, current precon reference and product-version footer')
