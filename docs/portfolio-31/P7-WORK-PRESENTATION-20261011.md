# P7 Work presentation — 2026-10-11

## Outline before implementation

This follow-on starts from the exact Work feature and dedicated-test bytes
integrated by root at `7653b934bdb3d4cddd5ac149c6df0abca687b91c`. The isolated
branch still starts at `0beb51c`; the frozen current-read patch supplies the
intermediate checkpoint. Its report, manifest and source copies remain
immutable. The new preimage manifest verifies all five feature files and both
Work browser specs against `7653b934`.

Scope remains WORK-01–04/08. The requested presentation fixes do not complete
those audit rows or establish native signed-in acceptance.

### Responsibilities and boundaries

- `WorkspaceDocuments` remains the sole owner of the three successful-read and
  exact current-client/legacy-name association gate. Its verified rows feed a
  pure `WorkspaceDocumentTable` presentation module. One semantic table and one
  native destination link per row become the stacked Figma cards through scoped
  phone CSS, without parallel hidden record trees or a second fetch path.
- The document header may count the two existing native statuses only after
  all association reads succeed. Native product, title and timestamp are shown;
  owner display names and missing client IDs are not invented. The legacy-name
  limitation stays visible. Desktop table headings and canonical links remain.
- `WorkStrategyState` owns the unavailable summary and error-card presentation.
  WorkPage supplies current query status and its existing refetch actions.
  Failed summary reads show the compact unavailable band and no metric values;
  failed individual details keep unknown aggregate counts and healthy details.
  A healthy independent Workspace feed stays available. Permission, expired
  session, archived/not-found and malformed response meanings are preserved.
- Native contracts, query keys, transport, status meanings, five-node limit,
  date projection and routes remain in their existing owners. No writes,
  backend changes, new packages or shared registry changes are needed.

### Existing design and code reused

Loaded executor `e7/skills/figma-design-to-code` and fetched fresh high-fidelity
context with screenshots for [Work phone 411:86349](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-86349),
its [document section 762:146796](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=762-146796),
the [desktop section 762:146592](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=762-146592),
and Work error [band 411:52475](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-52475)
and [card 411:52479](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-52479).
The canonical `@capiro/ui/button` is the adopted shadcn primitive documented by
Figma's v2/Button. It is composed with the existing Portfolio styling and
scoped CSS. The existing `411-52106-imgIconFileText.svg` is valid, nonempty and
16 by 16 pixels, matching the desktop icon slot; phone document cards and error
components contain no static icons. Tokens, fonts and all upstream component
source remain unchanged.

The native references already pinned and verified in the previous checkpoint
remain authoritative: capirov2 `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`, Strategy
and Workspace controllers/services. No new payload fields or associations are
introduced by this presentation work.

### Verification and intentional presentation changes

Add focused browser cases for 390px stacked cards, long native titles, visible
keyboard-operable Workspace links, absent destinations, desktop table semantics,
compact full-list errors, partial-feed recovery and independent healthy feeds.
Capture and inspect the requested component at desktop and phone widths,
including dark mode. Preserve the full read/association cohort and both original
Work document cases.

The dedicated failed-summary assertions intentionally change from five visible
em-dash metrics to an explicit unavailable message and absence of numeric
metrics, as specified by the error frame. Existing partial-detail unknown-count,
record identity, retained-cache refusal, empty-claim, link, recovery and native
projection assertions remain. Original document integration assertions are not
removed. Run focused unit, type, lint, formatting and exact size/cohesion checks;
root owns combined regression and integration.

## Result and evidence

The exact integrated feature preimage reproduced all eight new presentation
failures. The first fixed cohort passed 25 of 26 cases and exposed an initially
failed detail's error card disappearing during Retry: TanStack clears the error
when restarting an initial read with no data. The bounded follow-up derives that
pending retry from the same current observer's `isPending`, `isFetching`, and
`errorUpdatedAt`, keeps the unavailable layout and disabled control visible, and
shows truthful retry progress until the read settles. It adds no component
lifetime or cache state. The held-response assertion is preserved and also
applied to the full-summary Retry case.

### Completed source and retained behavior

The bounded presentation work is implemented and locally verified. Six Work
source files form the follow-on delta: `WorkPage.tsx`, `WorkspaceDocuments.tsx`,
`WorkspaceDocumentTable.tsx`, `WorkStrategyState.tsx`, and the two dedicated
presentation CSS modules. The native contracts, query keys, transport, original
`work.module.css`, and original `work-documents.spec.ts` are byte-identical to
the integrated checkpoint. Three dedicated browser files change: the new
presentation spec, the current-read spec's intentional unavailable-summary
assertions, and the harness's missing-destination scenario.

| Audit ID | Bounded effect in this follow-on                                                                                                                                                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WORK-01  | Full Strategy-list failure uses the compact unavailable band and Retry card; a failed detail keeps the healthy Strategy visible. Current exact request/response associations remain required.                                                                                           |
| WORK-02  | Full-list failure shows no numeric metric claim; partial-detail aggregate counts remain unknown. Initial-error retries keep the unavailable feedback until a current read settles.                                                                                                      |
| WORK-03  | Healthy upcoming work remains available during an independent detail failure; a failed full list does not leave an empty Upcoming work shell that could imply a successful read.                                                                                                        |
| WORK-04  | Healthy risks retain the current native projection and links; no empty risk claim is added when the full list fails.                                                                                                                                                                    |
| WORK-08  | One semantic document table becomes stacked phone cards with visible canonical Workspace links, current native status counts, exact existing desktop icons, and explicit missing timestamp/destination states. The exact current-client/catalog gate and legacy-name limitation remain. |

The Workspace display uses native product, title, timestamp and `draft`/`complete`
status. It does not synthesize the owner's display name shown in Figma, classify
agent work, or invent a client UUID association. Canonical navigation remains a
normal link; all synthetic test requests were reads.

### Actual checks

| Check                                         | Result                                                                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact integrated preimage                     | Five feature files verified against Git `7653b934`; all eight saved preimage records retain their SHA-256 values.                                                     |
| New UI baseline, exact saved feature preimage | 8 cases failed, 0 passed, 36.65 seconds. Failures reproduce offscreen phone destinations, missing desktop icon and error presentation, and invalid timestamp display. |
| First fixed browser cohort                    | 25 passed, 1 failed, 43.8 seconds. The retained failure exposed the initial-error Retry state described above.                                                        |
| Final browser cohort                          | **26 passed, 0 failed, 0 skipped, 0 flaky**, 39.23 seconds: 8 presentation cases, 16 current-read/association cases, and both original Work document cases.           |
| Focused unit cohort                           | **11 passed**, 0 failed; 4 unrelated domain cases explicitly excluded by the name filter. Native association and projection modules did not change afterward.         |
| Typecheck                                     | Passed after the Retry fix.                                                                                                                                           |
| Focused ESLint                                | Passed for changed source and dedicated tests; the Retry source/spec changes were checked again.                                                                      |
| Formatting and diff whitespace                | Passed for the final bounded delta.                                                                                                                                   |
| Source size and boundary scan                 | Six TypeScript modules scanned; no untyped `any` or hard-coded remote origin. One size signal, reviewed below.                                                        |

Implementation and static checks preceded the browser baseline while the shared
port was occupied. For the baseline run, the exact integrated feature preimage
was restored and all four new feature files were removed; new regression tests
and their harness stayed in place. Every saved candidate hash was verified on
restoration. The initial fixed run and the later Retry correction have separate
source snapshots and reports. Both summary and detail Retry responses are held
until their pending-state assertions complete, then released in `finally`.
No original behavior assertion was deleted to pass the cohort. The only
existing presentation replacement is the explicit unavailable summary described
above. The final 16 candidate file hashes stayed exact throughout the final
run, and port 5191 was verified free after the runner stopped.

### Rendered review

Opened the final 390px phone document capture, the 320px dark long-text capture,
the desktop document table, the compact unavailable band, the Retry card, and
the full phone permission-error view. Compared these to the retrieved Figma
screenshots and high-fidelity contexts listed above. The phone row order,
16px padding, status placement, 36px action target, wrapping, and visible links
hold. The focus outline in the phone capture is intentional evidence of the
preserved keyboard path. Desktop retains column headers and the exact 16px SVG.
The error components retain the specified hierarchy, scoped spacing, card
border and Retry control. HTTP refusal copy remains truthful; the healthy
independent Workspace feed remains visible.

The desktop component captures use a 1088px viewport and measure 1040px wide;
the Figma component export is 1024px wide. This is a component and interaction
comparison, not a claim of whole-page pixel equality. Dynamic fixture values,
current native dates and the visible legacy-association explanation differ
deliberately from Figma's illustrative data. Existing header, successful
Strategy cards and whole-page layout were not redesigned in this slice.

### Cohesion and integration receipt

`WorkPage` is the sole current size signal: 211 nonblank file lines and a
192-line function body. Its exact fingerprint and substantive retention
rationale are in
[`P7-WORK-PRESENTATION-20261011-SIZE-REVIEW.json`](./P7-WORK-PRESENTATION-20261011-SIZE-REVIEW.json).
The responsive document presentation and unavailable/error presentation now
have distinct owners; the source query and projection owners retain all native
rules. `WorkspaceDocuments` no longer has an over-80-line function body. No
source or CSS module exceeds 400 nonblank lines, and no other function exceeds 80. Root owns the independent review and central registry update.

The frozen UI-only source/evidence manifest is
[`outputs/evidence/portfolio-work-presentation-20261011/manifest.json`](../../outputs/evidence/portfolio-work-presentation-20261011/manifest.json).
It includes before/after hashes, exact source snapshots, raw baseline/first-fixed/
final browser results, traces for failures, unit results, Figma contexts and
validated PNGs, final rendered captures, source-switch chronology and the size
scan. The earlier
[`P7-WORK-CURRENT-READS-20261011.md`](./P7-WORK-CURRENT-READS-20261011.md)
and its immutable checkpoint remain unchanged.

### Remaining native gates

These five audit rows remain open. No source or Figma work is counted as
signed-in acceptance. Native Workspace returns the legacy client display name,
not a stable client UUID: rename-safe completeness and ambiguous associations
cannot be claimed. Its owner ID does not supply the display name in the design.
Signed-in tenant/source authorization, configured existing application
destinations and actual Strategies/Workspace editor navigation still require
the matching native environment. Root owns combined integration, production
build and any separately authorized release; this slice performed no live
service writes, resource creation, deployment or commit.
