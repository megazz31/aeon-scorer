# Aeon Scorer — Product Plan

> Living product roadmap for turning Aeon from a deck power analyzer into a **Commander Intelligence Engine** focused on game quality, matchup fit and explainable causal analysis.
>
> This file is intentionally product-first. It should remain stable as a reference while implementation details evolve.

---

## 1. Product thesis

Aeon must not become another tool whose main promise is:

> "Your Commander deck is a 7/10."

A single power number cannot explain whether four decks will produce a good game.

Aeon's long-term public utility should be:

> **Understand what a deck can do, when it can do it, what it depends on, whether the table can answer it, whether four decks are likely to produce a compatible game, and what minimal change can repair a bad pod.**

The 0–100 score remains useful, but it becomes only one output among several.

### Core identity

Aeon should preserve three foundations:

1. **Semantic understanding** — infer roles, packages, bridges, payoffs, interaction and structural dependencies from Oracle text.
2. **Causal sequencing** — estimate what the deck can actually access and deploy over time instead of counting cards statically.
3. **Explainability** — every important conclusion must be traceable to evidence, cards, packages or simulated behavior.

### Product north star

The long-term question Aeon should answer better than competing tools is:

> **"Will these decks produce the kind of Commander game these players want to play?"**

---

## 2. Non-negotiable principles

### 2.1 No moralized deck labels

Do not create a punitive "salt score".

Stax, extra turns, mass land denial, theft, fast combo, commander denial and long trigger chains are **experience characteristics**, not moral failures.

Aeon should expose them neutrally so the table can make an informed choice.

### 2.2 No popularity-as-truth

External services such as Commander Spellbook, Wizards Commander Brackets / Game Changers, EDHREC-like popularity data or community feedback may provide evidence or context.

They must not become semantic truth by themselves.

### 2.3 No hidden collapse into one score

Important asymmetries must remain visible separately:

- normal output range;
- peak;
- speed;
- explosiveness;
- consistency;
- interaction;
- resilience;
- dependency;
- friction / experience characteristics;
- threat windows;
- answer windows.

### 2.4 Do not display fake precision

Until real-game calibration exists, Aeon must avoid statements such as:

> "This pod has a 73% probability of being a good game."

Early versions should use calibrated categories such as:

- low risk;
- moderate risk;
- high risk;

with transparent reasons.

Probability claims become public only after sufficient real-game validation.

### 2.5 Human intent matters

Decklists do not contain all relevant information.

Aeon must distinguish what can be inferred from the list from what must be asked of the player, especially:

- whether a combo is an intended primary line;
- whether an infinite loop will be used immediately;
- whether repeated extra turns are intended;
- desired game duration / intensity;
- acceptable friction types.

The product should ask as few questions as possible and only when they materially change pod assessment.

---

## 3. Existing product foundation — P0 / P1

P0 / P1 are the foundation, not the final product.

### P0 — practical Rule 0 layer

- sanitized shareable Rule 0 analysis cards;
- Pod Match for 2–4 Aeon shares;
- Commander Spellbook combo and bracket evidence through a server-side proxy;
- Moxfield / Archidekt source refresh and card diff;
- immutable saved decklist versions;
- analysis feedback routed to semantic audit rather than automatically changing truth.

### P1 — contextual and exploratory tools

- Commander Brackets / Game Changers as parallel informational signals;
- local What-if analysis with before / after deltas;
- correct support for multiple command-zone cards, Partner and Background semantics once command-zone access, tax, identity and tests are fully correct.

### P0 / P1 product lesson

The useful direction is already visible:

- **Rule 0 Card** makes Aeon shareable;
- **Pod Match** changes the question from one deck to a table;
- **What-if** changes Aeon from diagnosis to experimentation;
- **feedback → semantic audit** creates a quality loop without crowd-sourcing truth.

Everything after P1 should reinforce those directions.

---

# 4. Roadmap overview

| Phase | Focus | Main deliverables |
|---|---|---|
| **P2** | Experience Intelligence | Experience Fingerprint, Table Friction, Goldfish Horizon, SPOF |
| **P3** | Pod Intelligence | Threat–Answer Timeline, Adaptive Rule 0, advanced Pod Match |
| **P4** | Game Quality Engine | Non-Game Risk, Combo Accessibility, Vulnerability Matrix |
| **P5** | Aeon Match | N-player matchmaking, LGS flow, Pod Repair, QR / fast join |
| **P6** | Causal Deck Doctor | constrained What-if, causal swap recommendations, targeted pod tuning |
| **P7** | Aeon Reality | real-game observations, calibration, confidence model, validated game-quality prediction |

P7 instrumentation should begin much earlier than P7 itself.

---

# 5. P2 — Experience Intelligence

## Goal

Describe **what kind of game experience a deck tends to produce**, independently from its raw power score.

P2 should be almost entirely derivable from Aeon's existing semantic and simulation outputs.

---

## 5.1 Experience Fingerprint

### User question

> "What does playing with or against this deck actually feel like?"

### Proposed dimensions

Initial dimensions should be evidence-based and kept small enough to understand at a glance.

1. **Tempo** — how quickly the deck establishes meaningful board / engine presence.
2. **Explosiveness** — ability to jump significantly ahead in one turn.
3. **Volatility** — how different weak, normal and high-roll sequences are.
4. **Interaction** — amount and timing of meaningful answers.
5. **Resilience** — ability to continue or rebuild after disruption.
6. **Inevitability** — tendency for advantage to become increasingly difficult to reverse.
7. **Dependency** — reliance on commander / graveyard / specific permanent classes / specific engines.
8. **Turn Complexity** — expected amount of game actions / chained triggers / storm-like sequencing.

### Inputs

Prefer existing causal outputs where available:

- P20 / median / P80 / peak;
- speed;
- explosiveness;
- consistency;
- interaction;
- resilience;
- semantic roles;
- package graph;
- command-zone access;
- repeated action / trigger structures.

### Acceptance criteria

- no dimension exists only because of a hand-maintained card list when semantic evidence can express it;
- every dimension has a documented definition;
- every dimension can expose its strongest contributing evidence;
- changing one unrelated card must not create large unrelated fingerprint changes;
- benchmark decks with visibly different play patterns must separate in expected directions.

---

## 5.2 Table Friction Profile

### User question

> "What should the table know before this deck is played?"

### Important rule

Do **not** output "good", "bad", "toxic" or "salty".

Output neutral characteristics.

### Candidate friction signals

- Resource Denial;
- repeated taxes / stax;
- Mass Land Denial;
- Commander Lockout;
- permanent theft / control exchange;
- recurring Extra Turns;
- deterministic / repeated loops;
- high Turn Complexity;
- repeated forced discard / sacrifice;
- hard or soft locks;
- unusually long solitaire sequencing.

### Output example

```text
Table characteristics
- Repeated resource denial: High
- Extra-turn recurrence: None detected
- Commander lockout: Moderate
- Turn complexity: High
```

### Acceptance criteria

- labels are descriptive, not moral;
- evidence links to specific cards / packages;
- observer-only text cannot falsely create friction;
- a single incidental effect must not equal a recurring structural plan;
- recurrence / redundancy must matter more than one-off presence.

---

## 5.3 Goldfish Horizon

### User question

> "When does this deck become operational or threatening?"

Instead of another static number, expose cumulative temporal curves.

### Candidate events by turn

- access to 4+ usable mana;
- commander castable;
- commander + engine online;
- primary package online;
- meaningful interaction available;
- critical threat / lethal line accessible;
- combo line accessible.

### Output

For turns T1–T10, provide cumulative probabilities or stable bands.

Example:

```text
T3  18% engine online
T4  34%
T5  57%
T6  72%
```

### Important

Goldfish Horizon is useful by itself but is mainly a prerequisite for **Threat–Answer Timeline** in P3.

### Acceptance criteria

- deterministic with fixed seed / iteration configuration;
- convergence checked between validation iteration counts;
- no hidden assumption that "engine online" equals "winning";
- event definitions documented and semantically testable.

---

## 5.4 Single Point of Failure Index — SPOF

### User question

> "What single disruption hurts this deck the most?"

### Core method

Use counterfactual analysis rather than static tags.

Run controlled variants such as:

- commander normal;
- commander taxed +2;
- commander taxed +4;
- commander unavailable;
- graveyard disabled;
- key permanent class suppressed;
- selected package disabled where a reliable model exists.

### Example

```text
Normal median           52
Commander +2 tax        47
Commander +4 tax        39
Commander unavailable   31

Commander dependency: HIGH
```

### Outputs

- Commander Dependency;
- Graveyard Dependency;
- Artifact Dependency;
- Enchantment Dependency;
- Creature-board Dependency;
- highest structural SPOF.

### Acceptance criteria

- the index must be based on causal delta, not card count;
- distinguish dependency from mere synergy;
- expose absolute and relative delta;
- avoid simulating impossible state changes as if they were actual Magic rules;
- document each counterfactual assumption.

---

# 6. P3 — Pod Intelligence

## Goal

Move from analyzing individual decks to analyzing **interactions between four temporal game plans**.

This is a major strategic step.

---

## 6.1 Threat–Answer Timeline

### User question

> "When one deck becomes dangerous, can the rest of the pod actually answer it?"

This is the extension of Goldfish Horizon that matters most for game quality.

### Core concept

For each turn, estimate both:

- probability that a deck presents a meaningful threat;
- probability that opponents have an appropriate answer available in that same window.

### Answer classes

Do not treat all interaction as interchangeable.

At minimum distinguish:

- stack interaction;
- creature removal;
- artifact removal;
- enchantment removal;
- graveyard interaction;
- board wipes;
- protection / anti-interaction;
- resource denial where relevant.

### Example

```text
Deck A must-answer threat before T5: 41%
Rest of pod relevant answer before T5: 17%

Warning: exposed threat window T4–T5.
```

### Why this matters

A T5 combo is not automatically a bad matchup.

A T5 combo in a pod that reliably carries appropriate interaction may be healthy.

A T5 combo in a pod with almost no relevant answer creates a much higher non-game risk.

### Acceptance criteria

- answer type must match threat type;
- "interaction count" alone is insufficient;
- protection must affect answer reliability;
- timing / mana availability must matter;
- threat classification must be explainable.

---

## 6.2 Adaptive Rule 0

### User question

> "What do we actually need to discuss before this specific game?"

### Product behavior

Do not ask every player a generic questionnaire.

Analyze the pod first, then ask **0–3 high-information questions only**.

Examples:

- "Your deck contains a recurrent extra-turn engine. Do you intend to loop it as soon as it is available?"
- "This two-card combo is highly accessible. Is it a primary win plan or a backup finisher?"
- "This pod has a strong resource-denial asymmetry. Is repeated land denial acceptable at this table?"

### Goal

Reduce uncertainty that cannot be resolved from decklists.

### Acceptance criteria

- maximum three questions by default;
- every question maps to a material uncertainty in pod assessment;
- no generic questions if the decklist already answers the issue;
- player responses affect experience / matchmaking interpretation but do not rewrite Aeon semantic truth;
- answers should be ephemeral by default unless user explicitly saves preferences.

---

## 6.3 Advanced Pod Match

Current Pod Match is the base.

P3 should evolve it from range comparison toward **multi-axis compatibility**.

### Compatibility inputs

- median gap;
- P20–P80 overlap;
- peak gap;
- volatility gap;
- speed gap;
- explosiveness gap;
- interaction profile;
- Threat–Answer mismatch;
- friction mismatch;
- player intent where known.

### Important architecture rule

Do not immediately collapse all dimensions into an opaque weighted score.

Maintain:

1. a machine-readable compatibility model;
2. separate human-readable reasons.

### Acceptance criteria

Every mismatch verdict must answer:

- **what differs?**
- **how large is the difference?**
- **why can that create a bad game?**
- **what information could change the verdict?**

---

# 7. P4 — Game Quality Engine

## Goal

Estimate **why a game is likely to become a non-game**, without pretending to perfectly simulate multiplayer Magic.

---

## 7.1 Non-Game Risk / Game Quality Forecast

### User question

> "Is this table likely to produce the kind of game we want?"

### Early public output

Until real-world calibration exists:

```text
Game Quality Forecast
Normal game compatibility: GOOD
Non-game risk: MODERATE

Primary risk:
Deck A frequently creates an unanswered threat window on T4–T5.

Secondary risk:
Deck C is highly commander-dependent and the pod contains heavy creature removal.
```

### Initial non-game mechanisms to detect

- one deck operates materially earlier than the rest;
- major threat arrives before relevant answers;
- one deck has a much higher peak / high-roll frequency;
- structural hard counter between decks;
- commander dependency meets heavy commander interaction;
- graveyard dependency meets abundant graveyard hate;
- lock / denial pattern disproportionately shuts off some decks;
- repeated combo accessibility significantly exceeds pod answer windows;
- severe experience-intent mismatch.

### Critical rule

The first implementation is a **risk model**, not a win-rate simulator.

### Acceptance criteria

- no unsupported exact percentage;
- each risk has causal evidence;
- distinguish "power mismatch" from "matchup mismatch";
- distinguish "experience mismatch" from "power mismatch";
- validation corpus includes intentionally deceptive pairs with similar median but incompatible play patterns.

---

## 7.2 Combo Accessibility

### User question

> "How likely is this combo to actually become available in a real game window?"

Presence is not enough.

### Inputs

For every identified combo line:

- number of pieces;
- commander participation;
- mana cost / colored requirements;
- card zones;
- compatible tutors;
- conditional tutors;
- draw / selection support;
- redundancy / interchangeable pieces;
- recursion where relevant;
- protection;
- timing restrictions;
- prerequisites.

### Target metrics

- access before T5;
- access before T7;
- access before T9;
- median access turn where meaningful;
- probability line is protected enough to attempt;
- commander-dependent vs main-deck-only.

### Implementation principle

Commander Spellbook identifies candidate lines and prerequisites.

Aeon estimates their **accessibility inside this actual deck**.

### Acceptance criteria

- combo presence and combo accessibility remain separate fields;
- tutors only count if they can actually find the missing piece;
- mana and timing must be respected;
- commander-zone access handled separately;
- 2-card and 3-card lines tested independently;
- incomplete or ambiguous prerequisites reduce confidence rather than silently becoming satisfied.

---

## 7.3 Vulnerability Matrix

### User question

> "What kinds of opposing interaction meaningfully disrupt this deck?"

### Candidate vulnerability classes

- graveyard hate;
- creature removal;
- commander removal / tax;
- board wipes;
- artifact suppression;
- enchantment suppression;
- Rule of Law / cast restrictions;
- counterspells;
- resource denial;
- exile-based interaction.

### Preferred method

Use a combination of semantic dependency graph and controlled counterfactual simulation.

### Output example

```text
Graveyard hate       VERY HIGH
Commander removal    HIGH
Board wipes           MODERATE
Artifact shutdown     LOW
Rule of Law           HIGH
```

### Acceptance criteria

- vulnerability must reflect how much of the active plan is affected, not raw permanent counts;
- SPOF feeds this matrix;
- causal simulation preferred where model quality permits;
- confidence displayed for uncertain classes.

---

# 8. P5 — Aeon Match

## Goal

Turn Aeon into a public / LGS tool that **forms better Commander tables automatically**.

This is the strongest viral / public-use opportunity.

---

## 8.1 N-player matchmaking

### User scenario

16–64 players arrive at an LGS or event.

Each player provides:

- one or more Aeon deck shares;
- desired experience;
- optional constraints.

Aeon forms tables of four.

### Optimization objective

Minimize expected mismatch across each table using multiple independent terms.

Candidate loss components:

- normal-range mismatch;
- peak mismatch;
- speed mismatch;
- Threat–Answer mismatch;
- friction / expectation mismatch;
- extreme dependency hard-counters;
- repeated-player constraints if used in event mode.

### Important

Exact runtime targets must be benchmarked on Aeon. Do not document unverified millisecond guarantees.

A heuristic optimizer is acceptable if it is:

- deterministic under a seed;
- fast enough for 16–64 players;
- testable against small exact-search cases;
- capable of explaining why each table was chosen.

### Acceptance criteria

- 16 / 32 / 64-player benchmark datasets;
- optimizer never leaves avoidable severe mismatch when a clearly better partition exists in test fixtures;
- optional re-run with constraints;
- mobile-first input flow;
- no requirement for account creation to join a public pod.

---

## 8.2 Pod Repair

### User question

> "This pod is bad. What is the smallest change that fixes it?"

This must exist before aggressive deck-tuning recommendations.

### Repair hierarchy

Prefer the least intrusive solution first:

1. swap players / decks between tables;
2. choose another already-registered deck;
3. explicitly accept the detected asymmetry;
4. modify desired play-experience constraints;
5. only then propose deck micro-tuning when requested.

### Example

```text
Current pod: HIGH mismatch risk

Best repair:
Move Deck A to Table 3 and Deck F to this table.

Result:
- median spread 11 -> 4
- exposed threat window removed
- friction preferences compatible
```

### Acceptance criteria

- always show before / after reasons;
- never require deck modification when another table arrangement solves the problem;
- support multiple repair candidates;
- preserve player constraints.

---

## 8.3 Fast public / LGS flow

Potential flow:

1. organizer creates session;
2. QR code appears;
3. players scan;
4. paste Aeon share or import deck;
5. optionally pick intended experience;
6. organizer sees readiness count;
7. Aeon generates pods;
8. players receive table assignment.

### Product requirement

Joining must be almost frictionless.

Long setup destroys the value proposition at a real store.

---

# 9. P6 — Causal Deck Doctor

## Goal

Move What-if from manual experimentation to **causal optimization under user constraints**.

The differentiator is not "popular cards for your commander".

The differentiator is:

> "What minimal change produces the outcome you actually want?"

---

## 9.1 Causal explanation of a manual swap

Every What-if result should eventually explain not only the score delta but the mechanism.

Example:

```text
Sol Ring removed
Median     -2
Peak       -5
Commander T4 access   -11 percentage points
Fast-mana package     71 -> 58
Normal consistency    -1
```

### Acceptance criteria

- no unexplained "+3" recommendation;
- report which dimensions and temporal events changed;
- preserve seed / comparison methodology so before-after noise remains controlled.

---

## 9.2 Constrained Deck Doctor

### User requests Aeon should support

- "Reduce my peak without changing the median much."
- "Make this deck less commander-dependent."
- "Increase early interaction without changing the deck's main identity."
- "Get this deck closer to my regular pod."
- "Improve consistency without adding fast mana."
- "Remove the exposed T4–T5 threat mismatch."

### Two-stage search architecture

#### Stage 1 — semantic candidate filtering

Use:

- color identity;
- mana value;
- role / package needs;
- card type;
- budget if provided;
- explicit exclusions;
- user identity constraints.

Generate a small candidate set.

#### Stage 2 — fast causal evaluation

Evaluate only the strongest candidate swaps with low-iteration controlled simulations.

Then re-run finalists at full validation iterations before presenting a strong recommendation.

### Critical rule

Do not publish performance promises until benchmarked.

### Acceptance criteria

- no recommendation outside color identity;
- preserve Commander legality;
- respect user exclusions;
- distinguish exploratory fast estimate from validated result;
- recommendations include causal explanation;
- full-run confirmation before calling a candidate "best".

---

## 9.3 Targeted Pod Tuning

### User scenario

A regular group repeatedly plays the same 4–8 decks and wants fewer non-games without rebuilding everything.

### Goal

Suggest **1–2 optional micro-swaps** that reduce the largest measured asymmetries while preserving deck identity.

### Important ordering

This comes after Pod Repair.

The default answer to a bad pod must not always be "change your deck".

### Acceptance criteria

- user explicitly opts into deck changes;
- optimize for measured mismatch reduction, not generic power normalization;
- explain which non-game mechanism is reduced;
- compare impact on deck identity / packages.

---

# 10. P7 — Aeon Reality

## Goal

Validate whether Aeon's predictions correlate with **real Commander games**.

This is the long-term moat.

---

## 10.1 Start instrumentation early

Although model use is P7, data collection should begin as soon as Rule 0 / Pod flows have enough public users.

Never ask users to manually assign a deck a numeric "true power level".

Collect observations about games instead.

### Minimal post-game flow

Target: <= 30 seconds.

Possible fields:

1. ending turn / approximate turn band;
2. win type: combat / combo / drain / concession / other;
3. commander timing: expected / delayed by interaction / mana issue / never relevant;
4. table-perceived balance on a short ordinal scale;
5. optional dominant event: runaway start / lock / unanswered combo / mana screw / normal game.

Keep subjective questions clearly marked as subjective.

---

## 10.2 What real-game data is for

Use it to test hypotheses, for example:

- do high Threat–Answer mismatches correlate with non-games?
- does high peak asymmetry correlate with runaway games?
- does commander SPOF predict poor outcomes against commander-heavy interaction?
- does Experience Fingerprint mismatch correlate with dissatisfaction even when power ranges overlap?
- do Aeon-matched pods report fewer mismatches than random / manual pods?

Do **not** automatically train semantic card truth from these answers.

---

## 10.3 Confidence Model

Confidence should be decomposed rather than expressed as a magical global number.

Candidate components:

### Semantic confidence

- Oracle coverage;
- ambiguous clauses;
- unsupported mechanics;
- externally inferred combo prerequisites.

### Simulation confidence

- iteration count;
- convergence;
- seed / rerun stability;
- sample uncertainty.

### Product confidence

- whether relevant P7 behavior has enough validation data;
- whether matchup category has been sufficiently observed.

### Example

```text
Aeon median: 52
Semantic confidence: HIGH
Simulation stability: HIGH
Game-quality calibration: EXPERIMENTAL

2 cards contain unresolved semantic ambiguity.
```

### Acceptance criteria

- confidence never hides known ambiguity;
- unvalidated product models display EXPERIMENTAL;
- exact probabilistic outputs require calibration thresholds defined in tests / documentation.

---

## 10.4 When exact Game Quality probability may be shown

Do not expose exact values such as `Good game probability: 72%` until all are true:

1. sufficient number of real games exists;
2. data contains varied commanders, archetypes and power ranges;
3. holdout validation exists;
4. calibration curve is acceptable;
5. uncertainty interval is reported internally;
6. model performs materially better than simple baselines such as median spread alone;
7. no single playgroup dominates the dataset;
8. product copy explains that politics, pilot skill and multiplayer variance still matter.

---

# 11. Feature ranking

Scores are directional product priorities, not scientific measurements.

| Rank | Feature | Public utility | Differentiation | Feasibility |
|---:|---|---:|---:|---:|
| 1 | **Game Quality / Non-Game Forecast** | 10 | 10 | 7 |
| 2 | **Threat–Answer Timeline** | 10 | 10 | 7 |
| 3 | **Aeon Match** | 10 | 9 | 8 |
| 4 | **Adaptive Rule 0** | 10 | 10 | 9 |
| 5 | **Experience Fingerprint** | 10 | 8 | 9 |
| 6 | **Pod Repair** | 10 | 9 | 8 |
| 7 | **SPOF Index** | 9 | 9 | 8 |
| 8 | **Combo Accessibility** | 9 | 9 | 7 |
| 9 | **Real-game Validation** | 10 | 10 | 5 |
| 10 | **Vulnerability Matrix** | 8 | 8 | 7 |
| 11 | **Goldfish Horizon alone** | 8 | 7 | 9 |
| 12 | **Causal Deck Doctor** | 8 | 9 | 6 |
| 13 | **Confidence Model** | 8 | 7 | 9 |
| 14 | **Targeted Pod Tuning** | 7 | 9 | 5 |
| 15 | **Semantic Graph UI** | 6 | 8 | 8 |

---

# 12. Semantic Graph UI — useful but not a roadmap driver

A visual graph remains valuable:

```text
Card -> Role -> Package -> Engine -> Payoff -> Win condition
```

It can expose:

- bridge cards;
- isolated cards;
- redundant roles;
- single points of failure;
- package concentration.

However, it is primarily an **explanation surface**.

It should not take priority over features that directly improve game matching and game quality.

Build it when it helps users understand SPOF, vulnerabilities, Combo Accessibility or Deck Doctor recommendations.

---

# 13. Architecture strategy

## 13.1 Preserve separation of concerns

Prefer separate internal models for:

- deck power / output;
- experience profile;
- temporal threat model;
- answer model;
- dependency model;
- matchup / pod model;
- real-game calibration.

Do not create one giant formula whose weights become impossible to audit.

---

## 13.2 Evidence objects

Every higher-level product conclusion should ideally carry structured evidence.

Example shape:

```js
{
  signal: 'exposed-threat-window',
  severity: 'high',
  turns: [4, 5],
  sourceDeck: 'deck-a',
  threatProbability: 0.41,
  podAnswerProbability: 0.17,
  threatTypes: ['combo'],
  evidenceCards: [...],
  confidence: 'experimental'
}
```

UI copy should be generated from evidence, not from hidden heuristics with no traceability.

---

## 13.3 Version everything important

Public snapshots and future game observations should preserve:

- engine version;
- semantic version;
- product model version;
- iteration configuration;
- external-data source revision;
- timestamp.

This is required for future P7 calibration.

---

## 13.4 Do not let external APIs become single points of failure

Commander Spellbook and other external evidence should enrich Aeon.

Aeon's core power / experience analysis should still degrade gracefully when an external source is unavailable.

---

# 14. Validation strategy by phase

## P2 validation

Use curated semantic truth decks / fixtures for:

- obvious stax vs non-stax;
- glass cannon vs grind;
- commander-centric vs commander-light;
- graveyard-centric vs independent;
- low vs high volatility.

Test monotonic and adversarial changes.

## P3 validation

Construct synthetic pod fixtures:

- same power, different speed;
- same power, unanswered combo;
- same power, interaction-rich table;
- same median, extreme peak mismatch;
- compatible power but incompatible friction preferences.

## P4 validation

Require causal evidence for every non-game mechanism.

Compare Game Quality Engine against simple baselines:

- median spread only;
- P20–P80 overlap only;
- bracket only.

Aeon must materially outperform these before claiming improved prediction.

## P5 validation

For small N, compare heuristic matchmaking with exhaustive optimal partitions.

For large N, benchmark:

- runtime;
- worst-table mismatch;
- mean-table mismatch;
- stability;
- constraint satisfaction.

## P6 validation

Every recommended swap should pass:

- legality;
- semantic fit;
- fast-run screening;
- full-run confirmation;
- deterministic before / after comparison.

## P7 validation

Use:

- train / calibration / holdout separation where appropriate;
- playgroup-level leakage protection;
- calibration curves;
- confidence intervals;
- baseline comparison;
- cohort analysis by archetype / power / experience profile.

---

# 15. Success metrics

Do not optimize the product primarily for "average score accuracy".

## Near-term

- Rule 0 share creation rate;
- share open rate;
- Pod Match completion rate;
- percentage of Pod Match results with an explainable reason;
- What-if usage / repeat analysis;
- semantic feedback quality.

## Mid-term

- percentage of pods with Adaptive Rule 0 questions accepted / answered;
- percentage of bad pods successfully repaired;
- repeat use by playgroups;
- LGS session completion time;
- average number of actions needed to create a pod.

## Long-term

Primary metric candidate:

> **Reduction in reported non-games / severe mismatches for Aeon-matched pods compared with appropriate baselines.**

Supporting metrics:

- perceived balance;
- desired game-duration match;
- repeat-player retention;
- Threat–Answer calibration;
- mismatch false-negative rate;
- mismatch false-positive rate.

---

# 16. What Aeon should NOT become

Avoid spending the roadmap on features that are easy to copy and weakly differentiated.

### Not a generic AI chat coach

A chatbot that generates paragraphs from a decklist is not a moat.

Natural-language explanation is useful only when grounded in Aeon evidence.

### Not a crowd-rated power level

Do not average user opinions into semantic truth.

### Not an EDHREC clone

Popularity can be context, but recommendations should be causal and goal-driven.

### Not a full Magic rules engine first

Perfect four-player rules-complete simulation would be extremely expensive and is not required to solve the product problem.

Continue using deliberate abstractions that predict Commander game behavior well.

### Not a bracket wrapper

Official bracket / Game Changer signals are useful context but are not Aeon's differentiator.

---

# 17. Recommended implementation order inside the phases

## Next after P0 / P1 stabilization

### Step 1

Build **Experience Fingerprint + Table Friction** from existing outputs.

Reason: high value, high feasibility, creates the vocabulary needed by later features.

### Step 2

Build **Goldfish Horizon + SPOF**.

Reason: introduces temporal and counterfactual primitives needed later.

### Step 3

Build **Threat–Answer Timeline**.

Reason: this is the key transition from deck analysis to matchup analysis.

### Step 4

Add **Adaptive Rule 0**.

Reason: high public value, comparatively cheap once experience / threat signals exist.

### Step 5

Evolve Pod Match into **Game Quality / Non-Game Risk V1**.

Keep output categorical and experimental.

### Step 6

Add **Combo Accessibility + Vulnerability Matrix**.

These materially improve the game-quality model.

### Step 7

Build **Aeon Match + Pod Repair**.

This becomes the public / LGS product loop.

### Step 8

Build **Causal Deck Doctor**.

Use the mature dependency / threat / matchup models rather than inventing a separate recommendation engine.

### Step 9

Promote **P7 real-game calibration** once enough observations exist.

Exact game-quality probability remains gated on validation.

---

# 18. Definition of the future Aeon product

The completed direction should let a player ask, in order:

### Deck

> What can my deck do?

### Time

> When can it do it?

### Dependency

> What does it depend on?

### Threat

> When does it create a must-answer situation?

### Answer

> Can the other decks answer that situation in time?

### Experience

> What type of game does this deck create?

### Intent

> What important information cannot be inferred from the decklist?

### Pod

> Are these four decks and players compatible?

### Repair

> If not, what is the smallest change that fixes the problem?

### Reality

> Do real games confirm Aeon's prediction?

That progression is the product roadmap.

---

# 19. Final strategic rule

When choosing between two future features, prefer the one that better answers:

> **"Will this help players avoid a bad Commander game before it starts?"**

If both do, prefer the feature that can also explain **why**.

That is the intended public utility and long-term differentiation of Aeon Scorer.
