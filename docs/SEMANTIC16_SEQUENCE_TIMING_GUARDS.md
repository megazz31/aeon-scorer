# Semantic 16 — sequence timing safeguards

This note records the final causal timing guard added after the first full Semantic 16 precon calibration pass.

## Equipment packages

Equipment remains a structural package when the deck has real Equipment cards plus real conversion/payoff cards. That structural cohesion is still allowed to affect the synergy dimension.

Sequence access is stricter: an Equipment package is considered operational by the turn simulator only when its payoff is immediately active from casting / controlling Equipment. Payoffs that require paying equip/attach costs, attacking, combat damage, or another activation are not treated as active merely because the Equipment and payoff are both castable.

This prevents Wyleth/Kemba-style attachment/combat payoffs from producing artificial early engine access while preserving Sram-style cast-trigger engines.

The same gate is applied in both `sequenceSimulator.js` and `sequenceSimulatorMulti.js`.

## Combo timing

Known combo presence and structural scoring remain distinct from executable sequence timing. `sequenceEligibleCombos(...)` is now applied in both the single-commander and multi-commander simulators.

Loops with additional prerequisites (for example Ob Nixilis + All Will Be One without a represented exact-one-life trigger, or Kalamax/Redshift lines with stack, tap, power, activation, or combat requirements) are not promoted to an executable burst merely because all named pieces are accessible.

## Release gate

A fresh 163-precon Semantic 16 delta and the 1800/3200 calibration/convergence suite must be generated from the materialized source after these safeguards. The earlier green calibration is useful evidence but is not sufficient for release because it predates this timing correction.
