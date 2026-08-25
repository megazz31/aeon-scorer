# Semantic 15 — audit-driven scope

Date: 2026-08-25

## Corpus inspected

The production QA corpus had 21 analyses / 20 distinct deck hashes in the latest 24-hour window inspected for this pass, all on `3.3.0-semantic-14`. The semantic-audit queue also contained a substantial pending backlog, so this document separates repeated high-confidence structural failures from lower-confidence one-off observations.

This audit deliberately treats real analyses as **diagnostic evidence**, never as score truth or an automatic calibration target.

## Repeated / high-confidence failures

### 1. Commander synergy can be zero for mechanically central commanders

The current tag-only commander graph misses several common semantic relations:

- **Shalai and Hallar** — the Oracle trigger is a +1/+1-counter payoff, but the semantic-14 wording matcher does not promote it to `counter-payoff`, yielding zero commander synergy in the inspected run.
- **Hinata, Dawn-Crowned** — per-target spell-cost reduction is not represented by the generic spellslinger relation.
- **Killian, Ink Duelist** — the same targeting-cost family appears in a narrower `target a creature` form and should not require a one-off commander exception.
- **Sythis, Harvest's Hand** — `cast an enchantment spell` is an enchantment-engine payoff even though it is not Constellation/ETB wording.
- **Bruenor Battlehammer** — Equipment density and equip-cost compression were not represented in the package graph.
- **Miirym, Sentinel Wyrm** / **Varina, Lich Queen** — explicit tribal nouns in commander Oracle text were not connected to same-type creature density.

Semantic 15 therefore adds **bounded Oracle-derived commander relations** while retaining the existing rule that type line alone cannot seed commander synergy.

### 2. `early-commander` used a card-CMC gate instead of a real pre-commander window

The audit repeatedly found three-mana setup permanents counted as early acceleration for mana-value-4 commanders. A CMC3 rock/dork normally cannot move an MV4 commander from T4 to T3, so counting it in the same package as T1/T2 acceleration inflates package cohesion.

Semantic 15 changes the persistent-source timing gate to:

`source MV <= min(3, commander MV - 2)`

and rejects clear spending restrictions that cannot pay for the commander (for example, `Spend this mana only to activate abilities`). This is intentionally a **package semantics correction**; the sequence simulator remains the authority for actual cast timing.

### 3. Equipment was absent as a package family

Equipment-heavy decks could show a generic artifact package while their actual commander relationship remained zero. Semantic 15 adds a dedicated Equipment / Voltron package based on Equipment type plus explicit Equipment/equip payoff text.

## Auditor findings still open after this first Semantic-15 commit

These are confirmed problems, but they should be fixed in `cardFeatures.js` with dedicated regression tests rather than hidden inside commander/package logic:

- **Oblivion Sower** — moving opponent-owned lands from exile directly to the battlefield must not be `exile-cast`.
- **Desert Warfare** — Desert sacrifice / Desert-to-graveyard events must not become creature `death-payoff`.
- **Captain Lannery Storm** / **Rose, Cutthroat Raider** — artifact-token sacrifice rewards must stay distinct from creature-death payoffs.
- Graveyard replay/setup coverage around **Mizzix's Mastery**, **Bloodthirsty Adversary** and **Epic Experiment** needs explicit zone-action tests.
- Generic package-member omission findings remain frequent and need a package-by-package evidence review instead of blindly adding every semantically adjacent card.

## Sequence-aware work still required before promotion

Structural commander synergy is **not** a substitute for castability simulation.

### Hinata / Killian targeting discount

The next phase must compute an effective generic cost only after the commander is online:

- preserve colored pips;
- count legal targets conservatively;
- support `for each target` and `target a creature` scopes separately;
- never apply the discount before the commander is on the battlefield;
- keep X / multi-target spells explicit rather than granting a flat score bonus.

### Ureni top-eight Dragon compression

Ureni requires a different model: top-eight hit probability from actual Dragon density, conditional free deployment, ETB + attack recurrence, and the mana value compressed by a successful hit. This should enter temporal/engine evidence, not a hard-coded commander bonus.

## Deferred niche semantic families

The audit also exposed real but narrower gaps that should not bloat this PR before the cross-cutting fixes are validated:

- donation / goad ownership engines (Jon Irenicus family);
- melee / multi-opponent attack scaling (Adriana family);
- exact-one-life-loss / ping conversion (Ob Nixilis, Captive Kingpin family).

## Promotion gate

Semantic 15 must remain draft until:

1. the new audit regression passes with the full semantic suite;
2. public precon / metamorphic / adversarial tests remain green;
3. calibration and sentinel decks are compared against semantic-14;
4. sequence-aware Hinata/Killian and Ureni behavior is either implemented and validated or explicitly kept out of the semantic-15 promotion claim.
