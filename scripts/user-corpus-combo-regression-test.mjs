import assert from 'node:assert/strict'
import { detectKnownCombos, comboScoringSignal } from '../src/engine/knownCombos.js'

const card=name=>({name})
const names=xs=>new Set(xs.map(x=>x.name))

const ob=detectKnownCombos([card('Ob Nixilis, Captive Kingpin'),card('All Will Be One'),card('Mountain')])
assert.equal(ob.length,1)
assert.ok(names(ob).has('Ob Nixilis + All Will Be One'),'Ob + AWBO loop from the real user corpus must be recognized')
assert.equal(comboScoringSignal(ob).families,1)

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

const independent=detectKnownCombos([
  card("Thassa's Oracle"),card('Demonic Consultation'),
  card('Isochron Scepter'),card('Dramatic Reversal'),
])
const independentSignal=comboScoringSignal(independent)
assert.equal(independentSignal.families,2,'independent combo families remain independently valuable')
assert.ok(independentSignal.boost>20)

console.log('USER CORPUS COMBO REGRESSION OK — Ob and Redshift loops are recognized with diminishing-return redundancy')
