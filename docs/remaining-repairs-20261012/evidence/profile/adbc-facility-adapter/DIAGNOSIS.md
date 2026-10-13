# Facilities manager test navigation adapter

The frozen `adbc84b2251fe6b06cb7f75030026fba5b4ff498` Portfolio run timed out in `portfolio.spec.ts:92` before any facility mutation. The preserved error context shows the approved `Facilities: Test Aerospace` manager and its focused `Facility name` input. The test instead scopes that input to the removed `Add facility` dialog.

The intended CP-04 manager presentation is already approved and integrated. `FacilitiesCard.tsx:77` opens the manager; `FacilitiesManager.tsx:49` names it for the selected client, starts the inline create editor, and keeps the manager mounted after a confirmed save. `FacilityEditor.tsx:88` labels that inline submit `Save facility`. `FacilityFields.tsx:34` renders the canonical native state selector. `FacilitiesManager.tsx:115` closes only the inline editor after the existing writer's successful receipt; `:140` exposes the separate Done close action. The unchanged `useFacilityWriter.ts:100–105` clears the confirmed attempt, invalidates facilities/representation/district-nexus, and invokes that editor close callback. This failure does not establish an endpoint, request-body, receipt, or refresh defect.

Frozen Figma evidence supports the manager labels: `/tmp/capiro-remaining-profile-evidence/figma-411-58269-part0.txt` has `Facilities: Anduril` at line7, `Save facility` at177–179, and `Done` at191–193. No live Figma query, changed design, source edit, or new capability is involved.

## Deliberate assertion mapping

| Existing test step or assertion | Adapter and preserved meaning |
| --- | --- |
| Plus action named Add facility | Unchanged; still enters creation for the selected client. |
| Dialog named Add facility | Exact `Facilities: ${client.name}` manager, matching the approved client-scoped presentation. |
| Fill state text with tx | Select native TX option. The payload assertion still requires `state: "TX"`; the existing `facility-map.test.ts` lowercase-state normalization assertion remains untouched. |
| Click Add facility to submit | Click Save facility to submit the inline editor. |
| Successful creation closes its editor | Add an explicit assertion that Facility name is no longer visible after save. |
| Saved facility is visible | Add a Saved facilities list assertion before Done, then retain the original page-level Test lab visibility assertion after closing the manager. |
| Dialog is closed | Click Done and retain the original `expect(dialog).not.toBeVisible()`. Automatic editor closure and deliberate manager closure are checked separately. |
| Selected-client endpoint and name/city/state body | Route pattern, GET response sequence, fixture, mutation response and complete request-body assertion are byte-identical. |
| No unexpected requests | Original assertion unchanged. No fixture handler, failure guard, timing budget, retry, skip or request expectation is removed. |

## Full portfolio.spec.ts audit

All five test names remain unchanged. Static source inspection found only the Facilities presentation mismatch in this file; this is not a claim that the other four tests passed on the final integrated runtime.

- Objective readiness retains the existing New objective region, Confirm ready controls, validation/readiness labels, requestId, transition payload/version, refreshed Ready chip, two-write and unexpected-request checks. No source-locator mismatch found.
- Facilities uses the explicit adapter above. Every original assertion remains present, with two additional successful-save assertions.
- Mail already uses `getByLabel("Message", { exact: true }).fill(...)`, which targets the current RichMailEditor contenteditable through its `aria-labelledby` Message label. Existing mailbox selector, review/send dialog names and uncertain-send text remain in root source. No mail test adapter is needed. Recipient payload, zero pre-confirmation attempts, visible provider error, disabled repeat send, uncertain text and exactly one attempt remain unchanged.
- Capability details and registrations retain their existing dialog/details/save controls and legacy registration-code preservation assertion. No source-locator mismatch found.
- Navigation, permission, expiry and mobile-layout test retains the canonical Open client link, Work/Relationships labels, Toggle navigation, permission and session-expiry boundaries. No source-locator mismatch found.

## Static evidence and limits

`preserve.cjs` parses before/after files using the borrowed installed TypeScript parser; it does not import or execute application code. `SOURCE-AST-PRESERVATION.json` confirms all31 original assertion expressions survive exactly, two new assertions are added, all four unrelated test statements are byte-identical, the Facilities endpoint/body handler is byte-identical, and six relevant production sources match frozen qualification bytes. Both test files parse without diagnostics. The existing fixture is unchanged.

The original qualification failure remains at its original path and is referenced by SHA-256 in the receipt. No existing error context, trace, screenshot or earlier evidence packet was overwritten. This isolated adapter is separate from the earlier lowercase timeline correction, on its descendant owner branch. Root owns deliberate integration, the unchanged current-projection replay, all five Portfolio tests, and exact-source combined qualification. No browser, server, runtime test, build, install or typecheck was run for this adapter; no native write or provider call occurred.
