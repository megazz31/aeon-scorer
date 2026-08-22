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

## Experience Fingerprint

**Model:** `experience-v1` — tempo, explosiveness, volatility, interaction, resilience, inevitability, dependency and turn complexity. Outputs are bounded, evidence-bearing and independent from hidden raw-score rewrites.

## Table Friction

**Model:** `friction-v1` — descriptive signals for resource denial/taxes, mass land denial, commander lockout, theft/control exchange, extra-turn recurrence, forced discard/sacrifice, restriction stacking and long sequencing. No moralized salt score.

## Goldfish Horizon

**Model:** `goldfish-horizon-v1` — commander `online-by-turn`; engine/interaction/resource/burst `available-on-turn`. Aeon does not fabricate cumulative first-access probabilities. Local UI exposes first ≥50% milestones with their true semantics.

## Single Point of Failure

**Model:** `spof-v1`  
**Commander counterfactual:** `commander-tax-counterfactual-v1`

Paired fixed-seed scenarios: baseline, +2 tax, +4 tax, unavailable. Tests enforce monotonic access degradation. Graveyard/artifact/enchantment/creature-board dependencies remain explicit semantic proxies until causal suppression simulation exists.

---

# 3. P3 — Pod Intelligence — IMPLEMENTED V2

**Answer Profile:** `answer-profile-v1` with stack, creature, artifact, enchantment, graveyard and wipe classes.  
**Threat Profile:** `threat-profile-v1` with combo/engine/board/extra-turn threat classes.  
**Threat–Answer:** preferred `threat-answer-v2`; compares each threat by turn against relevant opponent answer classes.  
**Adaptive Rule 0:** `adaptive-rule0-v1`; at most three high-information intent questions.  
**Pod Match:** `advanced-pod-match-v2` under `pod-intelligence-v2`.

Pod Match explicitly combines median/range, peak, speed, explosiveness, volatility, friction and **Threat–Answer exposure**. A dedicated regression proves that an exposed Threat–Answer window independently increases mismatch.

Older P0/P1 shares without P2→P7 intelligence retain the original range-comparison fallback.

---

# 4. P4 — Game Quality Engine — IMPLEMENTED V2

**Game Quality:** `game-quality-v2` combines multi-axis mismatch, exposed Threat–Answer windows, commander SPOF, friction and vulnerability-versus-opponent-answer hard counters. Output remains categorical and experimental, never an exact win/good-game probability.

**Combo Accessibility:** `combo-access-v1` separates combo presence from structural accessibility. `T5/T7/T9` are declared target windows but `timing.status = not-simulated`; exact probabilities are intentionally absent until piece/zone/tutor-prerequisite simulation exists.

**Vulnerability Matrix:** `vulnerability-v2` covers commander removal, graveyard hate, artifact/enchantment suppression, wipes, creature removal, Rule of Law, counterspells, resource denial and exile interaction. Only commander-removal can currently use paired causal counterfactual evidence; other classes remain explicit proxies.

---

# 5. P5 — Aeon Match — IMPLEMENTED V1

**Model:** `aeon-match-v1`

- complete pools up to 12 players: exact exhaustive partition for the current objective;
- larger pools: deterministic greedy construction + improving cross-table swaps;
- 64-player deterministic regression;
- complete tables of four; remainder is explicitly `unassigned`;
- no global-optimum claim for large pools.

**Pod Repair:** `pod-repair-v1` prefers rearrangement/alternate registered deck before asking a player to modify a deck.

**LGS/event route:** `/match`

- authenticated organizer creation;
- anonymous join by public Rule 0 share;
- 4–64 session capacity;
- six-hour expiry;
- open/locked/closed state;
- organizer secret stored only as SHA-256 hash server-side;
- transactional capacity check;
- idempotent repeated joins;
- public share codes only;
- direct Vercel `/match?session=…` routing;
- QR-ready join URL without third-party QR data transfer.

Migration presence in Git is not considered deployment.

---

# 6. P6 — Causal Deck Doctor — IMPLEMENTED V1

**Causal What-if:** `deck-doctor-explain-v1` explains P20/median/P80/peak, speed, interaction, resilience, explosiveness, commander dependency, turn complexity and package-strength deltas.

**Constrained selection:** `deck-doctor-v1` supports bounded objectives including peak reduction, commander-dependency reduction, interaction increase and target-pod compatibility.

**Targeted Pod Tuning:** `targeted-pod-tuning-v1` evaluates supplied analyzed variants against the actual pod peers through `pod-intelligence-v2` and reports mismatch improvement.

Boundary: V1 ranks supplied legal/analyzed candidates. It does not elevate opaque card-generation or generic LLM suggestions into semantic evidence. Pod Repair remains preferred before opt-in tuning.

---

# 7. P7 — Aeon Reality — INSTRUMENTATION + EVALUATION IMPLEMENTED

## Observation contract

**Summary model:** `aeon-reality-v1`

Stored bounded fields:

- turn band, win type, perceived balance, dominant event;
- pod size (2–8 at the observation contract layer);
- pod model version;
- bounded engine/semantic versions;
- anonymized SHA-256 pod fingerprint;
- actual pre-game aggregate prediction: risk score/level, Pod Match mismatch and maximum Threat–Answer gap.

Safeguards:

- missing prediction is rejected; it cannot silently become `0/low`;
- risk level must agree with score bands;
- predictions are bounded 0–100;
- version arrays/string lengths are bounded;
- same-pod submissions use a transaction advisory lock before hourly rate limiting;
- observation table is not readable by normal anon/authenticated roles.

Not stored: decklists, Oracle text, card names/lists, raw share codes, email, IP address or user agent.

## Calibration evaluation

**Evaluation:** `reality-calibration-eval-v1`  
**Readiness:** `calibration-readiness-v2`

Implemented plumbing: severe-imbalance prevalence, Brier, prevalence baseline Brier, Brier improvement, AUC, calibration bands/MAE, distinct-pod count and counts by pod size.

Synthetic fixtures validate the evaluation plumbing only. They are **not evidence of real-world calibration**.

## Scientific promotion gate

No exact public probability until real data passes sufficient volume/diversity, positive+negative outcomes, held-out evaluation, baseline superiority, calibration review, pod-size cohort review, leakage protection and no material cohort failure. `calibrationReadiness()` is necessary but not sufficient; promotion still requires a held-out evidence decision.

---

# 8. Privacy and sharing

Public Rule 0 intelligence is sanitized twice: client-side and in the SQL share RPC. Allowed public information is limited to scores/levels, model versions, sanitized temporal curves and sanitized SPOF/vulnerability/answer/threat profiles. Decklist, Oracle text, evidence-card names/lists and private analysis payloads are stripped. Sentinel-private-string regressions verify this boundary.

---

# 9. Final validation and audit

## Full CI gate

Validated code commit: `7d8443268a1049290ad619ec7bf4a0b4ce499a45`  
Workflow: `P2-P7 product validation #184`  
Conclusion: **SUCCESS**

Every step passed:

1. Smoke;
2. Semantic contracts;
3. Metamorphic contracts;
4. Product contracts;
5. Public precon contract;
6. Adversarial audit;
7. Build.

Product regressions cover Experience independence, friction semantics, Horizon no-fake-cumulative behavior, paired SPOF tax stress, Threat–Answer mismatch contribution, hard-counter risk, exact 8-player matching, deterministic 64-player matching, targeted pod tuning, sanitized share round-trip, mandatory P7 prediction/pod size/risk consistency, Brier/AUC/calibration plumbing, secure sessions, transaction-safe observation rate limiting and direct `/match` routing.

## Base→validated-code audit

Base: `1f92c521857cd2245a786c52dcbcc9573f736a9c`  
Code: `7d8443268a1049290ad619ec7bf4a0b4ce499a45`

Findings:

- branch is ahead of base and not behind;
- changed files are confined to expected P2→P7 models/tests/workflow/SQL/product UI/routing/documentation;
- `sequenceSimulator.js` and `sequenceSimulatorMulti.js` are unchanged in the final branch diff;
- `powerModel.js` remains +6 / -0 with no existing score formula change;
- no unrelated subsystem change detected;
- PR #10 remained open, draft, mergeable and unmerged during validation.

## Documentation-only finalization

The final `PLAN.md` commit occurs after validated code `7d844326…` and is ignored by CI by design. The branch-head audit must therefore prove the difference from `7d844326…` is documentation only. Any later non-document change requires the complete CI gate again.

---

# 10. Explicit evidence boundaries

These are intentional boundaries, not hidden unfinished work:

1. Horizon interaction/resource/burst is `available-on-turn`; true cumulative first access requires new simulator instrumentation.
2. Non-commander SPOF remains proxy-based until causal suppression simulation is interpretable.
3. Threat-class timing scales simulated interaction availability; it is not rules-complete casting simulation.
4. Exact Combo T5/T7/T9 probability is not emitted without prerequisite-aware simulation.
5. Aeon Match beyond 12 players is deterministic heuristic, not a claimed global optimum.
6. Deck Doctor evaluates supplied analyzed candidates; autonomous card generation is not semantic truth.
7. P7 is not scientifically calibrated until real observations + holdout promotion gates pass.
8. SQL in Git is not proof of staging/production deployment.

Removing these warnings without adding the missing evidence is a regression.

---

# 11. Post-branch release gates

## Engineering integration

Before merge: explicit user approval, deliberate draft removal, upstream `product-p0-p1` integration-path review, and no non-document commit bypassing full CI.

## Database deployment

After approved integration: apply migrations to non-production; smoke sanitized share creation, observation submission and Match create/join/lock/close; verify anon/authenticated RLS/grants; then consider production promotion.

## Scientific P7 promotion

Collect real observations; evaluate held-out AUC/Brier/calibration, baseline superiority, pod-size cohorts and leakage. Until this succeeds, Game Quality remains categorical experimental guidance.

---

# 12. Definition of completion

PR #10 engineering validation is complete only when:

- all P2→P7 models above exist with explicit versions/boundaries;
- privacy/deployment contracts pass;
- full Aeon quality suite passes on the last non-document code commit;
- base→code audit finds no score-coefficient or unrelated changes;
- later branch-head changes are documentation-only;
- this plan and PR metadata describe the actual implementation;
- PR remains open/draft/unmerged pending explicit approval.

Correct final statement:

> **P2→P7 engineering validation is complete. P7 scientific calibration and database deployment remain deliberately gated promotion steps, not hidden unfinished engineering.**

---

# 13. Post-roadmap V2 follow-up — PR #11

The original P2→P7 roadmap above remains the historical record of PR #10. A stacked follow-up now closes the largest product gaps identified during the post-roadmap competitive/product audit.

**Working branch:** `product-p2-p7-v2`  
**Validation PR:** `#11`  
**Base branch:** `product-p2-p7-roadmap`  
**Validated non-document code commit:** `385be2c7b022e447d10bc641752a61a4dacafa26`  
**Full validation:** `P2-P7 product validation #198` — **SUCCESS**  
**Merge policy:** PR remains draft; **no merge without explicit approval**.

## 13.1 Semantic integration gate

The user reported that semantic-12 had been launched. GitHub was audited before continuing product work.

Repository-visible state at that audit:

- PR #8 `public-precon-library` HEAD: `d076a9eb9322629b8a2879815a982ca9a22487d6`;
- `src/version.js` on PR #8: `3.2.0-semantic-10`;
- latest PR-attached quality run on that HEAD: #276 — success;
- no GitHub branch, indexed commit, PR or issue exposing `semantic-11` or `semantic-12` was found.

Therefore semantic-12 may have been started outside the repository-visible workflow, but it is **not currently auditable from GitHub**. PR #11 intentionally does not touch semantic card evaluation. The complete product stack must be replayed/revalidated on semantic-12 (or later) once that semantic version is actually pushed.

## 13.2 Adaptive Rule 0 V2 — IMPLEMENTED

**Models:** `rule0-intent-v1`, `adaptive-rule0-v2`, `advanced-pod-match-v3`, `pod-intelligence-v3`.

Changes:

- Rule 0 questions now expose bounded answer choices;
- combo intent, extra-turn intent and land-denial acceptance feed an explicit declared-intent overlay;
- answering a question recalculates Pod Match/Game Quality immediately in `/pod`;
- pair reasons expose declared-intent gap/conflict separately;
- objective deck profile, detected combos, Threat–Answer evidence and Aeon power remain unchanged;
- P7 receives the exact post-answer pre-game prediction shown to the players.

This closes the previous gap where Aeon generated smart questions but did not use the answers.

## 13.3 Pod Repair V2 — IMPLEMENTED / EXPOSED

**Model:** `pod-repair-v2`.

Aeon Match now audits every remaining 1↔1 cross-table swap for the generated assignment.

For an improving repair it reports:

- the two players/decks to swap;
- source tables;
- total mismatch before/after;
- both affected table mismatches;
- measured improvement.

A repair is always a true two-way swap: no duplicate assignment and no player is silently dropped.

When no improving one-swap exists, Aeon reports the number of swaps evaluated and marks the solution locally optimal for that one-swap neighborhood. This is especially useful as an explicit proof check after exact small-N matching and as an audit of the large-N local optimizer.

## 13.4 Aeon Reality inside Aeon Match — IMPLEMENTED

Every generated `/match` table now receives its own `pod-intelligence-v3` assessment and displays Game Quality.

The post-game observation form is available per table and receives exactly the prediction displayed before the game:

- risk score/level;
- Pod Match mismatch;
- maximum Threat–Answer gap;
- table model version.

No separate recomputation is allowed to silently substitute a different pre-game prediction.

## 13.5 Answer Debt V1 — NEW / IMPLEMENTED

**Model:** `answer-debt-v1`.

Purpose: translate Threat–Answer into an immediately actionable table diagnostic.

For each answer class:

- stack;
- creature;
- artifact;
- enchantment;
- graveyard;
- wipe;

Aeon computes the largest turn-specific gap between a threat requiring that class and the combined class-specific coverage of the other seats.

Output includes:

- answer class;
- debt score/level;
- critical turn;
- associated threat id;
- supporting worst/examples.

Answer Debt is deliberately an aggregation of existing Threat/Answer evidence, **not a new probability model**. It is visible in `/pod`, and the leading debt is shown for every `/match` table.

## 13.6 V2 validation

Run #198 passed the entire branch quality gate together:

1. Smoke ✅
2. Semantic contracts ✅
3. Metamorphic contracts ✅
4. Product contracts ✅
5. Public precon contract ✅
6. Adversarial audit ✅
7. Build ✅

Dedicated V2 regressions prove:

- declared Rule 0 intent can change compatibility without mutating deck capability;
- a rejected experience characteristic creates an explicit intent conflict;
- a deliberately poor two-table assignment produces a real improving cross-table swap;
- an exact small-N result has no improving 1↔1 cross-table swap;
- Answer Debt identifies a structurally under-covered answer class;
- `/pod` preserves the exact adaptive prediction for Reality;
- `/match` is wired to Pod Repair, table intelligence and exact pre-game Reality prediction.

The only branch commit after validated code `385be2c7…` before this documentation update removed a temporary documentation marker; it contained no code change.

## 13.7 Remaining priority work after V2

These remain real engineering/scientific gaps and must not be presented as solved:

1. **Final semantic integration** — rebase/reconstruct the stacked product path on semantic-12 or later and rerun every gate.
2. **True First-Access Horizon** — instrument first commander/engine/interaction/burst/threat access instead of deriving cumulative language from per-turn availability.
3. **Card-level Answer Timing** — simulate whether the relevant answer is actually drawn/castable with correct colors/mana/timing rather than scaling generic interaction access by class density.
4. **Threat Objects** — explicit prerequisites/zones/mana/pieces/answer classes/protection/recovery for combo and engine threats.
5. **Causal non-commander SPOF** — graveyard/artifact/enchantment/board suppression counterfactuals.
6. **Exact Combo Accessibility T5/T7/T9** — piece-specific tutor eligibility, zones, mana and prerequisites.
7. **Real-world P7 calibration** — held-out data, baseline comparisons, cohort leakage protection and calibration review.
8. **Lower-friction LGS onboarding** — reuse the existing Moxfield/Archidekt importer, but do not bypass the audited share/session persistence boundary with an unaudited anonymous ingest path.
9. **Agency Timeline** — candidate next major Game Quality dimension after the temporal primitives above are trustworthy: measure whether each seat can meaningfully advance or interact before the game becomes structurally closed.

Strategic order remains:

> **semantic integration → close end-to-end UX gaps → replace strategic proxies → collect real games → calibrate → only then promote probabilistic claims.**
