# Semantic precon delta

Baseline: `dfa527735fc436238ecdb6eeb41ebcc79d070b82`
Semantic: `3.2.0-semantic-13` → `3.3.0-semantic-14`
Matched analyzed decks: **163**

| Metric | Mean Δ | Median Δ | Min | Max | + / 0 / - |
|---|---:|---:|---:|---:|---:|
| median | 0.12 | 0 | -3 | 5 | 61 / 53 / 49 |
| p20 | -0.28 | 0 | -6 | 7 | 54 / 29 / 80 |
| p80 | -0.10 | 0 | -5 | 5 | 64 / 31 / 68 |
| peak | 0.06 | 0 | -5 | 6 | 59 / 47 / 57 |
| coverage | 0 | 0 | 0 | 0 | 0 / 163 / 0 |

Median |Δ| ≤ 1: **131/163**
Median |Δ| ≤ 2: **159/163**
Peak |Δ| ≤ 2: **138/163**

## Outliers (|Δmedian| ≥ 3 or |Δpeak| ≥ 5)
- Fae Dominion (fae-dominion-woc): median +1, P20 +4, P80 +3, peak +6, coverage +0
- Ahoy Mateys (ahoy-mateys-lcc): median +5, P20 +4, P80 -1, peak +2, coverage +0
- Aura of Courage (aura-of-courage-afc): median -1, P20 -1, P80 -1, peak -5, coverage +0
- Limit Break (FINAL FANTASY VII) (limit-break-final-fantasy-vii-fic): median -2, P20 +0, P80 -2, peak -5, coverage +0
- Eldrazi Incursion (eldrazi-incursion-m3c): median +3, P20 +4, P80 +3, peak +3, coverage +0
- Elven Council (elven-council-ltc): median -3, P20 -2, P80 -2, peak +3, coverage +0
- Ruthless Regiment (ruthless-regiment-c20): median +3, P20 +3, P80 +0, peak +1, coverage +0
