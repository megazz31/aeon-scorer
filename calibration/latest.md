# Aeon Scorer v3.3 calibration report

Generated: 2026-11-21T09:27:51.871Z
Engine: 3.3.0
Semantic: 3.3.0-semantic-18
Model: sequence-access-v3.3-semantic
Iterations/deck: 3200

## Base macro gates: 12/12

- ✅ **sample** — 39 total / 15 precon / 15 cEDH / 9 user
- ✅ **data-completeness** — all benchmark lists fully resolved
- ✅ **precon-temporal-coverage** — {"earliest":"2018-06-08","latest":"2026-06-26","recent":7,"total":15}
- ✅ **cedh-commander-diversity** — 15/15 distinct commanders
- ✅ **all-separation** — AUC 1.000, gap 25.0
- ✅ **holdout-separation** — AUC 1.000, gap 23.0
- ✅ **distribution-separation** — cEDH P10 - precon P90 = 11.2
- ✅ **deterministic-repeat** — max repeated median range 0
- ✅ **fast-mana** — {"name":" Layered Atraxa  cEDH","full":75,"cut":56,"speedDelta":32,"explosiveDelta":51,"commanderTurnDelta":1}
- ✅ **tutors** — {"name":" Layered Atraxa  cEDH","consistencyDelta":22,"medianDelta":4,"ceilingDelta":2}
- ✅ **commander-dependency** — {"median":7.5,"positive":8,"total":8}
- ✅ **semantic-scale** — strict precon 49.0, cEDH 74.0

## Anchors

- Precons: 15
- Precon dates: 2018-06-08 → 2026-06-26 (7 since 2024)
- cEDH: 15 (15 distinct commanders)
- User/public: 9
- Holdout AUC: 1.000
- Overall median gap: 25.0

## Bracket estimate vs anchor labels (reported, not gated)

- Labels: precon=2, cedh=5 (cohort labels, not organizer labels) — 30 decks
- Exact: 43.3% · within ±1: 100% · label inside the announced range: 50%
- Baseline "always B3": exact 0% · within ±1: 50%
- Estimates: precon 222222222222333 · cEDH 444444444444445

## Deck results

| Source | Deck | Commander | Bracket | Median | P20 | P80 | Peak | Dispersion | Consistency | First kill P20/med/P80 | Table win med | Kill ≤T6 % | Kill ≤T8 % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---:|---:|
| precon | Blame Game | Nelly Borca, Impulsive Accuser | B2 | 37 | 26 | 47 | 68 | 21 | 66 | T10/T11/T13 | T13 | 0 | 2.4 |
| precon | Coven Counters | Leinore, Autumn Sovereign | B2 | 40 | 27 | 53 | 84 | 26 | 59 | T10/T12/T13 | T13 | 0 | 1 |
| precon | Elven Empire | Lathril, Blade of the Elves | B2 | 41 | 31 | 50 | 78 | 19 | 68 | T10/T11/T12 | T13 | 0.1 | 6.1 |
| precon | Abzan Armor | Felothar the Steadfast | B3 | 41 | 31 | 52 | 79 | 22 | 65 | T11/T13/T13 | T13 | 0 | 0.2 |
| precon | Primal Genesis | Ghired, Conclave Exile | B2–3 | 44 | 30 | 55 | 89 | 25 | 62 | T8/T10/T12 | T13 | 3.3 | 21 |
| precon | Most Wanted | Olivia, Opulent Outlaw | B2–3 | 45 | 31 | 55 | 80 | 24 | 62 | T9/T10/T11 | T13 | 0.3 | 15.2 |
| precon | Breed Lethality | Atraxa, Praetors' Voice | B2 | 46 | 30 | 59 | 86 | 29 | 55 | T9/T10/T12 | T13 | 0 | 5.2 |
| precon | Grave Danger | Gisa and Geralf | B2–3 | 49 | 37 | 60 | 87 | 23 | 61 | T9/T10/T11 | T13 | 0 | 16.3 |
| precon | Family Matters | Zinnia, Valley's Voice | B3 | 49 | 39 | 59 | 84 | 20 | 63 | T9/T10/T11 | T13 | 1.5 | 18.9 |
| user | Wick - Grixis Snail Burn | Wick, the Whorled Mind | B2 | 49 | 39 | 58 | 79 | 19 | 67 | T10/T10/T12 | T13 | 0 | 1.1 |
| precon | Wakanda Forever Collector's Edition | T'Challa, the Black Panther | B2 | 50 | 39 | 62 | 86 | 23 | 63 | T10/T12/T13 | T13 | 0.5 | 9.4 |
| user | Karumonix - Rat Colony Aggro | Karumonix, the Rat King | B2 | 50 | 40 | 59 | 75 | 19 | 65 | T10/T10/T12 | T13 | 0 | 1.6 |
| user | RAT SWAP KARUMONIX / WICK | Karumonix, the Rat King | B2 | 50 | 40 | 59 | 75 | 19 | 65 | T10/T10/T12 | T13 | 0 | 1.6 |
| precon | Obscura Operation | Kamiz, Obscura Oculus | B2 | 51 | 39 | 64 | 89 | 25 | 58 | T9/T10/T12 | T13 | 0 | 4.2 |
| precon | Necron Dynasties Collector's Edition | Szarekh, the Silent King | B2–3 | 51 | 38 | 61 | 85 | 23 | 61 | T9/T10/T11 | T13 | 0 | 15.2 |
| user | Torgal Fine Hound - flash | Torgal, A Fine Hound | B2 | 51 | 41 | 60 | 81 | 19 | 67 | T9/T10/T11 | T13 | 0 | 13.8 |
| precon | Revival Trance Collector's Edition (FINAL FANTASY VI) | Terra, Herald of Hope | B2 | 52 | 38 | 63 | 91 | 26 | 60 | T9/T10/T12 | T13 | 0 | 10 |
| user | Zur, fun and friendly | Zur, Eternal Schemer | B3 | 52 | 40 | 63 | 89 | 23 | 64 | T9/T10/T12 | T13 | 4.4 | 13.4 |
| precon | Planeswalker Party | Commodore Guff | B3 | 53 | 40 | 65 | 90 | 25 | 62 | T11/T13/T13 | T13 | 0 | 0.4 |
| user | Clavileno | Clavileño, First of the Blessed | B2 | 55 | 43 | 65 | 89 | 22 | 61 | T9/T10/T11 | T13 | 0.1 | 12.6 |
| user | Arabella, strong but not disgusting for others | Arabella, Abandoned Doll | B3 | 56 | 44 | 71 | 88 | 27 | 56 | T7/T8/T9 | T11 | 5.8 | 65.8 |
| precon | Quandrix Unlimited | Zimone, Infinite Analyst | B2 | 59 | 49 | 69 | 91 | 20 | 62 | T11/T13/T13 | T13 | 0 | 2 |
| user | Clavileno upgraded | Clavileño, First of the Blessed | B2–3 | 60 | 50 | 72 | 89 | 22 | 62 | T9/T10/T11 | T13 | 0 | 19.9 |
| cedh |  It Does Nothing  | Ellivere of the Wild Court | B4 | 61 | 51 | 71 | 89 | 20 | 76 | T9/T10/T11 | T13 | 0 | 4.7 |
| cedh | Winota Avalanche | Winota, Joiner of Forces | B4 | 63 | 52 | 75 | 92 | 23 | 66 | T8/T9/T10 | T13 | 5.3 | 40.7 |
| user | hei bai fun and friendly (as much as possible) | Hei Bai, Forest Guardian | B2 | 63 | 50 | 73 | 92 | 23 | 59 | T10/T12/T13 | T13 | 0 | 6.1 |
| cedh | [cEDH Etali] Flintstone Gummy  | Etali, Primal Conqueror // Etali, Primal Sickness | B4 | 65 | 54 | 78 | 92 | 24 | 67 | T7/T10/T13 | T13 | 15.6 | 28.8 |
| cedh | Tayam Midrange Adnaus [cEDH PRIMER] | Tayam, Luminous Enigma | B4 | 65 | 55 | 75 | 89 | 20 | 92 | T13/T13/T13 | T13 | 0 | 0 |
| cedh | Black Hole Son | K'rrik, Son of Yawgmoth | B4 | 68 | 54 | 81 | 95 | 27 | 78 | T8/T11/T13 | T12 | 6.9 | 22.9 |
| cedh | [A52] New Catering  | Rocco, Cabaretti Caterer | B4 | 73 | 62 | 81 | 93 | 19 | 89 | T6/T11/T13 | T11 | 21.2 | 34.9 |
| cedh | [cEDH] Urza Power Scepter [Primer] | Urza, Lord High Artificer | B4 | 73 | 59 | 84 | 95 | 24 | 65 | T8/T13/T13 | T13 | 13.8 | 20.6 |
| cedh | [Mardu cEDH] Binder of the Breach | Dihada, Binder of Wills | B4 | 74 | 62 | 83 | 95 | 21 | 89 | T6/T10/T13 | T10 | 23 | 37.3 |
| cedh |  Layered Atraxa  cEDH | Atraxa, Grand Unifier | B4 | 75 | 65 | 83 | 97 | 18 | 83 | T5/T9/T13 | T12 | 25 | 40.3 |
| cedh | [CABAL] cEDH  UB adaptive control  | Talion, the Kindly Lord | B4 | 75 | 66 | 82 | 94 | 15 | 75 | T9/T12/T13 | T13 | 13.4 | 17.8 |
| cedh | Korvold, the MAD King  | Korvold, Fae-Cursed King | B4 | 78 | 65 | 86 | 98 | 21 | 85 | T5/T9/T11 | T10 | 32.5 | 46.1 |
| cedh | [SALT] two rhystics. (cEDH Zur Tempo) | Zur the Enchanter | B4 | 79 | 70 | 85 | 97 | 15 | 84 | T7/T13/T13 | T13 | 19.8 | 25.9 |
| cedh | NBC Sisay Slop | Sisay, Weatherlight Captain | B4–5 | 81 | 73 | 87 | 100 | 14 | 87 | T4/T8/T13 | T8 | 40.7 | 51.9 |
| cedh | cEDH Inalla - Wizard's Chess | Inalla, Archmage Ritualist | B4–5 | 82 | 72 | 89 | 100 | 17 | 83 | T5/T8/T13 | T8 | 35.5 | 50.1 |
| cedh |   Warrior Queen [cEDH Najeela]  | Najeela, the Blade-Blossom | B5 | 83 | 78 | 88 | 100 | 10 | 94 | T3/T5/T8 | T5 | 71.3 | 88 |
