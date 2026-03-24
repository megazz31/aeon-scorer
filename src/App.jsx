import{useState,useCallback,useMemo,useRef}from"react";
import{searchCards,fetchCard,fetchCardList,parseDecklistText,scryfallSearch,searchAlternatives,generateDeckV11}from"./scryfall.js";
import{scoreFullDeck,analyzeDeck,simHands,detectCombos,getTags,getBracket,getMatchupProfile,scoreCard,CC,TC,CAT_ORDER,CAT_ICONS,CAT_CLR,getCategory}from"./engine.js";
import{simulateMatchup}from"./simulator.js";

const FMTS=[{id:"commander",l:"Commander",sz:100},{id:"standard",l:"Standard",sz:60},{id:"modern",l:"Modern",sz:60},{id:"pioneer",l:"Pioneer",sz:60},{id:"legacy",l:"Legacy",sz:60},{id:"",l:"Casual",sz:60}];
const COLS=[{id:"W",l:"W",bg:"#f5f0d0",fg:"#8a7a20"},{id:"U",l:"U",bg:"#0e68ab",fg:"#fff"},{id:"B",l:"B",bg:"#1a1a2a",fg:"#ccc"},{id:"R",l:"R",bg:"#d32029",fg:"#fff"},{id:"G",l:"G",bg:"#00733e",fg:"#fff"}];

// ====== QUADRANT THEORY SCORING (V13) ======
// Based on: "A good card improves the quality of your REAL games most often"
// Score = game_states(30%) + roles(20%) + quality(15%) + synergy(15%) + reliability(10%) + context(10%) - penalties(20%)
function evalQuadrant(card,cmdTags,deckTags){
  const o=(card.oracle||"").toLowerCase();const t=(card.type||"").toLowerCase();
  const cmc=card.cmc||0;const pw=parseInt(card.power)||0;const th=parseInt(card.toughness)||0;
  const isCr=t.includes("creature"),isInst=t.includes("instant"),isSorc=t.includes("sorcery");
  // === GAME STATES (ahead/parity/behind) ===
  let ahead=2,parity=2,behind=2,opening=2,topdeck=2;
  // Board wipes: excellent behind, bad ahead
  if(/destroy all|exile all|all creatures get -|board/i.test(o)){behind=5;parity=4;ahead=1;}
  // Unconditional removal: great behind+parity
  if(/destroy target|exile target/i.test(o)){behind+=2;parity+=2;ahead+=1;}
  if(/fight|bite/i.test(o)){behind+=1;parity+=2;}
  // Draw: great at parity
  if(/draw a card|draw cards|draw two|draw three/i.test(o)){parity+=2;behind+=1;topdeck+=2;}
  // Ramp: great opening
  if(/add \{|add one mana|search.*basic land/i.test(o)&&cmc<=3){opening+=3;parity+=1;}
  // Pump/anthem: win-more (great ahead, bad behind)
  if(/creatures you control get \+|all creatures you control/i.test(o)){ahead+=3;behind-=1;}
  // Tokens without conditions: decent behind
  if(/create.*token/i.test(o)&&!/when.*attack|combat damage/i.test(o)){parity+=1;behind+=1;}
  // Conditional tokens (need attack): ahead only
  if(/create.*token/i.test(o)&&/when.*attack|combat damage/i.test(o)){ahead+=2;behind-=1;}
  // ETB value: always good
  if(/enters the battlefield/i.test(o)&&/draw|destroy|exile|create/i.test(o)){parity+=1;behind+=1;topdeck+=2;}
  // Low CMC = good opening + topdeck
  if(cmc<=1){opening+=2;topdeck+=1;}else if(cmc<=2){opening+=1;topdeck+=1;}else if(cmc>=5){opening-=2;topdeck-=1;}else if(cmc>=7){opening-=3;topdeck-=2;}
  // Creatures with good rate: decent everywhere
  if(isCr&&pw+th>cmc*2){parity+=1;ahead+=1;}
  // Keywords
  if(/haste/i.test(o)){behind+=1;topdeck+=1;}
  if(/lifelink/i.test(o)){behind+=1;}
  if(/hexproof|shroud|indestructible/i.test(o)){parity+=1;}
  // Instant speed: always flexible
  if(isInst){parity+=1;behind+=1;}
  // Clamp values
  ahead=Math.max(0,Math.min(5,ahead));parity=Math.max(0,Math.min(5,parity));behind=Math.max(0,Math.min(5,behind));opening=Math.max(0,Math.min(5,opening));topdeck=Math.max(0,Math.min(5,topdeck));
  // === WEIGHTED STATE SCORE (behind matters most!) ===
  const stateScore=0.25*ahead+0.35*parity+0.40*behind;
  // === QUALITY ===
  let efficiency=Math.max(0,Math.min(5,isCr?Math.round((pw+th)/Math.max(1,cmc)*2.5):cmc<=2?4:cmc<=4?3:2));
  let flexibility=(isInst?4:isSorc?3:2);if(/choose one|choose two|modal/i.test(o))flexibility+=1;
  let resilience=0;if(/indestructible|hexproof|regenerate|return.*from.*graveyard/i.test(o))resilience+=2;if(isCr&&th>=4)resilience+=1;
  let immediacy=0;if(/enters the battlefield|haste|flash/i.test(o))immediacy+=2;if(isInst)immediacy+=2;if(cmc<=2)immediacy+=1;
  const floor=Math.max(0,Math.min(5,Math.round(efficiency*0.3+flexibility*0.2+resilience*0.2+immediacy*0.3)));
  const qualityScore=(efficiency+flexibility+resilience+immediacy+floor)/5;
  // === SYNERGY ===
  const cardTags=getTags(o);
  let cmdSyn=0,themeSyn=0;
  for(const tag of cardTags){if(cmdTags.includes(tag))cmdSyn++;if(deckTags.includes(tag))themeSyn++;}
  cmdSyn=Math.min(5,cmdSyn*2);themeSyn=Math.min(5,themeSyn);
  const synergyScore=0.6*cmdSyn+0.4*themeSyn;
  // === RELIABILITY ===
  let independence=4;
  if(/if you control|you control.*or more|as long as/i.test(o))independence-=2;
  if(/your commander/i.test(o))independence-=1;
  let variance=1;if(/random|flip|coin/i.test(o))variance+=2;
  const reliabilityScore=(independence+(5-variance))/2;
  // === CONTEXT ===
  const contextScore=0.4*opening+0.3*topdeck+0.3*Math.max(0,behind);
  // === PENALTIES ===
  let winMore=Math.max(0,ahead-Math.max(parity,behind));
  let setupNeed=0;if(/you control.*or more|threshold|delirium/i.test(o))setupNeed+=2;
  let deadDraw=0;if(cmc>=6&&!(/draw|destroy|exile/i.test(o)))deadDraw+=2;if(isCr&&pw<=1&&cmc>=3)deadDraw+=1;
  const penaltyScore=(0.4*winMore+0.3*setupNeed+0.3*deadDraw);
  // === TOTAL ===
  const total=0.30*stateScore+0.20*0+0.15*qualityScore+0.15*synergyScore+0.10*reliabilityScore+0.10*contextScore-0.20*penaltyScore;
  const ceiling=Math.max(floor,Math.min(10,Math.round(total*2+cmdSyn)));
  return{floor,ceiling:Math.max(floor,ceiling),ahead,parity,behind,opening,topdeck,winMore:Math.round(winMore),total:Math.round(total*20)/10};
}

export default function App(){
// === STATE (all useState at the top) ===
const[deck,setDeck]=useState([]);
const[fmt,setFmt]=useState("commander");
const[targetBracket,setTargetBracket]=useState(3);
const[pivot,setPivot]=useState(null);
const[pivS,setPivS]=useState("");
const[pivSugg,setPivSugg]=useState([]);
const[colors,setColors]=useState([]);
const[search,setSearch]=useState("");
const[sugg,setSugg]=useState([]);
const[loading,setLoading]=useState(false);
const[loadMsg,setLoadMsg]=useState("");
const[loadProg,setLoadProg]=useState(0);
const[impTxt,setImpTxt]=useState("");
const[impOpen,setImpOpen]=useState(false);
const[sel,setSel]=useState(null);
const[tab,setTab]=useState("setup");
const[simR,setSimR]=useState(null);
const[colCat,setColCat]=useState({});
const[altCard,setAltCard]=useState(null);
const[altRes,setAltRes]=useState([]);
const[altLd,setAltLd]=useState(false);
const[oppTxt,setOppTxt]=useState("");
const[oppDeck,setOppDeck]=useState([]);
const[oppName,setOppName]=useState("Adversaire");
const[simMatch,setSimMatch]=useState(null);
const[simming,setSimming]=useState(false);
const[savedOpps,setSavedOpps]=useState([]);
const[refTxt,setRefTxt]=useState("");
const[refName,setRefName]=useState("");
const[refLists,setRefLists]=useState([]);
const db=useRef(null);
const db2=useRef(null);

// === DERIVED (no cross-references between const) ===
const isCmd=fmt==="commander";

// === ALL COMPUTED VALUES IN ONE SINGLE USEMEMO ===
const computed=useMemo(()=>{
  const res=scoreFullDeck(deck,pivot?.oracle||"");
  const ana=analyzeDeck(deck,res.scored);
  const brk=getBracket(res.pr,deck.length);
  const mup=getMatchupProfile(ana,res.arch,brk);
  const uc=res.grouped||[];
  const cg={};
  for(const c of uc){const cat=c.category||getCategory(c.type);if(!cg[cat])cg[cat]=[];cg[cat].push(c);}
  for(const k of Object.keys(cg))cg[k].sort((a,b)=>b.final-a.final);
  const wk=[...uc].filter(c=>!/land/i.test(c.type||"")).sort((a,b)=>a.final-b.final).slice(0,5);
  // Floor/Ceiling for all cards
  const cmdTags=getTags(pivot?.oracle||"");
  const allTags=[...new Set(uc.flatMap(c=>getTags(c.oracle||"")))];
  const fc=uc.map(c=>({name:c.name,...evalQuadrant(c,cmdTags,allTags)}));
  const combos=detectCombos(deck.map(c=>c.name));
  return{result:res,analytics:ana,bracket:brk,matchup:mup,uniqueCards:uc,catGroups:cg,weakCards:wk,quadrant:fc,combos};
},[deck,pivot]);

// === DESTRUCTURE (safe, computed is fully initialized) ===
const result=computed.result;
const analytics=computed.analytics;
const bracket=computed.bracket;
const matchup=computed.matchup;
const uniqueCards=computed.uniqueCards;
const catGroups=computed.catGroups;
const weakCards=computed.weakCards;
const quadrant=computed.quadrant;
const allCombos=computed.combos;

// === CALLBACKS (all defined AFTER computed) ===
const doSearch=useCallback(q=>{setSearch(q);if(q.length<2){setSugg([]);return;}clearTimeout(db.current);db.current=setTimeout(async()=>{setSugg((await searchCards(q)).slice(0,8));},250);},[]);
const addCard=useCallback(async name=>{setLoading(true);setLoadMsg(name);const c=await fetchCard(name);if(c)setDeck(p=>[...p,{...c,qty:1}]);setSearch("");setSugg([]);setLoading(false);},[]);
const addDirect=useCallback(card=>{setDeck(p=>[...p,{...card,qty:1}]);},[]);
const rmOne=useCallback((name)=>{setDeck(prev=>{const i=prev.findIndex(c=>c.name.toLowerCase()===name.toLowerCase());if(i<0)return prev;return prev.filter((_,j)=>j!==i);});},[]);
const rmAll=useCallback(name=>{setDeck(p=>p.filter(c=>c.name.toLowerCase()!==name.toLowerCase()));},[]);

const doPivS=useCallback(q=>{setPivS(q);if(q.length<2){setPivSugg([]);return;}clearTimeout(db2.current);db2.current=setTimeout(async()=>{setPivSugg((await searchCards(q)).slice(0,6));},250);},[]);
const selectPivot=useCallback(async name=>{const card=await fetchCard(name);if(!card)return;setPivot(card);setPivS(card.name);setPivSugg([]);setColors(card.colorIdentity||card.colors||[]);},[]);

const handleImport=useCallback(async()=>{
  if(!impTxt.trim())return;setLoading(true);setLoadMsg("Analyse...");setLoadProg(10);
  const{mainboard:mb}=parseDecklistText(impTxt);
  setLoadMsg(`Scryfall: ${mb.length} cartes...`);
  const fetched=await fetchCardList(mb.map(e=>e.name),(c,t)=>{setLoadProg(10+Math.round(c/t*80));});
  const nd=[];for(const e of mb){const c=fetched.find(f=>f.name.toLowerCase()===e.name.toLowerCase());if(c)for(let i=0;i<e.qty;i++)nd.push({...c,qty:1});}
  if(nd.length>=80)setFmt("commander");
  setDeck(nd);setImpOpen(false);setImpTxt("");setLoading(false);setLoadProg(100);setTab("deck");
},[impTxt]);

const genDeck=useCallback(async()=>{
  if(!colors.length)return;setLoading(true);setLoadProg(0);
  // Pass bracket and reference lists to the generator
  const refData=refLists.map(r=>r.cards);
  const gen=await generateDeckV11(fmt,colors,pivot,isCmd,(c,t,m)=>{setLoadMsg(m);setLoadProg(Math.round(c/t*100));},targetBracket,refData);
  setDeck(gen);setLoading(false);setTab("deck");
},[fmt,colors,pivot,isCmd,targetBracket,refLists]);

const autoImprove=useCallback(async()=>{
  const currentResult=scoreFullDeck(deck,pivot?.oracle||"");
  // Get unique weak cards (score <=2, not lands)
  const scored=currentResult.grouped||[];
  const weak=scored.filter(c=>!/land/i.test(c.type||"")&&c.final<=2).slice(0,5);
  if(!weak.length){setLoadMsg("Aucune carte faible à remplacer !");setTimeout(()=>setLoadMsg(""),2000);return;}
  setLoading(true);let done=0;let newDeck=[...deck];
  for(const card of weak){
    setLoadMsg(`Remplacement: ${card.name} (${card.qty}×)...`);setLoadProg(Math.round(done/weak.length*100));
    const dn=newDeck.map(c=>c.name.toLowerCase());
    const alts=await searchAlternatives(card,fmt,colors,isCmd);
    const filtered=alts.filter(a=>!dn.includes(a.name.toLowerCase()));
    if(filtered.length>0){
      const best=filtered.sort((a,b)=>scoreCard(b.oracle||"",b.cmc||0).pts-scoreCard(a.oracle||"",a.cmc||0).pts)[0];
      // BUG 5 FIX: Replace ALL copies of the weak card, not just 1
      const cardLower=card.name.toLowerCase();
      newDeck=newDeck.map(c=>c.name.toLowerCase()===cardLower?{...best,qty:1}:c);
    }
    done++;
  }
  setDeck(newDeck);setLoading(false);setLoadMsg("");
},[deck,pivot,fmt,colors,isCmd]);

const findAlts=useCallback(async card=>{
  setAltCard(card);setAltLd(true);setAltRes([]);
  const dn=deck.map(c=>c.name.toLowerCase());
  const alts=await searchAlternatives(card,fmt,colors,isCmd);
  const filtered=alts.filter(a=>!dn.includes(a.name.toLowerCase()));
  const scored=filtered.map(c=>({...c,_s:scoreCard(c.oracle||"",c.cmc||0).pts})).sort((a,b)=>b._s-a._s);
  setAltRes(scored.slice(0,6));setAltLd(false);
},[fmt,colors,isCmd,deck]);

const importOpp=useCallback(async()=>{
  if(!oppTxt.trim())return;setLoading(true);setLoadMsg("Import adversaire...");
  const{mainboard:mb}=parseDecklistText(oppTxt);
  const fetched=await fetchCardList(mb.map(e=>e.name));
  const nd=[];for(const e of mb){const c=fetched.find(f=>f.name.toLowerCase()===e.name.toLowerCase());if(c)for(let i=0;i<e.qty;i++)nd.push({...c,qty:1});}
  setOppDeck(nd);setLoading(false);
  if(nd.length>0)setSavedOpps(p=>[...p.filter(o=>o.name!==oppName),{name:oppName,deck:nd}]);
},[oppTxt,oppName]);

const importRef=useCallback(async()=>{
  if(!refTxt.trim())return;setLoading(true);setLoadMsg("Import référence...");
  const{mainboard:mb}=parseDecklistText(refTxt);
  const fetched=await fetchCardList(mb.map(e=>e.name));
  const cards=[];for(const e of mb){const c=fetched.find(f=>f.name.toLowerCase()===e.name.toLowerCase());if(c)cards.push({...c,qty:e.qty});}
  if(cards.length>0){
    setRefLists(p=>[...p,{name:refName||`Ref ${p.length+1}`,cards}]);
    setRefTxt("");setRefName("");
  }
  setLoading(false);
},[refTxt,refName]);

const runSim=useCallback(async(opponent)=>{
  const opp=opponent||oppDeck;
  if(!opp.length||!deck.length)return;
  setSimming(true);setSimMatch(null);
  await new Promise(r=>setTimeout(r,50));
  const res=simulateMatchup(deck,opp,200);
  setSimMatch(res);setSimming(false);
},[deck,oppDeck]);

const totalPrice=deck.reduce((s,c)=>s+(parseFloat(c.prices?.eur)||0),0);

// === RENDER ===
return(<div style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",background:"#060810",color:"#c0c8d8",minHeight:"100vh"}}>

{loading&&<div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(6,8,16,0.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px"}}>
  <div style={{fontSize:"12px",color:"#3b82f6"}}>{loadMsg||"..."}</div>
  <div style={{width:"200px",height:"4px",background:"#141e30",borderRadius:"2px"}}><div style={{width:`${loadProg}%`,height:"100%",background:"linear-gradient(90deg,#3b82f6,#22c55e)",borderRadius:"2px",transition:"width 0.3s"}}/></div>
</div>}

<div style={{background:"linear-gradient(135deg,#080c18,#0c1428)",padding:"8px 10px",borderBottom:"1px solid #141e30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
  <div style={{display:"flex",alignItems:"baseline",gap:"2px"}}>
    <span style={{fontSize:"15px",fontWeight:"800",color:"#e8f0ff"}}>aeon</span><span style={{fontSize:"15px",color:"#f59e0b"}}>_</span><span style={{fontSize:"15px",fontWeight:"800",color:"#3b82f6"}}>scorer</span><span style={{fontSize:"8px",color:"#22c55e",marginLeft:"2px"}}>v16</span>
  </div>
  <div style={{display:"flex",gap:"3px"}}>
    <button onClick={()=>setImpOpen(!impOpen)} style={{padding:"3px 6px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"2px",color:"#3b82f6",fontSize:"7px",cursor:"pointer",fontFamily:"inherit"}}>📋</button>
    <button onClick={()=>{setDeck([]);setPivot(null);setPivS("");setColors([]);setTab("setup");}} style={{padding:"3px 6px",background:"#0c1428",border:"1px solid #2a1a30",borderRadius:"2px",color:"#6a4a5a",fontSize:"7px",cursor:"pointer",fontFamily:"inherit"}}>🗑️</button>
  </div>
</div>

{impOpen&&<div style={{background:"#0a1020",borderBottom:"1px solid #141e30",padding:"6px"}}>
  <textarea value={impTxt} onChange={e=>setImpTxt(e.target.value)} rows={3} placeholder="4 Lightning Bolt..." style={{width:"100%",padding:"4px",background:"#060810",border:"1px solid #1a2a44",borderRadius:"2px",color:"#c0c8d8",fontSize:"9px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
  <button onClick={handleImport} style={{marginTop:"2px",padding:"4px 10px",background:"#1a3a6a",border:"none",borderRadius:"2px",color:"#e8f0ff",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>⚡ Importer</button>
</div>}

<div style={{display:"flex",background:"#080c14",borderBottom:"1px solid #101828",overflowX:"auto"}}>
  {[{id:"setup",l:"⚙️Setup"},{id:"deck",l:`📋${deck.length}`},{id:"refs",l:`📚${refLists.length}`},{id:"bracket",l:`🏆B${bracket.n}`},{id:"simulator",l:"🎮Sim"},{id:"analytics",l:"📊"},{id:"combos",l:`💥${allCombos.length}`}].map(t=>
    <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 1px",border:"none",cursor:"pointer",background:tab===t.id?"#0c1020":"transparent",color:tab===t.id?"#3b82f6":"#2a3a50",fontSize:"8px",fontWeight:tab===t.id?"700":"400",borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap"}}>{t.l}</button>
  )}
</div>

<div style={{padding:"8px",maxWidth:"720px",margin:"0 auto"}}>

{tab==="setup"&&<div>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
    <div style={{fontSize:"8px",color:"#3b82f6",fontWeight:"700",marginBottom:"6px"}}>1. FORMAT</div>
    <div style={{display:"flex",gap:"2px",flexWrap:"wrap"}}>
      {FMTS.map(f=><button key={f.id} onClick={()=>setFmt(f.id)} style={{padding:"4px 8px",background:fmt===f.id?"#1a2a44":"#0c1428",border:`1px solid ${fmt===f.id?"#3b82f6":"#141e30"}`,borderRadius:"2px",color:fmt===f.id?"#3b82f6":"#4a5a6a",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>{f.l}</button>)}
    </div>
  </div>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
    <div style={{fontSize:"8px",color:"#f59e0b",fontWeight:"700",marginBottom:"6px"}}>2. CARTE PIVOT {isCmd?"/ COMMANDANT":""}</div>
    <div style={{position:"relative"}}>
      <input value={pivS} onChange={e=>doPivS(e.target.value)} placeholder={isCmd?"Commandant...":"Carte centrale..."} style={{width:"100%",padding:"7px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"3px",color:"#e8f0ff",fontSize:"10px",fontFamily:"inherit",boxSizing:"border-box"}}/>
      {pivSugg.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#0c1020",border:"1px solid #1a2a44",borderRadius:"0 0 3px 3px"}}>
        {pivSugg.map((n,i)=><div key={i} onClick={()=>selectPivot(n)} style={{padding:"4px 8px",cursor:"pointer",borderBottom:"1px solid #101828",fontSize:"9px",color:"#c0c8d8"}} onMouseOver={e=>e.currentTarget.style.background="#101828"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{n}</div>)}
      </div>}
    </div>
    {pivot&&<div style={{marginTop:"6px",display:"flex",gap:"8px"}}>
      {pivot.imgSmall&&<img src={pivot.imgSmall} alt="" style={{width:"70px",borderRadius:"3px"}}/>}
      <div><div style={{fontSize:"11px",fontWeight:"700",color:"#e8f0ff"}}>{pivot.name}</div><div style={{fontSize:"7px",color:"#3a4a5a",marginTop:"2px",lineHeight:1.3}}>{pivot.oracle?.slice(0,150)}</div>
      <div style={{display:"flex",gap:"2px",marginTop:"3px",flexWrap:"wrap"}}>{getTags(pivot.oracle||"").map(t=><span key={t} style={{fontSize:"6px",padding:"1px 3px",borderRadius:"1px",background:"#0c1428",color:"#3b82f6"}}>{t}</span>)}</div></div>
    </div>}
  </div>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
    <div style={{fontSize:"8px",color:"#22c55e",fontWeight:"700",marginBottom:"6px"}}>3. COULEURS</div>
    <div style={{display:"flex",gap:"3px"}}>
      {COLS.map(c=><button key={c.id} onClick={()=>setColors(p=>p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])} style={{width:"32px",height:"26px",borderRadius:"3px",border:`2px solid ${colors.includes(c.id)?c.bg:"#1a2a44"}`,background:colors.includes(c.id)?c.bg:c.bg+"15",color:colors.includes(c.id)?c.fg:"#3a4a5a",fontSize:"11px",cursor:"pointer",fontFamily:"inherit",fontWeight:"700"}}>{c.l}</button>)}
    </div>
  </div>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
    <div style={{fontSize:"8px",color:"#ef4444",fontWeight:"700",marginBottom:"6px"}}>4. NIVEAU DE JEU</div>
    <div style={{display:"flex",gap:"2px"}}>
      {[{n:1,l:"Casual",c:"#22c55e"},{n:2,l:"Mid",c:"#3b82f6"},{n:3,l:"Focused",c:"#f59e0b"},{n:4,l:"Optimized",c:"#ef4444"},{n:5,l:"cEDH/Pro",c:"#dc2626"}].map(b=>
        <button key={b.n} onClick={()=>setTargetBracket(b.n)} style={{flex:1,padding:"4px 2px",background:targetBracket===b.n?b.c+"20":"#0c1428",border:`1px solid ${targetBracket===b.n?b.c:"#141e30"}`,borderRadius:"2px",color:targetBracket===b.n?b.c:"#4a5a6a",fontSize:"7px",cursor:"pointer",fontFamily:"inherit",fontWeight:targetBracket===b.n?"700":"400"}}>{b.l}</button>
      )}
    </div>
  </div>
  <button onClick={genDeck} disabled={!colors.length} style={{width:"100%",padding:"10px",background:!colors.length?"#101828":"linear-gradient(135deg,#1a3a6a,#2a4a8a)",border:"none",borderRadius:"5px",color:"#e8f0ff",fontSize:"12px",fontWeight:"700",cursor:!colors.length?"default":"pointer",fontFamily:"inherit",opacity:!colors.length?.3:1}}>⚡ Générer le deck</button>
</div>}

{tab==="deck"&&<div>
  <div style={{display:"flex",gap:"3px",marginBottom:"6px"}}>
    <input value={search} onChange={e=>doSearch(e.target.value)} placeholder="🔍 Ajouter..." style={{flex:1,padding:"5px 7px",background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",color:"#e8f0ff",fontSize:"9px",fontFamily:"inherit"}}/>
    <button onClick={autoImprove} style={{padding:"5px 8px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"3px",color:"#22c55e",fontSize:"8px",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>✨ Améliorer</button>
  </div>
  {sugg.length>0&&<div style={{background:"#0c1020",border:"1px solid #141e30",borderRadius:"3px",marginBottom:"4px"}}>
    {sugg.map((n,i)=><div key={i} onClick={()=>addCard(n)} style={{padding:"3px 7px",cursor:"pointer",borderBottom:"1px solid #101828",fontSize:"9px",color:"#c0c8d8"}} onMouseOver={e=>e.currentTarget.style.background="#101828"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{n}</div>)}
  </div>}

  {/* Stats bar */}
  <div style={{display:"flex",gap:"2px",marginBottom:"4px"}}>
    {[{l:"PWR",v:result.pr,c:"#f59e0b"},{l:"ARCH",v:(result.arch||"?").slice(0,5),c:"#8b5cf6"},{l:"CMC",v:result.avg,c:"#06b6d4"},{l:"€",v:totalPrice>0?Math.round(totalPrice):"—",c:"#22c55e"}].map(s=>
      <div key={s.l} style={{flex:1,background:"#080c18",border:"1px solid #101828",borderRadius:"2px",padding:"3px",textAlign:"center"}}>
        <div style={{fontSize:"10px",fontWeight:"700",color:s.c}}>{s.v}</div>
        <div style={{fontSize:"5px",color:"#2a3a50"}}>{s.l}</div>
      </div>
    )}
  </div>

  {CAT_ORDER.map(cat=>{const cards=catGroups[cat];if(!cards?.length)return null;const qty=cards.reduce((s,c)=>s+c.qty,0);
    return<div key={cat} style={{marginBottom:"3px"}}>
      <div onClick={()=>setColCat(p=>({...p,[cat]:!p[cat]}))} style={{display:"flex",alignItems:"center",gap:"4px",padding:"3px 5px",background:"#0a0e18",border:"1px solid #141e30",borderRadius:"2px",cursor:"pointer"}}>
        <span style={{fontSize:"9px"}}>{CAT_ICONS[cat]}</span><span style={{fontSize:"8px",fontWeight:"700",color:CAT_CLR[cat],flex:1}}>{cat}</span><span style={{fontSize:"8px",color:"#4a6a8a"}}>{qty}</span><span style={{fontSize:"6px",color:"#2a3a50"}}>{colCat[cat]?"▸":"▾"}</span>
      </div>
      {!colCat[cat]&&<div style={{borderLeft:`2px solid ${(CAT_CLR[cat]||"#333")}20`,marginLeft:"3px",paddingLeft:"3px"}}>
        {cards.map((card,i)=>{const w=weakCards.some(x=>x.name===card.name);const fc=quadrant.find(f=>f.name===card.name);return<div key={i}>
          <div style={{display:"flex",alignItems:"center",gap:"3px",padding:"2px 3px",background:sel===card.name?"#0c1020":w?"#100808":"transparent",borderRadius:"2px",cursor:"pointer"}} onClick={()=>setSel(sel===card.name?null:card.name)}>
            <span style={{fontSize:"8px",fontWeight:"700",color:CAT_CLR[cat],width:"16px",textAlign:"center"}}>{card.qty}×</span>
            <span style={{flex:1,fontSize:"8px",color:w?"#aa8888":"#dde4ee",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card.name}</span>
            {fc&&<span style={{fontSize:"6px",color:"#4a6a8a"}} title="Floor/Ceiling">{fc.floor}↗{fc.ceiling}</span>}
            {w&&<span style={{fontSize:"4px",color:"#ef4444",background:"#1a0808",padding:"0 1px",borderRadius:"1px"}}>▼</span>}
            {card.prices?.eur&&<span style={{fontSize:"6px",color:"#4a6a4a"}}>{(parseFloat(card.prices.eur)*card.qty).toFixed(0)}€</span>}
            <span style={{fontSize:"10px",fontWeight:"700",color:card.final>=10?"#ef4444":card.final>=4?"#f59e0b":"#22c55e"}}>{card.final*card.qty}</span>
          </div>
          {sel===card.name&&<div style={{padding:"5px",background:"#0a0e18",borderRadius:"2px",margin:"1px 0"}}>
            {card.imgSmall&&<img src={card.imgSmall} alt="" style={{width:"50px",borderRadius:"2px",float:"right",margin:"0 0 2px 4px"}}/>}
            <div style={{fontSize:"7px",color:"#3a4a5a",lineHeight:1.2}}>{card.oracle?.slice(0,200)}</div>
            {fc&&<div style={{display:"flex",gap:"6px",marginTop:"3px",fontSize:"7px"}}>
              <span style={{color:"#22c55e"}}>Floor: {fc.floor}</span>
              <span style={{color:"#f59e0b"}}>Ceiling: {fc.ceiling}</span>
              <span style={{color:"#3b82f6"}}>Gap: {fc.ceiling-fc.floor}</span>
            </div>}
            <div style={{display:"flex",gap:"2px",marginTop:"3px"}}>
              <button onClick={()=>rmOne(card.name)} style={{fontSize:"6px",padding:"1px 4px",background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:"1px",color:"#ef4444",cursor:"pointer",fontFamily:"inherit"}}>-1</button>
              <button onClick={()=>rmAll(card.name)} style={{fontSize:"6px",padding:"1px 4px",background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:"1px",color:"#8a4444",cursor:"pointer",fontFamily:"inherit"}}>Tout</button>
              <button onClick={()=>findAlts(card)} style={{fontSize:"6px",padding:"1px 4px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"1px",color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}>🔄 Alt</button>
            </div>
            {altCard?.name===card.name&&<div style={{marginTop:"3px",paddingTop:"3px",borderTop:"1px solid #141e30"}}>
              {altLd?<span style={{fontSize:"7px",color:"#2a4a2a"}}>Recherche...</span>:
              altRes.map((a,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:"2px",padding:"1px 0"}}>
                <span style={{flex:1,fontSize:"7px",color:"#88aa88"}}>{a.name}</span>
                <span style={{fontSize:"7px",fontWeight:"700",color:a._s>(card.sc?.pts||0)?"#22c55e":"#f59e0b"}}>{a._s}</span>
                <button onClick={()=>addDirect(a)} style={{fontSize:"5px",padding:"0 2px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"1px",color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>)}
            </div>}
          </div>}
        </div>;})}
      </div>}
    </div>;
  })}
</div>}

{tab==="refs"&&<div>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
    <div style={{fontSize:"9px",color:"#8b5cf6",fontWeight:"700",marginBottom:"4px"}}>📚 DECKLISTS DE RÉFÉRENCE</div>
    <div style={{fontSize:"7px",color:"#4a5a6a",marginBottom:"6px"}}>Importe des decklists de tournois/référence. Le générateur utilisera leur squelette (core cards + flex) comme base au lieu de tout inventer depuis zéro.</div>
    <input value={refName} onChange={e=>setRefName(e.target.value)} placeholder="Nom (ex: Kodama Top8 GP Paris)" style={{width:"100%",padding:"4px 6px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"2px",color:"#e8f0ff",fontSize:"9px",fontFamily:"inherit",boxSizing:"border-box",marginBottom:"3px"}}/>
    <textarea value={refTxt} onChange={e=>setRefTxt(e.target.value)} rows={4} placeholder={"Colle une decklist de référence :\n1 Sol Ring\n1 Kodama of the West Tree\n..."} style={{width:"100%",padding:"4px",background:"#060810",border:"1px solid #1a2a44",borderRadius:"2px",color:"#c0c8d8",fontSize:"9px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
    <button onClick={importRef} style={{marginTop:"3px",padding:"4px 10px",background:"#1a2a44",border:"none",borderRadius:"2px",color:"#e8f0ff",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>📥 Ajouter référence</button>
  </div>
  {refLists.length>0&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px",marginBottom:"6px"}}>
    <div style={{fontSize:"8px",color:"#8b5cf6",marginBottom:"4px"}}>{refLists.length} référence(s) chargées</div>
    {refLists.map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"3px",padding:"2px 0",borderBottom:"1px solid #101828"}}>
      <span style={{flex:1,fontSize:"8px",color:"#c0c8d8"}}>{r.name} ({r.cards.length} cartes)</span>
      <button onClick={()=>setRefLists(p=>p.filter((_,j)=>j!==i))} style={{fontSize:"6px",padding:"1px 3px",background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:"1px",color:"#ef4444",cursor:"pointer",fontFamily:"inherit"}}>✕</button>
    </div>)}
  </div>}
  {refLists.length>=1&&(()=>{
    const allCards=refLists.flatMap(r=>r.cards);
    const freq={};for(const c of allCards){const k=c.name.toLowerCase();freq[k]=(freq[k]||0)+1;}
    const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const maxF=sorted[0]?.[1]||1;
    return<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px"}}>
      <div style={{fontSize:"8px",color:"#f59e0b",marginBottom:"4px"}}>CORE CARDS (les plus fréquentes)</div>
      {sorted.map(([name,count],i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"3px",padding:"1px 0",fontSize:"7px"}}>
        <span style={{flex:1,color:"#c0c8d8",textTransform:"capitalize"}}>{name}</span>
        <div style={{width:"40px",height:"3px",background:"#0c1428",borderRadius:"2px"}}><div style={{width:`${count/maxF*100}%`,height:"100%",background:count/maxF>=0.7?"#22c55e":"#3b82f6",borderRadius:"2px"}}/></div>
        <span style={{color:"#4a6a8a",width:"20px",textAlign:"right"}}>{count}×</span>
      </div>)}
    </div>;
  })()}
</div>}

{tab==="bracket"&&<div>
  <div style={{background:`linear-gradient(135deg,#080c18,#0a1020)`,border:`2px solid ${bracket.c}40`,borderRadius:"8px",padding:"14px",textAlign:"center",marginBottom:"8px"}}>
    <div style={{fontSize:"36px",fontWeight:"800",color:"#f59e0b"}}>{result.pr}</div>
    <div style={{fontSize:"18px",fontWeight:"700",color:bracket.c}}>Bracket {bracket.n} — {bracket.name}</div>
  </div>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px"}}>
    {(deck.length>=80?[{n:1,nm:"Exhibition",r:"0-150",c:"#22c55e"},{n:2,nm:"Core",r:"151-300",c:"#3b82f6"},{n:3,nm:"Upgraded",r:"301-500",c:"#f59e0b"},{n:4,nm:"Optimized",r:"501-700",c:"#ef4444"},{n:5,nm:"cEDH",r:"701+",c:"#dc2626"}]:[{n:1,nm:"Casual",r:"0-100",c:"#22c55e"},{n:2,nm:"FNM",r:"101-220",c:"#3b82f6"},{n:3,nm:"Competitive",r:"221-380",c:"#f59e0b"},{n:4,nm:"Pro",r:"381-550",c:"#ef4444"},{n:5,nm:"Elite",r:"551+",c:"#dc2626"}]).map(b=>
      <div key={b.n} style={{display:"flex",alignItems:"center",gap:"4px",padding:"2px 0",opacity:b.n===bracket.n?1:.25}}>
        <span style={{fontSize:"12px",fontWeight:"700",color:b.c}}>{b.n}</span>
        <span style={{fontSize:"8px",color:"#e0e8f0",flex:1,fontWeight:b.n===bracket.n?"700":"400"}}>{b.nm}</span>
        <span style={{fontSize:"7px",color:"#3a4a5a"}}>{b.r}</span>
        {b.n===bracket.n&&<span style={{fontSize:"6px",color:b.c}}>◀</span>}
      </div>
    )}
  </div>
</div>}

{tab==="simulator"&&<div>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
    <div style={{fontSize:"9px",color:"#f59e0b",fontWeight:"700",marginBottom:"4px"}}>🎮 SIMULATEUR DE MATCHS</div>
    <div style={{fontSize:"7px",color:"#4a5a6a",marginBottom:"6px"}}>Simule 200 parties (7 tours). Les 2 joueurs jouent optimalement : removal sur les grosses menaces, créatures en priorité, attaque/blocage optimaux (flying, deathtouch, lifelink, trample).</div>
    <input value={oppName} onChange={e=>setOppName(e.target.value)} placeholder="Nom du deck adverse" style={{width:"100%",padding:"4px 6px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"2px",color:"#e8f0ff",fontSize:"9px",fontFamily:"inherit",boxSizing:"border-box",marginBottom:"3px"}}/>
    <textarea value={oppTxt} onChange={e=>setOppTxt(e.target.value)} rows={4} placeholder={"Colle la decklist adverse :\n4 Monastery Swiftspear\n4 Lightning Bolt\n..."} style={{width:"100%",padding:"4px",background:"#060810",border:"1px solid #1a2a44",borderRadius:"2px",color:"#c0c8d8",fontSize:"9px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
    <div style={{display:"flex",gap:"3px",marginTop:"3px"}}>
      <button onClick={importOpp} style={{padding:"4px 8px",background:"#1a2a44",border:"none",borderRadius:"2px",color:"#e8f0ff",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>📥 Charger</button>
      <button onClick={()=>runSim()} disabled={!oppDeck.length||!deck.length||simming} style={{padding:"4px 8px",background:(!oppDeck.length||!deck.length)?"#101828":"#1a3a6a",border:"none",borderRadius:"2px",color:"#e8f0ff",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>{simming?"...":"⚔️ 200 matchs"}</button>
    </div>
    {oppDeck.length>0&&<div style={{fontSize:"7px",color:"#22c55e",marginTop:"3px"}}>✓ {oppDeck.length} cartes chargées</div>}
  </div>
  {savedOpps.length>0&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"5px",marginBottom:"6px"}}>
    <div style={{fontSize:"7px",color:"#4a6a8a",marginBottom:"3px"}}>Adversaires :</div>
    {savedOpps.map((o,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"3px",padding:"2px 0"}}>
      <span style={{flex:1,fontSize:"8px",color:"#c0c8d8"}}>{o.name} ({o.deck.length})</span>
      <button onClick={()=>{setOppDeck(o.deck);setOppName(o.name);runSim(o.deck);}} style={{fontSize:"6px",padding:"1px 4px",background:"#1a3a6a",border:"none",borderRadius:"1px",color:"#e8f0ff",cursor:"pointer",fontFamily:"inherit"}}>⚔️</button>
    </div>)}
  </div>}
  {simMatch&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px"}}>
    <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
      <div style={{flex:1,textAlign:"center",background:simMatch.p1Winrate>=50?"#081008":"#100808",borderRadius:"4px",padding:"8px"}}>
        <div style={{fontSize:"24px",fontWeight:"800",color:simMatch.p1Winrate>=50?"#22c55e":"#ef4444"}}>{simMatch.p1Winrate}%</div>
        <div style={{fontSize:"7px",color:"#6a7a6a"}}>Ton deck</div>
      </div>
      <div style={{display:"flex",alignItems:"center",fontSize:"9px",color:"#2a3a50"}}>vs</div>
      <div style={{flex:1,textAlign:"center",background:simMatch.p2Winrate>=50?"#081008":"#100808",borderRadius:"4px",padding:"8px"}}>
        <div style={{fontSize:"24px",fontWeight:"800",color:simMatch.p2Winrate>=50?"#22c55e":"#ef4444"}}>{simMatch.p2Winrate}%</div>
        <div style={{fontSize:"7px",color:"#6a7a6a"}}>{oppName}</div>
      </div>
    </div>
    {[{l:"Nuls",v:`${simMatch.drawRate}%`},{l:"Tours moy",v:simMatch.avgTurns},{l:"PV moy (toi)",v:simMatch.avgP1Life},{l:"PV moy (adv)",v:simMatch.avgP2Life}].map((r,i)=>
      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"7px",padding:"1px 0"}}><span style={{color:"#6a7a8a"}}>{r.l}</span><span style={{color:"#e0e8f0"}}>{r.v}</span></div>
    )}
    {simMatch.sampleGame?.length>0&&<div style={{marginTop:"6px"}}>
      <div style={{fontSize:"7px",color:"#4a6a8a",marginBottom:"3px"}}>Exemple :</div>
      <div style={{display:"flex",gap:"2px"}}>
        {simMatch.sampleGame.map((t,i)=><div key={i} style={{background:"#0a0e18",borderRadius:"2px",padding:"2px 4px",fontSize:"6px",textAlign:"center"}}>
          <div style={{color:"#4a6a8a"}}>T{t.turn}</div>
          <div style={{color:t.p1Life>0?"#22c55e":"#ef4444"}}>{t.p1Life}</div>
          <div style={{color:t.p2Life>0?"#3b82f6":"#ef4444"}}>{t.p2Life}</div>
        </div>)}
      </div>
    </div>}
  </div>}
</div>}

{tab==="analytics"&&<div>
  {deck.length===0?<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"9px"}}>Crée un deck.</div>:<>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"8px",marginBottom:"4px"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}><span style={{fontSize:"7px",color:"#4a6a8a"}}>GLOBAL</span><span style={{fontSize:"16px",fontWeight:"700",color:analytics.m.global>=70?"#22c55e":analytics.m.global>=50?"#f59e0b":"#ef4444"}}>{analytics.m.global}/100</span></div>
    {[{k:"curve",l:"Courbe",d:analytics.avg},{k:"ca",l:"Pioche",d:analytics.ds},{k:"interaction",l:"Interact",d:analytics.rm},{k:"mana",l:"Mana",d:analytics.la},{k:"ramp",l:"Ramp",d:analytics.rp},{k:"resilience",l:"Résil",d:analytics.rc}].map(m=>
      <div key={m.k} style={{marginBottom:"2px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"7px"}}><span style={{color:"#6a7a8a"}}>{m.l} ({m.d})</span><span style={{color:analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444"}}>{analytics.m[m.k]}</span></div><div style={{height:"2px",background:"#0c1428",borderRadius:"1px"}}><div style={{width:`${analytics.m[m.k]}%`,height:"100%",background:analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444",borderRadius:"1px"}}/></div></div>
    )}
  </div>
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px",marginBottom:"4px"}}>
    <div style={{fontSize:"7px",color:"#4a6a8a",marginBottom:"3px"}}>COURBE DE MANA</div>
    <div style={{display:"flex",alignItems:"flex-end",gap:"1px",height:"30px"}}>
      {[0,1,2,3,4,5,6,7].map(c=>{const v=analytics.curve[c]||0;const mx=Math.max(...Object.values(analytics.curve),1);return<div key={c} style={{flex:1,textAlign:"center"}}>{v>0&&<div style={{fontSize:"5px",color:"#3b82f6"}}>{v}</div>}<div style={{height:`${(v/mx)*22}px`,background:"#3b82f6",borderRadius:"1px 1px 0 0",minHeight:v?"1px":"0"}}/><div style={{fontSize:"4px",color:"#2a3a50"}}>{c===7?"7+":c}</div></div>;})}
    </div>
  </div>
  {/* Quadrant Theory Analysis */}
  <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px",marginBottom:"4px"}}>
    <div style={{fontSize:"7px",color:"#f59e0b",marginBottom:"3px"}}>QUADRANT THEORY — GAME STATES</div>
    <div style={{fontSize:"6px",color:"#3a4a5a",marginBottom:"4px"}}>Ahead=devant, Parity=égalité, Behind=derrière. Les bonnes cartes sont fortes quand tu es derrière ou à égalité, pas seulement quand tu gagnes déjà.</div>
    {quadrant.filter(f=>!/land/i.test(f.name)).slice(0,12).sort((a,b)=>b.total-a.total).map((q,i)=>
      <div key={i} style={{display:"flex",alignItems:"center",gap:"2px",padding:"1px 0",fontSize:"7px"}}>
        <span style={{flex:1,color:"#c0c8d8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"120px"}}>{q.name}</span>
        <span style={{fontSize:"6px",color:"#22c55e"}} title="Behind">B{q.behind}</span>
        <span style={{fontSize:"6px",color:"#3b82f6"}} title="Parity">P{q.parity}</span>
        <span style={{fontSize:"6px",color:"#f59e0b"}} title="Ahead">A{q.ahead}</span>
        {q.winMore>0&&<span style={{fontSize:"5px",color:"#ef4444",background:"#1a0808",padding:"0 2px",borderRadius:"1px"}}>WM</span>}
        <span style={{fontSize:"6px",color:"#4a6a8a"}}>F{q.floor}</span>
        <div style={{width:"30px",height:"3px",background:"#0c1428",borderRadius:"2px",position:"relative"}}>
          <div style={{position:"absolute",left:`${q.floor/10*100}%`,width:`${(q.ceiling-q.floor)/10*100}%`,height:"100%",background:"linear-gradient(90deg,#22c55e,#f59e0b)",borderRadius:"2px"}}/>
        </div>
        <span style={{fontSize:"6px",color:"#f59e0b"}}>C{q.ceiling}</span>
        <span style={{fontSize:"8px",fontWeight:"700",color:q.total>=3?"#22c55e":q.total>=1.5?"#f59e0b":"#ef4444"}}>{q.total}</span>
      </div>
    )}
  </div>
  <button onClick={()=>setSimR(simHands(deck,2000))} disabled={deck.length<7} style={{width:"100%",padding:"4px",background:"#1a3a6a",border:"none",borderRadius:"2px",color:"#e8f0ff",fontSize:"7px",cursor:"pointer",fontFamily:"inherit",margin:"4px 0"}}>🎲 Sim 2000 mains</button>
  {simR&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",padding:"4px"}}>
    {[{l:"Jouables",v:`${simR.play}%`},{l:"1-drop",v:`${simR.t1}%`},{l:"Mull",v:`${simR.mull}%`}].map((r,i)=>
      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"7px"}}><span style={{color:"#6a7a8a"}}>{r.l}</span><span style={{color:"#22c55e"}}>{r.v}</span></div>
    )}
  </div>}
  </>}
</div>}

{tab==="combos"&&<div>
  {allCombos.map((co,i)=><div key={i} style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",padding:"5px",marginBottom:"2px",borderLeft:`3px solid ${TC[co.tier]}`}}>
    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"9px",fontWeight:"600",color:"#e0e8f0"}}>{co.name}</span><span style={{fontSize:"10px",fontWeight:"700",color:TC[co.tier]}}>×{co.mult}</span></div>
    <div style={{fontSize:"7px",color:"#3a4a5a"}}>{co.cards.join(" + ")}</div>
  </div>)}
  {allCombos.length===0&&<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"9px"}}>Aucun combo.</div>}
</div>}

</div>
</div>);
}
