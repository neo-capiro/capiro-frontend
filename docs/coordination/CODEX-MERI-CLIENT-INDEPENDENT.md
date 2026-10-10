# Independent public client and stream producer review

Result: no blocking implementation defect established for this source migration and synthetic public-package qualification. Integration and deletion remain the owner's decisions. This is a distinct Codex review, with no Hermes invocation, AWS/provider/source connection, browser/server launch or backend deletion.

Reviewed frontend candidate `6b7bf6068f3328d07f296444693755f1128d6832` in dedicated `meri-client-review`; backend `ef0e65039db537707a9700bba950f71a6008758d` in `meri-ui-stream-review`, containing producer source `12289a434be6f589bbff9c741367b8cfb77f2616` and its archive-count report correction. Original transport reference is `089533104eb567899e79cddf7b400460395e6de0`. Both repositories were clean at the captured pre/post boundaries. I read their instructions, source, declarations, handoffs, migration records and complete 601-line qualification before running checks. No implementation or workspace metadata changed.

## Source and public boundaries

The trusted backend producer retains the original algorithm: it consumes caller-authorized UIEvents, writes the SDK start/data/finish stream and reports subscription outcomes. AST-printer comparison after removing imports reproduces the original producer exactly. It grants no authorization, runs no model and supplies no authenticated route. Those remain prerequisites for any real caller.

`@capiro/meri-ui-stream/protocol` has two literal runtime constants and **zero runtime imports**. Its declarations use type-only imports from `ai` and canonical public contracts. The browser client consumes this subpath rather than importing the producer. `types.ts` derives UIEvent/RunBinding from `@capiro/meri-contracts`, derives run status with `Extract`, and defines a local validator signature. It does not duplicate the wire DTO. AuthorizedView is a local projection scope, not proof of authorization.

Projection behavior is unchanged outside imports. Guarded transport differs only in the reviewed endpoint change outside imports: `api` becomes required, the guessed default is removed, and blank/missing configuration throws before projection/Chat allocation. The React facade adds its explicit `'use client'` directive, public type imports and `.js` export path; its hook and disposal behavior remain unchanged. Independently normalized comparisons check these exact transformations rather than merely comparing function names.

The root client export, `/projection` and `/react` resolve compiled JavaScript and declarations. All three packages deny tested private source paths. The facade uses the externally managed Chat with `resume:false`; disposal detaches the view and closes its transport without issuing durable cancellation. No React hook was mounted or hydrated in this review.

## Independent checks

All checks used Node **24.19.0**; strict builds used borrowed, read-only TypeScript **5.9.3**. Compiler inputs were copied to my ignored scratch before building; outputs never went into shared borrowed dependencies or candidate files.

| Check | Actual result | Direct elapsed |
| --- | --- | --- |
| New non-Git packed consumer, offline/scripts-disabled install | exit 0; 35 packages added | 6.500 s |
| Client strict build on owned source copy | exit 0; eight emitted files byte-identical | 1.219 s |
| Producer/protocol strict build on owned source copy | exit 0; four emitted files byte-identical | 1.094 s |
| Original qualification on actual installed public artifacts | **21 PASS, 0 FAIL, 0 skipped**, once | 2.968 s |
| New independently authored packed-boundary controls | **9 PASS, 0 FAIL, 0 skipped**, once | 2.078 s |
| Corrected independent static migration reconciliation | PASS | 0.453 s |

Commands are exact argument arrays in the retained machine envelopes. Builds invoke `node …/typescript/bin/tsc -p <owned-copy>/tsconfig.json`. Behavioral checks invoke `node --import <review-network-guard> --test qualification.test.mjs` and separately `independent.test.mjs`. Each has a 120-second direct-child bound, exclusive binary captures, UTC timing, exit/error status and measured source/runtime pins before/after. The successful rows report stable measured pins. Neither behavioral suite was repeated.

The nine new groups exercise literal protocol constants; missing/mismatched event IDs; native/unknown frame and canonical nested-extra refusal; actual producer/client cross-tenant, actor and conversation refusal; gap hold/drain plus sequence collisions; immutable nested projection snapshots; stream outcome distinct from run completion and disposal distinct from cancellation; missing endpoint before view/fetch access; and private exports. They use synthetic fixtures and actual packed SDK composition. These are nine groups with multiple assertions, overlapping the canonical suite, not thirty distinct comprehensive scenarios.

The migration DATA check verifies all **12** original file records against raw Git bytes and all six explicit destination pins. All **19** original case names and normalized test-function bodies/assertions match; the only removed comparison adaptation is the deliberate explicit mock endpoint insertion in one fixture. There are 21 current cases. Retired metadata rows have documented dispositions and are not counted as executable parity. The full producer/projection comparisons, exact guard/facade adaptations and all **12** emitted JavaScript/declaration byte comparisons pass.

## Artifact and evidence integrity

The fresh consumer is a sibling outside Git, confirmed by Git's exit 128. It installs these exact archives, with no workspace-private imports:

| Artifact | Bytes / regular entries | SHA-256 |
| --- | --- | --- |
| contracts 0.1.0 | 48,823 / 11 | `2f15ade9458cbffe960b7cc36c6fb77cb54cc2a0eca4bc7c0f918b77cfacd4ee` |
| ui-stream 0.1.0 | 2,280 / 6 | `7ce24acd465dca4c5e90c1c98dba383318aab024dbce5170fa1f1daf3bce83ab` |
| meri-client 0.1.0 | 8,317 / 10 | `d637a6b4d0b1c039ead23ef98f21bc4c8e7ba1926df437e8ec48f02dc174f3bb` |

Every archive member matches candidate distribution bytes; all **27** installed public members also match. Final DATA readback verifies **41** scoped source/data files equal fixed-commit Git archive blobs and current files, and remain stable through readback. Ten read-only Git commands retain binary streams, timing and status. Fifty installed package metadata records and a 2,521-file upstream source inventory are retained as **post-check observations**, not claimed as a pre/post full upstream execution closure. Runtime versions explicitly checked include ai 7.0.137, @ai-sdk/react 4.0.140, React 19.3.0 and Zod 4.6.5. The consumer does not install uuid; an override does not imply that package exists.

Evidence root: `.task-inputs/CODEX-MERI-CLIENT-INDEPENDENT-1/`. Each run's `process.json` pins its raw `stdout.bin` and `stderr.bin`. `preparation.json` records migration/artifact inputs; `migration-audit-v2.json` records the independent reconciliation; `final-data-v2.json` is 736,857 bytes, SHA-256 **`3308752d39838160ffaf15348606e3fac34d24a6f5c0095b784886a03de0eea2`**. Twelve author command/result/binary files were copied unchanged under `final-data-v2/author-retained`; they are historical author evidence, distinct from my checks.

Install used `--offline --ignore-scripts --no-audit --fund=false` with update notifier/audit/fund disabled, explicit global cache and separate empty user/global config files. The retained npm debug log contains 37 `http fetch` records, **all labeled cache hit/stale**, zero non-cache-labeled records and no npm updater marker. Cached npm log labels are not packet capture. Behavioral checks preload throwing fetch/net/http/https APIs; injected fetch returns only synthetic Responses. This is not an OS network sandbox or complete process-descendant containment guarantee.

## Preserved reviewer failures and limits

Two initial compiler runner invocations failed at exclusive output-directory creation because preparation had already created the same directory names. Neither compiler started. Original helper and recorded errors remain; a new runner used separate check directories. No candidate change was involved.

The first static helper failed its guarded-transport comparison because its context-free TypeScript scanner mishandled template-literal lexical context. The failure/captures remain. A separately named helper uses ordinary parsed AST printing with comment/trivia normalization and exact declared transformations; it passes. This proves the stated source relation, not general semantic equivalence.

The first final DATA helper incorrectly required installed uuid, producing KeyError after source/artifact checks. The consumer has no uuid dependency. A separately named helper removes that erroneous expectation and preserves all other integrity requirements; it passes. Initial source/archive captures and both helper versions remain. These are reviewer preparation failures, not product failures. The canonical 21 and independent nine executions were unaffected.

This review does not establish browser bundler/hydration behavior, authenticated endpoint ownership, tenant policy/revocation, persistence, durable cancellation, reconnect against a live service, production dependency/security acceptance or any G1 deployment gate. Event validation and local scope guards cannot supply server authorization. Existing backend qualification-source removal remains held until the owner accepts the complete migration. No real source rows, provider calls, AWS resources or current Meri were touched.
