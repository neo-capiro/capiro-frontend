# PR56 document operation-family binding

**Confirmed: the proposed server-configured single-family Files view matches the published contract.** Exact Meri PR56 source `25e0d29d6f0b6c3de284d13e86bc5f1aa0c00d21` continues to bind each trusted document application to **one** canonical `create_word` **or** `create_excel` operation. There is no published mixed-family mount and no browser authority to select another family.

Fetched both requested READMEs and the public manifest through the authorized GitHub connector, pinned to that exact commit. All three Git blobs were independently verified and are byte-identical to the PR54 copies reviewed at `70516e5c9681917ce493bbc50e3023494f2e1209`. The GitHub ancestor comparison contains 226 changed paths, no `packages/contracts/` or Meri contract tar changes, and no reported oversized comparison. Public package version remains **0.1.2**. This check did not redownload or execute the package; the prior verified 228048-byte tar with SHA256 `8a3f6c95935c368da5c01d87c599c5d13b9b62a21bc6924e7ad0b723bd5e91fa` remains the existing reviewed input.

## Exact supported mount

The trusted caller supplies `artifactOptions` with the canonical descriptor projection for one operation, prebound context, producer identity, immutable allocation and original expiry. The artifact capability is trusted host configuration. HTTP requests use the separately issued opaque action session; existing session issuance may be mounted beside the document application on the same trusted host. Native Clerk credentials, browser hints or the operation field are not substitutes for that authority. The application is disabled by default. [Pinned application README](https://github.com/neo-capiro/meri-greenfield/blob/25e0d29d6f0b6c3de284d13e86bc5f1aa0c00d21/apps/control/document-application/README.md)

| Configured family | Typed request | Accepted operations |
| --- | --- | --- |
| `create_word` | Canonical Word request, DOCX or TXT | Create, full replacement revision, inspect, verified download of that family |
| `create_excel` | `{operation:'create_excel', format:'xlsx', title, content:{sheets:[{name,rows}]}}`; canonical literal-value/formula cells | Create, full replacement revision, inspect, verified download of that family |

Both use exactly the same authenticated POST JSON paths: `/api/documents/create`, `/revise`, `/inspect`, `/download`. Create receives `{deliveryId,request}`; revise receives `{deliveryId,baseVersionId,request}`; reads receive `{versionId}`. A Word-bound mount refuses Excel requests **and results**, including inspect/download; Excel similarly refuses Word. Revision creates a new immutable version from the full replacement typed request and exact previous `baseVersionId`; it does not patch cells or mutate the original file in place. [Pinned public receiving contract](https://github.com/neo-capiro/meri-greenfield/blob/25e0d29d6f0b6c3de284d13e86bc5f1aa0c00d21/packages/contracts/README.md)

## Frontend recommendation and limits

- Treat `MERI_DOCUMENT_OPERATION=create_word|create_excel` as a **proposed frontend server configuration**, not an existing backend environment variable or an authority grant. Validate its finite values and require it to match the actual configured trusted host. Invalid/missing activation must not silently enable a service.
- Passing the selected family as presentation configuration into `/meri/files`, with no browser family switch, is coherent. Retain the requested Word/DOCX experience as the default presentation; a separately configured Excel host can expose the workbook flow through the same route contract. Separate host configurations do not imply that one current mount supports both families simultaneously. That would require an explicitly published, reviewed trusted routing/mount contract.
- Reuse the one public 0.1.2 receiver instance, branded request/version objects, exact parent/version correlation, opaque-session bootstrap and current actor/tenant/client lifetime. No new DTO owner, route family, hidden session issuance or approval UI is warranted.
- Preserve conservative uncertainty and no automatic retry/new-delivery allocation. Formula caches remain unverified; native-opened/rendered/recalculated flags remain false. Local workbook creation, revision or rendered-copy evidence does not qualify production Office rendering/recalculation, storage, identity or execution.

There is no new public receiving-contract blocker for this single-family source design. Actual mount availability/configuration and native qualification remain separate deployment requirements; this read-only check establishes neither. No frontend repository or original evidence was edited, no private backend implementation was copied, and no module, tests, browser, provider, native service or network application runtime was executed. `VERIFICATION.json` and the fetched connector receipts preserve exact bindings.
