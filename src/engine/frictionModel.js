export const FRICTION_MODEL_VERSION='friction-v1'

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):0))
const levelFor=score=>score<=0?'none':score<25?'low':score<55?'moderate':'high'
const clean=s=>String(s||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim().toLowerCase()
const isSpell=c=>/\binstant\b|\bsorcery\b/i.test(c?.type||'')
const uniqByName=xs=>{const seen=new Set();return xs.filter(x=>{const k=String(x.name||'').toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true})}
function recurringCard(c,text){return !!c?.recurring||(!isSpell(c)&&((c?.tags||[]).includes('stax')||/\bwhenever\b|\bat the beginning\b|:\s*[^.]+|\bcan(?:'|’)?t\b|\bcosts? [^.]{0,60} more\b|\bdon(?:'|’)?t untap\b/.test(text)))}
function entry(c,signal,reason,factor=1){const text=clean(c?.oracle),recurring=recurringCard(c,text);return {name:c.name,signal,reason,recurring,weight:(recurring?2:1)*factor}}
function scoreEntries(entries,factor=1){const rows=uniqByName(entries),weight=rows.reduce((s,x)=>s+x.weight,0),redundancy=Math.max(0,rows.length-1)*6;return Math.round(clamp((weight*18+redundancy)*factor))}
function signal(id,label,entries,{factor=1,override=null,note=null}={}){const score=override==null?scoreEntries(entries,factor):Math.round(clamp(override));return {id,label,level:levelFor(score),score,evidence:uniqByName(entries).map(({name,reason,recurring,weight})=>({name,reason,recurring,weight})).slice(0,8),note}}

export function buildTableFriction(result={},cards=[]){
  const pool=(Array.isArray(cards)?cards:[]).filter(c=>!c?.isLand&&!/\bland\b/i.test(c?.type||'')),buckets={resourceDenial:[],massLandDenial:[],commanderLockout:[],theft:[],extraTurns:[],forcedDiscardSacrifice:[]}
  for(const c of pool){
    const s=clean(c.oracle),tags=new Set(c.tags||[])
    if(tags.has('stax')||/\bopponents? can(?:'|’)?t (?:cast|play|activate|attack|block|draw|search|untap)|\bspells? (?:your opponents? cast )?cost [^.]{0,80} more|\bpermanents? (?:your opponents? control )?don(?:'|’)?t untap|\bplayers can(?:'|’)?t (?:cast|play|activate|draw|search)/.test(s))buckets.resourceDenial.push(entry(c,'resource-denial','Persistent or repeated restriction on normal game resources/actions.'))
    if(/\bdestroy all lands\b|\beach player sacrifices? [^.]{0,50}\blands?\b|\blands? [^.]{0,40}don(?:'|’)?t untap|\breturn all lands\b[^.]{0,60}\bto (?:their owners?|owners?) hands?\b/.test(s))buckets.massLandDenial.push(entry(c,'mass-land-denial','Affects many lands or broadly prevents land use.',1.35))
    if(/\bopponents? can(?:'|’)?t cast spells? from anywhere other than their hands\b|\bcan(?:'|’)?t cast (?:your|their|a) commander\b|\bcommanders? [^.]{0,80}(?:lose|loses|can(?:'|’)?t|cannot)\b|\bcommand zone\b[^.]{0,80}\bcan(?:'|’)?t\b/.test(s))buckets.commanderLockout.push(entry(c,'commander-lockout','Directly restricts casting or using commanders.',1.2))
    if(/\bgain control of (?:target|another|a|an|all)\b|\bexchange control of\b|\byou control enchanted (?:creature|permanent)\b/.test(s))buckets.theft.push(entry(c,'theft','Changes control of opposing permanents.'))
    if(tags.has('extra-turn')||/\btake an extra turn\b/.test(s))buckets.extraTurns.push(entry(c,'extra-turns','Creates additional turns.'))
    if(/\b(?:target|each) opponents? discards?\b|\beach player discards?\b|\b(?:target|each) opponents? sacrifices?\b|\beach player sacrifices? (?:a|one or more|two|three|x|all)\b/.test(s))buckets.forcedDiscardSacrifice.push(entry(c,'forced-discard-sacrifice','Forces discard or sacrifice rather than merely observing it.'))
  }
  const persistentRestrictions=buckets.resourceDenial.filter(x=>x.recurring).length+buckets.commanderLockout.filter(x=>x.recurring).length+buckets.massLandDenial.filter(x=>x.recurring).length
  const restrictionFamilies=[buckets.resourceDenial.length,buckets.commanderLockout.length,buckets.massLandDenial.length].filter(Boolean).length
  const lockPotential=Math.round(clamp(persistentRestrictions*24+Math.max(0,persistentRestrictions-1)*8+Math.max(0,restrictionFamilies-1)*10))
  const complexity=Number(result?.experience?.dimensions?.turnComplexity?.score||0)
  const complexityEvidence=complexity>0?[{name:'Experience Fingerprint',reason:'Turn Complexity proxy from recurring/chained semantic actions.',recurring:true,weight:complexity/18}]:[]
  const signals={
    resourceDenial:signal('resource-denial','Resource denial / taxes',buckets.resourceDenial),
    massLandDenial:signal('mass-land-denial','Mass land denial',buckets.massLandDenial,{factor:1.1}),
    commanderLockout:signal('commander-lockout','Commander lockout',buckets.commanderLockout),
    theft:signal('theft','Theft / control exchange',buckets.theft),
    extraTurns:signal('extra-turns','Extra-turn recurrence',buckets.extraTurns),
    forcedDiscardSacrifice:signal('forced-discard-sacrifice','Forced discard / sacrifice',buckets.forcedDiscardSacrifice),
    lockPotential:signal('lock-potential','Restriction stacking potential',[],{override:lockPotential,note:'V1 requires multiple persistent restriction effects; it does not claim a deterministic hard lock.'}),
    longSequencing:signal('long-sequencing','Long sequencing potential',complexityEvidence,{override:complexity,note:'Derived from Experience Fingerprint turn-complexity evidence; not calibrated to real clock time.'}),
  }
  return {
    modelVersion:FRICTION_MODEL_VERSION,
    signals,
    notable:Object.values(signals).filter(x=>x.level!=='none'&&x.level!=='low').sort((a,b)=>b.score-a.score).map(x=>x.id),
    confidence:{productCalibration:'experimental',evidenceCoverage:pool.length>=20?'full':'partial'},
    notes:['Table Friction is descriptive, not moralized: signals describe table-relevant characteristics rather than good/bad behavior.','V1 intentionally omits deterministic-loop classification until combo evidence contains reliable loop/prerequisite metadata.'],
  }
}
