# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: objective-destination.spec.ts >> Objective navigation resolves the exact saved version through Core before opening its local destination
- Location: tests/browser/objective-destination.spec.ts:22:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Existing Outreach session', { exact: true })

```

# Page snapshot

```yaml
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
          - /url: /meri
        - link:
          - /url: /
        - link:
          - /url: /modules
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
          - textbox "Outcome" [ref=e19]: Test outcome
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
      - button "Hide session selection" [active] [ref=e63] [cursor=pointer]
      - generic [ref=e64]:
        - text: Existing Outreach session
        - combobox "Existing Outreach session" [ref=e65]:
          - option "Select a session" [selected]
          - option "Synthetic template campaign · active"
      - generic [ref=e66]:
        - button "Previous sessions" [disabled] [ref=e67]
        - button "More sessions" [disabled] [ref=e68]
      - button "Open Objective-bound Outreach" [disabled] [ref=e69]
      - generic [ref=e70]: Creation, durable associations and Strategy, Planner and Workspace destinations remain unavailable.
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
> 20  |     .selectOption(sessionId);
      |      ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
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
  67  |   expect(unexpected).toEqual([]);
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