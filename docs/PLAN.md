# Aeon Scorer — Product Plan P2 → P7

> Living roadmap **and execution log** for turning Aeon from a deck power analyzer into a **Commander Intelligence Engine** focused on game quality, matchup fit and explainable causal analysis.
>
> This file is the source of truth for P2–P7. It distinguishes three things that must never be conflated: **implemented engineering**, **experimental product output**, and **scientifically/production-promoted behavior**.

---

# 0. Live status

**Working branch:** `product-p2-p7-roadmap`  
**Validation PR:** `#10`  
**Base branch:** `product-p0-p1`  
**Merge policy:** draft validation branch only; **no merge without explicit approval**.  
**Core-score policy:** P2–P7 must remain parallel product intelligence unless a separate power-model validation explicitly authorizes a scoring change.

## Overall status

**P2→P7 engineering roadmap: IMPLEMENTED.**  
**Scientific promotion of Game Quality probabilities: NOT PROMOTED — intentionally blocked on real-game data and holdout validation.**  
**Database migrations: code-ready in the branch, not considered deployed merely because the SQL exists in Git.**

| Phase | Focus | Engineering status | Promotion status |
|---|---|---|---|
| P2 | Experience Intelligence | **IMPLEMENTED V1** | Experimental product intelligence |
| P3 | Pod Intelligence | **IMPLEMENTED V2** | Experimental product intelligence |
| P4 | Game Quality Engine | **IMPLEMENTED V2** | Categorical only; no exact probability |
| P5 | Aeon Match | **IMPLEMENTED V1** | Ready for validation after migration deployment |
| P6 | Causal Deck Doctor | **IMPLEMENTED V1** | Candidate generation intentionally external |
| P7 | Aeon Reality | **Instrumentation + evaluation IMPLEMENTED** | **Calibration promotion blocked on real observations** |

## Non-negotiable product thesis

Aeon must not become another tool whose main promise is:

> “Your Commander deck is a 7/10.”

Aeon’s public utility is:

> **Understand what a deck can do, when it can do it, what it depends on, whether the table can answer it, whether four decks are likely to produce a compatible game, and what minimal change can repair a bad pod.**

North star:

> **Will these decks produce the kind of Commander game these players want to play?**

---

# 1. Invariants preserved during P2→P7

1. No moralized “salt/toxic” deck score.
2. Brackets, Game Changers, Spellbook and feedback remain context/evidence, never semantic truth.
3. No hidden collapse of every signal into one opaque number.
4. No exact “good game probability” before P7 promotion requirements are met.
5. Human intent is asked only where it materially changes interpretation.
6. Public shares never expose decklists, Oracle evidence, private evidence-card lists or user-private payloads.
7. Real-game feedback never rewrites card semantics or power truth automatically.
8. Product models carry explicit model versions/confidence.
9. The existing Aeon 0–100 score is untouched by P2→P7.

### Core-score audit

Compared with base `1f92c521857cd2245a786c52dcbcc9573f736a9c`, `src/engine/powerModel.js` contains **6 added lines and 0 deleted lines**:

- 3 product-model imports;
- `result.experience`;
- `result.friction`;
- `result.horizon`.

No existing structural/calibration coefficient or P20/median/P80/peak formula is edited by this roadmap branch.

---

# 2. P2 — Experience Intelligence — IMPLEMENTED V1

## 2.1 Experience Fingerprint

**Model:** `experience-v1`  
**Output:** `result.experience`

Dimensions:

- tempo;
- explosiveness;
- volatility;
- interaction;
- resilience;
- inevitability;
- dependency;
- turn complexity.

Rules locked by tests:

- bounded dimensions;
- evidence-bearing outputs;
- speed-only change does not arbitrarily move unrelated dimensions;
- higher tail increases volatility;
- commander dependence increases dependency;
- repeated/chained actions increase turn complexity;
- changing only the raw Aeon median does not secretly rewrite the fingerprint.

## 2.2 Table Friction

**Model:** `friction-v1`  
**Output:** `result.friction`

Signals:

- resource denial / taxes;
- mass land denial;
- commander lockout;
- theft / control exchange;
- extra-turn recurrence;
- forced discard / sacrifice;
- restriction stacking;
- long sequencing.

Friction is descriptive, not moral. Persistent/repeated patterns count more than incidental one-shot presence. Observer-only text is explicitly guarded against false forced-discard classification.

## 2.3 Goldfish Horizon

**Model:** `goldfish-horizon-v1`  
**Output:** `result.horizon`

Curves:

- commander online;
- engine operational;
- meaningful interaction;
- draw/recursion resource action;
- burst/high-impact line.

Critical semantic boundary:

- commander = `online-by-turn`;
- engine / interaction / resource / burst = `available-on-turn`.

Aeon **does not fabricate cumulative first-access probabilities** from non-cumulative simulator data. True first-access instrumentation is a future simulator promotion, not something approximated dishonestly in V1.

## 2.4 Single Point of Failure — SPOF

**Model:** `spof-v1`  
**Commander counterfactual:** `commander-tax-counterfactual-v1`

Commander dependency now runs paired deterministic stress scenarios:

- baseline;
- +2 command-zone tax;
- +4 command-zone tax;
- command-zone card unavailable.

The scenarios reuse the same deterministic sequence seed. For two command-zone cards, +2/+4 is applied equally to both as a command-zone dependency stress test.

Other dependencies:

- graveyard;
- artifact;
- enchantment;
- creature board.

These remain explicitly labeled `semantic-proxy` until suppression simulations can be interpreted reliably. Aeon does not pretend those proxies are causal loss probabilities.

---

# 3. P3 — Pod Intelligence — IMPLEMENTED V2

## 3.1 Answer Profile

**Model:** `answer-profile-v1`

Separate answer classes:

- stack;
- creature;
- artifact;
- enchantment;
- graveyard;
- wipe.

Timing is derived by scaling simulated general-interaction access using semantic class coverage. It is **not** presented as a rules-complete card-by-card casting simulation.

## 3.2 Threat Profile

**Model:** `threat-profile-v1`

Threat classes include:

- combo;
- graveyard engine;
- artifact engine;
- enchantment engine;
- creature board;
- extra-turn loop.

Each threat declares the answer classes that can plausibly interact with it.

## 3.3 Threat–Answer Timeline

**Preferred model:** `threat-answer-v2`  
**Fallback:** `threat-answer-v1`

V2 compares each threat against the **relevant answer classes** available across the rest of the pod. Output stays decomposed by turn and threat class.

## 3.4 Adaptive Rule 0

**Model:** `adaptive-rule0-v1`

Aeon asks at most three high-information questions when detected uncertainty is materially relevant, for example combo intent, repeated extra turns or mass-land-denial acceptance.

Answers are player intent, not semantic truth.

## 3.5 Advanced Pod Match

**Model:** `advanced-pod-match-v2`  
**Orchestrator:** `pod-intelligence-v2`

Independent mismatch terms include:

- median gap;
- normal-range overlap;
- peak gap;
- speed gap;
- explosiveness gap;
- volatility gap;
- friction gap;
- **Threat–Answer exposure**.

Threat–Answer is now a real mismatch term, not a side-panel decoration. The pair reasons expose its contribution separately.

---

# 4. P4 — Game Quality Engine — IMPLEMENTED V2

## 4.1 Game Quality / Non-Game Risk

**Model:** `game-quality-v2`

The V2 categorical risk model combines:

- multi-axis Pod Match mismatch;
- exposed Threat–Answer windows;
- commander SPOF;
- friction characteristics;
- explicit vulnerability-versus-opponent-answer hard counters.

Examples of hard-counter matching:

- graveyard dependency ↔ graveyard hate;
- artifact dependency ↔ artifact answers;
- enchantment dependency ↔ enchantment answers;
- creature-board dependency ↔ creature removal/wipes;
- spell/combo concentration ↔ stack interaction;
- resource-denial vulnerability ↔ opposing resource-denial profile.

Output remains `low / moderate / high` and `good / mixed / poor` style categorical guidance. **It is not a win rate and not an exact probability of a good game.**

## 4.2 Combo Accessibility

**Model:** `combo-access-v1`

V1 separates combo presence from accessibility using structural evidence:

- number of pieces;
- commander participation;
- tutors;
- draw;
- fast mana;
- burst access;
- combo size penalty.

The contract explicitly exposes:

```text
timing.status = not-simulated
targetWindows = T5 / T7 / T9
```

This is intentional. Exact T5/T7/T9 access is **not promoted** until Aeon has piece-specific tutor eligibility, zone/prerequisite semantics and dedicated access simulation. No fake timing number is emitted.

## 4.3 Vulnerability Matrix

**Model:** `vulnerability-v2`

Classes:

- commander removal;
- graveyard hate;
- artifact suppression;
- enchantment suppression;
- board wipes;
- creature removal;
- Rule of Law / cast restriction;
- counterspells;
- resource denial;
- exile interaction.

Commander-removal vulnerability can use paired causal commander counterfactuals. Other classes remain explicitly semantic/behavioral proxies until suppression simulation is trustworthy.

---

# 5. P5 — Aeon Match — IMPLEMENTED V1

## 5.1 N-player matchmaking

**Model:** `aeon-match-v1`

Supports 4–64 public Rule 0 shares.

- complete pools up to 12 players: **exact exhaustive partition** for the current Aeon Match objective;
- larger pools: deterministic greedy construction + local swaps;
- deterministic tie-breaking;
- 64-player regression verifies repeatability.

Large pools do not claim global optimality.

## 5.2 Pod Repair

**Model:** `pod-repair-v1`

Priority remains:

1. rearrange/swap players or decks;
2. choose another registered deck;
3. explicitly accept an asymmetry;
4. only then consider deck tuning if requested.

Aeon never forces deck modification as the first repair.

## 5.3 LGS / event session flow

Route: `/match`

Implemented:

- organizer creates a session while authenticated;
- participants can join anonymously with a public Rule 0 share code;
- 4–64 capacity;
- six-hour expiry;
- organizer open / locked / closed status;
- organizer secret stored only as a hash server-side;
- transactional row lock prevents concurrent over-capacity joins;
- repeated join is idempotent;
- only public share codes are stored, never private deck payloads;
- direct `/match?session=…` access is routed through Vercel;
- join link is ready for QR display without Aeon sending session data to a third-party QR provider.

Database migration exists in the branch. **Presence of the migration in Git is not considered deployment.** Migration application and staging smoke remain release gates after approval/merge.

---

# 6. P6 — Causal Deck Doctor — IMPLEMENTED V1

## 6.1 Causal What-if explanation

**Model:** `deck-doctor-explain-v1`

A before/after analysis explains deltas in:

- P20 / median / P80 / peak;
- speed;
- interaction;
- resilience;
- explosiveness;
- commander dependency;
- turn complexity;
- package strength.

It explains observed model changes without pretending one swapped card caused every correlated shift.

## 6.2 Constrained variant selection

**Model:** `deck-doctor-v1`

Supported objectives include:

- reduce peak while preserving median;
- reduce commander dependency;
- increase interaction;
- arbitrary bounded metric objective;
- target pod compatibility.

Constraints can bound median, peak and commander dependency.

## 6.3 Targeted Pod Tuning

**Model:** `targeted-pod-tuning-v1`

Supplied analyzed variants are evaluated against the **actual other decks in the pod** using `pod-intelligence-v2`. The output reports baseline mismatch, candidate mismatch and improvement.

Boundary intentionally preserved:

- V1 ranks supplied legal/analyzed candidates;
- it does not invent cards from an opaque AI suggestion layer;
- card candidate generation, budget rules and legality filtering remain explicit upstream responsibilities;
- full-run confirmation is required before future autonomous recommendations are promoted.

This boundary prevents a generic LLM recommendation layer from being mistaken for Aeon’s evidence-first causal engine.

---

# 7. P7 — Aeon Reality — INSTRUMENTATION + EVALUATION IMPLEMENTED

## 7.1 Observation collection

**Observation summary model:** `aeon-reality-v1`

Optional post-game form records only bounded observational data:

- turn band;
- win type;
- perceived balance;
- dominant event;
- pod model version;
- engine/semantic versions;
- hashed pod fingerprint;
- **the pre-game aggregate prediction that Aeon actually made**.

Stored prediction fields:

- predicted risk score;
- predicted risk level;
- predicted Pod Match mismatch;
- predicted maximum Threat–Answer gap.

Not stored:

- decklists;
- Oracle text;
- card lists;
- raw share codes;
- email/IP/user-agent in the observation table.

Raw observation table access is not granted to normal anon/authenticated clients. Submission is through a bounded SECURITY DEFINER RPC with rate limiting.

## 7.2 Calibration evaluation

**Evaluation model:** `reality-calibration-eval-v1`  
**Readiness model:** `calibration-readiness-v2`

Implemented evaluation metrics:

- severe-imbalance prevalence;
- Brier score;
- constant-prevalence baseline Brier;
- Brier improvement vs baseline;
- AUC;
- calibration bands low / moderate / high;
- calibration MAE;
- distinct-pod count.

## 7.3 Scientific promotion gate

Aeon must **not** publish the experimental risk score as an exact probability until all of the following are satisfied:

- sufficient real games;
- sufficient distinct pods / independent cohorts;
- both positive and negative outcomes;
- held-out evaluation;
- baseline superiority;
- calibration curve review;
- pod/playgroup leakage protection;
- no material cohort failure.

`calibrationReadiness()` is necessary, not sufficient. A true public-probability promotion still requires a held-out analysis decision.

No observation ever automatically rewrites semantic truth or core deck power.

---

# 8. Privacy / sharing architecture

Public Rule 0 shares can carry sanitized product intelligence needed for Pod Match, including scores, levels, model versions and temporal curves.

They explicitly strip:

- decklist;
- Oracle text;
- evidence-card names/lists;
- raw private analysis payload.

Sanitization exists both client-side and again in the SQL share RPC. Tests inject sentinel private strings and verify they do not survive public serialization.

Older shares without P2→P7 intelligence remain usable: `/pod` falls back to the original P0/P1 range comparison.

---

# 9. Validation strategy and current audit

The dedicated branch workflow now runs the **full Aeon quality suite**, not only product tests:

1. smoke;
2. semantic contracts;
3. metamorphic contracts;
4. P0–P7 product contracts;
5. public precon contract;
6. adversarial audit;
7. production build.

Dedicated P2→P7 regression coverage includes:

- Experience Fingerprint independence;
- friction recurrence/directionality;
- Goldfish Horizon no-fake-cumulative invariant;
- paired commander +2/+4/unavailable SPOF monotonicity;
- Threat–Answer contribution to Pod Match mismatch;
- vulnerability-versus-answer hard-counter risk;
- exact 8-player matchmaking vs brute force;
- deterministic 64-player matchmaking;
- targeted pod variant tuning;
- sanitized public-share round trip;
- P7 prediction-bearing observations;
- Brier/AUC/calibration contracts;
- session token hashing / capacity / idempotence / table revocation;
- direct `/match` deployment route.

### Validation history

- early P2 runs: product/build green;
- run `#127`: P7 calibration fixtures + product/build green;
- run `#145`: SPOF + Targeted Pod Tuning + product/build green;
- run `#159`: **full quality suite green** (smoke, semantic, metamorphic, product, public precons, adversarial audit, build);
- final post-route/contract validation: **pending at the time of this journal update**.

---

# 10. Known boundaries — explicit, not hidden TODOs

These are intentionally not misrepresented as completed scientific capabilities:

1. **Goldfish first-access:** interaction/resource/burst curves remain `available-on-turn`; cumulative first access needs simulator instrumentation.
2. **Non-commander SPOF:** graveyard/artifact/enchantment/board dependency remains semantic proxy until suppression simulation is causal enough.
3. **Threat class timing:** class availability scales simulated general interaction access; not rules-complete card-by-card casting.
4. **Combo T5/T7/T9:** target windows are declared but exact probabilities are not emitted until piece/zone/tutor-prerequisite simulation exists.
5. **Large-N Aeon Match:** deterministic heuristic beyond 12 players; no global-optimum claim.
6. **Deck Doctor candidate generation:** V1 evaluates supplied legal/analyzed candidates; autonomous card generation is not evidence enough to promote.
7. **P7 calibration:** no exact good-game probability until real observations + holdout validation pass.
8. **SQL deployment:** migrations are versioned code, not proof that production/staging has applied them.

These boundaries are part of the product contract. Removing the warning without adding the missing evidence would be a regression.

---

# 11. Release / promotion gates

## Engineering merge gate

Before any merge of PR #10:

- final full quality workflow green;
- final base→head diff audit;
- `powerModel.js` coefficient isolation confirmed;
- privacy/deployment contracts green;
- PR remains draft until explicit approval;
- upstream `product-p0-p1` relationship reviewed before retarget/rebase.

## Database deployment gate

After an approved integration path:

- apply migrations to a non-production environment first;
- smoke `aeon_create_analysis_share` with sanitized intelligence;
- smoke Aeon Reality observation submission;
- smoke create/join/lock/close Match session;
- verify RLS and grants from anon/authenticated roles;
- only then promote migrations to production.

## Scientific P7 promotion gate

Collect observations first. Then evaluate holdout AUC/Brier/calibration and baseline superiority. Until that succeeds, Game Quality remains **categorical experimental guidance**.

---

# 12. Definition of the implemented Aeon direction

The branch now provides an evidence-bearing answer path for:

- **Deck:** What can my deck do?
- **Time:** When can it operate?
- **Dependency:** What does it depend on?
- **Threat:** What kind of must-answer state can it present?
- **Answer:** Does this pod have the relevant answer class in time?
- **Experience:** What type of game does it tend to produce?
- **Intent:** What high-information Rule 0 question still needs a human answer?
- **Pod:** Are these decks structurally compatible?
- **Repair:** Can player/deck assignment improve the pod?
- **Tune:** Which supplied variant best improves the actual pod?
- **Reality:** Did observed games support the pre-game prediction?

Strategic decision rule remains:

> **Prefer the feature that best helps players avoid a bad Commander game before it starts — and prefer the version that can explain why.**
