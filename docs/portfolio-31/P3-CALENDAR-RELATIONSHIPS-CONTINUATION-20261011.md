# P3 Calendar and Relationships continuation — 11 October 2026

## Authority and scope

Base frontend source: `02c02d95bdf3949662b9123f425271c6491ffdab`. The human explicitly waived the unavailable agent-ops prerequisite and authorized independent work; infrastructure shipping/resource actions remain for owner review. This worker owns only Calendar/Relationships and their dedicated tests. No shared shell/authentication, backend deployment, provider operation, paid generation, email or calendar mutation is authorized by this local verification.

## Design before implementation

### Committee selection (`ENG-target_committee_source`, `ENG-target_committee_staff`)

- Canonical contracts remain `relationships/directory-contracts.ts` and the existing Core directory endpoints. A cohesive `relationships/committee` module owns the browsing/search/selection presentation and validated taxonomy navigation. The existing directory query remains the network owner; no new route or copied provider data model.
- The current flat native select does not implement the approved Figma cascader. Use the existing Radix Popover, canonical button/theme styles, and exact downloaded static Figma assets for a responsive 336px panel. Grouping chambers and expanding a committee never selects values. A staged single actual committee ID is committed by Done; Clear clears the staged selection; Escape/close discards pending changes.
- Preserve complete taxonomy pagination and exact selected committee identity in existing staff reads. Reject duplicate/conflicting office identities, missing/cyclic parents and stale selected values before committing. Server authorization remains server-owned; this UI does not widen staff access.
- Reuse current Figma contexts/screenshots for file `Zc2dEN5aLU47dVdsewDmiJ`: `570:124980` root, `570:125014` House, `570:125218` search. Fonts: Geist 13px/12px, 8px panel radius, 12px header/footer, 40px rows, 36px buttons, current theme tokens. Separate selection versus branch-expansion and full parent path come from the component usage description. No screenshot becomes an implementation asset.
- Verification: preserve existing all-pages/exact-staff/current-former assertions; add observed search, parent selection, child selection, expansion without dispatch, cancel/clear, keyboard and mobile/dark geometry checks. Inspect screenshots and static asset geometry. Run focused lint/types/unit/browser checks, then return per-ID evidence without marking live acceptance complete.

### Master Planner dates (`MCAL-009`, `MCAL-013`)

- Investigate the existing authorized Planner task feed, which currently filters only `dueOn` despite the scheduled/start-date requirement. Preserve source permissions, pagination, civil dates and no invented time/zone. If confirmed by current source, compose each explicitly supplied scheduled/due occurrence with stable distinct provenance IDs, without creating tasks or widening endpoint filters.
- Verification will cover start-only tasks, distinct start/due dates, same-day dates, range edges, source time zones and pagination. Existing Planner tests must retain their assertions.

## Current design findings and explicit blockers

The current Figma voice-source screen `682:142766` has title “Record Voice Memo” but its actual interaction is an audio upload. The existing uploaded voice workflow is consistent with that interaction; no browser microphone subsystem is justified by this target.

The handover identifies server ownership blockers for exact sender selection, outbound ACL/reply/replay fencing, atomic attachment approval, note-to-notetaker provenance, durable calendar sync and complete deadline/Government sources. Local UI or intercepted browser results cannot satisfy those contracts or signed-in/provider acceptance.

## Current existing-service contract review

Read-only GitHub review used current `neo-capiro/capirov2` main `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`:

- [Planner source DTO](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/packages/strategy-verifier/src/planner.ts), blob `a5c7ef0f8bf087bc62582e638e4bc5ed15fe357c`, defines `startOn`/`dueOn` as civil dates and optional `startTime`/`dueTime` in the source IANA timezone. [Existing validation](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api-strategy/src/planner/planner.validation.ts), blob `4617c3f277824d1ac059cd5262705f6247cf8f10`, requires an accompanying date and timezone for a supplied time. The [existing Planner service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api-strategy/src/planner/planner.service.ts) supplies the authorized paginated task list. No new client or date query parameters are introduced.
- The [existing Directory controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/directory/directory.controller.ts) retains `GET /api/directory/committees` with `q/chamber/kind/page/pageSize` and `GET /api/directory/committees/:committeeId/staff` with `q/page/pageSize`. The [Directory service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/directory/directory.service.ts) returns paginated taxonomy rows and an exact committee roster, preserving current and former staff. The picker reuses those existing frontend adapters.

The source review establishes the available interfaces. It does not establish deployed service behavior or replace signed-in acceptance.

## Implemented local changes

### Calendar

`calendar/planner-feed.ts` now composes scheduled starts and due dates independently. Start-only tasks appear in Master Agenda. Distinct start/due dates and distinct times on the same day keep separate stable occurrence IDs. Identical start/due date/time values form one occurrence whose provenance names both. Date-only values remain civil dates without a fabricated timestamp, and the existing date conversion interprets explicitly timed values in their source timezone. Each occurrence respects the requested half-open range. Archived rows stay excluded.

`calendar/contracts.ts` validates real calendar dates, strict `HH:mm` times and recognized timezones, requiring date and zone for a timed occurrence. Malformed source rows surface the existing feed-error/retry state. `calendar/feeds.ts` retains existing permissions, full cursor pagination and incomplete-feed warnings. Client Calendar and Master Month/Week retain their meeting-only composition.

### Relationships

`relationships/committee/CommitteePicker.tsx` and `CommitteePickerPanel.tsx` replace the flat select within Add relationship. The panel uses the existing Radix Popover, the application font/theme/button tokens and the referenced cascader geometry. Chamber groups only navigate. Each real parent committee can be selected independently from its subcommittees. The separate expand control never selects or fetches staff. Search shows the full parent path. Selection remains staged until Done; Clear stages an empty selection, while Escape/close discards the draft and returns focus to the trigger. Keyboard navigation supports arrows, Home, End and Enter.

`relationships/committee/catalog.ts` validates complete parent chains and unique committee/office identities. It rejects missing, cyclic, self-referencing or cross-chamber parent links. The existing taxonomy query keeps fetching every page before presenting options and no longer silently replaces duplicate IDs. The roster request remains bound to the exact committed ID.

The picker panel exceeds the repository's proportional function-size review trigger. Its responsibility is one staged selection interaction with tightly coupled focus and navigation state; transport and hierarchy validation live in existing queries and the separate catalog helper, and popover lifecycle is in the wrapper. Independent parent review was requested before integration. No generic component framework or duplicate service boundary was introduced.

## Figma asset provenance

The design-to-code skill was read before obtaining contexts/screenshots for cascader root `570:124980`, House branch `570:125014`, search `570:125218`, Master Agenda `460:90798` and voice upload `682:142766`. Direct tool asset URLs returned HTTP200 `text/html` of 195 bytes instead of SVG; those responses were rejected.

The Figma use skill and Plugin API references were then read. A read-only `exportAsync({format: "SVG"})` call exported the exact three 16×16 nodes below from the same file/page. No Figma canvas nodes were mutated. Base64 results were decoded unchanged into `relationships/committee/assets`; SVG paths, viewBoxes and intrinsic dimensions were not edited.

| File             | Exact source node       | Bytes | SHA-256                                                            |
| ---------------- | ----------------------- | ----: | ------------------------------------------------------------------ |
| `search.svg`     | `570:125016`            |   522 | `90aa09e1d1d01b4df64246912b027c97a9af846ed7f41361b50b957c67c4fa7a` |
| `arrow-left.svg` | `570:125027`            |   267 | `1da706d4c82f3b1cbdd3a42ef31d47bd3cd249bd40675e78df6c2a5a45b85612` |
| `chevron.svg`    | `I570:125270;563:44227` |   211 | `fac28cac0207b5dfc0b5453ad6e3d48db82a0499ef68c82f6820787b670d881c` |

The chevron source name is `icon/chevron-down`, but the exported glyph points right in this variant and is rendered unchanged. All three assets use their intrinsic 16×16 bounds. Dark mode uses the same assets with the existing theme's inversion treatment.

## Verification results and limits

Checks use the application working directory `apps/portfolio-web` and the installed repository tools:

| Check                                                                 | Observed result                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest run tests/calendar.test.ts`                                   | 21/21 passed. Original calendar assertions retained.                                                                                                                                                                                                                                                                   |
| `vitest run tests/calendar.test.ts tests/committee-catalog.test.ts`   | 32/32 passed across 2 files. Adds civil-date/time validation and all hierarchy navigation/rejection cases.                                                                                                                                                                                                             |
| `tsc --noEmit`                                                        | Exit0 after source and browser-spec additions.                                                                                                                                                                                                                                                                         |
| Scoped ESLint for all changed source/tests                            | Exit0, no errors; three `@next/next/no-img-element` warnings for the exact static 16px SVG images. No warning suppression added.                                                                                                                                                                                       |
| Scoped Prettier                                                       | One final browser-spec line required formatting; corrected before browser run. Final source/spec check passed.                                                                                                                                                                                                         |
| Focused browser run 1: government, committee-picker, calendar-planner | 10 launch failures before app execution: runtime executable was mode 700 and the worker received `EACCES`. Parent corrected mode 755. Preserved in `outputs/evidence/portfolio-p3-calendar-relationships-20261011/browser-initial-eacces/`.                                                                            |
| Focused browser run 2 with corrected executable                       | Browser launches but crashes during initial font rendering at `SkFontMgr_FontConfigInterface.cpp:163`, with `remote_font_face_source.cc` failure. All 10 fail; interaction/render acceptance remains pending. Preserved in `outputs/evidence/portfolio-p3-calendar-relationships-20261011/browser-second-font-crash/`. |
| Focused browser run 3 with system font configuration                  | 10/10 passed in 33.8 seconds:2 Planner,5 picker and3 existing Government cases. Result JSON and both phone screenshots preserved in `outputs/evidence/portfolio-p3-calendar-relationships-20261011/browser-final/`.                                                                                                    |

An initial unit invocation from the repository root failed to load `@/shared/date/civil` because the application Vitest alias configuration was not selected. Running from the application directory resolved the harness issue; production code was not weakened. Browser runtime is parent-provisioned Chromium 149.0.7827.0, supplied through the explicit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override; the normal pinned Playwright default remains unchanged. The second browser failure came from a Lambda-specific packaged font configuration. Parent proved a rendered smoke with system fonts; the passing run used `FONTCONFIG_PATH=/etc/fonts` and omitted `LD_LIBRARY_PATH`.

The new browser cases preserve the existing 201-record, two-page taxonomy/current-former staff assertions and add staged parent/child selection, no staff read on expansion/cancel, exact committed identity, full-path search, keyboard and phone light/dark geometry. Planner cases cover scheduled/due composition, chip filtering and preserved client meeting scope. No original behavioral assertion was removed or weakened to obtain the passing run.

Both actual phone screenshots were inspected against a fresh Figma House-branch context/screenshot at `570:125014`. The 336px panel, row heights, header/breadcrumb/option/footer spacing, intrinsic 16px icons and readable light/dark state match the reference structure. Synthetic taxonomy values intentionally differ from Figma example data and use stable alphabetical ordering. Screenshot hover state reflects the actual cursor position. The comparison identified two small text-style mismatches: Clear inherited the muted footer color, and close used `×` at 20px instead of Figma's literal `✕` at 14px medium. Both were corrected after the 10/10 run. Parent was asked to refresh the existing two phone screenshots during post-integration validation; those final cosmetic changes do not have a new local browser result yet.

## Audit handoff to the canonical ledger owner

| Audit ID                      | Local candidate evidence                                                                                                                                                                                               | Still open                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `MCAL-009`                    | Existing full Planner feed now includes scheduled starts and due dates;21 calendar unit cases and2 Planner browser cases pass.                                                                                         | Signed-in service acceptance.                                                                                              |
| `MCAL-013`                    | Stable occurrence provenance, civil/timezone semantics and existing source boundaries retained; scoped browser composition passes.                                                                                     | Signed-in composition acceptance; full deadline and Government sources remain missing.                                     |
| `ENG-target_committee_source` | Full taxonomy query plus validated Figma cascader;11 catalog unit cases, exact exported icons,5 picker browser cases and retained 201-record taxonomy case pass. Phone light/dark screenshots inspected against Figma. | Post-integration screenshot refresh for the final two cosmetic corrections; signed-in taxonomy and full-screen acceptance. |
| `ENG-target_committee_staff`  | Existing exact committed-ID roster adapter retained; browser verifies no selection/read on navigation and exact parent/child committed reads.                                                                          | Signed-in roster acceptance.                                                                                               |

No canonical matrix rows are marked complete by this worker. Parent owns integration, the ledger, broader validation, preview and any deployment decision.

## Native owner dependencies retained

| Audit IDs                                                                         | Exact remaining contract or acceptance dependency                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENG-prep_sender_select`                                                          | Existing single-mail DTO has no selected sender-connection identity; server chooses the latest connected caller mailbox. Owner must provide a safe selectable mailbox projection, exact selected-sender input and receipt provenance. See the handover's Email Prep Sender Contract Review.                                                  |
| `ENG-email_send`, `ENG-email_history`                                             | Native single-mail viewer/current-version/client/parent ACL and reply guard integration; broader batch/intent authorization and durable unknown/no-replay recovery. Current history list exposes recent caller threads without complete older paging. No real mail sent.                                                                     |
| `ENG-attachment_approve`                                                          | Canonical viewer ACL, current version and readiness must be checked atomically by server approval. Client preflight cannot close a revocation/write race.                                                                                                                                                                                    |
| `ENG-debrief_source_notes`                                                        | Worker discards the saved note ID; canonical note-to-notetaker-session provenance is required before claiming Meri origin. Existing saved notes remain usable.                                                                                                                                                                               |
| `ENG-calendar_sync_ms_window`, `ENG-calendar_sync_ms`, `ENG-calendar_sync_google` | Candidate 2386 is disabled/unregistered with unapplied SQL. Native active-membership/RLS/provider adapters, shared manual/scheduler/webhook/lifecycle cursor fencing and durable recovery must be activated and verified by the owner. Current local unknown state does not survive reload. Mail sync remains outside client Calendar scope. |
| `ENG-tasks_create`, `ENG-tasks_list`, `ENG-tasks_update`                          | Canonical Planner creation/visibility and authorized same-client strategy-step lineage, plus durable partial/unknown outcomes across quick-log/task writes, need owner agreement. This Calendar display fix creates no meeting task panel or Modules implementation.                                                                         |
| `MCAL-010`, `MCAL-012`, `MCAL-013`                                                | Regulatory source currently supplies at most 50 upcoming records within 30 days. Complete historical/extended regulatory and SAM/SBIR deadlines, plus actual Government effective dates versus estimated windows with source/confidence/time semantics, need native contracts.                                                               |
| All P3 rows                                                                       | Signed-in identity/privacy, deployed-service behavior and any approved provider-sandbox acceptance remain separate from intercepted tests. No live mail/calendar/provider mutation, AWS CLI action or deployment was performed.                                                                                                              |

## Post-consolidation rewrite correction and canonical locations

This section supplements the historical implementation/browser evidence above. Root moved the source into the canonical app and retained the source map in `docs/portfolio-31/CONSOLIDATION-SOURCE-MAP-20261011.json`.

| Historical location                             | Current canonical location                      |
| ----------------------------------------------- | ----------------------------------------------- |
| `apps/portfolio-web/src/features/calendar`      | `apps/web/src/features/portfolio/calendar`      |
| `apps/portfolio-web/src/features/relationships` | `apps/web/src/features/portfolio/relationships` |
| `apps/portfolio-web/src/shared`                 | `apps/web/src/shared/portfolio`                 |
| `apps/portfolio-web/tests`                      | `apps/web/tests`                                |

A read-only AST review identified a concrete `MailCompose` race: a rewrite response could replace a newer manually edited message. The proportionate design and the separate pending preparation/transcript extraction findings are recorded in `ARCHITECTURE-REVIEW-P3.md`.

The bounded correction adds `relationships/email/useMailRewrite.ts`, which owns the draft body and a specific source-bound attempt. The source includes the current client, contact, thread and draft recipients; a separate monotonically changing body revision covers edits, including edits back to the same text. Each attempt captures the existing mail authority. Local abort and post-response guards discard results after edits, context changes, identity invalidation or composer unmount. An older attempt cannot clear a newer pending attempt. Returning to earlier recipient values also clears stale status. Cancellation is local response handling, not a claim that server-side work was cancelled.

`relationships/email/rewrite.ts` retains the same `POST engagement/mail/rewrite` endpoint, `rawText`/`recipientName`/optional `recipientTitle` body and `{ bodyHtml, verified }` receipt through the existing API client. It owns the plain-text conversion formerly in the JSX. An unverified result preserves the original draft and existing warning. `MailCompose` now presents the controlled draft and frozen send review; `email.ts` no longer carries a duplicate rewrite hook. Review submit also explicitly refuses while a rewrite is pending. No send or attachment contract was changed.

| Post-consolidation check                                                            | Observed result                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest run tests/mail-rewrite.test.ts tests/email-compose.test.ts` from `apps/web` | 32/32 passed across two files, including five new native-boundary/cancellation cases. All 27 original compose cases retained.                                                     |
| Scoped ESLint for the four changed source modules and two dedicated test files      | Exit 0, no errors or warnings.                                                                                                                                                    |
| `tsc --noEmit` from `apps/web`                                                      | Exit 0 on the final source and browser test tree. Strict optional fixture accesses were corrected with an explicit checked accessor; no assertions were removed.                  |
| Dedicated browser regressions                                                       | Nine cases authored in `apps/web/tests/browser/mail-rewrite.spec.ts`; execution awaits root's integrated browser run. Routes are intercepted, with explicit zero-send assertions. |

The browser cases exercise a current verified result, unverified retention, manual edit while pending, edit back to original text, old/new attempt ordering, close/reopen, recipient change/restore, invalidated/changed mailbox identity and refusal before dispatch. The two final committee phone screenshots still need the post-integration refresh described above. A passing synthetic regression does not close native outbound ACL/sender/replay dependencies or signed-in acceptance.

The initial cohesion review contains 49 signals with 45 individually reasoned retained functions and four pending signals. After this extraction there are 50 signals: the rewritten composer and new attempt controller have two additional exact review records, leaving three pending signals across transcript upload and meeting preparation. See the focused architecture report and `outputs/evidence/portfolio-p3-calendar-relationships-20261011/architecture-rewrite-reviewed-records.json`. Those remaining extractions are proposals only; no blanket baseline approval was added.
