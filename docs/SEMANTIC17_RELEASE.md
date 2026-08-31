# Aeon Scorer 3.3.0 — Semantic 17

Release candidate: PR #28, promoted from the previously unmerged `semantic/16-user-corpus-audit` branch.

## Version identity

- Engine: `3.3.0`
- Semantic: `3.3.0-semantic-17`
- Model: `sequence-access-v3.3-semantic`
- Base `main`: `625ac182f1cee6ba95c2bd7edc397da095d9fbf8`

Semantic 16 was already published. The user-corpus, Equipment scoring, combo timing, and sequence-simulation changes therefore require a new immutable semantic identity rather than modifying Semantic 16 in place.

## Promoted changes

- Commander-specific synergy recognition grounded in the audited user corpus.
- Known-combo family and redundancy handling with explicit execution prerequisites.
- Equipment support/payoff separation and sequence-safe scoring cohesion.
- Matching single- and multi-commander sequence gates.
- Causal, non-scoring card-context warnings.
- Current-semantic public precon generation before sentinel validation.

## Expected movement

The final 163-precon comparison against the committed `main` snapshots has mean median movement `+0.13`. A total of 148/163 decks remain within one median point and 153/163 within two points. Fourteen outliers are recorded in `calibration/semantic-outlier-review.md`.

The largest negative changes are concentrated in attachment/combat-dependent Equipment decks, which no longer receive early executable credit from structural package presence alone. Positive changes are concentrated in newly recognized commander synergies. Frequency and user expectations were not used as scoring truth.

## Validation

- Local quality suite: passed.
- Public precons: 168 canonical, 163 analyzed, 5 explicitly unsupported.
- Macro calibration 1,800: 17/17 gates.
- Macro calibration 3,200: 17/17 gates.
- Sampling convergence: 39 matched; max median delta 1; max floor/ceiling delta 2; max peak delta 1; cohort median deltas 0.
- Frontend and committed `record-analysis` candidate versions: aligned on Semantic 17.

Production deployment and live ingestion alignment must be verified from the merged `main` commit. Historical Semantic 14–16 analyses remain immutable.
