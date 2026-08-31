# Aeon Scorer v3.3 calibration report

Generated: 2026-08-31T14:05:33.841Z
Engine: 3.3.0
Semantic: 3.3.0-semantic-17
Model: sequence-access-v3.3-semantic
Iterations/deck: 3200

## Macro quality gates: 17/17

- ✅ **sample** — 39 total / 15 precon / 15 cEDH / 9 user
- ✅ **data-completeness** — all benchmark lists fully resolved
- ✅ **precon-temporal-coverage** — {"earliest":"2018-06-08","latest":"2026-06-26","recent":7,"total":15}
- ✅ **cedh-commander-diversity** — 15/15 distinct commanders
- ✅ **all-separation** — AUC 1.000, gap 26.0
- ✅ **holdout-separation** — AUC 1.000, gap 23.0
- ✅ **distribution-separation** — cEDH P10 - precon P90 = 11.8
- ✅ **deterministic-repeat** — max repeated median range 0
- ✅ **fast-mana** — {"name":" Layered Atraxa  cEDH","full":74,"cut":56,"speedDelta":32,"explosiveDelta":51,"commanderTurnDelta":1}
- ✅ **tutors** — {"name":" Layered Atraxa  cEDH","consistencyDelta":23,"medianDelta":5,"ceilingDelta":3}
- ✅ **commander-dependency** — {"median":8,"positive":8,"total":8}
- ✅ **semantic-scale** — strict precon 48.0, cEDH 74.0
- ✅ **package-precision** — {"preconStrongMedian":1,"userStrongMedian":1}
- ✅ **hei-bai-real-regression** — {"preconStrongMedian":1,"userStrongMedian":1,"heiBaiFound":true,"heiBaiHasEarly":true,"heiBaiHasBlink":true,"heiBaiHasConstellation":true,"heiBaiFalseSpells":false,"heiBaiFalseCounters":false,"heiBaiFalseGraveyard":false,"heiBaiT1Engine":0}
- ✅ **untrained-mid-cohort** — {"precon":48,"user":51,"cedh":74}
- ✅ **combo-signal** — {"count":6,"peakMedian":98,"names":[" Layered Atraxa  cEDH","cEDH Inalla - Wizard's Chess","  Warrior Queen [cEDH Najeela] "]}
- ✅ **profile-invariants** — P20 ≤ P50 ≤ P80 ≤ peak for all decks

## Anchors

- Precons: 15
- Precon dates: 2018-06-08 → 2026-06-26 (7 since 2024)
- cEDH: 15 (15 distinct commanders)
- User/public: 9
- Holdout AUC: 1.000
- Overall median gap: 26.0

## Deck results

| Source | Deck | Commander | Median | P20 | P80 | Peak | Dispersion | Consistency |
|---|---|---|---:|---:|---:|---:|---:|---:|
| precon | Blame Game | Nelly Borca, Impulsive Accuser | 37 | 26 | 47 | 68 | 21 | 66 |
| precon | Coven Counters | Leinore, Autumn Sovereign | 40 | 27 | 53 | 84 | 26 | 59 |
| precon | Elven Empire | Lathril, Blade of the Elves | 41 | 31 | 50 | 78 | 19 | 68 |
| precon | Abzan Armor | Felothar the Steadfast | 41 | 31 | 52 | 79 | 22 | 65 |
| precon | Primal Genesis | Ghired, Conclave Exile | 43 | 31 | 55 | 89 | 24 | 62 |
| precon | Most Wanted | Olivia, Opulent Outlaw | 45 | 31 | 55 | 80 | 24 | 62 |
| precon | Breed Lethality | Atraxa, Praetors' Voice | 46 | 30 | 59 | 86 | 29 | 55 |
| precon | Family Matters | Zinnia, Valley's Voice | 48 | 38 | 59 | 83 | 22 | 63 |
| precon | Grave Danger | Gisa and Geralf | 49 | 37 | 60 | 87 | 23 | 61 |
| user | Wick - Grixis Snail Burn | Wick, the Whorled Mind | 49 | 39 | 58 | 79 | 19 | 67 |
| precon | Wakanda Forever Collector's Edition | T'Challa, the Black Panther | 50 | 39 | 62 | 86 | 23 | 63 |
| user | Karumonix - Rat Colony Aggro | Karumonix, the Rat King | 50 | 40 | 59 | 75 | 19 | 65 |
| user | RAT SWAP KARUMONIX / WICK | Karumonix, the Rat King | 50 | 40 | 59 | 75 | 19 | 65 |
| precon | Obscura Operation | Kamiz, Obscura Oculus | 51 | 39 | 64 | 89 | 25 | 58 |
| precon | Necron Dynasties Collector's Edition | Szarekh, the Silent King | 51 | 38 | 61 | 85 | 23 | 61 |
| user | Torgal Fine Hound - flash | Torgal, A Fine Hound | 51 | 41 | 60 | 81 | 19 | 67 |
| user | Zur, fun and friendly | Zur, Eternal Schemer | 51 | 39 | 62 | 87 | 23 | 64 |
| precon | Planeswalker Party | Commodore Guff | 52 | 40 | 65 | 90 | 25 | 62 |
| precon | Revival Trance Collector's Edition (FINAL FANTASY VI) | Terra, Herald of Hope | 52 | 38 | 63 | 91 | 26 | 60 |
| user | Clavileno | Clavileño, First of the Blessed | 55 | 43 | 65 | 89 | 22 | 61 |
| user | Arabella, strong but not disgusting for others | Arabella, Abandoned Doll | 56 | 44 | 71 | 88 | 27 | 56 |
| precon | Quandrix Unlimited | Zimone, Infinite Analyst | 59 | 49 | 69 | 91 | 20 | 62 |
| user | Clavileno upgraded | Clavileño, First of the Blessed | 60 | 50 | 72 | 89 | 22 | 62 |
| cedh |  It Does Nothing  | Ellivere of the Wild Court | 61 | 51 | 71 | 89 | 20 | 76 |
| cedh | Winota Avalanche | Winota, Joiner of Forces | 63 | 52 | 75 | 92 | 23 | 66 |
| user | hei bai fun and friendly (as much as possible) | Hei Bai, Forest Guardian | 63 | 50 | 73 | 92 | 23 | 59 |
| cedh | [cEDH Etali] Flintstone Gummy  | Etali, Primal Conqueror // Etali, Primal Sickness | 65 | 54 | 78 | 92 | 24 | 67 |
| cedh | Tayam Midrange Adnaus [cEDH PRIMER] | Tayam, Luminous Enigma | 65 | 55 | 75 | 89 | 20 | 92 |
| cedh | Black Hole Son | K'rrik, Son of Yawgmoth | 68 | 54 | 81 | 95 | 27 | 78 |
| cedh | [cEDH] Urza Power Scepter [Primer] | Urza, Lord High Artificer | 71 | 56 | 84 | 95 | 27 | 64 |
| cedh | [A52] New Catering  | Rocco, Cabaretti Caterer | 73 | 62 | 81 | 93 | 19 | 89 |
| cedh | [Mardu cEDH] Binder of the Breach | Dihada, Binder of Wills | 74 | 62 | 83 | 95 | 21 | 89 |
| cedh |  Layered Atraxa  cEDH | Atraxa, Grand Unifier | 75 | 64 | 82 | 97 | 18 | 83 |
| cedh | [CABAL] cEDH  UB adaptive control  | Talion, the Kindly Lord | 75 | 67 | 82 | 94 | 15 | 75 |
| cedh | Korvold, the MAD King  | Korvold, Fae-Cursed King | 78 | 65 | 86 | 98 | 21 | 85 |
| cedh | [SALT] two rhystics. (cEDH Zur Tempo) | Zur the Enchanter | 79 | 69 | 84 | 96 | 15 | 84 |
| cedh | cEDH Inalla - Wizard's Chess | Inalla, Archmage Ritualist | 81 | 70 | 87 | 100 | 18 | 83 |
| cedh | NBC Sisay Slop | Sisay, Weatherlight Captain | 81 | 72 | 86 | 99 | 14 | 86 |
| cedh |   Warrior Queen [cEDH Najeela]  | Najeela, the Blade-Blossom | 83 | 77 | 87 | 100 | 10 | 94 |
