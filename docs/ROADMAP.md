# Aeon Scorer — roadmap

_Last updated: 2026-08-23_

## Product thesis

Aeon Scorer should become a **shared, explainable measurement layer for Commander**, not another generic deckbuilder, recommendation bot or subjective “power level 7” calculator.

Every roadmap item must preserve five invariants:

1. **Explainable** — important outputs trace back to cards, packages, access windows and model assumptions.
2. **Probabilistic** — a deck has a distribution of possible structural outputs, not one deterministic truth.
3. **Practical** — the primary result helps real pregame/table decisions.
4. **Falsifiable** — user analyses and AI audits can reveal errors, but cannot directly redefine the production model.
5. **Open / portable** — the long-term value is an Aeon measurement protocol that other Commander tools can consume.

## Non-goals

Aeon should not drift into:

- a full Magic rules engine;
- a win-rate predictor;
- a replacement for official Commander Brackets;
- an EDHREC-style popularity recommender;
- a black-box LLM that assigns a score by judgement;
- a deckbuilder whose main value is suggesting cards;
- automatic model changes learned from user scores or repeated tags.

---

## v3.2.1 — audit hardening patch

**Goal:** remove identified regressions and strengthen release discipline without changing the v3.2 product identity.

### Candidate scope

- Operational sacrifice package hardening.
- Semantic regression tests for one-shot sacrifice enablers.
- Candidate version bump and ingestion version alignment.
- CI backstop on `main` pushes.
- Saved-deck cap relaxed from 10 to a non-product safety ceiling.
- Versioned roadmap/status/release documentation.

### Promotion gate

No production claim until the exact candidate head passes the full semantic, metamorphic, adversarial, build, 1,800/3,200 calibration and convergence suite.

---

## v3.2.x — operational integrity

**Goal:** make the current v3.2 platform trustworthy and reproducible before adding major product surface.

### P0 — source-of-truth infrastructure

- Reconstruct/export every foundational Supabase migration required by `decks`, `analysis_runs`, semantic-audit tables and helper functions.
- Make a clean database branch reproducible from the repository alone.
- Add schema drift verification to release checks.
- Document Edge Function deployment/version alignment.
- Enable GitHub `main` protection/ruleset with mandatory PR and mandatory Aeon quality status.

### P1 — data transparency and privacy UX

- Replace ambiguous “does not memorize decklists” wording with “does not score through memorized decklists or lookup tables.”
- Explain at analysis time what is stored for semantic QA and why.
- Clearly distinguish anonymous corpus data, account-linked history and saved decks.
- Add an explicit user-facing corpus participation/privacy policy before expanding community adoption.
- Keep deletion semantics testable and documented.

### P1 — cloud reliability

- Propagate refreshed Supabase sessions/tokens into React state for long-lived tabs.
- Add retry/error states that distinguish auth expiry, ingestion mismatch and transient network failure.
- Add version compatibility messaging when frontend and ingestion endpoint differ during deployment.

### P2 — semantic diagnostics

- Localize/display role qualifiers such as one-shot vs repeatable.
- Surface model limitations attached to the specific cards/mechanics that cause them.
- Separate deck variance from model uncertainty.

---

## v3.3 — Aeon Table Match

**Goal:** turn the current distribution into a necessary pregame tool.

### Core experience

Analyze/compare 2–4 decks and answer:

> “Is this table structurally compatible, and where is the mismatch risk?”

### Inputs

- Existing Aeon analysis profiles.
- Median, P20, P80, peak.
- Access timing for commander/packages/interaction.
- Known high-confidence combos.
- Dimension vectors.
- Model-coverage/uncertainty warnings.

### Outputs

- Pairwise and table-wide compatibility score **with explanations**.
- Range overlap / mismatch visualization.
- “Median match, peak mismatch” warnings.
- “Similar headline score, different speed/interaction profile” warnings.
- Identification of the deck creating the largest mismatch risk without labelling that deck “wrong.”

### Guardrails

- No single universal “allowed/not allowed” threshold.
- No conversion to Commander Brackets.
- Always show the reasons for mismatch.

### Success criterion

A pod should get more value from comparing four Aeon profiles than from saying “we are all around a 7.”

---

## v3.3 — Deck Evolution / Aeon Diff

**Goal:** explain what a deck change actually did.

Compare two immutable analyses of the same saved deck and report:

- score distribution movement;
- package activation changes;
- timing/access changes;
- dimension changes;
- newly detected/lost combo access;
- which changed cards are the main structural drivers.

Example output:

> Median +3, P80 +6. Primary cause: graveyard package becomes accessible earlier after two tutor/recursion changes. Interaction timing is unchanged.

This should remain analysis, not automated deck optimization.

---

## v3.4 — functional prerequisite graph

**Goal:** improve semantic truth without becoming a complete Magic rules engine.

Move progressively from flat tags:

`card -> role`

toward explicit functional capabilities:

`card -> action + requirements + resources consumed + repeatability + timing`

### First primitives

- `repeatable: true/false`
- `requires_permanent`
- `requires_card_type`
- `consumes_permanent`
- `requires_graveyard_target`
- `requires_hand_card`
- `conditional_mana`
- `once_per_turn`
- `commander_only_mana`

### Why

This directly fixes classes of false positives such as one-shot sacrifice effects, contextual mana and packages whose components are individually castable but not jointly executable.

### Validation policy

Each new primitive must be introduced with micro truth tests and historical deck holdouts before it can affect production scoring.

---

## v3.4 — sequence-model frontier

After prerequisite semantics are stable:

1. Tutor → target → package execution.
2. Draw propagation into later turns/sequences.
3. Better alternate/free-cost execution.
4. Conditional mana and resource consumption.
5. More realistic package disruption/recovery checkpoints.
6. Partner / Background / dual-commander support.
7. Combo accessibility through tutors/redundancy/protection rather than known-piece presence only.

Do not implement these all at once. Each changes the meaning of access and must be independently falsifiable.

---

## v3.5 — Aeon Fingerprint and shareable analyses

**Goal:** make an Aeon result a reproducible object, not just a screenshot.

A shareable analysis should expose:

- engine version;
- semantic version;
- model id;
- deck hash;
- Oracle snapshot hash/date;
- iteration count;
- P20/median/P80/peak;
- dimensions;
- packages/combos;
- coverage/model limitations.

### UX

- Stable share URL.
- Compact Aeon fingerprint.
- QR code for in-person Commander tables/LGS use.
- Historical result remains immutable even after the engine improves.

---

## v3.5 / v3.6 — public Aeon result schema/API

**Goal:** let other community tools consume Aeon without reimplementing it.

Publish a versioned result contract, for example:

```json
{
  "engine_version": "3.x.x",
  "semantic_version": "...",
  "deck_hash": "...",
  "oracle_snapshot_hash": "...",
  "power": {
    "p20": 48,
    "median": 57,
    "p80": 66,
    "peak": 81
  },
  "dimensions": {},
  "packages": [],
  "limitations": []
}
```

Potential consumers:

- Moxfield/Archidekt-style deck pages;
- Discord bots;
- LGS Commander tooling;
- tournament/event pod tools where appropriate;
- community websites and research projects.

The API/schema should expose model/version identity so third parties never mistake old results for current production truth.

---

## v3.6 — model uncertainty

**Goal:** distinguish “this deck has high variance” from “Aeon is uncertain about this mechanic.”

Keep P20–P80 as **deck-output variance**.

Add a separate explainable model-quality object based on:

- unsupported mechanics;
- contextual mana approximations;
- semantic coverage;
- unknown/low-confidence card semantics;
- unresolved audit findings;
- score stability across sampling/model checks.

Avoid a fake generic “87% confidence” number unless it has a defensible statistical meaning.

---

## v4 — Aeon as community measurement infrastructure

Long-term direction, only after v3.x is robust:

- Table Match integrated into external/community workflows.
- Public versioned Aeon result protocol.
- Reproducible open calibration corpus where licensing/privacy permits.
- Public regression examples for known semantic failure classes.
- Community-submitted adversarial test cases.
- Tool integrations that display the Aeon fingerprint next to a deck.
- Independent verification tooling for third parties.

### Definition of success

Aeon becomes useful even when the user never visits the Aeon website directly because Commander tools and communities can reference the same transparent measurement language.

---

## Continuous track — semantic auditor

The semantic QA loop runs alongside product versions and never bypasses release gates.

`RAW ANALYSIS -> INDEPENDENT AUDIT -> FINDING -> HUMAN/TESTABLE CANDIDATE -> REGRESSION TEST -> FULL GATES -> APPROVED MODEL`

Priority ranking for findings should consider:

- recurrence across distinct decks;
- impact on package/access interpretation;
- estimated score impact;
- confidence of independent Oracle-based evidence;
- mechanic breadth (one card vs systemic rule);
- whether the error violates a monotonic/model invariant.

Frequency alone is never proof of correctness.
