# Semantic 17 — sequence timing safeguards

This note records the causal timing and scoring guards promoted from the unmerged Semantic 16 user-corpus candidate. Because published semantic identities are immutable, these engine changes ship as Semantic 17.

## Equipment packages

Equipment remains a structural package when the deck has real Equipment cards plus real conversion/payoff cards. Structural cohesion remains visible in product and audit output.

Power scoring uses `scoringCohesion`, discounted by the share of payoffs that are immediately operational. Payoffs requiring equip or attach costs, combat, damage, or another activation are not treated as active merely because the Equipment and payoff are both castable.

The same execution gate is applied in both `sequenceSimulator.js` and `sequenceSimulatorMulti.js`. This prevents attachment-heavy packages from creating artificial early engine access while preserving true cast-trigger and control-count engines.

## Combo timing

Known combo presence and structural scoring remain distinct from executable sequence timing. `sequenceEligibleCombos(...)` is applied in both single- and multi-commander simulation.

Loops with additional prerequisites are not promoted to an executable burst merely because all named pieces are accessible. Stack state, tap state, power, activation, combat, and represented trigger requirements remain explicit gates.

## Release gate

Semantic 17 requires a fresh 163-precon delta, the complete local quality suite, 1800- and 3200-iteration calibration, convergence verification, frontend and `record-analysis` version alignment, and the exact PR head passing CI before merge.
