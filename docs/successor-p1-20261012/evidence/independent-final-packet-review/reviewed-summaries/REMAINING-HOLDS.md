# Remaining acceptance holds

This is the handoff for source `d5dd0be9bf5ad7800e648ff1421ce047523288b3`. Completed offline gates do not admit all product rows or a deployed image. The original assessment IDs, scope and severity are retained; this document gives concrete next actions without claiming a new assessment or quietly removing features.

All **337 Portfolio native rows remain unaccepted**, with the eight original exclusions unchanged. The [active row ledger](../integration-contracts-20261012/PORTFOLIO-337-ACTIVE-LEDGER.md) and [PR11 assessment](https://github.com/neo-capiro/capiro-frontend/pull/11) retain the row-specific native and visual criteria.

- **Native integration:** qualify existing identity/tenant/role/client matrices, cancellation, native receipts, persistence/CAS/RLS and durable effects in the separately authorized target environment. Synthetic browser fixtures and read-only backend source inspection do not prove those effects. Do not enable unavailable actions or invent endpoints.
- **Debrief read contract:** native list responses omit sharing stamps. The current UI states Sharing status unavailable and offers no inferred Unshare. A backend-owned read-contract correction and native validation are required before enabling that unavailable list action.
- **Uncertain writes:** Calendar creation lacks native durable idempotency; the browser session fence is not cross-tab/hard-reload deduplication. Files current GET recovery establishes current state, not attribution of a prior uncertain PATCH. Preserve these limits in any next workflow change.
- **Shipping:** the designated session must review the final source/archive binding, produce and qualify the actual image, and complete image/runtime/vulnerability gates. Build ID `HW5M0_NcA2YohM1f7uUwZ` is a host Next build. No image build, AWS action or rollout occurred on this source. Prior PR12 execution controls remain bound to their older4a source until the shipping owner reviews an updated binding.
- **Transfer:** no Library ID exists. Two earlier mandatory-helper tools/list calls failed with network errors before upload preparation; no size-limit rejection was returned. The published exact-Git-source creator and independent verifier route is ready. Native Windows execution of that route is still unrun; bind any separately produced archive identity only after complete source verification.
- **Visual/accessibility breadth:** bounded Chromium desktop/mobile, light/dark runtime, keyboard and saved-Figma comparisons passed. Remaining authored compositions below, missing exact editor frames, other browsers/devices and complete assistive-technology certification are not established.

The following **27 original source/design findings remain open**. The ten prioritized source repairs and additional correction reviews are in [the dispositions](FINDING-DISPOSITIONS.json). The next actions below are implementation work, not permission to perform native provider, billing, database or infrastructure effects.

| ID | Severity | Existing finding | Next source action |
| --- | --- | --- | --- |
| CI-01 | P2 | Saved client detail fields have no on-screen read-only profile surface | Add the saved profile read surface for read-authorized users and compare the recorded profile frames. |
| CI-02 | P2 | Client view switcher omits search and the specified per-view keyboard shortcuts | Implement client-view search and the specified keyboard shortcuts; retain current scope/auth guards. |
| CI-03 | P3 | Account team retains a generic stacked form instead of the designed roster | Apply the authored account-team roster composition and repeat desktop/mobile keyboard review. |
| CI-04 | P3 | Intake choice groups use one three-column grid for distinct designed layouts | Use the distinct authored intake choice layouts instead of one generic grid. |
| CP-03 | P3 | Ambiguous file deletion response immediately re-enables the destructive confirmation | Retain an uncertainty fence after an ambiguous deletion response; require deliberate current-state recovery before another destructive attempt. |
| CP-04 | P2 | Facilities entry opens a standalone editor instead of the designed management dialog | Implement the designed Facilities management dialog using the existing editor and contracts. |
| CP-05 | P2 | Overview timeline retains a generic dot list instead of the designed grouped activity feed | Apply the grouped activity-feed composition while preserving native history and pin/edit actions. |
| CP-06 | P2 | Files toolbar and results header do not follow the supplied Files composition | Match the Files toolbar/results composition against its recorded Figma frames. |
| CR-05 | P2 | Client Agenda omits lifecycle triage filters and state columns | Add the specified Agenda lifecycle triage filters and state columns using existing supplied state. |
| CR-06 | P2 | Meeting workspace loses identity context across tabs and always enters Information | Preserve meeting identity context across tabs and implement the authored entry/tab behavior. |
| CR-07 | P2 | Saved email signature is fetched but never displayed | Display the fetched saved signature in the intended email workflow without inventing a write. |
| CR-08 | P2 | Prep and attachment share/unshare are missing | Implement prep/attachment share and unshare facets against the existing per-artifact contract; whole-meeting sharing remains excluded. |
| CR-09 | P2 | Client-shared meeting materials feed has no Portfolio consumer | Add the Portfolio consumer for the existing client-shared meeting-materials feed. |
| CR-10 | P3 | Email composer omits the designed rich-text formatting controls | Implement the specified composer formatting controls with safe content handling. |
| CR-11 | P3 | Meri rewrite has no Undo control or prior-body snapshot | Retain the prior draft and provide local Undo for a Meri rewrite. |
| OWI-F02 | P2 | Work discards supplied owner identities in its document and node projections | Preserve supplied owner identities in Work document/node projections and verify their rendered labels. |
| OWI-F03 | P2 | Registrations dialog omits the authored divided row layout | Match the Registrations dialog divided-row composition to its recorded frames. |
| OWI-F04 | P2 | Mobile capabilities retains full desktop cards instead of the compact authored list | Use the authored compact mobile capability list while retaining desktop behavior. |
| PROS-F03 | P2 | Prospect Files cannot search the loaded file list | Add search over the loaded Prospect Files list without implying unavailable server search. |
| MS02 | P2 | Modules Calendar loses a verified client selection on entry | Retain verified client selection when entering Modules Calendar and cover scope replacement. |
| MS03 | P2 | Modules Agenda drops the start of tasks with a separate due date | Project task start and due as distinct supplied schedule fields. |
| MS04 | P2 | Modules meetings failure hides independently loaded agenda sources | Keep independently successful agenda sources visible when meetings fail. |
| MS05 | P2 | Modules agenda task links never open the referenced task | Resolve task deep links to the referenced task with current authority checks. |
| MS06 | P2 | Modules meeting detail omits supplied join link and designed split view | Display the supplied meeting join link and authored split detail layout. |
| MS07 | P2 | Workspace desktop filters expand to three full-width rows | Match the desktop Workspace filter-row composition. |
| MS08 | P2 | Planner All tasks lacks the authored client grouping and scope controls | Implement the authored Planner client grouping and scope controls. |
| MS09 | P3 | Public Planner form loses the designed title and validation hierarchy | Restore the public Planner form title and validation hierarchy. |
