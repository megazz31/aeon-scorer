# Aeon Scorer — Product Plan P2 → P7

> Living roadmap **and execution log** for turning Aeon from a deck power analyzer into a **Commander Intelligence Engine** focused on game quality, matchup fit and explainable causal analysis.
>
> This file is the source of truth for P2–P7. Every implementation pass must update the progress ledger, decisions, tests, limitations and next step here.

---

## 0. Live execution status

**Working branch:** `product-p2-p7-roadmap`  
**Validation PR:** `#10 — P2-P7 roadmap — Experience Intelligence foundation`  
**Base branch:** `product-p0-p1`  
**Merge policy:** validation branch only; no merge without explicit approval.  
**Implementation rule:** small auditable commits, evidence-first behavior, no hidden coefficient tuning to make outputs look right.

### Phase status

| Phase | Focus | Status |
|---|---|---|
| P2 | Experience Intelligence | **IN PROGRESS — Fingerprint V1 + Friction V1 + Horizon V1 implemented** |
| P3 | Pod Intelligence | PLANNED |
| P4 | Game Quality Engine | PLANNED |
| P5 | Aeon Match | PLANNED |
| P6 | Causal Deck Doctor | PLANNED |
| P7 | Aeon Reality | PLANNED — instrumentation starts early |

### Progress ledger

#### 2026-08-22 — P2/P7 roadmap branch initialized

- Created `product-p2-p7-roadmap` from `product-p0-p1`.
- Reworked this roadmap into a living implementation document.
- P2 is the first implementation target.
- Initial P2 order is locked to:
  1. shared evidence/result contracts;
  2. Experience Fingerprint V1;
  3. Table Friction V1;
  4. Goldfish Horizon V1;
  5. SPOF V1;
  6. curated regression fixtures and UI exposure.
- No P2 metric may silently modify the existing Aeon 0–100 power score.
- P7-facing version/evidence fields must be designed into P2 outputs from the start.

#### 2026-08-22 — Experience Fingerprint V1 implemented

- Added `src/engine/experienceModel.js` with product model version `experience-v1`.
- Added eight evidence-bearing dimensions: tempo, explosiveness, volatility, interaction, resilience, inevitability, dependency and turn complexity.
- Added decomposed confidence fields: semantic, simulation, product calibration and evidence coverage.
- Product calibration is explicitly `experimental`.
- `analyzePower()` now exposes the model as `result.experience`.
- Existing Aeon score formulas were not changed; Experience Fingerprint is a parallel output only.
- Added `scripts/experience-model-test.mjs` and included it in `npm run test:product`.
- Tests lock important invariants:
  - every dimension is bounded and carries evidence;
  - speed-only changes only move tempo;
  - higher peak tail increases volatility;
  - commander delta increases dependency;
  - recurring/chained actions increase turn complexity;
  - changing only the raw Aeon median does **not** secretly move the Experience Fingerprint.
- Added `.github/workflows/product-p2-p7-validation.yml` for branch/stack validation.
- Validation run `P2-P7 product validation #2` completed successfully: product contracts **green**, build **green**.
- Opened draft PR #10 against `product-p0-p1` for isolated review.

#### 2026-08-22 — Table Friction V1 implemented

- Added `src/engine/frictionModel.js` with model version `friction-v1`.
- `analyzePower()` now exposes `result.friction` after Experience Fingerprint calculation.
- V1 signals:
  - Resource denial / taxes;
  - Mass land denial;
  - Commander lockout;
  - Theft / control exchange;
  - Extra-turn recurrence;
  - Forced discard / sacrifice;
  - Restriction stacking potential;
  - Long sequencing potential.
- Friction is explicitly descriptive and non-moralized; no global “salt/toxic” score is produced.
- Recurring/persistent effects count more than one-shot effects and redundant restrictions increase evidence strength.
- `lockPotential` requires multiple persistent restrictions and explicitly does **not** claim a deterministic hard lock.
- Long sequencing reuses the Experience Fingerprint turn-complexity evidence rather than inventing a separate opaque heuristic.
- Added `scripts/friction-model-test.mjs` to `npm run test:product`.
- Adversarial tests include:
  - stacked persistent restrictions > single tax effect;
  - one-shot mass land destruction remains one-shot evidence;
  - theft is surfaced;
  - observer-only “whenever an opponent discards” does not become forced discard;
  - extra-turn text is surfaced;
  - moralized labels are absent from model output.
- Deterministic-loop classification is intentionally deferred until combo evidence carries reliable loop/prerequisite metadata.

#### 2026-08-22 — Goldfish Horizon V1 implemented and validated

- Added `src/engine/goldfishHorizon.js` with model version `goldfish-horizon-v1`.
- `analyzePower()` now exposes `result.horizon`.
- V1 exposes temporal curves for:
  - commander online;
  - engine operational;
  - meaningful interaction available;
  - draw/recursion resource action available;
  - burst/high-impact line available.
- Each curve exposes 25/50/75 threshold milestones where available.
- Critical semantic decision: **do not turn the existing on-turn simulator values into fake cumulative first-access probabilities**.
- Therefore V1 explicitly distinguishes:
  - commander: `online-by-turn`;
  - engine / interaction / resource / burst: `available-on-turn`.
- Added `scripts/goldfish-horizon-test.mjs` to `npm run test:product`.
- Test locks a deliberately non-monotonic engine series to ensure Aeon does not silently force it into a cumulative-looking curve.
- Model notes explicitly state that Horizon is temporal access, not a win-probability curve.
- Validation run `P2-P7 product validation #22` completed successfully: product contracts **green**, build **green**.

#### 2026-08-22 — P2 isolation audit and CI hygiene

- Validation runs `#24`, `#26` and `#28` completed successfully: product contracts **green**, build **green**.
- Compared branch implementation against `product-p0-p1` base: the P2 product layer adds outputs without editing the existing power/calibration formulas.
- At the isolation checkpoint, `src/engine/powerModel.js` contained **6 added lines and 0 deleted lines**: product-model imports plus `result.experience`, `result.friction` and `result.horizon` assignments.
- No existing Aeon structural/calibration formula was edited in this branch.
- Updated `.github/workflows/product-p2-p7-validation.yml` so commits touching only `docs/PLAN.md` are ignored by CI. This keeps the roadmap continuously current without wasting validation runs.
- Code/workflow changes still trigger `npm run test:product` + build.
- PR #10 remains draft and unmerged.

### Known P2 V1 limitations

- `dependency` is intentionally command-zone focused until SPOF V1 adds generalized counterfactual dependency.
- `inevitability` is a structural proxy, not a validated real-game inevitability probability.
- `turnComplexity` uses semantic/recurrence evidence but is not yet calibrated against observed turn duration.
- Friction V1 detects structural Oracle patterns but does not yet model multi-card hard locks as proven deterministic states.
- Goldfish Horizon V1 is limited by the current simulator horizon (`maxTurn`, currently 7 in standard analysis) and does not fabricate T8–T10 values.
- True cumulative “first access by turn” for interaction/resource/burst requires the sequence simulator to record first-access events explicitly; that extension is deferred rather than approximated incorrectly.
- No UI surface is added yet; model/output contracts come first.
- PR #10 is stacked on P0/P1 and will ultimately need to follow the validated upstream branch state before production merge.

### Current next action

Design and implement the **SPOF counterfactual contract** before scoring SPOF itself. First target is a clean commander-unavailable / commander-tax experiment path that reuses fixed seeds and cannot recursively trigger product models. Generalized graveyard/artifact/enchantment suppression will only be added where the counterfactual remains interpretable.

---

# 1. Product thesis

Aeon must not become another tool whose main promise is:

> “Your Commander deck is a 7/10.”

A single power number cannot explain whether four decks will produce a good game.

Aeon’s long-term public utility is:

> **Understand what a deck can do, when it can do it, what it depends on, whether the table can answer it, whether four decks are likely to produce a compatible game, and what minimal change can repair a bad pod.**

The 0–100 score remains useful, but becomes only one output among several.

### Product north star

> **Will these decks produce the kind of Commander game these players want to play?**

### Core identity

Aeon must preserve:

1. **Semantic understanding** — roles, packages, bridges, payoffs, interaction and structural dependencies from Oracle text.
2. **Causal sequencing** — estimate what the deck can access and deploy over time instead of static counting.
3. **Explainability** — important conclusions must carry traceable evidence.
4. **Versionability** — product-model outputs must be reproducible and attributable to model/semantic versions.

---

# 2. Non-negotiable principles

## 2.1 No moralized deck labels

Do not create a punitive “salt score”. Stax, extra turns, denial, theft, fast combo and long sequencing are **experience characteristics**.

## 2.2 No popularity-as-truth

Commander Spellbook, Wizards Brackets/Game Changers, popularity data and community feedback are evidence/context, not semantic truth.

## 2.3 No hidden collapse into one score

Keep visible separately:

- P20 / median / P80 / peak;
- speed;
- explosiveness;
- consistency;
- interaction;
- resilience;
- dependency;
- friction characteristics;
- threat windows;
- answer windows;
- confidence.

## 2.4 No fake precision

Until real-game calibration exists, do not expose claims such as “73% probability of a good game”. Use transparent categories such as `low`, `moderate`, `high`, with reasons.

## 2.5 Human intent matters

Decklists cannot answer everything. Ask only high-information questions where intent materially changes pod assessment.

## 2.6 New product models do not rewrite power scoring by default

P2–P7 outputs are parallel product intelligence. Any future change to the core 0–100 score requires its own semantic/model validation pass.

---

# 3. Existing foundation — P0 / P1

P0/P1 provide:

- shareable sanitized Rule 0 cards;
- Pod Match for 2–4 shares;
- Commander Spellbook evidence;
- Moxfield / Archidekt refresh and diff;
- immutable deck versions;
- feedback routed to semantic audit;
- Brackets/Game Changers as parallel context;
- local What-if analysis;
- command-zone multi-card support tracked separately.

The key lesson is that Aeon is most useful when it moves from **score → explanation → comparison → action**.

---

# 4. Architecture shared by P2–P7

## 4.1 Separate internal models

Prefer distinct modules for:

- power/output;
- experience profile;
- friction;
- temporal horizon;
- dependency/SPOF;
- threat model;
- answer model;
- matchup/pod model;
- real-game calibration.

Do not create one giant formula.

## 4.2 Structured evidence contract

Higher-level conclusions should return machine-readable evidence. Target shape:

```js
{
  signal: 'exposed-threat-window',
  value: 0.72,
  level: 'high',
  source: 'simulation',
  evidenceCards: [],
  evidencePackages: [],
  reasons: [],
  confidence: 'experimental',
  modelVersion: 'experience-v1'
}
```

UI copy must be derived from evidence, not hidden heuristics.

## 4.3 Version everything important

Preserve where relevant:

- engine version;
- semantic version;
- product model version;
- iteration configuration;
- external-data source revision;
- timestamp.

## 4.4 Confidence is decomposed

Separate:

- semantic confidence;
- simulation stability;
- product-model calibration.

A model can be semantically reliable while still being product-calibration `experimental`.

---

# 5. P2 — Experience Intelligence

## Goal

Describe **what kind of game experience a deck tends to produce**, independently from raw power.

P2 provides primitives required by P3/P4.

## 5.1 Experience Fingerprint — IMPLEMENTED V1

### User question

> “What does playing with or against this deck actually feel like?”

### V1 dimensions

1. **Tempo** — how early meaningful development is established.
2. **Explosiveness** — ability to jump ahead in one turn.
3. **Volatility** — distance between normal and high/low outcomes.
4. **Interaction** — density and accessibility of meaningful answers.
5. **Resilience** — ability to continue/rebuild after disruption.
6. **Inevitability** — structural tendency to compound advantage.
7. **Dependency** — reliance on commander or narrow engines.
8. **Turn Complexity** — repeated/chained actions and trigger density.

### V1 implementation rule

Use existing Aeon evidence first. Avoid new hand-maintained card lists unless a semantic concept truly cannot be expressed otherwise.

### V1 output contract

```js
{
  modelVersion: 'experience-v1',
  dimensions: {
    tempo: { score: 0, level: 'low', evidence: [] },
    explosiveness: { score: 0, level: 'low', evidence: [] },
    volatility: { score: 0, level: 'low', evidence: [] },
    interaction: { score: 0, level: 'low', evidence: [] },
    resilience: { score: 0, level: 'low', evidence: [] },
    inevitability: { score: 0, level: 'low', evidence: [] },
    dependency: { score: 0, level: 'low', evidence: [] },
    turnComplexity: { score: 0, level: 'low', evidence: [] }
  },
  confidence: {
    semantic: 'high',
    simulation: 'high',
    productCalibration: 'experimental',
    evidenceCoverage: 'full'
  }
}
```

### Acceptance criteria

- definitions documented in code/tests;
- strongest evidence exposed per dimension;
- unrelated card change must not cause unrelated large shifts;
- fixtures separate glass-cannon, grind, interactive-control and commander-centric patterns;
- no fingerprint field directly modifies the core power score.

## 5.2 Table Friction Profile — IMPLEMENTED V1

### User question

> “What should the table know before this deck is played?”

### V1 signals

- resource denial / taxes;
- mass land denial;
- commander lockout;
- theft / control exchange;
- extra-turn recurrence;
- forced discard / sacrifice;
- restriction stacking potential;
- long sequencing potential.

### Rules

- descriptive, never moral;
- recurrence/redundancy matters more than one-off presence;
- every signal links to evidence;
- observer-only text cannot create false friction;
- deterministic hard-lock claims are not made without deterministic evidence.

## 5.3 Goldfish Horizon — IMPLEMENTED V1

### User question

> “When does this deck become operational or threatening?”

### V1 curves

- commander online (`online-by-turn`);
- engine operational (`available-on-turn`);
- meaningful interaction (`available-on-turn`);
- draw/recursion resource action (`available-on-turn`);
- burst/high-impact line (`available-on-turn`).

### Critical V1 rule

Do not relabel an on-turn probability as cumulative first-access probability. True first-access curves require first-access events to be tracked inside the simulator.

### Acceptance criteria

- fixed-seed deterministic upstream simulation;
- original turn-profile semantics preserved;
- thresholds documented;
- no hidden assumption that `engine online` equals `winning`;
- no fabricated turns beyond the simulator horizon.

## 5.4 Single Point of Failure — SPOF — NEXT

### User question

> “What single disruption hurts this deck the most?”

### Counterfactuals

- commander normal;
- commander +2 tax;
- commander +4 tax;
- commander unavailable;
- graveyard disabled;
- artifact/enchantment/creature-board dependencies where modelable;
- selected package disabled when causal semantics are reliable.

### Outputs

- commander dependency;
- graveyard dependency;
- artifact dependency;
- enchantment dependency;
- creature-board dependency;
- highest structural SPOF.

### Acceptance criteria

- based on causal delta, not card count;
- distinguish dependency from synergy;
- expose absolute/relative delta;
- counterfactual assumptions explicit;
- fixed seed between baseline and counterfactual where comparison is stochastic;
- product-model hooks disabled inside counterfactual runs to prevent recursive analysis.

---

# 6. P3 — Pod Intelligence

## Goal

Move from individual deck analysis to **interaction between temporal game plans**.

## 6.1 Threat–Answer Timeline

For each turn estimate:

- probability a deck presents a meaningful threat;
- probability opponents have a relevant answer in that same window.

Answer classes must remain separate:

- stack;
- creature;
- artifact;
- enchantment;
- graveyard;
- wipes;
- protection/anti-interaction;
- denial when relevant.

**Key principle:** a fast threat is not automatically a mismatch if the pod reliably answers it.

## 6.2 Adaptive Rule 0

Analyze first, then ask **0–3 high-information questions** only when player intent would materially change interpretation.

Responses affect matchup interpretation, never semantic truth.

## 6.3 Advanced Pod Match

Inputs:

- range overlap;
- median/peak gaps;
- volatility;
- speed/explosiveness;
- interaction profile;
- Threat–Answer mismatch;
- friction mismatch;
- player intent.

Every verdict must explain:

1. what differs;
2. magnitude;
3. why it may create a bad game;
4. what information could change the verdict.

---

# 7. P4 — Game Quality Engine

## Goal

Estimate **why a game is likely to become a non-game**, without pretending to simulate rules-complete multiplayer Magic.

## 7.1 Non-Game Risk / Game Quality Forecast

Initial mechanisms:

- one deck operates materially earlier;
- threat before relevant answers;
- severe high-roll asymmetry;
- structural hard counter;
- commander dependency vs heavy commander interaction;
- graveyard dependency vs graveyard hate;
- lock/denial disproportionately shuts off decks;
- combo accessibility exceeds answer windows;
- severe experience-intent mismatch.

V1 outputs categorical risk + causal reasons, never unsupported exact probability.

## 7.2 Combo Accessibility

Separate **combo presence** from **combo accessibility**.

Consider:

- pieces;
- commander participation;
- mana/colors;
- zones;
- compatible/conditional tutors;
- draw/selection;
- redundancy;
- recursion;
- protection;
- timing/prerequisites.

Target access windows: before T5 / T7 / T9 plus median access where meaningful.

## 7.3 Vulnerability Matrix

Candidate classes:

- graveyard hate;
- commander removal/tax;
- creature removal;
- wipes;
- artifact suppression;
- enchantment suppression;
- Rule of Law/cast restriction;
- counterspells;
- resource denial;
- exile interaction.

Prefer causal simulation where model quality permits; use semantic dependency otherwise and expose confidence.

---

# 8. P5 — Aeon Match

## Goal

Automatically form better Commander tables for public/LGS use.

## 8.1 N-player matchmaking

Target 16–64 players. Optimize multiple independent mismatch terms instead of one opaque power number.

Heuristic optimizer is acceptable if deterministic under a seed, benchmarked against exact small-N solutions and explainable.

## 8.2 Pod Repair

Repair hierarchy:

1. swap players/decks between tables;
2. choose another registered deck;
3. explicitly accept asymmetry;
4. adjust experience constraints;
5. only then offer deck micro-tuning when requested.

## 8.3 Fast public/LGS flow

Organizer session → QR → players join/import/share → optional intent → generate pods → table assignment.

No account should be required merely to join a public matchmaking session.

---

# 9. P6 — Causal Deck Doctor

## Goal

Turn What-if into **causal optimization under user constraints**.

## 9.1 Causal explanation

Every swap should explain mechanisms, not only score delta:

- timing changes;
- package changes;
- dependency changes;
- threat-window changes;
- median/peak changes.

## 9.2 Constrained Deck Doctor

Example intents:

- reduce peak without moving median much;
- reduce commander dependency;
- increase early interaction;
- improve pod compatibility;
- improve consistency without fast mana;
- remove an exposed threat window.

Architecture:

1. semantic candidate filtering;
2. fast controlled causal screening;
3. full-run confirmation for finalists.

## 9.3 Targeted Pod Tuning

Optional 1–2 micro-swaps for recurring playgroups, only after Pod Repair and only with explicit opt-in.

---

# 10. P7 — Aeon Reality

## Goal

Validate Aeon predictions against **real Commander games**.

## 10.1 Instrument early

Collect game observations before P7 model promotion. Never ask users for a numeric “true deck power”.

Minimal post-game data should stay <=30 seconds where possible:

- ending turn/band;
- win type;
- commander timing/disruption;
- perceived balance ordinal response;
- optional dominant event such as runaway start, lock or unanswered combo.

## 10.2 Validation questions

Test whether:

- Threat–Answer mismatch predicts non-games;
- peak asymmetry predicts runaway games;
- commander SPOF predicts failure into commander-heavy interaction;
- Experience Fingerprint mismatch predicts dissatisfaction despite similar power;
- Aeon-matched pods outperform random/manual baselines.

## 10.3 Confidence Model

Expose independently:

- semantic confidence;
- simulation stability;
- game-quality calibration state.

Exact game-quality probability remains forbidden until sufficient varied data, holdout validation, acceptable calibration and baseline superiority exist.

---

# 11. Feature priority

| Rank | Feature | Public utility | Differentiation | Feasibility |
|---:|---|---:|---:|---:|
| 1 | Game Quality / Non-Game Forecast | 10 | 10 | 7 |
| 2 | Threat–Answer Timeline | 10 | 10 | 7 |
| 3 | Aeon Match | 10 | 9 | 8 |
| 4 | Adaptive Rule 0 | 10 | 10 | 9 |
| 5 | Experience Fingerprint | 10 | 8 | 9 |
| 6 | Pod Repair | 10 | 9 | 8 |
| 7 | SPOF | 9 | 9 | 8 |
| 8 | Combo Accessibility | 9 | 9 | 7 |
| 9 | Real-game Validation | 10 | 10 | 5 |
| 10 | Vulnerability Matrix | 8 | 8 | 7 |
| 11 | Goldfish Horizon alone | 8 | 7 | 9 |
| 12 | Causal Deck Doctor | 8 | 9 | 6 |
| 13 | Confidence Model | 8 | 7 | 9 |
| 14 | Targeted Pod Tuning | 7 | 9 | 5 |
| 15 | Semantic Graph UI | 6 | 8 | 8 |

---

# 12. Validation strategy

## P2

Curated fixtures for:

- obvious stax vs non-stax;
- glass cannon vs grind;
- commander-centric vs commander-light;
- graveyard-centric vs independent;
- low vs high volatility;
- interactive vs low-interaction decks.

Use monotonic and adversarial changes.

## P3

Synthetic pods:

- same power/different speed;
- same power/unanswered combo;
- interaction-rich table;
- same median/extreme peak mismatch;
- compatible power/incompatible friction.

## P4

Compare against simple baselines:

- median spread only;
- P20–P80 overlap only;
- bracket only.

Game Quality Engine must materially outperform simple baselines before stronger claims.

## P5

Small N: heuristic vs exhaustive partitions.  
Large N: runtime, mean/worst mismatch, stability and constraints.

## P6

Every recommendation must pass legality, semantic fit, fast screening, full-run confirmation and controlled before/after comparison.

## P7

Use holdout separation, playgroup leakage protection, calibration curves, baselines and cohort analysis.

---

# 13. Success metrics

## Near term

- Rule 0 share creation/open rate;
- Pod Match completion;
- explainable mismatch reasons;
- What-if repeat usage;
- semantic feedback quality.

## Mid term

- Adaptive Rule 0 response rate;
- bad pods repaired;
- repeat playgroup use;
- LGS setup/session completion time.

## Long term north-star metric

> **Reduction in reported non-games / severe mismatches for Aeon-matched pods versus appropriate baselines.**

---

# 14. What Aeon must not become

- generic AI chat coach;
- crowd-rated power level;
- EDHREC clone;
- full rules engine as the first goal;
- bracket wrapper;
- opaque one-score matchmaking formula.

---

# 15. Implementation sequence

1. **Experience Fingerprint + Table Friction** — V1 models implemented.
2. **Goldfish Horizon + SPOF** — Horizon V1 implemented; SPOF next.
3. **Threat–Answer Timeline**.
4. **Adaptive Rule 0**.
5. **Game Quality / Non-Game Risk V1**.
6. **Combo Accessibility + Vulnerability Matrix**.
7. **Aeon Match + Pod Repair**.
8. **Causal Deck Doctor**.
9. **P7 calibration promotion** once observations are sufficient.

P7 instrumentation begins before step 9.

---

# 16. Definition of the future Aeon product

The completed direction should answer, in order:

- **Deck:** What can my deck do?
- **Time:** When can it do it?
- **Dependency:** What does it depend on?
- **Threat:** When does it create a must-answer situation?
- **Answer:** Can the other decks answer in time?
- **Experience:** What type of game does it create?
- **Intent:** What important information cannot be inferred from the decklist?
- **Pod:** Are these decks and players compatible?
- **Repair:** What is the smallest change that fixes a mismatch?
- **Reality:** Do real games confirm Aeon’s prediction?

---

# 17. Strategic decision rule

When choosing between future features, prefer the one that better answers:

> **“Will this help players avoid a bad Commander game before it starts?”**

If both do, prefer the one that can also explain **why**.