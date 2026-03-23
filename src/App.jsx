import{useState,useCallback,useMemo,useRef,useEffect}from"react";
import{searchCards,fetchCard,fetchCardList,parseDecklistText}from"./scryfall.js";
import{scoreFullDeck,analyzeDeck,simHands,detectCombos,getTags,getBracket,COMBOS,GAME_CHANGERS,CC,TC}from"./engine.js";

export default function App(){
  const[deck,setDeck]=useState([]);
  const[cmdName,setCmdName]=useState("");
  const[cmdOracle,setCmdOracle]=useState("");
  const[search,setSearch]=useState("");
  const[sugg,setSugg]=useState([]);
  const[loading,setLoading]=useState(false);
  const[impTxt,setImpTxt]=useState("");
  const[impOpen,setImpOpen]=useState(false);
  const[sel,setSel]=useState(null);
  const[tab,setTab]=useState("deck");
  const[simR,setSimR]=useState(null);
  const[simRun,setSimRun]=useState(false);
  const[fmt,setFmt]=useState("commander");
  const db=useRef(null);

  const doSearch=useCallback(q=>{setSearch(q);if(q.length<2){setSugg([]);return;}clearTimeout(db.current);db.current=setTimeout(async()=>{setSugg((await searchCards(q)).slice(0,8));},250);},[]);
  const addCard=useCallback(async name=>{setLoading(true);const c=await fetchCard(name);if(c)setDeck(p=>[...p,{...c,qty:1}]);setSearch("");setSugg([]);setLoading(false);},[]);
  const rmCard=useCallback(i=>{setDeck(p=>p.filter((_,j)=>j!==i));if(sel===i)setSel(null);},[sel]);

  const handleImport=useCallback(async()=>{
    if(!impTxt.trim())return;setLoading(true);
    const{mainboard,sideboard}=parseDecklistText(impTxt);
    const all=[...mainboard,...sideboard];
    const fetched=await fetchCardList(all.map(e=>e.name));
    const nd=[];
    for(const e of all){const c=fetched.find(f=>f.name.toLowerCase()===e.name.toLowerCase());if(c)for(let i=0;i<e.qty;i++)nd.push({...c,qty:1});}
    setDeck(nd);setImpOpen(false);setImpTxt("");setLoading(false);
  },[impTxt]);

  useEffect(()=>{if(deck.length>0&&!cmdName){const leg=deck.find(c=>c.type?.includes("Legendary")&&/creature|planeswalker/i.test(c.type||""));if(leg){setCmdName(leg.name);setCmdOracle(leg.oracle||"");}}},[deck,cmdName]);

  const runSim=useCallback(()=>{setSimRun(true);setTimeout(()=>{setSimR(simHands(deck,2000));setSimRun(false);},50);},[deck]);

  const result=useMemo(()=>scoreFullDeck(deck,cmdOracle),[deck,cmdOracle]);
  const analytics=useMemo(()=>analyzeDeck(deck,result.scored),[deck,result]);
  const bracket=useMemo(()=>getBracket(result.pr,deck.length),[result.pr,deck.length]);
  const allCombos=useMemo(()=>detectCombos(deck.map(c=>c.name)),[deck]);
  const totalPrice=deck.reduce((s,c)=>s+(parseFloat(c.prices?.eur)||0),0);

  const B=({v,max=100,color})=><div style={{height:"4px",background:"#0c1428",borderRadius:"2px",overflow:"hidden",marginTop:"3px"}}><div style={{width:`${Math.min(100,v/max*100)}%`,height:"100%",borderRadius:"2px",background:color||"#3b82f6"}}/></div>;

  return(<div style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",background:"#060810",color:"#c0c8d8",minHeight:"100vh"}}>
    {/* HEADER */}
    <div style={{background:"linear-gradient(135deg,#080c18,#0c1428,#080c18)",padding:"16px 14px",borderBottom:"1px solid #141e30"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{display:"flex",alignItems:"baseline",gap:"3px"}}>
            <span style={{fontSize:"20px",fontWeight:"800",color:"#e8f0ff"}}>aeon</span>
            <span style={{fontSize:"20px",color:"#f59e0b"}}>_</span>
            <span style={{fontSize:"20px",fontWeight:"800",color:"#3b82f6"}}>scorer</span>
            <span style={{fontSize:"11px",color:"#22c55e",marginLeft:"4px"}}>v6</span>
          </div>
          <p style={{fontSize:"8px",color:"#2a3a50",margin:"2px 0 0"}}>Brackets • Récurrence • Vitesse • Archétype • {COMBOS.length} combos • Monte Carlo • Game Changers</p>
        </div>
        <button onClick={()=>setImpOpen(!impOpen)} style={{padding:"6px 12px",background:impOpen?"#1a2a44":"#0c1428",border:"1px solid #1a2a44",borderRadius:"4px",color:"#3b82f6",fontSize:"10px",cursor:"pointer",fontFamily:"inherit"}}>{impOpen?"✕ Fermer":"📋 Importer"}</button>
      </div>
    </div>

    {/* IMPORT */}
    {impOpen&&<div style={{background:"#0a1020",borderBottom:"1px solid #141e30",padding:"12px"}}>
      <div style={{fontSize:"9px",color:"#4a6a8a",marginBottom:"4px"}}>Format MTGO / Moxfield / Arena (ex: "4 Lightning Bolt")</div>
      <textarea value={impTxt} onChange={e=>setImpTxt(e.target.value)} rows={6} placeholder="4 Sol Ring\n1 Thassa's Oracle\n4 Island\n\nSideboard:\n2 Negate" style={{width:"100%",padding:"8px",background:"#060810",border:"1px solid #1a2a44",borderRadius:"4px",color:"#c0c8d8",fontSize:"11px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:"6px",marginTop:"6px"}}>
        <button onClick={handleImport} disabled={loading} style={{padding:"7px 18px",background:"#1a3a6a",border:"none",borderRadius:"4px",color:"#e8f0ff",fontSize:"11px",cursor:"pointer",fontFamily:"inherit",opacity:loading?.5:1}}>{loading?"Chargement Scryfall...":"⚡ Importer"}</button>
        <button onClick={()=>{setDeck([]);setSel(null);setSimR(null);setCmdName("");setCmdOracle("");}} style={{padding:"7px 14px",background:"#1a1020",border:"1px solid #2a1a30",borderRadius:"4px",color:"#8a6a7a",fontSize:"10px",cursor:"pointer",fontFamily:"inherit"}}>🗑️ Vider</button>
      </div>
    </div>}

    {/* TABS */}
    <div style={{display:"flex",background:"#080c14",borderBottom:"1px solid #101828"}}>
      {[{id:"deck",l:`Deck (${deck.length})`},{id:"bracket",l:"Bracket"},{id:"analytics",l:"Analyse"},{id:"sim",l:"Simulation"},{id:"combos",l:`Combos (${allCombos.length})`},{id:"algo",l:"Algo"}].map(t=>
        <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 2px",border:"none",cursor:"pointer",background:tab===t.id?"#0c1020":"transparent",color:tab===t.id?"#3b82f6":"#2a3a50",fontSize:"9px",fontWeight:tab===t.id?"700":"400",borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent",fontFamily:"inherit"}}>{t.l}</button>
      )}
    </div>

    <div style={{padding:"12px 10px",maxWidth:"720px",margin:"0 auto"}}>
      {/* CMD */}
      <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"8px 10px",marginBottom:"6px"}}>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <span style={{fontSize:"8px",color:"#3b82f6",whiteSpace:"nowrap"}}>⚔️ CMD</span>
          <input value={cmdName} onChange={e=>setCmdName(e.target.value)} placeholder="Commandant" style={{flex:1,padding:"4px 6px",background:"#0c1428",border:"1px solid #141e30",borderRadius:"3px",color:"#e8f0ff",fontSize:"10px",fontFamily:"inherit"}}/>
          <button onClick={async()=>{if(cmdName){const c=await fetchCard(cmdName);if(c)setCmdOracle(c.oracle);}}} style={{padding:"4px 8px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"3px",color:"#4a6a8a",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>Fetch</button>
        </div>
        {cmdOracle&&<div style={{fontSize:"8px",color:"#2a3a50",marginTop:"3px"}}>{cmdOracle.slice(0,120)}...</div>}
      </div>

      {/* BRACKET + POWER RATING DISPLAY */}
      <div style={{display:"flex",gap:"6px",marginBottom:"6px"}}>
        <div style={{flex:2,background:"linear-gradient(135deg,#080c18,#0a1020)",border:`2px solid ${bracket.c}40`,borderRadius:"8px",padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:"8px",color:"#4a6a8a",textTransform:"uppercase",letterSpacing:"1px"}}>Bracket</div>
          <div style={{fontSize:"28px",fontWeight:"800",color:bracket.c}}>{bracket.n}</div>
          <div style={{fontSize:"11px",fontWeight:"600",color:bracket.c}}>{bracket.name}</div>
          <div style={{fontSize:"8px",color:"#3a4a5a",marginTop:"2px"}}>{bracket.d}</div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:"4px"}}>
          <div style={{flex:1,background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"6px 8px",textAlign:"center"}}>
            <div style={{fontSize:"7px",color:"#4a6a8a"}}>POWER</div>
            <div style={{fontSize:"18px",fontWeight:"700",color:"#f59e0b"}}>{result.pr}</div>
          </div>
          <div style={{flex:1,background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"6px 8px",textAlign:"center"}}>
            <div style={{fontSize:"7px",color:"#4a6a8a"}}>PRIX</div>
            <div style={{fontSize:"14px",fontWeight:"600",color:"#22c55e"}}>{totalPrice>0?`${Math.round(totalPrice)}€`:"—"}</div>
          </div>
        </div>
      </div>

      {/* Archetype + Speed + Tutors */}
      <div style={{display:"flex",gap:"4px",marginBottom:"8px"}}>
        {[{l:"Archétype",v:result.arch,c:"#8b5cf6"},{l:"Vitesse",v:`×${result.spd}`,c:result.spd>=1.15?"#22c55e":"#f59e0b"},{l:"CMC Moy",v:result.avg,c:result.avg<=2.5?"#22c55e":"#f59e0b"},{l:"Tuteurs",v:result.tut,c:result.tut>=4?"#ef4444":"#3b82f6"},{l:"Fast Mana",v:result.fm,c:result.fm>=3?"#ef4444":"#3b82f6"},{l:"GChangers",v:analytics.gc,c:analytics.gc>=3?"#ef4444":"#3b82f6"}].map(s=>
          <div key={s.l} style={{flex:1,background:"#080c18",border:"1px solid #101828",borderRadius:"4px",padding:"5px 4px",textAlign:"center"}}>
            <div style={{fontSize:"12px",fontWeight:"600",color:s.c}}>{s.v}</div>
            <div style={{fontSize:"7px",color:"#2a3a50"}}>{s.l}</div>
          </div>
        )}
      </div>

      {/* SEARCH */}
      <div style={{position:"relative",marginBottom:"8px"}}>
        <input value={search} onChange={e=>doSearch(e.target.value)} placeholder="🔍 Rechercher (Scryfall live)..." style={{width:"100%",padding:"7px 10px",background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",color:"#e8f0ff",fontSize:"11px",fontFamily:"inherit",boxSizing:"border-box"}}/>
        {sugg.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#0c1020",border:"1px solid #141e30",borderRadius:"0 0 6px 6px",maxHeight:"180px",overflowY:"auto"}}>
          {sugg.map((n,i)=><div key={i} onClick={()=>addCard(n)} style={{padding:"5px 10px",cursor:"pointer",borderBottom:"1px solid #101828",fontSize:"11px",color:"#c0c8d8"}} onMouseOver={e=>e.currentTarget.style.background="#101828"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{n}</div>)}
        </div>}
      </div>

      {/* DECK TAB */}
      {tab==="deck"&&<div>
        {result.scored.length===0&&<div style={{textAlign:"center",padding:"30px",color:"#1a2a40",fontSize:"11px"}}>Importe une decklist ou cherche des cartes.</div>}
        {[...result.scored].sort((a,b)=>b.final-a.final).map((card,idx)=><div key={idx} style={{background:sel===idx?"#0c1020":"#080c18",border:`1px solid ${card.gc?"#3a2a10":sel===idx?"#1a2a44":"#101828"}`,borderRadius:"5px",padding:"7px 10px",marginBottom:"2px",cursor:"pointer",borderLeft:card.gc?"3px solid #f59e0b":"3px solid transparent"}}>
          <div onClick={()=>setSel(sel===idx?null:idx)} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"3px",flexWrap:"wrap"}}>
                <span style={{fontSize:"11px",fontWeight:"600",color:"#e0e8f0"}}>{card.name}</span>
                <span style={{fontSize:"7px",color:"#2a3a50",background:"#0c1428",padding:"0px 3px",borderRadius:"2px"}}>{card.cmc}⬥</span>
                {card.gc&&<span style={{fontSize:"6px",color:"#f59e0b",background:"#1a1508",padding:"0px 3px",borderRadius:"2px",fontWeight:"700"}}>GAME CHANGER</span>}
                {card.coM>1&&<span style={{fontSize:"6px",color:"#ef4444",background:"#150808",padding:"0px 3px",borderRadius:"2px"}}>COMBO ×{card.coM}</span>}
                {card.cmdM>1&&<span style={{fontSize:"6px",color:"#3b82f6",background:"#080e1a",padding:"0px 3px",borderRadius:"2px"}}>CMD +{Math.round((card.cmdM-1)*100)}%</span>}
              </div>
              <div style={{fontSize:"7px",color:"#2a3a50",marginTop:"1px"}}>{card.type?.split("—")[0]||""} • rec:{card.sc.rm}× cmc:{card.sc.cm}× ctx:{card.ctx}×</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
              {card.prices?.eur&&<span style={{fontSize:"7px",color:"#3a4a3a"}}>{card.prices.eur}€</span>}
              <span style={{fontSize:"16px",fontWeight:"700",color:card.final>=15?"#dc2626":card.final>=8?"#ef4444":card.final>=4?"#f59e0b":card.final>=2?"#3b82f6":"#22c55e"}}>{card.final}</span>
              <button onClick={e=>{e.stopPropagation();rmCard(idx);}} style={{background:"none",border:"none",color:"#1a1515",cursor:"pointer",fontSize:"10px"}}>✕</button>
            </div>
          </div>
          {sel===idx&&<div style={{marginTop:"5px",paddingTop:"5px",borderTop:"1px solid #101828"}}>
            {card.imgSmall&&<img src={card.imgSmall} alt="" style={{width:"70px",borderRadius:"3px",float:"right",marginLeft:"6px"}}/>}
            <div style={{fontSize:"8px",color:"#3a4a5a",lineHeight:1.4,marginBottom:"4px"}}>{card.oracle}</div>
            {card.sc.dets.map((d,j)=><div key={j} style={{display:"inline-flex",alignItems:"center",gap:"2px",marginRight:"6px",marginBottom:"2px"}}>
              <span style={{fontSize:"6px",padding:"0 2px",borderRadius:"1px",background:(CC[d.cat]||"#666")+"18",color:CC[d.cat]||"#666"}}>{d.cat}</span>
              <span style={{fontSize:"7px",color:"#f59e0b"}}>+{d.score}</span>
            </div>)}
            {card.myC?.map((co,k)=><div key={k} style={{fontSize:"8px",color:"#ef4444",marginTop:"2px"}}>⚡ {co.name} (×{co.mult})</div>)}
          </div>}
        </div>)}
      </div>}

      {/* BRACKET TAB */}
      {tab==="bracket"&&<div>
        <div style={{background:"linear-gradient(135deg,#080c18,#0a1020)",border:`2px solid ${bracket.c}40`,borderRadius:"10px",padding:"20px",textAlign:"center",marginBottom:"12px"}}>
          <div style={{fontSize:"9px",color:"#4a6a8a",textTransform:"uppercase",letterSpacing:"2px"}}>Power Rating</div>
          <div style={{fontSize:"48px",fontWeight:"800",color:"#f59e0b"}}>{result.pr}</div>
          <div style={{height:"6px",background:"#0c1428",borderRadius:"3px",overflow:"hidden",margin:"8px auto",maxWidth:"300px"}}>
            <div style={{width:`${Math.min(100,result.pr/10)}%`,height:"100%",background:`linear-gradient(90deg,#22c55e,#f59e0b,#ef4444)`,borderRadius:"3px"}}/>
          </div>
          <div style={{fontSize:"24px",fontWeight:"700",color:bracket.c,marginTop:"8px"}}>Bracket {bracket.n} — {bracket.name}</div>
          <div style={{fontSize:"11px",color:"#4a5a6a",marginTop:"4px"}}>{bracket.d}</div>
        </div>

        {/* Bracket scale */}
        <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"12px"}}>
          <div style={{fontSize:"9px",color:"#4a6a8a",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>Échelle {deck.length>=80?"Commander":"60 cartes"}</div>
          {(deck.length>=80?[
            {n:1,name:"Exhibition",range:"0-150",c:"#22c55e"},
            {n:2,name:"Core",range:"151-300",c:"#3b82f6"},
            {n:3,name:"Upgraded",range:"301-500",c:"#f59e0b"},
            {n:4,name:"Optimized",range:"501-700",c:"#ef4444"},
            {n:5,name:"cEDH",range:"701+",c:"#dc2626"},
          ]:[
            {n:1,name:"Casual",range:"0-100",c:"#22c55e"},
            {n:2,name:"FNM",range:"101-220",c:"#3b82f6"},
            {n:3,name:"Competitive",range:"221-380",c:"#f59e0b"},
            {n:4,name:"Pro",range:"381-550",c:"#ef4444"},
            {n:5,name:"Elite",range:"551+",c:"#dc2626"},
          ]).map(b=><div key={b.n} style={{display:"flex",alignItems:"center",gap:"8px",padding:"4px 0",borderBottom:"1px solid #101828",opacity:b.n===bracket.n?1:.5}}>
            <span style={{fontSize:"16px",fontWeight:"700",color:b.c,width:"20px"}}>{b.n}</span>
            <span style={{fontSize:"11px",color:b.n===bracket.n?"#e0e8f0":"#4a5a6a",fontWeight:b.n===bracket.n?"600":"400",flex:1}}>{b.name}</span>
            <span style={{fontSize:"9px",color:"#3a4a5a"}}>{b.range}</span>
            {b.n===bracket.n&&<span style={{fontSize:"8px",color:b.c,background:b.c+"20",padding:"1px 6px",borderRadius:"3px"}}>← Ton deck</span>}
          </div>)}
        </div>

        {/* Breakdown */}
        <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"12px",marginTop:"8px"}}>
          <div style={{fontSize:"9px",color:"#4a6a8a",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}}>Détail du Power Rating</div>
          {[
            {l:"Puissance brute (cartes)",v:result.scored.reduce((s,c)=>s+c.final,0)},
            {l:"Bonus vitesse",v:`×${result.spd}`},
            {l:"Bonus interaction",v:`+${result.intB}`},
            {l:"Bonus pioche",v:`+${result.drwB}`},
            {l:"Bonus combos",v:`+${result.coB}`},
          ].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:"10px"}}>
            <span style={{color:"#6a7a8a"}}>{r.l}</span>
            <span style={{color:"#e0e8f0",fontWeight:"600"}}>{r.v}</span>
          </div>)}
        </div>
      </div>}

      {/* ANALYTICS TAB */}
      {tab==="analytics"&&<div>
        {deck.length===0?<div style={{textAlign:"center",padding:"30px",color:"#1a2a40",fontSize:"11px"}}>Importe un deck.</div>:<>
          <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"12px",marginBottom:"8px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <span style={{fontSize:"9px",color:"#4a6a8a"}}>SCORE GLOBAL</span>
              <span style={{fontSize:"24px",fontWeight:"700",color:analytics.m.global>=70?"#22c55e":analytics.m.global>=50?"#f59e0b":"#ef4444"}}>{analytics.m.global}<span style={{fontSize:"10px",color:"#2a3a50"}}>/100</span></span>
            </div>
            {[{k:"curve",l:"Courbe de mana",d:`Moy: ${analytics.avg}`},{k:"ca",l:"Card Advantage",d:`${analytics.ds} sources`},{k:"interaction",l:"Interaction",d:`${analytics.rm} removals`},{k:"mana",l:"Manabase",d:`${analytics.la} terrains`},{k:"ramp",l:"Ramp",d:`${analytics.rp} sources`},{k:"resilience",l:"Résilience",d:`${analytics.ds} CA + ${analytics.rc} recursion`}].map(m=>
              <div key={m.k} style={{marginBottom:"5px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"9px"}}>
                  <span style={{color:"#6a7a8a"}}>{m.l} <span style={{color:"#2a3a50"}}>({m.d})</span></span>
                  <span style={{color:analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444",fontWeight:"600"}}>{analytics.m[m.k]}</span>
                </div>
                <B v={analytics.m[m.k]} color={analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444"}/>
              </div>
            )}
          </div>
          {/* CMC Curve */}
          <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"10px",marginBottom:"8px"}}>
            <div style={{fontSize:"8px",color:"#4a6a8a",marginBottom:"6px"}}>COURBE DE MANA</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:"3px",height:"60px"}}>
              {[0,1,2,3,4,5,6,7].map(c=>{const v=analytics.curve[c]||0;const mx=Math.max(...Object.values(analytics.curve),1);return<div key={c} style={{flex:1,textAlign:"center"}}>
                {v>0&&<div style={{fontSize:"8px",color:"#3b82f6",fontWeight:"600"}}>{v}</div>}
                <div style={{height:`${(v/mx)*50}px`,background:"linear-gradient(180deg,#3b82f6,#1a2a44)",borderRadius:"2px 2px 0 0",minHeight:v>0?"2px":"0"}}/>
                <div style={{fontSize:"7px",color:"#2a3a50",marginTop:"1px"}}>{c===7?"7+":c}</div>
              </div>;})}
            </div>
          </div>
          {/* Warnings */}
          {analytics.ds<(deck.length>=80?8:5)&&deck.length>20&&<div style={{background:"#150808",border:"1px solid #3a1515",borderRadius:"4px",padding:"6px 8px",marginBottom:"3px",fontSize:"9px",color:"#ef4444"}}>⚠️ {analytics.ds} sources de pioche — insuffisant</div>}
          {analytics.rm<(deck.length>=80?8:3)&&deck.length>20&&<div style={{background:"#150808",border:"1px solid #3a1515",borderRadius:"4px",padding:"6px 8px",marginBottom:"3px",fontSize:"9px",color:"#ef4444"}}>⚠️ {analytics.rm} removals — insuffisant</div>}
          {analytics.avg>3.5&&<div style={{background:"#151508",border:"1px solid #3a3515",borderRadius:"4px",padding:"6px 8px",marginBottom:"3px",fontSize:"9px",color:"#f59e0b"}}>⚠️ CMC moyen élevé ({analytics.avg}) — deck lent</div>}
          {analytics.gc>3&&bracket.n<=3&&<div style={{background:"#151508",border:"1px solid #3a3515",borderRadius:"4px",padding:"6px 8px",marginBottom:"3px",fontSize:"9px",color:"#f59e0b"}}>⚠️ {analytics.gc} Game Changers — excède la limite Bracket 3 (max 3)</div>}
        </>}
      </div>}

      {/* SIM TAB */}
      {tab==="sim"&&<div>
        <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"12px",marginBottom:"8px"}}>
          <div style={{fontSize:"9px",color:"#4a6a8a",marginBottom:"6px"}}>Monte Carlo : 2000 mains avec London Mulligan</div>
          <button onClick={runSim} disabled={deck.length<7||simRun} style={{padding:"7px 18px",background:deck.length<7?"#101828":"#1a3a6a",border:"none",borderRadius:"4px",color:"#e8f0ff",fontSize:"11px",cursor:deck.length<7?"default":"pointer",fontFamily:"inherit",opacity:deck.length<7?.3:1}}>
            {simRun?"Simulation...":deck.length<7?"7+ cartes requises":"🎲 Lancer (2000 mains)"}
          </button>
        </div>
        {simR&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"12px"}}>
          {[{l:"Mains jouables (2-5 lands + action)",v:simR.play,u:"%",g:75},{l:"Ratio terrains OK (2-5)",v:simR.lok,u:"%",g:70},{l:"1-drop jouable T1",v:simR.t1,u:"%",g:40},{l:"Taux de mulligan",v:simR.mull,u:"%",g:null},{l:"Terrains moy/main",v:simR.avgL,u:"",g:null}].map((r,i)=>
            <div key={i} style={{marginBottom:"6px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"9px"}}>
                <span style={{color:"#6a7a8a"}}>{r.l}</span>
                <span style={{fontWeight:"600",color:r.g&&r.v>=r.g?"#22c55e":r.g?"#f59e0b":"#c0c8d8"}}>{r.v}{r.u}</span>
              </div>
              {r.g&&<B v={r.v} color={r.v>=r.g?"#22c55e":"#f59e0b"}/>}
            </div>
          )}
        </div>}
      </div>}

      {/* COMBOS TAB */}
      {tab==="combos"&&<div>
        {allCombos.length===0&&<div style={{textAlign:"center",padding:"30px",color:"#1a2a40",fontSize:"11px"}}>Aucun combo détecté.</div>}
        {allCombos.map((co,i)=><div key={i} style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"8px 10px",marginBottom:"3px",borderLeft:`3px solid ${TC[co.tier]}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:"12px",fontWeight:"600",color:"#e0e8f0"}}>{co.name} <span style={{fontSize:"8px",color:TC[co.tier]}}>Tier {co.tier}</span></span>
            <span style={{fontSize:"13px",fontWeight:"700",color:TC[co.tier]}}>×{co.mult}</span>
          </div>
          <div style={{fontSize:"9px",color:"#3a4a5a",marginTop:"2px"}}>{co.cards.join(" + ")}</div>
        </div>)}
      </div>}

      {/* ALGO TAB */}
      {tab==="algo"&&<div style={{fontSize:"10px",color:"#4a5a6a",lineHeight:1.6}}>
        <h3 style={{color:"#e0e8f0",fontSize:"13px",margin:"0 0 8px"}}>AeonScorer v6 — Architecture</h3>
        <p style={{margin:"0 0 6px"}}><b style={{color:"#3b82f6"}}>Couche 1 — Intrinsèque</b> : 70+ regex × multiplicateur récurrence (one-shot ×1, whenever ×2, each upkeep ×2.5) × CMC efficiency.</p>
        <p style={{margin:"0 0 6px"}}><b style={{color:"#ef4444"}}>Couche 2 — Combos</b> : {COMBOS.length} combos × multiplicateur tuteur density.</p>
        <p style={{margin:"0 0 6px"}}><b style={{color:"#22c55e"}}>Couche 3 — Contexte</b> : Synergie commandant (+15%/tag) × bonus archétype (aggro/control/combo/midrange).</p>
        <p style={{margin:"0 0 6px"}}><b style={{color:"#f59e0b"}}>Power Rating</b> = (Σ scores contextuels × vitesse) + bonus interaction + bonus pioche + bonus combos.</p>
        <p style={{margin:"0 0 6px"}}><b style={{color:"#8b5cf6"}}>Brackets</b> : Commander 5 tiers (Exhibition→cEDH). 60 cartes 5 tiers (Casual→Elite). Basé sur le Power Rating.</p>
        <p style={{margin:"0 0 6px"}}><b style={{color:"#06b6d4"}}>Simulation</b> : 2000 mains Monte Carlo avec London Mulligan.</p>
        <div style={{background:"#0c1428",borderRadius:"4px",padding:"8px",fontFamily:"monospace",fontSize:"10px",color:"#f59e0b",margin:"8px 0"}}>
          CardScore = raw × recurrence × cmcEff / 3 × cmdSyn × comboMult × archBonus<br/>
          PowerRating = Σ(CardScores) × speedMult + interactionBonus + drawBonus + comboBonus
        </div>
        <p style={{margin:"0",fontSize:"9px",color:"#2a3a50"}}>v6 improvements: recurrence detection, speed multiplier, archetype detection, Game Changers tracking, bracket system, London mulligan simulation.</p>
      </div>}
    </div>
  </div>);
}
