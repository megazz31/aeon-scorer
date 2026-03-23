import{useState,useCallback,useMemo,useRef}from"react";
import{searchCards,fetchCard,fetchCardList,parseDecklistText,scryfallSearch,searchAlternatives,generateDeck}from"./scryfall.js";
import{scoreFullDeck,analyzeDeck,simHands,detectCombos,getTags,getBracket,getMatchupProfile,scoreCard,COMBOS,GAME_CHANGERS,CC,TC,CAT_ORDER,CAT_ICONS,CAT_CLR,getCategory}from"./engine.js";

const FMTS=[{id:"commander",l:"Commander",sz:100,copies:1},{id:"standard",l:"Standard",sz:60,copies:4},{id:"modern",l:"Modern",sz:60,copies:4},{id:"pioneer",l:"Pioneer",sz:60,copies:4},{id:"legacy",l:"Legacy",sz:60,copies:4},{id:"pauper",l:"Pauper",sz:60,copies:4},{id:"",l:"Casual",sz:60,copies:4}];
const COLS=[{id:"W",l:"W",bg:"#f5f0d0",fg:"#8a7a20"},{id:"U",l:"U",bg:"#0e68ab",fg:"#fff"},{id:"B",l:"B",bg:"#1a1a2a",fg:"#ccc"},{id:"R",l:"R",bg:"#d32029",fg:"#fff"},{id:"G",l:"G",bg:"#00733e",fg:"#fff"}];

export default function App(){
const[deck,setDeck]=useState([]);
const[fmt,setFmt]=useState("commander");
const[pivot,setPivot]=useState(null);const[pivotSearch,setPivotSearch]=useState("");const[pivotSugg,setPivotSugg]=useState([]);
const[colors,setColors]=useState([]);
const[search,setSearch]=useState("");const[sugg,setSugg]=useState([]);
const[loading,setLoading]=useState(false);const[loadMsg,setLoadMsg]=useState("");const[loadProg,setLoadProg]=useState(0);
const[impTxt,setImpTxt]=useState("");const[impOpen,setImpOpen]=useState(false);
const[sel,setSel]=useState(null);const[tab,setTab]=useState("setup");
const[simR,setSimR]=useState(null);const[colCat,setColCat]=useState({});
const[altCard,setAltCard]=useState(null);const[altResults,setAltResults]=useState([]);const[altLoading,setAltLoading]=useState(false);
const db=useRef(null);const db2=useRef(null);
const isCmd=fmt==="commander";const fmtObj=FMTS.find(f=>f.id===fmt)||FMTS[0];

// Search
const doSearch=useCallback(q=>{setSearch(q);if(q.length<2){setSugg([]);return;}clearTimeout(db.current);db.current=setTimeout(async()=>{setSugg((await searchCards(q)).slice(0,8));},250);},[]);
const addCard=useCallback(async name=>{setLoading(true);setLoadMsg(`Ajout: ${name}`);const c=await fetchCard(name);if(c)setDeck(p=>[...p,{...c,qty:1}]);setSearch("");setSugg([]);setLoading(false);setLoadMsg("");},[]);
const addDirect=useCallback(card=>{setDeck(p=>[...p,{...card,qty:1}]);},[]);
const rmOne=useCallback(name=>{const i=deck.findIndex(c=>c.name.toLowerCase()===name.toLowerCase());if(i>=0)setDeck(p=>p.filter((_,j)=>j!==i));},[deck]);
const rmAll=useCallback(name=>{setDeck(p=>p.filter(c=>c.name.toLowerCase()!==name.toLowerCase()));},[]);

// Pivot search
const doPivotSearch=useCallback(q=>{setPivotSearch(q);if(q.length<2){setPivotSugg([]);return;}clearTimeout(db2.current);db2.current=setTimeout(async()=>{setPivotSugg((await searchCards(q)).slice(0,6));},250);},[]);
const selectPivot=useCallback(async name=>{
  const card=await fetchCard(name);if(!card)return;
  setPivot(card);setPivotSearch(card.name);setPivotSugg([]);
  // Auto-detect colors from color identity
  setColors(card.colorIdentity||card.colors||[]);
},[]);

// Import
const handleImport=useCallback(async()=>{
  if(!impTxt.trim())return;setLoading(true);setLoadMsg("Analyse...");setLoadProg(5);
  const{mainboard,sideboard}=parseDecklistText(impTxt);const all=[...mainboard,...sideboard];
  setLoadMsg(`Scryfall: ${all.length} cartes...`);setLoadProg(20);
  const fetched=await fetchCardList(all.map(e=>e.name),(cur,tot)=>{setLoadProg(20+Math.round(cur/tot*60));setLoadMsg(`Scryfall: ${cur}/${tot}...`);});
  const nd=[];for(const e of all){const c=fetched.find(f=>f.name.toLowerCase()===e.name.toLowerCase());if(c)for(let i=0;i<e.qty;i++)nd.push({...c,qty:1});}
  // Auto detect format based on deck size
  if(nd.length>=80&&fmt!=="commander")setFmt("commander");
  else if(nd.length<80&&fmt==="commander")setFmt("standard");
  setDeck(nd);setImpOpen(false);setImpTxt("");setLoading(false);setLoadProg(100);setTab("deck");
},[impTxt,fmt]);

// GENERATE FULL DECK
const genDeck=useCallback(async()=>{
  if(colors.length===0){alert("Choisis au moins une couleur !");return;}
  setLoading(true);setLoadProg(0);
  const generated=await generateDeck(fmt,colors,pivot,isCmd,(cur,tot,msg)=>{setLoadMsg(msg||"Génération...");setLoadProg(Math.round(cur/tot*100));});
  setDeck(generated);setLoading(false);setLoadMsg("");setTab("deck");
},[fmt,colors,pivot,isCmd]);

// Find alternatives for weak cards
const findAlts=useCallback(async card=>{
  setAltCard(card);setAltLoading(true);setAltResults([]);
  const alts=await searchAlternatives(card,fmt,colors,isCmd);
  const scored=alts.map(c=>{const s=scoreCard(c.oracle||"",c.cmc||0);return{...c,_score:s.pts};}).sort((a,b)=>b._score-a._score);
  setAltResults(scored.slice(0,8));setAltLoading(false);
},[fmt,colors,isCmd]);

// Scoring
const result=useMemo(()=>scoreFullDeck(deck,pivot?.oracle||""),[deck,pivot]);
const analytics=useMemo(()=>analyzeDeck(deck,result.scored),[deck,result]);
const bracket=useMemo(()=>getBracket(result.pr,deck.length),[result.pr,deck.length]);
const matchup=useMemo(()=>getMatchupProfile(analytics,result.arch,bracket),[analytics,result.arch,bracket]);
const allCombos=useMemo(()=>detectCombos(deck.map(c=>c.name)),[deck]);
const totalPrice=deck.reduce((s,c)=>s+(parseFloat(c.prices?.eur)||0),0);
const uniqueCards=result.grouped||[];
const catGroups=useMemo(()=>{const g={};for(const c of uniqueCards){const cat=c.category||getCategory(c.type);if(!g[cat])g[cat]=[];g[cat].push(c);}for(const k of Object.keys(g))g[k].sort((a,b)=>b.final-a.final);return g;},[uniqueCards]);
// Weakest non-land cards
const weakCards=useMemo(()=>[...uniqueCards].filter(c=>!/land/i.test(c.type||"")).sort((a,b)=>a.final-b.final).slice(0,5),[uniqueCards]);

const B=({v,color})=><div style={{height:"3px",background:"#0c1428",borderRadius:"2px",overflow:"hidden",marginTop:"2px"}}><div style={{width:`${Math.min(100,v)}%`,height:"100%",borderRadius:"2px",background:color||"#3b82f6"}}/></div>;

return(<div style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",background:"#060810",color:"#c0c8d8",minHeight:"100vh"}}>

{/* LOADING */}
{loading&&<div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(6,8,16,0.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"10px"}}>
  <div style={{fontSize:"13px",color:"#3b82f6"}}>{loadMsg||"Chargement..."}</div>
  <div style={{width:"220px",height:"5px",background:"#141e30",borderRadius:"3px",overflow:"hidden"}}><div style={{width:`${loadProg}%`,height:"100%",background:"linear-gradient(90deg,#3b82f6,#22c55e)",borderRadius:"3px",transition:"width 0.3s"}}/></div>
  <div style={{fontSize:"9px",color:"#2a3a50"}}>{loadProg}%</div>
</div>}

{/* HEADER */}
<div style={{background:"linear-gradient(135deg,#080c18,#0c1428,#080c18)",padding:"10px 12px",borderBottom:"1px solid #141e30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
  <div style={{display:"flex",alignItems:"baseline",gap:"3px"}}>
    <span style={{fontSize:"16px",fontWeight:"800",color:"#e8f0ff"}}>aeon</span>
    <span style={{fontSize:"16px",color:"#f59e0b"}}>_</span>
    <span style={{fontSize:"16px",fontWeight:"800",color:"#3b82f6"}}>scorer</span>
    <span style={{fontSize:"9px",color:"#22c55e",marginLeft:"3px"}}>v10</span>
  </div>
  <div style={{display:"flex",gap:"3px"}}>
    <button onClick={()=>setImpOpen(!impOpen)} style={{padding:"3px 7px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"3px",color:"#3b82f6",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>📋</button>
    <button onClick={()=>{setDeck([]);setPivot(null);setPivotSearch("");setColors([]);setSel(null);setAltCard(null);setTab("setup");}} style={{padding:"3px 7px",background:"#0c1428",border:"1px solid #2a1a30",borderRadius:"3px",color:"#6a4a5a",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>🗑️</button>
  </div>
</div>

{/* IMPORT */}
{impOpen&&<div style={{background:"#0a1020",borderBottom:"1px solid #141e30",padding:"8px"}}>
  <textarea value={impTxt} onChange={e=>setImpTxt(e.target.value)} rows={4} placeholder="4 Lightning Bolt\n4 Counterspell\n24 Island" style={{width:"100%",padding:"5px",background:"#060810",border:"1px solid #1a2a44",borderRadius:"3px",color:"#c0c8d8",fontSize:"9px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
  <button onClick={handleImport} style={{marginTop:"3px",padding:"5px 12px",background:"#1a3a6a",border:"none",borderRadius:"3px",color:"#e8f0ff",fontSize:"9px",cursor:"pointer",fontFamily:"inherit"}}>⚡ Importer</button>
</div>}

{/* TABS */}
<div style={{display:"flex",background:"#080c14",borderBottom:"1px solid #101828",overflowX:"auto"}}>
  {[{id:"setup",l:"⚙️ Setup"},{id:"deck",l:`📋 Deck (${deck.length})`},{id:"bracket",l:`🏆 B${bracket.n}`},{id:"matchup",l:"⚔️ Matchup"},{id:"analytics",l:"📊"},{id:"combos",l:`💥${allCombos.length}`}].map(t=>
    <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 2px",border:"none",cursor:"pointer",background:tab===t.id?"#0c1020":"transparent",color:tab===t.id?"#3b82f6":"#2a3a50",fontSize:"8px",fontWeight:tab===t.id?"700":"400",borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap"}}>{t.l}</button>
  )}
</div>

<div style={{padding:"8px",maxWidth:"720px",margin:"0 auto"}}>

  {/* ===== SETUP TAB ===== */}
  {tab==="setup"&&<div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"12px",marginBottom:"8px"}}>
      <div style={{fontSize:"9px",color:"#3b82f6",fontWeight:"700",marginBottom:"8px"}}>1. FORMAT</div>
      <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
        {FMTS.map(f=><button key={f.id} onClick={()=>setFmt(f.id)} style={{padding:"5px 10px",background:fmt===f.id?"#1a2a44":"#0c1428",border:`1px solid ${fmt===f.id?"#3b82f6":"#141e30"}`,borderRadius:"3px",color:fmt===f.id?"#3b82f6":"#4a5a6a",fontSize:"9px",cursor:"pointer",fontFamily:"inherit",fontWeight:fmt===f.id?"700":"400"}}>{f.l} <span style={{fontSize:"7px",color:"#2a3a50"}}>({f.sz})</span></button>)}
      </div>
    </div>

    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"12px",marginBottom:"8px"}}>
      <div style={{fontSize:"9px",color:"#f59e0b",fontWeight:"700",marginBottom:"8px"}}>2. CARTE PIVOT {isCmd?"/ COMMANDANT":""}</div>
      <div style={{position:"relative"}}>
        <input value={pivotSearch} onChange={e=>doPivotSearch(e.target.value)} placeholder={isCmd?"Tape le nom de ton commandant...":"Tape le nom de ta carte centrale..."} style={{width:"100%",padding:"8px 10px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"4px",color:"#e8f0ff",fontSize:"11px",fontFamily:"inherit",boxSizing:"border-box"}}/>
        {pivotSugg.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#0c1020",border:"1px solid #1a2a44",borderRadius:"0 0 4px 4px",maxHeight:"150px",overflowY:"auto"}}>
          {pivotSugg.map((n,i)=><div key={i} onClick={()=>selectPivot(n)} style={{padding:"5px 10px",cursor:"pointer",borderBottom:"1px solid #101828",fontSize:"10px",color:"#c0c8d8"}} onMouseOver={e=>e.currentTarget.style.background="#101828"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{n}</div>)}
        </div>}
      </div>
      {pivot&&<div style={{marginTop:"8px",display:"flex",gap:"10px",alignItems:"start"}}>
        {pivot.imgSmall&&<img src={pivot.imgSmall} alt="" style={{width:"80px",borderRadius:"4px"}}/>}
        <div style={{flex:1}}>
          <div style={{fontSize:"12px",fontWeight:"700",color:"#e8f0ff"}}>{pivot.name}</div>
          <div style={{fontSize:"8px",color:"#4a5a6a",marginTop:"2px"}}>{pivot.type}</div>
          <div style={{fontSize:"8px",color:"#3a4a5a",marginTop:"3px",lineHeight:1.4}}>{pivot.oracle?.slice(0,200)}</div>
          <div style={{display:"flex",gap:"3px",marginTop:"4px",flexWrap:"wrap"}}>
            {getTags(pivot.oracle||"").map(t=><span key={t} style={{fontSize:"7px",padding:"1px 4px",borderRadius:"2px",background:"#0c1428",color:"#3b82f6",border:"1px solid #1a2a44"}}>{t}</span>)}
          </div>
        </div>
      </div>}
    </div>

    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"6px",padding:"12px",marginBottom:"8px"}}>
      <div style={{fontSize:"9px",color:"#22c55e",fontWeight:"700",marginBottom:"8px"}}>3. COULEURS {pivot?"(auto-détectées)":""}</div>
      <div style={{display:"flex",gap:"4px"}}>
        {COLS.map(c=><button key={c.id} onClick={()=>setColors(p=>p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])} style={{width:"36px",height:"30px",borderRadius:"4px",border:`2px solid ${colors.includes(c.id)?c.bg:"#1a2a44"}`,background:colors.includes(c.id)?c.bg:c.bg+"20",color:colors.includes(c.id)?c.fg:"#3a4a5a",fontSize:"12px",cursor:"pointer",fontFamily:"inherit",fontWeight:"700"}}>{c.l}</button>)}
      </div>
      {colors.length>0&&<div style={{fontSize:"8px",color:"#4a6a8a",marginTop:"4px"}}>{isCmd?"Color Identity":"Couleurs"}: {colors.join("")}</div>}
    </div>

    <button onClick={genDeck} disabled={colors.length===0} style={{width:"100%",padding:"12px",background:colors.length===0?"#101828":"linear-gradient(135deg,#1a3a6a,#2a4a8a)",border:"none",borderRadius:"6px",color:"#e8f0ff",fontSize:"13px",fontWeight:"700",cursor:colors.length===0?"default":"pointer",fontFamily:"inherit",opacity:colors.length===0?.4:1}}>
      ⚡ Générer un deck {fmtObj.l} complet ({fmtObj.sz} cartes)
    </button>
    {colors.length===0&&<div style={{fontSize:"8px",color:"#3a1a1a",textAlign:"center",marginTop:"4px"}}>Sélectionne au moins une couleur</div>}
  </div>}

  {/* ===== DECK TAB ===== */}
  {tab==="deck"&&<div>
    {/* Quick search */}
    <div style={{position:"relative",marginBottom:"6px"}}>
      <input value={search} onChange={e=>doSearch(e.target.value)} placeholder="🔍 Ajouter une carte..." style={{width:"100%",padding:"6px 8px",background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",color:"#e8f0ff",fontSize:"10px",fontFamily:"inherit",boxSizing:"border-box"}}/>
      {sugg.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#0c1020",border:"1px solid #141e30",borderRadius:"0 0 4px 4px"}}>
        {sugg.map((n,i)=><div key={i} onClick={()=>addCard(n)} style={{padding:"4px 8px",cursor:"pointer",borderBottom:"1px solid #101828",fontSize:"10px",color:"#c0c8d8"}} onMouseOver={e=>e.currentTarget.style.background="#101828"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{n}</div>)}
      </div>}
    </div>

    {uniqueCards.length===0&&<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"10px"}}>Utilise Setup → Générer ou importe une decklist.</div>}
    {CAT_ORDER.map(cat=>{const cards=catGroups[cat];if(!cards?.length)return null;const qty=cards.reduce((s,c)=>s+c.qty,0);const col=colCat[cat];
      return<div key={cat} style={{marginBottom:"3px"}}>
        <div onClick={()=>setColCat(p=>({...p,[cat]:!p[cat]}))} style={{display:"flex",alignItems:"center",gap:"4px",padding:"4px 6px",background:"#0a0e18",border:"1px solid #141e30",borderRadius:"3px",cursor:"pointer"}}>
          <span style={{fontSize:"10px"}}>{CAT_ICONS[cat]}</span>
          <span style={{fontSize:"9px",fontWeight:"700",color:CAT_CLR[cat],flex:1}}>{cat}</span>
          <span style={{fontSize:"9px",color:"#4a6a8a"}}>{qty}</span>
          <span style={{fontSize:"7px",color:"#2a3a50"}}>{col?"▸":"▾"}</span>
        </div>
        {!col&&<div style={{borderLeft:`2px solid ${(CAT_CLR[cat]||"#333")}30`,marginLeft:"4px",paddingLeft:"4px",marginTop:"1px"}}>
          {cards.map((card,i)=>{const isWeak=weakCards.some(w=>w.name===card.name);return<div key={i} style={{display:"flex",alignItems:"center",gap:"4px",padding:"3px 4px",background:sel===card.name?"#0c1020":isWeak?"#120808":"transparent",borderRadius:"2px",cursor:"pointer",borderLeft:isWeak?"2px solid #ef444440":"2px solid transparent"}} onClick={()=>setSel(sel===card.name?null:card.name)}>
            <span style={{fontSize:"9px",fontWeight:"700",color:CAT_CLR[cat],width:"18px",textAlign:"center"}}>{card.qty}×</span>
            <span style={{flex:1,fontSize:"9px",color:isWeak?"#aa8888":"#dde4ee",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card.name}</span>
            {card.gc&&<span style={{fontSize:"5px",color:"#f59e0b",background:"#1a1508",padding:"0 2px",borderRadius:"1px"}}>GC</span>}
            {isWeak&&<span style={{fontSize:"5px",color:"#ef4444",background:"#1a0808",padding:"0 2px",borderRadius:"1px"}}>FAIBLE</span>}
            <span style={{fontSize:"11px",fontWeight:"700",color:card.final>=10?"#ef4444":card.final>=4?"#f59e0b":"#22c55e"}}>{card.final*card.qty}</span>
          </div>;})}
          {/* Expanded card detail */}
          {sel&&cards.some(c=>c.name===sel)&&(()=>{const card=cards.find(c=>c.name===sel);if(!card)return null;return<div style={{padding:"6px",background:"#0a0e18",borderRadius:"3px",margin:"2px 0"}}>
            {card.imgSmall&&<img src={card.imgSmall} alt="" style={{width:"55px",borderRadius:"3px",float:"right",margin:"0 0 3px 6px"}}/>}
            <div style={{fontSize:"7px",color:"#3a4a5a",lineHeight:1.3}}>{card.oracle}</div>
            <div style={{display:"flex",gap:"3px",marginTop:"4px"}}>
              <button onClick={()=>rmOne(card.name)} style={{fontSize:"7px",padding:"2px 5px",background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:"2px",color:"#ef4444",cursor:"pointer",fontFamily:"inherit"}}>-1</button>
              <button onClick={()=>rmAll(card.name)} style={{fontSize:"7px",padding:"2px 5px",background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:"2px",color:"#8a4444",cursor:"pointer",fontFamily:"inherit"}}>Tout</button>
              <button onClick={()=>findAlts(card)} style={{fontSize:"7px",padding:"2px 5px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"2px",color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}>🔄 Alternatives</button>
            </div>
            {altCard?.name===card.name&&<div style={{marginTop:"4px",paddingTop:"4px",borderTop:"1px solid #141e30"}}>
              {altLoading?<div style={{fontSize:"8px",color:"#2a4a2a"}}>Recherche Scryfall...</div>:
              altResults.length>0?altResults.map((a,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:"3px",padding:"2px 0",borderBottom:"1px solid #0a1a0a"}}>
                <span style={{flex:1,fontSize:"8px",color:"#88aa88"}}>{a.name}</span>
                <span style={{fontSize:"7px",color:"#4a6a4a"}}>CMC{a.cmc}</span>
                <span style={{fontSize:"8px",fontWeight:"700",color:a._score>(card.sc?.pts||0)?"#22c55e":"#f59e0b"}}>{a._score}pts</span>
                <button onClick={e=>{e.stopPropagation();addDirect(a);}} style={{fontSize:"6px",padding:"1px 3px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"2px",color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>):<div style={{fontSize:"8px",color:"#2a4a2a"}}>Aucune alternative trouvée</div>}
            </div>}
          </div>})()}
        </div>}
      </div>;
    })}
  </div>}

  {/* ===== BRACKET TAB ===== */}
  {tab==="bracket"&&<div>
    <div style={{background:`linear-gradient(135deg,#080c18,#0a1020)`,border:`2px solid ${bracket.c}40`,borderRadius:"8px",padding:"14px",textAlign:"center",marginBottom:"8px"}}>
      <div style={{fontSize:"36px",fontWeight:"800",color:"#f59e0b"}}>{result.pr}</div>
      <div style={{height:"4px",background:"#0c1428",borderRadius:"2px",overflow:"hidden",margin:"4px auto",maxWidth:"200px"}}><div style={{width:`${Math.min(100,result.pr/10)}%`,height:"100%",background:"linear-gradient(90deg,#22c55e,#f59e0b,#ef4444)",borderRadius:"2px"}}/></div>
      <div style={{fontSize:"18px",fontWeight:"700",color:bracket.c}}>Bracket {bracket.n} — {bracket.name}</div>
      <div style={{fontSize:"9px",color:"#4a5a6a"}}>{bracket.d}</div>
    </div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"8px"}}>
      {(deck.length>=80?[{n:1,nm:"Exhibition",r:"0-150",c:"#22c55e"},{n:2,nm:"Core",r:"151-300",c:"#3b82f6"},{n:3,nm:"Upgraded",r:"301-500",c:"#f59e0b"},{n:4,nm:"Optimized",r:"501-700",c:"#ef4444"},{n:5,nm:"cEDH",r:"701+",c:"#dc2626"}]:[{n:1,nm:"Casual",r:"0-100",c:"#22c55e"},{n:2,nm:"FNM",r:"101-220",c:"#3b82f6"},{n:3,nm:"Competitive",r:"221-380",c:"#f59e0b"},{n:4,nm:"Pro",r:"381-550",c:"#ef4444"},{n:5,nm:"Elite",r:"551+",c:"#dc2626"}]).map(b=>
        <div key={b.n} style={{display:"flex",alignItems:"center",gap:"5px",padding:"2px 0",opacity:b.n===bracket.n?1:.3}}>
          <span style={{fontSize:"13px",fontWeight:"700",color:b.c,width:"16px"}}>{b.n}</span>
          <span style={{fontSize:"9px",color:"#e0e8f0",flex:1,fontWeight:b.n===bracket.n?"700":"400"}}>{b.nm}</span>
          <span style={{fontSize:"7px",color:"#3a4a5a"}}>{b.r}</span>
          {b.n===bracket.n&&<span style={{fontSize:"6px",color:b.c,background:b.c+"20",padding:"1px 3px",borderRadius:"2px"}}>◀</span>}
        </div>
      )}
    </div>
  </div>}

  {/* ===== MATCHUP TAB ===== */}
  {tab==="matchup"&&<div>
    {deck.length===0?<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"10px"}}>Crée ou importe un deck.</div>:<>
    <div style={{display:"flex",gap:"3px",marginBottom:"6px"}}>
      {matchup.profiles.map((p,i)=><div key={i} style={{flex:1,background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px",textAlign:"center"}}>
        <div style={{fontSize:"11px",fontWeight:"700",color:p.color}}>{p.value}</div>
        <div style={{fontSize:"7px",color:"#4a5a6a"}}>{p.label}</div>
      </div>)}
    </div>
    <div style={{background:"#081008",border:"1px solid #1a3a1a",borderRadius:"4px",padding:"8px",marginBottom:"4px"}}>
      <div style={{fontSize:"8px",color:"#22c55e",marginBottom:"3px"}}>💪 FORCES</div>
      {matchup.strengths.map((s,i)=><div key={i} style={{fontSize:"8px",color:"#88aa88",padding:"1px 0"}}>✓ {s}</div>)}
    </div>
    <div style={{background:"#100808",border:"1px solid #3a1a1a",borderRadius:"4px",padding:"8px",marginBottom:"6px"}}>
      <div style={{fontSize:"8px",color:"#ef4444",marginBottom:"3px"}}>⚠️ FAIBLESSES</div>
      {matchup.weaknesses.map((s,i)=><div key={i} style={{fontSize:"8px",color:"#aa8888",padding:"1px 0"}}>✗ {s}</div>)}
    </div>
    {/* WEAKEST CARDS */}
    <div style={{background:"#0c0808",border:"1px solid #2a1515",borderRadius:"5px",padding:"8px"}}>
      <div style={{fontSize:"8px",color:"#ef4444",fontWeight:"700",marginBottom:"6px"}}>🔻 CARTES LES PLUS FAIBLES (à remplacer en priorité)</div>
      {weakCards.map((card,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"4px",padding:"4px 0",borderBottom:"1px solid #1a0a0a"}}>
        <span style={{fontSize:"9px",color:"#aa8888",flex:1}}>{card.qty}× {card.name}</span>
        <span style={{fontSize:"9px",fontWeight:"700",color:"#ef4444"}}>{card.final}pts</span>
        <button onClick={()=>{findAlts(card);}} style={{fontSize:"7px",padding:"2px 5px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"2px",color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}>🔄</button>
      </div>)}
      {altCard&&<div style={{marginTop:"6px",paddingTop:"6px",borderTop:"1px solid #2a1515"}}>
        <div style={{fontSize:"8px",color:"#22c55e",marginBottom:"4px"}}>Alternatives pour <b>{altCard.name}</b> :</div>
        {altLoading?<div style={{fontSize:"8px",color:"#2a4a2a"}}>Recherche...</div>:
        altResults.map((a,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:"3px",padding:"2px 0"}}>
          <span style={{flex:1,fontSize:"8px",color:"#88aa88"}}>{a.name}</span>
          <span style={{fontSize:"7px",color:"#4a6a4a"}}>CMC{a.cmc}</span>
          <span style={{fontSize:"8px",fontWeight:"700",color:a._score>(altCard.sc?.pts||0)?"#22c55e":"#f59e0b"}}>{a._score}pts</span>
          <button onClick={()=>addDirect(a)} style={{fontSize:"6px",padding:"1px 3px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"2px",color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}>+</button>
        </div>)}
      </div>}
    </div>
    </>}
  </div>}

  {/* ===== ANALYTICS TAB ===== */}
  {tab==="analytics"&&<div>
    {deck.length===0?<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"10px"}}>Crée un deck.</div>:<>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"8px",marginBottom:"6px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><span style={{fontSize:"7px",color:"#4a6a8a"}}>GLOBAL</span><span style={{fontSize:"18px",fontWeight:"700",color:analytics.m.global>=70?"#22c55e":analytics.m.global>=50?"#f59e0b":"#ef4444"}}>{analytics.m.global}<span style={{fontSize:"7px",color:"#2a3a50"}}>/100</span></span></div>
      {[{k:"curve",l:"Courbe",d:analytics.avg},{k:"ca",l:"Pioche",d:analytics.ds},{k:"interaction",l:"Interact",d:analytics.rm},{k:"mana",l:"Mana",d:analytics.la},{k:"ramp",l:"Ramp",d:analytics.rp},{k:"resilience",l:"Résil",d:analytics.rc}].map(m=>
        <div key={m.k} style={{marginBottom:"2px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"7px"}}><span style={{color:"#6a7a8a"}}>{m.l} ({m.d})</span><span style={{color:analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444",fontWeight:"600"}}>{analytics.m[m.k]}</span></div><B v={analytics.m[m.k]} color={analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444"}/></div>
      )}
    </div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"6px",marginBottom:"4px"}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:"2px",height:"35px"}}>
        {[0,1,2,3,4,5,6,7].map(c=>{const v=analytics.curve[c]||0;const mx=Math.max(...Object.values(analytics.curve),1);return<div key={c} style={{flex:1,textAlign:"center"}}>{v>0&&<div style={{fontSize:"6px",color:"#3b82f6"}}>{v}</div>}<div style={{height:`${(v/mx)*25}px`,background:"#3b82f6",borderRadius:"1px 1px 0 0",minHeight:v?"2px":"0"}}/><div style={{fontSize:"5px",color:"#2a3a50"}}>{c===7?"7+":c}</div></div>;})}
      </div>
    </div>
    <button onClick={()=>setSimR(simHands(deck,2000))} disabled={deck.length<7} style={{width:"100%",padding:"4px",background:"#1a3a6a",border:"none",borderRadius:"3px",color:"#e8f0ff",fontSize:"8px",cursor:"pointer",fontFamily:"inherit",marginBottom:"4px"}}>🎲 Sim 2000 mains</button>
    {simR&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",padding:"5px"}}>
      {[{l:"Jouables",v:`${simR.play}%`},{l:"1-drop T1",v:`${simR.t1}%`},{l:"Mulligan",v:`${simR.mull}%`},{l:"Lands moy",v:simR.avgL}].map((r,i)=>
        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"7px",padding:"1px 0"}}><span style={{color:"#6a7a8a"}}>{r.l}</span><span style={{color:"#22c55e"}}>{r.v}</span></div>
      )}
    </div>}
    </>}
  </div>}

  {/* ===== COMBOS TAB ===== */}
  {tab==="combos"&&<div>
    {allCombos.length===0&&<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"10px"}}>Aucun combo.</div>}
    {allCombos.map((co,i)=><div key={i} style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",padding:"6px",marginBottom:"2px",borderLeft:`3px solid ${TC[co.tier]}`}}>
      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"10px",fontWeight:"600",color:"#e0e8f0"}}>{co.name} <span style={{fontSize:"7px",color:TC[co.tier]}}>T{co.tier}</span></span><span style={{fontSize:"11px",fontWeight:"700",color:TC[co.tier]}}>×{co.mult}</span></div>
      <div style={{fontSize:"7px",color:"#3a4a5a"}}>{co.cards.join(" + ")}</div>
    </div>)}
  </div>}

</div>
</div>);
}
