# Aeon Threat Objects V1 Worklog

Branch: `product-threat-objects-v1`  
Base: `product-answer-timing-v2`

Goal: replace broad implicit threat rows with explicit, versioned threat objects while preserving the existing Threat–Answer interface and all Aeon power semantics.

## Threat object contract

A material threat object should expose:

- deterministic id and family;
- strength / level;
- aggregate evidence sources;
- explicit known prerequisites and explicitly unknown prerequisites;
- temporal source and semantics;
- cumulative / fallback turn curve;
- first 25 / 50 / 75 temporal milestones and critical window;
- relevant answer classes;
- confidence / evidence boundary.

## Invariants

- no card semantic tagging changes;
- no Aeon 0–100 score changes;
- no new exact combo probability claim;
- no card names or Oracle text required in public threat objects;
- legacy `threatProfile.threats` consumers remain compatible;
- threat objects are descriptive evidence, not deterministic win conditions;
- no merge without explicit approval.

## Status

- branch/worklog: initialized;
- object builder: pending;
- Threat Profile integration: pending;
- share sanitization: pending;
- regression tests: pending;
- full validation: pending.
