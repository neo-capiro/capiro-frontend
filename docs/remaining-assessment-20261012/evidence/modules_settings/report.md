# Modules, Settings and Global Master Calendar read-only assessment

Frozen application `4a1614886fd98bb42d529f1ef59b3d01d7ff9173` / tree `46cebca97ccfc1facc1c1a939beb6f4d7730685b`, evidence head `3562618`. No application/shared/frozen edits, commits, build, provider/payment/model calls or live backend mutations. All deliverables are in this directory.

## Deployment-impact findings

- **P1 MS01 — Billing:** active subscriptions can enter **Add profiles → Review checkout**, which invokes the pinned owner's new subscription Checkout creation with absolute quantity. This does not update an existing subscription. Source mismatch confirmed; no duplicate charge/subscription was executed or claimed. [Screenshot](billing-active-add-profiles.png), [pinned source](backend-pin-billing.service.ts).
- **P2 MS02–MS05 — Modules Calendar only:** verified client URL scope is discarded; a separate Planner start date is dropped when a due date exists; one failed meetings feed hides successful independent agenda sources; task links reach Planner but do not open the task. [Failure](calendar-independent-feed-repro.png), [occurrence](calendar-task-occurrence-repro.png), [task destination](calendar-task-target-repro.png).
- **P2 MS06 — Modules meeting detail:** a supplied join link is omitted. Table/modal presentation also diverges from the authored split view. [Browser](engagement-meeting-repro.png), [Figma](figma-engagement.png).
- **P2 MS07 — Workspace:** Radix dropdown buttons escape a CSS rule targeting native selects, yielding three full-width desktop filter rows. [Browser](browser-workspace-desktop.png), [Figma](figma-workspace.png).
- **P2 MS08 — Planner:** All tasks lacks the authored client grouping, Group by control and scope selector. Generic task listing/editing/completion is implemented. [Browser](browser-planner-desktop.png), [Figma](figma-planner.png).
- **P3 MS09 — Public forms:** small shared Panel title, external eyebrow, full-width submit and unstyled validation differ from the authored form hierarchy. Synthetic error retains input; synthetic success reports received. [Browser](browser-form-error-desktop.png), [Figma](figma-form.png).

Precise source lines, repro conditions, row/frame IDs and evidence are in [findings.json](findings.json).

## Global calendar versus Modules calendar

The14 ledger rows belong to canonical `/calendar`, under Portfolio's CalendarPage. Modules left navigation independently serves `/modules/calendar`. Do not transplant the Modules-only failures onto canonical row acceptance. Fresh bounded canonical checks confirm a selected client/date/timezone survives a view change, and independent Planner start/due rows survive a meetings403. Exact-source existing calendar tests supply additional bounded evidence. All14 full-row dispositions remain **OPEN_FINAL_ACCEPTANCE**; [row-assessment.json](row-assessment.json) records every ID separately.

MCAL-010 remains incomplete: global Calendar calls only the limited Federal Register deadline feed; no global SAM/SBIR composition is present. The Modules funding adapter does not close that row. MCAL-012 has publisher effective-date support with provenance and incomplete-coverage warnings; forecast windows remain unavailable without a reviewed source contract.

## Dependencies and legitimate unavailable features

Native Clerk roles/RLS, exact deployed APIs, real provider calendars, S3/microphone/socket behavior, billing, delivery and durable Strategy execution remain unrun. Memory/Meri preferences, aggregate Engagement plans and certain HQ operations explicitly disclose missing reviewed contracts. Those disclosures are not frontend defects. Hosted billing cancellation differs from the authored in-app cancellation-window/survey flow; that missing API is distinct from MS01.

## Verification and coverage limits

12 focused Modules assessment cases completed (including successful reproductions of defects), plus2 canonical comparison cases. Initial probe fixture/locator mistakes were corrected: client verification fixture missing, an exact meeting-button name omitted its client label, and the global gateway sanitizes403 text. No source changes were made to obtain results. Refer to the final JSON result files for exact outcomes.

Nine real Figma contexts/screenshots captured, including six primary surfaces, public form, Billing and Master Agenda. Six primary screens captured at1440 and390; no document-level horizontal overflow was observed. Phone-specific Figma frames, populated/edge state matrices and intelligence submodules were not individually accepted. [screen-assessment.json](screen-assessment.json) explicitly marks every remaining inventory frame unassessed. Existing compact Calendar header/switcher repair and whole121/934 gates were not rerun.

Secondary review: [secondary-review.json](secondary-review.json) independently reviews Files CP-01–03 and Calendar CR-01–04 against current backend pin `243248e726243c44bd4b9d24fd1ed220da18c56a`. It recommends CP-03 P3 for bounded deletion recovery UX and CR-04 P2 for receipt-context failure; no privacy incident or provider effects are established. MCAL-007 now explicitly cross-references CR-04, with fresh proof limited to edit and create-specific expected-client validation still unrun. Each of the14 rows has a distinct remaining action; MCAL-010 is partial source coverage and MCAL-012 partial with a contract dependency.
