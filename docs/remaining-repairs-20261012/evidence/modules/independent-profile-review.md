# Independent read-only CP04–06 source review

Reviewed candidate `5291c717e77c8b3ffdc995a4e20080c4964483fd` against frozen base `7aca86e7d64cfdb85d09d424a07e6186339fc24c`, in `/workspace/capiro-remaining-profile`. Reviewer: modules_settings_review. No browser/server/build, source edits or native calls performed. Owner qualification remains pending. This report preserves findings on this exact pin; acceptance must not transfer automatically to a correction.

## CP04 confirmed P2: reviewed facility is never adopted by the manager

`FacilitiesManager.tsx` stores the selected Facility object in `editing` (lines41–45). Its `FacilityEditor` restart callback only increments `revision` (line121). `FacilityEditor` snapshots its incoming facility with `useState(facility)`; the unchanged `useFacilityWriter` correctly compares that snapshot with the current list and disables saving when they differ.

Reproduction by source path: open the new manager, edit a saved facility, let current saved fields change (including an uncertain write which applied), choose Review current facilities and then Use the reviewed facility. The writer verifies the fresh actor/source correctly, but the manager remount passes the original selected object again. The editor recaptures stale fields, `changed` remains true and Save remains disabled. The standalone detail editor receives current facility props; this new manager does not. This is a recovery-blocking UI regression, not a bypass or proof of a provider effect.

Owner independently confirmed and is preserving5291c71 for a browser red control before correcting the restart to adopt the actual current record. A missing reviewed target must not become an implicit create.

## CP05 source-traced recovery concern requiring focused proof

`ActivityTimeline.tsx` replaces inline content with Dialog content on expand and reverses it on collapse. `ActivityFeed.tsx` also places keyed ActivityRow/ActivityActions under sections keyed by day+index. Both can remount `useChangeActivity` even when the actor/client/activity ID is unchanged. That canonical hook currently owns uncertain/reviewed/pending state locally. An uncertain503 action can therefore lose its explicit Review requirement on a visual expand/collapse; a native pinned reorder can also change the row's group parent. The former flat rows retained same-ID component identity across order changes.

Requested owner regression: uncertain action → expand/return retains fencing; pending action → view switch cannot restore a write affordance; pinned regrouping preserves the same canonical mutation lifetime. This is a source-traced risk pending browser reproduction, not a claim that a native duplicate or privacy effect occurred.

## Preserved behavior and limits checked

- FacilityEditor extraction preserves the same body validator, useFacilityWriter, current actor/source checks, synchronous dispatch guard, abort disposal, receipt admission and cache-backed unknown attempts. New manager keys client+profile actor and removes on close; it does not clear canonical uncertainty. Card geocoding actions use existing current-source controls; compact rendering hides matched resolution actions only. Field names, employee/district inputs and original state value remain; selection adds an honest unknown-existing state option.
- ActivityFeed retains title, raw native kind, body, occurredAt time/date, due/settled metadata, meeting/file links, validated derived mail-thread projection and recorded-only ActivityActions. Existing date/search/kind filters stay canonical. Date grouping retains native pinned order and uses local civil dates rather than UTC midnight; the500-item history limit remains visible. Current activity read failure removes rows; native authority is not inferred from new icons.
- Files CP01–03 helpers, readers/actors, fixed operations, canonical current reads, access receipts, unknown DELETE reconciliation and dispatch signals are unchanged. File actions remain bound to current `readerScope` and current file records. New filters are explicitly bound to readerScope; source chips use actual returned provenance values. Folder cards represent labels on returned attachments and counts from filtered rows. Named-folder Upload here is disabled with truthful upload-then-move guidance; no empty-folder, folder ACL, recursive move, batch atomicity or provider claim is invented.
- Compared both old browser test diffs directly: dialog name Add facility → Facilities: Synthetic profile client and submit Add facility → Save facility are the only assertion locator retargets. Unknown text, write counts, draft fields, disabled checks, held results, actor replacement and no-unexpected-request assertions remain. `profile-existing-test-diff.txt` preserves the comparison. Owner's ASSERTION-MAPPING agrees.

## Structure assessment

FilesPage320-line function still composes a single collection/action lifetime; source controls and folder cards now have cohesive presentation owners. Existing upload/access/move/delete/preview owners are reused; no transport or provider logic was added. Its exact fingerprint at this pin is `71b102bced5c6eb98f9187aa4979c27119ab3a26a1078ba7e98a910aa7f382ce`, source SHA256 `18d6f94455f08109e3883c569bc4203a198c5004aaa42bd42add8143adfc95bd`.

The manager, timeline and row-feed separation is cohesive in responsibility, but component lifetime must preserve canonical mutation state before accepting it. FacilityFields remains a declarative field catalog; FacilityGeocoding retains its existing single resolution flow. Root owns exact size-registry acceptance after corrections and qualification.


## Follow-up source observations before owner correction

Line-reference correction for the pinned5291c71 source: FacilitiesManager stores editing at39, derives selected at43 and supplies the revision-only onRestart at116. The behavior finding above is unchanged.

The owner independently confirmed both the facility recovery defect and timeline remount risk. The proposed correction retains the default action-bearing timeline, flattens date headings and keyed rows into one list, and renders expanded content as a read-only projection. Expanded TimelineMailThread was also identified as a second instance of a stateful reply-draft owner (sending is blocked in this pinned component); the owner will omit those controls from the expanded projection. Expanded Log activity also needs to reuse the existing ClientOverview QuickLog owner so a local uncertain creation fence cannot be replaced by a fresh instance. No provider duplicate or privacy effect is claimed.

Read the proposed regression tests without running them: facility remote update and uncertain applied edit both require explicit review before adopting current fields; timeline tests cover unknown pin across expand/return and native pinned regrouping, a held pending action across expand/return, and reuse of an uncertain QuickLog draft while retaining unrelated URL context. These are meaningful targeted assertions; runtime red/green and exact correction source remain pending.


## Owner-run reproduction evidence reviewed

Read `/tmp/capiro-remaining-profile-evidence/manager-review-red.log` and `timeline-review-red.log` after their completion on unchanged5291c71. All six probes fail at their intended behavior assertions: both manager cases retain Saved facility notes instead of Authoritative current note after explicit review; timeline expansion loses Review latest activity, native regrouping reenables Unpin note, a held action becomes enabled after expand/return, and expanded Log activity produces a fresh enabled save despite the original uncertain draft. This upgrades the initial timeline source concern to reproduced frontend recovery/fencing defects. I inspected the logs and assertions independently; these browser runs were executed by the owner, not by this reviewer. No actual duplicate write, native provider effect or privacy incident is claimed. Corrections and green evidence are still required.


## Exact correction review: a5202a066d0a0bd29fd5158b1d8380d4a5736768

Reviewed all seven corrected source files and three changed/new test files in the correction, then confirmed the complete lane diff against7aca86e. Apps/web tree:8e1930bf2c17b292d2c621bb33eac3aedb77b6b3. `independent-profile-correction-pin.json` records hashes for every final lane file. No new source defect found in this exact correction.

- FacilitiesManager retains the original editing snapshot until canonical writer.restart admits a deliberately reviewed current actor/source. Its callback then adopts the matching current facility and remounts the editor; a missing target closes the editor instead of implicitly creating a new facility. The canonical writer, query/source/actor assertions and uncertain-attempt owner are byte-unchanged from base.
- ActivityFeed flattens group rows under one keyed list so date/pinned regrouping retains ActivityRow and ActivityActions identity. The default action-bearing feed stays mounted during expansion; expanded rows are read-only and omit both mutation menus and TimelineMailThread draft controls. Native title/body/kind/time/due/settled/pinned metadata and existing meeting/file navigation remain.
- Expanded Log activity reuses the existing URL log intent and canonical ClientOverview QuickLog. A one-shot flag waits for the closing dialog’s existing onCloseAutoFocus boundary, suppresses only its old return-focus event, clears itself before route activation and preserves other URL parameters. Client-change/unmount cleanup discards pending intent. Ordinary close keeps shared focus behavior. No shared dialog/session/router contract was modified.
- Responsive expanded width is capped by viewport; local field min-width rules fix overflow. FacilityFields now uses the existing SelectField while preserving native field names/defaults and unknown-existing state option. File CSS changes only source-chip presentation. Files readers/writers, receipt/reconciliation logic and all CP01–03 helpers remain unchanged.

Read owner-run results: corrected presentation8/8 intended reds on frozen7aca; recovery6/6 intended reds on unchanged5291; final14/14 greens on this correction. The six recovery assertions are unchanged. `HARNESS-CORRECTIONS.md` accurately preserves invalid clock-mock reds, initial unexpected fixture reads, whole-cell locator mismatch, a formatting-interrupted attempt, and later real width/focus failures. Native-shaped boundary fixtures complete existing read-only requests; unexpected-request assertions remain. New presentation test expectations now intentionally require a read-only expanded view and closing it before canonical QuickLog. The two original test-file edits remain mechanical dialog/submit locator mappings with their native assertions intact.

The source review does not claim to harden pre-existing filter-driven row disposal or all native history behavior. It accepts the bounded expansion/regrouping/pending/unknown ownership repair on its demonstrated paths. Owner67 preservation controls and root combined qualification remain pending at this writing. This reviewer performed no browser/server/build/native calls.


## Final size responsibility review

`independent-profile-size-review.json` records all7 changed-file signals from the exact pinned scanner, independently verifies their source hashes and supplies a responsibility assessment for each. This includes the97-line ActivityRow,124-line ActivityTimeline,126-line manager and unchanged320-line FilesPage. The complete set matches architecture-final-pinned; dependency errors are empty. FilesPage fingerprint71b102bced5c6eb98f9187aa4979c27119ab3a26a1078ba7e98a910aa7f382ce and sourceSHA18d6f94455f08109e3883c569bc4203a198c5004aaa42bd42add8143adfc95bd remain unchanged from initial review. Root owns registry acceptance; no automatic waiver was applied.


## Final successor review: ecf34dfac16e36b22df1a1da9b6e86b785699dbb

Final apps/web tree93afdcedeb64aca978e62cb5ed4d8ad69760df6d. Independently inspected the complete two-file delta from a5202a0: `.viewMode [aria-pressed="true"]` becomes `.viewMode button[aria-pressed="true"]`, plus two desktop/phone hover-contrast controls. The selector specificity keeps the selected foreground/background pair from being split by the generic hover rule. No query, state, callback, field, route, request or writer code changed. The two controls fail before at1.149:1 and pass after against their4.5:1 threshold; no assertion was weakened.

Read `final-complete-green.json/log`:16/16 passed at the final successor, including all14 existing presentation/recovery controls and2 contrast controls. Read `preservation-green.json/log`:67/67 passed **before the CSS selector change**; this is preserved prior-source evidence, not a claimed fresh67-case successor replay. Final owner typecheck/lint/format logs pass. All7 exact reviewed source hashes/fingerprints remain identical, including FilesPage320; `independent-profile-size-review.json` verifies that continuity and retains the a520 predecessor record separately.

No further defect found in this final source/evidence review. The bounded CP04/05/06 changes are ready for root integration and combined qualification. Native services/provider effects, wholesale337-row acceptance and the already stated filter-disposal limits are outside this review. This reviewer performed no browser/server/build/native action and made no Profile source or registry edits.

Final source manifest and evidence statistics: `independent-profile-final-review.json`. Review artifact hash manifest: `independent-profile-evidence-manifest.json`. Earlier pinned findings, red attempts and predecessor review are retained.
