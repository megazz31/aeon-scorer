import assert from 'node:assert/strict'
import { sampleFirstAccess,FIRST_ACCESS_MODEL_VERSION } from '../src/engine/firstAccessSampler.js'

const lcg=seed=>{let x=seed>>>0;return()=>((x=Math.imul(1664525,x)+1013904223>>>0)/4294967296)}
const land=(name,color='W')=>({name,isLand:true,type:`Basic Land — ${color==='W'?'Plains':'Island'}`,oracle:`{T}: Add {${color}}.`,sourceColors:[color],tags:[],cmc:0,colors:[]})
const spell=(name,{tags=[],interaction=0,type='Instant',cmc=1,color='W'}={})=>({name,isLand:false,type,oracle:'',sourceColors:[],tags,interaction,cmc,colors:[color],manaReq:{generic:0,colored:[[color]]}})
const commander=spell('Test Commander',{type:'Legendary Creature',cmc:1})
const cards=[...Array.from({length:70},(_,i)=>land(`Plains ${i}`)),...Array.from({length:10},(_,i)=>spell(`Interaction ${i}`,{interaction:4})),...Array.from({length:10},(_,i)=>spell(`Draw ${i}`,{tags:['draw']})),...Array.from({length:9},(_,i)=>spell(`Burst ${i}`,{tags:['extra-turn']}))]

const out=sampleFirstAccess({cards,commanders:[commander],packages:[],combos:[],iterations:80,maxTurn:7,rng:lcg(42)})
assert.equal(out.modelVersion,FIRST_ACCESS_MODEL_VERSION)
assert.equal(out.iterations,80)
assert.equal(out.maxTurn,7)
assert.equal(out.curves.commander.points.length,7)
assert.equal(out.commanders['Test Commander'].points.length,7)
for(const [key,curve] of Object.entries(out.curves)){
  assert.equal(curve.semantics,'cumulative-first-access')
  let prev=-1
  for(const p of curve.points){assert.ok(p.value>=0&&p.value<=100,`${key} must be bounded`);assert.ok(p.value>=prev,`${key} must be monotonic`);prev=p.value}
}
assert.ok(out.curves.commander.points.at(-1).value>0)
assert.ok(out.curves.interaction.points.at(-1).value>0)
assert.ok(out.curves.resource.points.at(-1).value>0)
assert.ok(out.curves.burst.points.at(-1).value>0)

const again=sampleFirstAccess({cards,commanders:[commander],packages:[],combos:[],iterations:80,maxTurn:7,rng:lcg(42)})
assert.deepEqual(again.curves,out.curves,'fixed seed must reproduce first-access curves')

console.log('FIRST ACCESS SAMPLER OK — deterministic cumulative first-access curves are bounded and monotonic')
