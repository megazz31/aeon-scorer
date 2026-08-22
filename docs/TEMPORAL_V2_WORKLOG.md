# Aeon Temporal V2 Worklog

Branch: `product-temporal-first-access`  
Base: `product-p2-p7-v2`  
Validation PR: `#12`

Goal: add true first-access temporal evidence while preserving all historical scoring fields and formulas.

## Invariants

- existing `simulation.turnProfile` semantics remain unchanged;
- existing P20 / median / P80 / peak formulas remain unchanged;
- new first-access data is additive and versioned;
- cumulative first-access curves must be monotone by construction;
- first-access sampling uses a deterministic RNG stream isolated from the main power simulation;
- Goldfish Horizon may prefer first-access evidence only when explicit sampler evidence exists;
- historical on-turn Horizon curves remain available as `availabilityCurves`;
- no semantic card-classification change in this branch;
- full branch must be replayed on final semantic-12-or-later integration.

## Implementation

### First Access Sampler V1

**Model:** `first-access-sampler-v1`

The sampler reuses the existing sequence simulator one sequence at a time and records the first turn where each existing simulator signal becomes true:

- commander online;
- engine operational;
- meaningful interaction available;
- draw / recursion resource action available;
- burst / high-impact line available.

For every signal it emits a cumulative curve:

`P(first access <= turn)`

using all sampled sequences as denominator. A sequence that never sees the signal inside the seven-turn horizon remains a miss.

The sampler uses its own deterministic seed (`first-access-v2`) and runs only after all Aeon power calculations are complete. Default sample size is bounded to one third of the main iteration count, capped at 800 and never above the main iteration count.

### Goldfish Horizon V2

**Model:** `goldfish-horizon-v2`

- `curves`: prefers true cumulative first-access curves when a sampler payload exists;
- `firstAccessCurves`: explicit cumulative first-access payload;
- `availabilityCurves`: preserves historical simulator semantics (`online-by-turn` for commander, `available-on-turn` for other signals);
- provenance exposes main simulation iterations, first-access iterations and selected source;
- fallback remains backward-compatible when a historical analysis has no first-access payload.

This removes the previous ambiguity where a non-monotone on-turn availability series could be read as cumulative access.

## Regression coverage

`first-access-sampler-test.mjs` proves:

1. every first-access curve is bounded 0..100;
2. every curve is monotone non-decreasing;
3. fixed seed produces identical curves;
4. commander / interaction / resource / burst produce reachable evidence on the controlled fixture;
5. running `analyzePower()` with first-access enabled versus disabled produces identical:
   - `profile`;
   - `dimensions`;
   - main `simulation.turnProfile`;
6. first-access payload exists only in the instrumented result.

`goldfish-horizon-test.mjs` proves:

- Horizon V2 prefers cumulative first-access evidence;
- historical non-monotone availability curves remain unchanged in `availabilityCurves`;
- old analyses without first-access data fall back to previous semantics.

## Validation

Validated non-document code commit: `31045446024dd3d750f28be082dc44f8e658f688`  
Workflow: `P2-P7 product validation #214`  
Conclusion: **SUCCESS**

Passed together:

1. Smoke;
2. Semantic contracts;
3. Metamorphic contracts;
4. Product contracts;
5. Public precon contract;
6. Adversarial audit;
7. Build.

Base-to-code audit from `906cf91718b1867d8401e6ae84cf55332166492a` to `31045446024dd3d750f28be082dc44f8e658f688`:

- ahead by 9, behind by 0;
- 8 changed files total;
- no `cardFeatures.js`, `packageGraph.js`, semantic version, sequence decision logic or scoring coefficient changed;
- `powerModel.js` diff is limited to first-access import, post-score sampling attachment and methodology metadata;
- main simulator files are unchanged.

## Status

- branch created: done;
- true first-access sampler: done;
- Horizon V2: done;
- power-isolation regression: done;
- full validation: **green (#214)**;
- documentation: current;
- merge: **not authorized / not performed**.

## Next temporal step

The next justified improvement is **card-level Answer Timing**: stop scaling every answer class from the same general interaction curve and instead estimate first castable access for the actual cards covering stack / creature / artifact / enchantment / graveyard / wipe classes. This should be developed on a new stacked branch so Temporal V2 remains independently reviewable.

## Semantic integration gate

At the start of this branch, repository-visible PR #8 was still on `3.2.0-semantic-10`; semantic-12 was not auditable on GitHub. Before any release/integration, re-check PR #8 and replay the complete stacked product validation on semantic-12 or later once repository-visible.
