# Current-authorized native file version metadata

## 1. Scope and result

FilePreview now offers an explicit bounded version-history read through the existing Core attachment route. The history panel displays saved version metadata oldest first, with deliberate next/first/refresh controls. It neither grants nor invents historical byte download. This is the native-file history consumer portion of MM11/MF14, not full Wave5 closure.

## 2. Base and producer

Frontend base 3a6db089f8c1d0cd0e73ea9ae076dc48c5909197 / tree 48b3fafba164af8c64f2dceec6aaa2337ecbb554. Core source contract is the existing attachment GET extended by 255b1e36fa627aa7e535b462e59ee51dbe22efed, independently source reviewed with 19 tests and bounded typing. Its reviewer found a real prospect delete_pending/delete_failed metadata-suppression issue; A5 owns the narrow producer correction. Do not deploy the uncorrected producer. Response shape is unchanged by the planned correction.

## 3. Owned changes

Only FilePreview import/mount, new FileVersionHistory.tsx, history-access.ts, history-contract.ts, focused file-history.test.ts and this handoff. Existing download/extraction/source owners, FilesPage starter work, public packages, identity/auth and architecture registry are unchanged. The canonical current file-reader/file-scope lifetime is reused.

## 4. Boundary and behavior

GET engagement/attachments sends historyOf, historyPageSize=20 and the opaque historyCursor only. The response receiver correlates the anchor, offset, original/head/count snapshot, exact page size, unique row identities, contiguous supersession ordering and truthful terminal continuation. A changed chain or repeated cursor refuses. Caller identity, current selected client file-list membership and captured lifetime are checked before dispatch and again before release. Core decides present access for every retained chain row. Errors clear visible history; mounting the panel performs no history request. Existing current-file download remains unchanged.

## 5. Verification

Final explicit Node24.22.1 commands are retained in external work/check-native-history-consumer.ps1. Focused file-history plus existing files-boundary suites: 22/22 PASS (20 history cases, 2 existing boundaries). Cases cover real API-client 25-version pagination, malformed/cross-chain replies, stale continuation, wrong client, identity/file/abort changes during response, Core 403/404/409 without retry and real FilePreview mounting without a new file operation. Final full web TypeScript, touched ESLint, Prettier and diff hygiene all exit0. Receipt work/native-history-consumer-final-checks.json, completed 2026-10-28T01:50:33.4611919Z; logs share native-history-consumer-checked prefix.

## 6. Design review obligations

Canonical scanModule reports two exact function-size triggers requiring independent review: FilePreview 104 nonblank, fingerprint 0cd1ddc081b12f8ae5e123061fec5be5bb41707ff8eb9f78128e724d7e6b0235; FileVersionHistory 119 nonblank, fingerprint e6b79e9e07e7744d3a1a329d78094f8509b3933c947a114e39f78773d71c9504. FilePreview changed only import/mount. The history component owns one cohesive read/display lifetime; no size-only splitting or self-approved record. External native-history-consumer-size-findings.json retains exact scanner output.

## 7. Preserved failures and limits

An intermediate JSX test rename was excluded by the repository's canonical test include; that attempt exited1 and is retained in native-history-consumer-tsx-excluded-test-attempt.log/json. The final test uses the canonical .test.ts convention and typed React element composition. Earlier children-prop lint failure is preserved; final lint0. No browser, visual, build, target, live data, model/provider or historical-byte proof ran. No whole architecture gate PASS is claimed.

## 8. Remaining requirement work

Producer deletion-state correction must land before integration qualification. The producer currently bounds one native chain to 200 versions; larger native histories and universal authorized historical bytes are not claimed. Generated artifact library/history is a different existing owner. Native file metadata alone does not satisfy historical byte access or upload/extraction readiness. The active upload and starter work remains separate.

## 9. Handback and cleanup

Task-owned isolated branch; retained .25/.12 dependency cache is read-only with workspace-local remaps. No cache mutation, package install, archive/version changes or shared checkout edits. Candidate stays frozen for independent source/design review; root coordinates any exact architecture record and later coherent union. No push, remote merge or deployment.
