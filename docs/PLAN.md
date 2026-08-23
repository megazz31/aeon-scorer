# Aeon Scorer — Product Roadmap & Validation Ledger

> Living source of truth for the P2→P7 product-intelligence stack and its evidence-hardening follow-ups.
>
> Detailed implementation trails live in the dedicated worklogs. This file records the **current truth**: what exists, what is validated, what remains experimental, and what is still genuinely unresolved.

---

# 0. Non-negotiable policy

- Every product increment is developed on a separate stacked validation branch / draft PR.
- **No merge, retarget or production promotion without explicit user approval.**
- Core Aeon power semantics and product intelligence remain separated unless a dedicated validated promotion explicitly changes that contract.
- Semantic-engine integration is managed separately; the product stack is replayed/revalidated on the eventual semantic baseline when requested.
- Documentation-only commits after a validated code checkpoint are ignored by product CI by design. Any later non-document change requires the full gate again.

---

# 1. Product thesis

Aeon must answer more than “what number is this deck?”.

North star:

> **Will these decks produce the kind of Commander game these players want to play?**

The product should explain:

1. what a deck can do;
2. when important resources/threats become accessible;
3. what it structurally depends on;
4. what kinds of answers the table can present and when;
5. whether each seat is likely to have meaningful agency before opposing pressure becomes material;
6. whether a pod is structurally compatible;
7. how a bad table can be repaired with the least intrusive action;
8. what the models still do **not** know.

No moralized salt/toxic score. No fabricated exact probability. No hidden promotion of heuristic evidence into semantic truth.

---

# 2. Current validated stack

| PR | Branch | Main scope | Authoritative validation | Status |
|---|---|---|---|---|
| #10 | `product-p2-p7-roadmap` | Original P2→P7 engineering roadmap | #184 SUCCESS | validated / draft / unmerged |
| #11 | `product-p2-p7-v2` | Adaptive Rule 0 V2, Pod Repair V2, Reality-in-Match, Answer Debt, local imports | #206 SUCCESS | validated / draft / unmerged |
| #12 | `product-temporal-first-access` | True First-Access Horizon | #214 SUCCESS | validated / draft / unmerged |
| #13 | `product-answer-timing-v2` | Class-specific Answer Timing V2 | #219 SUCCESS | validated / draft / unmerged |
| #14 | `product-threat-objects-v1` | Explicit Threat Objects V1 + privacy hardening | #228 SUCCESS | validated / draft / unmerged |
| #15 | `product-agency-timeline-v1` | Threat–Answer V4 + Agency Timeline V1 | #239 SUCCESS | validated / draft / unmerged |
| #16 | `product-spof-suppression-v1` | Paired non-commander SPOF suppression stress | #246 SUCCESS | validated / draft / unmerged |
| #17 | `product-combo-access-v2` | Temporal Combo Accessibility V2 | #260 SUCCESS | validated / draft / unmerged |
| #18 | `product-combo-execution-eligibility-v1` | Structured combo prerequisites + Threat Profile V4 | #276 SUCCESS | validated / draft / unmerged |

Current validated non-document code checkpoint for PR #18:

`ac428c69af849595c121a35580d198e927c3200f`

PR #18 documentation continues after that checkpoint only.

---

# 3. Core-score isolation through PR #18

The product-intelligence stack remains parallel to the existing Aeon power score.

PR #18 base→validated-code audit:

- base: `adb6ed47d7cc4f048f0af3d89b2df91c5142f353`;
- code: `ac428c69af849595c121a35580d198e927c3200f`;
- ahead: 15;
- behind: 0.

No PR #18 change to:

- `cardFeatures.js`;
- `packageGraph.js`;
- `powerModel.js`;
- `sequenceSimulator.js`;
- `sequenceSimulatorMulti.js`;
- semantic versioning;
- Pod Match / Game Quality coefficients;
- Reality prediction/schema.

Changed files are confined to Combo Eligibility / Threat prerequisite models, sanitized product propagation, local diagnostic UI, tests, workflow and documentation.

Any future score promotion requires a dedicated ablation/calibration decision rather than accidental propagation.

---

# 4. P2 — Experience Intelligence

## Experience Fingerprint — IMPLEMENTED

**Model:** `experience-v1`

Tempo, explosiveness, volatility, interaction, resilience, inevitability, dependency and turn complexity. Evidence-bearing, bounded and isolated from hidden raw-median rewriting.

## Table Friction — IMPLEMENTED

**Model:** `friction-v1`

Descriptive denial/tax, land denial, commander lockout, theft, extra-turn, discard/sacrifice, restriction-stack and sequencing signals. No moral judgment or salt score.

## True First-Access Horizon — IMPLEMENTED / VALIDATED

**Model:** `goldfish-horizon-v2`

Deterministic cumulative first-access evidence with historical per-turn availability retained separately.

## SPOF — IMPLEMENTED / HARDENED

**Models:**

- `commander-tax-counterfactual-v1`;
- `dependency-suppression-counterfactual-v1`;
- `spof-v2`.

Commander dependency uses paired baseline / +2 / +4 / unavailable stress. Non-commander graveyard/artifact/enchantment/creature-board dependencies have fixed-seed paired contributor-suppression evidence.

**Promotion boundary:** counterfactual deltas remain diagnostic; semantic SPOF scores are not automatically rewritten.

---

# 5. P3 — Pod Intelligence

## Answer Profile V2 — IMPLEMENTED / VALIDATED

Class-specific response timing for stack, creature, artifact, enchantment, graveyard and wipe. Temporal V2 uses actual answer-card counts plus mana-value gating; historical analyses retain explicit fallback behavior.

## Threat Objects V2 / Threat Profile V4 — IMPLEMENTED / VALIDATED

**Models:** `threat-object-v2`, `threat-profile-v4`.

Threat objects retain stable threat identity, strength, answer classes and timing while adding structured combo execution-prerequisite evidence when available.

Combo prerequisites now expose:

- stable requirement id;
- category;
- evidence state;
- zone;
- whether the requirement is strict for execution;
- whether Aeon can evaluate it;
- evidence source;
- explicit blocker reason.

Important distinction:

> requirement state describes **Aeon's evidence coverage**, not proof that the requirement is or is not satisfied in a real game.

`protection-window` and similar reliability context can remain unknown without being strict execution blockers.

## Threat–Answer V4 — IMPLEMENTED / VALIDATED

Preserves every Threat Object window while retaining the historical worst-window arithmetic. PR #18 improves prerequisite vocabulary only; Threat–Answer numerical arithmetic is unchanged.

## Answer Debt V1 — IMPLEMENTED

Class-specific under-coverage by threat/turn.

## Adaptive Rule 0 V2 — IMPLEMENTED

Declared intent changes compatibility overlays but never semantic truth or detected capability.

---

# 6. P4 — Game Quality Intelligence

## Advanced Pod Match — IMPLEMENTED

Multi-axis mismatch includes range, peak, speed, explosiveness, volatility, friction, Threat–Answer exposure and declared-intent overlay when supplied.

## Game Quality — IMPLEMENTED / CATEGORICAL

Experimental categorical risk forecast, not a literal probability of a “good game”.

## Agency Timeline V1 — IMPLEMENTED / DIAGNOSTIC

Development agency, relevant-response agency, opponent pressure, first meaningful agency, first material pressure and participation-gap evidence are visible in `/pod` and `/match`.

**Promotion boundary:** Agency does not currently alter Pod Match, Game Quality, Aeon power or Reality prediction.

## Combo Accessibility V2 — IMPLEMENTED / VALIDATED

**Models:** `combo-access-v2`, `combo-piece-timing-v1`.

Preserves the historical structural combo-access score and adds T5/T7/T9 **raw-draw piece-presence** evidence.

Meaning:

> probability that every required library piece name has appeared in the opening seven plus one raw draw per turn by the target turn.

Command-zone pieces are separated. Tutors, mulligans, execution mana, special zones, activations and loop conditions are not folded into that probability.

## Combo Execution Eligibility V1 — IMPLEMENTED / VALIDATED

**Model:** `combo-execution-eligibility-v1`.

For catalogued combo lines, Aeon now records which execution dimensions are known, unknown or unsupported and exactly why exact timing remains blocked.

Current structured catalogs cover:

- Thoracle + Consultation;
- Thoracle + Pact;
- Dramatic Scepter;
- Heliod Ballista;
- Exquisite Bond;
- Exquisite Vito;
- Painter Stone;
- Worldgorger;
- Breach Freeze.

Unknown lines explicitly fall back to `execution-prerequisites-not-modeled`.

**No exact execution probability or win probability is emitted.**

Local Product Workspace exposes piece-presence timing plus strict execution blockers. Public `share-intelligence-v5` exposes sanitized requirement aggregates only; combo/card names remain private.

---

# 7. P5 — Aeon Match

## Matchmaking — IMPLEMENTED

Exact small-pool partitioning plus deterministic heuristic large-pool optimization with explicit optimality labels.

## Pod Repair V2 — IMPLEMENTED / EXPOSED

Cross-table 1↔1 swap audit with real before/after mismatch improvement.

## Event / LGS flow — IMPLEMENTED ENGINEERING

Persistent sessions use versioned Aeon shares. Bounded public Moxfield/Archidekt URL analysis can be used locally without being silently treated as calibration-grade Reality data.

**Deployment boundary:** migrations/code in Git are not proof of staging or production deployment.

---

# 8. P6 — Causal Deck Doctor

Implemented:

- measured variant delta explanations;
- constrained variant selection;
- target-pod compatibility evaluation;
- pod repair/alternate deck preferred before modification.

Boundary: candidate generation remains external; Aeon ranks supplied analyzed/legal candidates rather than treating opaque generation as semantic truth.

---

# 9. P7 — Aeon Reality

Instrumentation/evaluation plumbing exists for bounded post-game observations tied to the exact pre-game aggregate prediction shown to the table.

Implemented evaluation primitives include Brier score, prevalence baseline, Brier improvement, AUC, calibration bands/MAE, distinct-pod count, pod-size cohorts and promotion-readiness requirements.

**Scientific boundary:** synthetic fixtures prove plumbing, not real-world accuracy. No exact public good-game probability until held-out real observations pass baseline-superiority, calibration, cohort and leakage review.

---

# 10. Privacy invariants

Public intelligence must never leak private deck evidence because a new model is added.

Validated protections through PR #18 include:

- no decklist;
- no Oracle text;
- no private evidence-card lists;
- no suppressed SPOF contributor names;
- no combo-piece names;
- no combo-line names in sanitized Combo Accessibility;
- no combo `cards[]` arrays;
- no raw private counterfactual payloads;
- no private names inside structured combo prerequisite payloads.

Threat/answer/timing/prerequisite information exposed publicly is aggregate and versioned.

---

# 11. Validation discipline

Every authoritative validation runs the complete gate:

1. Smoke;
2. Semantic contracts;
3. Metamorphic contracts;
4. Product contracts;
5. Public precon contract;
6. Adversarial audit;
7. Build.

PR #18 authoritative validation:

- validated code: `ac428c69af849595c121a35580d198e927c3200f`;
- workflow: `P2-P7 product validation #276`;
- result: **SUCCESS** on every gate.

Dedicated PR #18 regressions prove structured blocker determinism, strict-vs-context distinction, missing/unknown-line fallbacks, Threat Object numeric invariance, Threat Profile V4 versioning, local wording and public sanitization.

---

# 12. Remaining genuine work after PR #18

The following items are **not bugs hidden by the current models**. They are the real next evidence/engineering steps if work resumes.

## 12.1 Tutor eligibility graph — HIGH PRIORITY

Current Combo T5/T7/T9 timing intentionally ignores tutors.

To improve it safely, Aeon needs a tutor-resolution graph that can answer:

- which tutor can find which combo piece;
- card-type/name/mana-value restrictions;
- source/destination zone;
- one-shot versus repeatable access;
- whether the tutor itself is realistically accessible/castable by the target turn.

Only then should tutor-assisted combo timing exist.

## 12.2 Rules-aware execution evaluators for selected combo lines — HIGH PRIORITY

`combo-execution-eligibility-v1` now tells us exactly which dimensions are missing. Next work can implement those dimensions one by one instead of adding another opaque score.

Candidate evaluators:

- cast + activation mana sequence;
- dynamic X payment;
- command-zone tax when a commander is a combo piece;
- graveyard piece location/resource count;
- exile/escape costs;
- imprint state;
- aura targeting sequence;
- counter thresholds;
- storm count;
- positive-mana loop proof;
- loop exit condition;
- library-state transitions.

A line should move from `unsupported` to `known` only when its exact required state is represented.

## 12.3 Exact combo execution timing — BLOCKED BY 12.1/12.2

Do **not** create this as another heuristic percentage.

It becomes legitimate only when all strict prerequisites for a supported line can be evaluated inside a deterministic state model. Even then, keep separate concepts for:

- pieces seen;
- line executable;
- line protected/resilient;
- line wins under actual opponent interaction.

These are not interchangeable probabilities.

## 12.4 Line-specific answerability — MEDIUM/HIGH PRIORITY

Current combo Threat Objects use broad relevant answer classes. Improve this by deriving answer windows from the actual structured line:

- stack interaction before resolution;
- creature/artifact/enchantment removal only while the relevant permanent exists;
- graveyard interaction only for graveyard-dependent steps;
- whether removing one piece actually breaks the line at that point.

This would make Threat–Answer more causal without changing power scoring.

## 12.5 Combo catalog provenance / coverage — MEDIUM PRIORITY

The current known-combo catalog is deliberately small and hand-maintained.

Future work should add:

- versioned provenance;
- canonical names/aliases;
- validated prerequisite metadata;
- fixture coverage across more Commander archetypes;
- controlled integration of external combo data without treating community labels as semantic truth.

## 12.6 Mulligan-aware access modeling — MEDIUM PRIORITY

Raw-draw Combo V2 intentionally uses opening seven + one draw per turn. A later access model could incorporate the existing mulligan simulator only after confirming that keep/bottom policy does not introduce misleading combo-specific assumptions.

## 12.7 Answer Timing precision — MEDIUM PRIORITY

Answer Profile V2 still approximates card-specific timing through draw probability + mana-value gating. Potential improvements:

- colored mana availability;
- alternative costs;
- conditional costs;
- tutor-assisted answers;
- actual sequence competition for mana/resources.

## 12.8 SPOF suppression promotion study — EVIDENCE PRIORITY

Compare semantic dependency scores with paired suppression deltas across curated decks and later Reality observations before deciding whether counterfactual evidence should alter Vulnerability/Game Quality.

## 12.9 Agency ablation/calibration — EVIDENCE PRIORITY

Test whether Agency adds predictive information beyond current Game Quality inputs before any numerical promotion.

## 12.10 P7 real-world calibration — SCIENTIFIC PRIORITY

Still requires:

- real held-out observations;
- enough positive/negative outcomes;
- baseline superiority;
- calibration curves;
- pod-size/cohort review;
- leakage review;
- explicit promotion decision.

## 12.11 Model-version contract cleanup — ENGINEERING QUALITY

Model versions are intentionally explicit but currently distributed across several modules/tests. Repeated V3→V4→V5 snapshot changes showed the value of a small central product-version registry or contract helper to reduce stale-version-only CI failures without weakening versioning discipline.

This should be a refactor only; no numerical behavior change.

## 12.12 UX for uncertainty / blocker explanations — PRODUCT QUALITY

Current local UI prettifies blocker ids. Improve later with:

- human-readable localized requirement labels;
- distinction between `unknown` and `unsupported`;
- “what Aeon knows / cannot prove” explanation;
- drill-down without exposing private deck evidence in public shares.

## 12.13 Persistent direct LGS import — DEFERRED

Still intentionally deferred until server-side provenance, identity, abuse/cost control and calibration provenance are safe.

## 12.14 Final integrated-baseline replay — RELEASE GATE

When the separately managed semantic baseline is ready, replay/revalidate the complete product stack before integrated production promotion.

---

# 13. Suggested next-session order

If product work resumes, the cleanest order is:

1. tutor eligibility graph;
2. one or two rules-aware execution evaluators for carefully selected combo lines;
3. line-specific Threat answerability/windows;
4. broader combo catalog only after the prerequisite schema proves stable;
5. curated deck/line fixtures and ablation work;
6. Reality calibration work when enough real observations exist.

Do not jump directly to “combo win %”. The current architecture is now explicitly designed to make that impossible until the evidence supports it.

---

# 14. Definition of complete for a product increment

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

Current session stopping point:

> **PR #18 is engineering-complete and fully validated. Combo Execution Eligibility V1 and Threat Profile V4 are now part of the validated stacked product-intelligence architecture. Remaining work is explicitly listed above and intentionally deferred to a future session.**
