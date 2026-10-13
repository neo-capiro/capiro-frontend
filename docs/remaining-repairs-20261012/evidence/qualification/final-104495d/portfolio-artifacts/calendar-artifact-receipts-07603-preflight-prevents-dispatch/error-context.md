# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-artifact-receipts.spec.ts >> notes: replacing the client during preflight prevents dispatch
- Location: tests/browser/calendar-artifact-receipts.spec.ts:185:3

# Error details

```
Error: locator.fill: Target page, context or browser has been closed
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { installFixtures, json } from "./fixtures";
  3   | 
  4   | const meeting = {
  5   |   id: "meeting-one",
  6   |   subject: "Synthetic receipt review",
  7   |   description: null,
  8   |   location: null,
  9   |   startsAt: "2026-10-10T14:00:00Z",
  10  |   endsAt: "2026-10-10T15:00:00Z",
  11  |   status: "scheduled",
  12  |   joinLink: null,
  13  |   visibility: "private",
  14  |   isVirtual: false,
  15  |   meri: null,
  16  |   client: { id: "client-one", name: "client-one" },
  17  |   attendees: [],
  18  |   preps: [],
  19  | };
  20  | const metadata = {
  21  |   id: "artifact-one",
  22  |   meetingId: meeting.id,
  23  |   clientId: "client-one",
  24  |   authorUserId: "user-test",
  25  |   confidential: false,
  26  |   status: "draft",
  27  |   sharedAt: null,
  28  |   sharedByUserId: null,
  29  |   createdAt: "2026-10-10T15:00:00Z",
  30  |   updatedAt: "2026-10-10T15:00:00Z",
  31  | };
  32  | function createdMetadata(kind: string) {
  33  |   return {
  34  |     ...metadata,
  35  |     status: kind === "notes" ? "draft" : "generated",
  36  |     ...(kind === "notes" ? { approvedAt: null, approvedByUserId: null } : {}),
  37  |   };
  38  | }
  39  | function held() {
  40  |   let release!: () => void;
  41  |   const promise = new Promise<void>((resolve) => {
  42  |     release = resolve;
  43  |   });
  44  |   return { promise, release };
  45  | }
  46  | async function setup(page: Page, kind: string) {
  47  |   await installFixtures(page);
  48  |   const state = {
  49  |     writes: 0,
  50  |     requests: [] as { path: string; method: string; body: unknown }[],
  51  |     receipt: createdMetadata(kind) as unknown,
  52  |     status: 200,
  53  |     hold: undefined as Promise<void> | undefined,
  54  |     readHold: undefined as Promise<void> | undefined,
  55  |     reads: 0,
  56  |     clientId: "client-one",
  57  |     items: [] as unknown[],
  58  |   };
  59  |   await page.route("**/core/engagement/meetings/**", async (route) => {
  60  |     if (route.request().method() !== "GET") {
  61  |       state.writes++;
  62  |       state.requests.push({
  63  |         path: new URL(route.request().url()).pathname,
  64  |         method: route.request().method(),
  65  |         body: route.request().postData()
  66  |           ? route.request().postDataJSON()
  67  |           : undefined,
  68  |       });
  69  |       if (state.hold) await state.hold;
  70  |       return json(route, state.receipt, state.status).catch(() => {});
  71  |     }
  72  |     if (new URL(route.request().url()).pathname.endsWith(`/${kind}`))
  73  |       return json(route, state.items);
  74  |     state.reads++;
  75  |     if (state.readHold) await state.readHold;
  76  |     return json(route, {
  77  |       ...meeting,
  78  |       client: { id: state.clientId, name: state.clientId },
  79  |     }).catch(() => {});
  80  |   });
  81  |   await page.goto(`/calendar-artifact-receipts.html?kind=${kind}`);
  82  |   await expect(page.getByText(`No ${kind} yet.`)).toBeVisible();
  83  |   return state;
  84  | }
  85  | async function draft(page: Page, singular: string) {
  86  |   await page
  87  |     .getByRole("button", { name: `Add ${singular}`, exact: true })
  88  |     .click();
  89  |   await page
  90  |     .getByLabel("Content", { exact: true })
> 91  |     .fill("Retain this synthetic draft");
      |      ^ Error: locator.fill: Target page, context or browser has been closed
  92  | }
  93  | for (const kind of ["notes", "debriefs"]) {
  94  |   const singular = kind === "notes" ? "note" : "debrief";
  95  |   test(`${kind}: malformed receipt preserves draft and fences repeat creation`, async ({
  96  |     page,
  97  |   }) => {
  98  |     const state = await setup(page, kind);
  99  |     state.receipt = {};
  100 |     await draft(page, singular);
  101 |     await page.getByRole("button", { name: `Save ${singular}` }).click();
  102 |     await expect(page.getByLabel("Content", { exact: true })).toHaveValue(
  103 |       "Retain this synthetic draft",
  104 |     );
  105 |     await expect(
  106 |       page.getByRole("button", { name: `Save ${singular}` }),
  107 |     ).toBeDisabled();
  108 |     await expect(page.getByText(/may have completed/).first()).toBeVisible();
  109 |     expect(state.writes).toBe(1);
  110 |   });
  111 |   test(`${kind}: uncertain creation cannot be repeated after remount`, async ({
  112 |     page,
  113 |   }) => {
  114 |     const state = await setup(page, kind);
  115 |     state.status = 503;
  116 |     await draft(page, singular);
  117 |     await page.getByRole("button", { name: `Save ${singular}` }).click();
  118 |     await expect(
  119 |       page.getByRole("button", { name: `Save ${singular}` }),
  120 |     ).toBeDisabled();
  121 |     await expect(page.getByText(/may have completed/).first()).toBeVisible();
  122 |     if (kind === "debriefs")
  123 |       await expect(
  124 |         page.getByRole("button", { name: "Type Notes Manually", exact: true }),
  125 |       ).toHaveCount(0);
  126 |     await page.keyboard.press("Escape");
  127 |     await page.getByRole("button", { name: `Refresh saved ${kind}` }).click();
  128 |     await page.getByRole("button", { name: "Toggle artifacts" }).click();
  129 |     await page.getByRole("button", { name: "Toggle artifacts" }).click();
  130 |     await expect(page.getByLabel("Content", { exact: true })).toHaveValue(
  131 |       "Retain this synthetic draft",
  132 |     );
  133 |     await expect(
  134 |       page.getByRole("button", { name: `Save ${singular}` }),
  135 |     ).toBeDisabled();
  136 |     expect(state.writes).toBe(1);
  137 |   });
  138 |   test(`${kind}: synchronous submit guard sends one creation`, async ({
  139 |     page,
  140 |   }) => {
  141 |     const state = await setup(page, kind);
  142 |     const pending = held();
  143 |     state.hold = pending.promise;
  144 |     await draft(page, singular);
  145 |     await page.locator("[role=dialog] form").evaluate((form) => {
  146 |       form.dispatchEvent(
  147 |         new Event("submit", { bubbles: true, cancelable: true }),
  148 |       );
  149 |       form.dispatchEvent(
  150 |         new Event("submit", { bubbles: true, cancelable: true }),
  151 |       );
  152 |     });
  153 |     await expect.poll(() => state.writes).toBeGreaterThan(0);
  154 |     pending.release();
  155 |     await expect(page.getByRole("dialog")).toHaveCount(0);
  156 |     expect(state.writes).toBe(1);
  157 |   });
  158 | }
  159 | 
  160 | for (const kind of ["notes", "debriefs"]) {
  161 |   const singular = kind === "notes" ? "note" : "debrief";
  162 |   test(`${kind}: a known refusal retains editable draft and permits deliberate retry`, async ({
  163 |     page,
  164 |   }) => {
  165 |     const state = await setup(page, kind);
  166 |     state.status = 409;
  167 |     state.receipt = { message: "Synthetic conflict; review and retry" };
  168 |     await draft(page, singular);
  169 |     await page.getByRole("button", { name: `Save ${singular}` }).click();
  170 |     await expect(
  171 |       page.getByText("Synthetic conflict; review and retry").first(),
  172 |     ).toBeVisible();
  173 |     await expect(
  174 |       page.getByRole("button", { name: `Save ${singular}` }),
  175 |     ).toBeEnabled();
  176 |     await expect(page.getByLabel("Content", { exact: true })).toHaveValue(
  177 |       "Retain this synthetic draft",
  178 |     );
  179 |     state.status = 200;
  180 |     state.receipt = createdMetadata(kind);
  181 |     await page.getByRole("button", { name: `Save ${singular}` }).click();
  182 |     await expect(page.getByRole("dialog")).toHaveCount(0);
  183 |     expect(state.writes).toBe(2);
  184 |   });
  185 |   test(`${kind}: replacing the client during preflight prevents dispatch`, async ({
  186 |     page,
  187 |   }) => {
  188 |     const state = await setup(page, kind);
  189 |     const pending = held();
  190 |     state.readHold = pending.promise;
  191 |     await draft(page, singular);
```