# Aeon Scorer v3.3 calibration report

Generated: 2026-08-23T19:27:51.629Z
Engine: 3.3.0
Semantic: 3.3.0-semantic-14
Model: sequence-access-v3.2-semantic
Iterations/deck: 3200

## Macro quality gates: 17/17

- ✅ **sample** — 39 total / 15 precon / 15 cEDH / 9 user
- ✅ **data-completeness** — all benchmark lists fully resolved
- ✅ **precon-temporal-coverage** — {"earliest":"2018-06-08","latest":"2026-06-26","recent":7,"total":15}
- ✅ **cedh-commander-diversity** — 15/15 distinct commanders
- ✅ **all-separation** — AUC 0.996, gap 27.0
- ✅ **holdout-separation** — AUC 0.980, gap 23.0
- ✅ **distribution-separation** — cEDH P10 - precon P90 = 11.2
- ✅ **deterministic-repeat** — max repeated median range 0
- ✅ **fast-mana** — {"name":" Layered Atraxa  cEDH","full":74,"cut":56,"speedDelta":32,"explosiveDelta":51,"commanderTurnDelta":1}
- ✅ **tutors** — {"name":" Layered Atraxa  cEDH","consistencyDelta":22,"medianDelta":4,"ceilingDelta":3}
- ✅ **commander-dependency** — {"median":7.5,"positive":8,"total":8}
- ✅ **semantic-scale** — strict precon 47.0, cEDH 74.0
- ✅ **package-precision** — {"preconStrongMedian":1,"userStrongMedian":1}
- ✅ **hei-bai-real-regression** — {"preconStrongMedian":1,"userStrongMedian":1,"heiBaiFound":true,"heiBaiHasEarly":true,"heiBaiHasBlink":true,"heiBaiHasConstellation":true,"heiBaiFalseSpells":false,"heiBaiFalseCounters":false,"heiBaiFalseGraveyard":false,"heiBaiT1Engine":0}
- ✅ **untrained-mid-cohort** — {"precon":47,"user":49,"cedh":74}
- ✅ **combo-signal** — {"count":6,"peakMedian":98.5,"names":[" Layered Atraxa  cEDH","cEDH Inalla - Wizard's Chess","  Warrior Queen [cEDH Najeela] "]}
- ✅ **profile-invariants** — P20 ≤ P50 ≤ P80 ≤ peak for all decks

## Anchors

- Precons: 15
- Precon dates: 2018-06-08 → 2026-06-26 (7 since 2024)
- cEDH: 15 (15 distinct commanders)
- User/public: 9
- Holdout AUC: 0.980
- Overall median gap: 27.0

## Deck results

| Source | Deck | Commander | Median | P20 | P80 | Peak | Dispersion | Consistency |
|---|---|---|---:|---:|---:|---:|---:|---:|
| precon | Blame Game | Nelly Borca, Impulsive Accuser | 38 | 27 | 48 | 68 | 21 | 66 |
| precon | Elven Empire | Lathril, Blade of the Elves | 39 | 29 | 49 | 77 | 21 | 68 |
| precon | Coven Counters | Leinore, Autumn Sovereign | 41 | 27 | 54 | 85 | 27 | 59 |
| precon | Primal Genesis | Ghired, Conclave Exile | 42 | 29 | 54 | 88 | 26 | 61 |
| precon | Abzan Armor | Felothar the Steadfast | 42 | 31 | 53 | 79 | 21 | 65 |
| precon | Most Wanted | Olivia, Opulent Outlaw | 45 | 32 | 56 | 81 | 24 | 62 |
| precon | Grave Danger | Gisa and Geralf | 46 | 33 | 58 | 86 | 25 | 61 |
| precon | Breed Lethality | Atraxa, Praetors' Voice | 47 | 30 | 59 | 86 | 29 | 55 |
| user | Zur, fun and friendly | Zur, Eternal Schemer | 47 | 34 | 57 | 85 | 24 | 63 |
| precon | Family Matters | Zinnia, Valley's Voice | 48 | 37 | 59 | 83 | 22 | 62 |
| user | Karumonix - Rat Colony Aggro | Karumonix, the Rat King | 48 | 38 | 57 | 74 | 19 | 65 |
| user | RAT SWAP KARUMONIX / WICK | Karumonix, the Rat King | 48 | 38 | 57 | 74 | 19 | 65 |
| user | Torgal Fine Hound - flash | Torgal, A Fine Hound | 49 | 41 | 58 | 81 | 17 | 66 |
| user | Wick - Grixis Snail Burn | Wick, the Whorled Mind | 49 | 39 | 58 | 79 | 19 | 67 |
| precon | Necron Dynasties Collector's Edition | Szarekh, the Silent King | 51 | 38 | 61 | 85 | 23 | 62 |
| precon | Revival Trance Collector's Edition (FINAL FANTASY VI) | Terra, Herald of Hope | 51 | 37 | 62 | 90 | 26 | 60 |
| precon | Wakanda Forever Collector's Edition | T'Challa, the Black Panther | 51 | 39 | 62 | 86 | 23 | 63 |
| precon | Obscura Operation | Kamiz, Obscura Oculus | 52 | 39 | 65 | 89 | 25 | 58 |
| precon | Planeswalker Party | Commodore Guff | 52 | 39 | 64 | 90 | 25 | 62 |
| user | Clavileno | Clavileño, First of the Blessed | 55 | 43 | 66 | 89 | 22 | 61 |
| user | Arabella, strong but not disgusting for others | Arabella, Abandoned Doll | 56 | 44 | 70 | 88 | 26 | 55 |
| cedh | Winota Avalanche | Winota, Joiner of Forces | 58 | 48 | 71 | 87 | 23 | 68 |
| precon | Quandrix Unlimited | Zimone, Infinite Analyst | 59 | 49 | 69 | 91 | 20 | 62 |
| user | Clavileno upgraded | Clavileño, First of the Blessed | 60 | 50 | 71 | 89 | 22 | 62 |
| cedh |  It Does Nothing  | Ellivere of the Wild Court | 62 | 52 | 73 | 90 | 22 | 76 |
| user | hei bai fun and friendly (as much as possible) | Hei Bai, Forest Guardian | 62 | 49 | 73 | 92 | 24 | 59 |
| cedh | Tayam Midrange Adnaus [cEDH PRIMER] | Tayam, Luminous Enigma | 65 | 55 | 76 | 90 | 20 | 92 |
| cedh | [cEDH Etali] Flintstone Gummy  | Etali, Primal Conqueror // Etali, Primal Sickness | 66 | 53 | 77 | 91 | 24 | 68 |
| cedh | Black Hole Son | K'rrik, Son of Yawgmoth | 68 | 54 | 81 | 95 | 27 | 78 |
| cedh | [cEDH] Urza Power Scepter [Primer] | Urza, Lord High Artificer | 71 | 57 | 84 | 95 | 27 | 64 |
| cedh | [A52] New Catering  | Rocco, Cabaretti Caterer | 72 | 61 | 80 | 92 | 19 | 89 |
| cedh | [Mardu cEDH] Binder of the Breach | Dihada, Binder of Wills | 74 | 62 | 83 | 95 | 21 | 89 |
| cedh |  Layered Atraxa  cEDH | Atraxa, Grand Unifier | 75 | 64 | 82 | 97 | 18 | 83 |
| cedh | [CABAL] cEDH  UB adaptive control  | Talion, the Kindly Lord | 75 | 67 | 82 | 94 | 15 | 75 |
| cedh | Korvold, the MAD King  | Korvold, Fae-Cursed King | 78 | 66 | 86 | 98 | 19 | 85 |
| cedh | [SALT] two rhystics. (cEDH Zur Tempo) | Zur the Enchanter | 79 | 69 | 84 | 96 | 15 | 84 |
| cedh | cEDH Inalla - Wizard's Chess | Inalla, Archmage Ritualist | 80 | 68 | 86 | 100 | 19 | 83 |
| cedh | NBC Sisay Slop | Sisay, Weatherlight Captain | 81 | 72 | 86 | 100 | 14 | 86 |
| cedh |   Warrior Queen [cEDH Najeela]  | Najeela, the Blade-Blossom | 83 | 77 | 87 | 100 | 10 | 94 |
