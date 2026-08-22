# Aeon Combo Execution Eligibility V1 Worklog

Branch: `product-combo-execution-eligibility-v1`  
Base: `product-combo-access-v2`  
Validation PR: `#18`  
Merge policy: draft only; no merge/retarget/promotion without explicit approval.

Goal: turn Combo Accessibility V2 execution-boundary reason strings into structured, machine-readable prerequisite evidence and let Threat Objects consume that evidence without pretending an exact execution probability exists.

## Implemented contract

Each combo execution requirement exposes:

- stable requirement `id`;
- category (`access`, `zone`, `mana`, `activation`, `state`, `resource`, `sequencing`, `protection`, `recovery`, `rules`);
- evidence state (`known`, `unknown`, `unsupported`, `not-applicable` when needed);
- relevant zone when meaningful;
- `requiredForExecution` to distinguish strict execution blockers from useful context;
- `engineCanEvaluate`;
- `evidenceSource`;
- deterministic `blockerReason` when Aeon cannot evaluate it.

Important semantic boundary: requirement state describes **Aeon's evidence coverage**, not whether the requirement is currently satisfied in an actual Commander game.

## Line-level execution eligibility

Model: `combo-execution-eligibility-v1`.

Each Combo Accessibility V2 line now exposes:

- piece-presence support inherited from `combo-piece-timing-v1`;
- ordered structured requirements;
- deterministic strict blocker ids;
- counts by requirement state;
- `exactExecutionTiming = blocked` while any required dimension is unknown/unsupported;
- `executionClaim = not-emitted` in V1.

`protection-window` and similar reliability context remain visible but are not strict execution blockers. A line can be theoretically executable without protection; Aeon must not conflate resilience with executability.

## Catalogued line requirements

Structured prerequisite catalogs exist for the currently known lines:

- Thoracle + Consultation;
- Thoracle + Pact;
- Dramatic Scepter;
- Heliod Ballista;
- Exquisite Bond;
- Exquisite Vito;
- Painter Stone;
- Worldgorger;
- Breach Freeze.

Unknown lines fall back to `execution-prerequisites-not-modeled`; this remains an explicit blocker instead of creating false precision.

## Threat integration

`threat-object-v2`:

- preserves existing threat `id`, `family`, `strength`, `answers`, timing curves, milestones and critical windows;
- combo Threat Objects consume the structured prerequisite object from the highest structural combo line when available;
- legacy/unstructured input retains the old explicit fallback unknowns;
- structured blockers become the combo object's precise `prerequisites.unknown` surface;
- no Threat–Answer arithmetic is changed.

`threat-profile-v4`:

- uses Threat Objects V2;
- exposes structured execution prerequisite confidence when available;
- remains disruption-needs / threat evidence, not a deterministic win-condition model.

## Product propagation

- `deck-intelligence-v5` carries Combo Eligibility + Threat Profile V4;
- `share-intelligence-v5` exposes only sanitized aggregate prerequisite metadata;
- combo/card names and Oracle text remain absent from the public payload;
- Threat–Answer stays on V4 because its numeric/worst-window contract is unchanged;
- Pod Match, Game Quality and Reality coefficients/schemas are unchanged;
- Product Workspace shows strict blocker ids locally and explains that blockers describe what Aeon cannot prove, not what is absent in the real game.

## Tests added/updated

New: `scripts/combo-execution-eligibility-v1-test.mjs`.

The contract checks:

- deterministic prerequisite ordering;
- strict versus contextual requirements;
- missing-piece blockers;
- generic unknown-line fallback;
- Combo Accessibility propagation;
- Threat Object numerical invariance with/without structured prerequisites;
- Threat Profile V4 versioning;
- sanitized public prerequisite payload;
- local UI language;
- no public combo/card/Oracle leakage.

Existing Combo V2, Threat Objects, Answer Timing and roadmap version snapshots were updated only for the deliberate product-model version promotion; numerical expectations were not relaxed.

## CI / workflow

The shared `P2-P7 product validation` workflow now includes:

- push branch `product-combo-execution-eligibility-v1`;
- PR base `product-combo-access-v2`;
- this worklog in docs-only `paths-ignore`.

Full gate remains:

1. Smoke;
2. semantic contracts;
3. metamorphic contracts;
4. product contracts;
5. public precon contract;
6. adversarial audit;
7. build.

## Invariants

- no Aeon power change;
- no Pod Match / Game Quality coefficient change;
- no Reality schema/prediction change;
- no semantic card-tag changes;
- no simulator change;
- no fake execution probability;
- no hidden tutor/zone assumptions;
- public payload free of combo/card names;
- no merge without explicit approval.

## Status

- branch/worklog: **done**;
- prerequisite catalog: **implemented**;
- Combo Accessibility integration: **implemented**;
- Threat Object V2: **implemented**;
- Threat Profile V4: **implemented**;
- sanitized product/share propagation: **implemented**;
- local blocker UI: **implemented**;
- privacy/regression tests: **implemented, validation pending**;
- full validation: **pending**;
- base→validated-code audit: **pending**;
- PLAN final session update: **pending after successful validation/audit**.
