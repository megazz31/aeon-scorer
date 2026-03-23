import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { searchCards, fetchCard, fetchCardList, parseDecklistText } from "./scryfall.js";
import { scoreFullDeck, analyzeDeck, simulateHands, detectCombos, getTags, COMBOS, CAT_COLORS, TIER_COLORS } from "./engine.js";

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [deck, setDeck] = useState([]);
  const [cmdName, setCmdName] = useState("");
  const [cmdOracle, setCmdOracle] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("deck");
  const [simResults, setSimResults] = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const debounce = useRef(null);

  // Search with debounce
  const doSearch = useCallback((q) => {
    setSearch(q);
    if (q.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const names = await searchCards(q);
      setSuggestions(names.slice(0, 8));
    }, 250);
  }, []);

  const addCard = useCallback(async (name) => {
    setLoading(true);
    const card = await fetchCard(name);
    if (card) setDeck(prev => [...prev, { ...card, qty: 1 }]);
    setSearch(""); setSuggestions([]); setLoading(false);
  }, []);

  const removeCard = useCallback((i) => {
    setDeck(prev => prev.filter((_, j) => j !== i));
    if (sel === i) setSel(null);
  }, [sel]);

  // Import decklist
  const handleImport = useCallback(async () => {
    if (!importText.trim()) return;
    setLoading(true);
    const parsed = parseDecklistText(importText);
    const allEntries = [...parsed.mainboard, ...parsed.sideboard];
    const names = allEntries.map(e => e.name);
    const fetched = await fetchCardList(names);

    const newDeck = [];
    for (const entry of allEntries) {
      const card = fetched.find(f => f.name.toLowerCase() === entry.name.toLowerCase());
      if (card) {
        for (let i = 0; i < entry.qty; i++) {
          newDeck.push({ ...card, qty: 1 });
        }
      }
    }
    setDeck(newDeck);
    setImportOpen(false);
    setImportText("");
    setLoading(false);
  }, [importText]);

  // Set commander from first legendary creature
  const autoDetectCommander = useCallback(() => {
    const legendary = deck.find(c => c.type?.includes("Legendary") && c.type?.includes("Creature"));
    if (legendary) {
      setCmdName(legendary.name);
      setCmdOracle(legendary.oracle || "");
    }
  }, [deck]);

  useEffect(() => { if (deck.length > 0 && !cmdName) autoDetectCommander(); }, [deck, cmdName, autoDetectCommander]);

  // Run hand simulation
  const runSimulation = useCallback(() => {
    setSimRunning(true);
    setTimeout(() => {
      const res = simulateHands(deck, 2000);
      setSimResults(res);
      setSimRunning(false);
    }, 100);
  }, [deck]);

  // Scoring
  const scored = useMemo(() => scoreFullDeck(deck, cmdOracle), [deck, cmdOracle]);
  const analytics = useMemo(() => analyzeDeck(scored), [scored]);
  const allCombos = useMemo(() => detectCombos(deck.map(c => c.name)), [deck]);
  const totalPts = scored.reduce((s, c) => s + c.final, 0);
  const totalPrice = deck.reduce((s, c) => s + (parseFloat(c.prices?.eur) || 0), 0);
  const budget = 100;

  const S = (props) => <span {...props} />;

  return (
    <div style={{ fontFamily: "'IBM Plex Mono',ui-monospace,'Cascadia Code',monospace", background: "#060810", color: "#c0c8d8", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#080c18,#0c1428,#080c18)", padding: "18px 14px 14px", borderBottom: "1px solid #141e30" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
              <span style={{ fontSize: "20px", fontWeight: "800", color: "#e8f0ff" }}>aeon</span>
              <span style={{ fontSize: "20px", color: "#f59e0b" }}>_</span>
              <span style={{ fontSize: "20px", fontWeight: "800", color: "#3b82f6" }}>scorer</span>
              <span style={{ fontSize: "11px", color: "#22c55e", marginLeft: "4px" }}>v3</span>
            </div>
            <p style={{ fontSize: "9px", color: "#2a3a50", margin: "2px 0 0" }}>Deck Intelligence Engine • Scryfall Live • {COMBOS.length} combos • Monte Carlo Sim</p>
          </div>
          <button onClick={() => setImportOpen(!importOpen)} style={{ padding: "6px 12px", background: importOpen ? "#1a2a44" : "#0c1428", border: "1px solid #1a2a44", borderRadius: "4px", color: "#3b82f6", fontSize: "10px", cursor: "pointer", fontFamily: "inherit" }}>
            {importOpen ? "✕ Fermer" : "📋 Importer Decklist"}
          </button>
        </div>
      </div>

      {/* IMPORT PANEL */}
      {importOpen && (
        <div style={{ background: "#0a1020", borderBottom: "1px solid #141e30", padding: "14px" }}>
          <div style={{ fontSize: "10px", color: "#4a6a8a", marginBottom: "6px" }}>Colle ta decklist (format MTGO / Moxfield / Arena) :</div>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8} placeholder={"4 Lightning Bolt\n4 Counterspell\n2 Brainstorm\n24 Island\n\nSideboard:\n2 Negate"} style={{ width: "100%", padding: "8px", background: "#060810", border: "1px solid #1a2a44", borderRadius: "4px", color: "#c0c8d8", fontSize: "11px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={handleImport} disabled={loading} style={{ padding: "8px 20px", background: "#1a3a6a", border: "none", borderRadius: "4px", color: "#e8f0ff", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
              {loading ? "Chargement depuis Scryfall..." : "⚡ Importer & Analyser"}
            </button>
            <button onClick={() => { setDeck([]); setSel(null); setSimResults(null); setCmdName(""); setCmdOracle(""); }} style={{ padding: "8px 16px", background: "#1a1020", border: "1px solid #2a1a30", borderRadius: "4px", color: "#8a6a7a", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
              🗑️ Vider le deck
            </button>
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: "flex", background: "#080c14", borderBottom: "1px solid #101828" }}>
        {[
          { id: "deck", l: `Deck (${deck.length})` },
          { id: "analytics", l: "Analyse" },
          { id: "sim", l: "Simulation" },
          { id: "combos", l: `Combos (${allCombos.length})` },
          { id: "algo", l: "Algo" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "9px 3px", border: "none", cursor: "pointer", background: tab === t.id ? "#0c1020" : "transparent", color: tab === t.id ? "#3b82f6" : "#2a3a50", fontSize: "10px", fontWeight: tab === t.id ? "700" : "400", borderBottom: tab === t.id ? "2px solid #3b82f6" : "2px solid transparent", fontFamily: "inherit" }}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding: "12px 10px", maxWidth: "720px", margin: "0 auto" }}>
        {/* Commander */}
        <div style={{ background: "#080c18", border: "1px solid #141e30", borderRadius: "6px", padding: "10px", marginBottom: "8px" }}>
          <div style={{ fontSize: "8px", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>⚔️ Commandant</div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input value={cmdName} onChange={e => setCmdName(e.target.value)} placeholder="Nom du commandant" style={{ flex: 1, padding: "5px 8px", background: "#0c1428", border: "1px solid #141e30", borderRadius: "3px", color: "#e8f0ff", fontSize: "11px", fontFamily: "inherit" }} />
            <button onClick={async () => { if (cmdName) { const c = await fetchCard(cmdName); if (c) setCmdOracle(c.oracle); } }} style={{ padding: "5px 10px", background: "#0c1428", border: "1px solid #1a2a44", borderRadius: "3px", color: "#4a6a8a", fontSize: "9px", cursor: "pointer", fontFamily: "inherit" }}>Fetch</button>
          </div>
          {cmdOracle && <div style={{ fontSize: "9px", color: "#3a4a5a", marginTop: "4px", lineHeight: 1.4 }}>{cmdOracle.slice(0, 150)}...</div>}
          <div style={{ display: "flex", gap: "3px", marginTop: "4px", flexWrap: "wrap" }}>
            {getTags(cmdOracle).map(t => <span key={t} style={{ fontSize: "7px", padding: "1px 4px", borderRadius: "2px", background: "#0c1428", color: "#3b82f6", border: "1px solid #1a2a44" }}>{t}</span>)}
          </div>
        </div>

        {/* Budget + Price */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
          <div style={{ flex: 1, background: "#080c18", border: `1px solid ${totalPts > budget ? "#3a1515" : "#141e30"}`, borderRadius: "6px", padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "#4a6a8a" }}>POINTS</span>
              <span style={{ fontSize: "16px", fontWeight: "700", color: totalPts > budget ? "#ef4444" : "#22c55e" }}>{totalPts}<span style={{ fontSize: "10px", color: "#2a3a50" }}>/{budget}</span></span>
            </div>
            <div style={{ height: "3px", background: "#0c1428", borderRadius: "2px", overflow: "hidden", marginTop: "4px" }}>
              <div style={{ width: `${Math.min(100, totalPts / budget * 100)}%`, height: "100%", background: totalPts > budget ? "#ef4444" : "#22c55e", borderRadius: "2px" }} />
            </div>
          </div>
          <div style={{ flex: 1, background: "#080c18", border: "1px solid #141e30", borderRadius: "6px", padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "#4a6a8a" }}>PRIX EST.</span>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "#f59e0b" }}>{totalPrice > 0 ? `${Math.round(totalPrice)}€` : "—"}</span>
            </div>
            <div style={{ fontSize: "8px", color: "#2a3a50", marginTop: "4px" }}>{deck.length} cartes</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "10px" }}>
          <input value={search} onChange={e => doSearch(e.target.value)} placeholder="🔍 Rechercher une carte (Scryfall live)..." style={{ width: "100%", padding: "8px 10px", background: "#080c18", border: "1px solid #141e30", borderRadius: "6px", color: "#e8f0ff", fontSize: "11px", fontFamily: "inherit", boxSizing: "border-box" }} />
          {suggestions.length > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#0c1020", border: "1px solid #141e30", borderRadius: "0 0 6px 6px", maxHeight: "200px", overflowY: "auto" }}>
            {suggestions.map((name, i) => <div key={i} onClick={() => addCard(name)} style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #101828", fontSize: "11px", color: "#c0c8d8" }} onMouseOver={e => e.currentTarget.style.background = "#101828"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>{name}</div>)}
          </div>}
          {loading && <div style={{ position: "absolute", right: "10px", top: "8px", fontSize: "10px", color: "#3a4a5a" }}>...</div>}
        </div>

        {/* ===== DECK TAB ===== */}
        {tab === "deck" && <div>
          {scored.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: "#1a2a40", fontSize: "11px" }}>Importe une decklist ou recherche des cartes pour commencer.</div>}
          {scored.sort((a, b) => b.final - a.final).map((card, idx) => (
            <div key={idx} style={{ background: sel === idx ? "#0c1020" : "#080c18", border: `1px solid ${sel === idx ? "#1a2a44" : "#101828"}`, borderRadius: "5px", padding: "8px 10px", marginBottom: "3px", cursor: "pointer" }}>
              <div onClick={() => setSel(sel === idx ? null : idx)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: "#e0e8f0" }}>{card.name}</span>
                    <span style={{ fontSize: "7px", color: "#2a3a50", background: "#0c1428", padding: "1px 3px", borderRadius: "2px" }}>{card.cmc}⬥</span>
                    {card.coMult > 1 && <span style={{ fontSize: "7px", color: "#ef4444", background: "#150808", padding: "1px 3px", borderRadius: "2px", fontWeight: "700" }}>COMBO ×{card.coMult}</span>}
                    {card.synergy?.mult > 1 && <span style={{ fontSize: "7px", color: "#3b82f6", background: "#080e1a", padding: "1px 3px", borderRadius: "2px" }}>CMD +{Math.round((card.synergy.mult - 1) * 100)}%</span>}
                  </div>
                  <div style={{ fontSize: "8px", color: "#2a3a50", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.type}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                  {card.prices?.eur && <span style={{ fontSize: "8px", color: "#4a5a3a" }}>{card.prices.eur}€</span>}
                  <span style={{ fontSize: "16px", fontWeight: "700", color: card.final >= 10 ? "#ef4444" : card.final >= 5 ? "#f59e0b" : card.final >= 2 ? "#3b82f6" : "#22c55e" }}>{card.final}</span>
                  <button onClick={e => { e.stopPropagation(); removeCard(idx); }} style={{ background: "none", border: "none", color: "#1a1515", cursor: "pointer", fontSize: "11px" }}>✕</button>
                </div>
              </div>
              {sel === idx && <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #101828" }}>
                {card.imgSmall && <img src={card.imgSmall} alt={card.name} style={{ width: "80px", borderRadius: "4px", float: "right", marginLeft: "8px" }} />}
                <div style={{ fontSize: "8px", color: "#3a4a5a", marginBottom: "4px", lineHeight: 1.4 }}>{card.oracle}</div>
                {card.intrinsic?.dets?.map((d, j) => <div key={j} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "1px 0" }}>
                  <span style={{ fontSize: "6px", padding: "0px 3px", borderRadius: "2px", background: (CAT_COLORS[d.cat] || "#666") + "18", color: CAT_COLORS[d.cat] || "#666", whiteSpace: "nowrap" }}>{d.cat}</span>
                  <span style={{ fontSize: "8px", color: "#4a5a6a", flex: 1 }}>{d.label}</span>
                  <span style={{ fontSize: "8px", color: "#f59e0b" }}>+{d.score}</span>
                </div>)}
                {card.synergy?.tags?.length > 0 && <div style={{ fontSize: "8px", color: "#3b82f6", marginTop: "3px" }}>Synergie cmd: {card.synergy.tags.join(", ")}</div>}
                {card.myCombo?.map((co, k) => <div key={k} style={{ fontSize: "8px", color: "#ef4444", marginTop: "2px" }}>⚡ {co.name} (×{co.mult})</div>)}
              </div>}
            </div>
          ))}
        </div>}

        {/* ===== ANALYTICS TAB ===== */}
        {tab === "analytics" && <div>
          {deck.length === 0 ? <div style={{ textAlign: "center", padding: "30px", color: "#1a2a40", fontSize: "11px" }}>Importe un deck pour voir l'analyse.</div> : <>
            {/* Metrics bars */}
            <div style={{ background: "#080c18", border: "1px solid #141e30", borderRadius: "6px", padding: "12px", marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "9px", color: "#4a6a8a", textTransform: "uppercase", letterSpacing: "1px" }}>Score Global</span>
                <span style={{ fontSize: "28px", fontWeight: "700", color: analytics.metrics.global >= 70 ? "#22c55e" : analytics.metrics.global >= 50 ? "#f59e0b" : "#ef4444" }}>{analytics.metrics.global}<span style={{ fontSize: "12px", color: "#2a3a50" }}>/100</span></span>
              </div>
              {[
                { key: "curve", label: "Courbe de mana", desc: `Moy: ${analytics.avgCmc} CMC` },
                { key: "cardAdvantage", label: "Card Advantage", desc: `${analytics.drawSources} sources` },
                { key: "interaction", label: "Interaction / Removal", desc: `${analytics.removals} removals` },
                { key: "manabase", label: "Manabase", desc: `${analytics.lands} terrains` },
                { key: "ramp", label: "Ramp / Accélération", desc: `${analytics.rampCards} sources` },
                { key: "resilience", label: "Résilience", desc: `${analytics.drawSources} CA + ${analytics.recursion} recursion` },
              ].map(m => (
                <div key={m.key} style={{ marginBottom: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginBottom: "2px" }}>
                    <span style={{ color: "#6a7a8a" }}>{m.label} <span style={{ color: "#2a3a50" }}>({m.desc})</span></span>
                    <span style={{ color: analytics.metrics[m.key] >= 70 ? "#22c55e" : analytics.metrics[m.key] >= 40 ? "#f59e0b" : "#ef4444", fontWeight: "600" }}>{analytics.metrics[m.key]}/100</span>
                  </div>
                  <div style={{ height: "4px", background: "#0c1428", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${analytics.metrics[m.key]}%`, height: "100%", borderRadius: "2px", background: analytics.metrics[m.key] >= 70 ? "#22c55e" : analytics.metrics[m.key] >= 40 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* CMC Curve Chart */}
            <div style={{ background: "#080c18", border: "1px solid #141e30", borderRadius: "6px", padding: "12px", marginBottom: "10px" }}>
              <div style={{ fontSize: "9px", color: "#4a6a8a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Courbe de Mana</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "80px" }}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map(cmc => {
                  const count = analytics.curve[cmc] || 0;
                  const max = Math.max(...Object.values(analytics.curve), 1);
                  return (
                    <div key={cmc} style={{ flex: 1, textAlign: "center" }}>
                      {count > 0 && <div style={{ fontSize: "9px", color: "#3b82f6", fontWeight: "600", marginBottom: "2px" }}>{count}</div>}
                      <div style={{ height: `${(count / max) * 60}px`, background: "linear-gradient(180deg,#3b82f6,#1a2a44)", borderRadius: "2px 2px 0 0", minHeight: count > 0 ? "3px" : "0" }} />
                      <div style={{ fontSize: "8px", color: "#2a3a50", marginTop: "2px" }}>{cmc === 7 ? "7+" : cmc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribution */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px", marginBottom: "10px" }}>
              {[
                { label: "Créatures", val: analytics.creatures, color: "#22c55e" },
                { label: "Sorts", val: analytics.instSorc, color: "#3b82f6" },
                { label: "Terrains", val: analytics.lands, color: "#6b7280" },
                { label: "Total", val: analytics.totalCards, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ background: "#080c18", border: "1px solid #141e30", borderRadius: "4px", padding: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: "8px", color: "#2a3a50", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {analytics.drawSources < 5 && deck.length > 20 && <div style={{ background: "#150808", border: "1px solid #3a1515", borderRadius: "4px", padding: "8px 10px", marginBottom: "4px", fontSize: "10px", color: "#ef4444" }}>⚠️ Seulement {analytics.drawSources} sources de pioche. Recommandé : 6-10 pour un deck de {deck.length} cartes.</div>}
            {analytics.removals < 3 && deck.length > 20 && <div style={{ background: "#150808", border: "1px solid #3a1515", borderRadius: "4px", padding: "8px 10px", marginBottom: "4px", fontSize: "10px", color: "#ef4444" }}>⚠️ Seulement {analytics.removals} removals. Recommandé : 5-10.</div>}
            {analytics.lands < deck.length * 0.33 && deck.length > 20 && <div style={{ background: "#150808", border: "1px solid #3a1515", borderRadius: "4px", padding: "8px 10px", marginBottom: "4px", fontSize: "10px", color: "#f59e0b" }}>⚠️ Seulement {analytics.lands} terrains pour {deck.length} cartes ({Math.round(analytics.lands / deck.length * 100)}%). Recommandé : 36-40%.</div>}
            {analytics.avgCmc > 3.5 && <div style={{ background: "#151508", border: "1px solid #3a3515", borderRadius: "4px", padding: "8px 10px", marginBottom: "4px", fontSize: "10px", color: "#f59e0b" }}>⚠️ CMC moyen élevé ({analytics.avgCmc}). Ton deck risque d'être lent.</div>}
          </>}
        </div>}

        {/* ===== SIMULATION TAB ===== */}
        {tab === "sim" && <div>
          <div style={{ background: "#080c18", border: "1px solid #141e30", borderRadius: "6px", padding: "14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", color: "#4a6a8a", marginBottom: "8px" }}>Monte Carlo : simule 2000 mains de 7 cartes pour évaluer la fiabilité de ton deck.</div>
            <button onClick={runSimulation} disabled={deck.length < 7 || simRunning} style={{ padding: "8px 20px", background: deck.length < 7 ? "#101828" : "#1a3a6a", border: "none", borderRadius: "4px", color: "#e8f0ff", fontSize: "12px", cursor: deck.length < 7 ? "default" : "pointer", fontFamily: "inherit", opacity: deck.length < 7 ? 0.3 : 1 }}>
              {simRunning ? "Simulation en cours..." : deck.length < 7 ? "Besoin de 7+ cartes" : "🎲 Lancer la simulation (2000 mains)"}
            </button>
          </div>
          {simResults && (
            <div style={{ background: "#080c18", border: "1px solid #141e30", borderRadius: "6px", padding: "14px" }}>
              <div style={{ fontSize: "9px", color: "#4a6a8a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Résultats ({simResults.iterations} simulations)</div>
              {[
                { label: "Mains jouables (2-5 lands + action ≤3 CMC)", val: simResults.playableHands, unit: "%", good: 75 },
                { label: "Mains avec bon ratio de terrains (2-5)", val: simResults.landsOk, unit: "%", good: 70 },
                { label: "1-drop jouable T1", val: simResults.oneDropT1, unit: "%", good: 40 },
                { label: "Terrains moyens dans la main", val: simResults.avgLandsInHand, unit: "", good: null },
              ].map((r, i) => (
                <div key={i} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "3px" }}>
                    <span style={{ color: "#6a7a8a" }}>{r.label}</span>
                    <span style={{ fontWeight: "700", color: r.good && r.val >= r.good ? "#22c55e" : r.good && r.val < r.good ? "#f59e0b" : "#c0c8d8" }}>{r.val}{r.unit}</span>
                  </div>
                  {r.good && <div style={{ height: "4px", background: "#0c1428", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, r.val)}%`, height: "100%", borderRadius: "2px", background: r.val >= r.good ? "#22c55e" : "#f59e0b" }} />
                  </div>}
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* ===== COMBOS TAB ===== */}
        {tab === "combos" && <div>
          {allCombos.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: "#1a2a40", fontSize: "11px" }}>Aucun combo détecté.</div>}
          {allCombos.map((co, i) => <div key={i} style={{ background: "#080c18", border: "1px solid #141e30", borderRadius: "5px", padding: "10px", marginBottom: "4px", borderLeft: `3px solid ${TIER_COLORS[co.tier]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><span style={{ fontSize: "12px", fontWeight: "600", color: "#e0e8f0" }}>{co.name}</span><span style={{ fontSize: "8px", color: TIER_COLORS[co.tier], marginLeft: "6px", fontWeight: "700" }}>Tier {co.tier}</span></div>
              <span style={{ fontSize: "13px", fontWeight: "700", color: TIER_COLORS[co.tier] }}>×{co.mult}</span>
            </div>
            <div style={{ fontSize: "9px", color: "#4a5a6a", marginTop: "3px" }}>{co.cards.join(" + ")}</div>
            <div style={{ fontSize: "9px", color: "#2a3a50", marginTop: "1px" }}>{co.desc}</div>
          </div>)}
          <div style={{ fontSize: "8px", color: "#1a2a40", marginTop: "10px" }}>{COMBOS.length} combos en base totale</div>
        </div>}

        {/* ===== ALGO TAB ===== */}
        {tab === "algo" && <div style={{ fontSize: "10px", color: "#4a5a6a", lineHeight: 1.7 }}>
          <h3 style={{ color: "#3b82f6", fontSize: "12px", margin: "0 0 4px" }}>Couche 1 — Score Intrinsèque (60+ patterns)</h3>
          <p style={{ margin: "0 0 8px" }}>Regex analyse le texte Oracle. Chaque primitive détectée donne des points. Multiplicateur CMC: 0=×2.5, 1=×2.0, ..., 7+=×0.7.</p>
          <h3 style={{ color: "#ef4444", fontSize: "12px", margin: "0 0 4px" }}>Couche 2 — Combos ({COMBOS.length} en base)</h3>
          <p style={{ margin: "0 0 8px" }}>Quand 2+ cartes d'un combo sont dans le deck → multiplicateur ×1.2 à ×3.0. Classement S/A/B.</p>
          <h3 style={{ color: "#22c55e", fontSize: "12px", margin: "0 0 4px" }}>Couche 3 — Synergie Commandant</h3>
          <p style={{ margin: "0 0 8px" }}>Tags du commandant vs cartes. +15% par tag partagé.</p>
          <h3 style={{ color: "#f59e0b", fontSize: "12px", margin: "0 0 4px" }}>Analyse du Deck (6 métriques)</h3>
          <p style={{ margin: "0 0 8px" }}>Courbe de mana, card advantage, interaction, manabase, ramp, résilience. Score global 0-100.</p>
          <h3 style={{ color: "#8b5cf6", fontSize: "12px", margin: "0 0 4px" }}>Simulation Monte Carlo</h3>
          <p style={{ margin: "0 0 8px" }}>2000 mains de 7 cartes mélangées aléatoirement. Mesure : % mains jouables, % 1-drop T1, terrains moyens.</p>
          <div style={{ background: "#0c1428", borderRadius: "4px", padding: "8px", fontFamily: "monospace", fontSize: "10px", color: "#f59e0b", margin: "8px 0" }}>
            pts = floor( rawScore × cmcMult / 3 × cmdSynergy × comboMult )
          </div>
          <h3 style={{ color: "#06b6d4", fontSize: "12px", margin: "0 0 4px" }}>Import Decklist</h3>
          <p style={{ margin: "0" }}>Supporte MTGO, Moxfield, Arena. Formats acceptés : "4 Card Name", "4x Card Name", "SB: 2 Card Name". Toutes les cartes sont récupérées via l'API Scryfall (25000+ cartes, prix, images, légalités).</p>
        </div>}
      </div>
    </div>
  );
}
