# Aeon Temporal V2 Worklog

Branch: `product-temporal-first-access`
Base: `product-p2-p7-v2`

Goal: add true first-access instrumentation to the simulator while preserving all historical scoring fields and formulas.

## Invariants

- existing `turnProfile` semantics remain unchanged;
- existing P20 / median / P80 / peak formulas remain unchanged;
- new first-access data is additive and versioned;
- cumulative first-access curves must be monotone by construction;
- Goldfish Horizon may prefer first-access evidence only when explicit simulator evidence exists;
- no semantic card-classification changes in this branch;
- full branch must be replayed on final semantic-12-or-later integration.

## Status

- branch created: done;
- simulator instrumentation: pending;
- Horizon V2: pending;
- tests: pending;
- full validation: pending.
