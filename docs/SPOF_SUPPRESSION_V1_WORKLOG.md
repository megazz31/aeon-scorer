# Aeon SPOF Suppression V1 Worklog

Branch: `product-spof-suppression-v1`  
Base: `product-agency-timeline-v1`

Goal: add paired non-commander dependency suppression counterfactual evidence for graveyard / artifact / enchantment / creature-board SPOF without changing Aeon power, Pod Match, Game Quality or the existing semantic SPOF scores.

## Planned counterfactual

For each dependency class:

- identify the same cards that currently support the semantic dependency proxy;
- preserve deck size and draw order by replacing those dependency contributors with inert dead-draw equivalents rather than deleting them;
- remove suppressed cards from package producer/payoff evidence and invalidate combos that require a suppressed card;
- run baseline and suppressed scenarios with the same deterministic seed;
- report median / peak / engine-access deltas plus suppressed-card count.

A single paired baseline seed is shared across dependency classes so scenario deltas are directly comparable and computation remains bounded.

## Evidence boundary

This is a dependency-contributor suppression stress test, not a literal simulation of every Rest in Peace / Null Rod / board wipe rules interaction. V1 counterfactual evidence therefore remains diagnostic and does **not** replace the current semantic dependency score or alter Game Quality.

## Invariants

- no card semantic tag changes;
- no Aeon 0–100 score changes;
- no Pod Match / Game Quality coefficient changes;
- dependency scores stay unchanged in V1;
- paired fixed-seed comparisons;
- deck cardinality preserved under suppression;
- no public leak of suppressed card names;
- no merge without explicit approval;
- full stack must be replayed on repository-visible semantic-12-or-later.

## Status

- branch/worklog: initialized;
- suppression runner: pending;
- SPOF integration: pending;
- regressions/performance guard: pending;
- UI evidence: pending;
- full validation: pending.
