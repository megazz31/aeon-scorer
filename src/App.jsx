import{useState,useCallback,useMemo,useRef}from"react";
import{searchCards,fetchCard,fetchCardList,parseDecklistText,scryfallSearch,searchAlternatives,generateDeckV11}from"./scryfall.js";
import{scoreFullDeck,analyzeDeck,simHands,detectCombos,getTags,getBracket,getMatchupProfile,scoreCard,COMBOS,GAME_CHANGERS,CC,TC,CAT_ORDER,CAT_ICONS,CAT_CLR,getCategory}from"./engine.js";
import{simulateMatchup}from"./simulator.js";

const FMTS=[{id:"commander",l:"Commander",sz:100,cp:1},{id:"standard",l:"Standard",sz:60,cp:4},{id:"modern",l:"Modern",sz:60,cp:4},{id:"pioneer",l:"Pioneer",sz:60,cp:4},{id:"legacy",l:"Legacy",sz:60,cp:4},{id:"",l:"Casual",sz:60,cp:4}];
const COLS=[{id:"W",l:"W",bg:"#f5f0d0",fg:"#8a7a20"},{id:"U",l:"U",bg:"#0e68ab",fg:"#fff"},{id:"B",l:"B",bg:"#1a1a2a",fg:"#ccc"},{id:"R",l:"R",bg:"#d32029",fg:"#fff"},{id:"G",l:"G",bg:"#00733e",fg:"#fff"}];

export default function App(){
const[deck,setDeck]=useState([]);const[fmt,setFmt]=useState("commander");
const[pivot,setPivot]=useState(null);const[pivS,setPivS]=useState("");const[pivSugg,setPivSugg]=useState([]);
const[colors,setColors]=useState([]);
const[search,setSearch]=useState("");const[sugg,setSugg]=useState([]);
const[loading,setLoading]=useState(false);const[loadMsg,setLoadMsg]=useState("");const[loadProg,setLoadProg]=useState(0);
const[impTxt,setImpTxt]=useState("");const[impOpen,setImpOpen]=useState(false);
const[sel,setSel]=useState(null);const[tab,setTab]=useState("setup");
const[simR,setSimR]=useState(null);const[colCat,setColCat]=useState({});
const[altCard,setAltCard]=useState(null);const[altRes,setAltRes]=useState([]);const[altLd,setAltLd]=useState(false);
// Simulator state
const[oppTxt,setOppTxt]=useState("");const[oppDeck,setOppDeck]=useState([]);const[oppName,setOppName]=useState("Adversaire");
const[simMatch,setSimMatch]=useState(null);const[simming,setSimming]=useState(false);
const[savedOpps,setSavedOpps]=useState([]);
const db=useRef(null);const db2=useRef(null);
const isCmd=fmt==="commander";

const doSearch=useCallback(q=>{setSearch(q);if(q.length<2){setSugg([]);return;}clearTimeout(db.current);db.current=setTimeout(async()=>{setSugg((await searchCards(q)).slice(0,8));},250);},[]);
const addCard=useCallback(async name=>{setLoading(true);setLoadMsg(name);const c=await fetchCard(name);if(c)setDeck(p=>[...p,{...c,qty:1}]);setSearch("");setSugg([]);setLoading(false);setLoadMsg("");},[]);
const addDirect=useCallback(card=>{setDeck(p=>[...p,{...card,qty:1}]);},[]);
const rmOne=useCallback(name=>{const i=deck.findIndex(c=>c.name.toLowerCase()===name.toLowerCase());if(i>=0)setDeck(p=>p.filter((_,j)=>j!==i));},[deck]);
const rmAll=useCallback(name=>{setDeck(p=>p.filter(c=>c.name.toLowerCase()!==name.toLowerCase()));},[]);

const doPivS=useCallback(q=>{setPivS(q);if(q.length<2){setPivSugg([]);return;}clearTimeout(db2.current);db2.current=setTimeout(async()=>{setPivSugg((await searchCards(q)).slice(0,6));},250);},[]);
const selectPivot=useCallback(async name=>{const card=await fetchCard(name);if(!card)return;setPivot(card);setPivS(card.name);setPivSugg([]);setColors(card.colorIdentity||card.colors||[]);},[]);

const handleImport=useCallback(async()=>{
  if(!impTxt.trim())return;setLoading(true);setLoadMsg("Analyse...");setLoadProg(10);
  const{mainboard:mb}=parseDecklistText(impTxt);
  setLoadMsg(`Scryfall: ${mb.length} cartes...`);
  const fetched=await fetchCardList(mb.map(e=>e.name),(c,t)=>{setLoadProg(10+Math.round(c/t*80));});
  const nd=[];for(const e of mb){const c=fetched.find(f=>f.name.toLowerCase()===e.name.toLowerCase());if(c)for(let i=0;i<e.qty;i++)nd.push({...c,qty:1});}
  if(nd.length>=80&&fmt!=="commander")setFmt("commander");
  setDeck(nd);setImpOpen(false);setImpTxt("");setLoading(false);setLoadProg(100);setTab("deck");
},[impTxt,fmt]);

const genDeck=useCallback(async()=>{
  if(!colors.length)return;setLoading(true);setLoadProg(0);
  const gen=await generateDeckV11(fmt,colors,pivot,isCmd,(c,t,m)=>{setLoadMsg(m);setLoadProg(Math.round(c/t*100));});
  setDeck(gen);setLoading(false);setTab("deck");
},[fmt,colors,pivot,isCmd]);

// AUTO-IMPROVE: replace weakest cards with better alternatives
const autoImprove=useCallback(async()=>{
  const scored=result.scored||[];
  const weak=scored.filter(c=>!/land/i.test(c.type||"")&&c.final<=2).slice(0,5);
  if(!weak.length)return;
  setLoading(true);let improved=0;
  for(const card of weak){
    setLoadMsg(`Amélioration: ${card.name}...`);setLoadProg(Math.round(improved/weak.length*100));
    const deckNames=deck.map(c=>c.name.toLowerCase());
    const alts=await searchAlternatives(card,fmt,colors,isCmd);
    const filtered=alts.filter(a=>!deckNames.includes(a.name.toLowerCase()));
    if(filtered.length>0){
      const best=filtered.sort((a,b)=>scoreCard(b.oracle||"",b.cmc||0).pts-scoreCard(a.oracle||"",a.cmc||0).pts)[0];
      setDeck(prev=>{const idx=prev.findIndex(c=>c.name.toLowerCase()===card.name.toLowerCase());if(idx>=0){const n=[...prev];n[idx]={...best,qty:1};return n;}return prev;});
    }
    improved++;
  }
  setLoading(false);setLoadMsg("");
},[deck,result,fmt,colors,isCmd]);

// Import opponent deck
const importOpp=useCallback(async()=>{
  if(!oppTxt.trim())return;setLoading(true);setLoadMsg("Import adversaire...");
  const{mainboard:mb}=parseDecklistText(oppTxt);
  const fetched=await fetchCardList(mb.map(e=>e.name));
  const nd=[];for(const e of mb){const c=fetched.find(f=>f.name.toLowerCase()===e.name.toLowerCase());if(c)for(let i=0;i<e.qty;i++)nd.push({...c,qty:1});}
  setOppDeck(nd);setLoading(false);
  // Save to list
  if(nd.length>0)setSavedOpps(p=>[...p.filter(o=>o.name!==oppName),{name:oppName,deck:nd}]);
},[oppTxt,oppName]);

// Run simulation
const runSim=useCallback(async(opponent)=>{
  const opp=opponent||oppDeck;
  if(!opp.length||!deck.length)return;
  setSimming(true);setSimMatch(null);
  await new Promise(r=>setTimeout(r,50));
  const res=simulateMatchup(deck,opp,200,(c,t)=>{});
  setSimMatch(res);setSimming(false);
},[deck,oppDeck]);

const findAlts=useCallback(async card=>{
  setAltCard(card);setAltLd(true);setAltRes([]);
  const deckNames=deck.map(c=>c.name.toLowerCase());
  const alts=await searchAlternatives(card,fmt,colors,isCmd);
  const filtered=alts.filter(a=>!deckNames.includes(a.name.toLowerCase()));
  const scored=filtered.map(c=>({...c,_s:scoreCard(c.oracle||"",c.cmc||0).pts})).sort((a,b)=>b._s-a._s);
  setAltRes(scored.slice(0,6));setAltLd(false);
},[fmt,colors,isCmd,deck]);

const result=useMemo(()=>scoreFullDeck(deck,pivot?.oracle||""),[deck,pivot]);
const analytics=useMemo(()=>analyzeDeck(deck,result.scored),[deck,result]);
const bracket=useMemo(()=>getBracket(result.pr,deck.length),[result.pr,deck.length]);
const matchup=useMemo(()=>getMatchupProfile(analytics,result.arch,bracket),[analytics,result.arch,bracket]);
const uniqueCards=result.grouped||[];
const catGroups=useMemo(()=>{const g={};for(const c of uniqueCards){const cat=c.category||getCategory(c.type);if(!g[cat])g[cat]=[];g[cat].push(c);}for(const k of Object.keys(g))g[k].sort((a,b)=>b.final-a.final);return g;},[uniqueCards]);
const weakCards=useMemo(()=>[...uniqueCards].filter(c=>!/land/i.test(c.type||"")).sort((a,b)=>a.final-b.final).slice(0,5),[uniqueCards]);

return(<div style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",background:"#060810",color:"#c0c8d8",minHeight:"100vh"}}>

{loading&&<div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(6,8,16,0.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px"}}>
  <div style={{fontSize:"12px",color:"#3b82f6"}}>{loadMsg||"..."}</div>
  <div style={{width:"200px",height:"4px",background:"#141e30",borderRadius:"2px"}}><div style={{width:`${loadProg}%`,height:"100%",background:"linear-gradient(90deg,#3b82f6,#22c55e)",borderRadius:"2px",transition:"width 0.3s"}}/></div>
</div>}

{/* HEADER */}
<div style={{background:"linear-gradient(135deg,#080c18,#0c1428)",padding:"8px 10px",borderBottom:"1px solid #141e30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
  <div style={{display:"flex",alignItems:"baseline",gap:"2px"}}>
    <span style={{fontSize:"15px",fontWeight:"800",color:"#e8f0ff"}}>aeon</span><span style={{fontSize:"15px",color:"#f59e0b"}}>_</span><span style={{fontSize:"15px",fontWeight:"800",color:"#3b82f6"}}>scorer</span><span style={{fontSize:"8px",color:"#22c55e",marginLeft:"2px"}}>v11</span>
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

{/* TABS */}
<div style={{display:"flex",background:"#080c14",borderBottom:"1px solid #101828",overflowX:"auto"}}>
  {[{id:"setup",l:"⚙️Setup"},{id:"deck",l:`📋${deck.length}`},{id:"bracket",l:`🏆B${bracket.n}`},{id:"simulator",l:"🎮Sim"},{id:"analytics",l:"📊"},{id:"combos",l:`💥${(detectCombos(deck.map(c=>c.name))).length}`}].map(t=>
    <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 1px",border:"none",cursor:"pointer",background:tab===t.id?"#0c1020":"transparent",color:tab===t.id?"#3b82f6":"#2a3a50",fontSize:"8px",fontWeight:tab===t.id?"700":"400",borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap"}}>{t.l}</button>
  )}
</div>

<div style={{padding:"8px",maxWidth:"720px",margin:"0 auto"}}>

  {/* SETUP */}
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
        <div style={{display:"flex",gap:"2px",marginTop:"3px"}}>{getTags(pivot.oracle||"").map(t=><span key={t} style={{fontSize:"6px",padding:"1px 3px",borderRadius:"1px",background:"#0c1428",color:"#3b82f6"}}>{t}</span>)}</div></div>
      </div>}
    </div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
      <div style={{fontSize:"8px",color:"#22c55e",fontWeight:"700",marginBottom:"6px"}}>3. COULEURS</div>
      <div style={{display:"flex",gap:"3px"}}>
        {COLS.map(c=><button key={c.id} onClick={()=>setColors(p=>p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])} style={{width:"32px",height:"26px",borderRadius:"3px",border:`2px solid ${colors.includes(c.id)?c.bg:"#1a2a44"}`,background:colors.includes(c.id)?c.bg:c.bg+"15",color:colors.includes(c.id)?c.fg:"#3a4a5a",fontSize:"11px",cursor:"pointer",fontFamily:"inherit",fontWeight:"700"}}>{c.l}</button>)}
      </div>
    </div>
    <button onClick={genDeck} disabled={!colors.length} style={{width:"100%",padding:"10px",background:!colors.length?"#101828":"linear-gradient(135deg,#1a3a6a,#2a4a8a)",border:"none",borderRadius:"5px",color:"#e8f0ff",fontSize:"12px",fontWeight:"700",cursor:!colors.length?"default":"pointer",fontFamily:"inherit",opacity:!colors.length?.3:1}}>⚡ Générer le deck</button>
  </div>}

  {/* DECK */}
  {tab==="deck"&&<div>
    <div style={{display:"flex",gap:"3px",marginBottom:"6px"}}>
      <input value={search} onChange={e=>doSearch(e.target.value)} placeholder="🔍 Ajouter..." style={{flex:1,padding:"5px 7px",background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",color:"#e8f0ff",fontSize:"9px",fontFamily:"inherit"}}/>
      <button onClick={autoImprove} style={{padding:"5px 8px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"3px",color:"#22c55e",fontSize:"8px",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>✨ Améliorer</button>
    </div>
    {sugg.length>0&&<div style={{background:"#0c1020",border:"1px solid #141e30",borderRadius:"3px",marginBottom:"4px"}}>
      {sugg.map((n,i)=><div key={i} onClick={()=>addCard(n)} style={{padding:"3px 7px",cursor:"pointer",borderBottom:"1px solid #101828",fontSize:"9px",color:"#c0c8d8"}} onMouseOver={e=>e.currentTarget.style.background="#101828"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{n}</div>)}
    </div>}

    {CAT_ORDER.map(cat=>{const cards=catGroups[cat];if(!cards?.length)return null;const qty=cards.reduce((s,c)=>s+c.qty,0);
      return<div key={cat} style={{marginBottom:"3px"}}>
        <div onClick={()=>setColCat(p=>({...p,[cat]:!p[cat]}))} style={{display:"flex",alignItems:"center",gap:"4px",padding:"3px 5px",background:"#0a0e18",border:"1px solid #141e30",borderRadius:"2px",cursor:"pointer"}}>
          <span style={{fontSize:"9px"}}>{CAT_ICONS[cat]}</span><span style={{fontSize:"8px",fontWeight:"700",color:CAT_CLR[cat],flex:1}}>{cat}</span><span style={{fontSize:"8px",color:"#4a6a8a"}}>{qty}</span><span style={{fontSize:"6px",color:"#2a3a50"}}>{colCat[cat]?"▸":"▾"}</span>
        </div>
        {!colCat[cat]&&<div style={{borderLeft:`2px solid ${(CAT_CLR[cat]||"#333")}20`,marginLeft:"3px",paddingLeft:"3px"}}>
          {cards.map((card,i)=>{const w=weakCards.some(x=>x.name===card.name);return<div key={i} style={{display:"flex",alignItems:"center",gap:"3px",padding:"2px 3px",background:sel===card.name?"#0c1020":w?"#100808":"transparent",borderRadius:"2px",cursor:"pointer",borderLeft:w?"2px solid #ef444430":"2px solid transparent"}} onClick={()=>setSel(sel===card.name?null:card.name)}>
            <span style={{fontSize:"8px",fontWeight:"700",color:CAT_CLR[cat],width:"16px",textAlign:"center"}}>{card.qty}×</span>
            <span style={{flex:1,fontSize:"8px",color:w?"#aa8888":"#dde4ee",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card.name}</span>
            {card.gc&&<span style={{fontSize:"4px",color:"#f59e0b",background:"#1a1508",padding:"0 1px",borderRadius:"1px"}}>GC</span>}
            {w&&<span style={{fontSize:"4px",color:"#ef4444",background:"#1a0808",padding:"0 1px",borderRadius:"1px"}}>▼</span>}
            <span style={{fontSize:"10px",fontWeight:"700",color:card.final>=10?"#ef4444":card.final>=4?"#f59e0b":"#22c55e"}}>{card.final*card.qty}</span>
          </div>;})}
          {sel&&cards.some(c=>c.name===sel)&&(()=>{const card=cards.find(c=>c.name===sel);if(!card)return null;return<div style={{padding:"5px",background:"#0a0e18",borderRadius:"2px",margin:"1px 0"}}>
            {card.imgSmall&&<img src={card.imgSmall} alt="" style={{width:"50px",borderRadius:"2px",float:"right",margin:"0 0 2px 4px"}}/>}
            <div style={{fontSize:"7px",color:"#3a4a5a",lineHeight:1.2}}>{card.oracle?.slice(0,200)}</div>
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
          </div>})()}
        </div>}
      </div>;
    })}
  </div>}

  {/* BRACKET */}
  {tab==="bracket"&&<div>
    <div style={{background:`linear-gradient(135deg,#080c18,#0a1020)`,border:`2px solid ${bracket.c}40`,borderRadius:"8px",padding:"14px",textAlign:"center",marginBottom:"8px"}}>
      <div style={{fontSize:"36px",fontWeight:"800",color:"#f59e0b"}}>{result.pr}</div>
      <div style={{fontSize:"18px",fontWeight:"700",color:bracket.c}}>Bracket {bracket.n} — {bracket.name}</div>
      <div style={{fontSize:"8px",color:"#4a5a6a"}}>{bracket.d}</div>
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

  {/* SIMULATOR */}
  {tab==="simulator"&&<div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
      <div style={{fontSize:"9px",color:"#f59e0b",fontWeight:"700",marginBottom:"6px"}}>🎮 SIMULATEUR DE MATCHS</div>
      <div style={{fontSize:"8px",color:"#4a5a6a",marginBottom:"6px"}}>Simule 200 parties entre ton deck et un adversaire. Les deux joueurs jouent de manière optimale sur 7 tours.</div>
      <input value={oppName} onChange={e=>setOppName(e.target.value)} placeholder="Nom du deck adverse" style={{width:"100%",padding:"4px 6px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"2px",color:"#e8f0ff",fontSize:"9px",fontFamily:"inherit",boxSizing:"border-box",marginBottom:"4px"}}/>
      <textarea value={oppTxt} onChange={e=>setOppTxt(e.target.value)} rows={4} placeholder={"Colle la decklist adverse :\n4 Monastery Swiftspear\n4 Lightning Bolt\n..."} style={{width:"100%",padding:"5px",background:"#060810",border:"1px solid #1a2a44",borderRadius:"2px",color:"#c0c8d8",fontSize:"9px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:"4px",marginTop:"4px"}}>
        <button onClick={importOpp} disabled={loading} style={{padding:"5px 10px",background:"#1a2a44",border:"none",borderRadius:"2px",color:"#e8f0ff",fontSize:"9px",cursor:"pointer",fontFamily:"inherit"}}>📥 Charger adversaire</button>
        <button onClick={()=>runSim()} disabled={!oppDeck.length||!deck.length||simming} style={{padding:"5px 10px",background:(!oppDeck.length||!deck.length)?"#101828":"#1a3a6a",border:"none",borderRadius:"2px",color:"#e8f0ff",fontSize:"9px",cursor:"pointer",fontFamily:"inherit",opacity:(!oppDeck.length||!deck.length)?.3:1}}>{simming?"Simulation...":"⚔️ Simuler 200 matchs"}</button>
      </div>
      {oppDeck.length>0&&<div style={{fontSize:"8px",color:"#22c55e",marginTop:"4px"}}>✓ Adversaire chargé: {oppDeck.length} cartes</div>}
    </div>

    {/* Saved opponents */}
    {savedOpps.length>0&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px",marginBottom:"6px"}}>
      <div style={{fontSize:"8px",color:"#4a6a8a",marginBottom:"4px"}}>Adversaires sauvegardés :</div>
      {savedOpps.map((o,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"4px",padding:"2px 0"}}>
        <span style={{flex:1,fontSize:"9px",color:"#c0c8d8"}}>{o.name} ({o.deck.length} cartes)</span>
        <button onClick={()=>{setOppDeck(o.deck);setOppName(o.name);runSim(o.deck);}} style={{fontSize:"7px",padding:"2px 6px",background:"#1a3a6a",border:"none",borderRadius:"2px",color:"#e8f0ff",cursor:"pointer",fontFamily:"inherit"}}>⚔️ Sim</button>
      </div>)}
    </div>}

    {/* Results */}
    {simMatch&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px"}}>
      <div style={{fontSize:"9px",color:"#4a6a8a",marginBottom:"8px"}}>RÉSULTATS ({simMatch.iterations} parties)</div>
      <div style={{display:"flex",gap:"6px",marginBottom:"10px"}}>
        <div style={{flex:1,textAlign:"center",background:simMatch.p1Winrate>50?"#081008":"#100808",borderRadius:"4px",padding:"8px"}}>
          <div style={{fontSize:"24px",fontWeight:"800",color:simMatch.p1Winrate>50?"#22c55e":"#ef4444"}}>{simMatch.p1Winrate}%</div>
          <div style={{fontSize:"8px",color:"#6a7a6a"}}>Ton deck</div>
        </div>
        <div style={{flex:0,display:"flex",alignItems:"center",fontSize:"10px",color:"#2a3a50"}}>vs</div>
        <div style={{flex:1,textAlign:"center",background:simMatch.p2Winrate>50?"#081008":"#100808",borderRadius:"4px",padding:"8px"}}>
          <div style={{fontSize:"24px",fontWeight:"800",color:simMatch.p2Winrate>50?"#22c55e":"#ef4444"}}>{simMatch.p2Winrate}%</div>
          <div style={{fontSize:"8px",color:"#6a7a6a"}}>{oppName}</div>
        </div>
      </div>
      {[{l:"Matchs nuls",v:`${simMatch.drawRate}%`},{l:"Tours moyens",v:simMatch.avgTurns},{l:"PV moyens (toi)",v:simMatch.avgP1Life},{l:"PV moyens (adv)",v:simMatch.avgP2Life}].map((r,i)=>
        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"8px",padding:"1px 0"}}><span style={{color:"#6a7a8a"}}>{r.l}</span><span style={{color:"#e0e8f0"}}>{r.v}</span></div>
      )}
      {/* Turn by turn sample */}
      {simMatch.sampleGame?.length>0&&<div style={{marginTop:"8px"}}>
        <div style={{fontSize:"8px",color:"#4a6a8a",marginBottom:"4px"}}>Exemple de partie :</div>
        <div style={{display:"flex",gap:"2px",flexWrap:"wrap"}}>
          {simMatch.sampleGame.map((t,i)=><div key={i} style={{background:"#0a0e18",borderRadius:"2px",padding:"3px 5px",fontSize:"7px",textAlign:"center"}}>
            <div style={{color:"#4a6a8a"}}>T{t.turn}</div>
            <div style={{color:t.p1Life>0?"#22c55e":"#ef4444"}}>{t.p1Life}</div>
            <div style={{color:t.p2Life>0?"#3b82f6":"#ef4444"}}>{t.p2Life}</div>
          </div>)}
        </div>
      </div>}
    </div>}
  </div>}

  {/* ANALYTICS */}
  {tab==="analytics"&&<div>
    {deck.length===0?<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"9px"}}>Crée un deck.</div>:<>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"8px",marginBottom:"4px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}><span style={{fontSize:"7px",color:"#4a6a8a"}}>GLOBAL</span><span style={{fontSize:"16px",fontWeight:"700",color:analytics.m.global>=70?"#22c55e":analytics.m.global>=50?"#f59e0b":"#ef4444"}}>{analytics.m.global}/100</span></div>
      {[{k:"curve",l:"Courbe",d:analytics.avg},{k:"ca",l:"Pioche",d:analytics.ds},{k:"interaction",l:"Interact",d:analytics.rm},{k:"mana",l:"Mana",d:analytics.la},{k:"ramp",l:"Ramp",d:analytics.rp},{k:"resilience",l:"Résil",d:analytics.rc}].map(m=>
        <div key={m.k} style={{marginBottom:"2px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"7px"}}><span style={{color:"#6a7a8a"}}>{m.l} ({m.d})</span><span style={{color:analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444"}}>{analytics.m[m.k]}</span></div><div style={{height:"2px",background:"#0c1428",borderRadius:"1px"}}><div style={{width:`${analytics.m[m.k]}%`,height:"100%",background:analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444",borderRadius:"1px"}}/></div></div>
      )}
    </div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px"}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:"1px",height:"30px"}}>
        {[0,1,2,3,4,5,6,7].map(c=>{const v=analytics.curve[c]||0;const mx=Math.max(...Object.values(analytics.curve),1);return<div key={c} style={{flex:1,textAlign:"center"}}>{v>0&&<div style={{fontSize:"5px",color:"#3b82f6"}}>{v}</div>}<div style={{height:`${(v/mx)*22}px`,background:"#3b82f6",borderRadius:"1px 1px 0 0",minHeight:v?"1px":"0"}}/><div style={{fontSize:"4px",color:"#2a3a50"}}>{c===7?"7+":c}</div></div>;})}
      </div>
    </div>
    <button onClick={()=>setSimR(simHands(deck,2000))} disabled={deck.length<7} style={{width:"100%",padding:"4px",background:"#1a3a6a",border:"none",borderRadius:"2px",color:"#e8f0ff",fontSize:"7px",cursor:"pointer",fontFamily:"inherit",margin:"4px 0"}}>🎲 Sim mains</button>
    {simR&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",padding:"4px"}}>
      {[{l:"Jouables",v:`${simR.play}%`},{l:"1-drop",v:`${simR.t1}%`},{l:"Mull",v:`${simR.mull}%`}].map((r,i)=>
        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"7px"}}><span style={{color:"#6a7a8a"}}>{r.l}</span><span style={{color:"#22c55e"}}>{r.v}</span></div>
      )}
    </div>}
    </>}
  </div>}

  {/* COMBOS */}
  {tab==="combos"&&<div>
    {(detectCombos(deck.map(c=>c.name))).map((co,i)=><div key={i} style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",padding:"5px",marginBottom:"2px",borderLeft:`3px solid ${TC[co.tier]}`}}>
      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"9px",fontWeight:"600",color:"#e0e8f0"}}>{co.name}</span><span style={{fontSize:"10px",fontWeight:"700",color:TC[co.tier]}}>×{co.mult}</span></div>
      <div style={{fontSize:"7px",color:"#3a4a5a"}}>{co.cards.join(" + ")}</div>
    </div>)}
    {(detectCombos(deck.map(c=>c.name))).length===0&&<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"9px"}}>Aucun combo.</div>}
  </div>}

</div>
</div>);
}
