# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: onboard-host-funnel.spec.ts >> a later explicit native B read prevents a held A status read from restoring old state
- Location: test/browser/onboard-host-funnel.spec.ts:83:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Check current status', exact: true })
    - locator resolved to <button type="button">Check current status</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- group [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e10]: Capiro
      - generic [ref=e11]:
        - generic [ref=e12]:
          - img [ref=e14]
          - generic [ref=e16]: Account
        - generic [ref=e18]:
          - img [ref=e20]
          - generic [ref=e22]: Verify
        - generic [ref=e24]:
          - generic [ref=e25]: "3"
          - generic [ref=e26]: Plan
        - generic [ref=e28]:
          - generic [ref=e29]: "4"
          - generic [ref=e30]: Legal
        - generic [ref=e32]:
          - generic [ref=e33]: "5"
          - generic [ref=e34]: Billing
        - generic [ref=e36]:
          - generic [ref=e37]: "6"
          - generic [ref=e38]: Admins
        - generic [ref=e40]:
          - generic [ref=e41]: "7"
          - generic [ref=e42]: Clients
        - generic [ref=e44]:
          - generic [ref=e45]: "8"
          - generic [ref=e46]: Org
        - generic [ref=e48]:
          - generic [ref=e49]: "9"
          - generic [ref=e50]: Done
    - generic [ref=e52]:
      - status [ref=e53]:
        - text: Submission outcome unknown
        - paragraph [ref=e54]: Save the reviewed plan. The result was not confirmed. Check current status; do not repeat this submission.
        - button "Check current status" [disabled] [ref=e55] [cursor=pointer]
        - paragraph [ref=e56]:
          - text: If current records do not resolve this submission, contact
          - link "support@capiro.ai" [ref=e57] [cursor=pointer]:
            - /url: mailto:support@capiro.ai
          - text: before repeating it.
      - group [ref=e58]:
        - heading "Choose how to start" [level=1] [ref=e60]
        - button "Subscribe Now Recommended $200 / profile · billed monthly · 10-profile minimum ($2,000/month) Choose your client profile tier and get started with your full portfolio from day one. Synthetic fixture price lock Pay by card, wire, or ACH Volume discounts available for large accounts — contact sales Synthetic fixture price change" [disabled] [pressed] [ref=e61] [cursor=pointer]:
          - generic [ref=e64]:
            - generic [ref=e65]:
              - generic [ref=e66]: Subscribe Now
              - generic [ref=e67]: Recommended
            - generic [ref=e68]: $200 / profile · billed monthly · 10-profile minimum ($2,000/month)
          - generic [ref=e69]:
            - text: Choose your client profile tier and get started with your full portfolio from day one.
            - list [ref=e70]:
              - listitem [ref=e71]: Synthetic fixture price lock
              - listitem [ref=e72]: Pay by card, wire, or ACH
              - listitem [ref=e73]: Volume discounts available for large accounts — contact sales
              - listitem [ref=e74]: Synthetic fixture price change
        - button "Just exploring? Start with a 30-day free trial. $0 today · 10 client profile limit · no user cap · converts to a subscription on day 31 unless you cancel." [disabled] [ref=e75] [cursor=pointer]:
          - generic [ref=e77]:
            - text: Just exploring? Start with a 30-day free trial.
            - text: $0 today · 10 client profile limit · no user cap · converts to a subscription on day 31 unless you cancel.
        - generic [ref=e78]: Synthetic ambiguous dispatch
        - button "Continue" [disabled] [ref=e80] [cursor=pointer]
```

# Test source

```ts
  16  |     page,
  17  |     nativeSession("synthetic-native-A", { state: "roles_designated" }),
  18  |   );
  19  |   await page.goto("/plan");
  20  |   await expectPlan(page);
  21  |   const oldWrite = fixture.hold("onboard.funnel.plan", { json: { ok: true } });
  22  |   await page.getByRole("button", { name: /Subscribe Now/ }).click();
  23  |   await page.getByRole("button", { name: "Continue", exact: true }).click();
  24  |   await oldWrite.entered;
  25  |   await expect(page.getByRole("status")).toContainText(
  26  |     "Waiting for confirmation",
  27  |   );
  28  |   expect(fixture.calls("onboard.funnel.plan")[0]!.input).toEqual({
  29  |     body: { plan: "paid" },
  30  |   });
  31  |   // Both pages are allowed for A. This is ordinary same-authority route navigation.
  32  |   await navigateHost(page, "/clients");
  33  |   await expect(
  34  |     page.getByRole("heading", {
  35  |       name: "How would you like to bring in your clients?",
  36  |     }),
  37  |   ).toBeVisible();
  38  |   const replacement = fixture.hold("onboard.funnel.session", {
  39  |     json: nativeSession("synthetic-native-B", {
  40  |       state: "roles_designated",
  41  |       plan: "trial",
  42  |       importMode: "self",
  43  |     }),
  44  |   });
  45  |   await page
  46  |     .getByRole("button", { name: /Self-service Import your clients/ })
  47  |     .click();
  48  |   await page.getByRole("button", { name: "Continue", exact: true }).click();
  49  |   await replacement.entered;
  50  |   expect(fixture.calls("onboard.funnel.importPref")[0]!.input).toEqual({
  51  |     body: { importMode: "self" },
  52  |   });
  53  |   await replacement.release();
  54  |   await expect(page.getByRole("status")).toHaveCount(0);
  55  |   await expect(
  56  |     page.getByRole("button", { name: "Continue", exact: true }),
  57  |   ).toBeEnabled();
  58  |   await navigateHost(page, "/plan");
  59  |   await expectPlan(page);
  60  |   await expect(page.getByRole("button", { name: trialName })).toHaveAttribute(
  61  |     "aria-pressed",
  62  |     "true",
  63  |   );
  64  |   await oldWrite.release();
  65  |   await expect(page).toHaveURL(/\/plan$/);
  66  |   await expect(
  67  |     page.getByRole("button", { name: /Subscribe Now/ }),
  68  |   ).toHaveAttribute("aria-pressed", "false");
  69  |   await expect(page.getByRole("button", { name: trialName })).toHaveAttribute(
  70  |     "aria-pressed",
  71  |     "true",
  72  |   );
  73  |   await expect(page.getByRole("status")).toHaveCount(0);
  74  |   expect(fixture.calls("onboard.funnel.session")).toHaveLength(2);
  75  |   expect(fixture.calls("onboard.funnel.plan")).toHaveLength(1);
  76  |   expect(fixture.writes().map((request) => request.key)).toEqual([
  77  |     "onboard.funnel.plan",
  78  |     "onboard.funnel.importPref",
  79  |   ]);
  80  |   expectHostIsolated(fixture);
  81  | });
  82  | 
  83  | test("a later explicit native B read prevents a held A status read from restoring old state", async ({
  84  |   page,
  85  | }) => {
  86  |   const fixture = await hostFixture(page);
  87  |   await page.goto("/plan");
  88  |   await expectPlan(page);
  89  |   fixture.reply("onboard.funnel.plan", {
  90  |     status: 503,
  91  |     json: { message: "Synthetic ambiguous dispatch" },
  92  |   });
  93  |   await page.getByRole("button", { name: /Subscribe Now/ }).click();
  94  |   await page.getByRole("button", { name: "Continue", exact: true }).click();
  95  |   await expect(page.getByRole("status")).toContainText(
  96  |     "Submission outcome unknown",
  97  |   );
  98  |   await expect(
  99  |     page.getByRole("button", { name: "Continue", exact: true }),
  100 |   ).toBeDisabled();
  101 |   const oldRead = fixture.hold("onboard.funnel.session", {
  102 |     json: nativeSession("synthetic-native-A", {
  103 |       state: "plan_selected",
  104 |       plan: "paid",
  105 |     }),
  106 |   });
  107 |   await page
  108 |     .getByRole("button", { name: "Check current status", exact: true })
  109 |     .click();
  110 |   await oldRead.entered;
  111 |   fixture.reply("onboard.funnel.session", {
  112 |     json: nativeSession("synthetic-native-B", { plan: "trial" }),
  113 |   });
  114 |   await page
  115 |     .getByRole("button", { name: "Check current status", exact: true })
> 116 |     .click();
      |      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  117 |   await expect(page.getByRole("button", { name: trialName })).toHaveAttribute(
  118 |     "aria-pressed",
  119 |     "true",
  120 |   );
  121 |   await expect(page.getByRole("status")).toHaveCount(0);
  122 |   await oldRead.release();
  123 |   await expect(page).toHaveURL(/\/plan$/);
  124 |   await expect(page.getByRole("button", { name: trialName })).toHaveAttribute(
  125 |     "aria-pressed",
  126 |     "true",
  127 |   );
  128 |   await expect(
  129 |     page.getByRole("button", { name: /Subscribe Now/ }),
  130 |   ).toHaveAttribute("aria-pressed", "false");
  131 |   await expect(
  132 |     page.getByRole("button", { name: "Continue", exact: true }),
  133 |   ).toBeEnabled();
  134 |   expect(fixture.calls("onboard.funnel.session")).toHaveLength(3);
  135 |   expect(fixture.calls("onboard.funnel.plan")).toHaveLength(1);
  136 |   expect(fixture.writes()).toHaveLength(1);
  137 |   expectHostIsolated(fixture);
  138 | });
  139 | 
  140 | for (const width of [1440, 375]) {
  141 |   test(`actual plan controls support keyboard selection without overflow at ${width}px`, async ({
  142 |     page,
  143 |   }, testInfo) => {
  144 |     await page.setViewportSize({ width, height: 900 });
  145 |     const fixture = await hostFixture(page);
  146 |     await page.goto("/plan");
  147 |     await expectPlan(page);
  148 |     await page.evaluate(() => document.fonts.ready.then(() => undefined));
  149 |     const paid = page.getByRole("button", { name: /Subscribe Now/ });
  150 |     const trial = page.getByRole("button", { name: trialName });
  151 |     await expect(
  152 |       page.getByRole("button", { name: "Continue", exact: true }),
  153 |     ).toBeDisabled();
  154 |     await paid.focus();
  155 |     await expect(paid).toBeFocused();
  156 |     await page.keyboard.press("Enter");
  157 |     await expect(paid).toHaveAttribute("aria-pressed", "true");
  158 |     await page.keyboard.press("Tab");
  159 |     await expect(trial).toBeFocused();
  160 |     await page.keyboard.press("Space");
  161 |     await expect(trial).toHaveAttribute("aria-pressed", "true");
  162 |     await expect(paid).toHaveAttribute("aria-pressed", "false");
  163 |     await page.keyboard.press("Tab");
  164 |     await expect(
  165 |       page.getByRole("button", { name: "Continue", exact: true }),
  166 |     ).toBeFocused();
  167 |     await expect(
  168 |       page.getByRole("button", { name: "Continue", exact: true }),
  169 |     ).toBeEnabled();
  170 |     expect(fixture.writes()).toEqual([]);
  171 |     await page.screenshot({
  172 |       path: testInfo.outputPath(`plan-keyboard-${width}.png`),
  173 |       fullPage: true,
  174 |     });
  175 |     await expectHorizontalFit(page);
  176 |     expectHostIsolated(fixture);
  177 |   });
  178 | }
  179 | 
```