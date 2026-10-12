# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meeting-detail-current.spec.ts >> MS06 baseline: meetings retain selectable list beside current detail with Prep entry
- Location: apps/web/test/browser/meeting-detail-current.spec.ts:56:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Selected meeting', exact: true }).getByRole('heading', { name: 'Synthetic briefing alpha' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Selected meeting', exact: true }).getByRole('heading', { name: 'Synthetic briefing alpha' })

```

```yaml
- dialog "Synthetic briefing alpha":
  - banner:
    - heading "Synthetic briefing alpha" [level=2]
    - paragraph: Synthetic Aerospace · 10/12/2026, 2:00:00 PM · Video meeting
    - button "Close dialog": ×
  - text: scheduled private
  - tablist "Meeting materials":
    - tab "Prep"
    - tab "Meeting Notes" [selected]
    - tab "Debrief"
  - paragraph: No meeting notes yet.
  - button "+ Add meeting notes"
  - paragraph: Notes remain private until explicitly shared. Saving and approval are separate.
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
  3   | 
  4   | const meeting = {
  5   |   id: "40000000-0000-4000-8000-000000000001",
  6   |   subject: "Synthetic briefing alpha",
  7   |   startsAt: "2026-10-12T14:00:00Z",
  8   |   endsAt: "2026-10-12T15:00:00Z",
  9   |   status: "scheduled",
  10  |   location: "Video meeting",
  11  |   description: null,
  12  |   client: {
  13  |     id: "30000000-0000-4000-8000-000000000001",
  14  |     name: "Synthetic Aerospace",
  15  |   },
  16  |   joinLink: "https://meet.example.test/alpha?code=synthetic",
  17  |   preps: [],
  18  |   notes: [],
  19  |   debriefs: [],
  20  |   visibility: "private",
  21  | };
  22  | const second = {
  23  |   ...meeting,
  24  |   id: "40000000-0000-4000-8000-000000000002",
  25  |   subject: "Synthetic briefing beta",
  26  |   joinLink: "https://meet.example.test/beta",
  27  | };
  28  | async function setup(page: Page, detail: object = meeting) {
  29  |   await onlyLocalRequests(page);
  30  |   await operationFixtures(page, {
  31  |     "me.read": testIdentity,
  32  |     "clients.list": [],
  33  |     "engagement.meetings": [meeting, second],
  34  |     "engagement.meeting": detail,
  35  |     "engagement.notes": [],
  36  |     "engagement.debriefs": [],
  37  |   });
  38  | }
  39  | async function openFirst(page: Page) {
  40  |   await page.goto("/modules/engagement?view=meetings");
  41  |   await page.getByRole("button", { name: /Synthetic briefing alpha/ }).click();
  42  | }
  43  | 
  44  | test("MS06 baseline: current supplied link appears with safe external-link attributes", async ({
  45  |   page,
  46  | }) => {
  47  |   await setup(page);
  48  |   await openFirst(page);
  49  |   const join = page.getByRole("link", { name: "Join meeting", exact: true });
  50  |   await expect(join).toHaveAttribute("href", meeting.joinLink);
  51  |   await expect(join).toHaveAttribute("target", "_blank");
  52  |   await expect(join).toHaveAttribute("rel", "noopener noreferrer");
  53  |   await expect(join).toHaveAttribute("referrerpolicy", "no-referrer");
  54  | });
  55  | 
  56  | test("MS06 baseline: meetings retain selectable list beside current detail with Prep entry", async ({
  57  |   page,
  58  | }) => {
  59  |   await setup(page);
  60  |   await openFirst(page);
  61  |   const list = page.getByRole("region", { name: "Meeting list", exact: true });
  62  |   const detail = page.getByRole("region", {
  63  |     name: "Selected meeting",
  64  |     exact: true,
  65  |   });
  66  |   await expect(
  67  |     detail.getByRole("heading", { name: meeting.subject }),
> 68  |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  69  |   await expect(page.getByRole("dialog")).toHaveCount(0);
  70  |   await expect(
  71  |     detail.getByRole("tab", { name: "Prep", exact: true }),
  72  |   ).toHaveAttribute("aria-selected", "true");
  73  |   const left = await list.boundingBox(),
  74  |     right = await detail.boundingBox();
  75  |   expect(left && right && left.x + left.width + 15 <= right.x).toBeTruthy();
  76  |   expect(left?.width).toBe(280);
  77  |   await page.screenshot({
  78  |     path: "test-results/remaining-ms06-desktop.png",
  79  |     fullPage: true,
  80  |   });
  81  | });
  82  | 
  83  | test("MS06 absent preparation metadata is unavailable rather than a claimed empty collection", async ({
  84  |   page,
  85  | }) => {
  86  |   const { preps: omitted, ...detail } = meeting;
  87  |   void omitted;
  88  |   await setup(page, detail);
  89  |   await openFirst(page);
  90  |   await expect(
  91  |     page.getByText("Preparation details were not supplied for this meeting."),
  92  |   ).toBeVisible();
  93  |   await expect(
  94  |     page.getByRole("button", { name: "Generate preparation" }),
  95  |   ).toBeDisabled();
  96  | });
  97  | 
  98  | for (const joinLink of [
  99  |   null,
  100 |   "",
  101 |   "javascript:alert(1)",
  102 |   "data:text/html,hello",
  103 |   "https://name:secret@meet.example.test/",
  104 |   "//meet.example.test/alpha",
  105 | ]) {
  106 |   test(`MS06 missing or unsafe supplied link is inactive: ${joinLink}`, async ({
  107 |     page,
  108 |   }) => {
  109 |     await setup(page, { ...meeting, joinLink });
  110 |     await openFirst(page);
  111 |     await expect(
  112 |       page.getByRole("tab", { name: "Prep", exact: true }),
  113 |     ).toBeVisible();
  114 |     await expect(
  115 |       page.getByRole("link", { name: "Join meeting", exact: true }),
  116 |     ).toHaveCount(0);
  117 |     await expect(
  118 |       page.getByRole("button", { name: "Join meeting", exact: true }),
  119 |     ).toBeDisabled();
  120 |   });
  121 | }
  122 | 
  123 | test("MS06 loading and denied detail never activate summary link or read its materials", async ({
  124 |   page,
  125 | }) => {
  126 |   await setup(page);
  127 |   let release!: () => void;
  128 |   const held = new Promise<void>((resolve) => {
  129 |     release = resolve;
  130 |   });
  131 |   let materialReads = 0;
  132 |   page.on("request", (request) => {
  133 |     if (/engagement\.(notes|debriefs)/.test(request.url())) materialReads++;
  134 |   });
  135 |   await page.route("**/api/capiro/engagement.meeting?*", async (route) => {
  136 |     await held;
  137 |     await route.fulfill({
  138 |       status: 403,
  139 |       json: { message: "Synthetic current read denied" },
  140 |     });
  141 |   });
  142 |   await openFirst(page);
  143 |   await expect(
  144 |     page.getByRole("button", { name: "Join meeting", exact: true }),
  145 |   ).toBeDisabled();
  146 |   expect(materialReads).toBe(0);
  147 |   release();
  148 |   await expect(page.getByRole("alert")).toContainText(
  149 |     "Synthetic current read denied",
  150 |   );
  151 |   await expect(
  152 |     page.getByRole("link", { name: "Join meeting", exact: true }),
  153 |   ).toHaveCount(0);
  154 |   expect(materialReads).toBe(0);
  155 | });
  156 | 
  157 | for (const foreign of [
  158 |   second,
  159 |   {
  160 |     ...meeting,
  161 |     client: { ...meeting.client, id: "30000000-0000-4000-8000-000000000002" },
  162 |   },
  163 | ]) {
  164 |   test(`MS06 foreign receipt stays unavailable: ${foreign.id}:${foreign.client.id}`, async ({
  165 |     page,
  166 |   }) => {
  167 |     await setup(page, foreign);
  168 |     let materialReads = 0;
```