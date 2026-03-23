# ⚡ AeonScorer v3 — MTG Deck Intelligence Engine

## Features
- **Import decklist** (MTGO / Moxfield / Arena format) — paste & go
- **Scryfall API live** — 25000+ cards with images, prices, Oracle text
- **3-layer scoring** — Intrinsic (60+ regex) → Combos (30+) → Commander synergy
- **Deck analytics** — 6 metrics: curve, card advantage, interaction, manabase, ramp, resilience
- **Monte Carlo simulation** — 2000 hands to measure deck reliability
- **Combo detection** — automatic with tier classification (S/A/B)
- **Price estimation** — from Scryfall market data

## Deploy on Vercel
```bash
git init && git add . && git commit -m "v3"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aeon-scorer.git
git push -u origin main --force
```
Then import on vercel.com → Deploy. Done.

## Dev
```bash
npm install && npm run dev
```
