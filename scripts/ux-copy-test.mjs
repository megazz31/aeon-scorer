import assert from 'node:assert/strict'
import { productLabel,metricLabel,methodLabel,packageStrength,visibleTagLabels } from '../src/uxCopy.js'
assert.equal(productLabel('compare','fr'),'Comparer 2–4 decks')
assert.equal(productLabel('tables','fr'),'Former des tables de 4')
assert.equal(productLabel('tournament','fr'),'Créer un arbre de tournoi')
assert.equal(metricLabel('resourceDenial','fr'),'Déni de ressources')
assert.equal(metricLabel('exileInteraction','fr'),'Sensible à l’exil')
assert.equal(methodLabel('cumulative-first-access','fr'),'Premier accès fiable')
assert.equal(packageStrength(100,'fr'),'Très élevé')
assert.deepEqual(visibleTagLabels(['creature','draw','counter-producer','counter-kind:plus1'],'fr',8),['Pioche','Produit des marqueurs'])
console.log('UX COPY CONTRACT OK')
