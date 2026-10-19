# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meri-files-navigation.spec.ts >> Files 1440px is keyboard reachable with scoped history and zero automatic operations
- Location: test/browser/meri-files-navigation.spec.ts:104:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('link', { name: 'Files', exact: true })
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('link', { name: 'Files', exact: true })
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Capiro Home" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e6]
      - navigation "Product modes" [ref=e7]:
        - link "Meri" [ref=e8] [cursor=pointer]:
          - /url: /meri?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e9]
        - link "Portfolio" [ref=e10] [cursor=pointer]:
          - /url: /portfolio/abcdef00-0000-4000-8000-000000000009
          - img [ref=e11]
        - link "Modules" [ref=e12] [cursor=pointer]:
          - /url: /modules?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e13]
      - generic [ref=e14]:
        - link "Quick log" [ref=e15] [cursor=pointer]:
          - /url: /?log=1&clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e16]
        - link "Master calendar" [ref=e17] [cursor=pointer]:
          - /url: /calendar?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e18]
        - link "Search" [ref=e19] [cursor=pointer]:
          - /url: /modules/intelligence?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e20]
        - button "Updates — unavailable" [disabled] [ref=e21]:
          - img [ref=e22]
        - link "Account settings" [ref=e23] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e24]
    - generic [ref=e25]:
      - complementary "Meri navigation" [ref=e26]:
        - button "New conversation" [ref=e27] [cursor=pointer]:
          - img [ref=e28]
          - text: New conversation
        - button "Search conversations" [disabled] [ref=e29]:
          - img [ref=e30]
          - text: Search conversations
        - navigation "Meri workspace" [ref=e32]:
          - button "Conversations" [ref=e33] [cursor=pointer]:
            - img [ref=e34]
            - text: Conversations
          - button "Files" [ref=e35] [cursor=pointer]:
            - img [ref=e36]
            - text: Files
          - button "Runs" [disabled] [ref=e37]:
            - img [ref=e38]
            - text: Runs
          - button "Approvals · 2" [disabled] [ref=e39]:
            - img [ref=e40]
            - text: Approvals · 2
          - button "Memory" [disabled] [ref=e41]:
            - img [ref=e42]
            - text: Memory
          - button "Routines" [disabled] [ref=e43]:
            - img [ref=e44]
            - text: Routines
          - button "Data access" [disabled] [ref=e45]:
            - img [ref=e46]
            - text: Data access
          - link "Recommendation actions" [ref=e47] [cursor=pointer]:
            - /url: /meri/actions?clientId=abcdef00-0000-4000-8000-000000000009
        - region "Recent" [ref=e48]:
          - heading "Recent" [level=2] [ref=e49]
          - button "Anduril meeting brief" [disabled] [ref=e50]
          - button "FY27 funding landscape" [disabled] [ref=e51]
          - button "Weekly client updates" [disabled] [ref=e52]
        - generic [ref=e53]:
          - link "Preferences" [ref=e55] [cursor=pointer]:
            - /url: /settings/preferences
          - paragraph [ref=e56]: Capiro · Your authorized workspace
      - main [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]:
            - generic [ref=e60]:
              - button "Anduril" [disabled] [ref=e61]:
                - img [ref=e62]
                - text: Anduril
              - generic "Prototype label only; no authorized source data" [ref=e63]: Your authorized data
            - img "Meri" [ref=e64]
          - generic [ref=e65]:
            - generic [ref=e66]:
              - heading "Good morning, Jordan." [level=1] [ref=e67]
              - paragraph [ref=e68]: What would you like to work on?
            - region "Local draft composer" [ref=e69]:
              - group [ref=e71]:
                - textbox "Message draft" [ref=e73]:
                  - /placeholder: Ask Meri to research, analyze, or create something…
                - group [ref=e74]:
                  - generic [ref=e75]:
                    - button "Attach" [disabled] [ref=e76]:
                      - img [ref=e77]
                      - text: Attach
                    - button "Anduril" [disabled] [ref=e78]:
                      - img [ref=e79]
                      - text: Anduril
                  - 'button "Send unavailable: disconnected fixture" [disabled] [ref=e80]':
                    - img [ref=e81]
                    - text: Send
                - paragraph [ref=e82]:
                  - text: Enter to send · Shift + Enter for a new line
                  - generic [ref=e83]: . Sending is currently unavailable in this disconnected synthetic fixture.
            - group "Draft suggestions" [ref=e84]:
              - generic [ref=e85]:
                - generic [ref=e86]:
                  - img [ref=e88]
                  - button "Start research draft" [ref=e89] [cursor=pointer]: Start
                - heading "Research" [level=2] [ref=e90]
                - paragraph [ref=e91]: Explore a question
              - generic [ref=e92]:
                - generic [ref=e93]:
                  - img [ref=e95]
                  - button "Start create a brief draft" [ref=e96] [cursor=pointer]: Start
                - heading "Create a brief" [level=2] [ref=e97]
                - paragraph [ref=e98]: Turn evidence into a document
              - generic [ref=e99]:
                - generic [ref=e100]:
                  - img [ref=e102]
                  - button "Start analyze a file draft" [ref=e103] [cursor=pointer]: Start
                - heading "Analyze a file" [level=2] [ref=e104]
                - paragraph [ref=e105]: Find signals in your data
            - generic [ref=e106]:
              - button "Build a spreadsheet" [ref=e107] [cursor=pointer]
              - button "Create a presentation" [ref=e108] [cursor=pointer]
              - button "Use a template" [ref=e109] [cursor=pointer]
              - button "Browse workflows" [disabled] [ref=e110]
              - generic [ref=e111]: Workflow library is not implemented in this disconnected fixture.
  - contentinfo [ref=e112]:
    - note [ref=e113]:
      - strong [ref=e114]: Disconnected synthetic fixture.
      - text: Jordan, Anduril, recent titles, answer, citations and approval counts are samples. No signed-in identity, authorized source data or sending is available. Drafts stay in this page only.
```

# Test source

```ts
  15  |     page,
  16  |   }) => {
  17  |     const fixture = await filesFixture(page);
  18  |     const held =
  19  |       state === "in-flight"
  20  |         ? fixture.hold("create", { json: fixture.first })
  21  |         : null;
  22  |     if (!held)
  23  |       fixture.reply("create", {
  24  |         status: 502,
  25  |         json: {
  26  |           error: { code: "ARTIFACT_EFFECT_UNKNOWN", outcome: "UNKNOWN" },
  27  |         },
  28  |       });
  29  |     await page.goto(filesUrl());
  30  |     await connectFiles(page);
  31  |     await fillDocument(page);
  32  |     await page
  33  |       .getByRole("button", { name: "Create document", exact: true })
  34  |       .click();
  35  |     if (held) {
  36  |       await held.entered;
  37  |       await expect(
  38  |         page.getByLabel("Document title", { exact: true }),
  39  |       ).toBeDisabled();
  40  |     } else
  41  |       await expect(
  42  |         page.getByRole("region", { name: "Unresolved document write" }),
  43  |       ).toBeVisible();
  44  |     await page
  45  |       .getByRole("navigation", { name: "Product modes" })
  46  |       .getByRole("link", { name: "Modules", exact: true })
  47  |       .click();
  48  |     await expect(
  49  |       page.getByRole("heading", {
  50  |         name: "Everything in Capiro, across the whole firm",
  51  |       }),
  52  |     ).toBeVisible();
  53  |     await page.goBack();
  54  |     await expect(page).toHaveURL(filesUrl());
  55  |     await connectFiles(page);
  56  |     await expect(
  57  |       page.getByRole("region", { name: "Unresolved document write" }),
  58  |     ).toBeVisible();
  59  |     await expect(
  60  |       page.getByRole("button", { name: "Create document", exact: true }),
  61  |     ).toBeDisabled();
  62  |     if (held) await held.release();
  63  |     await expect(
  64  |       page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  65  |     ).toHaveCount(0);
  66  |     await page
  67  |       .getByLabel("Known version ID", { exact: true })
  68  |       .fill(ids.version);
  69  |     await page
  70  |       .getByRole("button", { name: "Inspect version ID", exact: true })
  71  |       .click();
  72  |     await expect(
  73  |       page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  74  |     ).toBeVisible();
  75  |     await expect(
  76  |       page.getByRole("button", { name: "Create document", exact: true }),
  77  |     ).toBeDisabled();
  78  |     await expect(
  79  |       page.getByRole("button", {
  80  |         name: "Revise selected version",
  81  |         exact: true,
  82  |       }),
  83  |     ).toBeDisabled();
  84  |     await page.goForward();
  85  |     await expect(
  86  |       page.getByRole("heading", {
  87  |         name: "Everything in Capiro, across the whole firm",
  88  |       }),
  89  |     ).toBeVisible();
  90  |     await page.goBack();
  91  |     await connectFiles(page);
  92  |     await expect(
  93  |       page.getByRole("region", { name: "Unresolved document write" }),
  94  |     ).toBeVisible();
  95  |     expect(fixture.calls("create")).toHaveLength(1);
  96  |     expect(fixture.calls("inspect")).toHaveLength(1);
  97  |     expect(fixture.calls("revise")).toHaveLength(0);
  98  |     expect(fixture.host.calls("session")).toHaveLength(3);
  99  |     expectFilesIsolation(fixture);
  100 |   });
  101 | }
  102 | 
  103 | for (const width of [1440, 390]) {
  104 |   test(`Files ${width}px is keyboard reachable with scoped history and zero automatic operations`, async ({
  105 |     page,
  106 |   }, testInfo) => {
  107 |     await page.setViewportSize({ width, height: 844 });
  108 |     const fixture = await filesFixture(page);
  109 |     const home = `/meri?clientId=${actionClient.id}`;
  110 |     await page.goto(home);
  111 |     await expect(
  112 |       page.getByLabel("Message draft", { exact: true }),
  113 |     ).toBeVisible();
  114 |     const files = page.getByRole("link", { name: "Files", exact: true });
> 115 |     await expect(files).toHaveCount(1);
      |                         ^ Error: expect(locator).toHaveCount(expected) failed
  116 |     await expect(files).toHaveAttribute("href", filesUrl());
  117 |     await tabTo(page, files);
  118 |     await expectFocusEvidence(files, testInfo);
  119 |     await page.keyboard.press("Enter");
  120 |     await expect(page).toHaveURL(filesUrl());
  121 |     await expect(files).toHaveAttribute("aria-current", "page");
  122 |     const connect = page.getByRole("button", {
  123 |       name: "Connect document service",
  124 |       exact: true,
  125 |     });
  126 |     await tabTo(page, connect);
  127 |     await expectFocusEvidence(connect, testInfo);
  128 |     expect(fixture.host.calls("session")).toHaveLength(0);
  129 |     expect(fixture.requests).toEqual([]);
  130 |     await page.keyboard.press("Enter");
  131 |     await expect(
  132 |       page.getByLabel("Document title", { exact: true }),
  133 |     ).toBeEditable();
  134 |     const title = page.getByLabel("Document title", { exact: true });
  135 |     await tabTo(page, title);
  136 |     await expect(title).toBeFocused();
  137 |     await page.keyboard.type("Unsubmitted keyboard draft");
  138 |     expect(fixture.requests).toEqual([]);
  139 |     await page.screenshot({
  140 |       path: testInfo.outputPath(`files-keyboard-${width}.png`),
  141 |       fullPage: true,
  142 |     });
  143 |     await page.goBack();
  144 |     await expect(page).toHaveURL(home);
  145 |     await page.goForward();
  146 |     await expect(page).toHaveURL(filesUrl());
  147 |     await expect(connect).toBeEnabled();
  148 |     await expect(title).toHaveCount(0);
  149 |     expect(fixture.host.calls("session")).toHaveLength(1);
  150 |     expect(fixture.requests).toEqual([]);
  151 |     expect(
  152 |       await page.evaluate(() => document.documentElement.scrollWidth),
  153 |     ).toBeLessThanOrEqual(width);
  154 |     expectFilesIsolation(fixture);
  155 |   });
  156 | }
  157 | 
```