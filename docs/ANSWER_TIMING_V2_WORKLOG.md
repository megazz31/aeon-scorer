# Aeon Answer Timing V2 Worklog

Branch: `product-answer-timing-v2`  
Base: `product-temporal-first-access`  
Validation PR: `#13`

Goal: replace class timing derived only from `general interaction × class density` with class-specific first-access timing that uses the actual answer cards, their mana values and the true cumulative interaction-access primitive from Temporal V2.

## Invariants

- no Aeon 0–100 score formula changes;
- no card semantic tagging changes;
- answer classification stays explicit and evidence-bearing;
- old analyses without true first-access Horizon data keep a backward-compatible fallback;
- new class timing is cumulative/monotone and bounded 0..100;
- model versions change only when the new timing is actually active;
- no merge without explicit approval.

## Answer Profile V2

**Model:** `answer-profile-v2`

The semantic answer classes remain unchanged: `stack`, `creature`, `artifact`, `enchantment`, `graveyard`, `wipe`.

When Temporal V2 exposes `interaction` as `cumulative-first-access`, each answer class now uses a conservative class-specific timing envelope:

1. identify the actual cards covering that answer class;
2. determine the earliest simple mana-value turn for each card;
3. estimate the probability that at least one eligible class card has been seen by that turn using the deck population and draws-to-date;
4. cap that probability by Aeon's true cumulative first-interaction access;
5. enforce monotonicity.

Per-class public-safe aggregates:

- count;
- density;
- structural availability scale;
- mean mana value;
- earliest mana turn;
- timing method;
- cumulative turn curve.

The method is intentionally described as `class-card-draw-mv-envelope`, not rules-complete casting. Alternate costs, exact colored-mana states, tutors and draw sequencing remain approximations.

Historical analyses without cumulative first-access evidence retain the exact V1 fallback `general interaction × class density` and are labelled `scaled-general-interaction-fallback`.

## Threat / Pod version propagation

Version promotion is evidence-gated:

- Answer Profile: `answer-profile-v2`;
- Threat Profile: `threat-profile-v2`;
- Threat–Answer becomes `threat-answer-v3` only if at least one actual class uses `class-card-draw-mv-envelope`; otherwise it remains `threat-answer-v2`;
- Pod Match becomes `advanced-pod-match-v4` when Threat–Answer V3 is active;
- Game Quality becomes `game-quality-v3` under the same condition;
- Pod Intelligence becomes `pod-intelligence-v4` only when class-specific timing is active; legacy/fallback pods remain `pod-intelligence-v3`;
- Deck Intelligence / sanitized public intelligence are `deck-intelligence-v2` / `share-intelligence-v2`.

This avoids falsely labelling old shared snapshots as if they had new temporal evidence.

## Privacy

Public shares expose only the aggregate class timing fields above. Tests explicitly prove that answer-card names and Oracle text are absent from the share payload.

## Regression coverage

`answer-timing-v2-test.mjs` proves:

1. every class timing curve is bounded and monotone;
2. two CMC-2 counterspells become reachable earlier than CMC-5/6 wipes;
3. graveyard interaction at CMC 1 can become reachable from turn 1;
4. historical analyses reproduce the exact previous density-scaled fallback;
5. Threat–Answer promotes to V3 only with actual Answer Timing V2 evidence;
6. legacy timing stays Threat–Answer V2;
7. the complete active chain becomes Pod Intelligence V4 / Pod Match V4 / Game Quality V3;
8. the legacy chain remains on prior versions;
9. public serialization exposes only aggregate timing fields and no answer-card evidence.

The first CI attempt (#217) failed only because the historical roadmap contract still expected the intentionally superseded outer model label `deck-intelligence-v1`. The new dedicated Answer Timing test had already passed. That contract was corrected to `deck-intelligence-v2` without changing engine behavior.

## Validation

Validated non-document code commit: `6a5876aa1766c7823f07cb9e8babe79d95135f34`  
Workflow: `P2-P7 product validation #219`  
Conclusion: **SUCCESS**

Passed together:

1. Smoke;
2. Semantic contracts;
3. Metamorphic contracts;
4. Product contracts;
5. Public precon contract;
6. Adversarial audit;
7. Build.

Base-to-code audit from `30c8655a69a5e69defdf5e85373c462782ca1734`:

- ahead by 12, behind by 0;
- changes confined to Answer/Threat/Pod/Game Quality product models, tests, workflow and documentation;
- no `cardFeatures.js` change;
- no `packageGraph.js` change;
- no `powerModel.js` change;
- no sequence simulator change;
- no semantic version change;
- no Aeon power coefficient change.

## Status

- Answer Profile V2: done;
- truthful legacy fallback: done;
- Threat–Answer V3: done;
- Pod Match V4 / Game Quality V3 propagation: done;
- sanitized public aggregates: done;
- regression tests: done;
- full validation: **green (#219)**;
- merge: **not authorized / not performed**.

## Next step

The next justified layer is **Threat Objects**: represent a material threat as an explicit object containing threat family, source evidence, prerequisites, target temporal curve/window and relevant answer classes. This will let future Threat–Answer compare answer timing against a concrete threat object rather than only a broad package/friction-derived class.

## Semantic integration gate

Rechecked after validation: PR #8 remains repository-visible at `3.2.0-semantic-10`, HEAD `d076a9eb9322629b8a2879815a982ca9a22487d6`. Semantic-12 is still not auditable through GitHub. Before release/integration, replay the complete stacked product validation on semantic-12 or later once repository-visible.
