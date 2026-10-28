# MM16 completed legacy report consumer

## 1. Scope and pins
Frontend successor of reviewed preview/revision binding ec628e50aff811e37915c3807eaa4f0b10413ad2. Core paired source is4430a8681daebb6de51912391deee4d5ce5a960b/tree14526783ca5bbc6be302f08c9c43d8e09ea84318, including independently corrected legacy reader2bdf9d28/tree9eb719e9. This adds current-authorized read-only access to completed original reports in Meri Files. The separate seven-section native cited Word recipe remains active.

## 2. Canonical owner and receiving
Two strict registered Capiro GET operations reuse the existing browser API/gateway and Core controller. Source identities, stored original kind and original Markdown are preserved; there is no alternate report producer, model loop, renderer/export request, job settlement, firstChat or nextTurn. Core owns current source/held/client authorization; browser scope only narrows selection.

## 3. Visible workflow and paging
Load/Refresh and Load more expose bounded discovery. An empty page with a continuation is not a terminal list. Repeated continuations/duplicate returned identities refuse. Opening a listed report reads fresh Core data; downloading saved Markdown performs a fresh read again. Failures clear prior visible body/metadata and require explicit refresh. No silent retry or fallback. Reports are in stable original-ID order, with no newest-first or corpus-completeness claim beyond reaching the current terminal page.

## 4. Current view and content lifetime
The host keys the controller by account/client and unmounts it when identity or client access is not current. Unmount aborts outstanding reads, clears state and ignores late results. No cross-account browser cache or stored report body. Existing MarkdownContent sanitizes presentation; downloaded bytes are the authorized saved UTF-8 text. Temporary download object URLs are revoked. Preview/revision/native artifact capabilities and existing Files behaviors remain unchanged.

## 5. Approved preview credential classification
Neo explicitly approved “Approve the two-file change” after concrete proposal675d57c39a5416a275260c55f390aa9251ed7f9551fbb06bdd55eed2aed5cb9b / patch50a35aa3aa3076dc7db82e8b7620937f26f05ac649e113563bcef378afb0d625. This candidate changes only the existing frontend credential classifier for the two GET/HEAD report routes on the exact existing native Core origin. The paired Core change only declares the same handlers in existing preview read classification. Clerk/tenant/membership/auth implementations and all host/flag guards are unchanged. Ordinary non-preview authentication remains inherited; controller no-write claims do not assert zero authentication metadata updates there.

## 6. Checks and witnesses
Node24.22.1; retained dependencies read-only. Eight report consumer cases plus120 existing preview read cases:128/128PASS. Full web TypeScript exit0. Touched ESLint exit0 with one unused synthetic fixture destructuring warning; Prettier/diff checks clean. Exact ec628 registry loader witness fails the positive canonical route with Unknown operation (1failed/6filtered), no source substitution. Before the approved credential classifier change, its positive gateway test fails because both credential selections are undefined (1failed/7filtered). Core separately has139/139 focused classifier/middleware tests after11fail/6pass baseline witness. No browser/native rendering, DB, build, deploy, model/provider, package registry or live acceptance.

## 7. Design and review
The canonical scanner reports no new dependency boundary errors. LegacyReportLibrary is one98-nonblank-line function, fingerprint6d30835092219fa9686d13e986939bb4395093831e3438ea8be7fbd3ed638d12: one cohesive list/reader view, state/correlation in its dedicated controller and transport in the canonical client. Existing ConnectedFiles116-line fingerprint e7cb7bbda23fc42685437f2d16b8d511fa37f2b1bef77413e4808005e3887885 remains exact. Independent source/design and approved two-file classifier review follow this freeze; no architecture registry changes are made here.

## 8. Compatibility and remaining work
All public .24/.11 archives, manifests, lock/vendor and installed member bindings remain byte-identical to ec628/9ecf. Prior f175/efac/ec628 registry entries remain unchanged. Core routes are source-only pending integration/deployment; UI source is not live acceptance. Source-backed/asset revision, new cited report recipe, upload/native-file history consumers, general outputs and remaining M5 workflows stay open.

## 9. Evidence and cleanup
Owned external logs/receipts use work/wave5-legacy-reports-* and work/hermes-review/. Original frozen source, failure witnesses and review reports are preserved. No shared cache/source or protected auth implementation was edited. Only the listed8 source/test paths and this handoff changed. No remote publication or target action.
