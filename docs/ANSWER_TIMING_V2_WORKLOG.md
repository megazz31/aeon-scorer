# Aeon Answer Timing V2 Worklog

Branch: `product-answer-timing-v2`  
Base: `product-temporal-first-access`

Goal: replace class timing derived only from `general interaction × class density` with class-specific first-access timing that uses the actual answer cards, their mana values and the true cumulative interaction-access primitive from Temporal V2.

## Invariants

- no Aeon 0–100 score formula changes;
- no card semantic tagging changes;
- answer classification stays explicit and evidence-bearing;
- old analyses without true first-access Horizon data keep a backward-compatible fallback;
- new class timing must be cumulative/monotone and bounded 0..100;
- model versions must change when timing behavior changes;
- full validation is mandatory before calling the branch complete;
- no merge without explicit approval.

## Status

- branch/worklog: initialized;
- Answer Profile V2: pending;
- Threat–Answer version propagation: pending;
- regression tests: pending;
- full validation: pending.
