import{useState,useCallback,useMemo,useRef,useEffect}from"react";
import{searchCards,fetchCard,fetchCardList,parseDecklistText,searchForDeckBuilder,searchAlternatives}from"./scryfall.js";
import{scoreFullDeck,analyzeDeck,simHands,detectCombos,getTags,getBracket,getMatchupProfile,detectArchetype,scoreCard,COMBOS,GAME_CHANGERS,CC,TC,CAT_ORDER,CAT_ICONS,CAT_CLR,getCategory}from"./engine.js";

const FORMATS=[{id:"standard",l:"Standard"},{id:"modern",l:"Modern"},{id:"pioneer",l:"Pioneer"},{id:"legacy",l:"Legacy"},{id:"commander",l:"Commander"},{id:"vintage",l:"Vintage"},{id:"pauper",l:"Pauper"},{id:"",l:"Casual (any)"}];
const COLORS=[{id:"W",l:"Blanc",c:"#f5f0e0"},{id:"U",l:"Bleu",c:"#0e68ab"},{id:"B",l:"Noir",c:"#2a2a2a"},{id:"R",l:"Rouge",c:"#d32029"},{id:"G",l:"Vert",c:"#00733e"}];
const SLOTS=[{id:"creatures",q:"t:creature",l:"👤 Créatures",need:c=>c<(d=>d>=80?30:20)},{id:"removal",q:"(o:destroy+o:target OR o:exile+o:target OR o:counter+o:target+o:spell)",l:"💀 Removal"},{id:"draw",q:"o:draw+o:card",l:"📖 Pioche"},{id:"ramp",q:"(o:add+o:mana OR o:treasure OR t:land+o:search)",l:"💎 Ramp"},{id:"enchantments",q:"t:enchantment",l:"✨ Enchantements"},{id:"artifacts",q:"t:artifact",l:"⚙️ Artefacts"},{id:"instants",q:"t:instant",l:"💨 Instants"},{id:"sorceries",q:"t:sorcery",l:"🔮 Sorceries"},{id:"planeswalkers",q:"t:planeswalker",l:"⚡ Planeswalkers"}];

export default function App(){
const[deck,setDeck]=useState([]);
const[cmdN,setCmdN]=useState("");const[cmdO,setCmdO]=useState("");
const[search,setSearch]=useState("");const[sugg,setSugg]=useState([]);
const[loading,setLoading]=useState(false);const[loadMsg,setLoadMsg]=useState("");const[loadProg,setLoadProg]=useState(0);
const[impTxt,setImpTxt]=useState("");const[impOpen,setImpOpen]=useState(false);
const[sel,setSel]=useState(null);const[tab,setTab]=useState("deck");
const[simR,setSimR]=useState(null);const[collapsCat,setCollapsCat]=useState({});
// Builder state
const[bFmt,setBFmt]=useState("standard");
const[bColors,setBColors]=useState(["B","R"]);
const[bSlot,setBSlot]=useState("creatures");
const[bResults,setBResults]=useState([]);
const[bLoading,setBLoading]=useState(false);const[bProg,setBProg]=useState({cur:0,total:0});
// Alternatives
const[altCard,setAltCard]=useState(null);const[altResults,setAltResults]=useState([]);const[altLoading,setAltLoading]=useState(false);
const db=useRef(null);

const doSearch=useCallback(q=>{setSearch(q);if(q.length<2){setSugg([]);return;}clearTimeout(db.current);db.current=setTimeout(async()=>{setSugg((await searchCards(q)).slice(0,8));},250);},[]);
const addCard=useCallback(async name=>{setLoading(true);setLoadMsg(`Chargement: ${name}`);const c=await fetchCard(name);if(c)setDeck(p=>[...p,{...c,qty:1}]);setSearch("");setSugg([]);setLoading(false);setLoadMsg("");},[]);
const addCardDirect=useCallback(card=>{setDeck(p=>[...p,{...card,qty:1}]);},[]);
const rmCard=useCallback(name=>{const i=deck.findIndex(c=>c.name.toLowerCase()===name.toLowerCase());if(i>=0)setDeck(p=>p.filter((_,j)=>j!==i));},[deck]);
const rmAllOf=useCallback(name=>{setDeck(p=>p.filter(c=>c.name.toLowerCase()!==name.toLowerCase()));},[]);

const handleImport=useCallback(async()=>{
  if(!impTxt.trim())return;setLoading(true);setLoadMsg("Analyse de la decklist...");setLoadProg(10);
  const{mainboard,sideboard}=parseDecklistText(impTxt);
  const all=[...mainboard,...sideboard];setLoadMsg(`Récupération de ${all.length} cartes via Scryfall...`);setLoadProg(30);
  const fetched=await fetchCardList(all.map(e=>e.name));setLoadProg(80);
  const nd=[];for(const e of all){const c=fetched.find(f=>f.name.toLowerCase()===e.name.toLowerCase());if(c)for(let i=0;i<e.qty;i++)nd.push({...c,qty:1});}
  setDeck(nd);setImpOpen(false);setImpTxt("");setLoading(false);setLoadMsg("");setLoadProg(100);
},[impTxt]);

useEffect(()=>{if(deck.length>0&&!cmdN){const leg=deck.find(c=>c.type?.includes("Legendary")&&/creature|planeswalker/i.test(c.type||""));if(leg){setCmdN(leg.name);setCmdO(leg.oracle||"");}}},[deck,cmdN]);

// DECK BUILDER: search cards for a slot
const builderSearch=useCallback(async()=>{
  const slot=SLOTS.find(s=>s.id===bSlot);if(!slot)return;
  setBLoading(true);setBResults([]);setBProg({cur:0,total:0});
  const colorQ=bColors.length>0?` c:${bColors.join("")}`:"";
  const fmtQ=bFmt?` f:${bFmt}`:"";
  const query=`${slot.q}${fmtQ}${colorQ}`;
  const cards=await searchForDeckBuilder(query,(cur,total)=>setBProg({cur,total}));
  // Score each card in context of current deck
  const scored=cards.map(c=>{const s=scoreCard(c.oracle||"",c.cmc||0);return{...c,builderScore:s.pts,s};}).sort((a,b)=>b.builderScore-a.builderScore);
  setBResults(scored);setBLoading(false);
},[bFmt,bColors,bSlot,deck]);

// ALTERNATIVES: find better cards for a specific slot
const findAlternatives=useCallback(async(card)=>{
  setAltCard(card);setAltLoading(true);setAltResults([]);
  const alts=await searchAlternatives(card,bFmt,bColors);
  const scored=alts.map(c=>{const s=scoreCard(c.oracle||"",c.cmc||0);return{...c,builderScore:s.pts,s};}).sort((a,b)=>b.builderScore-a.builderScore);
  setAltResults(scored);setAltLoading(false);
},[bFmt,bColors]);

const result=useMemo(()=>scoreFullDeck(deck,cmdO),[deck,cmdO]);
const analytics=useMemo(()=>analyzeDeck(deck,result.scored),[deck,result]);
const bracket=useMemo(()=>getBracket(result.pr,deck.length),[result.pr,deck.length]);
const matchup=useMemo(()=>getMatchupProfile(analytics,result.arch,bracket),[analytics,result.arch,bracket]);
const allCombos=useMemo(()=>detectCombos(deck.map(c=>c.name)),[deck]);
const totalPrice=deck.reduce((s,c)=>s+(parseFloat(c.prices?.eur)||0),0);
const uniqueCards=result.grouped||[];
const catGroups=useMemo(()=>{const g={};for(const c of uniqueCards){const cat=c.category||getCategory(c.type);if(!g[cat])g[cat]=[];g[cat].push(c);}for(const k of Object.keys(g))g[k].sort((a,b)=>b.final-a.final);return g;},[uniqueCards]);
const toggleCat=cat=>setCollapsCat(p=>({...p,[cat]:!p[cat]}));

const B=({v,color})=><div style={{height:"3px",bg:"#0c1428",borderRadius:"2px",overflow:"hidden",marginTop:"2px",background:"#0c1428"}}><div style={{width:`${Math.min(100,v)}%`,height:"100%",borderRadius:"2px",background:color||"#3b82f6"}}/></div>;

return(<div style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",background:"#060810",color:"#c0c8d8",minHeight:"100vh"}}>

{/* LOADING OVERLAY */}
{loading&&<div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(6,8,16,0.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
  <div style={{fontSize:"14px",color:"#3b82f6",marginBottom:"12px"}}>{loadMsg||"Chargement..."}</div>
  <div style={{width:"200px",height:"4px",background:"#141e30",borderRadius:"2px",overflow:"hidden"}}>
    <div style={{width:`${loadProg}%`,height:"100%",background:"#3b82f6",borderRadius:"2px",transition:"width 0.3s"}}/>
  </div>
  <div style={{fontSize:"10px",color:"#2a3a50",marginTop:"6px"}}>{loadProg}%</div>
</div>}

{/* HEADER */}
<div style={{background:"linear-gradient(135deg,#080c18,#0c1428,#080c18)",padding:"12px",borderBottom:"1px solid #141e30"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <div style={{display:"flex",alignItems:"baseline",gap:"3px"}}>
      <span style={{fontSize:"17px",fontWeight:"800",color:"#e8f0ff"}}>aeon</span>
      <span style={{fontSize:"17px",color:"#f59e0b"}}>_</span>
      <span style={{fontSize:"17px",fontWeight:"800",color:"#3b82f6"}}>scorer</span>
      <span style={{fontSize:"9px",color:"#22c55e",marginLeft:"3px"}}>v9</span>
    </div>
    <div style={{display:"flex",gap:"4px"}}>
      <button onClick={()=>setImpOpen(!impOpen)} style={{padding:"4px 8px",background:impOpen?"#1a2a44":"#0c1428",border:"1px solid #1a2a44",borderRadius:"3px",color:"#3b82f6",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>{impOpen?"✕":"📋 Import"}</button>
      <button onClick={()=>{setDeck([]);setSel(null);setCmdN("");setCmdO("");setAltCard(null);}} style={{padding:"4px 8px",background:"#0c1428",border:"1px solid #2a1a30",borderRadius:"3px",color:"#6a4a5a",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>🗑️</button>
    </div>
  </div>
</div>

{/* IMPORT */}
{impOpen&&<div style={{background:"#0a1020",borderBottom:"1px solid #141e30",padding:"8px"}}>
  <textarea value={impTxt} onChange={e=>setImpTxt(e.target.value)} rows={5} placeholder={"4 Lightning Bolt\n4 Counterspell\n24 Island\n\nSideboard:\n2 Negate"} style={{width:"100%",padding:"6px",background:"#060810",border:"1px solid #1a2a44",borderRadius:"3px",color:"#c0c8d8",fontSize:"10px",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
  <button onClick={handleImport} disabled={loading} style={{marginTop:"4px",padding:"6px 14px",background:"#1a3a6a",border:"none",borderRadius:"3px",color:"#e8f0ff",fontSize:"10px",cursor:"pointer",fontFamily:"inherit"}}>⚡ Importer</button>
</div>}

{/* TABS */}
<div style={{display:"flex",background:"#080c14",borderBottom:"1px solid #101828",overflowX:"auto"}}>
  {[{id:"deck",l:`Deck (${deck.length})`},{id:"builder",l:"🔨 Builder"},{id:"bracket",l:`B${bracket.n}`},{id:"matchup",l:"Matchup"},{id:"analytics",l:"Analyse"},{id:"combos",l:`Combos`}].map(t=>
    <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 2px",border:"none",cursor:"pointer",background:tab===t.id?"#0c1020":"transparent",color:tab===t.id?"#3b82f6":"#2a3a50",fontSize:"9px",fontWeight:tab===t.id?"700":"400",borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap"}}>{t.l}</button>
  )}
</div>

<div style={{padding:"10px",maxWidth:"720px",margin:"0 auto"}}>
  {/* BRACKET + CMD + STATS */}
  <div style={{display:"flex",gap:"4px",marginBottom:"5px"}}>
    <div style={{flex:"0 0 60px",background:`linear-gradient(135deg,#080c18,#0a1020)`,border:`2px solid ${bracket.c}40`,borderRadius:"6px",padding:"6px",textAlign:"center"}}>
      <div style={{fontSize:"22px",fontWeight:"800",color:bracket.c}}>{bracket.n}</div>
      <div style={{fontSize:"7px",color:bracket.c}}>{bracket.name}</div>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:"2px"}}>
      <div style={{display:"flex",gap:"4px"}}>
        <input value={cmdN} onChange={e=>setCmdN(e.target.value)} placeholder="⚔️ Commandant" style={{flex:1,padding:"3px 5px",background:"#080c18",border:"1px solid #141e30",borderRadius:"2px",color:"#e8f0ff",fontSize:"8px",fontFamily:"inherit"}}/>
        <button onClick={async()=>{if(cmdN){const c=await fetchCard(cmdN);if(c)setCmdO(c.oracle);}}} style={{padding:"3px 5px",background:"#0c1428",border:"1px solid #1a2a44",borderRadius:"2px",color:"#4a6a8a",fontSize:"7px",cursor:"pointer",fontFamily:"inherit"}}>↻</button>
      </div>
      <div style={{display:"flex",gap:"2px"}}>
        {[{l:"PWR",v:result.pr,c:"#f59e0b"},{l:"ARCH",v:result.arch?.slice(0,4),c:"#8b5cf6"},{l:"SPD",v:`×${result.spd}`,c:"#3b82f6"},{l:"CMC",v:result.avg,c:"#06b6d4"},{l:"€",v:totalPrice>0?Math.round(totalPrice):"—",c:"#22c55e"}].map(s=>
          <div key={s.l} style={{flex:1,background:"#080c18",border:"1px solid #101828",borderRadius:"2px",padding:"2px",textAlign:"center"}}>
            <div style={{fontSize:"10px",fontWeight:"600",color:s.c}}>{s.v}</div>
            <div style={{fontSize:"5px",color:"#2a3a50"}}>{s.l}</div>
          </div>
        )}
      </div>
    </div>
  </div>

  {/* SEARCH */}
  <div style={{position:"relative",marginBottom:"6px"}}>
    <input value={search} onChange={e=>doSearch(e.target.value)} placeholder="🔍 Ajouter une carte..." style={{width:"100%",padding:"6px 8px",background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",color:"#e8f0ff",fontSize:"10px",fontFamily:"inherit",boxSizing:"border-box"}}/>
    {sugg.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#0c1020",border:"1px solid #141e30",borderRadius:"0 0 4px 4px",maxHeight:"150px",overflowY:"auto"}}>
      {sugg.map((n,i)=><div key={i} onClick={()=>addCard(n)} style={{padding:"4px 8px",cursor:"pointer",borderBottom:"1px solid #101828",fontSize:"10px",color:"#c0c8d8"}} onMouseOver={e=>e.currentTarget.style.background="#101828"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{n}</div>)}
    </div>}
  </div>

  {/* ===== DECK TAB ===== */}
  {tab==="deck"&&<div>
    {uniqueCards.length===0&&<div style={{textAlign:"center",padding:"24px",color:"#1a2a40",fontSize:"10px"}}>📋 Importe une decklist ou utilise le Builder pour créer un deck.</div>}
    {CAT_ORDER.map(cat=>{const cards=catGroups[cat];if(!cards?.length)return null;const qty=cards.reduce((s,c)=>s+c.qty,0);const col=collapsCat[cat];
      return<div key={cat} style={{marginBottom:"4px"}}>
        <div onClick={()=>toggleCat(cat)} style={{display:"flex",alignItems:"center",gap:"5px",padding:"4px 6px",background:"#0a0e18",border:"1px solid #141e30",borderRadius:"3px",cursor:"pointer"}}>
          <span style={{fontSize:"10px"}}>{CAT_ICONS[cat]}</span>
          <span style={{fontSize:"9px",fontWeight:"700",color:CAT_CLR[cat],flex:1}}>{cat}</span>
          <span style={{fontSize:"9px",color:"#4a6a8a"}}>{qty}</span>
          <span style={{fontSize:"7px",color:"#2a3a50"}}>{col?"▸":"▾"}</span>
        </div>
        {!col&&<div style={{borderLeft:`2px solid ${(CAT_CLR[cat]||"#333")}30`,marginLeft:"4px",paddingLeft:"4px",marginTop:"1px"}}>
          {cards.map((card,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"4px",padding:"3px 4px",background:sel===card.name?"#0c1020":"transparent",borderRadius:"2px",cursor:"pointer"}} onClick={()=>setSel(sel===card.name?null:card.name)}>
            <span style={{fontSize:"9px",fontWeight:"700",color:CAT_CLR[cat],width:"20px",textAlign:"center"}}>{card.qty}×</span>
            <span style={{flex:1,fontSize:"9px",color:"#dde4ee",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card.name}</span>
            {card.gc&&<span style={{fontSize:"5px",color:"#f59e0b",background:"#1a1508",padding:"0 2px",borderRadius:"1px"}}>GC</span>}
            {card.coM>1&&<span style={{fontSize:"5px",color:"#ef4444",background:"#150808",padding:"0 2px",borderRadius:"1px"}}>×{card.coM}</span>}
            <span style={{fontSize:"12px",fontWeight:"700",color:card.final>=10?"#ef4444":card.final>=4?"#f59e0b":"#22c55e"}}>{card.final*card.qty}</span>
          </div>)}
          {sel&&cards.some(c=>c.name===sel)&&(()=>{const card=cards.find(c=>c.name===sel);if(!card)return null;return<div style={{padding:"6px",background:"#0a0e18",borderRadius:"3px",margin:"2px 0"}}>
            {card.imgSmall&&<img src={card.imgSmall} alt="" style={{width:"60px",borderRadius:"3px",float:"right",margin:"0 0 4px 6px"}}/>}
            <div style={{fontSize:"7px",color:"#3a4a5a",lineHeight:1.3}}>{card.oracle}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"2px",margin:"3px 0"}}>
              {card.sc?.dets?.map((d,j)=><span key={j} style={{fontSize:"5px",padding:"0 2px",borderRadius:"1px",background:(CC[d.cat]||"#666")+"18",color:CC[d.cat]||"#666"}}>{d.label} +{d.score}</span>)}
            </div>
            <div style={{display:"flex",gap:"3px",marginTop:"3px"}}>
              <button onClick={e=>{e.stopPropagation();rmCard(card.name);}} style={{fontSize:"7px",padding:"2px 5px",background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:"2px",color:"#ef4444",cursor:"pointer",fontFamily:"inherit"}}>-1</button>
              <button onClick={e=>{e.stopPropagation();rmAllOf(card.name);}} style={{fontSize:"7px",padding:"2px 5px",background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:"2px",color:"#8a4444",cursor:"pointer",fontFamily:"inherit"}}>Tout</button>
              <button onClick={e=>{e.stopPropagation();findAlternatives(card);setTab("builder");}} style={{fontSize:"7px",padding:"2px 5px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"2px",color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}>🔄 Alternatives</button>
            </div>
          </div>})()}
        </div>}
      </div>;
    })}
  </div>}

  {/* ===== BUILDER TAB ===== */}
  {tab==="builder"&&<div>
    {/* Format + Colors */}
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"8px",marginBottom:"6px"}}>
      <div style={{fontSize:"8px",color:"#4a6a8a",marginBottom:"4px"}}>FORMAT</div>
      <div style={{display:"flex",gap:"2px",flexWrap:"wrap",marginBottom:"6px"}}>
        {FORMATS.map(f=><button key={f.id} onClick={()=>setBFmt(f.id)} style={{padding:"3px 6px",background:bFmt===f.id?"#1a2a44":"#0c1428",border:`1px solid ${bFmt===f.id?"#3b82f6":"#141e30"}`,borderRadius:"2px",color:bFmt===f.id?"#3b82f6":"#4a5a6a",fontSize:"8px",cursor:"pointer",fontFamily:"inherit"}}>{f.l}</button>)}
      </div>
      <div style={{fontSize:"8px",color:"#4a6a8a",marginBottom:"4px"}}>COULEURS</div>
      <div style={{display:"flex",gap:"3px",marginBottom:"4px"}}>
        {COLORS.map(c=><button key={c.id} onClick={()=>setBColors(p=>p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])} style={{width:"28px",height:"22px",borderRadius:"3px",border:`2px solid ${bColors.includes(c.id)?c.c:"#1a2a44"}`,background:bColors.includes(c.id)?c.c+"30":"#0c1428",color:bColors.includes(c.id)?c.c:"#3a4a5a",fontSize:"10px",cursor:"pointer",fontFamily:"inherit",fontWeight:"700"}}>{c.id}</button>)}
      </div>
    </div>

    {/* Slot selection */}
    <div style={{display:"flex",gap:"2px",flexWrap:"wrap",marginBottom:"6px"}}>
      {SLOTS.map(s=><button key={s.id} onClick={()=>{setBSlot(s.id);}} style={{padding:"3px 6px",background:bSlot===s.id?"#1a2a44":"#0c1428",border:`1px solid ${bSlot===s.id?"#3b82f6":"#141e30"}`,borderRadius:"2px",color:bSlot===s.id?"#3b82f6":"#4a5a6a",fontSize:"7px",cursor:"pointer",fontFamily:"inherit"}}>{s.l}</button>)}
    </div>

    <button onClick={builderSearch} disabled={bLoading} style={{width:"100%",padding:"8px",background:"#1a3a6a",border:"none",borderRadius:"4px",color:"#e8f0ff",fontSize:"11px",cursor:"pointer",fontFamily:"inherit",marginBottom:"8px",opacity:bLoading?.5:1}}>
      {bLoading?`Recherche Scryfall... ${bProg.cur}/${bProg.total}`:`🔍 Chercher les meilleures ${SLOTS.find(s=>s.id===bSlot)?.l||"cartes"}`}
    </button>

    {bLoading&&<div style={{marginBottom:"8px"}}>
      <div style={{height:"4px",background:"#0c1428",borderRadius:"2px",overflow:"hidden"}}>
        <div style={{width:`${bProg.total?Math.round(bProg.cur/bProg.total*100):20}%`,height:"100%",background:"#3b82f6",borderRadius:"2px",transition:"width 0.3s"}}/>
      </div>
      <div style={{fontSize:"8px",color:"#2a3a50",marginTop:"2px"}}>Chargement et scoring de {bProg.cur} cartes... {bProg.total?`(${Math.round(bProg.cur/bProg.total*100)}%)`:""}</div>
    </div>}

    {/* Alternatives header */}
    {altCard&&<div style={{background:"#081008",border:"1px solid #1a3a1a",borderRadius:"4px",padding:"6px",marginBottom:"6px"}}>
      <div style={{fontSize:"8px",color:"#22c55e"}}>🔄 Alternatives pour : <b>{altCard.name}</b> (CMC {altCard.cmc})</div>
      {altLoading&&<div style={{fontSize:"8px",color:"#2a4a2a",marginTop:"3px"}}>Recherche en cours...</div>}
      {!altLoading&&altResults.length>0&&<div style={{marginTop:"4px"}}>
        {altResults.slice(0,6).map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"4px",padding:"3px 0",borderBottom:"1px solid #0a1a0a"}}>
          <span style={{fontSize:"9px",color:"#88aa88",flex:1}}>{c.name}</span>
          <span style={{fontSize:"7px",color:"#4a6a4a"}}>CMC {c.cmc}</span>
          <span style={{fontSize:"9px",fontWeight:"700",color:c.builderScore>=(altCard.sc?.pts||0)?"#22c55e":"#f59e0b"}}>{c.builderScore}pts</span>
          <button onClick={()=>addCardDirect(c)} style={{fontSize:"7px",padding:"1px 4px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"2px",color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}>+</button>
        </div>)}
      </div>}
      <button onClick={()=>{setAltCard(null);setAltResults([]);}} style={{fontSize:"7px",padding:"2px 6px",background:"#081008",border:"1px solid #1a3a1a",borderRadius:"2px",color:"#4a6a4a",cursor:"pointer",fontFamily:"inherit",marginTop:"4px"}}>✕ Fermer</button>
    </div>}

    {/* Results */}
    {bResults.length>0&&<div>
      <div style={{fontSize:"8px",color:"#4a6a8a",marginBottom:"4px"}}>{bResults.length} cartes trouvées — triées par score</div>
      {bResults.slice(0,30).map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"5px",padding:"4px 5px",background:i%2===0?"#080c18":"transparent",borderRadius:"2px"}}>
        {c.imgSmall&&<img src={c.imgSmall} alt="" style={{width:"30px",height:"42px",borderRadius:"2px",objectFit:"cover"}}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"9px",fontWeight:"600",color:"#dde4ee",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
          <div style={{fontSize:"7px",color:"#3a4a5a"}}>{c.type?.split("—")[0]} • CMC {c.cmc}{c.prices?.eur?` • ${c.prices.eur}€`:""}</div>
        </div>
        <span style={{fontSize:"13px",fontWeight:"700",color:c.builderScore>=10?"#ef4444":c.builderScore>=5?"#f59e0b":"#22c55e"}}>{c.builderScore}</span>
        <button onClick={()=>addCardDirect(c)} style={{padding:"3px 8px",background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:"3px",color:"#22c55e",fontSize:"9px",cursor:"pointer",fontFamily:"inherit"}}>+</button>
      </div>)}
    </div>}
    {bResults.length===0&&!bLoading&&<div style={{textAlign:"center",padding:"20px",color:"#1a2a40",fontSize:"9px"}}>Choisis un format, des couleurs, un type de carte, puis clique Chercher.</div>}
  </div>}

  {/* ===== BRACKET TAB ===== */}
  {tab==="bracket"&&<div>
    <div style={{background:`linear-gradient(135deg,#080c18,#0a1020)`,border:`2px solid ${bracket.c}40`,borderRadius:"8px",padding:"14px",textAlign:"center",marginBottom:"8px"}}>
      <div style={{fontSize:"7px",color:"#4a6a8a",textTransform:"uppercase",letterSpacing:"2px"}}>Power Rating</div>
      <div style={{fontSize:"38px",fontWeight:"800",color:"#f59e0b"}}>{result.pr}</div>
      <div style={{height:"4px",background:"#0c1428",borderRadius:"2px",overflow:"hidden",margin:"4px auto",maxWidth:"200px"}}><div style={{width:`${Math.min(100,result.pr/10)}%`,height:"100%",background:"linear-gradient(90deg,#22c55e,#f59e0b,#ef4444)",borderRadius:"2px"}}/></div>
      <div style={{fontSize:"18px",fontWeight:"700",color:bracket.c,marginTop:"4px"}}>Bracket {bracket.n} — {bracket.name}</div>
    </div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"8px"}}>
      {(deck.length>=80?[{n:1,name:"Exhibition",r:"0-150",c:"#22c55e"},{n:2,name:"Core",r:"151-300",c:"#3b82f6"},{n:3,name:"Upgraded",r:"301-500",c:"#f59e0b"},{n:4,name:"Optimized",r:"501-700",c:"#ef4444"},{n:5,name:"cEDH",r:"701+",c:"#dc2626"}]:[{n:1,name:"Casual",r:"0-100",c:"#22c55e"},{n:2,name:"FNM",r:"101-220",c:"#3b82f6"},{n:3,name:"Competitive",r:"221-380",c:"#f59e0b"},{n:4,name:"Pro",r:"381-550",c:"#ef4444"},{n:5,name:"Elite",r:"551+",c:"#dc2626"}]).map(b=>
        <div key={b.n} style={{display:"flex",alignItems:"center",gap:"5px",padding:"2px 0",opacity:b.n===bracket.n?1:.35}}>
          <span style={{fontSize:"13px",fontWeight:"700",color:b.c,width:"16px"}}>{b.n}</span>
          <span style={{fontSize:"9px",color:b.n===bracket.n?"#e0e8f0":"#4a5a6a",flex:1}}>{b.name}</span>
          <span style={{fontSize:"7px",color:"#3a4a5a"}}>{b.r}</span>
          {b.n===bracket.n&&<span style={{fontSize:"6px",color:b.c,background:b.c+"20",padding:"1px 3px",borderRadius:"2px"}}>◀</span>}
        </div>
      )}
    </div>
  </div>}

  {/* ===== MATCHUP TAB ===== */}
  {tab==="matchup"&&<div>
    {deck.length===0?<div style={{textAlign:"center",padding:"24px",color:"#1a2a40",fontSize:"10px"}}>Importe un deck.</div>:<>
    <div style={{display:"flex",gap:"4px",marginBottom:"6px"}}>
      {matchup.profiles.map((p,i)=><div key={i} style={{flex:1,background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px",textAlign:"center"}}>
        <div style={{fontSize:"12px",fontWeight:"700",color:p.color}}>{p.value}</div>
        <div style={{fontSize:"7px",color:"#4a5a6a"}}>{p.label}</div>
      </div>)}
    </div>
    <div style={{background:"#081008",border:"1px solid #1a3a1a",borderRadius:"4px",padding:"8px",marginBottom:"4px"}}>
      <div style={{fontSize:"8px",color:"#22c55e",marginBottom:"4px"}}>💪 FORCES</div>
      {matchup.strengths.map((s,i)=><div key={i} style={{fontSize:"9px",color:"#88aa88",padding:"1px 0"}}>✓ {s}</div>)}
    </div>
    <div style={{background:"#100808",border:"1px solid #3a1a1a",borderRadius:"4px",padding:"8px",marginBottom:"4px"}}>
      <div style={{fontSize:"8px",color:"#ef4444",marginBottom:"4px"}}>⚠️ FAIBLESSES</div>
      {matchup.weaknesses.map((s,i)=><div key={i} style={{fontSize:"9px",color:"#aa8888",padding:"1px 0"}}>✗ {s}</div>)}
    </div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"8px"}}>
      <div style={{fontSize:"8px",color:"#4a6a8a",marginBottom:"4px"}}>DISTRIBUTION</div>
      {[{l:"Créatures",v:analytics.cr},{l:"Instants/Sorc",v:analytics.is},{l:"Enchant.",v:analytics.en},{l:"Artifacts",v:analytics.ar},{l:"PWs",v:analytics.pw},{l:"Lands",v:analytics.la},{l:"Pioche",v:analytics.ds},{l:"Removal",v:analytics.rm},{l:"Ramp",v:analytics.rp},{l:"Tuteurs",v:analytics.tu},{l:"GameCh.",v:analytics.gc}].map((r,i)=>
        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"8px",padding:"1px 0"}}><span style={{color:"#6a7a8a"}}>{r.l}</span><span style={{color:"#e0e8f0"}}>{r.v}</span></div>
      )}
    </div></>}
  </div>}

  {/* ===== ANALYTICS TAB ===== */}
  {tab==="analytics"&&<div>
    {deck.length===0?<div style={{textAlign:"center",padding:"24px",color:"#1a2a40",fontSize:"10px"}}>Importe un deck.</div>:<>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"10px",marginBottom:"6px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
        <span style={{fontSize:"8px",color:"#4a6a8a"}}>GLOBAL</span>
        <span style={{fontSize:"20px",fontWeight:"700",color:analytics.m.global>=70?"#22c55e":analytics.m.global>=50?"#f59e0b":"#ef4444"}}>{analytics.m.global}<span style={{fontSize:"8px",color:"#2a3a50"}}>/100</span></span>
      </div>
      {[{k:"curve",l:"Courbe",d:`${analytics.avg}`},{k:"ca",l:"Pioche",d:`${analytics.ds}`},{k:"interaction",l:"Interact.",d:`${analytics.rm}`},{k:"mana",l:"Mana",d:`${analytics.la}`},{k:"ramp",l:"Ramp",d:`${analytics.rp}`},{k:"resilience",l:"Résil.",d:`${analytics.rc}`}].map(m=>
        <div key={m.k} style={{marginBottom:"3px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"7px"}}><span style={{color:"#6a7a8a"}}>{m.l} ({m.d})</span><span style={{color:analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444",fontWeight:"600"}}>{analytics.m[m.k]}</span></div><B v={analytics.m[m.k]} color={analytics.m[m.k]>=70?"#22c55e":analytics.m[m.k]>=40?"#f59e0b":"#ef4444"}/></div>
      )}
    </div>
    <div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"5px",padding:"8px",marginBottom:"6px"}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:"2px",height:"40px"}}>
        {[0,1,2,3,4,5,6,7].map(c=>{const v=analytics.curve[c]||0;const mx=Math.max(...Object.values(analytics.curve),1);return<div key={c} style={{flex:1,textAlign:"center"}}>{v>0&&<div style={{fontSize:"6px",color:"#3b82f6"}}>{v}</div>}<div style={{height:`${(v/mx)*30}px`,background:"#3b82f6",borderRadius:"1px 1px 0 0",minHeight:v?"2px":"0"}}/><div style={{fontSize:"5px",color:"#2a3a50"}}>{c===7?"7+":c}</div></div>;})}
      </div>
    </div>
    <button onClick={()=>{setSimR(simHands(deck,2000));}} disabled={deck.length<7} style={{width:"100%",padding:"5px",background:deck.length<7?"#101828":"#1a3a6a",border:"none",borderRadius:"3px",color:"#e8f0ff",fontSize:"8px",cursor:deck.length<7?"default":"pointer",fontFamily:"inherit",marginBottom:"4px"}}>🎲 Sim 2000 mains</button>
    {simR&&<div style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"4px",padding:"6px"}}>
      {[{l:"Mains jouables",v:`${simR.play}%`},{l:"1-drop T1",v:`${simR.t1}%`},{l:"Mulligan",v:`${simR.mull}%`},{l:"Lands moy",v:simR.avgL}].map((r,i)=>
        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"8px",padding:"1px 0"}}><span style={{color:"#6a7a8a"}}>{r.l}</span><span style={{color:"#22c55e"}}>{r.v}</span></div>
      )}
    </div>}
    </>}
  </div>}

  {/* ===== COMBOS TAB ===== */}
  {tab==="combos"&&<div>
    {allCombos.length===0&&<div style={{textAlign:"center",padding:"24px",color:"#1a2a40",fontSize:"10px"}}>Aucun combo détecté.</div>}
    {allCombos.map((co,i)=><div key={i} style={{background:"#080c18",border:"1px solid #141e30",borderRadius:"3px",padding:"6px",marginBottom:"2px",borderLeft:`3px solid ${TC[co.tier]}`}}>
      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"10px",fontWeight:"600",color:"#e0e8f0"}}>{co.name} <span style={{fontSize:"7px",color:TC[co.tier]}}>T{co.tier}</span></span><span style={{fontSize:"11px",fontWeight:"700",color:TC[co.tier]}}>×{co.mult}</span></div>
      <div style={{fontSize:"7px",color:"#3a4a5a"}}>{co.cards.join(" + ")}</div>
    </div>)}
  </div>}
</div>
</div>);
}
