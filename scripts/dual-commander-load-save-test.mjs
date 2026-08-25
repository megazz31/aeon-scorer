import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { validateCommanderPair, combinedColorIdentity } from '../src/engine/commanderPair.js'
import { savedDeckToShareRow } from '../src/deckPickerSource.js'

// 1. Validate dual commander engine rules
const thrasios = { name: 'Thrasios, Triton Hero', oracle: 'Partner', type: 'Legendary Creature — Merfolk Wizard', colorIdentity: ['G', 'U'] }
const tymna = { name: 'Tymna the Weaver', oracle: 'Partner', type: 'Legendary Creature — Human Cleric', colorIdentity: ['W', 'B'] }
const tenth = { name: 'The Tenth Doctor', oracle: 'Allons-y!', type: 'Legendary Creature — Time Lord Doctor', colorIdentity: ['U', 'R'] }
const rose = { name: 'Rose Tyler', oracle: "Doctor's companion", type: 'Legendary Creature — Human', colorIdentity: ['W'] }
const wilson = { name: 'Wilson, Refined Grizzly', oracle: 'Choose a Background', type: 'Legendary Creature — Bear', colorIdentity: ['G'] }
const agent = { name: 'Agent of the Shadow Thieves', oracle: '', type: 'Legendary Enchantment — Background', colorIdentity: ['B'] }

const partnerValidation = validateCommanderPair(thrasios, tymna)
assert.equal(partnerValidation.ok, true)
assert.equal(partnerValidation.kind, 'partner')
assert.deepEqual(combinedColorIdentity([thrasios, tymna]), ['B', 'G', 'U', 'W'])

const docValidation = validateCommanderPair(tenth, rose)
assert.equal(docValidation.ok, true)
assert.equal(docValidation.kind, 'doctors-companion')
assert.deepEqual(combinedColorIdentity([tenth, rose]), ['R', 'U', 'W'])

const bgValidation = validateCommanderPair(wilson, agent)
assert.equal(bgValidation.ok, true)
assert.equal(bgValidation.kind, 'background')
assert.deepEqual(combinedColorIdentity([wilson, agent]), ['B', 'G'])

// 2. Test savedDeckToShareRow with single and dual commanders
const singleDeck = {
  id: 'single-1',
  name: 'Clavileño Deck',
  commander_name: 'Clavileño, First of the Blessed',
  latest: { median: 54, p20: 44, p80: 64, peak: 82, coverage: 96 }
}
const singleRow = savedDeckToShareRow(singleDeck)
assert.deepEqual(singleRow.commanderNames, ['Clavileño, First of the Blessed'])

const dualDeckWithPlus = {
  id: 'dual-1',
  name: 'Thrasios & Tymna cEDH',
  commander_name: 'Thrasios, Triton Hero + Tymna the Weaver',
  latest: {
    median: 78,
    result: {
      commanderNames: ['Thrasios, Triton Hero', 'Tymna the Weaver'],
      dimensions: { speed: 85 }
    }
  }
}
const dualRow = savedDeckToShareRow(dualDeckWithPlus)
assert.deepEqual(dualRow.commanderNames, ['Thrasios, Triton Hero', 'Tymna the Weaver'])

// 3. Verify CloudWorkspace.jsx handles commander1 and commander2 extraction & event dispatch
const cloudSource = fs.readFileSync(path.resolve('src/CloudWorkspace.jsx'), 'utf8')
assert.ok(cloudSource.includes("commander2:document.getElementById('commander2')"), 'CloudWorkspace must read commander2 from DOM')
assert.ok(cloudSource.includes("nativeSet(document.getElementById('commander'),c1)"), 'CloudWorkspace must populate commander 1 on load')
assert.ok(cloudSource.includes("nativeSet(document.getElementById('commander2'),c2)"), 'CloudWorkspace must populate commander 2 on load')
assert.ok(cloudSource.includes("window.dispatchEvent(new CustomEvent('aeon-deck-imported'"), 'CloudWorkspace must dispatch aeon-deck-imported on load')

// 4. Verify App.jsx listens to aeon-deck-imported and populates commander fields
const appSource = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8')
assert.ok(appSource.includes("addEventListener('aeon-deck-imported'"), 'App.jsx must listen to aeon-deck-imported')
assert.ok(appSource.includes("applyDeckImport"), 'App.jsx must call applyDeckImport')
assert.ok(appSource.includes("validateCommanderPair"), 'App.jsx must validate commander pairs')

// 5. Verify MultiCommanderControls.jsx listens to aeon-deck-imported and updates state
const multiControlsSource = fs.readFileSync(path.resolve('src/MultiCommanderControls.jsx'), 'utf8')
assert.ok(multiControlsSource.includes("addEventListener('aeon-deck-imported'"), 'MultiCommanderControls must listen to aeon-deck-imported')
assert.ok(multiControlsSource.includes("record:true,emitProduct:true"), 'MultiCommanderControls must record and emit product events')

console.log('DUAL COMMANDER LOAD & SAVE CONTRACT TEST PASSED.')
