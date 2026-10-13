# Public document receiver 0.1.2

**DOC-CONTRACT-01 is closed for source integration.** Exact Meri PR54 source `70516e5c9681917ce493bbc50e3023494f2e1209` publishes `@capiro/meri-contracts`0.1.2 with `./document-application` and `./document-application/schema`. The verified tar is **228048 bytes**, SHA256 **`8a3f6c95935c368da5c01d87c599c5d13b9b62a21bc6924e7ad0b723bd5e91fa`**, Git blob **`3b1b1e6345539632b8a4be80de44b0ab548369af`**. Ready input: `input/capiro-meri-contracts-0.1.2.tgz`; exact README: `input/README.md`.

All19 regular package members were inventoried without executing them. Packaged README/manifest/metadata match exact GitHub source; schema digest matches its metadata. All13 older members other than README/package manifest are byte-identical to the verified0.1.1 tar, including frozen event and recommendation-action exports. This is additive package compatibility, not native activation or inherited frontend qualification.

## Canonical APIs

| Function | Consumer rule |
| --- | --- |
| `receiveDocumentRequest(route, Uint8Array)` | Synchronous. Returns a detached, deeply frozen, locally branded request for `create|revise|inspect|download`. Preserve this exact object. |
| `await receiveDocumentResponse(route,status,Uint8Array,admittedRequest)` | Requires the exact admitted request for that route. Only200 admits JSON success for create/revise/inspect. Non200 returns the exact validated `{error:{code,outcome}}` only when its code matches HTTP status. Download200 is rejected here; download non200 errors use this function. |
| `await receiveDocumentDownload(Response,admittedVersion,options?)` | Requires the exact version object from a successful receiver result. Returns `{version,bytes}` only after genuine EOF, exact length and SHA256 verification. Bytes are a detached mutable Uint8Array suitable for Blob; metadata remains frozen. |

JSON input must be native Uint8Array, not text/objects. Request cap2MiB; JSON response cap16MiB; depth64 and100000 nodes. Fatal UTF8, malformed Unicode, prototype-control keys and invalid closed schemas refuse. These caps apply to already-buffered input: the network transport must also bound acquisition. Branded requests/versions cannot be reconstructed by cloning or matching TypeScript shape; stored versions require a new validated inspect receipt. Use one canonical public export instance so local provenance remains meaningful.

## Routes, formats and receipts

All routes are authenticated **POST JSON** using the existing opaque action session:

- `/api/documents/create`: `{deliveryId,request}` → `{version,inspection,execution}`.
- `/api/documents/revise`: `{deliveryId,baseVersionId,request}` → the same receipt shape, with exact immutable parent.
- `/api/documents/inspect`: `{versionId}` → `{version,inspection}`, including `currentBytesVerified:true`.
- `/api/documents/download`: `{versionId}` → verified binary success; non200 error JSON is handled separately.

`deliveryId` follows canonical `^[A-Za-z0-9_.:@/-]{1,255}$` syntax; it is an opaque delivery identity, not a filesystem path or grant. Version IDs use the published UUID pattern. Preserve actual admitted identifiers and let the public receiver validate them instead of adding a conflicting UUID grammar.

The content union is **create_word/docx**, **create_word/txt**, or **create_excel/xlsx**, with title length1–200. DOCX supports canonical paragraph runs/styles/tables and admitted image/chart references. TXT has `{content:{text}}`. XLSX has `{content:{sheets:[{name,rows}]}}`; cells distinguish literal `value` from `formula`, with optional number format. The receiving schema allows1–30 sheets, up to10000 rows and100 cells/row. Canonical server owners still enforce formula functions, sheet uniqueness, chart relationships and asset admission. No PDF, PowerPoint, general analysis, upload or list/search/delete API is exported.

**Operation-family boundary:** the server application is configured for exactly **create_word OR create_excel**. A Word-bound application refuses Excel writes and inspect/download; an Excel-bound application refuses Word. Public support for both formats does not establish a mixed-family live mount or let browser input choose authority. A Word/DOCX-first `/meri/files` remains coherent; exposing XLSX needs a known compatible trusted mount, not an invented extra route.

Receipt validation matches inspection hash/bytes with version.object, equal ordered version/object scopes, evidence scopes contained in version scopes, scope tenant with producer tenant, MIME and filename suffix. Create requires null parent; revise requires exact requested baseVersionId; both match request format and canonical title-derived filename. Inspect requires exact requested version ID. Canonical filename is ASCII and at most125 characters. Execution states object/version committed and `nativeQualified:false`; generation remains `draft`, preview `pending`, and nativeOpened/rendered/recalculated remain false. XLSX formula caches explicitly remain unverified/recalculation required.

The receiver **does not** recompute execution.requestSha256 without private trusted context, authenticate receipt IDs, prove submitted text from that fingerprint, or infer artifact identity from a parent UUID. The adapter must correlate current request/lifetime and known version state; trusted server authority remains separate. Older versions retain original producer provenance: do not falsely equate a historical attempt/worker/fence with the current executor.

## Download and uncertainty ownership

Download requires native Response, unredirected HTTP200, exact MIME, exact quoted `attachment; filename="..."`, canonical content-length equal to the admitted object bytes, `cache-control:no-store`, `x-content-type-options:nosniff`, and no content-encoding. Default/max bytes16MiB; default timeout30s, maximum60s; optional native AbortSignal. Set **fetch redirect:error before acquisition**. A copied proxy response must preserve these exact permitted headers without forwarding arbitrary headers or turning binary data into JSON/text.

The public binary reader cancels unfinished readers best-effort and releases locks. **Transport integration constraint:** invalid version/options/size/header checks occur before its reader/finally. The outer transport must cancel an acquired but unconsumed response on such refusals and also handle responses acquired after an outer deadline. No bytes or object URL may escape after expiry, revocation or scope replacement. Revoke owned object URLs on replacement/disposal; receiver success alone grants no current access.

There are27 finite error codes; `ERROR-STATUS-MAP.json` preserves the exact table. Key statuses include403 ACCESS_DENIED/SESSION_REFUSED,401 UNAUTHENTICATED,503 UNAVAILABLE,408 deadlines,499 cancellations,413 size,422 unsupported format,415 media and502 uncertain effects/owner failures. Outcomes are only **NOT_DISPATCHED, UNKNOWN, RESULT_NOT_RELEASED, READ_UNAVAILABLE**. Invalid network/receiver replies after a write dispatch cannot be converted to NOT_DISPATCHED. No automatic retry, regeneration, refund or new delivery allocation is implied. Same-delivery replay does not regenerate. Lost create acknowledgements may leave unknown versions; no delivery-reconciliation or version-discovery endpoint was added.

Reuse existing explicit opaque-session bootstrap, captured selected-client checks and canonical user/session/org/client cache lifetime. A fresh server check precedes execution, authority boundaries and release. Local branding is integrity only. Native Clerk tokens and configured artifact capabilities must never substitute for the opaque document bearer. Interrupted writes need a synchronous pre-dispatch, scope-bound uncertainty fence across navigation; clearing/replacing the canonical cache must retire old completions without repopulation. No Commitments UI, hidden session issuance, private backend imports or model loop belongs in this feature.

## Review limits and next controls

Read exact public README, declarations, schema, distributed ESM and public receiver source. Verified all fetched Git blobs and package bytes; copied no private backend implementation. No install, module import, tests, frontend changes, browser, native or provider execution. Published reports state71 public,58 independent and102 application checks; these were not independently rerun in this review.

Implementation should exercise all three public functions with public fixtures: cloned-brand refusal; request/parent/version substitution; frozen request snapshot; error status/outcome preservation; held create/revise and lost acknowledgement; same-cache navigation and identity replacement; current/historical revocation; download header/length/hash/EOF/redirect/overflow/timeout/late-response cleanup; and Blob URL disposal. Preserve the prior Files/mobile navigation and keyboard criteria. Native Clerk/RLS/current-run/storage/worker/Office rendering/recalculation and activation remain unqualified. Separate Office preservation/recalculation work is not silently adopted by this package.

Sources: [exact public README](https://github.com/neo-capiro/meri-greenfield/blob/70516e5c9681917ce493bbc50e3023494f2e1209/packages/contracts/README.md), [request/JSON receiver](https://github.com/neo-capiro/meri-greenfield/blob/70516e5c9681917ce493bbc50e3023494f2e1209/packages/contracts/document-application/receive.mjs), [binary receiver](https://github.com/neo-capiro/meri-greenfield/blob/70516e5c9681917ce493bbc50e3023494f2e1209/packages/contracts/document-application/download.mjs), [application format/authority contract](https://github.com/neo-capiro/meri-greenfield/blob/70516e5c9681917ce493bbc50e3023494f2e1209/apps/control/document-application/README.md), and [source acceptance report](https://github.com/neo-capiro/meri-greenfield/blob/70516e5c9681917ce493bbc50e3023494f2e1209/docs/coordination/reports/CODEX-DOCUMENT-CONTRACT-INTEGRATION-20261013.md).
