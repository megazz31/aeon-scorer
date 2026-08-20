# Aeon semantic audit contract

## Architecture

`RAW -> AUDIT -> APPROVED MODEL`

- **RAW**: exact decklist, immutable Aeon result, engine/semantic versions, deck hash and Oracle snapshot hash.
- **AUDIT**: independent observations, disagreements, confidence and grouped findings.
- **APPROVED MODEL**: semantic rules actually used by Aeon after tests and review.

User analyses are coverage and adversarial test inputs. They are never training labels and never become approved semantics automatically.

## Auditor control plane

The auditor is **designed to run as a scheduled ChatGPT task using the connected Supabase project**. Aeon ships no OpenAI API call, model secret, GitHub Models worker or model-running cron.

Runtime status for v3.2: the ingestion endpoint, versioned corpus, audit queue and service-role RPCs are ready in production. The ChatGPT schedule is created separately from this repository after production verification; the repository itself does not imply that a schedule is currently active.

Each scheduled run should:

1. Reset stale audit locks with `aeon_reset_stale_audits()`.
2. Claim only a small pending batch with `aeon_claim_audit_batch(...)`.
3. Treat stored Aeon tags/results as claims to test, not ground truth.
4. Resolve every candidate card against current official Scryfall data and reason from Oracle text + type line. Never trust user-submitted Oracle text as independent evidence.
5. Ignore reminder text, respect ownership/control, distinguish repeatable outlets from one-shot sacrifice enablers, and classify functional game actions rather than word matches.
6. Reuse `card_semantics` only when `(oracle_id, oracle_hash, semantic_version)` matches. A new Oracle hash or semantic version is a new auditable fact; never overwrite the old row.
7. Write semantic memory through `aeon_upsert_card_semantic(...)` and recurrent anomaly groups through `aeon_upsert_finding(...)`.
8. Mark an analysis complete only when all relevant semantic candidates are covered; otherwise requeue it. Failures are retried through the queue rather than rescanning the whole database.

## Hard exclusions

The auditor must never:

- decide that a deck "should be 62 instead of 58" by judgement;
- change the engine, taxonomy or score directly;
- use frequency of an Aeon tag as proof that the tag is correct;
- use another user's private account data outside the anonymized analysis corpus;
- merge or deploy a semantic correction merely because an AI suggested it.

## Promotion path for a correction

A finding becomes a candidate engine correction only after recurrence/confidence is high enough to justify investigation. The candidate must add a semantic regression test, pass semantic/metamorphic/adversarial suites, pass the 1800/3200 calibration gates and convergence checks, and be compared against a real historical deck holdout before merge.

Large unexplained score movement is a regression signal, not proof of improvement.
