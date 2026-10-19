# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: outreach-list-scope.spec.ts >> scoped Outreach refuses null-client list receipts and recovers with a current matching read
- Location: test/browser/outreach-list-scope.spec.ts:62:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 6

  Array [
    Object {
      "query": Object {
        "clientId": "10000000-0000-4000-8000-000000000001",
+       "deleted": "false",
+       "from": "2025-10-19T00:00:00.000Z",
        "limit": 500,
+       "to": "2026-10-20T00:00:00.000Z",
      },
    },
    Object {
      "query": Object {
        "clientId": "10000000-0000-4000-8000-000000000001",
+       "deleted": "false",
+       "from": "2025-10-19T00:00:00.000Z",
        "limit": 500,
+       "to": "2026-10-20T00:00:00.000Z",
      },
    },
  ]
```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - link:
        - /url: "#main-content"
        - text: Skip to content
      - banner:
        - generic:
          - link:
            - /url: /
            - img
          - button [expanded]:
            - img
        - navigation:
          - link:
            - /url: /meri?clientId=10000000-0000-4000-8000-000000000001
            - generic:
              - img
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic:
              - img
          - link:
            - /url: /modules?clientId=10000000-0000-4000-8000-000000000001
            - generic:
              - img
        - navigation:
          - link:
            - /url: /?log=1
            - generic:
              - img
          - link:
            - /url: /calendar?clientId=10000000-0000-4000-8000-000000000001
            - generic:
              - img
          - link:
            - /url: /modules/intelligence?clientId=10000000-0000-4000-8000-000000000001
            - generic:
              - img
          - button [disabled]:
            - generic:
              - img
          - link:
            - /url: /settings/personal?clientId=10000000-0000-4000-8000-000000000001
            - generic:
              - img
      - generic:
        - complementary:
          - paragraph: Modules
          - navigation:
            - link:
              - /url: /modules?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Module hub
            - link:
              - /url: /modules/engagement?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Engagement
            - link:
              - /url: /modules/planner?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Planner
            - link:
              - /url: /modules/calendar?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Calendar
            - link:
              - /url: /modules/workspace?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Workspace
            - link:
              - /url: /modules/strategies?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Strategies
            - link:
              - /url: /modules/directory?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Directory
            - link:
              - /url: /modules/intelligence?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Intelligence
            - link:
              - /url: /modules/research-portfolios?clientId=10000000-0000-4000-8000-000000000001
              - generic:
                - img
              - generic: Research portfolios
          - link:
            - /url: /settings/personal?clientId=10000000-0000-4000-8000-000000000001
            - generic:
              - img
            - generic: Settings
        - main:
          - navigation:
            - link:
              - /url: /modules?clientId=10000000-0000-4000-8000-000000000001
              - text: ← Modules
            - generic: /
            - combobox:
              - generic: Engagement
              - img
          - generic:
            - generic:
              - generic:
                - heading [level=1]: Engagement
                - paragraph: Your draft and sent campaigns. Open one to continue, or start a new campaign.
              - generic:
                - combobox
            - generic:
              - generic:
                - searchbox
                - button: + New outreach
              - generic:
                - generic:
                  - generic: From
                  - textbox: 2025-10-19
                - generic:
                  - generic: To
                  - textbox: 2026-10-19
                - generic:
                  - checkbox
                  - text: Show deleted
              - paragraph: V3 campaign records are read-only here. Campaign sessions are available under All permitted clients; the session list cannot filter them to one client.
              - region:
                - heading [level=2]: Outreach record drafts
                - generic:
                  - table:
                    - caption: Outreach records
                    - rowgroup:
                      - row:
                        - columnheader: Outreach
                        - columnheader: Client
                        - columnheader: Type
                        - columnheader: Recipients
                        - columnheader: Status
                        - columnheader: Created
                    - rowgroup:
                      - row:
                        - cell:
                          - button: Synthetic current Classic outreach
                        - cell: Test Aerospace
                        - cell: follow up
                        - cell: "0"
                        - cell:
                          - generic: draft
                        - cell: Unknown
              - paragraph: Editing a draft does not send mail. Delivery requires an audited immutable draft and a reviewed send intent.
    - complementary: Explicit local test fixture · synthetic identity and records
  - dialog "Outreach draft" [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - heading "Outreach draft" [level=2] [ref=e5]
        - paragraph [ref=e6]: Outreach draft dialog
      - button "Close dialog" [active] [ref=e7] [cursor=pointer]: ×
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: Title
        - textbox "Title" [ref=e12]: Synthetic current Classic outreach
      - generic [ref=e13]:
        - generic [ref=e14]: Subject
        - textbox "Subject" [ref=e15]: Supplied current record subject
      - generic [ref=e16]:
        - generic [ref=e17]: Body
        - textbox "Body" [ref=e18]: Supplied current record body
      - generic [ref=e19]:
        - button "Send outreach" [disabled] [ref=e20]
        - generic [ref=e21]: Sending needs the versioned draft review and send-intent workflow.
      - generic [ref=e22]:
        - button "Cancel" [ref=e23] [cursor=pointer]
        - button "Save draft" [ref=e24] [cursor=pointer]
```

# Test source

```ts
  12  |
  13  | for (const width of [1440, 390]) {
  14  |   test(`Outreach scope-error keyboard retry conceals rows during the held read at ${width}px`, async ({
  15  |     page,
  16  |   }, info) => {
  17  |     const observed = await setupOutreach(page);
  18  |     await page.setViewportSize({ width, height: 1000 });
  19  |     if (width === 390) await page.emulateMedia({ colorScheme: "dark" });
  20  |     let held: Route | undefined;
  21  |     let reads = 0;
  22  |     await page.route("**/api/capiro/engagement.outreach?*", (route) => {
  23  |       if (++reads === 1)
  24  |         return route.fulfill({ json: [{ ...record, client: null }] });
  25  |       held = route;
  26  |     });
  27  |     await page.goto(`/modules/engagement?view=outreach&clientId=${clientId}`);
  28  |     await expect(page.getByRole("alert")).toContainText(
  29  |       "does not match this client scope",
  30  |     );
  31  |     await expectAccessibleHome(page, info);
  32  |     await page.screenshot({
  33  |       path: info.outputPath(`outreach-scope-error-${width}.png`),
  34  |       fullPage: true,
  35  |     });
  36  |     const retry = page.getByRole("button", { name: "Try again", exact: true });
  37  |     await retry.focus();
  38  |     await expect(retry).toBeFocused();
  39  |     await page.keyboard.press("Enter");
  40  |     await expect.poll(() => Boolean(held)).toBe(true);
  41  |     await expect(
  42  |       page.getByRole("button", { name: record.title, exact: true }),
  43  |     ).toHaveCount(0);
  44  |     await expect(page.getByRole("dialog")).toHaveCount(0);
  45  |     assertNoEffects(observed);
  46  |     const settled = requestCompletion(page, held!.request());
  47  |     await held!.fulfill({ json: [record] });
  48  |     await settled;
  49  |     await expect(
  50  |       page.getByRole("button", { name: record.title, exact: true }),
  51  |     ).toBeVisible();
  52  |     expect(reads).toBe(2);
  53  |     assertNoEffects(observed);
  54  |   });
  55  | }
  56  |
  57  | for (const association of [
  58  |   "other-client",
  59  |   "null-client",
  60  |   "missing-client",
  61  | ] as const) {
  62  |   test(`scoped Outreach refuses ${association} list receipts and recovers with a current matching read`, async ({
  63  |     page,
  64  |   }) => {
  65  |     const observed = await setupOutreach(page);
  66  |     let mismatch = true;
  67  |     const inputs: unknown[] = [];
  68  |     await page.route("**/api/capiro/engagement.outreach?*", (route) => {
  69  |       inputs.push(
  70  |         JSON.parse(new URL(route.request().url()).searchParams.get("input")!),
  71  |       );
  72  |       return route.fulfill({
  73  |         json: mismatch
  74  |           ? [
  75  |               record,
  76  |               {
  77  |                 ...record,
  78  |                 id: otherRecordId,
  79  |                 title: "Synthetic unverified client record",
  80  |                 client:
  81  |                   association === "other-client"
  82  |                     ? { id: otherClientId, name: "Other client" }
  83  |                     : association === "null-client"
  84  |                       ? null
  85  |                       : undefined,
  86  |               },
  87  |             ]
  88  |           : [record],
  89  |       });
  90  |     });
  91  |     await page.goto(`/modules/engagement?view=outreach&clientId=${clientId}`);
  92  |     await expect(page.getByRole("alert")).toContainText(
  93  |       "The returned outreach does not match this client scope.",
  94  |     );
  95  |     await expect(
  96  |       page.getByRole("button", { name: record.title, exact: true }),
  97  |     ).toHaveCount(0);
  98  |     await expect(
  99  |       page.getByRole("button", {
  100 |         name: "Synthetic unverified client record",
  101 |         exact: true,
  102 |       }),
  103 |     ).toHaveCount(0);
  104 |     await expect(page.getByRole("dialog")).toHaveCount(0);
  105 |     assertNoEffects(observed);
  106 |     mismatch = false;
  107 |     await page.getByRole("button", { name: "Try again", exact: true }).click();
  108 |     await page.getByRole("button", { name: record.title, exact: true }).click();
  109 |     await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
  110 |       record.body,
  111 |     );
> 112 |     expect(inputs).toEqual(Array(2).fill({ query: { clientId, limit: 500 } }));
      |                    ^ Error: expect(received).toEqual(expected) // deep equality
  113 |     assertNoEffects(observed);
  114 |   });
  115 | }
  116 |
  117 | test("all permitted clients Outreach retains matching, other-client and unassigned records", async ({
  118 |   page,
  119 | }) => {
  120 |   const observed = await setupOutreach(page);
  121 |   const unassigned = {
  122 |     ...record,
  123 |     id: otherRecordId,
  124 |     title: "Synthetic unassigned record",
  125 |     client: null,
  126 |   };
  127 |   const other = {
  128 |     ...record,
  129 |     id: "60000000-0000-4000-8000-000000000006",
  130 |     title: "Synthetic other-client record",
  131 |     client: { id: otherClientId, name: "Other client" },
  132 |   };
  133 |   await page.route("**/api/capiro/engagement.outreach?*", (route) =>
  134 |     route.fulfill({ json: [record, unassigned, other] }),
  135 |   );
  136 |   await page.goto("/modules/engagement?view=outreach");
  137 |   for (const row of [record, unassigned, other])
  138 |     await expect(
  139 |       page.getByRole("button", { name: row.title, exact: true }),
  140 |     ).toBeVisible();
  141 |   await page
  142 |     .getByRole("button", { name: unassigned.title, exact: true })
  143 |     .click();
  144 |   await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
  145 |     record.body,
  146 |   );
  147 |   assertNoEffects(observed);
  148 | });
  149 |
```
