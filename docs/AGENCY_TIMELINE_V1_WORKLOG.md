# Aeon Agency Timeline V1 Worklog

Branch: `product-agency-timeline-v1`  
Base: `product-threat-objects-v1`

Goal: preserve all explicit Threat Object windows in Threat–Answer and derive a seat-level participation/agency diagnostic without changing Aeon power, semantic card truth or the calibrated meaning of Game Quality.

## Implemented models

### Threat–Answer V4

- preserves every Threat Object as an explicit per-deck `windows[]` entry;
- each window retains threat id/family, answer classes, critical window, timing status, unknown-prerequisite count and per-turn threat/answer/gap;
- retains the historical `decks[].turns` worst-window surface;
- regression proves V4 worst-window arithmetic is exactly equal to the equivalent V3 output.

### Agency Timeline V1

A seat has potential agency when it can either:

1. materially advance its own plan through commander / engine / resource first-access evidence; or
2. present a relevant answer to an opponent Threat Object class.

Per turn V1 exposes:

- development agency;
- relevant-response agency;
- combined agency envelope;
- strongest opponent structural closure pressure;
- participation gap;
- dominant threat aggregate;
- response target aggregate.

Per seat V1 exposes:

- first meaningful agency turn (50 threshold);
- first material opponent-pressure turn (50 threshold);
- whether pressure arrives before meaningful agency;
- maximum participation gap;
- categorical diagnostic risk level.

Opponent closure pressure is **not** treated as a literal probability that the game ends. Agency is **not** a probability that a player participates.

## Product exposure

- Pod Match displays the highest-risk seat, first meaningful agency turn, first material pressure turn and maximum participation gap;
- Aeon Match displays the same diagnostic per generated table;
- Reality prediction remains unchanged and does not ingest Agency fields;
- Game Quality arithmetic remains unchanged and explicitly documents that Agency V1 is outside the score;
- Aeon Match optimization objective remains unchanged: Agency does not influence table formation in V1.

## Validation

Validated non-document code commit: `30434f30dc8c0fec056c5c1a9636fcf401ee7697`  
Workflow: `P2-P7 product validation #239`  
Conclusion: **SUCCESS**

All gates passed:

- Smoke ✅
- Semantic contracts ✅
- Metamorphic contracts ✅
- Product contracts ✅
- Public precon contract ✅
- Adversarial audit ✅
- Build ✅

Dedicated regressions prove:

- Threat–Answer V4 preserves V3 worst-window arithmetic exactly;
- secondary Threat Object windows are retained instead of discarded;
- Agency is deterministic and bounded;
- Agency refuses to silently degrade on legacy V3 evidence;
- a seat can be identified when material opponent pressure arrives before its first meaningful agency window;
- Game Quality is byte-for-byte equivalent to a direct calculation that has no Agency input;
- `/pod` and `/match` expose Agency diagnostics;
- `predictionFrom()` used by Reality does not absorb Agency.

## Base → validated-code audit

Base: `7db04abb1bf02d4f75cb1ee4fa582446c70af5e0`  
Validated code: `30434f30dc8c0fec056c5c1a9636fcf401ee7697`

Audit:

- ahead 13 / behind 0;
- changed files limited to Threat–Answer/Agency product models, UI exposure, tests, workflow and worklog;
- no `cardFeatures.js`;
- no `packageGraph.js`;
- no `powerModel.js`;
- no sequence simulator;
- no semantic-version change;
- no Aeon 0–100 score coefficient change;
- no Pod Match mismatch coefficient change;
- no Game Quality numeric coefficient change;
- no Reality schema/prediction change.

## Invariants

- no card semantic-tag changes;
- no Aeon 0–100 score changes;
- no Game Quality numeric coefficient changes;
- no exact probability-of-participation claim;
- old Threat–Answer `decks[].turns` consumers remain compatible;
- all new seat diagnostics are bounded, deterministic and evidence-bearing;
- no merge without explicit approval;
- full stack must be replayed on repository-visible semantic-12-or-later.

## Status

- branch/worklog: complete;
- Threat–Answer V4: complete;
- Agency Timeline V1: complete;
- UI exposure: complete;
- Reality/Game Quality isolation: verified;
- regressions: complete;
- full validation: **SUCCESS #239**;
- semantic-12-or-later integration replay: pending repository-visible semantic branch;
- merge: **not performed**.
