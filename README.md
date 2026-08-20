# Aeon Scorer

**MTG Commander / EDH deck power level analyzer based on Monte Carlo access, card roles and synergy packages.**

**Current production:** v3.2.0 · semantic model `3.2.0-semantic-1`  
**Live app:** https://aeon-scorer.vercel.app

Aeon Scorer was built around a simple problem: saying *“my Commander deck is a 7”* is rarely enough to balance a table. Two decks can share the same subjective power level while having completely different low rolls, high rolls, speed and peak potential.

Instead of returning only one opaque number, Aeon Scorer summarizes a deck with four primary values:

- **Median power** — the deck's typical structural output;
- **P20** — a plausible low output;
- **P80** — a plausible strong output;
- **Peak** — accessible high-end potential, separated from the normal range.

Example: **55 [45–65] · peak 85** tells a very different story from **55 [51–60] · peak 68**, even though both decks have the same median.

> Aeon Scorer is not a win-rate calculator, a player rating or an official Commander bracket. It is an experimental, explainable power model designed to make pre-game deck discussions more useful.

## Why this project exists

Commander power discussions often collapse into labels that are too broad to describe actual games. Aeon Scorer tries to answer a more practical question:

**What kinds of outputs is this deck structurally capable of producing, how consistently, and how quickly?**

The public dashboard keeps the answer simple. Detailed metrics are moved into a diagnostic view so that the score remains explainable without turning the main result into a wall of statistics.

Read more:

- https://aeon-scorer.vercel.app/pourquoi
- https://aeon-scorer.vercel.app/methodologie
- https://aeon-scorer.vercel.app/a-propos

## How it works

1. **Card primitives** — Oracle text and card types are mapped to functional roles such as draw, tutors, interaction, protection, recursion, fast mana, blink, tokens and payoffs.
2. **Package graph** — roles are connected into producer → payoff systems such as Blink/ETB, Constellation, tokens, sacrifice, graveyard, counters and commander acceleration.
3. **Monte Carlo access** — thousands of Commander opening/mulligan and mana-access sequences are simulated through turn 7.
4. **Power distribution** — the simulation becomes median / P20 / P80 / peak plus diagnostic dimensions for speed, consistency, explosiveness, synergy, interaction and recovery options.
5. **Optional external prior** — AeonShift CSV data can add a deliberately weak secondary signal, but is never required.

The model is deterministic for a fixed seed and is designed to expose the reasons behind a score rather than hide them.

## Improving from real use

Every successful web analysis is recorded with the information needed to reproduce and audit it: **engine version, semantic version, deck hash, Oracle snapshot hash, iterations, normalized card evidence and result**. Anonymous analyses can also contribute to this QA corpus.

This means real usage expands Aeon's semantic coverage and makes it easier to detect cards, packages or mechanics that the current model may misread. **User analyses are evidence, never automatic training labels or automatic truth.** A repeated user result cannot directly change the 0–100 model.

The audit pipeline is intentionally separated into **RAW → AUDIT → APPROVED MODEL**. The database queues new analyses for an independent semantic auditor. The scheduled auditor is designed to run from ChatGPT with the connected Supabase project, not from an OpenAI API key or a GitHub Models worker. Suspected corrections must be independently checked against current Oracle/type data and then pass semantic, metamorphic, adversarial, macro and convergence tests before they can affect production.

## v3.2 validation

The same final v3.2 head passed:

- smoke test;
- micro-semantic truth tests;
- metamorphic tests;
- adversarial audit;
- production build;
- macro benchmark at 1,800 sequences/deck;
- extended quality gates;
- macro benchmark at 3,200 sequences/deck;
- extended quality gates again;
- 1,800 ↔ 3,200 convergence verification.

The final benchmark contains **38 real decks**: **15 precons**, **15 cEDH lists with 15 distinct commanders**, and **8 user/public decks**. The precon cohort spans multiple release years to avoid calibrating only on older products.

Current corpus reference medians are roughly **49 for precons** and **78 for cEDH**. These are calibration references, not universal thresholds or brackets.

## What v3.2 currently covers

The current model includes the semantic and sequencing hardening introduced through the v3.x line, including:

- reminder-text false positives;
- own-target blink incorrectly counted as removal;
- generic `doubling` contamination between token/counter/trigger packages;
- false ETB payoffs from lands that merely “enter tapped”;
- one-shot vs repeatable tutors;
- persistent vs burst fast mana;
- conditional Mox / Lion's Eye Diamond behavior;
- Ancient Tomb access;
- multi-rock sequencing;
- Commander multiplayer London mulligans;
- Sideboard / Maybeboard / Considering imports;
- commander color-identity validation;
- partial Scryfall resolution and conservative fuzzy matching;
- versioned saved decks and analysis history;
- immutable analysis ingestion with server-side validation, deduplication and rate limiting;
- versioned Oracle semantic snapshots and a queue-backed semantic QA corpus.

## Versioning

The public client version is centralized in `src/version.js`. The smoke test also checks that the frontend engine/semantic versions match the deployed `record-analysis` Edge Function constants in the repository, so a version mismatch should fail CI before release.

Stored analyses preserve the exact `engine_version`, `semantic_version`, deck hash and Oracle snapshot hash used at analysis time. Historical results therefore remain distinguishable after future engine changes.

## Known limits

Aeon Scorer is **not a full Magic rules engine**. In particular:

- tutors are detected but their targets are not dynamically executed in every sequence;
- card draw is measured as accessible resource but is not fully propagated as future drawn cards;
- contextual alternate costs such as Force of Will / Fierce Guardianship are not completely planned;
- some hybrid, Phyrexian and highly conditional mana patterns remain approximations;
- combo detection is deliberately high-confidence and non-exhaustive;
- multiplayer politics, target selection, the real stack and opponent decisions are not simulated;
- Partner / Friends Forever / Background two-commander configurations are not yet supported.

These limits are disclosed because a useful power model should be falsifiable and auditable.

## Local development

```bash
npm install
npm run dev
```

Run the local quality suite:

```bash
npm run quality:local
```

Network benchmark:

```bash
npm run benchmark
npm run validate:calibration
```

## Contributing / reporting bad results

The repository is public so the model can be inspected and challenged. If a deck is clearly misread, opening an issue with the decklist, commander and unexpected output is especially useful.

External contributors can fork the repository and open Pull Requests. Public visibility does **not** grant direct write access to `main`.

Useful test cases include:

- a card receiving the wrong functional role;
- a package built from irrelevant cards;
- a precon or cEDH list that lands in an implausible place;
- a mana edge case that changes actual access timing;
- two similar lists where a meaningful upgrade fails to move the score in the expected direction.

## Français

Aeon Scorer est un analyseur de puissance pour decks **Magic: The Gathering Commander / EDH**. L'objectif est de remplacer les discussions floues du type *« mon deck est un 7 »* par une lecture plus utile : **médiane, sortie basse P20, sortie haute P80 et pic**.

La production actuelle est **v3.2.0** avec la sémantique **`3.2.0-semantic-1`**. Chaque analyse réussie est versionnée et agrandit le corpus QA utilisé pour détecter les cartes ou mécaniques mal comprises et améliorer les prochaines versions. Les analyses utilisateur restent des indices : elles ne deviennent jamais automatiquement la vérité du modèle.

L'écran principal sert à comparer les decks. Les dimensions, packages, courbe d'accès, dépendance au commandant et couverture des données restent disponibles dans **Diagnostic détaillé** uniquement pour expliquer ou auditer le résultat.

Projet indépendant porté par **megazz31**.
