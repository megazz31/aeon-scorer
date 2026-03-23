// Scryfall API wrapper with caching
const cache = new Map();

export async function searchCards(query) {
  if (query.length < 2) return [];
  const key = `search:${query}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.data || [];
    cache.set(key, results);
    return results;
  } catch { return []; }
}

export async function fetchCard(name) {
  const key = `card:${name.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const d = await res.json();
    const card = {
      name: d.name,
      oracle: d.oracle_text || (d.card_faces ? d.card_faces.map(f => f.oracle_text).join("\n") : ""),
      cmc: d.cmc || 0,
      type: d.type_line || "",
      colors: d.colors || d.color_identity || [],
      img: d.image_uris?.normal || d.card_faces?.[0]?.image_uris?.normal || null,
      imgSmall: d.image_uris?.small || d.card_faces?.[0]?.image_uris?.small || null,
      set: d.set_name || "",
      legalities: d.legalities || {},
      power: d.power || null,
      toughness: d.toughness || null,
      keywords: d.keywords || [],
      prices: { eur: d.prices?.eur, usd: d.prices?.usd },
    };
    cache.set(key, card);
    return card;
  } catch { return null; }
}

export async function fetchCardList(names) {
  const results = [];
  // Scryfall allows collection fetch (max 75 at a time)
  const batches = [];
  for (let i = 0; i < names.length; i += 75) {
    batches.push(names.slice(i, i + 75));
  }
  for (const batch of batches) {
    try {
      const identifiers = batch.map(n => ({ name: n }));
      const res = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const d of (data.data || [])) {
        const card = {
          name: d.name,
          oracle: d.oracle_text || (d.card_faces ? d.card_faces.map(f => f.oracle_text).join("\n") : ""),
          cmc: d.cmc || 0,
          type: d.type_line || "",
          colors: d.colors || d.color_identity || [],
          img: d.image_uris?.normal || d.card_faces?.[0]?.image_uris?.normal || null,
          imgSmall: d.image_uris?.small || d.card_faces?.[0]?.image_uris?.small || null,
          set: d.set_name || "",
          legalities: d.legalities || {},
          power: d.power || null,
          toughness: d.toughness || null,
          keywords: d.keywords || [],
          prices: { eur: d.prices?.eur, usd: d.prices?.usd },
        };
        cache.set(`card:${d.name.toLowerCase()}`, card);
        results.push(card);
      }
    } catch { /* continue */ }
  }
  return results;
}

// Parse MTGO / Moxfield / Arena decklist format
export function parseDecklistText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("//") && !l.startsWith("#"));
  const mainboard = [];
  const sideboard = [];
  let inSideboard = false;

  for (const line of lines) {
    if (/^sideboard:?$/i.test(line) || /^SB:?$/i.test(line)) {
      inSideboard = true;
      continue;
    }
    if (line === "") { inSideboard = true; continue; }

    // Match: "4 Card Name" or "4x Card Name" or "SB: 2 Card Name"
    const match = line.match(/^(?:SB:\s*)?(\d+)x?\s+(.+?)(?:\s+\(.*\))?(?:\s+\d+)?$/i);
    if (match) {
      const qty = parseInt(match[1]);
      const name = match[2].trim();
      if (inSideboard) {
        sideboard.push({ qty, name });
      } else {
        mainboard.push({ qty, name });
      }
    }
  }
  return { mainboard, sideboard };
}
