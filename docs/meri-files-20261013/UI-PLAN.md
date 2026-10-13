# Meri Files presentation outline — 13 October 2026

Baseline: `83f54f5ac0107822833adbbfef2b453e0240bc56`. This feature consumes the verified public `@capiro/meri-contracts` 0.1.2 document receiver through the separately owned `shared/meri-documents` port. The package source review is `/tmp/capiro-meri-document-public-contract-20261013/REVIEW.md`, pinned to Meri PR54 `70516e5c9681917ce493bbc50e3023494f2e1209`. No private backend implementation or duplicate wire validator belongs here.

## Owners and interface

- Root owns `/meri/files`, shared shell/sidebar/mobile navigation, canonical session/client lifetime and explicit opaque-session connection. A host identity or configured-operation replacement remounts this feature and disposes its local work.
- `shared/meri-documents` owns the UI port, public request/receipt admission, authenticated bounded transport, current access checks, operation-family binding, immutable-handle correlation and the scope-bound pending/unknown write journal across ordinary navigation. The UI cannot allocate replacement delivery IDs or authorize retries.
- New `features/meri/files` owns the title/body/format inputs, explicit intent, returned-version selection, request observation, accessible rendering and one verified-download Blob URL. The UI port has no credentials in presentation props. The shared workflow-port interface now supplies create/revise unknown-content admission, inspect by exact handle or supplied version ID, verified download, and a nonsecret attempt snapshot. The feature consumes it without copying wire types.

## Bounded UI

An H1 `Files` introduces Word document creation, with the current host context label and an honest unavailable panel when disconnected. The host explicitly binds exactly one server-configured operation: Word exposes DOCX/TXT; Excel exposes XLSX typed sheets/cells. There is no cross-family chooser. Parent authorized both mount families after the unchanged public 0.1.2 workbook confirmation in Meri PR56. A labelled title field and complete-text textarea allow explicit create. DOCX initially represents text paragraphs; no unsupported import, rich Office editor, images/charts or model operation is implied.

Returned immutable versions are retained only for this view and explicitly labelled as such, not as a server file library. Selection shows version ID, parent ID, artifact identity, format/name, creation time, size/hash and the receiver's draft/preview/native qualification facts. An explicit inspect-by-ID control admits an existing version through the shared port; it does not discover/list/search versions.

Revision starts from the selected returned version. The form states that submission replaces the entire document body and creates a new immutable child, preserving the exact selected parent. Unknown original text is never silently inferred from inspection metadata. The user must supply the full replacement text; deliberate submission captures its immutable local input and base handle. Inputs and selection freeze during the observed write so later edits cannot disappear on completion.

Download is explicit. Only verified returned bytes enter a Blob, with the admitted filename/MIME. Selection replacement, inspect/download failure, lifetime replacement and disposal synchronously retire the previous URL. A generated object URL is local to this view, not a storage capability or proof of continuing authorization. Native application opening/rendering remains unverified; preview is pending, not a fake document preview.

## Failure/lifetime behavior

Every operation requires a user action. Mounting, changing input or selection does not invoke a write, inspect or download. No automatic retries or reconnects occur. The shared journal supplies unknown/result-withheld/read-unavailable facts. Unknown writes remain fenced across navigation by that owner; feature-local reset cannot permit replay. A current access failure must remove actionable old version/download state. The feature guards late operation completions after selection, disposal or identity replacement, without treating cancellation as proof a write did not occur.

## Cohesive modules and reuse

Use a workflow observation controller, separate Word text and Excel typed-JSON editors, immutable version/inspection panel, and Blob URL owner. Excel JSON preserves literal value versus formula and numberFormat fields; the canonical shared receiver validates arbitrary parsed content without a feature schema or fabricated validation delivery. Revisions require acknowledgement of complete replacement. Local receipt selection retains up to ten versions returned in this mounted view. Presentation consumes the shared port; it never imports its transport internals. Reuse adopted `@capiro/ui/button`, `input` and `textarea`, native labelled controls, current Meri tokens/spacing and the existing action feature's subscription/disposal patterns. Do not import another feature's private CSS or state. Style a single-column phone layout and a two-column desktop editing/receipt layout with readable wrapping IDs, visible focus, normal heading order and status/error announcements.

## Verification

Pure focused controls cover explicit-only dispatch, captured input/base, operation interlocks, old completion/selection/disposal fencing, write uncertainty, preserving input, returned-version selection, inspect refusal, Blob URL replacement/revocation and failed download non-release. Canonical transport/brand/hash/EOF controls remain the shared adapter owner's tests. Root coordinates a targeted test lease; no build, browser, install or full suite is run during this preparation. Rendered desktop/phone, sequential keyboard/name/heading checks, actual route/navigation/identity replacement and independent review follow source integration. No native Clerk/RLS/storage/worker/Office/provider/model activation is claimed.
