# Semantic 11 — operational sacrifice roles

Status: **candidate**

Baseline: `3.2.0-semantic-10` + integrated Product Intelligence V5 stack.

## Problem

`cardFeatures` correctly distinguishes repeatable `sac-outlet` cards from one-shot `sac-enabler` costs such as Deadly Dispute. However, semantic-10 still placed both tags in the Sacrifice motif's producer role. `sequenceSimulator.operationalPackage()` consumes `producerCards` directly, so a one-shot cost could be treated as an executable engine producer without modelling the sacrificial resource or repeatability.

## Semantic 11 contract

- A Sacrifice package requires at least one true `sac-outlet`.
- One-shot `sac-enabler` cards remain visible package evidence/support.
- Only repeatable outlets enter `producerCards` consumed by sequence simulation.
- One-shot enablers no longer seed commander-engine synergy as though they were repeatable primitives.
- Existing package-density intent is preserved by allowing one outlet + one additional sacrifice support card to satisfy the producer-evidence threshold.

## Regression cases

- `Deadly Dispute + Village Rites + Blood Artist + Cruel Celebrant` => no operational Sacrifice package.
- `Carrion Feeder + Deadly Dispute + Blood Artist + Cruel Celebrant` => Sacrifice package exists; Carrion Feeder is operational producer, Deadly Dispute is support evidence.

## Validation required before promotion

1. semantic suite + sentinel precons;
2. product V5 contracts;
3. semantic precon delta against semantic-10 snapshots;
4. public precon regeneration/snapshot review;
5. adversarial/build;
6. macro calibration 1800/3200 + convergence.

This revision changes semantic/package interpretation only. It does not change the power-model family or product-intelligence contracts.
