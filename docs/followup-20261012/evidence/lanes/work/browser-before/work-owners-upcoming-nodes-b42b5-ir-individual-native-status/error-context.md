# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: work-owners.spec.ts >> upcoming nodes display their individual native status
- Location: tests/browser/work-owners.spec.ts:65:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('section').filter({ has: getByRole('heading', { name: 'Upcoming work', exact: true }) }).getByText('Synthetic first upcoming step', { exact: true }).locator('..').getByText('active', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('section').filter({ has: getByRole('heading', { name: 'Upcoming work', exact: true }) }).getByText('Synthetic first upcoming step', { exact: true }).locator('..').getByText('active', { exact: true })

```

```yaml
- banner:
  - heading "Client work" [level=1]
  - text: "Source of truth: Strategies"
  - link "Open Strategies":
    - /url: http://127.0.0.1:5191/existing/strategies?clientId=10000000-0000-4000-8000-000000000001
  - link "New strategy":
    - /url: http://127.0.0.1:5191/existing/strategies/new?clientId=10000000-0000-4000-8000-000000000001
- region "Client strategy portfolio":
  - heading "Client strategy portfolio" [level=2]
  - strong: "2"
  - text: Current strategies
  - strong: "2"
  - text: Active / in progress
  - strong: "2"
  - text: Next 30 days
  - strong: "1"
  - text: Open risks
  - strong: "3"
  - text: Linked artifacts
- region "Workspace documents":
  - heading "Workspace documents" [level=2]
  - paragraph: Test Aerospace · 1 draft · 1 completed
  - link "Open Workspace":
    - /url: http://127.0.0.1:5191/existing/workspace
  - table "Current Workspace documents":
    - caption: Current Workspace documents
    - rowgroup:
      - row "Document Status Updated Open":
        - columnheader "Document"
        - columnheader "Status"
        - columnheader "Updated"
        - columnheader "Open"
    - rowgroup:
      - row "Synthetic current briefing draft Briefing Draft Oct 10 Open workspace":
        - cell "Synthetic current briefing draft Briefing":
          - strong: Synthetic current briefing draft
          - paragraph: Briefing
        - cell "Draft"
        - cell "Oct 10":
          - time: Oct 10
        - cell "Open workspace":
          - link "Open workspace":
            - /url: http://127.0.0.1:5191/existing/workspace/94000000-0000-4000-8000-000000000001
      - row "Synthetic completed work letter Letter Completed Oct 9 Open workspace":
        - cell "Synthetic completed work letter Letter":
          - strong: Synthetic completed work letter
          - paragraph: Letter
        - cell "Completed"
        - cell "Oct 9":
          - time: Oct 9
        - cell "Open workspace":
          - link "Open workspace":
            - /url: http://127.0.0.1:5191/existing/workspace/94000000-0000-4000-8000-000000000002
  - paragraph: Workspace associates legacy documents by client name. Renamed clients may have missing documents.
- region "Strategies":
  - article:
    - paragraph: policy
    - heading "Synthetic current strategy" [level=2]
    - link "Open strategy ↗":
      - /url: http://127.0.0.1:5191/existing/strategies/93000000-0000-4000-8000-000000000001
    - paragraph: Synthetic first goal
    - text: Target 2026-11-10
    - heading "Next strategy nodes" [level=3]
    - text: Synthetic first upcoming step active 2026-10-12
    - link "Open step ↗":
      - /url: http://127.0.0.1:5191/existing/strategies/93000000-0000-4000-8000-000000000001?step=93100000-0000-4000-8000-000000000001
    - text: Synthetic current risk draft 2026-10-10
    - link "Open step ↗":
      - /url: http://127.0.0.1:5191/existing/strategies/93000000-0000-4000-8000-000000000001?step=93100000-0000-4000-8000-000000000002
  - article:
    - paragraph: policy
    - heading "Synthetic independent strategy" [level=2]
    - link "Open strategy ↗":
      - /url: http://127.0.0.1:5191/existing/strategies/93000000-0000-4000-8000-000000000002
    - paragraph: Synthetic independent goal
    - text: Target 2026-11-10
    - heading "Next strategy nodes" [level=3]
    - text: Synthetic independent upcoming step in progress 2026-10-13
    - link "Open step ↗":
      - /url: http://127.0.0.1:5191/existing/strategies/93000000-0000-4000-8000-000000000002?step=93100000-0000-4000-8000-000000000003
- complementary:
  - heading "Upcoming work" [level=2]
  - text: Active and in-progress nodes starting in the next 30 days.
  - strong: Synthetic first upcoming step
  - text: 2026-10-12 · Synthetic current strategy
  - link "Open step ↗":
    - /url: http://127.0.0.1:5191/existing/strategies/93000000-0000-4000-8000-000000000001?step=93100000-0000-4000-8000-000000000001
  - strong: Synthetic independent upcoming step
  - text: 2026-10-13 · Synthetic independent strategy
  - link "Open step ↗":
    - /url: http://127.0.0.1:5191/existing/strategies/93000000-0000-4000-8000-000000000002?step=93100000-0000-4000-8000-000000000003
  - heading "Risks & blockers" [level=2]
  - article:
    - strong: Synthetic current risk
    - paragraph: Synthetic risk note
    - text: Ongoing
    - paragraph:
      - link "Open risk ↗":
        - /url: http://127.0.0.1:5191/existing/strategies/93000000-0000-4000-8000-000000000001?step=93100000-0000-4000-8000-000000000002
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { client, json } from "./fixtures";
  3   | import {
  4   |   firstStrategyId,
  5   |   installWorkFixtures,
  6   |   otherClientId,
  7   |   secondStrategyId,
  8   |   workDrafts,
  9   | } from "./work-boundary-fixtures";
  10  | 
  11  | const member = {
  12  |   id: "11000000-0000-4000-8000-000000000001",
  13  |   clerkUserId: "user_synthetic_owner",
  14  |   name: "Synthetic Jordan Clayton",
  15  |   email: "jordan@example.test",
  16  | };
  17  | const memberRoute = "**/api/capiro/settings.tenantMembers*";
  18  | 
  19  | async function installOwners(page: Page) {
  20  |   const fixture = await installWorkFixtures(page);
  21  |   const { state, requests } = fixture;
  22  |   state.details = structuredClone(state.details);
  23  |   state.details[firstStrategyId]!.ownerUserId = member.clerkUserId;
  24  |   state.details[firstStrategyId]!.nodes.forEach((node) => {
  25  |     node.ownerUserId = member.clerkUserId;
  26  |   });
  27  |   state.drafts = state.drafts.map((draft) => ({
  28  |     ...draft,
  29  |     ownerId: member.clerkUserId,
  30  |   }));
  31  |   const owners = { status: 200, members: [member] };
  32  |   await page.route(memberRoute, (route) => {
  33  |     requests.push(
  34  |       `${route.request().method()} ${new URL(route.request().url()).pathname}`,
  35  |     );
  36  |     return json(
  37  |       route,
  38  |       owners.status === 200
  39  |         ? owners.members
  40  |         : { message: "Synthetic member refusal" },
  41  |       owners.status,
  42  |     );
  43  |   });
  44  |   return { ...fixture, owners };
  45  | }
  46  | 
  47  | async function openWork(page: Page, authority = false) {
  48  |   await page.clock.setFixedTime(new Date("2026-10-11T12:00:00Z"));
  49  |   await page.goto(
  50  |     authority ? "/work-owner-authority.html" : "/work-boundary.html",
  51  |   );
  52  | }
  53  | 
  54  | function documentRow(page: Page) {
  55  |   return page.getByRole("row").filter({ hasText: workDrafts[0]!.docTitle });
  56  | }
  57  | 
  58  | function firstStrategy(page: Page) {
  59  |   return page
  60  |     .getByRole("region", { name: "Strategies", exact: true })
  61  |     .getByRole("article")
  62  |     .first();
  63  | }
  64  | 
  65  | test("upcoming nodes display their individual native status", async ({
  66  |   page,
  67  | }) => {
  68  |   await installOwners(page);
  69  |   await openWork(page);
  70  |   const upcoming = page.locator("section").filter({
  71  |     has: page.getByRole("heading", { name: "Upcoming work", exact: true }),
  72  |   });
  73  |   const first = upcoming
  74  |     .getByText("Synthetic first upcoming step", { exact: true })
  75  |     .locator("..");
  76  |   const second = upcoming
  77  |     .getByText("Synthetic independent upcoming step", { exact: true })
  78  |     .locator("..");
> 79  |   await expect(first.getByText("active", { exact: true })).toBeVisible();
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  80  |   await expect(first.getByText("in progress", { exact: true })).toHaveCount(0);
  81  |   await expect(second.getByText("in progress", { exact: true })).toBeVisible();
  82  |   await expect(second.getByText("active", { exact: true })).toHaveCount(0);
  83  | });
  84  | 
  85  | for (const width of [1088, 390]) {
  86  |   test(`supplied native owner labels appear in document and all node projections at ${width}px`, async ({
  87  |     page,
  88  |   }, testInfo) => {
  89  |     const { requests, unexpected } = await installOwners(page);
  90  |     await page.setViewportSize({ width, height: 1040 });
  91  |     await openWork(page);
  92  |     await expect(
  93  |       documentRow(page).getByLabel(`Owner: ${member.name}`),
  94  |     ).toBeVisible();
  95  |     await expect(
  96  |       firstStrategy(page).getByText(`Owner: ${member.name}`, { exact: true }),
  97  |     ).toHaveCount(3);
  98  |     const upcoming = page.locator("section").filter({
  99  |       has: page.getByRole("heading", { name: "Upcoming work", exact: true }),
  100 |     });
  101 |     const risks = page.locator("section").filter({
  102 |       has: page.getByRole("heading", {
  103 |         name: "Risks & blockers",
  104 |         exact: true,
  105 |       }),
  106 |     });
  107 |     await expect(
  108 |       upcoming.getByText(`Owner: ${member.name}`, { exact: true }),
  109 |     ).toBeVisible();
  110 |     const firstUpcoming = upcoming
  111 |       .getByText("Synthetic first upcoming step", { exact: true })
  112 |       .locator("..");
  113 |     const secondUpcoming = upcoming
  114 |       .getByText("Synthetic independent upcoming step", { exact: true })
  115 |       .locator("..");
  116 |     await expect(
  117 |       firstUpcoming.getByText("active", { exact: true }),
  118 |     ).toBeVisible();
  119 |     await expect(
  120 |       secondUpcoming.getByText("in progress", { exact: true }),
  121 |     ).toBeVisible();
  122 |     await expect(
  123 |       risks.getByText(`Owner: ${member.name}`, { exact: true }),
  124 |     ).toBeVisible();
  125 |     await expect(
  126 |       page.getByText(member.clerkUserId, { exact: true }),
  127 |     ).toHaveCount(0);
  128 |     expect(
  129 |       await page.evaluate(
  130 |         () => document.documentElement.scrollWidth <= innerWidth,
  131 |       ),
  132 |     ).toBe(true);
  133 |     await page.screenshot({
  134 |       path: testInfo.outputPath(`work-owners-${width}.png`),
  135 |       fullPage: true,
  136 |     });
  137 |     expect(requests.every((request) => request.startsWith("GET "))).toBe(true);
  138 |     expect(unexpected).toEqual([]);
  139 |   });
  140 | }
  141 | 
  142 | test("null nodes stay unassigned while unknown, empty and Core UUID owners remain unresolved", async ({
  143 |   page,
  144 | }) => {
  145 |   const { state } = await installOwners(page);
  146 |   state.details[firstStrategyId]!.nodes[0]!.ownerUserId = null;
  147 |   state.details[firstStrategyId]!.nodes[1]!.ownerUserId = "user_unknown";
  148 |   state.details[secondStrategyId]!.nodes[0]!.ownerUserId = "";
  149 |   state.drafts[0]!.ownerId = member.id;
  150 |   await openWork(page);
  151 |   await expect(
  152 |     documentRow(page).getByLabel("Owner: Owner unavailable"),
  153 |   ).toBeVisible();
  154 |   await expect(
  155 |     firstStrategy(page).getByText("Owner: Unassigned", { exact: true }),
  156 |   ).toBeVisible();
  157 |   await expect(
  158 |     firstStrategy(page).getByText("Owner: Owner unavailable", { exact: true }),
  159 |   ).toBeVisible();
  160 |   await expect(page.getByText("user_unknown", { exact: true })).toHaveCount(0);
  161 | });
  162 | 
  163 | for (const status of [403, 503]) {
  164 |   test(`a new member read with ${status} withholds previous labels and retry admits only the new response`, async ({
  165 |     page,
  166 |   }) => {
  167 |     const { owners } = await installOwners(page);
  168 |     await openWork(page);
  169 |     await expect(
  170 |       documentRow(page).getByLabel(`Owner: ${member.name}`),
  171 |     ).toBeVisible();
  172 |     owners.status = status;
  173 |     await page.evaluate(() => window.__workBoundary!.remount());
  174 |     await expect(
  175 |       page.getByText("Owner names could not be loaded."),
  176 |     ).toBeVisible();
  177 |     await expect(
  178 |       documentRow(page).getByLabel("Owner: Owner unavailable"),
  179 |     ).toBeVisible();
```