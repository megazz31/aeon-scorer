import assert from 'node:assert/strict'
import { buildGoldfishHorizon,HORIZON_MODEL_VERSION } from '../src/engine/goldfishHorizon.js'

const result={simulation:{iterations:3200,turnProfile:[
  {turn:1,commander:0,engine:5,interaction:10,resource:8,burst:3},
  {turn:2,commander:10,engine:30,interaction:28,resource:22,burst:15},
  {turn:3,commander:45,engine:60,interaction:55,resource:40,burst:35},
  {turn:4,commander:70,engine:40,interaction:65,resource:58,burst:50},
],firstAccess:{modelVersion:'first-access-sampler-v1',iterations:800,maxTurn:4,curves:{
  commander:{points:[{turn:1,value:0},{turn:2,value:10},{turn:3,value:45},{turn:4,value:70}],observedWithinHorizon:560},
  engine:{points:[{turn:1,value:5},{turn:2,value:28},{turn:3,value:61},{turn:4,value:74}],observedWithinHorizon:592},
  interaction:{points:[{turn:1,value:10},{turn:2,value:31},{turn:3,value:58},{turn:4,value:79}],observedWithinHorizon:632},
  resource:{points:[{turn:1,value:8},{turn:2,value:24},{turn:3,value:43},{turn:4,value:62}],observedWithinHorizon:496},
  burst:{points:[{turn:1,value:3},{turn:2,value:15},{turn:3,value:36},{turn:4,value:55}],observedWithinHorizon:440},
}}},methodology:{maxTurn:4,iterations:3200}}

const h=buildGoldfishHorizon(result)
assert.equal(h.modelVersion,HORIZON_MODEL_VERSION)
assert.equal(h.maxTurn,4)
assert.equal(h.firstAccessIterations,800)
assert.equal(h.curves.commander.milestones.at50,4)
assert.equal(h.curves.engine.milestones.at50,3)
assert.deepEqual(h.curves.engine.points.map(x=>x.value),[5,28,61,74],'preferred Horizon curve must be cumulative first access')
assert.equal(h.curves.engine.semantics,'cumulative-first-access')
assert.deepEqual(h.availabilityCurves.engine.points.map(x=>x.value),[5,30,60,40],'historical on-turn engine data must remain unchanged')
assert.equal(h.availabilityCurves.engine.semantics,'available-on-turn')
assert.equal(h.availabilityCurves.commander.semantics,'online-by-turn')
assert.equal(h.confidence.simulation,'high')
assert.equal(h.confidence.firstAccess,'high')
assert.equal(h.provenance.preferred,'first-access-sampler-v1')

const fallback=buildGoldfishHorizon({simulation:{iterations:600,turnProfile:[{turn:1,commander:0,engine:20,interaction:10,resource:5,burst:0},{turn:2,commander:20,engine:10,interaction:30,resource:15,burst:12}]},methodology:{maxTurn:2,iterations:600}})
assert.equal(fallback.curves.engine.semantics,'available-on-turn')
assert.deepEqual(fallback.curves.engine.points.map(x=>x.value),[20,10])
assert.equal(fallback.confidence.firstAccess,'unavailable')

const empty=buildGoldfishHorizon({methodology:{maxTurn:7,iterations:300}})
assert.equal(empty.maxTurn,7)
assert.deepEqual(empty.curves.burst.points,[])

console.log('GOLDFISH HORIZON V2 OK — true cumulative first access preferred, historical availability preserved')
