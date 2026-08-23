# Changelog

Aeon Scorer follows explicit engine and semantic versioning for model-affecting changes. A release candidate is not production until the complete release gates pass.

## [3.2.1] — release candidate — 2026-08-23

### Fixed

- One-shot sacrifice effects such as `Deadly Dispute` remain classified as `sac-enabler` but can no longer act as operational sacrifice producers in sequence simulation.
- A sacrifice package now requires at least one true repeatable `sac-outlet`; one-shot enablers may contribute support/density only.
- `sac-enabler` no longer seeds commander-engine synergy as though it were a repeatable engine primitive.
- Added regressions ensuring one-shot enablers alone cannot create a sacrifice package and cannot enter `producerCards` consumed by the sequence simulator.
- Successful calibration reports are stamped from centralized release constants so artifacts cannot silently retain stale v3.1/model labels.

### Operations

- Candidate engine version: `3.2.1`.
- Candidate semantic version: `3.2.1-semantic-8`.
- Model family id remains `sequence-access-v3.2-semantic`; this patch changes semantics/package interpretation, not the sequence/scoring model family.
- Semantic revision 8 continues the highest production-observed public-precon lineage (`3.2.0-semantic-7`) while the missing Git/Supabase semantic provenance is reconciled. The missing lineage is drift to audit, not automatic model truth.
- Quality workflow now also runs on direct pushes to `main` as a backstop.
- `record-analysis` supports both the current web production `3.2.0 / 3.2.0-semantic-1` pair and the candidate `3.2.1 / 3.2.1-semantic-8` pair during rolling deployment, while storing and deduplicating against the actual client version.
- Smoke coverage protects both the rolling-ingest contract and calibration-artifact version stamping.
- Saved-deck safety ceiling candidate migration raises the legacy cap from 10 to 100.
- Added project status, roadmap, release-process and Supabase source-of-truth documentation.

### Not yet production

Requires PR CI, 1,800/3,200 calibration gates, convergence, targeted sacrifice holdout review, Supabase migration review and rolling-compatible Edge Function deployment before promotion.

## [3.2.0] — 2026-08-20

### Added

- Versioned analysis persistence and saved-deck history.
- Semantic QA corpus / audit queue architecture.
- Immutable engine/semantic/deck/Oracle snapshot identities for stored analyses.
- Clavileno semantic hardening for reminder text, artifact ownership and sacrifice-role distinction.
- Centralized public release constants and v3.2 documentation alignment.

### Principles

User analyses are observational/adversarial evidence, never automatic training labels or direct score targets. Production semantic corrections remain gated by independent Oracle evidence and the full validation pipeline.
