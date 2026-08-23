import assert from 'node:assert/strict'
import { buildVulnerabilityMatrix,buildGameQualityForecast } from '../src/engine/gameQuality.js'

const vulnerable={profile:{commanderDelta:15},dimensions:{speed:35,explosiveness:45},roles:{protection:0,recursion:7,avgCmc:4.2,fastMana:0},experience:{dimensions:{turnComplexity:{score:45}}},spof:{dependencies:{commander:{score:78},graveyard:{score:84},artifact:{score:20},enchantment:{score:10},creatureBoard:{score:25}}},combos:[],friction:{signals:{}}}
const matrix=buildVulnerabilityMatrix(vulnerable)
assert.ok(matrix.classes.resourceDenial)
assert.ok(matrix.classes.exileInteraction)
assert.equal(matrix.modelVersion,'vulnerability-v2')

const target={...vulnerable,vulnerability:matrix,answerProfile:{classes:{}},spof:vulnerable.spof}
const neutralOpponent={vulnerability:{classes:{}},answerProfile:{classes:{graveyard:{availabilityScale:0.05}}},friction:{signals:{}},spof:{dependencies:{commander:{score:0}}}}
const hateOpponent={...neutralOpponent,answerProfile:{classes:{graveyard:{availabilityScale:0.85}}}}
const baseMatch={mismatch:20,pairs:[]},emptyThreat={decks:[]}
const neutral=buildGameQualityForecast([target,neutralOpponent],baseMatch,emptyThreat)
const hardCounter=buildGameQualityForecast([target,hateOpponent],baseMatch,emptyThreat)
assert.equal(hardCounter.modelVersion,'game-quality-v2')
assert.ok(hardCounter.risk.score>neutral.risk.score)
assert.ok(hardCounter.reasons.some(r=>r.signal==='structural-hard-counter'&&r.answerClass==='graveyard'))
console.log('GAME QUALITY HARD COUNTER OK — vulnerability versus opponent answer coverage increases categorical risk')
