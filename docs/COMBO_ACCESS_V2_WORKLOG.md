# Aeon Combo Accessibility V2 Worklog

Branch: `product-combo-access-v2`  
Base: `product-spof-suppression-v1`

Goal: replace the structural-only combo timing placeholder with truthful temporal evidence for combo lines that Aeon can actually represent, while keeping execution prerequisites explicit instead of fabricating T5/T7/T9 win/execution probabilities.

## Implemented contract

**Models:** `combo-access-v2`, `combo-piece-timing-v1`.

For each detected combo line Aeon now:

- preserves the historical `combo-access-v1` structural score / level / commander-piece count / method exactly;
- resolves required piece names against the analyzed 99 and command zone;
- distinguishes library pieces from command-zone pieces;
- reports T5 / T7 / T9 **raw-draw piece-presence** probability using an exact combinatorial inclusion/exclusion calculation;
- supports duplicate-copy groups without pretending tutor equivalence;
- emits `unsupported` with `piecePresence:null` when required piece data is missing;
- records explicit execution-boundary reason codes for known lines;
- keeps `executionStatus = not-modeled` even when piece-presence timing is supported.

## Meaning of T5 / T7 / T9

The temporal metric is deliberately narrow:

> Probability that every required **library piece name** has appeared in an opening seven plus one raw draw per turn by the target turn.

Command-zone pieces are counted separately and do not need to be drawn.

This is **not**:

- probability the combo is executable;
- probability the combo wins;
- tutor-inclusive probability;
- mulligan-optimized probability;
- castability/mana probability;
- graveyard/exile/special-zone access probability;
- protection-window probability.

These omissions are machine-visible through assumptions / unsupported-reason metadata.

## Known execution boundaries

The current known-combo catalog carries explicit unresolved boundaries rather than silently assuming them away. Examples include:

- Thoracle + Consultation/Pact: library-empty condition, stack sequencing, protection; Pact also singleton-name constraint;
- Dramatic Scepter: imprint state, positive nonland-mana loop, activation cost, protection;
- Heliod Ballista: X-cost, counter threshold, lifelink activation, protection;
- Exquisite Blood loops: life-change trigger and both permanents surviving;
- Painter Stone: activation cost, color-setting state and replacement-effect risk;
- Worldgorger: graveyard-zone piece, aura targeting sequence and loop exit condition;
- Breach Freeze: graveyard-resource threshold, escape cost, storm count and mana loop.

Unknown lines remain `execution-prerequisites-not-modeled` rather than receiving invented detail.

## Tutor isolation

Tutor counts continue to affect the historical structural accessibility score because that is established V1 behavior.

They **do not** modify T5/T7/T9 piece-presence timing. A dedicated regression proves that adding tutors changes the structural score while leaving temporal raw-draw windows identical. Tutor eligibility must be modeled explicitly before tutor-inclusive timing can be promoted.

## Product integration / privacy

- `deck-intelligence-v4` carries Combo Accessibility V2.
- `share-intelligence-v4` exposes sanitized aggregate timing only.
- Public payloads do **not** expose combo names, combo-piece names, combo `cards[]` arrays or Oracle text.
- `privacy.comboPieceNames = false` is explicit.
- Pod/Game Quality/Reality numeric behavior is unchanged; Combo V2 is evidence-only in this pass.

## Local UI

`ProductWorkspace` now shows a local **COMBO ACCESS · V2** panel for detected lines:

- T5/T7/T9 piece-presence values for supported lines;
- command-zone versus library-piece counts;
- unsupported reason summaries where timing cannot be computed;
- an explicit warning that the values are **not** execution or win probability.

Private line names are permitted in this local-only diagnostic and remain absent from public sharing.

## Regression guarantees

`scripts/combo-access-v2-test.mjs` proves:

- V1 structural score/level/commanderPieces/method are unchanged;
- two-singleton piece-presence is exact and monotone T5 < T7 < T9;
- command-zone pieces are separated correctly;
- tutor counts do not inflate raw-draw timing;
- missing piece data stays unsupported/null rather than false precision zero;
- public payloads contain timing aggregates but no combo/card/Oracle names;
- the local UI is wired and contains explicit non-execution language.

## Validation history

- #250: stopped on historical `share-intelligence-v3` expectation in Answer Timing; no model failure.
- #252: Answer Timing aligned; stopped on historical `share-intelligence-v3` expectation in Threat Objects.
- #254: **Combo Accessibility V2 itself passed**; stopped later on historical `deck-intelligence-v3` roadmap expectation.
- #256: full core V2 stack green before local UI finalization.
- #260: authoritative completed-feature validation after UI — **SUCCESS**.

### P2-P7 product validation #260

- Smoke ✅
- Semantic contracts ✅
- Metamorphic contracts ✅
- Product contracts ✅
- Public precon contract ✅
- Adversarial audit ✅
- Build ✅

Validated non-document code commit: `604f6e0c8ffbe7500ae1aa997bb09a076a9abd4f`.

## Base → validated-code audit

From `e6f3fb993b2308cee8bd0eb9605cdee91e259dab` to `604f6e0c8ffbe7500ae1aa997bb09a076a9abd4f`:

- ahead 12 / behind 0;
- changes confined to Combo Accessibility V2 model, product intelligence serialization, local UI, tests, workflow and this worklog;
- no `cardFeatures.js` change;
- no `packageGraph.js` change;
- no `powerModel.js` change;
- no sequence-simulator change;
- no semantic-version change;
- no Aeon power / Pod Match / Game Quality coefficient change;
- no Reality prediction/schema change.

## Status

- simulator/combo-data audit: **COMPLETE**;
- temporal piece-presence model: **IMPLEMENTED**;
- structural V1 compatibility: **PASS**;
- public privacy: **PASS**;
- local UI: **IMPLEMENTED**;
- full validation: **#260 SUCCESS**;
- PR state: **open / draft / unmerged**;
- merge policy: **no merge without explicit approval**.

## Next scoped target

The next safe step is not to call piece presence “execution probability”. It is to build **Combo Execution Eligibility / prerequisite depth**: convert the current boundary reason codes into structured prerequisite objects with known/unknown status and identify which execution dimensions can be modeled from existing Aeon evidence. Threat Objects can then consume those structured prerequisites without guessing. Exact execution timing remains gated until mana/zones/tutors/activation/loop conditions are genuinely represented.
