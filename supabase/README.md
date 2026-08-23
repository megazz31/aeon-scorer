# Aeon Scorer Supabase state

_Last updated: 2026-08-23_

## Important: current reproducibility gap

The production Supabase project contains foundational migrations that predate the v3.2 migration files currently committed in this repository. The committed v3.2 migrations therefore **must not be treated as a complete from-zero schema history yet**.

Observed production migration history includes earlier foundations such as:

- `enable_aeon_background_extensions`
- `aeon_learning_platform_v1`
- `aeon_semantic_auditor_helpers`
- `aeon_requeue_semantic_backlog`
- audit/security helper migrations

The repository currently starts later with v3.2 hardening migrations. This is schema-history drift and is tracked as P0 operational-integrity work in `docs/ROADMAP.md`.

## Source-of-truth target

The target state is:

1. every required schema/function/policy migration exists in Git;
2. a fresh Supabase development branch can be reconstructed from repository migrations;
3. production contains no untracked structural change;
4. CI/release checks can detect Git ↔ production migration drift;
5. Edge Function and database releases are tied to the same Aeon engine/semantic release identity.

## v3.2.1 candidate migration

`20260823113000_aeon_v321_raise_saved_deck_guard.sql`

Purpose: raise the legacy 10-saved-deck trigger ceiling to 100. This preserves an anti-abuse ceiling without making ordinary Commander collections hit an artificial product limitation.

The migration is part of the release candidate only. It should be applied to production **only after the v3.2.1 PR passes release gates and is approved for promotion**.

## Do not

- infer that a migration is deployed merely because it exists in this directory;
- edit production schema manually without adding/reconciling a migration;
- use the semantic audit corpus as model ground truth;
- deploy frontend engine-version changes without the matching `record-analysis` Edge Function version.
