# Aeon Scorer 3.3.0 — Semantic 18 · Table Verdict

Branch: `feat/table-verdict-v1` (candidate, not promoted).

## Version identity

- Engine: `3.3.0`
- Semantic: `3.3.0-semantic-18`
- Model: `sequence-access-v3.3-semantic` (unchanged: the 0–100 profile model is not modified)
- `record-analysis` accepts Semantic 18 and stays rolling-compatible with Semantics 14–17 and legacy `3.2.0|3.2.0-semantic-1`.

## Why

A single median reads like a single bracket. Players argue about *when* a deck ends games and *what* their table accepts (Sol Ring on turn 1, a three-piece combo after turn 6 with tutors, repeated Valefor bounce in bracket 2). This release answers in turns, the unit of the official bracket expectations, and makes rule 0 explicit.

## Changes

### Semantics (friction v2)

- Bounce “to its owner's hand” is removal (Unsummon, Into the Roil, Cyclonic Rift); overload bounce is a one-sided wipe.
- “takes an extra turn” is an extra turn (Time Warp).
- Opponent tempo denial: each-opponent bounce, stun counters, “doesn't untap”; recurring when the deck can blink or loop it (Summon: Valefor + Ephemerate).
- Land locks (Blood Moon, Back to Basics, nonbasic-only sacrifice such as Wave of Vitriol) are a family distinct from mass land denial.
- Theft wording “owned by … gain control of it” (Expropriate).

### Engine

- **Win clock** — first elimination and whole-table win, P20 / median / P80, on a goldfish table (speed ceiling) and a blocking table (headline). Combat, commander damage, poison, burn, drain, combo lines (Aeon catalog + Commander Spellbook, engine + finisher chaining), tutors aimed at win-line pieces, rituals on the combo turn. Assumptions and a coverage warning are part of the output.
- **Bracket estimate** — one floor per official rule, estimate = highest floor, decision trace, plausible range. Brackets 1 and 5 remain intents.
- **Table charter** — presets B1–B5 plus every rule players argue about; each check names its cards; URL-safe share code (`?charte=`).

### Product

- The result screen leads with the table verdict; the median block becomes the *Aeon index* (compare decks on one scale). Same verdict on public precon pages.

## Validation

- Local quality suite (`npm run quality:local`): passed, including `semantic18-table-friction-test` and `table-verdict-test`.
- Public precons regenerated: 180 canonical (12 new since August), 175 analyzed, 5 explicitly unsupported.
- Precon movement vs `main` (163 matched): mean median Δ +0.20, 160/163 within one point, 161/163 within two, no negative median move. Source: bounce and tempo denial now count as interaction. Details: `calibration/semantic-precon-delta.md`.
- Macro calibration 1,800: 12/12 gates. Macro calibration 3,200: 12/12 gates.
- Sampling convergence: 39 matched; max median Δ 1, floor Δ 2, ceiling Δ 1, peak Δ 1; cohort median Δ precon 1, user 0, cEDH 0.
- Bracket estimate, benchmark anchors (reported, not gated; cohort labels precon = 2, cEDH = 5): within ±1 **100%** vs 50% for “always B3”; exact 43.3% because cEDH lists are estimated B4 with cEDH speed flagged only for the fastest (bracket 5 is an intent). Precons: 12/15 B2, 3/15 B3.
- Bracket estimate, all public precons (label: B2, WotC default): exact **85.1%**, within ±1 **100%**; 26 B3, each explained by a Game Changer (17) or a first elimination median around turn 8 (9). Outlier list: `calibration/precon-brackets.md`.

## Known limits

- No opposing interaction in the clock: the blocking table only discounts combat damage. Aggressive token decks can look one turn faster than real games.
- Combo coverage depends on the Aeon catalog and Commander Spellbook; a tutor-heavy deck with no detected win line is flagged rather than guessed.
- Bracket agreement is measured against cohort labels (precon = 2, cEDH lists = 5), not organizer-declared brackets.
- Pod/Match still use the three-question intent overlay; the charter replaces it in a later release.
