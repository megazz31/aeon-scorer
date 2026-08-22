# Aeon P2–P7 V2 Worklog

Branch: `product-p2-p7-v2`
Base: `product-p2-p7-roadmap`

Goal: close the highest-value product gaps found in the post-roadmap audit without changing semantic card evaluation or the existing Aeon 0–100 score.

## Scope for this branch

1. Adaptive Rule 0 answers must feed an explicit product-intent overlay and change the pod forecast without becoming semantic truth.
2. Pod Repair must be visible in Aeon Match through deterministic cross-table swap suggestions.
3. Aeon Reality must be available from generated Aeon Match tables, not only manual Pod Match.
4. Add regression tests and keep the branch independently reviewable.

## Semantic dependency gate

This branch intentionally does not touch `cardFeatures.js`, `packageGraph.js`, semantic tags, semantic versions, or core power coefficients. It must be revalidated after the final semantic branch (currently GitHub shows semantic-10 on `public-precon-library`; semantic-12 is not visible yet) is integrated.

## Status

- Branch created: done.
- Adaptive Rule 0 V2: pending.
- Cross-table Pod Repair: pending.
- Reality in Aeon Match: pending.
- Full validation: pending.
