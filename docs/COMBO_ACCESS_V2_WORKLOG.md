# Aeon Combo Accessibility V2 Worklog

Branch: `product-combo-access-v2`  
Base: `product-spof-suppression-v1`

Goal: replace the current structural-only combo timing placeholder with deterministic temporal evidence for combo lines that Aeon can actually represent, while keeping unsupported lines explicit instead of fabricating T5/T7/T9 probabilities.

## Planned contract

For each detected combo line:

- resolve known combo pieces against the analyzed 99 + command zone;
- identify whether all required pieces are represented;
- distinguish command-zone pieces from library pieces;
- compute deterministic cumulative piece-access evidence by turn;
- only promote temporal windows when the prerequisites used by the calculation are explicit and supported;
- expose unsupported/partial reasons when tutor eligibility, zones, alternative costs, graveyard setup, copy effects or other prerequisites are not represented;
- preserve `combo-access-v1` structural score semantics separately for compatibility until V2 is validated;
- do not alter Aeon power, Pod Match, Game Quality or Reality prediction as part of the initial V2 evidence pass.

## Evidence boundary

A combo line being physically accessible in hand/command zone by a turn is not automatically equivalent to being executable. V2 must distinguish piece access from execution readiness unless mana/prerequisites are explicitly modeled.

No exact T5/T7/T9 execution probability may be emitted for unsupported lines.

## Invariants

- no card semantic tag changes;
- no core Aeon score changes;
- no hidden tutor assumptions;
- no fabricated zone transitions;
- deterministic fixed-seed sampling where simulation is required;
- public sharing must not reveal private combo-piece names;
- no merge without explicit approval.

## Status

- branch/worklog: initialized;
- simulator/combo-data audit: in progress;
- temporal model: pending;
- integration/versioning: pending;
- privacy/regressions: pending;
- full validation: pending.
