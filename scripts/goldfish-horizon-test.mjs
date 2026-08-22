import assert from 'node:assert/strict'
import { buildGoldfishHorizon,HORIZON_MODEL_VERSION } from '../src/engine/goldfishHorizon.js'

const result={simulation:{iterations:3200,turnProfile:[
  {turn:1,commander:0,engine:5,interaction:10,resource:8,burst:3},
  {turn:2,commander:10,engine:30,interaction:28,resource:22,burst:15},
  {turn:3,commander:45,engine:60,interaction:55,resource:40,burst:35},
  {turn:4,commander:70,engine:40,interaction:65,resource:58,burst:50},
]},methodology:{maxTurn:4,iterations:3200}}

const h=buildGoldfishHorizon(result)
assert.equal(h.modelVersion,HORIZON_MODEL_VERSION)
assert.equal(h.maxTurn,4)
assert.equal(h.curves.commander.milestones.at50,4)
assert.equal(h.curves.engine.milestones.at50,3)
assert.deepEqual(h.curves.engine.points.map(x=>x.value),[5,30,60,40],'on-turn engine data must not be forced monotonic')
assert.equal(h.curves.engine.semantics,'available-on-turn')
assert.equal(h.curves.commander.semantics,'online-by-turn')
assert.equal(h.confidence.simulation,'high')

const empty=buildGoldfishHorizon({methodology:{maxTurn:7,iterations:300}})
assert.equal(empty.maxTurn,7)
assert.deepEqual(empty.curves.burst.points,[])

console.log('GOLDFISH HORIZON OK — temporal semantics preserved without fake cumulative access')
