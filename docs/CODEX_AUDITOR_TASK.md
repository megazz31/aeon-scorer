# Aeon — Codex semantic auditor task

This document is the handoff specification for creating Aeon's scheduled semantic auditor in **Codex**.

It must be treated as an operational contract, not as permission to change Aeon's scoring model automatically.

## Goal

Run a small semantic audit of newly queued Aeon analyses on a recurring schedule, ideally **hourly**, using Codex as the worker.

Target Supabase project:

- name: `mtg-simulator`
- project id: `jrzzlcklctmqgemepucs`

Repository:

- `megazz31/aeon-scorer`

Production architecture remains:

`RAW -> AUDIT -> APPROVED MODEL`

User analyses are adversarial/coverage evidence only. They are **never** ground truth or training labels.

## Non-negotiable rules

The Codex auditor must never:

- decide that a deck should have a different 0–100 score by judgement;
- directly modify Aeon's scoring engine, taxonomy, weights or thresholds;
- directly merge to `main` or deploy production changes;
- use frequency of an Aeon tag as proof that the tag is correct;
- trust user-submitted Oracle text as independent evidence;
- overwrite historical semantics when Oracle text or semantic version changes;
- scan the whole database on each run;
- use an OpenAI API key or a GitHub Models worker inside Aeon;
- expose private user/account data in logs or findings.

All semantic facts must be versioned by the existing identity:

`oracle_id + oracle_hash + semantic_version`

## Source of truth for card semantics

The auditor must independently ground card interpretation in **official current Scryfall Oracle data**:

- Oracle text
- type line
- Oracle id
- enough source metadata to establish the Oracle version/hash used by Aeon

Stored Aeon tags/results are hypotheses to verify, not truth.

If Codex cannot access Scryfall reliably from its automation environment, **do not silently fall back to Aeon's stored user payload as authoritative Oracle data**. Stop the semantic part of the run and report the limitation.

A future acceptable fallback is a backend-maintained official Scryfall snapshot already stored by Aeon, provided its provenance/hash/date are explicit and independent from user input.

## Existing Supabase control plane

The production database already exposes the intended queue/RPC workflow, including:

- `aeon_reset_stale_audits()`
- `aeon_claim_audit_batch(...)`
- `aeon_finish_audit_item(...)`
- `aeon_requeue_audit_item(...)`
- `aeon_upsert_card_semantic(...)`
- `aeon_upsert_finding(...)`

Relevant tables include:

- `analysis_runs`
- `analysis_audit_queue`
- `card_semantics`
- `audit_findings`
- `audit_runs`

Do not change schema, RLS or grants just to make the automation easier. If the current Codex environment cannot perform a required operation, report that limitation instead.

## Mandatory canaries before creating the recurring task

Do **not** enable an hourly automation until every required canary below has passed in the actual Codex automation environment.

### Canary 1 — read-only Supabase access

Run a minimal read against the target project, for example:

```sql
select count(*) as total
from public.analysis_audit_queue;
```

Pass condition: query reaches Supabase and returns normally.

### Canary 2 — real reversible database write

A no-op statement such as `UPDATE ... WHERE false` is **not sufficient**.

Perform a real write only against clearly synthetic canary data and clean it up in the same test. Prefer a transaction that is rolled back after proving the mutation can execute.

The canary must not modify real user analyses.

Pass condition: a genuine database mutation is accepted by the Codex automation environment and the database is left unchanged after cleanup/rollback.

### Canary 3 — queue mutation / RPC execution

Verify that the automation environment can execute the queue control plane, including a mutation-capable RPC.

At minimum verify:

```sql
select public.aeon_reset_stale_audits();
```

Then test a real synthetic claim/finish cycle against a canary analysis created solely for this purpose. Clean all synthetic rows afterward.

Pass condition: Codex can actually claim and finish/requeue an audit item. An empty queue returning zero is not by itself proof that the mutating path works.

### Canary 4 — official Scryfall grounding

Resolve a known card such as `Sol Ring` against official Scryfall data and verify that Codex can retrieve at least:

- Oracle id
- type line
- Oracle text

Pass condition: official Scryfall data is reachable from the same automation environment that will run the scheduled task.

### Canary 5 — synthetic end-to-end audit

Create one clearly identified synthetic analysis, let the normal trigger enqueue it, then make Codex:

1. claim it;
2. read only the fields required for semantic audit;
3. independently verify one or more cards against official Scryfall data;
4. optionally write a synthetic semantic/finding result only if needed to prove the path;
5. finish the audit item;
6. remove every synthetic test row afterward.

Pass condition: the full path succeeds without touching real user data.

## Required recurring workflow after canaries pass

Each scheduled run should do this and nothing broader:

1. Execute a minimal Supabase health check.
2. Reset stale audit locks with `aeon_reset_stale_audits()`.
3. Claim only a **small pending batch** with `aeon_claim_audit_batch(...)`.
4. If there is no pending work, end successfully with no writes beyond the stale-lock reset.
5. For each claimed analysis, inspect only the minimum necessary analysis/card evidence.
6. Treat Aeon tags, packages and result metrics as claims to test.
7. Independently resolve relevant cards against current official Scryfall Oracle/type data.
8. Reuse `card_semantics` only when `(oracle_id, oracle_hash, semantic_version)` exactly matches.
9. Write only high-confidence semantic memory with `aeon_upsert_card_semantic(...)`.
10. Write recurrent/high-confidence anomaly groups with `aeon_upsert_finding(...)`.
11. Mark fully processed items complete with `aeon_finish_audit_item(...)`.
12. Requeue incomplete/failed items with `aeon_requeue_audit_item(...)` and preserve a concise operational error.
13. Never rescan all historical analyses just because the queue is empty.

## Semantic audit principles

When interpreting cards, reason from functional game actions rather than string matching.

Examples of distinctions the auditor must preserve:

- ownership vs control;
- one-shot sacrifice enabler vs repeatable sacrifice outlet;
- reminder text vs operative rules text;
- card draw vs card selection/impulse access;
- cost reduction vs mana production;
- cast trigger vs ETB trigger;
- commander-specific interaction vs generic interaction;
- independent enabler + payoff package vs a coincidental tag overlap.

The auditor should produce a finding only when there is enough independent evidence to explain **what Aeon likely misclassified and why**.

## Promotion boundary

An audit finding is not a production correction.

A candidate correction may be proposed only after sufficient recurrence/confidence, and then must go through Aeon's normal engineering gates:

- semantic regression test;
- metamorphic invariants;
- adversarial audit suite;
- macro benchmark 1800;
- macro benchmark 3200;
- convergence checks;
- historical holdout comparison when available.

Large unexplained score movement is a regression signal, not proof of improvement.

## Failure behavior

The recurring task must **not disable or delete itself** because one run fails.

If Supabase, Scryfall or another required tool is temporarily unavailable:

- do not fabricate results;
- do not broaden permissions;
- do not modify infrastructure to bypass the failure;
- do not leave claimed items permanently locked;
- requeue safely when possible;
- report the exact operational failure for that run;
- leave the recurring schedule intact for the next run.

## Recommended schedule

After all canaries pass:

- cadence: **hourly**;
- process only a small queue batch each run;
- no full-database polling scan;
- no production deploy from the auditor.

## Ready-to-use Codex instruction

Give Codex this instruction from the repository root:

```text
Read docs/CODEX_AUDITOR_TASK.md and docs/SEMANTIC_AUDIT.md completely before acting.

Your job is to validate whether the Codex automation environment can safely run Aeon's scheduled semantic auditor, then create the recurring task only if every mandatory canary in CODEX_AUDITOR_TASK.md passes.

Target Supabase project: mtg-simulator, project id jrzzlcklctmqgemepucs.
Repository: megazz31/aeon-scorer.

Do not change Aeon's score by judgement. Do not modify the engine, taxonomy, production deployment, schema, RLS or permissions to make the automation pass. Do not use an OpenAI API key or GitHub Models worker.

First run the canaries exactly as defined in the document, using synthetic data only for mutation tests and cleaning it up afterward. A SELECT-only success, an empty claim, or UPDATE ... WHERE false does not prove the write path.

Also prove official Scryfall Oracle/type access from the same automation environment.

If any mandatory canary fails, do not create or enable the recurring auditor. Report exactly which capability is blocked and why.

If every canary passes, create an hourly Codex automation that follows the Required recurring workflow and all Non-negotiable rules in docs/CODEX_AUDITOR_TASK.md. Keep the schedule alive across transient per-run failures. Do not merge or deploy application changes automatically.
```

## Current context

A previous attempt using ChatGPT Scheduled Tasks was able to perform read-only Supabase SQL but was blocked by OpenAI safety checks when attempting genuine mutations/claim operations. Direct Scryfall access from that scheduled-task environment was also unreliable.

That is why **Codex must prove its own automation environment independently** rather than assuming that interactive ChatGPT behavior or ChatGPT Scheduled Task behavior applies to Codex.
