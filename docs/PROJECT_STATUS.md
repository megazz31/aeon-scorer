# Aeon Scorer — project status

_Last updated: 2026-08-23_

This file is a release-state snapshot. It deliberately distinguishes **production**, **release candidate**, and **planned work** so documentation never presents an unvalidated model as production truth.

## Production

- Public Git/app release: **v3.2.0**
- Public Git/app semantic identity: **`3.2.0-semantic-1`**
- Production head before this candidate: **`820ead669216153629e38122e7e33e45c9e1b508`**
- Public model family: **v3.2**
- Production Supabase also contains a separate public-precon analysis lineage that progressed through **`3.2.0-semantic-7`** on 2026-08-21. Those runs are `source=precon`, not web-ingestion runs, and the corresponding semantic evolution is not currently represented by the public Git history. This is explicit source-of-truth drift, not a reason to treat semantic-7 scores as training truth.
- Core identity: explainable Commander structural-power distribution, not a win-rate predictor and not a Commander Bracket replacement.

## Release candidate

Branch: **`fix/v3.2.1-audit-hardening`**

Candidate versions:

- engine: **3.2.1**
- semantic: **`3.2.1-semantic-8`**
- model id: **`sequence-access-v3.2-semantic`**
- public family label: **v3.2**

The model id intentionally stays on the v3.2 sequence-access family: this patch changes semantic/package interpretation, not the sequence/scoring model family. Exact semantic identity is carried by `SEMANTIC_VERSION`. Semantic revision 8 continues the highest production-observed semantic lineage instead of reusing a lower ordinal while Git/Supabase drift is being reconciled.

### Implemented in the candidate

- [x] Split one-shot sacrifice enablers from operational sacrifice outlets.
- [x] Keep `sac-enabler` cards as package support/evidence without letting them become operational producer cards.
- [x] Add regression coverage proving that one-shot sacrifice enablers alone cannot create an operational sacrifice package.
- [x] Remove `sac-enabler` from commander-engine seeding until conditional/one-shot role weighting exists.
- [x] Add a full quality workflow backstop on direct pushes to `main` as well as pull requests.
- [x] Raise the saved-deck safety ceiling from 10 to 100; the ceiling remains an abuse guard, not a product tier.
- [x] Align frontend, semantic model and ingestion endpoint candidate versions.
- [x] Make `record-analysis` rolling-compatible with current web production v3.2.0 / semantic-1 and candidate v3.2.1 / semantic-8, while persisting/deduplicating against the actual client version so deployment order cannot relabel analyses.
- [x] Add smoke assertions for rolling ingestion compatibility.
- [x] Add release-process, roadmap and status documentation.

### Validation log

- **2026-08-23 — PR #19 / workflow run #277:** failed at the smoke step before semantic/model gates. Cause: candidate `MODEL_ID` had been bumped to `sequence-access-v3.2.1-semantic` while `powerModel.js` correctly still reported the unchanged v3.2 sequence-access family. Resolution: keep `MODEL_ID=sequence-access-v3.2-semantic`; only engine and semantic identities bump for this patch. No scoring/calibration failure was observed in this run because later gates did not execute.
- **2026-08-23 — workflow run #281 on corrected model identity:** smoke, micro-semantic, metamorphic, adversarial and production build gates passed. The run reached the 1,800-iteration macro benchmark. It was then superseded by a non-scoring deployment-safety change to `record-analysis` (rolling compatibility), so the final exact head must run the full pipeline again before promotion.
- **2026-08-23 — production corpus inspection:** `analysis_runs` contains only precon/canary data at present, with the precon pipeline progressing from semantic-1 through semantic-7. No `source=web` run was present. Candidate semantic identity was advanced to semantic-8 to avoid colliding with or numerically regressing behind that observed lineage. The missing Git history behind semantic-3/4/5/7 remains P0 drift to reconcile, not an implicit model approval.

### Validation still required before production

- [ ] Pull-request GitHub Actions run is green on the final exact candidate head.
- [ ] Smoke test passes on the final exact candidate head.
- [ ] Micro-semantic suite passes on the final exact candidate head.
- [ ] Metamorphic suite passes on the final exact candidate head.
- [ ] Adversarial audit passes on the final exact candidate head.
- [ ] Production build passes on the final exact candidate head.
- [ ] 1,800-iteration macro calibration gates pass.
- [ ] 3,200-iteration macro calibration gates pass.
- [ ] 1,800 ↔ 3,200 convergence remains within policy.
- [ ] Sacrifice-heavy historical holdout decks are reviewed for unintended score movement.
- [ ] Supabase migration is reviewed and applied only as part of release promotion.
- [ ] Rolling-compatible `record-analysis` Edge Function is deployed before or with frontend promotion.
- [ ] GitHub `main` branch protection/ruleset is enabled manually: PR required + Aeon quality check required.

**Until those checks are complete, v3.2.1 is a release candidate, not production.**

## Known remaining corrective work

These are deliberately not hidden inside v3.2.1 because they deserve isolated review:

1. **Git ↔ Supabase reproducibility** — foundational production migrations and the observed semantic-3/4/5/7 precon lineage are not represented by the current public Git history. Export/reconstruct the complete baseline and semantic provenance so a fresh environment can be rebuilt and audited from Git only.
2. **Public data wording / consent UX** — replace wording such as “does not memorize decklists” with language that distinguishes scoring-by-memory from storage for QA; expose the analysis-corpus behavior clearly at analysis time.
3. **Long-lived session refresh** — make Supabase token refresh propagate cleanly to the React session rather than relying on reload-time refresh.
4. **Semantic UI labels** — expose/localize `sac-enabler` and future role qualifiers consistently in EN/FR diagnostics.
5. **Branch protection** — repository setting, not source code; the push workflow is only a backstop and cannot prevent a bad direct push from being deployed before its run finishes.
6. **Auditor runtime** — the queue/corpus exists, but the scheduled independent ChatGPT semantic-audit loop must be verified as an operational process rather than assumed from repository documentation.

## Production rule

A model change is considered production only when the exact Git head, database migration set and deployed ingestion version agree on the same release identity and all mandatory gates have passed.
