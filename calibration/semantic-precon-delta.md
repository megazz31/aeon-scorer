# Semantic precon delta

Baseline: `main`
Semantic: `3.3.0-semantic-17` → `3.3.0-semantic-18`
Matched analyzed decks: **163**

| Metric | Mean Δ | Median Δ | Min | Max | + / 0 / - |
|---|---:|---:|---:|---:|---:|
| median | 0.20 | 0 | 0 | 3 | 28 / 135 / 0 |
| p20 | 0.11 | 0 | -1 | 3 | 18 / 137 / 8 |
| p80 | 0.12 | 0 | -1 | 3 | 15 / 144 / 4 |
| peak | 0.13 | 0 | -1 | 5 | 14 / 144 / 5 |
| coverage | 0.02 | 0 | 0 | 1 | 3 / 160 / 0 |

Median |Δ| ≤ 1: **160/163**
Median |Δ| ≤ 2: **161/163**
Peak |Δ| ≤ 2: **160/163**

## Outliers (|Δmedian| ≥ 3 or |Δpeak| ≥ 5)
- Political Puppets (political-puppets-cmd): median +1, P20 +2, P80 +2, peak +5, coverage +1
- Peer Through Time (peer-through-time-c14): median +3, P20 +2, P80 +2, peak +0, coverage +0
- Seize Control (seize-control-c15): median +3, P20 +3, P80 +3, peak +2, coverage +0
