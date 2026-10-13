# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timeline-review.spec.ts >> pending activity stays fenced while its response is held across expand and return
- Location: apps/web/tests/browser/timeline-presentation-lifetime.spec.ts:87:5

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator:  getByRole('region', { name: 'Activity timeline', exact: true }).getByRole('button', { name: 'Activity actions: Uncertain timeline note', exact: true })
Expected: disabled
Received: enabled
Timeout:  5000ms

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Activity timeline', exact: true }).getByRole('button', { name: 'Activity actions: Uncertain timeline note', exact: true })
    14 × locator resolved to <button type="button" id="radix-_r_20_" data-state="closed" aria-haspopup="menu" aria-expanded="false" class="_trigger_7mgmu_7" aria-label="Activity actions: Uncertain timeline note">⋯</button>
       - unexpected value "enabled"

```

```yaml
- 'button "Activity actions: Uncertain timeline note"': ⋯
```

# Test source

```ts
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
  39  |     await page.goto(`/portfolio/${clientId}`);
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
> 124 |     await expect(action).toBeDisabled();
      |                          ^ Error: expect(locator).toBeDisabled() failed
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
  140 | }) => {
  141 |   const unexpected = await installFixtures(page);
  142 |   let writes = 0;
  143 |   await page.route(`**/clients/${clientId}/activity**`, (route) => {
  144 |     if (route.request().method() === "GET") return json(route, [note]);
  145 |     writes++;
  146 |     return json(route, { message: "Synthetic uncertain new activity" }, 503);
  147 |   });
  148 |   await page.goto(`/portfolio/${clientId}?log=1&context=preserved`);
  149 |   const log = page.getByRole("dialog", { name: "Quick log", exact: true });
  150 |   await log
  151 |     .getByLabel("Title", { exact: true })
  152 |     .fill("Uncertain original activity");
  153 |   await log.getByRole("button", { name: "Save activity", exact: true }).click();
  154 |   await expect(log.getByText(/save result is uncertain/i)).toBeVisible();
  155 |   await log.getByRole("button", { name: "Close", exact: true }).click();
  156 |   const timeline = page.getByRole("region", {
  157 |     name: "Activity timeline",
  158 |     exact: true,
  159 |   });
  160 |   await timeline
  161 |     .getByRole("button", { name: "Expand timeline ↗", exact: true })
  162 |     .click();
  163 |   await page
  164 |     .getByRole("dialog", { name: "Engagement timeline", exact: true })
  165 |     .getByRole("button", { name: "Log activity", exact: true })
  166 |     .click();
  167 |   await expect(
  168 |     log.getByRole("button", { name: "Save activity", exact: true }),
  169 |   ).toBeDisabled();
  170 |   await expect(log.getByText(/save result is uncertain/i)).toBeVisible();
  171 |   expect(new URL(page.url()).searchParams.get("context")).toBe("preserved");
  172 |   expect(new URL(page.url()).searchParams.get("log")).toBe("1");
  173 |   expect(writes).toBe(1);
  174 |   expect(unexpected).toEqual([]);
  175 | });
  176 | 
```