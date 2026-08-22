import { buildAdvancedPodMatch } from './podIntelligence.js'

const stableId=p=>String(p?.id||p?.name||p?.analysis?.commanderNames?.join('+')||'player')
const assess=players=>buildAdvancedPodMatch(players.map(p=>p.analysis))
const sum=pods=>pods.reduce((s,p)=>s+Number(p.assessment?.mismatch??assess(p.players).mismatch),0)

export function buildCrossTableRepairs(match={},limit=5){
  const pods=(match.pods||[]).filter(p=>Array.isArray(p.players)&&p.players.length>0).map(p=>({...p,players:[...p.players],assessment:p.assessment||assess(p.players)}))
  const beforeTotal=Number(match.totalMismatch??sum(pods)),repairs=[]
  let evaluatedSwaps=0
  for(let a=0;a<pods.length;a++)for(let b=a+1;b<pods.length;b++)for(let i=0;i<pods[a].players.length;i++)for(let j=0;j<pods[b].players.length;j++){
    evaluatedSwaps++
    const pa=pods[a].players[i],pb=pods[b].players[j],nextA=[...pods[a].players],nextB=[...pods[b].players];nextA[i]=pb;nextB[j]=pa
    const assessmentA=assess(nextA),assessmentB=assess(nextB),afterTotal=beforeTotal-pods[a].assessment.mismatch-pods[b].assessment.mismatch+assessmentA.mismatch+assessmentB.mismatch,improvement=beforeTotal-afterTotal
    if(improvement<=0)continue
    const ids=[...nextA,...nextB].map(stableId)
    if(new Set(ids).size!==ids.length)continue
    repairs.push({
      type:'cross-table-swap',
      tableA:pods[a].table??a+1,tableB:pods[b].table??b+1,
      swap:{aId:stableId(pa),aName:pa.name||stableId(pa),bId:stableId(pb),bName:pb.name||stableId(pb)},
      before:{total:beforeTotal,tableA:pods[a].assessment.mismatch,tableB:pods[b].assessment.mismatch},
      after:{total:afterTotal,tableA:assessmentA.mismatch,tableB:assessmentB.mismatch},
      improvement,
    })
  }
  repairs.sort((x,y)=>y.improvement-x.improvement||x.after.total-y.after.total||`${x.tableA}:${x.swap.aId}:${x.tableB}:${x.swap.bId}`.localeCompare(`${y.tableA}:${y.swap.aId}:${y.tableB}:${y.swap.bId}`))
  return {modelVersion:'pod-repair-v2',beforeTotal,evaluatedSwaps,locallyOptimal:repairs.length===0,repairs:repairs.slice(0,Math.max(1,Number(limit)||5)),confidence:{objective:'advanced-pod-match',productCalibration:'experimental'},notes:['Suggestions are true two-way swaps, so every player remains assigned exactly once.','If no repair is returned, no single 1↔1 cross-table swap improves the current Aeon Match objective.','V2 audits the current objective only; it does not claim a globally optimal social outcome beyond the exact small-N solver.']}
}
