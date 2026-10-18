# Meri UI follow-up — 16 October 2026

Source input: `meri/live-wiring-20261016` at
`2acbd89cf70a2d8bc70fa5be7059abb8d79ca6b2`, tree
`c1d85ee1420413904de2ab8a27b771d07f5ddc14`. Its reported UI base is
`c7e060007f5cd5a9b786442d0cc168a73c5565a8`. Backend handoff input:
`eca78d458acb46cbfd54a94cf870841d999ef6b1`.

GitHub comparison independently confirmed the full UI base as the merge base,
with two commits from it to the input. Source extraction commit:
`92ae83cdbf165f36a77280d061b23b329f1b90ca`, tree
`63e58d4017c749e550e1ab3640df5888ceb50a7e`, direct parent `2acbd89c`.

## Ownership and implementation outline

This isolated `dot/meri-ui-followup-20261016` candidate owns only
`apps/web/src/features/meri/conversation/useLiveRun.ts`, the new sibling
`useRunCommands.ts`, this follow-up/report correction and the dedicated
`UI-QUALIFICATION-REQUEST-20261016.md`. No shared registry,
HTTP, error, session, Settings source, package, lock, contract, provenance or
historical manifest changes are allocated. The frontend owner confirmed no
overlap; its sealed `9da3616a` and independent Objective/Plan candidate remain
separate.

`useRunCommands` will own the session-bound intent journal, command serialization,
transcript command state and the existing history/submit/cancel operations. It
will reuse `useCommandGate`, `sendRequest`, `requestStop` and the canonical query
journal. `useLiveRun` will compose those commands with the existing observation
hook, snapshot subscription and mount/unmount lifetime. Dependencies continue
from feature interaction to shared public adapters; backend authorization,
request identity, uncertainty and receiver contracts remain unchanged. This is a
responsibility extraction with no intentional runtime or presentation change.

Verification: reproduce the architecture finding on the input; compare the
unchanged scanner after extraction and with the original hook restored; inspect
the full diff; run focused Meri/Settings browser cases, relevant existing unit
checks, lint/format and the default production build/full typing when Shipping
grants a bounded slot. Retain every failed result. An isolated source candidate
does not establish integration, live backend, accessibility or deployment
acceptance.

## Source-analysis evidence

Shipping explicitly admitted one read-only source-analysis process: Node
`24.19.0`, TypeScript parser `5.9.3`, `--max-old-space-size=256`, hard outer
60-second deadline, no subprocesses, emit, semantic typechecking, npm, browser or
database. It finished in 2.604 seconds and its process exited.

The existing full-source architecture scanner and its current review data were
used unchanged. The original Git hook was substituted into the scanner's input
map and the extracted module removed for both negative passes; no working-tree
revert or review-data edit was necessary.

| Input | Files | Boundary/review errors | Blocking findings | Outcome |
| --- | ---: | ---: | ---: | --- |
| Original source | 1773 | 0 | 1 (`useLiveRun`, 84 nonblank lines) | Expected FAIL |
| Extracted source | 1774 | 0 | 0 | PASS |
| Original restored in memory | 1773 | 0 | 1 (identical fingerprint) | Expected FAIL |

The 19 inherited unreviewed findings remain visible. The fixed source has 501
size signals: 482 reviewed and 19 inherited unreviewed. This is source analysis,
not a build, semantic typecheck or runtime test. `git diff --check` also passed.

External evidence is in sibling `evidence/architecture-{baseline,fixed,original-restored-negative}.json`
and `evidence/architecture-summary.json` (SHA-256
`c4e56cc3b84100f3e547dd3c9f51d07cf6d848fea39d33f29281f94d36a4a470`).
The reproducible driver is `evidence/architecture-before-after.mjs`; it imports
the repository's unchanged scanner and retains complete outcomes. Only the
installed parser's matching package metadata and `typescript.js` were copied to
the task-local ignored dependency directory; no npm install or package edit has
occurred. Parser SHA-256:
`3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675`.

## Independent source review

Existing frontend owner `01a13c71-7ff1-7660-a7c8-de25cc94401c` returned
**ACCEPT_SOURCE_ONLY**, no blockers, for the exact two source files at
`92ae83cdbf165f36a77280d061b23b329f1b90ca` / tree
`63e58d4017c749e550e1ab3640df5888ceb50a7e`, direct parent `2acbd89c`.
The review compared command initialization, gate and operation implementations
with their parent after whitespace normalization and found them preserved. It
also checked mount cleanup, observation fencing, returned behavior and the
`TranscriptState` re-export. The functions contain 40 and 68 nonblank lines.
The reviewer independently matched both source SHA-256 values below. No new
session or heavy process was launched for that read-only review. Its scope does
not include documentation review, tests, compiler/browser/runtime qualification
or architecture-review data approval.

## Changed source identities

Hashes below cover Git source bytes. No historical manifest or proof row was
repinned; no backend source-proof input changed. The new file has no old row.

| Path | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| `apps/web/src/features/meri/conversation/useLiveRun.ts` | `317b769fc0f5ef121c38549e2638d5a86c043be7550ddb4775b2a8cba2d45f73` (3591 bytes) | `440673920abc76bee0329ab0d1279dc61403a23e942d5c4a07a240e179ff1e6b` (1865 bytes) |
| `apps/web/src/features/meri/conversation/useRunCommands.ts` | absent | `c514cf3bfb7db4fe28ba8ee5119e09d83e490557829bf8030cb8967808ff3481` (2567 bytes) |

## Contract requests

No frontend migration is needed or allocated. L3's suggested list/transcript/
next-turn route names are local proposals, not reviewed contracts, and have not
been wired. Adoption requires the exact pushed schemas, public exports,
authorization/error semantics and parent acceptance. Existing frozen run-local
history/events remain intact.

The existing `shared/meri-documents/link-wire.ts` duplication remains an explicit
backend public-export request: closed issue body `{versionId}`, redeem body
`{token}`, issued-link response `{versionId, token, expiresAtMs}` and closed
refusal response. Its exact UUID/token/error validation and binary download
receiving must be preserved when replacing it with an approved package export.
No package, wire or frozen-contract edit is made in this follow-up.

## Open gates

- Shipping has held compiler, browser, database and npm launches due to host
  memory pressure; no heavy suite has run in this lane.
- L3 owner reports no reviewed list/history routes yet. Recent/search and
  earlier-turn history after reload remain unavailable pending exact routes,
  public exports and parent acceptance. No routes or DTOs are invented here.
- Existing accessibility incomplete items, untested states and historical
  evidence remain open. This refactor does not close them.
- Parent messaging currently returns `thread not found`; peer coordination
  works. Final source/evidence will also be reported to the Meri qualification
  coordinator.
