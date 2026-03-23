// ============================================================
// AEON SCORER v11 — MATCH SIMULATOR ENGINE
// Simulates 6-7 turn games between two decklists
// Both players play optimally with perfect information
// ============================================================

function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function parseCardForSim(card){
  const o=(card.oracle||"").toLowerCase();const t=(card.type||"").toLowerCase();
  const isCreature=t.includes("creature");
  const isLand=t.includes("land");
  const isRemoval=/destroy target|exile target|deals? \d+ damage to (any|target)|target creature gets -/i.test(o);
  const isBurn=/deals? (\d+) damage/i.test(o);
  const burnDmg=isBurn?(parseInt(o.match(/deals? (\d+) damage/i)?.[1])||0):0;
  const hasFlying=/\bflying\b/i.test(o);
  const hasDeathtouch=/\bdeathtouch\b/i.test(o);
  const hasLifelink=/\blifelink\b/i.test(o);
  const hasHaste=/\bhaste\b/i.test(o);
  const hasTrample=/\btrample\b/i.test(o);
  const pw=parseInt(card.power)||0;
  const th=parseInt(card.toughness)||0;
  return{...card,isCreature,isLand,isRemoval,isBurn,burnDmg,hasFlying,hasDeathtouch,hasLifelink,hasHaste,hasTrample,pw,th,tapped:false,sick:true,dmgTaken:0};
}

function createPlayer(decklist){
  const cards=[];
  for(const c of decklist){const qty=c.qty||1;for(let i=0;i<qty;i++)cards.push(parseCardForSim(c));}
  const lib=shuffle(cards);
  return{life:20,hand:[],board:[],lands:[],graveyard:[],library:lib,landDropUsed:false};
}

function manaAvailable(player){
  return player.lands.filter(l=>!l.tapped).length;
}

function canCast(card,mana){
  return !card.isLand&&(card.cmc||0)<=mana;
}

function bestLand(hand){
  return hand.find(c=>c.isLand);
}

// AI: Choose what to cast — priority system
function chooseCast(hand,mana,opponentBoard,isRemovalPriority){
  const castable=hand.filter(c=>canCast(c,mana)).sort((a,b)=>(b.cmc||0)-(a.cmc||0));
  if(castable.length===0)return null;
  // Priority 1: If opponent has big creatures, use removal
  if(isRemovalPriority){
    const removal=castable.find(c=>c.isRemoval);
    if(removal)return{card:removal,target:opponentBoard.sort((a,b)=>b.pw-a.pw)[0]||null};
  }
  // Priority 2: If opponent has creatures and we have removal
  const oppBiggest=opponentBoard.sort((a,b)=>b.pw-a.pw)[0];
  if(oppBiggest&&oppBiggest.pw>=3){
    const removal=castable.find(c=>c.isRemoval);
    if(removal)return{card:removal,target:oppBiggest};
  }
  // Priority 3: Burn to face if opponent low
  // Priority 4: Cast biggest creature or spell
  const creature=castable.find(c=>c.isCreature);
  if(creature)return{card:creature,target:null};
  return{card:castable[0],target:null};
}

// Optimal blocking: minimize damage taken
function assignBlockers(attackers,blockers){
  const assignments=[];const usedBlockers=new Set();
  // Sort attackers by power desc (block biggest first)
  const sorted=[...attackers].sort((a,b)=>b.pw-a.pw);
  for(const atk of sorted){
    // Find best blocker: one that kills the attacker and survives, or trades
    let bestBlocker=null;let bestScore=-1;
    for(const blk of blockers){
      if(usedBlockers.has(blk))continue;
      if(atk.hasFlying&&!blk.hasFlying)continue; // can't block flying without flying
      let score=0;
      if(blk.th>atk.pw)score+=10; // blocker survives
      if(blk.pw>=atk.th||blk.hasDeathtouch)score+=5; // kills attacker
      if(blk.pw<atk.pw)score+=2; // chump block is ok
      if(score>bestScore){bestScore=score;bestBlocker=blk;}
    }
    if(bestBlocker&&(atk.pw>=3||bestScore>=5)){ // only block if worth it
      assignments.push({attacker:atk,blocker:bestBlocker});
      usedBlockers.add(bestBlocker);
    }
  }
  return assignments;
}

function simulateGame(deck1,deck2,maxTurns=7){
  const p1=createPlayer(deck1);
  const p2=createPlayer(deck2);
  // Draw opening hands (7 cards)
  for(let i=0;i<7;i++){if(p1.library.length)p1.hand.push(p1.library.shift());if(p2.library.length)p2.hand.push(p2.library.shift());}
  // Simple mulligan: if 0-1 or 6-7 lands, redraw
  for(const p of[p1,p2]){
    const lc=p.hand.filter(c=>c.isLand).length;
    if(lc<=1||lc>=6){p.library=[...p.library,...p.hand];p.hand=[];p.library=shuffle(p.library);for(let i=0;i<7;i++){if(p.library.length)p.hand.push(p.library.shift());}}
  }

  const turnLog=[];
  let winner=null;

  for(let turn=1;turn<=maxTurns;turn++){
    for(const[active,passive,label]of[[p1,p2,"P1"],[p2,p1,"P2"]]){
      if(active.life<=0||passive.life<=0){winner=active.life<=0?label==="P1"?"P2":"P1":label;break;}

      // Untap
      active.board.forEach(c=>{c.tapped=false;c.sick=false;});
      active.lands.forEach(l=>{l.tapped=false;});

      // Draw (skip turn 1 for P1 if desired — we'll keep it simple)
      if(active.library.length)active.hand.push(active.library.shift());

      // Land drop
      active.landDropUsed=false;
      const land=bestLand(active.hand);
      if(land){active.hand=active.hand.filter(c=>c!==land);active.lands.push(land);active.landDropUsed=true;}

      // Cast spells
      let mana=manaAvailable(active);let castCount=0;
      while(mana>0&&castCount<3){ // max 3 spells per turn to avoid infinite loops
        const choice=chooseCast(active.hand,mana,passive.board,passive.board.some(c=>c.pw>=4));
        if(!choice)break;
        const{card,target}=choice;
        active.hand=active.hand.filter(c=>c!==card);
        // Tap lands for mana
        let paid=0;for(const l of active.lands){if(!l.tapped&&paid<(card.cmc||0)){l.tapped=true;paid++;}}
        mana=manaAvailable(active);

        if(card.isCreature){
          card.sick=!card.hasHaste;card.tapped=false;card.dmgTaken=0;
          active.board.push(card);
        }else if(card.isRemoval&&target){
          passive.board=passive.board.filter(c=>c!==target);
          passive.graveyard.push(target);
        }else if(card.isBurn){
          passive.life-=card.burnDmg;
        }
        active.graveyard.push({...card}); // non-permanents go to GY (simplified)
        castCount++;
      }

      // Combat
      const attackers=active.board.filter(c=>!c.tapped&&!c.sick);
      if(attackers.length>0){
        const blocks=assignBlockers(attackers,passive.board);
        const blocked=new Set(blocks.map(b=>b.attacker));
        // Resolve blocked combat
        for(const{attacker,blocker}of blocks){
          const atkKills=attacker.pw>=blocker.th||attacker.hasDeathtouch;
          const blkKills=blocker.pw>=attacker.th||blocker.hasDeathtouch;
          if(atkKills){passive.board=passive.board.filter(c=>c!==blocker);passive.graveyard.push(blocker);}
          if(blkKills){active.board=active.board.filter(c=>c!==attacker);active.graveyard.push(attacker);}
          // Trample damage
          if(attacker.hasTrample&&attacker.pw>blocker.th){passive.life-=(attacker.pw-blocker.th);}
          // Lifelink
          if(attacker.hasLifelink&&atkKills)active.life+=attacker.pw;
        }
        // Unblocked damage
        let totalDmg=0;
        for(const atk of attackers){
          if(!blocked.has(atk)){totalDmg+=atk.pw;if(atk.hasLifelink)active.life+=atk.pw;}
        }
        passive.life-=totalDmg;
      }

      // Mark creatures as no longer sick
      active.board.forEach(c=>{c.sick=false;});
    }
    turnLog.push({turn,p1Life:p1.life,p2Life:p2.life,p1Board:p1.board.length,p2Board:p2.board.length});
    if(p1.life<=0||p2.life<=0){winner=p1.life<=0?"P2":"P1";break;}
  }

  if(!winner)winner=p1.life>p2.life?"P1":p2.life>p1.life?"P2":"Draw";
  return{winner,p1Life:p1.life,p2Life:p2.life,turns:turnLog.length,turnLog,
    p1BoardFinal:p1.board.length,p2BoardFinal:p2.board.length};
}

// Run N simulations
export function simulateMatchup(deck1,deck2,iterations=200,onProgress){
  let p1Wins=0,p2Wins=0,draws=0;
  const turnDistribution=[];
  const allResults=[];

  for(let i=0;i<iterations;i++){
    const result=simulateGame(deck1,deck2,7);
    if(result.winner==="P1")p1Wins++;
    else if(result.winner==="P2")p2Wins++;
    else draws++;
    turnDistribution.push(result.turns);
    allResults.push(result);
    if(onProgress&&i%20===0)onProgress(i,iterations);
  }

  const avgTurns=turnDistribution.reduce((s,v)=>s+v,0)/iterations;
  const avgP1Life=allResults.reduce((s,r)=>s+r.p1Life,0)/iterations;
  const avgP2Life=allResults.reduce((s,r)=>s+r.p2Life,0)/iterations;

  return{
    iterations,
    p1Wins,p2Wins,draws,
    p1Winrate:Math.round(p1Wins/iterations*100),
    p2Winrate:Math.round(p2Wins/iterations*100),
    drawRate:Math.round(draws/iterations*100),
    avgTurns:Math.round(avgTurns*10)/10,
    avgP1Life:Math.round(avgP1Life*10)/10,
    avgP2Life:Math.round(avgP2Life*10)/10,
    // Sample game for display
    sampleGame:allResults[0]?.turnLog||[],
  };
}
