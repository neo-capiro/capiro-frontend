# Desktop parity checklist — 19 October 2026

This is a current **design inventory and source-coverage checkpoint**, prepared read-only. It does not certify desktop parity or live integration.

- Source inspected: `capiro-frontend@4814e642dc11df6815f01ac9f64c4ac0b24a1251`.
- Figma page in both files: `1064:140864`, **Prototype — Capiro 3.4**.
- Portfolio: [mpXWnySldUFzdVna8i69Ki](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/).
- Modules/Settings: [zGvvF6V6hh7yweoplCdpdE](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/).
- Comparison target: **1440 × 1040, light theme**. Mobile and dark-theme acceptance are deferred.
- Current browser checks performed by this inventory lane: **0**. Current live/API checks: **0**. Root owns the coherent receiving-candidate Playwright run and must attach its exact candidate and results separately.

## Screen-by-screen record

[CSV checklist](PARITY-INVENTORY.csv) contains one row for every retrieved desktop frame, with **file, node, name, route, state, status, area, coverageId, section and design URL**. [JSON checklist](PARITY-INVENTORY.json) retains the same rows plus source/method metadata. Each coverageId resolves to losslessly interned evidence, owner, source paths, inherited specs, mapping confidence and blocker fields in JSON coverageRecords.

The extraction yielded **946 frame references: 238 Portfolio and 708 Modules/Settings**. These are **not 946 application routes or 946 verified screens**. The count includes overlays, recovery variants, newsletter workflow stages, reference boards, duplicated shared surfaces and superseded concepts. Extraction selects frames directly parented by sections, at least 1200px wide and 800px high; named screen-directory/catalog pages are excluded. Smaller standalone components are not a complete component inventory.

Status meanings:

- **implemented/unverified** — a frame-specific inherited source audit exists; current acceptance is pending. **32 rows**.
- **current-verification-pending** — feature source and relevant inherited browser specs exist; exact frame/state support awaits receiving-candidate checks. **881 rows**. This is remaining verification work, not an external blocker.
- **superseded** — do not recreate expanded Engagement or explicitly superseded Strategy concepts. **11 rows**.
- **reference-only** — token/reference boards rather than product acceptance screens. **10 rows**.
- **outside-assignment** — Meri preferences/governed-memory owner surfaces. **12 rows**.
- **missing-design** — no corresponding named desktop acceptance frame was identified. **6 requested-design rows**, separate from the 946 retrieved frames.
- **verified** — reserved for the root's new receiving-candidate evidence. No row currently has this status.

The normalized inventory now lists actual existing feature source files and matching browser-spec paths per frame family: **942 rows have source references; 936 have existing spec references**. Reference-only and excluded rows also retain context where available. Spec existence is not a test result, and family evidence is not exact state coverage.

The source checkout contains **18 physical non-Meri page templates**, excluding onboarding, sign-in, public forms and Meri. Dynamic `/modules/[module]` currently expands to **8 registered module destinations**; `/settings/[section]` to **19 Settings sections**. Dynamic client IDs and view/query states are not extra physical route templates. Exact template source paths are in JSON.

Do not upgrade an entire family because one fixture browser case passed. Historical screenshots and synthetic test results remain historical fixture evidence.

## Representative acceptance targets

All rows below are **implemented/unverified** unless a different disposition is stated. Existing repairs should be preserved, then checked on the receiving candidate.

| Surface / Figma node                             | Application entry                       | Inherited source coverage                                                                 | New evidence in this lane                                                                                                        |
| ------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio home `1064:153351`                     | `/portfolio`                            | Source-backed roster, unavailable unsupported aggregates, attention column                | Native [home render](evidence/figma/portfolio-home-1440x1040.png)                                                                |
| Clients `1064:155853`                            | `/portfolio?type=CLIENT`                | Existing roster/filter implementation                                                     | Metadata only                                                                                                                    |
| Prospects `1064:155957`                          | `/portfolio?type=PROSPECT`              | Existing BD prospect reconciliation/capped response disclosure                            | Metadata only                                                                                                                    |
| Pipeline `1064:156172`                           | Prospects → Pipeline                    | Existing seven-stage modal and supported stage commands                                   | Metadata only                                                                                                                    |
| Client overview `1064:158895`                    | `/portfolio/[clientId]`                 | Existing two-column card layout and honest unavailable aggregates                         | Native [overview render](evidence/figma/portfolio-profile-1440x1040.png); high-fidelity client card and merged summary inspected |
| Government identity `1064:159414`                | Overview → Government & federal profile | Existing unified modal, Identity & registration tab                                       | Native [identity render](evidence/figma/government-identity-1440x1040.png), high-fidelity context                                |
| Government federal activity `1064:159495`        | Same modal → Federal activity           | Existing source separation and federal attribution                                        | Native [federal render](evidence/figma/government-federal-1440x1040.png), high-fidelity context                                  |
| District details `1064:159626`                   | Overview → District Nexus location      | Existing location details/recovery preserving saved geography                             | Metadata only                                                                                                                    |
| Client agenda `1064:177487`                      | `/portfolio/[clientId]/calendar`        | Existing selected-client meeting experience                                               | Metadata only                                                                                                                    |
| Client Month / Week `1064:179149`, `1064:179266` | Same route → view selector              | Existing measured calendar views                                                          | Metadata only                                                                                                                    |
| Meeting Prep `1064:177692`                       | Client calendar → meeting → Prep        | Existing meeting detail/workspace                                                         | Native [prep render](evidence/figma/meeting-prep-1440x1040.png), high-fidelity context                                           |
| Meeting Debrief `1064:177734`                    | Client calendar → meeting → Debrief     | Existing debrief/approval presentation                                                    | High-fidelity context and tool render inspected                                                                                  |
| Meeting Library `1064:177776`                    | Client calendar → Meeting Library       | Existing client-scoped library                                                            | Metadata only                                                                                                                    |
| Objectives `1064:174996`                         | `/portfolio/[clientId]/objectives`      | Existing intake/list/advocacy history                                                     | Metadata only                                                                                                                    |
| Government relationships `1064:164763`           | `/portfolio/[clientId]/relationships`   | Existing source-backed government relationships                                           | Metadata only                                                                                                                    |
| Work `1064:166690`                               | `/portfolio/[clientId]/work`            | Existing source-backed work composition                                                   | Metadata only                                                                                                                    |
| Capabilities `1064:169534`                       | `/portfolio/[clientId]/capabilities`    | Existing capability grid, fit strip and saved history                                     | Metadata only                                                                                                                    |
| Opportunities `1064:170699`                      | `/portfolio/[clientId]/opportunities`   | Existing authorized source composition                                                    | Metadata only                                                                                                                    |
| Bill Tracker `1064:171199`                       | `/portfolio/[clientId]/bills`           | Existing table/board composition                                                          | Metadata only                                                                                                                    |
| Files `1064:167100`                              | `/portfolio/[clientId]/files`           | Existing ACL-aware files and separate registered usage read                               | Metadata only                                                                                                                    |
| Add profile `1064:156441`                        | Portfolio → Add profile                 | Existing chooser and supported creation flows                                             | Metadata only                                                                                                                    |
| Quick Log `1064:154447`, `1064:154792`           | Portfolio → Quick Log                   | Existing direct/command receipts and recoverable follow-up saga                           | Metadata only                                                                                                                    |
| Modules hub `1064:191436`                        | `/modules`                              | Existing seven-card layout with source-backed permitted-client count                      | Metadata only                                                                                                                    |
| Outreach `1064:191976`                           | `/modules/engagement`                   | Current source is already Outreach-only; superseded Figma tab strip must not be recreated | Native [Outreach reference](evidence/figma/outreach-1440x1040.png), high-fidelity context; **reference tab strip superseded**    |
| Personal `1064:243056`                           | `/settings/personal`                    | Existing profile title, account and signature functionality                               | Native [Personal render](evidence/figma/settings-personal-1440x1040.png), high-fidelity context                                  |
| Integrations `1064:244275`                       | `/settings/integrations`                | Existing connected/empty providers and reviewed Microsoft Realtime action                 | Metadata only                                                                                                                    |
| Team `1064:244607`, `1064:244732`                | `/settings/team`                        | Existing roles/invitations; inviter is not projected                                      | Metadata only                                                                                                                    |
| Profiles `1064:244975`                           | `/settings/profiles`                    | Existing account-owner projection and active/archive states                               | Metadata only                                                                                                                    |
| Billing `1064:246942`                            | `/settings/billing`                     | Existing capacity/list-price/current-period state and hosted provider portal              | Metadata only; bespoke Figma financial fields remain unsupported                                                                 |

Inherited references: `evidence/portfolio-desktop-result.md`, `evidence/portfolio-core-contract-receiving.md`, `evidence/figma/README.md`, and `docs/modules-settings/FIGMA-3.4-DESKTOP-AUDIT-20261018.md`. Those records explicitly describe fixture/synthetic verification and live gates not executed. The old Modules handover's 528-operation count is historical; its 18 October audit records 530. The receiving integration recalculated **588** registered fixed operations; see [API inventory](API-WIRING.md) and [complete registry](FIXED-OPERATIONS.json). Registration is not live qualification.

## Catalogued families awaiting exact state acceptance

The full CSV enumerates each node. These families are **current-verification-pending** at exact state level. They already have feature source and relevant inherited tests, except separately identified reference/superseded/ownership-excluded rows. An unreviewed state is not an external blocker:

| Family                                                                                | Candidate route / entry                 | Required next evidence                                                                                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Timeline loading, empty, filtered-empty, error, logging and removal                   | Client overview                         | Focused current browser interaction for state and draft recovery                                                                       |
| Objective intake and direct Strategy/Planner/task links, including uncertain receipts | Client Objectives                       | Retain exact server-owned versions/receipts; verify supported links; do not claim autonomous Objective → Strategy → Planner completion |
| Government recovery `3034:53135`–`3034:53975`                                         | Unified Government & federal modal      | Denied, no match, partial and stale source states                                                                                      |
| Location recovery `3034:51112`–`3034:52846`                                           | District location modal                 | Load failure, partial coverage, removed access, moved/deleted identity and evidence/review                                             |
| Relationship drawers, hierarchy, organization and staff-target states                 | Client Relationships                    | Current authorized read/write, stale save and retained draft behavior                                                                  |
| Files, folders, quota, previews and manage-access states                              | Client Files                            | Preserve ACL/read authorization; do not imply unsupported folder upload or invented storage totals                                     |
| Planner, Strategies, Directory, Intelligence and Research Portfolios                  | Corresponding `/modules/[module]` route | Exact state mapping and relevant browser evidence; route existence is insufficient                                                     |
| Workspace, Hill Day and newsletter stages                                             | `/modules/workspace`                    | Preserve established workflows and source contracts; respect Fable's Meri document/artifact boundary                                   |
| Standard/admin/HQ Settings and billing lifecycle                                      | `/settings/[section]`                   | Role/tenant matrix and current contract state; destructive checks immediate                                                            |
| Global calendar Agenda/Month/Week                                                     | `/calendar`                             | Current unified-calendar browser checks; retain client-specific calendar destinations                                                  |
| Meri preferences and governed Memory                                                  | Existing Meri-owned Settings entries    | Separate owner integration; no adoption or edits in this inventory lane                                                                |

Global-calendar references are included: master Agenda `1064:268019`, Month `1064:268265`, Week `1064:268392`; Anduril Month/Week/Agenda `1064:267760`/`1064:267887`/`1064:268783`; NACD Month/Week/Agenda `1064:268524`/`1064:268651`/`1064:268879`.

## Design observations to preserve

The shared desktop target has a 64px content header and 1px divider, 232px sidebar, Geist typography, warm `#f5f5f4` background, white cards, `#e7e5e4` borders and restrained black primary controls. Coordinate shared-shell changes before editing; Meri first-chat inputs remain frozen.

Client overview has one visible **Government & federal profile** summary. Its high-fidelity summary is 351 × 104 with registration status and program funding context. The shared modal is 1020 × 820 at the 1440 × 1040 target, with **Identity & registration** and **Federal activity**, scrollable details, Close and Done. Keep program funding context distinct from client-attributable contract/grant awards. Figma preview values are examples; the design explicitly warns about identity matches, source dates and unavailable coverage.

Meetings are designed in client Portfolio Calendar with a meeting list alongside Prep, Meeting Notes and Debrief. Prep and Debrief frame contexts are available. This does not require resurrecting a Meetings tab in Modules Engagement.

The Modules Figma still shows Overview, Plan, Meetings, Outreach, Reports, Team, Library and Commitments. Neo's explicit simplified product requirement supersedes that tab strip. Current `EngagementScreen` already renders Outreach and a checked legacy meeting/library handoff; `module-catalog.ts` lists Outreach as Engagement's sole chip. Preserve this repair.

## Exact mockups requested from Neo

These are documented design gaps, not reasons to stop independent code/API work.

1. **Simplified Outreach:** landing and campaign detail matching existing draft/sent campaign behavior, without the expanded Engagement tab strip.
2. **Outreach recovery:** initial load, empty list, empty filter, client-scope read failure, unavailable campaign/access denied and retry.
3. **Meeting Notes:** entered notes, editing/unsaved affordance and failed-save recovery in the accepted client-calendar meeting shell. Prep/Debrief show the tab; no separately named Notes desktop frame was found.
4. **Module metrics:** loading, no records and unavailable aggregate states using returned scope/counts.
5. **Pending invitations:** empty invitations and valid rows without an inviter field.
6. **Billing with current contract:** capacity/list price/current period, unavailable bespoke terms/payment/invoices and hosted-portal handoff. Exact bank/terms/invoice screens additionally need frontend-safe Core contracts.

## Capture and access provenance

Both Figma files were readable; high-fidelity context was obtained for representative home, client card, combined government summary/modal, Prep/Debrief, Outreach/target and Personal Settings. The full client overview returned sparse context, so a read-only Figma hierarchy query located its visible child nodes; client-card and government-summary children returned high-fidelity context. No Figma canvas edits occurred.

Seven native screenshot files above were decoded from tool-returned inline PNGs and validated as **1440 × 1040**. URL-based curl downloads returned HTML despite a zero exit status; those invalid files were replaced by validated PNGs. These are **design renders**, not application captures.

Generated context TXT files in the scratch evidence directory contain temporary asset URLs and are implementation references only. Do not commit those temporary URLs or treat them as runtime assets. Commit the normalized inventories, this checklist and selected native PNGs as appropriate.

## Concrete dependencies versus verification work

No external access blocker prevented this design inventory. Remaining concrete contract dependencies documented by inherited audits include scoped module/engagement aggregates, some Portfolio urgency/deadline/lifecycle aggregates, invitation inviter identity and bespoke billing terms/payment/invoice facts. Meri assistant/governed-memory adoption remains with its owner. Existing honest unavailable/portal states can be verified now; those dependencies do not block ordinary independent layout, route, interaction or API-wiring work.

## Receiving-candidate completion record

Receiving source is [`f32ed6ff32df0af36f04b5933a0e9ea356d22526`](https://github.com/neo-capiro/capiro-frontend/commit/f32ed6ff32df0af36f04b5933a0e9ea356d22526), [PR105](https://github.com/neo-capiro/capiro-frontend/pull/105). See [validation](VALIDATION.md) for exact commands, original failures, affected reruns and provenance; [screenshot index](evidence/SCREENSHOTS.md) records viewport/dimensions. The production build passed with 283 pages. Portfolio initial 57/58 plus affected 1/1 passed; Modules/Settings initial 213/218 plus affected 9/9 passed. These are synthetic browser checks, not live acceptance.

| Screen / state                   | Receiving implementation and verified behavior                                                                                                                        | State / remaining acceptance                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio home Clients → All     | Verified current read boundary and source-backed 8 clients / 6 prospects after selecting All                                                                          | Behavior verified with intercepted data; exact frame raster acceptance pending                                                                           |
| Portfolio Quick Log commitment   | Corrected overlapping Counterparty/Due widths; held direct writes lock submitted fields, preserve known-refusal draft and prevent duplicate writes                    | Implemented and browser verified; [fields](evidence/browser/quick-log-fields-1440x1040.png), [pending](evidence/browser/quick-log-pending-1440x1040.png) |
| Client Calendar → meeting → Edit | Pending edit retains parent meeting when Escape is pressed; ordinary nested Escape remains functional                                                                 | Implemented and browser verified; [pending](evidence/browser/meeting-edit-pending-1440x1040.png)                                                         |
| Meeting Notes / Debrief          | Single-flight writes freeze input and disable meeting tabs/close/Escape until settlement; rejection retains editable text                                             | Implemented and browser verified, four success/failure cases; missing Notes-specific design remains request 3                                            |
| Modules → campaign detail        | Editor requires exact session ID and state-version association; pending save reserves synchronously and locks fields/navigation; rejection retains text               | Implemented and browser verified; [campaign](evidence/browser/campaign-success-1440x1040.png); source endpoint still requires qualified serving mount    |
| Settings + mode navigation       | Verified client persists through sections and Portfolio/Meri/Modules; unavailable hints do not block account Settings or propagate; replacement conceals former scope | Implemented and browser verified; [Settings scope](evidence/browser/settings-verified-client-1440x1040.png)                                              |
| Government & federal profile     | Existing single entry/modal and distinct identity/federal details retained; receiving Portfolio overview regression passes                                            | Existing implementation retained; exact modal recovery frame acceptance pending                                                                          |
| Engagement / Outreach            | Existing Outreach-only navigation retained; no Reports/expanded tabs restored; foreign/null/missing client receipts concealed and recover only after matching read    | Browser behavior verified; simplified desktop mockup and authenticated live os comparison missing                                                        |
| Objective → Strategy → Planner   | Current exact links and foreign/archived/duplicate refusal verified; government-relationship context preserved                                                        | Governed completion remains blocked on Core/Meri authority and custody qualification, owner dot/Fable                                                    |
| Full inventory                   | 946 frame/reference rows and six explicit missing-design requests remain lossless                                                                                     | No blanket promotion of source/spec coverage into pixel verification; exact-state backlog retains its recorded states                                    |

The machine inventory's `currentBrowserVerified:0` counts exact **Figma frame/state acceptance**; it does not erase the behavior checks above. No exact raster claims were added. `currentLiveVerified:0` remains accurate. Both design files and the Meri shell reference were accessible. os.capiro.ai stopped at sign-in. No merge, deployment, AWS/DNS/secrets/configuration change or message send occurred.
