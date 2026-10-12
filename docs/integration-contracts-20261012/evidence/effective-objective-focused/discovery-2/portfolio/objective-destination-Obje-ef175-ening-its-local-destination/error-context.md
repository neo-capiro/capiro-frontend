# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: objective-destination.spec.ts >> Objective navigation resolves the exact saved version through Core before opening its local destination
- Location: tests/browser/objective-destination.spec.ts:22:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "GET core/clients/engagement",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - link "Capiro Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e6]
    - navigation "Workspace" [ref=e7]:
      - link "Meri" [ref=e8] [cursor=pointer]:
        - /url: /meri
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /
      - link "Modules" [ref=e10] [cursor=pointer]:
        - /url: /modules
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio/engagement?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - generic [ref=e18]:
    - complementary "Portfolio navigation" [ref=e19]:
      - paragraph [ref=e20]: Portfolio
      - navigation "Portfolio" [ref=e21]:
        - link "Portfolio Overview" [ref=e22] [cursor=pointer]:
          - /url: /portfolio
          - generic [ref=e23]: Overview
        - link "Portfolio Clients" [ref=e24] [cursor=pointer]:
          - /url: /portfolio?type=CLIENT
          - generic [ref=e25]: Clients
        - link "Portfolio Prospects" [ref=e26] [cursor=pointer]:
          - /url: /portfolio/prospects
          - generic [ref=e27]: Prospects
      - separator [ref=e28]
      - paragraph [ref=e29]: Client
      - navigation "Client" [ref=e30]:
        - link "Overview" [ref=e31] [cursor=pointer]:
          - /url: /portfolio/engagement
          - generic [ref=e32]: Overview
        - link "Objectives" [ref=e33] [cursor=pointer]:
          - /url: /portfolio/engagement/objectives
          - generic [ref=e34]: Objectives
        - link "Calendar" [ref=e35] [cursor=pointer]:
          - /url: /portfolio/engagement/calendar
          - generic [ref=e36]: Calendar
        - link "Relationships" [ref=e37] [cursor=pointer]:
          - /url: /portfolio/engagement/relationships
          - generic [ref=e38]: Relationships
        - link "Work" [ref=e39] [cursor=pointer]:
          - /url: /portfolio/engagement/work
          - generic [ref=e40]: Work
        - link "Capabilities" [ref=e41] [cursor=pointer]:
          - /url: /portfolio/engagement/capabilities
          - generic [ref=e42]: Capabilities
        - link "Bill Tracker" [ref=e43] [cursor=pointer]:
          - /url: /portfolio/engagement/bills
          - generic [ref=e44]: Bill Tracker
        - link "Opportunities" [ref=e45] [cursor=pointer]:
          - /url: /portfolio/engagement/opportunities
          - generic [ref=e46]: Opportunities
        - link "Files" [ref=e47] [cursor=pointer]:
          - /url: /portfolio/engagement/files
          - generic [ref=e48]: Files
      - link "Settings" [ref=e50] [cursor=pointer]:
        - /url: /settings
    - main [ref=e51]:
      - alert [ref=e53]:
        - paragraph [ref=e54]: No fixture for this contract
        - button "Retry" [ref=e55] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { installFixtures, json, clientId, objective } from "./fixtures";
  3   | import { session, sessionId } from "../newsletter-staging-fixtures";
  4   | const path = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
  5   | const destination = {
  6   |   kind: "outreach_session",
  7   |   resourceId: sessionId,
  8   |   clientId,
  9   |   objectiveId: objective.id,
  10  |   objectiveVersion: objective.version,
  11  |   objectiveRevisionId: "50000000-0000-4000-8000-000000000001",
  12  |   destinationStateVersion: 3,
  13  | };
  14  | async function select(page: import("@playwright/test").Page) {
  15  |   await page
  16  |     .getByRole("button", { name: "Choose existing Outreach session" })
  17  |     .click();
  18  |   await page
  19  |     .getByLabel("Existing Outreach session", { exact: true })
  20  |     .selectOption(sessionId);
  21  | }
  22  | test("Objective navigation resolves the exact saved version through Core before opening its local destination", async ({
  23  |   page,
  24  | }) => {
  25  |   const unexpected = await installFixtures(page);
  26  |   const requests: URL[] = [];
  27  |   await page.route("**/core/engagement/outreach-v3/sessions?*", (r) =>
  28  |     json(r, [
  29  |       {
  30  |         ...session.session,
  31  |         topic: null,
  32  |         goal: null,
  33  |         targetCount: 0,
  34  |         recordStatus: null,
  35  |         sentAt: null,
  36  |       },
  37  |     ]),
  38  |   );
  39  |   await page.route(
  40  |     "**/core/engagement/outreach-v3/sessions/*/objective-destination?*",
  41  |     (r) => {
  42  |       requests.push(new URL(r.request().url()));
  43  |       return json(r, {
  44  |         ...session,
  45  |         spec: {
  46  |           ...session.spec,
  47  |           sponsor: { kind: "client", label: null, clientRefs: [{ clientId }] },
  48  |         },
  49  |         destination,
  50  |       });
  51  |     },
  52  |   );
  53  |   await page.goto(path);
  54  |   await select(page);
  55  |   await page
  56  |     .getByRole("button", { name: "Open Objective-bound Outreach" })
  57  |     .click();
  58  |   await expect(page).toHaveURL(
  59  |     new RegExp(`/modules/engagement\\?.*objectiveId=${objective.id}`),
  60  |   );
  61  |   expect(requests).toHaveLength(1);
  62  |   expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
  63  |     clientId,
  64  |     objectiveId: objective.id,
  65  |     objectiveVersion: String(objective.version),
  66  |   });
> 67  |   expect(unexpected).toEqual([]);
      |                      ^ Error: expect(received).toEqual(expected) // deep equality
  68  | });
  69  | test("unsaved edits and stale Objective resolver never navigate using old campaign text", async ({
  70  |   page,
  71  | }) => {
  72  |   const unexpected = await installFixtures(page);
  73  |   await page.route("**/core/engagement/outreach-v3/sessions?*", (r) =>
  74  |     json(r, [
  75  |       {
  76  |         ...session.session,
  77  |         topic: null,
  78  |         goal: null,
  79  |         targetCount: 0,
  80  |         recordStatus: null,
  81  |         sentAt: null,
  82  |       },
  83  |     ]),
  84  |   );
  85  |   await page.route(
  86  |     "**/core/engagement/outreach-v3/sessions/*/objective-destination?*",
  87  |     (r) => json(r, { message: "OBJECTIVE_VERSION_CONFLICT" }, 409),
  88  |   );
  89  |   await page.goto(path);
  90  |   await page.getByLabel(/^Outcome/).fill("Unsaved replacement");
  91  |   await expect(
  92  |     page.getByRole("button", { name: "Choose existing Outreach session" }),
  93  |   ).toBeDisabled();
  94  |   await page.getByLabel(/^Outcome/).fill(objective.outcome);
  95  |   await select(page);
  96  |   await page
  97  |     .getByRole("button", { name: "Open Objective-bound Outreach" })
  98  |     .click();
  99  |   await expect(page.getByText("OBJECTIVE_VERSION_CONFLICT")).toBeVisible();
  100 |   expect(new URL(page.url()).pathname).toBe(
  101 |     `/portfolio/${clientId}/objectives`,
  102 |   );
  103 |   expect(unexpected).toEqual([]);
  104 | });
  105 | 
```