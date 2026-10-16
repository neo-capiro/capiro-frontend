# Modules/Settings3.4 design gaps

These requests come from the actual current Figma file, not older3.1 references. They request missing or contradictory visual/interaction states; they do not authorize new routes, permissions or business policy. Existing canonical safe behavior remains until allocated.

## MOD-D01 · Blank Newsletter canvas contradicts its content

Nearest frame: [1174:277401](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules-Settings?node-id=1174-277401).

Observed: The actual1440 screenshot says Untitled newsletter, Start with a blank canvas and Add your first section, yet displays a complete editorial newsletter with heading, copy, CTA and address.

Missing: Unambiguous initial blank document. The existing createNewsletter('blank') returns blocks[]. Copying the pictured sample would silently create content the user did not add.

**Mockup request for Neo:** Provide one corrected1440 initial blank-editor frame with the intended empty canvas, first-section affordance, disabled/enabled save/stage controls and first added section. If the editorial canvas is deliberately a preview, label it as an unsaved example and show how it is replaced.

Owner: Neo design; Newsletter source owner retains empty model. Blocks exact blank-state visual acceptance; does not authorize changing persisted blank semantics.

## MOD-D02 · Template library loading has no visible loading treatment

Nearest frame: [1064:254667](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules-Settings?node-id=1064-254667).

Observed: The frame is explicitly named Outreach library·loading, but the screenshot leaves the content region entirely blank while Create template, filters and Refresh remain visible.

Missing: Loading status and action admission. A blank region cannot communicate pending vs empty/failed data, and the design does not specify which independent actions remain available.

**Mockup request for Neo:** Provide loading and load-error1440 variants showing skeleton/status text, keyboard focus and retry placement, and distinguish independent creation from actions requiring the loaded template list. Use the existing action contracts; no new operation is requested.

Owner: Neo design; Template Studio owner. Visual/state composition gap; current safe explicit loading and refusal behavior must remain.

## MOD-D03 · Denied Strategy view still advertises live freshness

Nearest frame: [1064:237924](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules-Settings?node-id=1064-237924).

Observed: The actual access-denied screenshot displays 'Live·refreshed just now' above 'You do not have access'. The same module family separately includes session-expired and not-found states.

Missing: Unavailable/expired freshness presentation. A denied current read cannot establish current Strategy/context freshness.

**Mockup request for Neo:** Provide denied, expired, not-found and load-error header variants that either omit the badge or scope it to an independently verified source timestamp. Specify the exact label when no current read is available; avoid fabricated timers.

Owner: Neo design; Strategies source owner. Truthful freshness visual acceptance; backend authority remains unchanged.

## MOD-D04 · Engagement recommendations exceed the allocated manual Plan contract

Nearest frame: [1064:192802](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules-Settings?node-id=1064-192802).

Observed: The actual Plan frame depicts recommendedDC windows, cross-client wave ranking, cycle windows and commitments-to-verify. PR56 consumes the independently reviewed bounded manual Plan contract, which has no recommendation/ranking/execution route or office discovery picker.

Missing: Manual Plan list/detail/wave/review and stale-conflict states matching acceptedwire. Making the illustrative metrics or ranked windows functional would invent material business rules and unsupported authority.

**Mockup request for Neo:** Provide1440 and1024 manual Plan list/detail, empty selected-client, create/edit wave, explicit review deadline, stale409, unavailable reference and unknown-write recovery frames using the current accepted fields. Mark recommendation/ranking/window discovery as unavailable until their own backend policy and source allocation exist.

Owner: Neo design plus Engagement/Core contract owner; frontend PR56 remains separate. Blocks richer Plan behavior, not the existing manual implementation.

## MOD-D05 · Research Portfolio creation and state composition are absent

Nearest frame: [1064:242312](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules-Settings?node-id=1064-242312).

Observed: The actual Research branch contains only list, detail overview and module switcher frames; the list offers +New portfolio. The historical wiring board also lists creation as a missing design destination using old3.1 nodeIDs.

Missing: Creation/validation, no-results, unreadable detail. Opening a populated example detail is not a creation flow. Fields, cancel/save feedback and empty/error placement need visual direction; current contracts remain canonical.

**Mockup request for Neo:** Provide create/edit dialog and success/validation/cancel states built from the existing Research Portfolio DTO, plus list loading/empty/no-filter-match and detail unavailable variants. Retain role/mode/client/archive semantics and no write on open.

Owner: Neo design; existing Research Portfolio source owner. Visual composition gap; no new data/permission semantics inferred.

## MOD-D06 · Calendar 'New event' has no defined event form in this branch

Nearest frame: [1064:268978](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules-Settings?node-id=1064-268978).

Observed: The1024 Master Calendar frame offers +New event, whereas the1440 profile calendar offers New meeting. The calendar branch has month/week/agenda/scope states but no corresponding event creation frame.

Missing: Creation destination and event-kind meaning. The label alone cannot establish a new generic event type, permissions or mutation route.

**Mockup request for Neo:** Confirm whether New event opens the existing meeting form or a separately owned event type. Supply1440/1024 creation, validation, pending, success and dismissal frames for the admitted action. If it is a meeting, use consistent terminology.

Owner: Neo design plus Calendar/Core owner. Blocks new generic-event behavior; does not block the existing meeting workflow.

## MOD-D07 · Drawer motion data is a looping prototype timeline

Nearest frame: [1064:198085](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules-Settings?node-id=1064-198085).

Observed: Actual motion context reports a2000ms loop with repeatInfinity for scrim opacity and drawer opacity/x. Terms253185 similarly contains animated scrim/dialog tracks. High-fidelity child frames preserve visual endpoints.

Missing: Production enter/exit/reduced-motion semantics. A continuously repeating opening animation would not be normal production dismissal behavior, and the design does not state whether the loop is only a review demonstration.

**Mockup request for Neo:** Provide explicit once-on-open and once-on-close timing/easing, interrupted-close handling and reduced-motion endpoints for Task drawer and blocking dialogs. Confirm whether the2000ms loop is a prototype demonstration only.

Owner: Neo/shared interaction design; canonical dialog owner. Motion acceptance remains pending; no animation or shared dialog source changed.

