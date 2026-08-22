# Aeon Agency Timeline V1 Worklog

Branch: `product-agency-timeline-v1`  
Base: `product-threat-objects-v1`

Goal: preserve all explicit Threat Object windows in Threat–Answer and derive a seat-level participation/agency diagnostic without changing Aeon power, semantic card truth or the calibrated meaning of Game Quality.

## Planned models

- `threat-answer-v4`: per-threat windows plus backward-compatible worst-window turns;
- `agency-timeline-v1`: per-seat timeline comparing development/interaction agency against opponent closure pressure;
- no Game Quality coefficient change in V1; Agency is diagnostic until ablation/real-data evidence justifies promotion.

## Agency definition V1

A seat has potential agency when it can either:

1. materially advance its own plan (commander / engine / resource access); or
2. present a relevant answer to an opponent threat class.

Opponent closure pressure is not treated as a literal probability that the game ends. It is a structural pressure signal derived from Threat Objects / Threat–Answer windows.

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

- branch/worklog: initialized;
- Threat–Answer V4: pending;
- Agency Timeline V1: pending;
- share/privacy review: pending;
- regressions: pending;
- full validation: pending.
