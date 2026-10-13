# Calendar functional successor — CR-05/06/08/09

Source commit `16fb50f9578cca86189b2e303f0918ddebc60413`, tree `2af9545acb53781e8fa48944230a6278f982a940`, branch `repair/capiro-remaining-calendar-20261012`, based on frozen PR14 `7aca86e7d64cfdb85d09d424a07e6186339fc24c`. All 30 changed files belong to Calendar or its new focused tests. No existing test file, shared primitive, session, transport, registry, dependency, native source or prior evidence was changed.

## Result and ownership

- **CR-05 / ENG-calendar_list, ENG-meeting_filters:** client Agenda includes All meetings / Needs prep / Needs debrief plus Prep / Meeting notes / Debrief columns. Native generated, captured and approved states remain distinct. Omitted lifecycle collections are unavailable rather than empty. Pure lifecycle decisions own time/cancellation; a minute clock updates presentation without resetting the selected meeting tab.
- **CR-06 / ENG-meeting_details, ENG-meeting_attendees:** meeting identity, client, visibility, time, location and attendees persist across tabs. Upcoming meetings enter Preparation, active meetings Notes, completed meetings Debriefs; cancelled/invalid-time meetings enter Information. Meeting/actor/tenant/client replacement resets workspace scope, while same-scope refresh preserves unsaved form, note and sharing-selection drafts. Stale server material is concealed during refresh or failure.
- **CR-08 / ENG-meeting_share_artifacts, ENG-meeting_unshare_artifacts:** explicit selected-artifact share/unshare now covers native prep, notes, debriefs and attachments. Current-read preflight revalidates the exact reviewed snapshots and eligibility; every selected receipt must match the native decorated meeting. Synchronous attempt guards and a shared per-meeting fence prevent repeated or competing writes after pending/uncertain results. Existing note/debrief flows retain their receipt and authority guards. Approval, confidentiality, institutional prep restrictions, attachment readiness and native unshare authority remain visible constraints.
- **CR-09 / ENG-meeting_shared_feed:** separate client-scoped Shared meetings consumes the existing native feed. It displays only current authorized returned metadata/preparation content; actor/client replacement, held refresh, failed refresh and foreign records cannot reuse old rows. It does not route through owner-only meeting details or fabricate decrypted note bodies/download URLs. The existing current-user approved library is preserved.

Canonical schemas remain in Calendar: existing metadata moved unchanged to `artifacts/metadata.ts`; `contracts.ts`, `preparation/schema.ts` and `review/contracts.ts` preserve missing versus empty/null. `sharing/contracts.ts` extends the canonical meeting schema and reuses canonical preparation/attachment/artifact metadata. `sharing/targets.ts` owns selection eligibility and stable reviewed snapshots; signed URL rotation is excluded. `sharing/api.ts` owns fixed requests and receipts; `useSharing.ts`/`fence.ts` own attempt lifetime; `MeetingSharing.tsx` owns confirmation input. No new DTO owner or shared API allowance was needed.

## Verification and preserved failures

| Evidence | Exact result |
| --- | --- |
| `lifecycle-unit-before.json` | Six meaningful lifecycle contract controls failed on unchanged PR14. |
| `baseline-results.json` | Four meaningful PR14 browser reds: missing lifecycle column, wrong initial tab, missing artifact selector, missing shared feed. Immutable extracted source/hash manifest in `baseline-extraction.json`; no application substitutions. |
| `calendar-unit-verified.json` | 98/98 passed: 25 new lifecycle/sharing controls plus 73 existing Calendar/artifact receipt controls. |
| `candidate-results.json` | 62/64 passed; all 43 existing cases passed unchanged. Two new test setup/expectation errors retained. |
| `refresh-controls-results.json` | Both corrected new controls passed, retaining cache hiding, retry and zero-write expectations. Thus all 64 distinct affected cases passed across the two runs; this is not represented as one 64/64 final run. |
| `draft-snapshot-green-results.json` | Three additional positive held same-scope refresh controls passed. The snapshot supplied for a proposed before-fix replay already contained the correction. The early-unmount defect is source-confirmed; its failing-before browser is **NOT_RUN**, not an executed red. These three also passed in the 64-case cohort. |
| `final-static-exit.json` | Full app TypeScript exit 0, formatting exit 0, diff check exit 0. Lint has zero errors and two inherited warnings in unchanged PublicEventDetail. |

The two candidate browser errors were test-only: a held 503 mock re-held the automatic read retry, and a 403 expectation used synthetic payload text instead of canonical transport permission copy. Corrected only the new specs, preserved the original raw reports, and replayed those two controls. Final Prettier-only reflow of the test offset helper and fixture declarations is recorded in `format-final-correction.json`; as-executed bytes remain `calendar-lifecycle-as-executed-final.spec.ts`. No production bytes changed after the 62-case success. `ATTEMPTS.md` preserves earlier fixture, clock, import and type-check attempts rather than counting them as functional red evidence.

Focused browser execution used one worker, zero retries and `/usr/bin/chromium`, external `playwright.config.mjs` with `webServer: undefined`, synthetic fixtures only. All owned server processes were stopped; port 5191 closed at 2026-10-12T20:05:01Z (`lease-release.json`). No build, broad browser rerun, live native write, provider/model/AWS effect or deployment was performed. Root owns combined qualification.

## Native source truth and limits

Original read-only inspection is pinned at local checkout `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`, preserved in `source-pins.json` and source excerpts. Compatibility was then explicitly compared with integration review pin `243248e726243c44bd4b9d24fd1ed220da18c56a` in `native-pin-comparison.json`; independent intake review also retained exact current files. These are two distinct source pins, not an ambiguous claim about a current checkout.

Relevant DTOs, controller methods, list/get meeting, share/unshare, artifact state/stamp/clear, visibility recompute, shared feed/filter/merge, meeting include and note/debrief metadata methods are byte-identical across both pins. At 243248e, service share/unshare/load state begin at lines 1844/1913/1955, shared feed at 2359; controller routes at 2114/2123/2408. Full service hashes differ. `listAttachments` at the newer pin adds Prospect parent/ACL branches and excludes Prospect records from non-Prospect lists; the meeting branch retains the same canonical readiness/metadata behavior. Exact per-symbol hashes and raw excerpts are retained.

The existing native routes are POST `engagement/meetings/:id/artifacts/share` and `/unshare` with 1–50 UUID refs of native types prep/note/debrief/attachment, plus GET `engagement/shared-meetings?clientId=...`. Sharing requires an owned tenant-scoped client meeting and approved eligible records; it is all-or-nothing. Unshare applies native per-artifact author/sharer/admin rules. Idempotent shares may retain nullable original sharer attribution. Per-artifact routes are not controlled by the legacy whole-meeting `artifactSharingV2` gate, which remains backend-owned and is not a published browser capability.

Remaining native limits are explicit: shared notes/debriefs expose metadata, not decrypted bodies; attachment feed records do not guarantee usable signed download URLs; meeting inclusion returns only the latest prep; existing approved prep can be shared but this work does not invent an approval API. These are bounded native read/capability limits, not blanket holds on the four functional fixes or all native rows. Live authorization, deployment flags, real service durability and provider interactions remain unverified by synthetic tests.

## Design preservation and rendered review

Original Figma file remains `Zc2dEN5aLU47dVdsewDmiJ`. No Figma writes or alternate design adoption occurred. Preserved CR-05 frame 411:63431 and CR-06 frames 679:142262 / 679:142349 have raw context/screenshot hashes and Git blobs in `design-baseline-audit.json`, committed with assessment `e9ba4c32da8e9a499bf7fb3b1b34dad7acf913ac` at 2026-10-12T14:55:51Z. This is Git preservation time, not a claimed capture time or Figma version.

Four original CR-08 nodes 682:142827 / 683:142902 / 698:142722 / 698:142952 were captured read-only at 2026-10-12T19:32:11Z after the required design-to-code skill; raw context, reference code and usable PNG bytes/hashes are local in `fresh-design-captures.json` for root preservation. No Figma version was returned. No new static asset was required in the owned text/control regions; canonical tokens and existing components remain the source of typography, borders, spacing and controls. CR-09 has no assigned Figma frame, so no authored pixel-parity claim is made.

Final 1440/390 captures were visually inspected: lifecycle columns become labelled mobile cards; meeting context and tabs remain readable; the selected-artifact dialog presents all four native kinds and all actions within the mobile width. Focus/keyboard and horizontal overflow controls passed. `visual-review.json` binds the actual capture hashes. This is bounded functional/responsive verification, not full shell or exact pixel parity. Sharing copy deliberately states the actual client shared-feed destination; the original design's broader Documents/library wording is not asserted as a native capability.

## Independent review and handoff

Intake independently reviewed exact production hashes, native pin compatibility, preserved old assertions, same-scope draft correction and final results. Root separately reviewed the receipt/fence/feed boundaries. `structure-review-proposal.json` lists the six exact scanner signals and responsibility rationales, plus focused test module hashes; root owns registry updates. The scanner reported no dependency-boundary or cycle errors. No signal was self-waived.

The separately delegated Mail CR-10 source review is finished at commit `685e55039d5d3945c76085513cde8bc6c33cb55d`; report `independent-mail-review.md` records the discovered/fixed native Tiptap history bypass, owner red/green evidence and exact review hashes. No Mail source was modified by this lane.

`manifest.json` pins changed source/tests, raw report hashes, design/visual evidence and ownership release. Root may cherry-pick the single Calendar commit and preserve this evidence before the combined final gates.
