# O204: accepted size records registered

This change registers the 42 exact cohesion records accepted by dot at source head `ad4a1eb31fe380b2192f10c887e8d1b82939e317`. O204 corrects the bounded shared-file exception to `scripts/architecture/reviewed-size-findings.json`.

- Decisions: https://github.com/neo-capiro/capiro-frontend/pull/117#issuecomment-6348944636
- Corrected registration authority: https://github.com/neo-capiro/capiro-frontend/pull/117#issuecomment-6349374903
- Base: `87a8495138f0af5303bc93397438238c6cc5081b`.
- Exactly **9 replacements + 33 additions**, verbatim from `PROPOSED-REVIEWED-SIZE-FINDINGS.json`. All source fingerprints and prior records were rechecked before application.
- Unrelated records, `reviews.mjs`, evaluator, thresholds, baseline, dependencies, product and tests are unchanged. An independent read-only review confirmed the delta and conflict-free composition with #118's disjoint accepted records.

## Executed verification

`npm run architecture` exits **0**, errors `[]`: **550 total / 532 reviewed / 18 inherited-unreviewed / 0 blocking**. Existing exact-lock dependencies were reused; no clean-install claim.

Before #118's separately authorized product corrections, the composed source with all 50 records also exits **0**: 551 total / 533 reviewed / 18 inherited-unreviewed / 0 blocking. This is a registration-only checkpoint, not the final corrected #118 composition. Changed #118 fingerprints require new exact-head dot review; their earlier acceptance is not carried forward automatically.

No unchanged behavior suites or Fable production qualification were repeated for this registry-only correction. Prior missing-jsdom form coverage remains **zero executed**. Fable reports actual suites in the composed build; earlier blocked/unrun compiler, browser, build and scan receipts are not converted into passes.

The inherited Reconciliation cancelled-notes observation is excluded by O204 and untouched. Cohesion registration grants no behavior/release clearance. Exact-head review remains required; frontend shipping waits for corrected backend live. A2 HOLD and acceptance STOP2/6 remain.

## Retained evidence

- Registry SHA-256 after application: `a01c5f7640c2f397fc616e4ba915f374b5a34ab790eb5ce7459d1a1586953657`.
- Canonical architecture log SHA-256: `ecb0a3c77a0e66bcfe9bf21afff088dd0d70a81edd050ade0fc172390db3c2ad`.
- Local receipts: `/dev/shm/a1-o204/registration.json`, `registry-independent.json`, `architecture-117.log`.
