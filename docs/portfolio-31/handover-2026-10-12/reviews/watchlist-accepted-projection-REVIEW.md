# OPEN Intel Watchlist accepted-projection finding

Status: preserved for restart; no source fix, browser reproduction or new test was run. The user switched the session to GitHub publication and exhaustive handover. Root owns publication; this review performed no credential, AWS, merge or provider action.

## Exact finding — BILL-11 / BILL-12

`writeWatchlist` in `apps/web/src/features/portfolio/bill-tracker/watchlist-writer.ts` accepts the Intel response by exact client ID plus `version === expectedVersion + 1`. It does not compare returned targeting to the submitted full replacement. `useWatchlistEditor > execute` then calls `session.confirm()`, publishes that targeting and closes when no rejection entries are returned.

A static counterexample is an `expectedVersion: 7, topics: []` submission followed by an exact-client, shape-valid `version: 8` receipt containing a retained topic and empty rejection arrays. The current checks accept it and remove the uncertainty fence. This counterexample is derived from the exact code; it has not been executed as a browser test during the preservation hold.

At native main `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`, [TrackerWatchlistService](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-watchlist.service.ts) performs the write transaction, then calls `getWatchlist`. That method reads the head/version, topics and terms in separate `withTenant` calls. An intervening writer can therefore make the returned topic projection inconsistent with the previously read head/version; this mechanism is an inference from the source, not a live race observation. The next version alone is insufficient accepted-field evidence.

## Minimal restart correction and qualification

Preserve the frozen checkpoint. First add the synthetic empty-replacement/retained-topic baseline and a simple edited-label/old-projection case against its exact source. Keep the existing native client/next-version checks, then validate the accepted replacement fields using published normalization and actual partial-rejection associations. Native topic rejection `index` and term rejection `termType` exist and may be preserved if needed; do not invent a client/tenant/operation receipt or duplicate the entire server reconciliation workflow.

A contradictory or unattributable result must keep the draft and unknown fence, avoid success-close and accepted-data publication, and use the existing explicit saved-value reload. A reload is a read and does not prove that a dispatched request rolled back. Preserve legitimate partial rejections, rename behavior, Core's full normalized projection, Intel conflict/428 semantics, current-source/actor/lifetime guards and all no-replay assertions. Qualify the focused correction and its valid normalization/empty/partial outcomes before root's later combined gate. No live watchlist/provider call is needed.

## Read review scope

The immutable `fixed-candidate-01/manifest.json` contains 22 hash-verified inputs; all 6 pinned native blobs match their recorded Git blob SHA. This provisional review found no additional actor/client/lifetime, permission or Core receipt defect. It does not approve the open Intel accepted-projection path, repeat root's topic-card Figma finding, or claim final P2 source/browser qualification. `review.json` records exact source/native/shared hashes, function anchors, known limitations and all context roots for packaging.

## P3 preservation

The P3 frozen alert manifest remains SHA256 `c1162e5fc5f9f8fa759017480530e941d0ed32f0a63b37a72cf1a75f82fc67fc`; all 32 frozen and working owned files still match. The portable archive remains SHA256 `556d1ad25f301946212bda9c706e7ca4ef43c5569e17be325d50aff8cfef40a9`.

The separately proposed `PhoneVerification` code-requested text correction remains **OPEN and unapplied**: show the ready intro only without a currently visible challenge (or when unknown), and append “Confirming this phone enables SMS alerts.” to the challenge acknowledgement. Keep native/dormant/devCode/unknown handling unchanged and qualify the changed phone presentation separately after preserving the original P3 integration. The immutable P3 candidate and archive were not altered.
