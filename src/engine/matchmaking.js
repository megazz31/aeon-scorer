import { buildAdvancedPodMatch } from './podIntelligence.js'

const stableId=p=>String(p?.id||p?.name||p?.analysis?.commanderNames?.join('+')||'player')
const podScore=pod=>buildAdvancedPodMatch(pod.map(p=>p.analysis)).mismatch
const totalScore=pods=>pods.reduce((s,p)=>s+podScore(p),0)

function initialPods(players,podSize){
  const sorted=[...players].sort((a,b)=>(b.analysis?.profile?.median||0)-(a.analysis?.profile?.median||0)||stableId(a).localeCompare(stableId(b)))
  const pods=[]
  while(sorted.length){const pod=[sorted.shift()];while(pod.length<podSize&&sorted.length){let best=0,bestScore=Infinity;for(let i=0;i<sorted.length;i++){const s=podScore([...pod,sorted[i]]);if(s<bestScore){bestScore=s;best=i}}pod.push(sorted.splice(best,1)[0])}pods.push(pod)}
  return pods
}

function improvePods(pods){
  let best=pods.map(p=>[...p]),bestScore=totalScore(best),changed=true,passes=0
  while(changed&&passes++<8){changed=false;outer:for(let a=0;a<best.length;a++)for(let b=a+1;b<best.length;b++)for(let i=0;i<best[a].length;i++)for(let j=0;j<best[b].length;j++){
    const next=best.map(p=>[...p]);[next[a][i],next[b][j]]=[next[b][j],next[a][i]];const score=totalScore(next)
    if(score<bestScore){best=next;bestScore=score;changed=true;break outer}
  }}
  return best
}

export function formPods(players=[],options={}){
  const podSize=Math.max(2,Number(options.podSize||4)),valid=players.filter(p=>p?.analysis)
  if(valid.length<podSize)return {modelVersion:'aeon-match-v1',pods:[],unassigned:valid,reason:'not-enough-players',confidence:{productCalibration:'experimental'}}
  const fullCount=Math.floor(valid.length/podSize)*podSize,working=valid.slice(0,fullCount),unassigned=valid.slice(fullCount),pods=improvePods(initialPods(working,podSize))
  return {modelVersion:'aeon-match-v1',pods:pods.map((players,index)=>({table:index+1,players,assessment:buildAdvancedPodMatch(players.map(p=>p.analysis))})),unassigned,totalMismatch:totalScore(pods),algorithm:'deterministic-greedy-local-swap',confidence:{productCalibration:'experimental'},notes:['V1 optimizes existing multi-axis Pod Match mismatch.','Small-N exhaustive optimality checks belong in validation fixtures; V1 does not claim global optimum.']}
}

export function repairPod(pod=[],alternatives=[]){
  const current=buildAdvancedPodMatch(pod.map(p=>p.analysis)),repairs=[]
  for(let i=0;i<pod.length;i++)for(const alt of alternatives.filter(x=>x?.analysis)){
    if(pod.some(p=>stableId(p)===stableId(alt)))continue
    const next=[...pod];const removed=next[i];next[i]=alt;const assessment=buildAdvancedPodMatch(next.map(p=>p.analysis))
    if(assessment.mismatch<current.mismatch)repairs.push({type:'replace-player-or-deck',remove:stableId(removed),add:stableId(alt),before:current.mismatch,after:assessment.mismatch,improvement:current.mismatch-assessment.mismatch,assessment})
  }
  repairs.sort((a,b)=>b.improvement-a.improvement||a.after-b.after)
  return {modelVersion:'pod-repair-v1',current,repairs:repairs.slice(0,5),confidence:{productCalibration:'experimental'},notes:['V1 prefers rearrangement/replacement evidence; it never requires deck modification.']}
}
