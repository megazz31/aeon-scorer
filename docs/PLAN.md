# Aeon Scorer — Product Plan P2 → P7

> Final engineering roadmap and audit journal for the P2→P7 Commander Intelligence layer.
>
> This document deliberately separates **implemented engineering**, **experimental product intelligence**, **database deployment**, and **scientific calibration/promotion**. Those states must never be conflated.

---

# 0. Final branch status

**Working branch:** `product-p2-p7-roadmap`  
**Validation PR:** `#10`  
**Base branch:** `product-p0-p1` at `1f92c521857cd2245a786c52dcbcc9573f736a9c`  
**Validated code commit:** `7d8443268a1049290ad619ec7bf4a0b4ce499a45`  
**Full validation:** `P2-P7 product validation #184` — **SUCCESS**  
**Merge policy:** PR remains draft; **no merge without explicit approval**.

## Final status matrix

| Phase | Focus | Engineering status | Promotion status |
|---|---|---|---|
| P2 | Experience Intelligence | **IMPLEMENTED V1** | Experimental |
| P3 | Pod Intelligence | **IMPLEMENTED V2** | Experimental |
| P4 | Game Quality Engine | **IMPLEMENTED V2** | Categorical only; no exact probability |
| P5 | Aeon Match | **IMPLEMENTED V1** | Migration/staging deployment still required |
| P6 | Causal Deck Doctor | **IMPLEMENTED V1** | Candidate generation intentionally external |
| P7 | Aeon Reality | **Instrumentation + evaluation IMPLEMENTED** | Scientific promotion blocked on real observations + holdout |

**P2→P7 engineering roadmap: complete for this validation branch.**  
**Exact good-game probability: intentionally NOT promoted.**  
**SQL migrations in Git: code-ready, not evidence of deployment.**

---

# 1. Product thesis and invariants

Aeon must not become another Commander tool whose primary promise is “your deck is a 7/10”.

The product direction is:

> **Understand what a deck can do, when it can do it, what it depends on, whether the table can answer it, whether the pod is structurally compatible, and what minimal action can repair a bad game before it starts.**

North star:

> **Will these decks produce the kind of Commander game these players want to play?**

Non-negotiable invariants:

1. no moralized salt/toxic deck score;
2. Brackets, Game Changers, Spellbook and feedback remain context/evidence, not semantic truth;
3. no hidden collapse of every signal into one opaque score;
4. no exact good-game probability before P7 promotion gates pass;
5. human intent is requested only where it changes interpretation;
6. public shares never expose decklists, Oracle evidence, private evidence-card lists or user-private payloads;
7. observations never rewrite semantic truth or core power automatically;
8. important product outputs carry explicit model versions/confidence;
9. P2→P7 remains parallel to the existing Aeon 0–100 scoring model.

## Core-score isolation audit

Against base `1f92c521857cd2245a786c52dcbcc9573f736a9c`, `src/engine/powerModel.js` contains exactly **6 added lines and 0 deleted lines**:

- three product-model imports;
- `result.experience`;
- `result.friction`;
- `result.horizon`.

No existing P20 / median / P80 / peak formula, simulation coefficient or calibration coefficient is modified by this roadmap branch.

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

Locked properties:

- bounded scores;
- evidence-bearing dimensions;
- unrelated raw-score changes do not secretly rewrite the fingerprint;
- speed-only changes do not arbitrarily alter unrelated dimensions;
- higher tail raises volatility;
- commander reliance raises dependency;
- repeated/chained behavior raises turn complexity.

## 2.2 Table Friction

**Model:** `friction-v1`  
**Output:** `result.friction`

Signals include resource denial/taxes, mass land denial, commander lockout, theft/control exchange, extra-turn recurrence, forced discard/sacrifice, restriction stacking and long sequencing.

Friction is descriptive, not moral. Persistent/repeated patterns carry more weight than incidental one-shot presence. Observer-only text is guarded against false friction classification.

## 2.3 Goldfish Horizon

**Model:** `goldfish-horizon-v1`  
**Output:** `result.horizon`

Curves:

- commander online;
- engine operational;
- meaningful interaction;
- draw/recursion resource action;
- burst/high-impact line.

Semantic boundary is explicit:

- commander: `online-by-turn`;
- engine / interaction / resource / burst: `available-on-turn`.

Aeon does **not** convert on-turn availability into fake cumulative first-access probabilities. The local Intelligence panel now exposes the first ≥50% milestone together with the curve semantics.

## 2.4 Single Point of Failure — SPOF

**Model:** `spof-v1`  
**Commander counterfactual:** `commander-tax-counterfactual-v1`

Paired deterministic command-zone stress scenarios:

- baseline;
- +2 tax;
- +4 tax;
- command-zone card unavailable.

The same deterministic seed is reused across scenarios. Tests require tax/unavailability stress to be monotonic in commander access. The local UI exposes +2/+4/unavailable median deltas.

Other dependency classes — graveyard, artifact, enchantment and creature board — remain explicitly `semantic-proxy` until interpretable suppression simulation exists.

---

# 3. P3 — Pod Intelligence — IMPLEMENTED V2

## 3.1 Answer Profile

**Model:** `answer-profile-v1`

Classes:

- stack;
- creature;
- artifact;
- enchantment;
- graveyard;
- wipe.

Class timing scales simulated general-interaction access by semantic class coverage. It is not represented as a rules-complete card-by-card casting simulation.

## 3.2 Threat Profile

**Model:** `threat-profile-v1`

Threat classes include combo, graveyard engine, artifact engine, enchantment engine, creature board and extra-turn loop. Each threat declares relevant answer classes.

## 3.3 Threat–Answer Timeline

**Preferred model:** `threat-answer-v2`  
**Fallback:** `threat-answer-v1`

V2 compares each deck’s threat classes by turn against the relevant answer classes available across the rest of the pod.

## 3.4 Adaptive Rule 0

**Model:** `adaptive-rule0-v1`

Aeon asks at most three high-information intent questions when detected uncertainty is material — for example combo intent, repeated extra turns or mass-land-denial acceptance. Answers are player intent, never semantic truth.

## 3.5 Advanced Pod Match

**Model:** `advanced-pod-match-v2`  
**Orchestrator:** `pod-intelligence-v2`

Visible mismatch terms include:

- median gap;
- normal-range overlap;
- peak gap;
- speed gap;
- explosiveness gap;
- volatility gap;
- friction gap;
- **Threat–Answer exposure**.

Threat–Answer is a real mismatch component, not decorative output. A dedicated regression proves that exposed Threat–Answer windows independently increase mismatch even when the normal power profile is otherwise held constant.

Older P0/P1 shares without product intelligence remain usable through the original range comparison fallback.

---

# 4. P4 — Game Quality Engine — IMPLEMENTED V2

## 4.1 Game Quality / Non-Game Risk

**Model:** `game-quality-v2`

Categorical risk combines:

- multi-axis Pod Match mismatch;
- exposed Threat–Answer windows;
- commander SPOF;
- friction characteristics;
- vulnerability-versus-opponent-answer hard counters.

Hard-counter matching includes graveyard hate, artifact/enchantment answers, creature removal/wipes, stack interaction and opposing resource denial where relevant.

Output remains categorical guidance (`low/moderate/high`, `good/mixed/poor`). It is **not** a win rate or exact good-game probability.

## 4.2 Combo Accessibility

**Model:** `combo-access-v1`

V1 separates combo presence from structural accessibility using combo size, commander participation, tutors, draw, fast mana and burst evidence.

The contract explicitly exposes:

```text
timing.status = not-simulated
targetWindows = T5 / T7 / T9
```

No exact T5/T7/T9 probability is emitted until piece-specific tutor eligibility, zones/prerequisites and dedicated access simulation exist.

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

Commander-removal vulnerability can use paired counterfactual evidence. Other classes remain explicit semantic/behavioral proxies.

---

# 5. P5 — Aeon Match — IMPLEMENTED V1

## 5.1 N-player matchmaking

**Model:** `aeon-match-v1`

Supports up to 64 loaded public Rule 0 shares, forming complete tables of four.

- complete pools up to 12 players: exact exhaustive partition for the current objective;
- larger pools: deterministic greedy construction + improving cross-table swaps;
- deterministic tie-breaking;
- 64-player regression verifies repeatability;
- incomplete remainder is explicitly returned as `unassigned`, not hidden inside uneven tables.

Large pools do not claim global optimality.

## 5.2 Pod Repair

**Model:** `pod-repair-v1`

Preferred repair order remains:

1. rearrange/swap players or decks;
2. choose another registered deck;
3. explicitly accept an asymmetry;
4. only then tune a deck if the player opts in.

## 5.3 LGS / event sessions

Route: `/match`

Implemented:

- authenticated organizer creation;
- anonymous join with a public Rule 0 share code;
- 4–64 session capacity;
- six-hour expiry;
- open / locked / closed state;
- organizer secret stored only as SHA-256 hash server-side;
- transactional row lock for capacity checks;
- idempotent repeated joins;
- public share codes only — no private deck payloads;
- direct `/match?session=…` Vercel route;
- QR-ready join URL without sending session data to a third-party QR service.

Migration presence in Git is **not** treated as deployment. Non-production migration application and smoke tests remain a release gate after an approved integration path.

---

# 6. P6 — Causal Deck Doctor — IMPLEMENTED V1

## 6.1 Causal What-if

**Model:** `deck-doctor-explain-v1`

Before/after analysis explains deltas in:

- P20 / median / P80 / peak;
- speed;
- interaction;
- resilience;
- explosiveness;
- commander dependency;
- turn complexity;
- package strength.

The local What-if UI exposes these deltas without pretending a single card caused every correlated model change.

## 6.2 Constrained variant selection

**Model:** `deck-doctor-v1`

Objectives include reducing peak while preserving median, reducing commander dependency, increasing interaction, bounded metric objectives and target-pod compatibility.

## 6.3 Targeted Pod Tuning

**Model:** `targeted-pod-tuning-v1`

Supplied analyzed variants are evaluated against the **actual pod peers** using `pod-intelligence-v2`. The output reports baseline mismatch, candidate mismatch and improvement.

Boundary intentionally retained:

- V1 ranks supplied legal/analyzed candidates;
- card generation, budget rules and legality filtering remain explicit upstream responsibilities;
- no generic opaque AI suggestion layer is promoted as semantic evidence;
- Pod Repair remains preferred before asking a player to modify a deck.

---

# 7. P7 — Aeon Reality — INSTRUMENTATION + EVALUATION IMPLEMENTED

## 7.1 Observation collection

**Summary model:** `aeon-reality-v1`

The optional post-game form stores bounded observational data only:

- turn band;
- win type;
- perceived balance;
- dominant event;
- pod size;
- pod model version;
- engine/semantic versions;
- anonymized SHA-256 pod fingerprint;
- the **pre-game aggregate prediction actually produced by Aeon**.

Prediction fields:

- predicted risk score;
- predicted risk level;
- predicted Pod Match mismatch;
- predicted maximum Threat–Answer gap.

Required safeguards:

- prediction cannot silently default to `0/low`;
- pod size must be 2–8 at the observation contract layer;
- risk level must agree with the score bands;
- prediction values must be 0–100;
- version arrays and version-string lengths are bounded;
- same-pod submissions use a transaction advisory lock before the hourly rate-limit count;
- raw observation-table read access is not granted to anon/authenticated clients.

Not stored in the observation table:

- decklists;
- Oracle text;
- card names/lists;
- raw Rule 0 share codes;
- email;
- IP address;
- user agent.

## 7.2 Calibration evaluation

**Evaluation:** `reality-calibration-eval-v1`  
**Readiness:** `calibration-readiness-v2`

Implemented metrics:

- severe-imbalance prevalence;
- Brier score;
- constant-prevalence baseline Brier;
- Brier improvement;
- AUC;
- low/moderate/high calibration bands;
- calibration MAE;
- distinct-pod count;
- observation counts by pod size.

Synthetic regression fixtures prove the evaluation plumbing, **not** real-world calibration.

## 7.3 Scientific promotion gate

The experimental risk score must not become an exact public probability until all of the following pass on real observations:

- sufficient game count;
- sufficient distinct pods / independent cohorts;
- positive and negative outcomes;
- held-out evaluation;
- baseline superiority;
- calibration-curve review;
- pod-size cohort review;
- pod/playgroup leakage protection;
- no material cohort failure.

`calibrationReadiness()` is necessary, not sufficient. A human promotion decision on held-out evidence is still required.

---

# 8. Privacy and public-share architecture

Public Rule 0 shares can carry only sanitized product intelligence needed for comparison:

- scores/levels;
- model versions;
- sanitized temporal curves;
- sanitized SPOF/vulnerability classes;
- sanitized answer/threat profiles.

They strip decklist, Oracle text, evidence-card names/lists and private analysis payloads. Sanitization exists client-side and again in the SQL share RPC. Sentinel-private-string tests verify that private evidence does not survive serialization.

---

# 9. Final validation and audit

## 9.1 Full CI gate

Validated code commit: `7d8443268a1049290ad619ec7bf4a0b4ce499a45`  
Workflow: `P2-P7 product validation #184`  
Conclusion: **SUCCESS**

All steps passed:

1. Smoke — success;
2. Semantic contracts — success;
3. Metamorphic contracts — success;
4. Product contracts — success;
5. Public precon contract — success;
6. Adversarial audit — success;
7. Build — success.

Product coverage includes:

- Experience Fingerprint independence;
- friction recurrence/directionality;
- Goldfish Horizon no-fake-cumulative invariant;
- paired commander baseline/+2/+4/unavailable SPOF monotonicity;
- Threat–Answer contribution to Pod Match mismatch;
- vulnerability-versus-answer hard-counter risk;
- exact 8-player matchmaking vs brute force;
- deterministic 64-player matchmaking;
- targeted pod variant tuning;
- sanitized public-share round trip;
- P7 mandatory pre-game prediction + pod size + risk-level consistency;
- Brier/AUC/calibration plumbing;
- session token hashing/capacity/idempotence/table revocation;
- transaction-safe P7 rate limiting;
- direct `/match` deployment route.

## 9.2 Final base→code diff audit

Base: `1f92c521857cd2245a786c52dcbcc9573f736a9c`  
Validated code: `7d8443268a1049290ad619ec7bf4a0b4ce499a45`

Findings:

- branch is ahead of base and not behind;
- changed files are confined to the expected P2→P7 product layer, tests, workflow, SQL migrations, product UI/routing and documentation;
- neither `sequenceSimulator.js` nor `sequenceSimulatorMulti.js` is modified by the final branch diff;
- `powerModel.js` remains +6 / -0 and does not change existing scoring formulas;
- no unrelated repository subsystem was altered;
- PR #10 remained open, draft, mergeable and unmerged during validation.

## 9.3 Documentation-only finalization rule

This `PLAN.md` finalization occurs after the validated code commit and is ignored by the dedicated workflow by design. Any final branch-head difference from `7d844326…` must therefore be audited to contain **documentation only**. If any non-document file changes after `7d844326…`, the full CI gate must run again before the branch can be called final.

---

# 10. Explicit boundaries — not hidden TODOs

These are intentional evidence boundaries, not forgotten implementation work:

1. Goldfish interaction/resource/burst remains `available-on-turn`; true cumulative first-access needs simulator instrumentation.
2. Non-commander SPOF classes remain semantic proxies until suppression simulation is causally interpretable.
3. Threat-class timing is semantic scaling of simulated interaction access, not rules-complete casting simulation.
4. Combo T5/T7/T9 exact probabilities are not emitted until piece/zone/tutor-prerequisite simulation exists.
5. Aeon Match beyond 12 players is deterministic heuristic, not a claimed global optimum.
6. Deck Doctor V1 evaluates supplied analyzed candidates; autonomous card generation is not semantic evidence.
7. P7 is not scientifically calibrated until real observations and holdout promotion gates pass.
8. SQL migrations are versioned code, not proof that staging/production applied them.

Removing one of these warnings without supplying the missing evidence is a regression.

---

# 11. Release / promotion gates after this branch

## Engineering integration gate

Before any merge:

- explicit user approval;
- upstream `product-p0-p1` relationship reviewed / integration path chosen;
- PR can be taken out of draft only deliberately;
- no new non-document commit may bypass the full quality workflow.

## Database deployment gate

After an approved integration path:

1. apply migrations to non-production first;
2. smoke sanitized `aeon_create_analysis_share`;
3. smoke Aeon Reality observation submission;
4. smoke Match create/join/lock/close;
5. verify anon/authenticated RLS and grants;
6. only then promote migrations to production.

## Scientific P7 promotion gate

Collect real observations, then evaluate held-out AUC/Brier/calibration, baseline superiority, pod-size cohorts and leakage. Until that succeeds, Game Quality remains **categorical experimental guidance**.

---

# 12. Definition of completion for PR #10

The branch is engineering-complete when all of the following are simultaneously true:

- P2→P7 models above exist with explicit versions/boundaries;
- privacy/deployment contracts pass;
- full Aeon quality suite passes on the last non-document code commit;
- base→code diff audit finds no scoring-coefficient or unrelated changes;
- any later branch-head changes are documentation-only;
- `docs/PLAN.md` and PR metadata describe the actual implementation rather than an earlier phase;
- PR remains open/draft/unmerged pending explicit approval.

At that point the correct statement is:

> **P2→P7 engineering validation is complete. P7 scientific calibration and database deployment remain deliberately gated future promotion steps, not unfinished hidden engineering.**
