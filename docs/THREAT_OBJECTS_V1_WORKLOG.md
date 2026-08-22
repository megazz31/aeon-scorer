# Aeon Threat Objects V1 Worklog

Branch: `product-threat-objects-v1`  
Base: `product-answer-timing-v2`

Goal: replace broad implicit threat rows with explicit, versioned threat objects while preserving the existing Threat–Answer interface and all Aeon power semantics.

## Threat object contract

A material threat object exposes:

- deterministic id and family;
- strength / level;
- aggregate evidence sources;
- explicit known prerequisites and explicitly unknown prerequisites;
- temporal source and semantics;
- cumulative / fallback turn curve;
- first 25 / 50 / 75 temporal milestones and critical window;
- relevant answer classes;
- confidence / evidence boundary.

## Implemented

- `threat-object-v1` builder for combo, graveyard engine, artifact engine, enchantment engine, creature-board and extra-turn-loop threat families;
- historical threat ids remain stable (`combo`, `graveyard-engine`, `artifact-engine`, `enchantment-engine`, `creature-board`, `extra-turn-loop`);
- Threat Profile V3 uses Threat Objects while retaining `threatProfile.threats` as the backward-compatible consumer surface;
- aggregate evidence only: package ids/strengths, dependency scores, combo-access counts/scores and friction signals;
- unknown prerequisites are explicit instead of silently assumed true;
- true Temporal V2 first-access semantics are preserved when present; historical availability curves stay an explicit fallback;
- public share serialization exposes only safe aggregate threat metadata;
- Combo Accessibility public serialization was hardened after the validation gate found that line names could reveal combo-piece card names. Public intelligence now strips combo-line/highest names while private deck intelligence remains unchanged.

## Validation history

### Run #222 — failed as expected by version contract

- smoke / semantic / metamorphic: green;
- product gate stopped on an old `share-intelligence-v2` expectation after the intentional public contract promotion to V3;
- no Threat Object model failure was hidden.

### Run #224 — found a real privacy-contract failure

- Answer Timing V2 passed;
- Threat Objects test reached the public serialization boundary and detected that a private combo line name was still present through Combo Accessibility;
- fixed in `buildShareableIntelligence()` by stripping combo line/highest names from public product intelligence.

### Run #226 — Threat Objects itself green

- dedicated `THREAT OBJECTS V1 OK` passed;
- remaining failure was only the historical roadmap test expecting `deck-intelligence-v2` instead of the intentional V3 contract.

### Run #228 — FULL SUCCESS

Validated non-document code commit: `6685171418f8beffd1c96785f13b114c4065d405`  
Workflow: `P2-P7 product validation #228`  
Conclusion: **SUCCESS**

All gates passed:

- Smoke ✅
- Semantic contracts ✅
- Metamorphic contracts ✅
- Product contracts ✅
- Public precon contract ✅
- Adversarial audit ✅
- Build ✅

## Base → validated-code audit

Base: `85d326f43c33529c24f92422f749f6b787835f4e`  
Validated code: `6685171418f8beffd1c96785f13b114c4065d405`

Audit:

- ahead 11 / behind 0;
- changed files confined to Threat Objects, product serialization, tests, workflow and worklog;
- no `cardFeatures.js`;
- no `packageGraph.js`;
- no `powerModel.js`;
- no sequence simulator;
- no semantic-version change;
- no Aeon 0–100 coefficient change.

## Invariants

- no card semantic tagging changes;
- no Aeon 0–100 score changes;
- no new exact combo probability claim;
- no card names or Oracle text required in public threat objects;
- legacy `threatProfile.threats` consumers remain compatible;
- threat objects are descriptive evidence, not deterministic win conditions;
- no merge without explicit approval.

## Status

- branch/worklog: complete;
- object builder: complete;
- Threat Profile integration: complete;
- share sanitization: complete and hardened;
- regression tests: complete;
- full validation: **SUCCESS #228**;
- semantic integration gate: still pending repository-visible semantic-12-or-later replay;
- merge: **not performed**.
