import assert from 'node:assert/strict'
import { buildAdvancedPodMatch } from '../src/engine/podIntelligence.js'

const deck=()=>({profile:{median:50,floor:42,ceiling:58,peak:70},dimensions:{speed:50,explosiveness:45},experience:{dimensions:{volatility:{score:30}}},friction:{signals:{}},horizon:{curves:{interaction:{points:[]},burst:{points:[]},engine:{points:[]}}},methodology:{maxTurn:7}})
const decks=[deck(),deck()]
const safeTimeline={modelVersion:'threat-answer-v2',decks:[{index:0,turns:[{turn:4,gap:0}]},{index:1,turns:[{turn:4,gap:0}]}]}
const exposedTimeline={modelVersion:'threat-answer-v2',decks:[{index:0,turns:[{turn:4,gap:80}]},{index:1,turns:[{turn:4,gap:0}]}]}
const safe=buildAdvancedPodMatch(decks,safeTimeline),exposed=buildAdvancedPodMatch(decks,exposedTimeline)
assert.equal(exposed.modelVersion,'advanced-pod-match-v2')
assert.equal(exposed.threatAnswerModel,'threat-answer-v2')
assert.ok(exposed.mismatch>safe.mismatch)
assert.equal(exposed.pairs[0].reasons.threatAnswerExposure,80)
console.log('POD THREAT MATCH OK — exposed Threat–Answer windows independently increase Pod Match mismatch')
