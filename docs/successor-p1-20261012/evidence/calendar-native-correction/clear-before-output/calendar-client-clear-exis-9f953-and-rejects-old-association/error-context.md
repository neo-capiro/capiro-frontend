# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-client-clear.spec.ts >> existing meeting No client sends explicit null and rejects old association
- Location: apps/web/tests/browser/calendar-client-clear.spec.ts:20:3

# Error details

```
Error: expect(received).toHaveProperty(path, value)

Expected path: "clientId"
Received path: []

Expected value: null
Received value: {"description": "", "endsAt": "2026-10-10T15:00:00Z", "location": "Old location", "startsAt": "2026-10-10T14:00:00Z", "subject": "Synthetic meeting"}
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "Synthetic meeting receipt review" [level=1] [ref=e4]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { installFixtures, json, clientId } from "./fixtures";
  3  | const meeting = {
  4  |   id: "meeting-one",
  5  |   subject: "Synthetic meeting",
  6  |   description: null,
  7  |   location: "Old location",
  8  |   startsAt: "2026-10-10T14:00:00Z",
  9  |   endsAt: "2026-10-10T15:00:00Z",
  10 |   status: "scheduled",
  11 |   joinLink: null,
  12 |   visibility: "private",
  13 |   isVirtual: false,
  14 |   meri: null,
  15 |   client: { id: clientId, name: "Synthetic" },
  16 |   attendees: [],
  17 |   preps: [],
  18 | };
  19 | for (const stale of [false, true])
  20 |   test(`existing meeting No client sends explicit null and ${stale ? "rejects old association" : "accepts native clear receipt"}`, async ({
  21 |     page,
  22 |   }) => {
  23 |     await installFixtures(page);
  24 |     const writes: Record<string, unknown>[] = [];
  25 |     await page.route("**/core/engagement/meetings/meeting-one", (route) => {
  26 |       const body = route.request().postDataJSON();
  27 |       writes.push(body);
  28 |       return json(route, {
  29 |         ...meeting,
  30 |         client: stale || body.clientId !== null ? meeting.client : null,
  31 |       });
  32 |     });
  33 |     await page.goto("/calendar-meeting-receipts.html?mode=clear");
  34 |     await page.getByRole("combobox", { name: "Client", exact: true }).selectOption("");
  35 |     await page.getByRole("button", { name: "Save meeting" }).click();
  36 |     await expect.poll(() => writes.length).toBe(1);
> 37 |     expect(writes[0]).toHaveProperty("clientId", null);
     |                       ^ Error: expect(received).toHaveProperty(path, value)
  38 |     if (stale) {
  39 |       await expect(page.getByRole("dialog")).toBeVisible();
  40 |       await expect(page.getByText(/may have completed/)).toBeVisible();
  41 |       await expect(
  42 |         page.getByRole("button", { name: "Save meeting" }),
  43 |       ).toBeDisabled();
  44 |     } else await expect(page.getByRole("dialog")).toHaveCount(0);
  45 |   });
  46 | test("new unscoped meeting omits clientId and accepts backend association", async ({
  47 |   page,
  48 | }) => {
  49 |   await installFixtures(page);
  50 |   const writes: Record<string, unknown>[] = [];
  51 |   await page.route("**/core/engagement/meetings", (route) => {
  52 |     writes.push(route.request().postDataJSON());
  53 |     return json(route, { ...meeting, location: null });
  54 |   });
  55 |   await page.goto("/calendar-meeting-receipts.html?mode=create");
  56 |   await page.getByLabel("Subject", { exact: true }).fill(meeting.subject);
  57 |   await page.getByLabel("Starts", { exact: true }).fill("2026-10-10T14:00");
  58 |   await page.getByLabel("Ends", { exact: true }).fill("2026-10-10T15:00");
  59 |   await page.getByRole("button", { name: "Save meeting" }).click();
  60 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  61 |   expect(writes).toHaveLength(1);
  62 |   expect(writes[0]).not.toHaveProperty("clientId");
  63 | });
  64 | 
```