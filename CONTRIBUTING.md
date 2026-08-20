# Contributing to Aeon Scorer

Thanks for helping test or improve Aeon Scorer.

The most valuable contributions are **reproducible Commander deck cases** where the explanation or score behaves unexpectedly.

## Reporting a model problem

Please include:

1. commander name;
2. the full 99/100-card decklist or a public decklist link;
3. Aeon Scorer median / P20 / P80 / peak;
4. the package, card role or turn-access result that looks wrong;
5. what you expected and why.

A screenshot is useful, but a decklist is much more useful because the case can become an automated regression test.

## Pull Requests

External contributors should work from a fork or branch and open a Pull Request. Please do not treat a green build alone as proof of model correctness.

Before proposing a scoring change, run:

```bash
npm install
npm run quality:local
```

Changes to semantic roles or the power model should ideally add a regression test demonstrating the problem first.

## Design principle

Aeon Scorer prefers an explainable correction over a one-off exception for a named deck. A fix that only makes one benchmark deck look right but creates false positives elsewhere should not be merged.
