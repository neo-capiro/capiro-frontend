# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: objective-navigation.spec.ts >> Objective navigation resolves the exact saved version through Core before opening its local destination
- Location: test/browser/objective-navigation.spec.ts:28:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Choose existing Outreach session' })
    - locator resolved to <button type="button" class="button">Choose existing Outreach session</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - link:
        - /url: "#main"
        - text: Skip to content
      - banner:
        - link:
          - /url: /
          - img
        - navigation:
          - link:
            - /url: /meri?clientId=10000000-0000-4000-8000-000000000001
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - link:
            - /url: /modules?clientId=10000000-0000-4000-8000-000000000001
        - navigation:
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
          - link:
            - /url: /calendar
          - link:
            - /url: /portfolio?search=1
          - button [disabled]
          - generic:
            - button: T
      - generic:
        - complementary:
          - paragraph: Portfolio
          - navigation:
            - link:
              - /url: /portfolio
              - generic: Overview
            - link:
              - /url: /portfolio?type=CLIENT
              - generic: Clients
            - link:
              - /url: /portfolio/prospects
              - generic: Prospects
          - separator
          - paragraph: Test Aerospace
          - navigation:
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001
              - generic: Overview
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
              - generic: Objectives
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
              - generic: Calendar
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
              - generic: Relationships
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
              - generic: Work
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
              - generic: Capabilities
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
              - generic: Bill Tracker
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
              - generic: Opportunities
            - link:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
              - generic: Files
          - generic:
            - link:
              - /url: /settings
              - text: Settings
        - main:
          - generic:
            - generic:
              - navigation:
                - link:
                  - /url: /portfolio
                - link:
                  - /url: /portfolio
                  - text: Portfolio
                - generic: /
                - link:
                  - /url: /portfolio/10000000-0000-4000-8000-000000000001
                  - text: Test Aerospace
                - generic: /
                - button: Objectives
              - generic:
                - button:
                  - generic: Quick add
                - button:
                  - generic: Meri actions
                - button:
                  - img
            - region:
              - generic: TA
              - generic:
                - strong: Test Aerospace
                - paragraph: Aerospace
              - generic: active client
          - generic:
            - generic:
              - generic:
                - generic:
                  - paragraph: Outcomes and institutional memory
                  - heading [level=1]: Objectives
                - button:
                  - img
                  - text: New objective
              - generic:
                - region:
                  - generic:
                    - generic:
                      - heading [level=2]: Advocacy history
                    - button:
                      - img
                      - text: New matter
                  - paragraph: Advocacy records and linked events for this client.
                  - generic:
                    - generic:
                      - generic:
                        - button [pressed]: Timeline
                        - button: Matters
                      - generic:
                        - generic: Search advocacy history
                        - searchbox
                      - generic:
                        - generic: Matter status
                        - combobox
                    - paragraph: 0 loaded events · Latest 500 at most; older history may be outside this view.
                    - generic:
                      - paragraph: No matching events in the loaded history.
                  - generic:
                    - button: Unassigned records
                - generic:
                  - generic:
                    - heading [level=2]: Current objectives
                    - combobox
                  - article:
                    - generic:
                      - generic: Draft
                      - button:
                        - img
                    - heading [level=2]:
                      - button: Test outcome
                    - paragraph: Test problem
                    - separator
                    - paragraph: Minimum win Test minimum win
                    - generic:
                      - generic: Unassigned
                      - generic: 4/4 required fields
                    - button: Open objective
  - dialog "Edit objective" [ref=e2]:
    - banner [ref=e3]:
      - heading "Edit objective" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Define the outcome and the government action that would make a meaningful win.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Draft
        - generic [ref=e13]: Four required fields before review or ready.
      - group "Objective details" [ref=e14]:
        - generic [ref=e15]: Objective details
        - generic [ref=e16]:
          - generic [ref=e17]: Outcome
          - generic [ref=e18]: What should be different?
          - textbox "Outcome" [active] [ref=e19]: Test outcome
        - generic [ref=e20]:
          - generic [ref=e21]: Government problem
          - generic [ref=e22]: What must government solve?
          - textbox "Government problem" [ref=e23]: Test problem
        - generic [ref=e24]:
          - text: Ask type
          - combobox "Ask type" [ref=e25]:
            - option "Choose an ask type"
            - option "Funding" [selected]
            - option "Policy or authority"
            - option "Both"
            - option "Protect existing funding"
            - option "Not sure, let Meri propose"
        - generic [ref=e26]:
          - generic [ref=e27]: Minimum win
          - generic [ref=e28]: What is the smallest result that matters?
          - textbox "Minimum win" [ref=e29]: Test minimum win
        - generic [ref=e30]:
          - generic [ref=e31]: Limits
          - generic [ref=e32]: Optional boundaries and constraints
          - textbox "Limits" [ref=e33]
      - region "Readiness" [ref=e34]:
        - generic [ref=e35]:
          - heading "Readiness" [level=3] [ref=e36]
          - generic [ref=e37]: i
        - status [ref=e38]: 4 of 4 required fields complete. Ready for review or confirmation.
        - list [ref=e39]:
          - listitem [ref=e40]:
            - generic [ref=e41]: ✓
            - generic [ref=e42]: Outcome
            - generic [ref=e43]: Done
          - listitem [ref=e44]:
            - generic [ref=e45]: ✓
            - generic [ref=e46]: Government problem
            - generic [ref=e47]: Done
          - listitem [ref=e48]:
            - generic [ref=e49]: ✓
            - generic [ref=e50]: Type of ask
            - generic [ref=e51]: Done
          - listitem [ref=e52]:
            - generic [ref=e53]: ✓
            - generic [ref=e54]: Minimum win
            - generic [ref=e55]: Done
      - generic [ref=e56]:
        - button "Save draft" [ref=e57] [cursor=pointer]
        - button "Request review" [ref=e58] [cursor=pointer]
        - button "Confirm ready" [ref=e59] [cursor=pointer]
    - region "Objective destinations" [ref=e60]:
      - heading "Existing Outreach session" [level=3] [ref=e61]
      - paragraph [ref=e62]: Open a currently authorized session for saved Objective version 1. This does not create a session or save an association.
      - button "Choose existing Outreach session" [ref=e63] [cursor=pointer]
      - generic [ref=e64]: Creation, durable associations and Strategy, Planner and Workspace destinations remain unavailable.
```

# Test source

```ts
  1   | import { operationFixtures } from "./fixtures";
  2   | import { test, expect } from "@playwright/test";
  3   | import {
  4   |   installFixtures,
  5   |   json,
  6   |   clientId,
  7   |   objective,
  8   | } from "../../tests/browser/fixtures";
  9   | import { session, sessionId } from "../../tests/newsletter-staging-fixtures";
  10  | const path = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
  11  | const destination = {
  12  |   kind: "outreach_session",
  13  |   resourceId: sessionId,
  14  |   clientId,
  15  |   objectiveId: objective.id,
  16  |   objectiveVersion: objective.version,
  17  |   objectiveRevisionId: "50000000-0000-4000-8000-000000000001",
  18  |   destinationStateVersion: 3,
  19  | };
  20  | async function select(page: import("@playwright/test").Page) {
  21  |   await page
  22  |     .getByRole("button", { name: "Choose existing Outreach session" })
> 23  |     .click();
      |      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  24  |   await page
  25  |     .getByLabel("Existing Outreach session", { exact: true })
  26  |     .selectOption(sessionId);
  27  | }
  28  | test("Objective navigation resolves the exact saved version through Core before opening its local destination", async ({
  29  |   page,
  30  | }) => {
  31  |   const unexpected = await installFixtures(page);
  32  |   const requests: URL[] = [];
  33  |   let destinationReads = 0;
  34  |   await operationFixtures(page, {
  35  |     "engagement.objectiveDestination": () => {
  36  |       destinationReads++;
  37  |       return {
  38  |         ...session,
  39  |         spec: {
  40  |           ...session.spec,
  41  |           sponsor: { kind: "client", label: null, clientRefs: [{ clientId }] },
  42  |         },
  43  |         destination,
  44  |       };
  45  |     },
  46  |   });
  47  |   await page.route("**/core/engagement/outreach-v3/sessions?*", (r) =>
  48  |     json(r, [
  49  |       {
  50  |         ...session.session,
  51  |         topic: null,
  52  |         goal: null,
  53  |         targetCount: 0,
  54  |         recordStatus: null,
  55  |         sentAt: null,
  56  |       },
  57  |     ]),
  58  |   );
  59  |   await page.route(
  60  |     "**/core/engagement/outreach-v3/sessions/*/objective-destination?*",
  61  |     (r) => {
  62  |       requests.push(new URL(r.request().url()));
  63  |       return json(r, {
  64  |         ...session,
  65  |         spec: {
  66  |           ...session.spec,
  67  |           sponsor: { kind: "client", label: null, clientRefs: [{ clientId }] },
  68  |         },
  69  |         destination,
  70  |       });
  71  |     },
  72  |   );
  73  |   await page.goto(path);
  74  |   await select(page);
  75  |   await page
  76  |     .getByRole("button", { name: "Open Objective-bound Outreach" })
  77  |     .click();
  78  |   await expect(page).toHaveURL(
  79  |     new RegExp(`/modules/engagement\\?.*objectiveId=${objective.id}`),
  80  |   );
  81  |   await expect(page.getByText(/immutable revision/)).toContainText(
  82  |     destination.objectiveRevisionId,
  83  |   );
  84  |   expect(destinationReads).toBe(1);
  85  |   expect(requests).toHaveLength(1);
  86  |   expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
  87  |     clientId,
  88  |     objectiveId: objective.id,
  89  |     objectiveVersion: String(objective.version),
  90  |   });
  91  |   expect(unexpected).toEqual([]);
  92  | });
  93  | test("unsaved edits and stale Objective resolver never navigate using old campaign text", async ({
  94  |   page,
  95  | }) => {
  96  |   const unexpected = await installFixtures(page);
  97  |   await page.route("**/core/engagement/outreach-v3/sessions?*", (r) =>
  98  |     json(r, [
  99  |       {
  100 |         ...session.session,
  101 |         topic: null,
  102 |         goal: null,
  103 |         targetCount: 0,
  104 |         recordStatus: null,
  105 |         sentAt: null,
  106 |       },
  107 |     ]),
  108 |   );
  109 |   await page.route(
  110 |     "**/core/engagement/outreach-v3/sessions/*/objective-destination?*",
  111 |     (r) => json(r, { message: "OBJECTIVE_VERSION_CONFLICT" }, 409),
  112 |   );
  113 |   await page.goto(path);
  114 |   await page.getByLabel(/^Outcome/).fill("Unsaved replacement");
  115 |   await expect(
  116 |     page.getByRole("button", { name: "Choose existing Outreach session" }),
  117 |   ).toBeDisabled();
  118 |   await page.getByLabel(/^Outcome/).fill(objective.outcome);
  119 |   await select(page);
  120 |   await page
  121 |     .getByRole("button", { name: "Open Objective-bound Outreach" })
  122 |     .click();
  123 |   await expect(page.getByText("OBJECTIVE_VERSION_CONFLICT")).toBeVisible();
```