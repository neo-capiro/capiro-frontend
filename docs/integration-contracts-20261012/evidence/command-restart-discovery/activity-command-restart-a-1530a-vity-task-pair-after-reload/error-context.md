# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: activity-command-restart.spec.ts >> a committed command with a lost response cannot create another activity/task pair after reload
- Location: tests/browser/activity-command-restart.spec.ts:19:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 0
```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - paragraph: Synthetic command checks. All service requests are intercepted.
  - dialog "Quick log" [active] [ref=e2]:
    - banner [ref=e3]:
      - heading "Quick log" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Record activity for Synthetic client.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - text: Activity type
        - combobox "Activity type" [disabled] [ref=e12]:
          - option "Note" [selected]
          - option "Call"
          - option "Logged email"
          - option "Decision"
          - option "Request"
      - generic [ref=e13]:
        - button "Record a meeting" [disabled] [ref=e14]
        - generic [ref=e15]: Enter the required start and end times in Calendar.
      - generic [ref=e16]:
        - text: Title
        - textbox "Title" [disabled] [ref=e17]: Restart-sensitive activity
      - generic [ref=e18]:
        - generic [ref=e19]: Details
        - textbox "Details" [disabled] [ref=e20]: Private original body
      - generic [ref=e21]: Logged email records history; it does not send a message.
      - generic [ref=e22]:
        - checkbox "Add generic follow-up" [checked] [disabled] [ref=e23]
        - text: Add generic follow-up
      - group "Generic follow-up" [ref=e24]:
        - generic [ref=e25]: Generic follow-up
        - paragraph [ref=e26]: Creates “Follow up on logged activity” in Planner. The task includes an assignee and optional schedule; activity text and client or person details are not copied.
        - generic [ref=e27]:
          - text: Follow-up assignee
          - combobox "Follow-up assignee" [disabled] [ref=e28]:
            - option "Choose a current member" [disabled]
            - option "Synthetic Assignee" [disabled] [selected]
        - generic [ref=e29]:
          - text: Follow-up date (optional)
          - textbox "Follow-up date (optional)" [disabled] [ref=e30]
        - generic [ref=e31]:
          - text: Follow-up time (optional)
          - textbox "Follow-up time (optional)" [disabled] [ref=e32]
        - generic [ref=e33]:
          - text: Follow-up IANA time zone
          - textbox "Follow-up IANA time zone" [disabled] [ref=e34]:
            - /placeholder: America/New_York
        - generic [ref=e35]: A date requires an explicit time zone. Leave all schedule fields empty for an unscheduled follow-up.
      - region "Activity and follow-up result" [ref=e36]:
        - paragraph [ref=e37]:
          - text: "Retained activity:"
          - strong [ref=e38]: Restart-sensitive activity
        - paragraph [ref=e39]:
          - text: "Request:"
          - code [ref=e40]: 0cfc1611-d607-4c72-8be9-08166eeb98ea
        - alert [ref=e41]: Synthetic response loss after committed activity and task
        - status [ref=e42]: The save result is not confirmed. The original request is retained. Read it before recovery; an unavailable receipt does not mean nothing was saved.
        - button "Read saved command" [ref=e44] [cursor=pointer]
      - button "Save activity and follow-up" [disabled] [ref=e46]
```

# Test source

```ts
  1  | import { test, expect, type Page } from "@playwright/test";
  2  | import { json } from "./fixtures";
  3  | import { commandAssignee } from "../activity-command-fixtures";
  4  | import { completedCommand, installCommands } from "./activity-command-fixtures";
  5  | 
  6  | async function enter(page: Page) {
  7  |   await page
  8  |     .getByLabel("Title", { exact: true })
  9  |     .fill("Restart-sensitive activity");
  10 |   await page
  11 |     .getByLabel("Details", { exact: true })
  12 |     .fill("Private original body");
  13 |   await page.getByRole("checkbox", { name: "Add generic follow-up" }).check();
  14 |   await page
  15 |     .getByRole("combobox", { name: "Follow-up assignee", exact: true })
  16 |     .selectOption(commandAssignee.id);
  17 | }
  18 | 
  19 | test("a committed command with a lost response cannot create another activity/task pair after reload", async ({
  20 |   page,
  21 | }) => {
  22 |   const { state } = await installCommands(page);
  23 |   const persisted = new Map<string, ReturnType<typeof completedCommand>>();
  24 |   state.respond = async (route) => {
  25 |     const request = route.request();
  26 |     if (request.method() === "POST") {
  27 |       const input = request.postDataJSON();
  28 |       if (!persisted.has(input.requestId))
  29 |         persisted.set(input.requestId, completedCommand(input));
  30 |       return json(
  31 |         route,
  32 |         {
  33 |           message: "Synthetic response loss after committed activity and task",
  34 |         },
  35 |         503,
  36 |       );
  37 |     }
  38 |     const requestId = new URL(request.url()).pathname.split("/").pop()!;
  39 |     return json(
  40 |       route,
  41 |       persisted.get(requestId) ?? { message: "Not found" },
  42 |       persisted.has(requestId) ? 200 : 404,
  43 |     );
  44 |   };
  45 |   await page.goto("/activity-command.html");
  46 |   await enter(page);
  47 |   await page
  48 |     .getByRole("button", { name: "Save activity and follow-up", exact: true })
  49 |     .click();
  50 |   await expect(page.getByText(/original request is retained/i)).toBeVisible();
  51 |   const original = structuredClone(state.input);
> 52 |   expect(persisted.size).toBe(1);
     |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  53 |   await page.reload();
  54 |   await page
  55 |     .locator("button:not([disabled])")
  56 |     .filter({ hasText: /^(Read saved command|Save activity)$/ })
  57 |     .first()
  58 |     .waitFor();
  59 |   if (
  60 |     await page
  61 |       .getByRole("button", { name: "Read saved command", exact: true })
  62 |       .isVisible()
  63 |   ) {
  64 |     await page
  65 |       .getByRole("button", { name: "Read saved command", exact: true })
  66 |       .click();
  67 |     await expect(page.getByText(/follow-up created/i)).toBeVisible();
  68 |   } else {
  69 |     // Independent replay of the observed regression: the UI permits a fresh key.
  70 |     await enter(page);
  71 |     await page
  72 |       .getByRole("button", { name: "Save activity and follow-up", exact: true })
  73 |       .click();
  74 |     await expect(page.getByText(/original request is retained/i)).toBeVisible();
  75 |   }
  76 |   expect(
  77 |     persisted.size,
  78 |     "one durable activity/task pair across browser reload",
  79 |   ).toBe(1);
  80 |   expect(
  81 |     state.calls
  82 |       .filter((call) => call.method === "POST")
  83 |       .map((call) => call.body),
  84 |   ).toEqual([original]);
  85 | });
  86 | 
```