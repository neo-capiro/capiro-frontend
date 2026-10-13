# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manager-review.spec.ts >> inline facility recovery adopts the reviewed record after remote update
- Location: apps/web/tests/browser/facility-manager-review.spec.ts:10:7

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByRole('dialog', { name: 'Facilities: Synthetic profile client', exact: true }).getByLabel('Notes', { exact: true })
Expected: "Authoritative current note"
Received: "Saved facility notes"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Facilities: Synthetic profile client', exact: true }).getByLabel('Notes', { exact: true })
    14 × locator resolved to <textarea id="_r_8_" name="notes">Saved facility notes</textarea>
       - unexpected value "Saved facility notes"

```

```yaml
- textbox "Notes": Saved facility notes
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import {
  3  |   installProfileCurrentState,
  4  |   profileEvent,
  5  | } from "./profile-current-state-fixtures";
  6  | import { profileFacility } from "../profile-current-state-fixtures";
  7  | import { json } from "./fixtures";
  8  | 
  9  | for (const outcome of ["remote update", "uncertain applied edit"] as const)
  10 |   test(`inline facility recovery adopts the reviewed record after ${outcome}`, async ({
  11 |     page,
  12 |   }) => {
  13 |     const { state, unexpected } = await installProfileCurrentState(page);
  14 |     await page.goto("/profile-current-state.html?mode=facilities");
  15 |     await page
  16 |       .getByRole("button", { name: "Add facility", exact: true })
  17 |       .click();
  18 |     const manager = page.getByRole("dialog", {
  19 |       name: "Facilities: Synthetic profile client",
  20 |       exact: true,
  21 |     });
  22 |     await manager.getByRole("button", { name: "Edit", exact: true }).click();
  23 |     await manager
  24 |       .getByLabel("Notes", { exact: true })
  25 |       .fill("Local unsaved note");
  26 |     const saved = { ...profileFacility, notes: "Authoritative current note" };
  27 |     if (outcome === "remote update") {
  28 |       state.facilities = [saved];
  29 |       await profileEvent(page, "refresh");
  30 |       await expect(
  31 |         manager.getByText(/saved facility changed or is unavailable/i),
  32 |       ).toBeVisible();
  33 |     } else {
  34 |       state.write = (route) => {
  35 |         state.facilities = [saved];
  36 |         return json(route, { message: "Synthetic lost edit receipt" }, 503);
  37 |       };
  38 |       await manager
  39 |         .getByRole("button", { name: "Save facility", exact: true })
  40 |         .click();
  41 |       await expect(
  42 |         manager.getByText(/facility change result is unknown/i),
  43 |       ).toBeVisible();
  44 |     }
  45 |     await expect(manager.getByLabel("Notes", { exact: true })).toHaveValue(
  46 |       "Local unsaved note",
  47 |     );
  48 |     await expect(
  49 |       manager.getByRole("button", { name: "Save facility", exact: true }),
  50 |     ).toBeDisabled();
  51 |     await manager
  52 |       .getByRole("button", { name: "Review current facilities", exact: true })
  53 |       .click();
  54 |     await manager
  55 |       .getByRole("button", { name: "Use the reviewed facility", exact: true })
  56 |       .click();
> 57 |     await expect(manager.getByLabel("Notes", { exact: true })).toHaveValue(
     |                                                                ^ Error: expect(locator).toHaveValue(expected) failed
  58 |       "Authoritative current note",
  59 |     );
  60 |     await expect(
  61 |       manager.getByRole("button", { name: "Save facility", exact: true }),
  62 |     ).toBeEnabled();
  63 |     expect(state.writes).toHaveLength(outcome === "remote update" ? 0 : 1);
  64 |     expect(unexpected).toEqual([]);
  65 |   });
  66 | 
```