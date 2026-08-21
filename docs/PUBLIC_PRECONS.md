# Aeon public Commander precon library

## Purpose

Aeon keeps a public, versioned library of official Commander preconstructed decklists so players can compare fixed commercial decklists with the same Aeon model used for their own decks.

The library is also a broad regression and semantic-QA corpus. A precon result is **model evidence, never a truth label**. Aeon must never tune a release merely to force a specific precon toward a preferred score.

## Data sources

- Deck/product metadata and canonical card lists: MTGJSON `DeckList.json` + per-deck JSON.
- Card semantics and commander artwork: current Scryfall Oracle data.
- Aeon result: the repository's current `analyzePower` engine.

Exact duplicate decklists are collapsed by immutable deck hash. Product/reprint aliases remain metadata on the canonical record.

Two-commander Partner / Background products stay visible in the catalog but are marked unsupported until Aeon's analysis model supports that commander configuration.

## Generated static snapshot

Run:

```bash
npm run precons:generate
```

Default generation uses 3,200 sequences per supported precon and writes:

- `public/precons/catalog.json`: compact searchable catalog;
- `public/precons/<slug>.json`: full public detail, decklist and Aeon result.

The generated snapshot contains its exact engine version, semantic version, Scryfall Oracle date/hash and source revision. Static files are used by the website for fast public reads and reproducibility.

### Current v3.2 snapshot

<!-- PRECON_SNAPSHOT_START -->
Current reviewed snapshot: **168 canonical / 163 analyzed / 5 unsupported / 0 incomplete**, generated 2026-08-21, at 3,200 sequences with engine `3.2.0` / semantic `3.2.0-semantic-8`; source revision MTGJSON `2026-08-21`.
<!-- PRECON_SNAPSHOT_END -->

This block mirrors `public/precons/catalog.json` and is checked by `npm run test:public-precons`. Any stale count, version, generation date, iteration count or source revision fails the quality gate. The same contract also checks compact Oracle evidence for reversible-card identity regressions such as a duplicated or untyped Sol Ring.

## Versioned Supabase storage

Production uses two dedicated tables:

- `public_decks`: immutable/canonical public deck identity and decklist;
- `public_deck_analyses`: versioned Aeon result history.

Both are public read-only through RLS. Anonymous/authenticated clients have SELECT only. Writes are operational/service-role work.

A synchronized supported precon analysis also creates an `analysis_runs` row with `source='precon'`. That reuses Aeon's normal semantic audit queue. It does **not** make the precon result ground truth.

Sync after generating a reviewed snapshot:

```bash
SUPABASE_SERVICE_ROLE_KEY=... npm run precons:sync -- --write
```

The sync refuses to write when fresh Scryfall Oracle data no longer matches the generated Oracle snapshot hash. Regenerate first in that case.

## Release lifecycle

For every new Aeon engine or semantic release:

1. run the normal semantic/metamorphic/adversarial/macro/convergence gates;
2. regenerate the complete public precon snapshot with the new version;
3. run `npm run test:public-precons`;
4. inspect distribution changes and large unexplained per-deck movement as regression signals;
5. merge the reviewed generated snapshot;
6. sync the snapshot to Supabase;
7. allow `source='precon'` analysis rows to enter the existing semantic audit queue;
8. preserve every older `public_deck_analyses` row for historical comparison.

A new Aeon version should therefore make old catalog analyses visibly `outdated` until the new snapshot exists; it must never overwrite historical results in place.

## Public UI contract

`/decklists-publiques` offers:

- search by deck, commander, product and set;
- color identity filters, either contains or exact identity;
- release-year range;
- current / re-audit-needed / pending / unsupported state;
- min/max filters for median, P20, P80 and peak;
- sorting by release, deck, commander, median, P20, P80, peak, P20-P80 spread and coverage.

Each card emphasizes commander art, median, P20-P80 and peak. Clicking a deck opens its versioned Aeon detail, diagnostic and official decklist.

## Operational boundary

Public precons expand coverage. They do not automatically change:

- the 0-100 scoring scale;
- the precon calibration anchor;
- semantic rules or tags;
- weights or thresholds;
- the approved production model.

Any engine correction still follows `RAW -> AUDIT -> APPROVED MODEL` and the existing test/promotion gates in `docs/SEMANTIC_AUDIT.md`.
