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
