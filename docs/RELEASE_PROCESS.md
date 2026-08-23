# Aeon Scorer — release process

_Last updated: 2026-08-23_

The release process exists to enforce Aeon's central promise: **a model change is not production merely because the code compiles or looks plausible.**

## Version identities

Aeon tracks several related but distinct versions:

- `AEON_VERSION` / `ENGINE_VERSION`: executable release identity.
- `SEMANTIC_VERSION`: card-role/package semantic identity. Bump whenever semantic interpretation changes in a way that can alter analysis results or QA facts.
- `MODEL_ID`: sequence/scoring model identity written into analysis methodology.
- `AEON_LABEL`: public product family label; patch releases may remain in the same public family.

Historical analyses must retain the version identities they were produced with.

## Change classes

### Documentation/UI-only

No intended scoring change. Still requires smoke, adversarial checks and build.

### Semantic patch

Changes card interpretation, package membership or operational access. Requires:

- semantic regression test for the discovered failure;
- full semantic/metamorphic/adversarial suite;
- macro calibration 1,800 and 3,200;
- convergence check;
- targeted historical holdout review.

### Model/scoring change

Changes sequence execution, weights, calibration mapping or score meaning. Requires all semantic-patch checks plus explicit before/after calibration reporting and release notes describing expected movement.

## Mandatory flow

1. Create a dedicated branch from current `main`.
2. Make the smallest coherent change that fixes the identified failure.
3. Add a regression test before promotion.
4. Update version identities when model meaning changes.
5. Open a pull request to `main`.
6. Run the exact PR head through the complete Aeon quality workflow.
7. Review macro movement; unexplained movement is a regression signal, not evidence of improvement.
8. Review database/Edge Function changes and confirm version alignment.
9. Merge only after all mandatory gates are green.
10. Deploy `main` only.
11. Verify public version, ingestion version and database migration state after deployment.
12. Record the production head/version in project status/release notes.

## Required GitHub repository protection

Source code alone cannot make this guarantee. `main` should be protected with a GitHub ruleset/branch protection requiring:

- pull request before merge;
- required Aeon quality status check;
- branch up to date before merge where practical;
- no force pushes;
- no branch deletion;
- administrator bypass used only for incident recovery.

The workflow also runs on direct pushes to `main` as a **backstop**, but that is not equivalent to branch protection because Vercel may deploy a direct push before CI completes.

## CI gates

The blocking quality workflow should run:

1. smoke test;
2. micro-semantic truth tests;
3. metamorphic tests;
4. adversarial audit;
5. production build;
6. macro benchmark at 1,800 iterations;
7. calibration validation at 1,800;
8. macro benchmark at 3,200 iterations;
9. calibration validation at 3,200;
10. cross-iteration convergence.

Artifacts from both sampling depths should be retained for release review.

## Supabase / Edge Function discipline

Database and ingestion changes are part of a release identity.

- Every schema change must exist as a committed migration.
- Production-only migrations are considered drift and must be reconciled back into Git.
- A fresh environment should eventually be reproducible from committed migrations alone.
- `record-analysis` must reject mismatched engine/semantic versions.
- The frontend candidate and Edge Function candidate must be promoted together.
- Database migrations should be reviewed before application; do not use production as a scratch migration environment.

## Rollback policy

If production validation reveals a regression:

1. stop promoting further semantic/model changes;
2. revert application/Edge Function to the last known-good version;
3. avoid destructive database rollback unless necessary;
4. preserve failed analysis/audit evidence as regression input;
5. add a regression test before reintroducing the change.

## Release note minimum

Every model-affecting release should state:

- engine version;
- semantic version;
- model id;
- exact Git head;
- what changed semantically;
- expected score impact;
- calibration/convergence result summary;
- known remaining limitations.
