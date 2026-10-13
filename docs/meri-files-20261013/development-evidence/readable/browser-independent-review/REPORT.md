# Meri Files independent browser-evidence review

**Accepted as bounded synthetic-browser evidence; all three proposed responsibility records are accepted.** No additional source correctness defect or test waiver was found. The earlier host-refresh finding now has meaningful browser confirmation. Full frozen-source qualification and native activation remain separate.

This read-only review inspected `/workspace/capiro-meri-files-browser-evidence-20261013` and current isolated source `/workspace/capiro-meri-files-20261013`. The reviewer did not rerun a browser, execute tests/builds, edit application/test source, modify a registry or change any prior sealed packet. The independent packet contains source bindings, raw-result summaries, correction diff, accessibility/visual observations and exact registration records.

## Evidence integrity and results

The owner index SHA256 is exactly `8ad29898e311e324ecc9d262094f84d9d9fe593717a56cdc52264b40f668b4b4`. All **148 indexed files** exist and match their recorded bytes/hash. The corrected Playwright JSON independently reports **27 cases / 27 attempts, all passed**, zero skipped/unexpected/flaky results, no retries and no global errors. It started at `2026-10-13T09:02:17.217Z`, ran 51.098 seconds with one worker and has an exit0 receipt. This is the canonical component harness, not a production Next server.

All 28 final source records match the current isolated source. Only the four browser fixture/spec files differ from the initial snapshot; the other 24 captured files, including every captured production file, remain identical. This binds the uncommitted candidate above `83f54f5ac0107822833adbbfef2b453e0240bc56`; it does not establish that a later frozen tree passed the same checks.

The initial launcher failed before collecting tests because import.meta was parsed outside ESM; the external configuration metadata fix did not change application code. The first collected cohort genuinely reports 17 passed and 10 failed, with all27 attempts retained. Its error messages and exact test diff support seven textarea-label locator failures, one desktop link-only assumption, and two reconnect-helper assumptions that required editable input despite an intentionally unresolved write. The corrected cases use the same exact accessible textbox names, the existing desktop button/mobile link, and an explicit visible-and-disabled check for a fenced reconnect. No timeout increase, retry, forced click, skipped scenario or changed effect expectation was introduced.

One wording clarification should accompany publication: the owner's phrase “No assertion ... removed” is semantic rather than literal. The `href` assertion is now phone-only because the desktop control is a button; desktop behavior is checked through keyboard activation and the resulting exact client-scoped URL. The original unconditional editable-helper assertion is replaced with the correct disabled assertion only in explicitly fenced reconnect cases. These are justified semantic adaptations, not unchanged assertion bytes. Existing body/base/effect-count, resource, uncertainty and native-limit checks remain intact.

## Meaningful coverage and host correction

The browser drives the actual host, public receiver, adapter/journal, local controller and Blob URL lifecycle. HTTP, Clerk identity/session/client responses and document data remain synthetic. The fixture uses the real public request receiver and shared public response builders; it does not recreate the production uncertainty algorithm. Its URL hooks call the real browser allocation/revocation functions and record observations. Held requests wait for the exact request to finish or explicitly abort, with no sleeps or automatic delivery retry.

The four Word/Excel desktop/phone lifecycle cases require explicit connect and operations, inspect a returned immutable version, verify and click a real Blob download, and revise only after complete-replacement acknowledgement. They check exact parent/operation/format/title, version selection and resource disposal. Independent file reads confirm all four saved downloads contain the same declared18 synthetic bytes and SHA256. These bytes are **not native DOCX/XLSX files**, and neither inspection receipts nor downloaded extensions establish Office generation or semantic content preservation. Detailed input capture/mapping is additionally covered by the separately reviewed pure tests.

Six held-create cases cover user/session/organization replacement with200/401 replies; selected-client replacement, current401/403 refusal, expiry and sign-out also dispose private observation/resources. Pending/unknown writes survive cross-mode history and explicit reconnect; successful version inspection does not clear the fence. Duplicate intent produces no second write. Corrupt download bytes produce no object URL. The fixture audits unexpected API requests, foreign-host requests, page errors and non-session recommendation calls.

**MF-REVIEW-01 is confirmed corrected in this harness.** One control holds same-client verification and requires the same typed private body and known version after successful authorization, with no new document/session call. A second holds a create across a successful client refetch, requires the original request to finish rather than abort, receives its version and leaves no unresolved fence. A denied same-client read removes private state. These establish the intended retain-while-verifying/revoke-on-denial distinction. The previous static finding is not retrospectively relabeled as a runtime failing-before case.

## Visual and accessibility scope

I viewed four actual captures: phone Word native-pending, desktop Excel native-pending, phone Excel revision and phone unavailable. Content is painted; the phone cards stack, metadata wraps, controls do not overlap, and complete-replacement, draft/pending, Office-unverified and recalculation guidance remain visible. Selected-option text truncates within its native select while full version metadata remains separately visible; no whole-page overflow is observed or reported by the tests. These observations do not establish Figma pixel parity or dark-theme parity.

All six raw axe4.14.0 results have zero violations. The shared helper calls unfiltered `axe.run(document)` and attaches the whole result. Three desktop reports retain one incomplete color-contrast node each on the existing gradient New conversation control; phone reports have none. Those incomplete results are **not** a manual contrast pass. The four saved focus observations show actual Tab-reached focus-visible, a solid2px nontransparent outline and an in-viewport control. Keyboard activation uses Enter and exercises client-scoped history. This is not screen-reader, all-zoom, all-state or WCAG certification.

## Exact responsibility decisions

Canonical AST parsing independently reproduces all three proposed signals and full-file hashes. No test module exceeds400 nonblank lines. `REGISTRY-RECORDS.json` contains copyable exact fingerprint records; `SOURCE-REVIEW-RECORDS.json` contains corresponding full-file records targeting `docs/meri-files-20261013/BROWSER-INDEPENDENT-REVIEW.md`. Root should copy this report there or adjust the evidence path before registration.

| File / function | Lines | Decision |
| --- | ---: | --- |
| `meri-files-fixtures.ts` / `filesFixture` | 96 | Accept: one public-request/finite-response fixture owns interception, effect audit, held completion and URL observation. It reuses existing authority-lifetime fixtures and does not implement native authority. |
| `meri-files-workflow.spec.ts` / lifecycle callback | 108 | Accept: one causal connect/create/inspect/download/revise scenario retains effects, immutable parent, bytes and resource assertions beside their explicit user actions. Existing helpers handle setup/input. |
| `meri-files-navigation.spec.ts` / uncertain-delivery callback | 85 | Accept: one original pending/unknown attempt is followed across navigation/reconnect/read, with its held request and exact call counts in the same owner. |

The exact fingerprints are respectively `c553ce58544088d3207f3a12ec11c127349f0b17c191f8ec55c48e6fcf7b5395`, `225ff7109c6fd3eb2e52d698230396f0a94c65aa2e74334cf1a1da3f6432cf95`, and `f9299e646d79d349074f36ba77490d3db60e95b1569e0c7be981de47b5545d45`. Splitting these solely to reduce counts would scatter their shared causal evidence. This is exact responsibility review, not a blanket test exception.

## Remaining limits

The browser suite covers two widths in the light theme and six completed/disabled axe states. It does not newly qualify dark mode,320px, zoom/screen readers, every pending/error accessibility state, or the TXT option through browser interaction. Pure tests supply some additional format/transport/lifetime coverage, but do not replace native checks. In-memory view-navigation fencing is not durable recovery across a browser/process restart.

Actual-server disabled-route checks and the final clean build/comprehensive qualification were outside this review and still require their own receipts. Native Clerk/RLS/current-run authority, artifact capability/storage/worker effects, Word opening/rendering, Excel recalculation, native activation and deployment are unqualified. The original337 held Portfolio criteria remain held. No further source repair is requested from this packet; the disclosure wording above and existing qualification limits should remain visible when publishing it.
