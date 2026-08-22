# Aeon Scorer — Product Roadmap & Validation Ledger

> Living source of truth for the P2→P7 product-intelligence stack and its evidence-hardening follow-ups.
>
> Detailed implementation trails live in the dedicated worklogs. This file records the **current truth**: what exists, what is validated, what remains experimental, and what is still genuinely unresolved.

---

# 0. Non-negotiable policy

- Every product increment is developed on a separate stacked validation branch / draft PR.
- **No merge, retarget or production promotion without explicit user approval.**
- Core Aeon power semantics and product intelligence remain separated unless a dedicated validated promotion explicitly changes that contract.
- Semantic-engine integration is managed separately; the product stack will be replayed/revalidated on the eventual semantic baseline when requested.
- Documentation-only commits after a validated code checkpoint are ignored by product CI by design. Any later non-document change requires the full gate again.

---

# 1. Product thesis

Aeon must answer more than “what number is this deck?”.

North star:

> **Will these decks produce the kind of Commander game these players want to play?**

The product should explain:

1. what a deck can do;
2. when its important resources/threats become accessible;
3. what it structurally depends on;
4. what kinds of answers the table can present and when;
5. whether each seat is likely to have meaningful agency before opposing pressure becomes material;
6. whether a pod is structurally compatible;
7. how a bad table can be repaired with the least intrusive action;
8. what the models still do **not** know.

No moralized salt/toxic score. No fabricated exact probability. No hidden promotion of heuristic evidence into semantic truth.

---

# 2. Current stack status

| PR | Branch | Main scope | Authoritative validation | Status |
|---|---|---|---|---|
| #10 | `product-p2-p7-roadmap` | Original P2→P7 engineering roadmap | #184 SUCCESS | validated / draft / unmerged |
| #11 | `product-p2-p7-v2` | Adaptive Rule 0 V2, Pod Repair V2, Reality-in-Match, Answer Debt, lower-friction local imports | #206 SUCCESS | validated / draft / unmerged |
| #12 | `product-temporal-first-access` | True First-Access Horizon | #214 SUCCESS | validated / draft / unmerged |
| #13 | `product-answer-timing-v2` | Class-specific Answer Timing V2 | #219 SUCCESS | validated / draft / unmerged |
| #14 | `product-threat-objects-v1` | Explicit Threat Objects V1 + privacy hardening | #228 SUCCESS | validated / draft / unmerged |
| #15 | `product-agency-timeline-v1` | Threat–Answer V4 + Agency Timeline V1 | #239 SUCCESS | validated / draft / unmerged |
| #16 | `product-spof-suppression-v1` | Paired non-commander SPOF suppression stress | #246 SUCCESS | validated / draft / unmerged |
| #17 | `product-combo-access-v2` | Temporal Combo Accessibility V2 | #260 SUCCESS | validated / draft / unmerged |

Current validated code checkpoint for PR #17:

`604f6e0c8ffbe7500ae1aa997bb09a076a9abd4f`

PR #17 documentation continues after that code checkpoint only.

---

# 3. Core-score isolation

The original P2→P7 branch added product outputs to `powerModel.js` without rewriting the existing Aeon 0–100 formulas. Subsequent evidence-hardening PRs #12→#17 have continued to avoid core-score changes.

As of PR #17:

- no new `cardFeatures.js` change in the Combo V2 diff;
- no `packageGraph.js` change;
- no `powerModel.js` change;
- no `sequenceSimulator.js` / `sequenceSimulatorMulti.js` change;
- no semantic-version change;
- no Pod Match / Game Quality numeric coefficient change;
- no Reality schema/prediction change.

Any future score promotion requires a dedicated, explicit ablation/calibration decision rather than accidental propagation.

---

# 4. P2 — Experience Intelligence

## Experience Fingerprint — IMPLEMENTED

**Model:** `experience-v1`

Dimensions: tempo, explosiveness, volatility, interaction, resilience, inevitability, dependency, turn complexity. Evidence-bearing and bounded. The raw Aeon median does not secretly drive every dimension.

## Table Friction — IMPLEMENTED

**Model:** `friction-v1`

Descriptive signals for denial/taxes, mass land denial, commander lockout, theft/control exchange, extra-turn recurrence, forced discard/sacrifice, restriction stacking and long sequencing. No moral judgment or salt score.

## True First-Access Horizon — IMPLEMENTED / VALIDATED

**Model:** `goldfish-horizon-v2`

PR #12 added deterministic cumulative first-access evidence while retaining historical per-turn availability separately. Regressions enforce bounded monotonic curves and isolation from the main power profile.

## SPOF — IMPLEMENTED / HARDENED

**Models:**

- `commander-tax-counterfactual-v1`;
- `dependency-suppression-counterfactual-v1`;
- `spof-v2`.

Commander dependency uses paired baseline / +2 / +4 / unavailable stress. Non-commander graveyard/artifact/enchantment/creature-board dependencies now have paired contributor-suppression evidence with fixed seeds and deck-cardinality preservation.

**Promotion boundary:** non-commander semantic dependency scores remain unchanged in V1 of the suppression layer (`scorePromotion = semantic-score-unchanged-v1`). Counterfactual deltas are diagnostic until a promotion study justifies more.

---

# 5. P3 — Pod Intelligence

## Answer Profile V2 — IMPLEMENTED / VALIDATED

Class-specific response timing for:

- stack;
- creature;
- artifact;
- enchantment;
- graveyard;
- wipe.

Under Temporal V2, response curves use actual answer-card counts plus mana-value gating. Historical snapshots retain the explicit scaled-general-interaction fallback.

## Threat Objects V1 — IMPLEMENTED / VALIDATED

**Models:** `threat-object-v1`, `threat-profile-v3`.

Threats carry:

- stable family/id;
- strength/level;
- aggregate source evidence;
- known and unknown prerequisites;
- answer classes;
- temporal semantics/source;
- T25/T50/T75 milestones;
- critical window.

Threat Object adoption does not change historical threat strength/answer/turn arithmetic by itself.

## Threat–Answer V4 — IMPLEMENTED / VALIDATED

Keeps every Threat Object window while preserving the historical worst-window `decks[].turns` calculation exactly for existing consumers.

## Answer Debt V1 — IMPLEMENTED

Translates Threat–Answer into class-specific under-coverage: which answer class is missing, how large the gap is, on what turn, and against which threat.

## Adaptive Rule 0 V2 — IMPLEMENTED

Declared intent creates a separate overlay for combo intent, extra-turn intent and land-denial acceptance. Human intent can change compatibility but **never rewrites detected capability or semantic truth**.

---

# 6. P4 — Game Quality Intelligence

## Advanced Pod Match — IMPLEMENTED

Multi-axis mismatch includes normal range, peak, speed, explosiveness, volatility, friction, Threat–Answer exposure and declared-intent overlay when supplied.

## Game Quality — IMPLEMENTED / CATEGORICAL

Current model remains an experimental categorical risk forecast, not a literal probability of a “good game”. It combines pod mismatch, exposed threat windows, SPOF/friction and explicit vulnerability-vs-answer hard counters.

## Agency Timeline V1 — IMPLEMENTED / DIAGNOSTIC

PR #15 estimates per seat:

- development agency;
- relevant-response agency;
- opponent structural pressure;
- first meaningful agency turn;
- first material pressure turn;
- maximum participation gap;
- whether material pressure arrives before meaningful agency.

It is visible in `/pod` and `/match`.

**Promotion boundary:** Agency does not currently alter Pod Match, Game Quality, Aeon power or Reality prediction. Real-game ablation/calibration is required before numerical promotion.

## Combo Accessibility V2 — IMPLEMENTED / VALIDATED

**Models:** `combo-access-v2`, `combo-piece-timing-v1`.

PR #17 preserves the historical structural Combo Accessibility score exactly and adds separate T5/T7/T9 **raw-draw piece-presence** evidence.

Meaning:

> probability that every required library piece name has appeared in the opening seven plus one raw draw per turn by the target turn.

Command-zone pieces are modeled separately.

This is explicitly **not execution probability**. Tutors, mulligan selection, execution mana, special zones, activations, loop conditions and protection remain excluded unless explicitly modeled later.

Public `share-intelligence-v4` exposes only sanitized timing aggregates. Combo names, piece names, `cards[]` arrays and Oracle text remain private. A local `COMBO ACCESS · V2` panel shows T5/T7/T9 values with explicit non-execution wording.

---

# 7. P5 — Aeon Match

## Matchmaking — IMPLEMENTED

- exact complete-pool partition for small pools up to the current exact threshold;
- deterministic greedy/local-swap optimization for larger pools;
- explicit optimality label;
- no global-optimum claim for heuristic large-N results.

## Pod Repair V2 — IMPLEMENTED / EXPOSED

Audits cross-table 1↔1 swaps and reports real before/after mismatch improvement. If no improving swap exists, Aeon reports that the one-swap neighborhood was audited.

## Event / LGS flow — IMPLEMENTED ENGINEERING

Persistent sessions use versioned Aeon shares. Local Match can also consume a bounded number of public Moxfield/Archidekt URLs for non-persisted quick analysis.

Reality feedback is disabled for tables containing non-versioned local imports.

**Deployment boundary:** migrations/code in Git are not proof of staging or production deployment.

---

# 8. P6 — Causal Deck Doctor

Implemented capabilities:

- explain measured deltas between supplied analyzed variants;
- constrained variant selection;
- target-pod compatibility evaluation;
- prefer pod rearrangement/alternate registered deck before asking a player to edit a deck.

Boundary: Aeon ranks supplied analyzed/legal candidates. Autonomous card generation is not semantic evidence.

---

# 9. P7 — Aeon Reality

Instrumentation and evaluation plumbing exist for bounded post-game observations and the exact pre-game prediction shown to the table.

Implemented evaluation primitives include:

- severe-imbalance prevalence;
- Brier score;
- prevalence baseline Brier;
- Brier improvement;
- AUC;
- calibration bands/MAE;
- distinct-pod count;
- pod-size cohorts;
- readiness requirements for holdout/baseline/calibration review.

**Scientific boundary:** synthetic fixtures prove plumbing, not real-world accuracy. No exact public good-game probability until real observations pass holdout, baseline-superiority, calibration and cohort review.

---

# 10. Privacy invariants

Public intelligence must never leak private deck evidence simply because a new product model is added.

Validated protections now include:

- no decklist in public product intelligence;
- no Oracle text;
- no private evidence-card lists;
- no suppressed SPOF contributor names;
- no combo-piece names;
- no combo-line names in sanitized Combo Accessibility;
- no combo `cards[]` arrays;
- no raw private counterfactual payloads.

Threat/answer/timing information exposed publicly is aggregate and versioned.

PR #14 validation notably discovered and fixed a pre-existing leak where Combo Accessibility line/highest names could reveal combo pieces.

---

# 11. Validation discipline

Every authoritative validation runs the complete branch gate:

1. Smoke;
2. Semantic contracts;
3. Metamorphic contracts;
4. Product contracts;
5. Public precon contract;
6. Adversarial audit;
7. Build.

A feature is not called validated because its dedicated unit test passes; the entire stack must pass together after the final non-document change.

PR #17 example:

- #250 stopped on an old share-version expectation;
- #252 stopped on the next old share-version expectation;
- #254 reached and passed `COMBO ACCESS V2 OK`, then stopped on an old deck-intelligence version expectation;
- #256 passed the full core stack;
- #260 passed the full stack again after local UI finalization and is authoritative.

---

# 12. Remaining real gaps after PR #17

The product scope is now substantially narrower. These are the current genuine gaps; completed items must not be re-listed as unfinished.

## 12.1 Combo Execution Eligibility / prerequisite depth — NEXT

Convert Combo V2’s current reason strings into structured prerequisite objects:

- requirement kind;
- known / unknown / unsupported state;
- evidence source;
- relevant zone;
- mana/activation requirement where representable;
- whether the current engine can evaluate it;
- why exact execution timing is blocked.

Threat Objects should consume these structured prerequisites instead of maintaining a separate vague combo-prerequisite vocabulary.

**Do not promote execution probability yet.** The purpose of this step is to make the missing causal/rules requirements machine-readable.

## 12.2 Tutor eligibility modeling

Raw tutor counts must never inflate piece-presence timing. A later model may include tutors only after Aeon can determine which tutors can actually find which combo piece, from which zone and under what restrictions.

## 12.3 Execution mana / zones / loop-state modeling

For selected lines only, future exactness requires explicit support for things such as:

- cast/activation sequencing;
- positive-mana loop requirement;
- graveyard/exile setup;
- imprint/aura targets;
- X/counter thresholds;
- storm/resource thresholds;
- command-zone availability/tax;
- protection/recovery windows.

Unsupported lines must stay unsupported rather than receiving false precision.

## 12.4 SPOF suppression promotion study

Compare semantic dependency scores against paired suppression deltas across curated decks and later real-game evidence before deciding whether counterfactual deltas should affect promoted vulnerability/Game Quality scoring.

## 12.5 Agency ablation/calibration

Use Reality observations to test whether Agency adds predictive information beyond existing Game Quality inputs before any numeric promotion.

## 12.6 P7 real-world calibration

Still requires held-out real observations, baseline superiority, calibration curves, cohort/leakage review and explicit promotion decision.

## 12.7 Persistent direct LGS import

Still intentionally deferred until server-side provenance, identity, abuse/cost control and calibration provenance are safe.

## 12.8 Final integration replay

When the separately managed semantic baseline is ready, replay/revalidate the complete product stack before integrated production promotion.

---

# 13. Definition of “complete” for a product increment

A stacked increment is complete only when:

- implementation contract exists and is versioned;
- unsupported evidence is explicit rather than silently coerced;
- dedicated regressions pass;
- privacy boundary is reviewed;
- full CI passes after the last non-document change;
- base→validated-code audit finds no unrelated or accidental score changes;
- dedicated worklog is finalized;
- this roadmap reflects the new truth;
- PR remains draft/unmerged pending explicit approval.

Current next implementation target:

> **Combo Execution Eligibility / structured prerequisite depth.**
