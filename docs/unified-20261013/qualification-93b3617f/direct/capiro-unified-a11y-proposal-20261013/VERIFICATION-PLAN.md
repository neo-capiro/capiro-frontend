# Proposed verification — not executed

Use a new successor source pin after the current frozen qualification finishes. Keep the six original JSON/PNG receipts and original scripts immutable. Do not interpret the existing 6/6 capture tests as accessibility passes: their assertions validate isolation/source stability, while their saved audit data contains violations.

1. Reuse `/tmp/capiro-unified-figma-capture-plan-20261013/a11y.spec.ts` and its existing fixtures. Keep **exactly** `axe.run(document)` with no options, rule filtering, element exclusion or suppression, axe-core 4.14.0 with SHA256 `20c09fe157a8a34a30e241aaa1fcdade657734f08ab379ecfbeb7d45cc46e878`, Chromium configuration, readiness waits and the 1440×1040 / 390×844 light viewports. Save complete violations, incomplete, passes and inapplicable arrays plus screenshots. External relocation may change only worktree/expected source pin/output paths/assigned origin ports, recorded as an exact diff. Require empty unexpected/blocked/page-error arrays and source-before=source-after.
2. Make the **same new assertions** run on untouched `93b3617f` and the applied candidate. On each of the six pages, after saving the full raw audit, assert its complete `violations` array is empty. The original raw results already establish red values of 4/4 Portfolio, 5/3 Meri and 32/32 Modules violating node instances; run the unchanged final assertion specification on that baseline for a true red receipt before green. Keep every `incomplete` result in the report; do not assert it empty or relabel it passed. Gradient/short-text manual checks require their own evidence.
3. Run the original relevant navigation/name/attention tests unchanged. In particular preserve `portfolio.spec.ts`'s exact `getByRole("link", { name: "Open Test Aerospace", exact: true })`, navigation, permissions, session-expiry and mobile checks; preserve every `portfolio-attention.spec.ts` `getByLabel("N shown alerts")` assertion. Preserve the original Meri mobile navigation and Back/Forward/no-action controls.
4. Add bounded semantic and keyboard controls using existing `installFixtures`, `operationFixtures`, and the sequential `tabTo` pattern in `meri-action-host-mobile-navigation.spec.ts:14` (it is a local helper, not currently exported). These controls must be identical before/after; do not use forced `.focus()` as proof of sequential keyboard navigation. Every request remains intercepted, with exact assigned-origin guards; navigating the UI must produce no provider/native writes.

| Proposed control | Required evidence / expectation | Expected untouched baseline behavior |
| --- | --- | --- |
| Portfolio heading/name/description, both sizes | Unique exact-name link `Open Test Aerospace`; H2 containing that link; accessible description exactly `Aerospace` in the default fixture. Sector text visibly remains and is not under `aria-hidden`. A second client with location has its own `useId` description and no cross-client description. | H2 and accessible-description requirements fail. |
| Portfolio keyboard navigation | Reach that link by Tab; Shift+Tab and Tab preserve one focus stop; visible focus indicator; Enter reaches the exact existing client route; Back/Forward preserve route behavior. | Original navigation remains a positive control. |
| Portfolio card pointer target | Click the logo/sector portion of card top at an unforced visible coordinate and arrive at the same client route; never let the stretched pseudo-element cover the bottom status/owner or neighboring card. | Existing full link is a positive control. |
| Portfolio metadata and fallback | Exact sector/location and missing-sector fallback remain visible; accessible description follows them. Owner accessible name is retained for both supplied owner and unavailable fallback; status annotation still reports `Profile status: ACTIVE`. Long names preserve ellipsis without horizontal overflow at 390px. | Description and valid named-owner role fail; visual text positive. |
| Meri landmark/note | One `contentinfo` contains one note with the exact existing notice text. Exercise both `actionWorkflow=false` and true with existing action-host fixture. Default fixture notice must remain visible; do not remove disconnected-state text. | No valid contentinfo around the note. |
| Meri suggestions | `getByRole("group", { name: "Draft suggestions", exact: true })` contains the original three Start buttons; reach a Start control by keyboard and retain original draft behavior. No added tab stop on the group. | Named group requirement fails. |
| Modules fixture notice | `getByRole("complementary", { name: "Local test fixture", exact: true })` visibly contains exact synthetic-identity text, remains distinct from Module navigation, is not a tab stop, and does not obstruct controls. Also check public form fixture notice because it uses the same source owner. | Named complementary fixture landmark absent. |
| Cross-mode positive controls | Existing mode links and Meri action navigation retain current client and Back/Forward behavior; no new requests/writes, duplicate navigation owners or focus traps. | Must remain positive. |
| Light/dark token scope | Report computed token and actual foreground/background for each previously violating node at both sizes. Portfolio dark override remains `#aaa29c`, original dark backgrounds remain, and card focus/name/description work there. Other modes retain existing theme behavior. | Light normal-size muted text fails 4.5:1; no claim of prior dark failure. |

Example unchanged targeted assertions (after normal fixture setup and readiness):

```ts
const open = page.getByRole("link", { name: "Open Test Aerospace", exact: true });
await expect(open).toHaveAccessibleName("Open Test Aerospace");
await expect(open).toHaveAccessibleDescription("Aerospace");
await expect(page.getByRole("heading", { level: 2 }).filter({ has: open })).toHaveCount(1);
const descriptionId = await open.getAttribute("aria-describedby");
expect(descriptionId).toBeTruthy();
const metadata = page.locator(`[id=${JSON.stringify(descriptionId)}]`);
await expect(metadata).toBeVisible();
await expect(metadata).toHaveText("Aerospace");
expect(await metadata.evaluate(el => !!el.closest('[aria-hidden="true"]'))).toBe(false);
```

Manual review remains separate: inspect the browser accessibility tree and at least one real screen-reader/browser pairing for name→description announcement, heading/landmark navigation, owner/count annotations and duplication. Check gradient endpoints plus rendered compositing, icon/short text legibility, zoom/reflow, focus visibility/occlusion and touch targets. An automated default axe result alone cannot establish full WCAG conformance or all-product accessibility. No full Figma, native provider, authenticated Clerk or production-state verification is claimed by these synthetic controls.
