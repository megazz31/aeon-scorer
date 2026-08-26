# Real user corpus audit — 2026-08-25

Scope: latest distinct `source=web` analyses stored under `3.3.0-semantic-14` before the Semantic 15/16 rollout. This is an audit corpus, not training truth: user labels and scores are observations, and incomplete imports are quarantined rather than used to force calibration.

## Coverage

- 28 recorded web analyses
- 24 distinct deck hashes
- 21/24 latest distinct runs had completed semantic-auditor processing when reviewed
- 3 pending/quarantined at review time: one incomplete Atraxa import and two late Adriana variants

## Deck-by-deck triage

| Deck | Commander | Stored P50 | Audit conclusion | Semantic 16 action |
|---|---|---:|---|---|
| Zur, fun and friendly | Zur, Eternal Schemer | 47 | Commander synergy was 0 despite a dense enchantment shell; enchantment animation/lord combat value was invisible. | Add generic enchantment-animation commander relation; keep combat-damage limitation explicit. |
| Atraxa (unnamed) | Atraxa, Praetors' Voice | 75 | Incomplete/legacy-shaped import (99/100 resolved). Not trustworthy calibration evidence. | Quarantine; do not tune the model to this row. |
| Quintorius | Quintorius, History Chaser | 64 | Graveyard/exile/spell engine already strongly connected; no specific score defect isolated. | Keep as high-mid user sentinel; watch combo-catalog coverage. |
| Hinata Heroic budget | Hinata, Dawn-Crowned | 45 | Major blind spot: per-target cost reduction absent from sequence affordability. | Semantic 15/16 simulates generic reduction after Hinata is online; X remains conservative. |
| Ob nixilous | Ob Nixilis, Captive Kingpin | 60 | Exact-one-life engine only partially connected. More importantly, the list contains **All Will Be One**, making a real Ob + AWBO infinite loop that the local combo catalog missed. | Add exact-one-life relation and Ob + AWBO combo. |
| ZOMBIE | Varina, Lich Queen | 48 | Zombie relationship was under-read because the commander is not itself a Zombie. | Named-tribe-from-Oracle relation already added in Semantic 15. |
| Toquennes | Baylen, the Haymaker | 55 | Token/conversion shell already saturates commander connection; no clear semantic defect isolated. | Keep as control sample against over-correction. |
| Bria | Bria, Riptide Rogue | 62 | Spellslinger plan already strongly represented. | Keep as control sample. |
| arte | Mendicant Core, Guidelight | 62 | Artifact engine already strongly represented. | Keep as control sample. |
| Blech | Blech, Loafing Pest | 54 | Lifegain/creature-type engine already strongly connected. | Keep as control sample; watch saturation of commander-synergy score. |
| Redshift | Redshift, Rocketeer Chief | 39 | Severe blind spot. Ability-only mana + Exhaust not fully simulated, and the actual list contains Sword of the Paruns, Umbral Mantle, Staff of Domination and Aggravated Assault — four Commander Spellbook loop variants with Redshift. | Add the four known combo variants as one diminishing-return combo family; retain explicit Exhaust/ability-mana limitation. |
| Sidisi | Sidisi, Brood Tyrant | 56 | Graveyard/token engine already strongly connected. | Keep as control sample. |
| roar | Miirym, Sentinel Wyrm | 40 | Commander synergy only 11 despite Dragon density. | Named Dragon relation already added in Semantic 15. |
| Silverquill | Killian, Decisive Mentor | 53 | Exact aggregate tie with factory Silverquill Influence is **not a cache/hash bug**. The lists have different hashes and ~19 swaps each way. Modified list gains commander/enchantment cohesion and interaction but loses draw/recursion/resilience. | Preserve tie unless recalculation proves otherwise; do not force an upgrade premium. Use profile deltas for comparison. |
| BAM | The Emperor of Palamecia // The Lord Master of Hell | 61 | Strong commander connection already detected; no isolated defect yet. | Keep as control sample; inspect transform/timing if later evidence disagrees. |
| Taper taper ! mais pas trop cher | Adriana, Captain of the Guard | 38 | Commander synergy 0: global melee/go-wide combat amplification invisible. | Add generic go-wide/melee relation; flag multiplayer combat damage as conservative. |
| Take it 🖕 | Jon Irenicus, Shattered One | 45 | Commander synergy 0: donation/goad/ownership plan invisible. | Add donation/goad relation; flag opponent-behavior simulation limitation. |
| Sythis | Sythis, Harvest's Hand | 50 | Commander synergy only 31 despite a very dense enchantment shell. | Enchantment-cast payoff relation already fixed in Semantic 15. |
| Pauper equipements | Bruenor Battlehammer | 44 | Commander synergy 0 and Equipment shell collapsed into generic artifacts. | Equipment/Voltron package + commander Equipment payoff already fixed in Semantic 15. |
| Kalamax | Kalamax, the Stormsire | 54 | Spell-copy/spellslinger shell already strongly represented at coarse semantic level. | Keep as control sample; future copy-stack execution may refine it. |
| Killian Repartee | Killian, Ink Duelist | 56 | Commander synergy 0 despite creature-target cost reduction. Stored +3 over the Decisive Mentor precon is therefore conservative evidence, not proof the reducer was modeled. | Targeted-spell cost reduction already simulated in Semantic 15/16. |
| Shalai and Hallar | Shalai and Hallar | 53 | Commander synergy 0 despite +1/+1-counter damage conversion. | Counter-trigger commander relation already fixed in Semantic 15. |
| Taper taper ! Budget | Adriana, Captain of the Guard | 38 | Same combat blind spot as the other Adriana list. | Covered by go-wide/melee regression; pending stored auditor row is not treated as truth. |
| Taper taper ! | Adriana, Captain of the Guard | 39 | Same combat blind spot as the other Adriana lists. | Covered by go-wide/melee regression; pending stored auditor row is not treated as truth. |

## Killian / Silverquill tie investigation

The exact displayed tie is unique in the inspected user corpus: `Silverquill` and factory `Silverquill Influence` both stored `53 / 43–63 / peak 87` under semantic-14.

They are not the same list:

- modified web deck hash: `f01d1301e3bfb021974edfbe0263c86fd4527e4a5c767d547679368e777ad966`
- factory precon hash: `386242cea9a3afcce80f4d2e4d47d685bbefa4ab504ad47901c11358e6722764`
- roughly 19 card names differ in each direction.

Stored dimensions explain the collision:

| Metric | Factory precon | Modified Silverquill |
|---|---:|---:|
| Speed | 48 | 49 |
| Consistency | 65 | 65 |
| Explosiveness | 16 | 16 |
| Synergy | 85 | 87 |
| Interaction | 50 | 53 |
| Resilience | 55 | 46 |
| Draw roles | 12 | 8 |
| Recursion roles | 5 | 2 |
| Protection roles | 7 | 9 |
| Commander synergy | 88 | 100 |
| Raw simulation P50 | 43 | 42 |

The modified list therefore is not being treated as identical: it is read as more focused and interactive, but less resource-resilient. The final integer calibration rounds two nearby structural values to the same 53. This is a score-resolution issue to explain in comparisons, not a reason to add arbitrary points to the modified list.

`Killian Repartee` is a different case: it uses **Killian, Ink Duelist**, scores 56 under semantic-14, and its commander's cost reduction was not simulated in that stored run. It must be re-evaluated under Semantic 16 before judging its +3 relative to the factory Decisive Mentor precon.

## Combo-catalog findings from the real corpus

The local static combo catalog was too small for the user corpus. Two concrete misses are now regression targets:

1. **Ob Nixilis, Captive Kingpin + All Will Be One** — infinite damage / counters / library exile after an exact-1-life trigger.
2. **Redshift, Rocketeer Chief** with any of **Sword of the Paruns, Umbral Mantle, Staff of Domination, Aggravated Assault** — four overlapping activated-ability/untap loop variants present in the submitted Redshift list.

Redshift variants are grouped into one combo family for scoring so redundancy helps without multiplying the same engine four times linearly.

## Rules for using this corpus

1. Do not tune a score simply because a user expects a deck to be stronger.
2. Treat an incomplete import as invalid calibration evidence.
3. Every material score correction needs a causal mechanic, a regression test, and benchmark/precon-delta review.
4. Same integer score does not imply same deck profile; compare dimensions and sequence access before declaring a collision erroneous.
5. Real user decks remain a mandatory release gate alongside precons and cEDH anchors.
