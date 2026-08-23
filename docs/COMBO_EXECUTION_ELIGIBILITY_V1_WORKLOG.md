# Aeon Combo Execution Eligibility V1 Worklog

Branch: `product-combo-execution-eligibility-v1`  
Base: `product-combo-access-v2` at `adb6ed47d7cc4f048f0af3d89b2df91c5142f353`  
Validation PR: `#18`  
Validated non-document code commit: `ac428c69af849595c121a35580d198e927c3200f`  
Authoritative validation: `P2-P7 product validation #276` — **SUCCESS**  
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

## Tests

New: `scripts/combo-execution-eligibility-v1-test.mjs`.

Validated contracts include:

- deterministic prerequisite ordering;
- strict versus contextual requirements;
- `protection-window` is contextual, not a strict execution blocker;
- missing-piece blockers;
- generic unknown-line fallback;
- Combo Accessibility propagation;
- Threat Object numerical invariance with/without structured prerequisites;
- Threat Profile V4 versioning;
- sanitized public prerequisite payload;
- local UI language;
- no public combo/card/Oracle leakage.

Existing Combo V2, Threat Objects, Answer Timing and roadmap version snapshots were updated only for the deliberate model-version promotion; numerical expectations were not relaxed.

## Full validation

Validated code commit: `ac428c69af849595c121a35580d198e927c3200f`  
Workflow: `P2-P7 product validation #276`  
Conclusion: **SUCCESS**

Every gate passed:

1. Smoke ✅
2. Semantic contracts ✅
3. Metamorphic contracts ✅
4. Product contracts ✅
5. Public precon contract ✅
6. Adversarial audit ✅
7. Build ✅

## Base → validated-code audit

Base: `adb6ed47d7cc4f048f0af3d89b2df91c5142f353`  
Code: `ac428c69af849595c121a35580d198e927c3200f`

Compare result:

- ahead: **15 commits**;
- behind: **0**;
- merge base is exactly the PR #17 documentation head used as PR #18 base;
- changed files are confined to Combo Eligibility / Threat prerequisite models, sanitized product propagation, local diagnostic UI, tests, workflow and worklog;
- no `cardFeatures.js` change;
- no `packageGraph.js` change;
- no `powerModel.js` change;
- no `sequenceSimulator.js` or `sequenceSimulatorMulti.js` change;
- no semantic-version change;
- no Pod Match / Game Quality coefficient change;
- no Reality prediction/schema change.

## Scientific / product boundaries retained

This PR **does not** claim:

- exact combo execution probability;
- exact combo win probability;
- tutor eligibility;
- mulligan-aware combo probability;
- rules-complete mana/activation sequencing;
- graveyard/exile setup correctness;
- loop-state correctness;
- opponent-response/protection success probability.

Those remain explicit future evidence gaps rather than hidden assumptions.

## Final status

- prerequisite catalog: **implemented / validated**;
- Combo Accessibility integration: **implemented / validated**;
- Threat Object V2: **implemented / validated**;
- Threat Profile V4: **implemented / validated**;
- sanitized deck/share V5 propagation: **implemented / validated**;
- local blocker UI: **implemented / validated**;
- privacy/regressions: **validated**;
- full CI: **#276 SUCCESS**;
- base→code audit: **clean**;
- PR #18: **open / draft / mergeable / unmerged**;
- PLAN final session update: performed after this worklog as documentation-only state.
