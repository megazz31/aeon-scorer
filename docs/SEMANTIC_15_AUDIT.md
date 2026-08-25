# Semantic 15 — audit-driven scope

Date: 2026-08-25

## Corpus inspected

The production QA corpus had 21 analyses / 20 distinct deck hashes in the latest 24-hour window inspected for this pass, all on `3.3.0-semantic-14`. The semantic-audit queue also contained a substantial pending backlog, so this document separates repeated high-confidence structural failures from lower-confidence one-off observations.

This audit deliberately treats real analyses as **diagnostic evidence**, never as score truth or an automatic calibration target.

## Repeated / high-confidence failures addressed

### 1. Commander synergy could be zero for mechanically central commanders

The semantic-14 tag-only commander graph missed several common semantic relations:

- **Shalai and Hallar** — +1/+1-counter payoff wording;
- **Hinata, Dawn-Crowned** — per-target spell-cost reduction;
- **Killian, Ink Duelist** — creature-target spell-cost reduction;
- **Sythis, Harvest's Hand** — enchantment-cast payoff;
- **Bruenor Battlehammer** — Equipment density and equip-cost compression;
- **Miirym, Sentinel Wyrm** / **Varina, Lich Queen** — explicit tribal nouns in commander Oracle text.

Semantic 15 adds **bounded Oracle-derived commander relations** while retaining the safety rule that type line alone cannot seed commander synergy.

### 2. `early-commander` used a card-CMC gate instead of a real pre-commander window

The audit repeatedly found three-mana setup permanents counted as early acceleration for mana-value-4 commanders. A CMC3 rock/dork normally cannot move an MV4 commander from T4 to T3, so counting it in the same package as T1/T2 acceleration inflated package cohesion.

Semantic 15 changes the persistent-source timing gate to:

`source MV <= min(3, commander MV - 2)`

and rejects clear spending restrictions that cannot pay for the commander (for example, `Spend this mana only to activate abilities`). The sequence simulator remains the authority for actual cast timing.

### 3. Equipment was absent as a package family

Equipment-heavy decks could show a generic artifact package while their actual commander relationship remained zero. Semantic 15 adds a dedicated Equipment / Voltron package based on Equipment type plus explicit Equipment/equip payoff text.

## Card-level audit findings resolved in this candidate

Dedicated regression coverage now locks the following corrections:

- **Oblivion Sower** — moving opponent-owned lands from exile directly to the battlefield is not `exile-cast`;
- **Desert Warfare** — Desert sacrifice / Desert-to-graveyard events are not creature `death-payoff`;
- **Captain Lannery Storm** / **Rose, Cutthroat Raider** — artifact-token sacrifice rewards stay distinct from creature-death payoffs;
- **Mizzix's Mastery** / **Bloodthirsty Adversary** — graveyard replay through copy/cast is recursion without becoming an exile-play engine;
- **Epic Experiment** — uncast exiled cards that explicitly move to the graveyard count as graveyard setup;
- self-only ward / indestructible is separated from deck-facing protection;
- multi-sentence exile-play engines such as **Light Up the Stage**, **Prosper, Tome-Bound** and **Share the Spoils** remain recognized without reintroducing the Oblivion Sower false positive.

Generic package-member omissions still require case-by-case evidence review; this candidate does not blindly add every semantically adjacent card.

## Sequence-aware commander mechanics implemented

Structural commander synergy is no longer used as a substitute for castability simulation for the two audited mechanic families below.

### Hinata / Killian targeting discount

The simulator now models effective generic-cost reduction only after the commander is online:

- colored pips are preserved;
- `for each target` and `target a creature` scopes are separate;
- the discount does not apply before the commander is on the battlefield;
- unknown X values remain conservative instead of being treated as free mana;
- turn profiles expose target-reduction access and the analysis exposes eligible/unlocked spells.

### Top-library creature deployment

The candidate models top-library creature cheat effects from the actual shuffled library rather than a hard-coded commander bonus. The regression contract validates structural hit probability, real trigger/hit resolution, free-deployment mana compression and temporal exposure in the turn profile.

## Deferred niche semantic families

The audit also exposed real but narrower gaps intentionally kept outside this promotion candidate:

- donation / goad ownership engines (Jon Irenicus family);
- melee / multi-opponent attack scaling (Adriana family);
- exact-one-life-loss / ping conversion (Ob Nixilis, Captive Kingpin family).

## Promotion gate

Promotion requires all of the following on the finalized candidate:

1. full semantic + sentinel suite green;
2. metamorphic, product, public-precon and adversarial contracts green;
3. application build green;
4. semantic-14 → semantic-15 public-precon delta generated;
5. macro calibration green at 1800 and 3200 iterations;
6. sampling convergence green;
7. finalized snapshots committed and the PR merge result revalidated from that exact head.

The branch push validation has already completed all quality and calibration stages successfully on the finalized generated candidate. The final PR-head validation is intentionally re-triggered after the generated snapshots are committed so the merge checkout is tested from the exact promotable state.
