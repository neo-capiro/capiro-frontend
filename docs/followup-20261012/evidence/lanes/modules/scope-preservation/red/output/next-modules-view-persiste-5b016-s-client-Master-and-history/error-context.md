# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: next-modules-view-persistence.spec.ts >> Calendar keeps Week and chosen date across client, Master and history
- Location: apps/web/test/browser/next-modules-view-persistence.spec.ts:5:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('button', { name: 'Week', exact: true })
Expected: "true"
Received: "false"
Timeout:  4000ms

Call log:
  - Expect "toHaveAttribute" with timeout 4000ms
  - waiting for getByRole('button', { name: 'Week', exact: true })
    12 × locator resolved to <button type="button" aria-pressed="false">Week</button>
       - unexpected value "false"

```

```yaml
- button "Week"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { clientId, otherClientId, setup } from "./next-modules-fixtures";
  3  | 
  4  | for (const view of ["Month", "Week", "Agenda"] as const) {
  5  |   test(`Calendar keeps ${view} and chosen date across client, Master and history`, async ({
  6  |     page,
  7  |   }) => {
  8  |     await setup(page);
  9  |     await page.goto("/modules/calendar");
  10 |     await page.getByRole("button", { name: view, exact: true }).click();
  11 |     await page
  12 |       .getByRole("button", { name: "Choose calendar date", exact: true })
  13 |       .click();
  14 |     await page.getByLabel("Calendar date", { exact: true }).fill("2027-02-17");
  15 |     await page.getByRole("button", { name: "Done", exact: true }).click();
  16 |     const title = await page
  17 |       .getByRole("button", { name: "Choose calendar date", exact: true })
  18 |       .textContent();
  19 |     const check = async (scope: string) => {
  20 |       await expect(page.getByLabel("Calendar client scope")).toHaveValue(scope);
  21 |       await expect(
  22 |         page.getByRole("button", { name: view, exact: true }),
> 23 |       ).toHaveAttribute("aria-pressed", "true");
     |         ^ Error: expect(locator).toHaveAttribute(expected) failed
  24 |       await expect(
  25 |         page.getByRole("button", { name: "Choose calendar date", exact: true }),
  26 |       ).toHaveText(title!);
  27 |       await page
  28 |         .getByRole("button", { name: "Choose calendar date", exact: true })
  29 |         .click();
  30 |       await expect(
  31 |         page.getByLabel("Calendar date", { exact: true }),
  32 |       ).toHaveValue("2027-02-17");
  33 |       await page.getByRole("button", { name: "Done", exact: true }).click();
  34 |     };
  35 |     await page.getByLabel("Calendar client scope").selectOption(clientId);
  36 |     await check(clientId);
  37 |     await page.getByLabel("Calendar client scope").selectOption(otherClientId);
  38 |     await check(otherClientId);
  39 |     await page.getByLabel("Calendar client scope").selectOption("");
  40 |     await check("");
  41 |     await page.goBack();
  42 |     await check(otherClientId);
  43 |     await page.goBack();
  44 |     await check(clientId);
  45 |     await page.goBack();
  46 |     await check("");
  47 |     await page.goForward();
  48 |     await check(clientId);
  49 |     await page.reload();
  50 |     await check(clientId);
  51 |   });
  52 | }
  53 | 
  54 | test("invalid Calendar URL selection falls back to valid defaults before any date request", async ({
  55 |   page,
  56 | }) => {
  57 |   const queries: unknown[] = [];
  58 |   await setup(page, {
  59 |     "engagement.meetings": (input) => {
  60 |       queries.push(input);
  61 |       return [];
  62 |     },
  63 |   });
  64 |   await page.goto(
  65 |     `/modules/calendar?clientId=${clientId}&view=bogus&date=2026-02-30`,
  66 |   );
  67 |   await expect(
  68 |     page.getByRole("button", { name: "Month", exact: true }),
  69 |   ).toHaveAttribute("aria-pressed", "true");
  70 |   await expect(
  71 |     page.getByRole("button", { name: "Choose calendar date", exact: true }),
  72 |   ).toHaveText("October 2026");
  73 |   await expect.poll(() => queries.length).toBeGreaterThan(0);
  74 |   expect(queries).toEqual([
  75 |     {
  76 |       query: {
  77 |         from: "2026-09-28T04:00:00Z",
  78 |         to: "2026-11-02T05:00:00Z",
  79 |         clientId,
  80 |       },
  81 |     },
  82 |   ]);
  83 | });
  84 | 
```