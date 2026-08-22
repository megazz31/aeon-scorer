import assert from 'node:assert/strict'
import fs from 'node:fs'
import { sampleFirstAccess,FIRST_ACCESS_MODEL_VERSION } from '../src/engine/firstAccessSampler.js'
import { analyzePower } from '../src/engine/powerModel.js'

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

// Power isolation: first-access sampling runs after scoring on its own RNG stream.
const fixture=JSON.parse(fs.readFileSync(new URL('../public/precons/blood-rites-lcc.json',import.meta.url),'utf8')),byName=new Map(fixture.oracleCards.map(c=>[c.name.toLowerCase(),c])),expanded=[]
for(const line of fixture.decklist.split(/\r?\n/)){const m=line.match(/^(\d+)\s+(.+)$/);if(!m)continue;const card=byName.get(m[2].toLowerCase());if(!card)continue;for(let i=0;i<Number(m[1]);i++)expanded.push({...card})}
const fixtureCommander=fixture.oracleCards.find(c=>c.isCommander)||byName.get(String(fixture.commanderName||'').toLowerCase())
assert.ok(fixtureCommander)
const without=analyzePower(expanded,fixtureCommander,null,80,{firstAccess:false,emitProduct:false,record:false}),withFirst=analyzePower(expanded,fixtureCommander,null,80,{emitProduct:false,record:false})
assert.deepEqual(withFirst.profile,without.profile,'first-access instrumentation must not change the Aeon power profile')
assert.deepEqual(withFirst.dimensions,without.dimensions,'first-access instrumentation must not change power dimensions')
assert.deepEqual(withFirst.simulation.turnProfile,without.simulation.turnProfile,'main simulation turn profile must remain identical')
assert.equal(without.simulation.firstAccess,undefined)
assert.equal(withFirst.simulation.firstAccess.modelVersion,FIRST_ACCESS_MODEL_VERSION)
assert.equal(withFirst.methodology.firstAccessIterations,Math.min(80,Math.max(80,Math.floor(80/3))))

console.log('FIRST ACCESS SAMPLER OK — deterministic cumulative first-access curves are bounded, monotonic and power-isolated')
