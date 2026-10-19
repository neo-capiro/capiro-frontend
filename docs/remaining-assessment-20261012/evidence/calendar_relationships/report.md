# Calendar, Relationships and Quick log acceptance assessment

Frozen application source: `4a1614886fd98bb42d529f1ef59b3d01d7ff9173` / tree `46cebca97ccfc1facc1c1a939beb6f4d7730685b`. Assessment checkout: `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d`; its application source/tests have no diff from the frozen application source. Application and shared files were not edited.

**100 assigned rows assessed individually: 95 in scope, 5 retained exclusions.** The row ledger records 67 supported bounded frontend facets, 15 rows with concrete frontend defects, 7 partially implemented rows, 3 unavailable contract facets, and 3 requirement reconciliations. These labels are not native acceptance; native calls were not run.

## Strongest concrete findings

| ID | Severity | Finding | Acceptance/deployment effect |
|---|---|---|---|
| CR-01 | P1 | Meeting artifact writes accept arbitrary success bodies and discard the editor | Blocks acceptance of these mutation paths as receipt-verified. Frontend repair can validate the existing metadata and preserve uncertain draft. Does not establish a backend authorization bypass or require a blanket static-preview deployment hold. |
| CR-02 | P1 | Meeting note/debrief creation can replay after an uncertain result and dispatch twice | Blocks claiming reliable note/debrief creation under retries; potentially duplicates saved records after response loss. No live record was created. Backend idempotency would be additional protection; frontend can immediately refuse blind replay. |
| CR-03 | P2 | Clearing a meeting location never clears the saved value | Blocks the clear-location part of edit acceptance; localized frontend fix. No deployment-wide dependency. |
| CR-04 | P1 | Meeting save accepts a receipt for a different meeting/client | Blocks receipt-context acceptance of meeting saves. New browser proof is edit; create uses the same hook and needs expected submitted-client checks. No server ACL bypass was shown. |
| CR-05 | P2 | Client Agenda omits lifecycle triage filters and state columns | Prevents the designed meeting triage workflow and full visual acceptance. It is a frontend parity gap; native auth/provider availability cannot resolve it. |
| CR-06 | P2 | Meeting workspace loses identity context across tabs and always enters Information | Meeting details exist but full designed workspace parity is not accepted. Local presentation/routing work; no backend contract blocker. |
| CR-07 | P2 | Saved email signature is fetched but never displayed | Cannot accept Display saved user email signature; reviewer cannot inspect appended identity content. Sending transport may still work. Frontend display repair; no new backend needed. |
| CR-08 | P2 | Prep and attachment share/unshare are missing | Two rows are partially implemented, not wholly unavailable: note/debrief operations exist, prep/attachment facets do not. These missing controls block full artifact sharing acceptance; feature flag/provider-native acceptance remains separate. |
| CR-09 | P2 | Client-shared meeting materials feed has no Portfolio consumer | Blocks this read criterion specifically. Existing service contract is available; remaining work is frontend composition plus native authorization evidence. |
| CR-10 | P3 | Email composer omits the designed rich-text formatting controls | Visual/editor capability gap, not proof that plain-text email delivery fails. Do not use it as a blanket deployment hold. Child render is clipped; exact pixel parity unassessed. |
| CR-11 | P3 | Meri rewrite has no Undo control or prior-body snapshot | Rewrite request/response behavior is implemented; the designed undo facet is absent. Local parity work and not a provider deployment dependency. |

## Reproductions and evidence

Six distinct new Playwright controls ultimately passed their observation assertions on the root-managed fixture server, one worker/Chromium. Four initial controls proved the calendar, malformed note receipt, repeated note POST, and hidden signature behavior. A follow-up capture corrected a test selector and passed; another proved location omission and foreign meeting receipt acceptance. The initial selector timeout is preserved, not represented as an application failure.

See `review.spec.ts`, `new-control-results.json`, `browser-results-initial.json`, `browser-results.json`, and the corresponding screenshots. The tests intercept synthetic requests only. No real email, calendar import, notetaker, object-storage upload or paid model call occurred.

Existing exact-source `portfolio-browser-results.json` (934 expected, 0 unexpected, 0 skipped) was inspected for bounded prior evidence; the suite was not rerun. Row entries list exact case titles so existing passes cannot silently close unrelated phrases.

Actual Figma file `Zc2dEN5aLU47dVdsewDmiJ`: 19 distinct assigned target nodes inspected out of 108 unique assigned targets, plus two sparse-parent child nodes. All raw context and returned screenshots are saved. 89 unique assigned target frames remain unassessed in this pass. They are listed per row. No seven-repair node was repeated.

Figma435:82147 and435:82656 were sparse; their composer children435:82293 and435:82802 were fetched for full context. Figma exported those off-canvas/clipped composer children as1x1 PNGs, even with isolated screenshot. Their code provides content/control evidence; it cannot establish pixel parity.

## Scope and owner dependencies

- `CORE-095`, `CORE-100`, `CORE-101`: structured log/objective association, automatic Meri linking and combined member/staff/client note remain genuinely unavailable canonical contract facets.
- `CORE-096` and `ENG-tasks_create`: durable generic activity plus Planner follow-up now exists and supersedes the historical blanket hold. Commitment counterparty/direction and strategy lineage remain unimplemented. Modules reviewer confirmed canonical Planner list, versioned edit and completion; task list/update rows are supported bounded frontend reuse. Quick log displays the resulting task ID, not a clickable deep link.
- `ENG-debrief_source_notes`: reviewed saved note text is usable, but exact Meri note/session provenance still lacks a backend identity field. No origin is inferred from author or ordering.
- Calendar-only Microsoft/Google sync is implemented and explicitly excludes mail. Their row wording includes mail; this requires scope reconciliation. `ENG-calendar_navigation` says Day/List/Month, but current captured Figma shows Month/Week/Agenda. Missing Day is not reported as a proven visual defect.
- Full signed-in authorization, native records/receipt semantics, persistence, real provider delivery/import/bot/transcription, production destination authentication, attachment atomic approval/readiness and exact Meri provenance remain separate native gates. Fixture success cannot accept them.
- Legacy whole-meeting share/unshare and engagement waves/DC windows/visit planning remain the five exclusions. No reactivation was proposed.

## Deliverables

- `findings.json`:11 independently described source/feature/parity findings with exact row/frame mapping and file:line locations.
- `row-assessment.json`:100 unique IDs with specific reasons, source evidence, bounded previous test cases, native interfaces and unassessed frame lists.
- Raw `figma-*.json`, returned `figma-*.png`,10 rendered application screenshots, and three pinned backend contract excerpts.
- `new-control-results.json` plus reproducible isolated Playwright test/config and retained first-run selector failure.

No fixes, commits, pushes, servers or builds were created by this reviewer. Root owns integration and any successor implementation.
