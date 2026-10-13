# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timeline-review.spec.ts >> uncertain activity stays fenced through native pinned regrouping
- Location: apps/web/tests/browser/timeline-presentation-lifetime.spec.ts:26:7

# Error details

```
Error: page.goto: Test ended.
Call log:
  - navigating to "http://127.0.0.1:5299/portfolio/10000000-0000-4000-8000-000000000001", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { clientId, installFixtures, json } from "./fixtures";
  3   | const note = {
  4   |   id: "90000000-0000-4000-8000-000000000001",
  5   |   kind: "note",
  6   |   title: "Uncertain timeline note",
  7   |   body: "Recorded detail",
  8   |   occurredAt: "2026-10-11T12:00:00Z",
  9   |   origin: "recorded",
  10  |   sourceType: null,
  11  |   sourceId: null,
  12  |   dueAt: null,
  13  |   settledAt: null,
  14  |   pinned: false,
  15  | };
  16  | const newer = {
  17  |   ...note,
  18  |   id: "90000000-0000-4000-8000-000000000002",
  19  |   title: "Newer note",
  20  |   occurredAt: "2026-10-12T12:00:00Z",
  21  | };
  22  | for (const transition of [
  23  |   "expand and return",
  24  |   "native pinned regrouping",
  25  | ] as const)
  26  |   test(`uncertain activity stays fenced through ${transition}`, async ({
  27  |     page,
  28  |   }) => {
  29  |     const unexpected = await installFixtures(page);
  30  |     let current = [newer, note];
  31  |     let writes = 0;
  32  |     await page.route(`**/clients/${clientId}/activity**`, (route) => {
  33  |       if (route.request().method() === "GET") return json(route, current);
  34  |       writes++;
  35  |       if (transition === "native pinned regrouping")
  36  |         current = [{ ...note, pinned: true }, newer];
  37  |       return json(route, { message: "Synthetic uncertain timeline pin" }, 503);
  38  |     });
> 39  |     await page.goto(`/portfolio/${clientId}`);
      |                ^ Error: page.goto: Test ended.
  40  |     const timeline = page.getByRole("region", {
  41  |       name: "Activity timeline",
  42  |       exact: true,
  43  |     });
  44  |     await timeline
  45  |       .getByRole("button", {
  46  |         name: `Activity actions: ${note.title}`,
  47  |         exact: true,
  48  |       })
  49  |       .click();
  50  |     await page.getByRole("menuitem", { name: "Pin note", exact: true }).click();
  51  |     await expect.poll(() => writes).toBe(1);
  52  |     if (transition === "expand and return") {
  53  |       await expect(
  54  |         timeline.getByRole("button", {
  55  |           name: "Review latest activity",
  56  |           exact: true,
  57  |         }),
  58  |       ).toBeVisible();
  59  |       await timeline
  60  |         .getByRole("button", { name: "Expand timeline ↗", exact: true })
  61  |         .click();
  62  |       await page
  63  |         .getByRole("dialog", { name: "Engagement timeline", exact: true })
  64  |         .getByRole("button", { name: "Return to profile", exact: true })
  65  |         .click();
  66  |     }
  67  |     await expect(
  68  |       timeline.getByRole("button", {
  69  |         name: "Review latest activity",
  70  |         exact: true,
  71  |       }),
  72  |     ).toBeVisible();
  73  |     await timeline
  74  |       .getByRole("button", {
  75  |         name: `Activity actions: ${note.title}`,
  76  |         exact: true,
  77  |       })
  78  |       .click();
  79  |     await expect(
  80  |       page.getByRole("menuitem", { name: /^Pin note$|^Unpin note$/ }),
  81  |     ).toHaveAttribute("data-disabled", "");
  82  |     await page.keyboard.press("Escape");
  83  |     expect(writes).toBe(1);
  84  |     expect(unexpected).toEqual([]);
  85  |   });
  86  | 
  87  | test("pending activity stays fenced while its response is held across expand and return", async ({
  88  |   page,
  89  | }) => {
  90  |   const unexpected = await installFixtures(page);
  91  |   let writes = 0;
  92  |   let release!: () => void;
  93  |   const pending = new Promise<void>((resolve) => {
  94  |     release = resolve;
  95  |   });
  96  |   await page.route(`**/clients/${clientId}/activity**`, async (route) => {
  97  |     if (route.request().method() === "GET") return json(route, [note]);
  98  |     writes++;
  99  |     await pending;
  100 |     return json(route, { message: "Synthetic held pin reply" }, 503).catch(
  101 |       () => {},
  102 |     );
  103 |   });
  104 |   await page.goto(`/portfolio/${clientId}`);
  105 |   const timeline = page.getByRole("region", {
  106 |     name: "Activity timeline",
  107 |     exact: true,
  108 |   });
  109 |   const action = timeline.getByRole("button", {
  110 |     name: `Activity actions: ${note.title}`,
  111 |     exact: true,
  112 |   });
  113 |   await action.click();
  114 |   await page.getByRole("menuitem", { name: "Pin note", exact: true }).click();
  115 |   await expect.poll(() => writes).toBe(1);
  116 |   try {
  117 |     await timeline
  118 |       .getByRole("button", { name: "Expand timeline ↗", exact: true })
  119 |       .click();
  120 |     await page
  121 |       .getByRole("dialog", { name: "Engagement timeline", exact: true })
  122 |       .getByRole("button", { name: "Return to profile", exact: true })
  123 |       .click();
  124 |     await expect(action).toBeDisabled();
  125 |   } finally {
  126 |     release();
  127 |   }
  128 |   await expect(
  129 |     timeline.getByRole("button", {
  130 |       name: "Review latest activity",
  131 |       exact: true,
  132 |     }),
  133 |   ).toBeVisible();
  134 |   expect(writes).toBe(1);
  135 |   expect(unexpected).toEqual([]);
  136 | });
  137 | 
  138 | test("expanded Log activity reuses the existing Quick log uncertain creation owner", async ({
  139 |   page,
```