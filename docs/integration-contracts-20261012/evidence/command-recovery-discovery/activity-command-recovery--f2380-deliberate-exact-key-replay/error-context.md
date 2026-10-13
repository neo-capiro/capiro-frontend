# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: activity-command-recovery.spec.ts >> reload restores the original body only after fresh Core authority; 404 permits only deliberate exact-key replay
- Location: tests/browser/activity-command-recovery.spec.ts:7:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('button', { name: 'Recover original request', exact: true })
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Recover original request', exact: true })

```

```yaml
- dialog "Quick log":
  - banner:
    - heading "Quick log" [level=2]
    - button "Close"
  - paragraph: Record activity for Synthetic client.
  - text: Activity type
  - combobox "Activity type" [disabled]:
    - option "Note" [selected]
    - option "Call"
    - option "Logged email"
    - option "Decision"
    - option "Request"
  - button "Record a meeting" [disabled]
  - text: Enter the required start and end times in Calendar. Title
  - textbox "Title" [disabled]: Private restart activity
  - text: Details
  - textbox "Details" [disabled]: Private restart details
  - text: Logged email records history; it does not send a message.
  - checkbox "Add generic follow-up" [checked] [disabled]
  - text: Add generic follow-up
  - group "Generic follow-up":
    - text: Generic follow-up
    - paragraph: Creates “Follow up on logged activity” in Planner. The task includes an assignee and optional schedule; activity text and client or person details are not copied.
    - text: Follow-up assignee
    - combobox "Follow-up assignee" [disabled]:
      - option "Choose a current member" [disabled] [selected]
      - option "Synthetic Assignee" [disabled]
    - text: Follow-up date (optional)
    - textbox "Follow-up date (optional)" [disabled]
    - text: Follow-up time (optional)
    - textbox "Follow-up time (optional)" [disabled]
    - text: Follow-up IANA time zone
    - textbox "Follow-up IANA time zone" [disabled]:
      - /placeholder: America/New_York
    - text: A date requires an explicit time zone. Leave all schedule fields empty for an unscheduled follow-up.
  - region "Activity and follow-up result":
    - paragraph:
      - text: "Retained activity:"
      - strong: Private restart activity
    - paragraph:
      - text: "Request:"
      - code: 4516b06d-5537-4e25-b6a6-af61b436e4df
    - alert: Not found
    - status: The save result is not confirmed. The original request is retained. Read it before recovery; an unavailable receipt does not mean nothing was saved.
    - button "Read saved command"
    - button "Recover original save"
  - button "Save activity and follow-up" [disabled]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { commandActor, commandAssignee } from "../activity-command-fixtures";
  3  | import { commandEvent } from "./activity-command-fixtures";
  4  | import { expectHold, expectRetained, retainedCommand } from "./activity-command-recovery-fixtures";
  5  | import { json } from "./fixtures";
  6  | 
  7  | test("reload restores the original body only after fresh Core authority; 404 permits only deliberate exact-key replay", async ({ page }) => {
  8  |   const saved = await retainedCommand(page);
  9  |   let reads = 0;
  10 |   let release!: () => void;
  11 |   const hold = new Promise<void>((resolve) => { release = resolve; });
  12 |   await page.route("**/api/backend/core/me", async (route) => {
  13 |     reads++;
  14 |     await hold;
  15 |     return json(route, saved.state.identity);
  16 |   });
  17 |   await page.reload();
  18 |   await expect.poll(() => reads).toBeGreaterThan(0);
  19 |   await expect(page.getByLabel("Title", { exact: true })).not.toHaveValue("Private restart activity");
  20 |   expect(saved.posts()).toHaveLength(1);
  21 |   release();
  22 |   await expectRetained(page, saved.original.requestId);
  23 |   expect(reads).toBeGreaterThanOrEqual(2);
  24 |   expect(saved.state.calls).toHaveLength(1);
  25 |   await page.getByRole("button", { name: "Read saved command", exact: true }).click();
> 26 |   await expect(page.getByRole("button", { name: "Recover original request", exact: true })).toBeEnabled();
     |                                                                                             ^ Error: expect(locator).toBeEnabled() failed
  27 |   expect(saved.posts()).toHaveLength(1);
  28 |   saved.allowReplay();
  29 |   await page.getByRole("button", { name: "Recover original request", exact: true }).click();
  30 |   await expect(page.getByText(/follow-up created.*synthetic-planner-task/i)).toBeVisible();
  31 |   expect(saved.posts().map((call) => call.body)).toEqual([saved.original, saved.original]);
  32 |   expect(saved.pairs.size).toBe(1);
  33 |   expect(saved.unexpected).toEqual([]);
  34 | });
  35 | 
  36 | for (const replacement of ["actor", "tenant"] as const) {
  37 |   test(`a replacement Core ${replacement} never sees or dispatches the retained body after reload`, async ({ page }) => {
  38 |     const saved = await retainedCommand(page);
  39 |     saved.state.identity = replacement === "actor" ? {
  40 |       ...saved.state.identity, user: { ...saved.state.identity.user, id: commandAssignee.id },
  41 |     } : {
  42 |       ...saved.state.identity, tenant: { ...saved.state.identity.tenant, id: commandAssignee.id },
  43 |     };
  44 |     await page.reload();
  45 |     await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
  46 |     await expect(page.getByLabel("Details", { exact: true })).toHaveValue("");
  47 |     await expect(page.getByText(saved.original.requestId, { exact: true })).toHaveCount(0);
  48 |     await expect(page.getByRole("button", { name: /Read saved command|Recover original request/ })).toHaveCount(0);
  49 |     expect(saved.posts()).toHaveLength(1);
  50 |     expect(saved.pairs.size).toBe(1);
  51 |     expect(saved.unexpected).toEqual([]);
  52 |   });
  53 | }
  54 | 
  55 | test("expiry hides the draft immediately; restoring the same current actor recovers the original without posting", async ({ page }) => {
  56 |   const saved = await retainedCommand(page);
  57 |   await commandEvent(page, "identity", { user: { id: commandActor.userId, email: null }, tenant: null, role: null });
  58 |   await expect(page.getByLabel("Title", { exact: true })).not.toHaveValue("Private restart activity");
  59 |   await expect(page.getByText(saved.original.requestId, { exact: true })).toHaveCount(0);
  60 |   await commandEvent(page, "identity", saved.state.identity);
  61 |   await expectRetained(page, saved.original.requestId);
  62 |   expect(saved.posts()).toHaveLength(1);
  63 | });
  64 | 
  65 | test("current client authorization refusal holds recovery without decrypting or posting; explicit retry rereads authority", async ({ page }) => {
  66 |   const saved = await retainedCommand(page);
  67 |   const path = "**/api/backend/core/clients/10000000-0000-4000-8000-000000000001";
  68 |   await page.route(path, (route) => json(route, { message: "Synthetic current client revoked" }, 403));
  69 |   await page.reload();
  70 |   await expectHold(page);
  71 |   await expect(page.getByText(saved.original.requestId, { exact: true })).toHaveCount(0);
  72 |   expect(saved.posts()).toHaveLength(1);
  73 |   await page.unroute(path);
  74 |   await page.getByRole("button", { name: "Retry saved-command recovery", exact: true }).click();
  75 |   await expectRetained(page, saved.original.requestId);
  76 |   expect(saved.posts()).toHaveLength(1);
  77 | });
  78 | 
  79 | test("explicit acknowledgement erases the sensitive journal payload and permits the next intent after reload", async ({ page }) => {
  80 |   const saved = await retainedCommand(page);
  81 |   saved.allowReceipt();
  82 |   await page.getByRole("button", { name: "Read saved command", exact: true }).click();
  83 |   await expect(page.getByText(/follow-up created/i)).toBeVisible();
  84 |   await page.getByRole("button", { name: "Done", exact: true }).click();
  85 |   await expect(page.getByText("Quick log view closed.")).toBeVisible();
  86 |   await page.reload();
  87 |   await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
  88 |   await expect(page.getByRole("button", { name: "Read saved command", exact: true })).toHaveCount(0);
  89 |   expect(saved.posts()).toHaveLength(1);
  90 |   expect(saved.unexpected).toEqual([]);
  91 | });
  92 | 
```