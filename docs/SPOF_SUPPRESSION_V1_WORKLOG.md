# Aeon SPOF Suppression V1 Worklog

Branch: `product-spof-suppression-v1`  
Base: `product-agency-timeline-v1`

Goal: add paired non-commander dependency suppression counterfactual evidence for graveyard / artifact / enchantment / creature-board SPOF without changing Aeon power, Pod Match, Game Quality or the existing semantic SPOF scores.

## Implemented counterfactual

For each dependency class Aeon now:

- identifies the same contributors used by the existing semantic dependency proxy;
- preserves deck size and draw order by replacing matched contributors with inert dead-draw equivalents rather than deleting them;
- removes suppressed contributors from package producer/payoff evidence;
- invalidates combo lines that require a suppressed contributor;
- runs one deterministic paired baseline and one suppressed scenario with the same fixed seed;
- reports signed deltas for median, peak, engine T4/T5 and resource T5 plus suppressed-card count;
- marks non-applicable classes explicitly rather than manufacturing zero-effect evidence.

A single paired baseline seed is shared across dependency classes so scenario deltas are comparable and computation remains bounded. For a 3,200-sequence analysis the suppression runner is capped at 480 sequences per scenario; the dedicated 1,600-sequence fixture uses 267.

## Model / integration

- `dependency-suppression-counterfactual-v1` — paired graveyard/artifact/enchantment/creature-board stress evidence.
- `spof-v2` — attaches suppression evidence when available.
- Existing non-commander semantic dependency scores are deliberately unchanged in V1 of this counterfactual layer.
- `scorePromotion = semantic-score-unchanged-v1` makes that boundary machine-visible.
- Commander dependency continues to use the separate `commander-tax-counterfactual-v1` baseline/+2/+4/unavailable path.

## UI / privacy

A local analysis panel exposes only the signed suppression deltas and scenario status needed for diagnosis.

Public share serialization deliberately excludes the full suppression payload and suppressed contributor names. Regression coverage verifies that the new local counterfactual evidence does not leak through `buildShareableIntelligence()`.

## Evidence boundary

This is a dependency-contributor suppression stress test, not a literal simulation of every Rest in Peace / Null Rod / board wipe rules interaction. It does not claim that every affected card becomes textless under a real hate piece, nor that the measured delta is an exact loss probability.

V1 counterfactual evidence therefore remains diagnostic and does **not** replace the current semantic dependency score or alter Aeon power, Pod Match, Game Quality or Reality prediction.

## Validation

Validated non-document code commit: `478275866454cd2d4ddbcc3dfd5f7818efe7ce46`

`P2-P7 product validation #246` — **SUCCESS**

- Smoke ✅
- Semantic contracts ✅
- Metamorphic contracts ✅
- Product contracts ✅
- Public precon contract ✅
- Adversarial audit ✅
- Build ✅

An earlier core-only checkpoint #242 was also fully green before the local UI/privacy finalization. #246 is the authoritative validation for the completed V1 feature.

## Base → validated-code audit

From `8233df507b6e52b4d19ae1dd52e18416d21ca36e` to `478275866454cd2d4ddbcc3dfd5f7818efe7ce46`:

- ahead 7 / behind 0;
- six changed files only;
- changes confined to SPOF model, dedicated tests, local product panel, workflow and this worklog;
- no `cardFeatures.js` change;
- no `packageGraph.js` change;
- no `powerModel.js` change;
- no sequence simulator change;
- no semantic-version change;
- no Aeon 0–100 / Pod Match / Game Quality coefficient change;
- no Reality observation/prediction contract change.

## Regression guarantees

Dedicated tests prove:

- paired fixed-seed determinism;
- deck cardinality is preserved;
- relevant package/combo evidence is invalidated under suppression;
- non-applicable classes are explicit;
- signed counterfactual deltas remain evidence and are not silently clamped/promoted;
- semantic SPOF scores remain identical to their pre-counterfactual formula;
- public intelligence does not expose the private suppression payload/contributor names;
- the local UI is wired to the diagnostic evidence only.

## Status

- branch/worklog: **COMPLETE**;
- suppression runner: **IMPLEMENTED**;
- SPOF integration: **IMPLEMENTED / DIAGNOSTIC**;
- regressions/performance guard: **PASS**;
- UI evidence: **IMPLEMENTED LOCAL-ONLY**;
- privacy audit: **PASS**;
- full validation: **#246 SUCCESS**;
- PR state: **open / draft / unmerged**;
- merge policy: **no merge without explicit approval**.

## Next scoped dependency

The next strategic proxy still materially unresolved is Combo Accessibility timing. `combo-access-v1` continues to expose target windows T5/T7/T9 with `timing.status = not-simulated`. The next branch must only promote temporal evidence for combo lines whose pieces/prerequisites can be represented honestly; unsupported tutor/zone/cost/prerequisite cases must remain explicit rather than receiving fabricated probabilities.
