import assert from 'node:assert/strict'
import { detectKnownCombos, comboScoringSignal, sequenceEligibleCombos } from '../src/engine/knownCombos.js'

const card=name=>({name})
const names=xs=>new Set(xs.map(x=>x.name))

const ob=detectKnownCombos([card('Ob Nixilis, Captive Kingpin'),card('All Will Be One'),card('Mountain')])
assert.equal(ob.length,1)
assert.ok(names(ob).has('Ob Nixilis + All Will Be One'),'Ob + AWBO loop from the real user corpus must be recognized')
assert.equal(comboScoringSignal(ob).families,1)
assert.equal(sequenceEligibleCombos(ob).length,0,'Ob + AWBO needs an exact-one-life trigger, so simple two-card access must not mark the combo executable')

const redshift=detectKnownCombos([
  card('Redshift, Rocketeer Chief'),
  card('Sword of the Paruns'),
  card('Umbral Mantle'),
  card('Staff of Domination'),
  card('Aggravated Assault'),
])
assert.equal(redshift.length,4,'all four observed Redshift combo lines must be recognized')
const signal=comboScoringSignal(redshift)
assert.equal(signal.families,1,'redundant Redshift untap lines are one engine family, not four independent engines')
assert.equal(signal.redundancy,3)
assert.ok(signal.boost>12&&signal.boost<25,'redundancy should matter with diminishing returns instead of fourfold linear inflation')
assert.equal(sequenceEligibleCombos(redshift).length,0,'Redshift loops need power, activation or combat thresholds that the generic access sampler does not establish')

const kalamax=detectKnownCombos([
  card('Kalamax, the Stormsire'),
  card('Twincast'),
  card('Return the Favor'),
  card('Expansion // Explosion'),
  card("Narset's Reversal"),
])
assert.equal(kalamax.length,3,'the three observed Kalamax copy-loop variants in the submitted list must be recognized')
const kalamaxSignal=comboScoringSignal(kalamax)
assert.equal(kalamaxSignal.families,1,'Kalamax fork variants are redundant routes to one copy-loop engine')
assert.equal(kalamaxSignal.redundancy,2)
assert.ok(kalamaxSignal.boost>9&&kalamaxSignal.boost<16,'Kalamax infinite magecraft/counter loops must score below a direct deterministic win while redundancy still matters')
assert.ok(!names(kalamax).has("Kalamax + Narset's Reversal"),'Narset Reversal alone is not a two-card Kalamax loop and must not be promoted')
assert.equal(sequenceEligibleCombos(kalamax).length,0,'Kalamax copy loops need a tapped commander plus another spell on the stack, so simple card access is insufficient')

const independent=detectKnownCombos([
  card("Thassa's Oracle"),card('Demonic Consultation'),
  card('Isochron Scepter'),card('Dramatic Reversal'),
])
const independentSignal=comboScoringSignal(independent)
assert.equal(independentSignal.families,2,'independent combo families remain independently valuable')
assert.ok(independentSignal.boost>20)
assert.equal(sequenceEligibleCombos(independent).length,2,'legacy deterministic two-card combos without hidden prerequisites remain eligible for sequence access')

console.log('USER CORPUS COMBO REGRESSION OK — presence, redundancy and executable timing are separated')
