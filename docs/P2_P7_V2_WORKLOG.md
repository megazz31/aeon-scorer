# Aeon P2–P7 V2 Worklog

Branch: `product-p2-p7-v2`  
Base: `product-p2-p7-roadmap`  
Validation PR: `#11`

Goal: close the highest-value product gaps found in the post-roadmap audit without changing semantic card evaluation or the existing Aeon 0–100 score.

## Semantic dependency gate

This branch intentionally does not touch `cardFeatures.js`, `packageGraph.js`, semantic tags, semantic versions, or core power coefficients.

GitHub audit on 2026-08-22 after the user reported semantic-12 had been launched:

- PR #8 `public-precon-library` HEAD: `d076a9eb9322629b8a2879815a982ca9a22487d6`;
- `src/version.js` on that branch still declares `3.2.0-semantic-10`;
- last PR-attached quality run on that HEAD: #276, success;
- no branch, commit, PR or issue exposing `semantic-11` or `semantic-12` was found through GitHub;
- therefore semantic-12 may exist outside GitHub/local workflow, but it is **not currently auditable from the repository**.

Mandatory gate: replay this branch on the final semantic branch once that version is actually pushed.

## Implemented in this follow-up

### Adaptive Rule 0 V2

- `rule0-intent-v1` stores declared intent separately from objective deck capability.
- `adaptive-rule0-v2` exposes bounded choices for combo intent, extra-turn intent and land-denial acceptance.
- `pod-intelligence-v3` accepts `rule0Answers`.
- answered intent feeds `advanced-pod-match-v3` through explicit `declaredIntentGap` / `declaredIntentConflict` terms.
- answers never modify card semantics, detected combos, Threat–Answer evidence or Aeon power.
- `/pod` recalculates immediately when a Rule 0 answer changes.
- Aeon Reality receives the exact post-Rule-0 pre-game prediction shown to the table.

### Pod Repair V2

- `pod-repair-v2` audits all 1↔1 cross-table swaps for the generated layout.
- a suggested repair is a true two-way swap: no duplicate seat and no player silently dropped.
- output includes before/after total mismatch and per-table mismatch.
- if no repair exists, Aeon explicitly reports the number of swaps audited and that the current solution is locally optimal for the one-swap neighborhood.
- `/match` exposes the repair audit.

### Aeon Reality inside Aeon Match

- every generated table receives a full `pod-intelligence-v3` assessment.
- `/match` shows table Game Quality and submits Reality using that exact table prediction.
- observation remains privacy-bounded to the existing P7 contract.

### Answer Debt V1

New product diagnostic: `answer-debt-v1`.

For each answer class (`stack`, `creature`, `artifact`, `enchantment`, `graveyard`, `wipe`), Aeon computes the largest turn-specific gap between:

- a threat requiring that answer class; and
- the combined class-specific coverage of the other seats.

It reports the class, score, level, critical turn and threat id. It is deliberately an aggregation of existing Threat/Answer evidence, **not a new probability model**.

Answer Debt is visible in `/pod` and the leading debt is shown for every generated `/match` table.

### Direct local Moxfield / Archidekt Match import

Local `/match` now accepts a mixture of:

- versioned Aeon share codes/links; and
- public Moxfield / Archidekt deck URLs.

External URLs reuse the existing audited `/api/import-deck` normalizer, then resolve cards through the existing Scryfall client and run an **in-memory 1,800-sequence analysis**. No imported decklist is persisted by this flow.

Safety / product boundaries:

- maximum 8 external deck URLs in one local Match batch;
- up to 64 total entries when the rest are versioned Aeon shares;
- persistent LGS sessions remain share-only;
- local external imports are clearly labelled as quick local analyses;
- a table containing any non-persisted local import is **not eligible for Aeon Reality submission**, because it lacks the versioned public-share identity required by the calibration contract;
- users can create normal versioned Aeon shares first if they want the game included in Reality data.

This reduces casual/local onboarding friction without weakening the audited persistent-session or P7 evidence boundaries.

## Validation

Latest validated non-document code commit: `949bf288d89e76e94f4cf2dd8f45a939871d0024`  
Workflow: `P2-P7 product validation #206`  
Conclusion: **SUCCESS**

Passed together:

1. Smoke;
2. Semantic contracts;
3. Metamorphic contracts;
4. Product contracts;
5. Public precon contract;
6. Adversarial audit;
7. Build.

Regression coverage proves:

- Rule 0 answers can change compatibility while the underlying deck profile/combos remain identical;
- rejected land-denial acceptance creates an explicit product-intent conflict;
- a deliberately bad two-table layout yields a real improving cross-table swap;
- an exact small-N Aeon Match result has no improving single cross-table swap;
- Answer Debt is produced on a structurally under-covered threat;
- `/match` is wired to Pod Repair, `buildPodIntelligence` and exact pre-game Reality prediction;
- `/pod` is wired to adaptive Rule 0 and exact prediction persistence;
- direct local Match imports reuse `/api/import-deck`, Scryfall resolution and `analyzePower`;
- direct external imports are capped at 8 and stay non-persistent;
- Reality is disabled when a generated table is not fully backed by versioned Aeon shares.

## Still deliberately pending

1. Final semantic-12 (or later) integration/revalidation once visible on GitHub.
2. True first-access Horizon instrumentation.
3. Card-by-card class-specific Answer timing.
4. Threat Objects / prerequisite-aware threat simulation.
5. Causal non-commander SPOF suppression.
6. Exact Combo Accessibility T5/T7/T9.
7. Real-world P7 calibration.
8. Persistent LGS direct Moxfield/Archidekt session joining remains a separate design/performance/security task; anonymous persistent session ingestion still expects an Aeon share and should not be bypassed with an unaudited storage path.
