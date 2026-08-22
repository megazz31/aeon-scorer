# Aeon Combo Execution Eligibility V1 Worklog

Branch: `product-combo-execution-eligibility-v1`  
Base: `product-combo-access-v2`

Goal: turn Combo Accessibility V2 execution-boundary reason strings into structured, machine-readable prerequisite evidence and let Threat Objects consume that evidence without pretending an exact execution probability exists.

## Planned contract

Each combo execution requirement should expose:

- stable requirement id;
- category (`zone`, `mana`, `activation`, `state`, `resource`, `sequencing`, `protection`, `recovery`, `rules`);
- state (`known`, `unknown`, `unsupported`, `not-applicable`);
- evidence source;
- relevant zone when meaningful;
- whether the current Aeon engine can evaluate it;
- a concise blocker reason when it cannot;
- no card names required in public serialization.

A line-level execution eligibility object should summarize:

- piece-presence support;
- requirement counts by state;
- executable-now claim: **never emitted in V1**;
- exact execution timing status: blocked until every promoted prerequisite dimension is genuinely modeled;
- blockers in deterministic order.

## Threat Object integration

Combo Threat Objects should consume the structured prerequisite summary instead of relying only on generic static unknown strings such as `tutor-eligibility` / `exact-piece-zones` / `protection-window`.

Numeric threat strength / timing arithmetic must remain unchanged in this V1 prerequisite-depth pass.

## Invariants

- no Aeon power change;
- no Pod Match / Game Quality coefficient change;
- no Reality schema/prediction change;
- no semantic card-tag changes;
- no fake execution probability;
- no hidden tutor/zone assumptions;
- public payload remains free of combo/card names;
- no merge without explicit approval.

## Status

- branch/worklog: initialized;
- prerequisite catalog: pending;
- Combo Accessibility integration: pending;
- Threat Object integration: pending;
- privacy/regressions: pending;
- full validation: pending.
